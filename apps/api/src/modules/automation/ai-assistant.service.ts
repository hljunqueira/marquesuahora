import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { ConversationMemoryService } from './conversation-memory.service';
import { HumanizerGuardrail } from './humanizer-guardrail';
import { AvailabilityService } from '../schedules/availability.service';
import { getBrazilTodayYMD, parseYMDToSafeUtcDate } from '../../utils/date-utils';

export interface ProcessAssistantMessageParams {
  tenantId: string;
  clientPhone: string;
  clientName?: string | null;
  messageText: string;
}

export interface ExtractedTargetDate {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM
  weekdayName: string; // ex: Sexta-feira
  dayOfWeek: number; // 0..6
  isExplicit: boolean;
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export class AiAssistantService {
  private static getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }

  private static getModel(): string {
    return process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
  }

  /**
   * Processa a mensagem de um cliente (texto ou áudio transcrito) e gera uma resposta
   * autônoma contextualizada com serviços, disponibilidade real e regras do salão.
   */
  public static async processMessage(params: ProcessAssistantMessageParams): Promise<string> {
    const { tenantId, clientPhone, messageText } = params;

    // 1. Carrega dados do estabelecimento, configurações de IA, serviços, produtos, cursos e regras semanais
    const [tenant, aiSettings, activeServices, professionals, activeProducts, activeCourses, availabilityRules] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId }
      }),
      prisma.tenantAiSettings.findUnique({
        where: { tenantId }
      }),
      prisma.service.findMany({
        where: { tenantId, allowOnlineBooking: true },
        select: { id: true, name: true, price: true, durationMinutes: true }
      }),
      prisma.professional.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true }
      }),
      prisma.product.findMany({
        where: { tenantId, isActive: true, showInVitrine: true },
        select: { id: true, name: true, salePrice: true, category: true, description: true }
      }),
      prisma.course.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, title: true, price: true, description: true }
      }),
      prisma.availabilityRule.findMany({
        where: { tenantId, professionalId: null }
      })
    ]);

    if (!tenant) {
      return 'Estabelecimento não localizado no momento.';
    }

    // Salva a mensagem recebida no histórico recente
    await ConversationMemoryService.addMessage(tenantId, clientPhone, 'user', messageText);

    // Recupera histórico recente da conversa (últimos turnos)
    const history = await ConversationMemoryService.getRecentHistory(tenantId, clientPhone);

    const rawLower = messageText.toLowerCase().trim();
    const showcaseUrl = `https://marquesuahora.com.br/${tenant.slug}`;

    // 2. Transbordo para atendente humano se solicitado explicitamente
    if (
      rawLower.includes('falar com atendente') ||
      rawLower.includes('atendente humano') ||
      rawLower.includes('falar com pessoa') ||
      rawLower.includes('alguém humano') ||
      rawLower.includes('falar com alguem')
    ) {
      const handoffReply = `Vou avisar nossa equipe da recepção agora mesmo para te atender por aqui pelo WhatsApp! Enquanto isso, se quiser conferir nossos horários e serviços online, nosso link é: ${showcaseUrl}`;
      await ConversationMemoryService.addMessage(tenantId, clientPhone, 'assistant', handoffReply);
      return handoffReply;
    }

    // 2.1 Tratamento de agradecimentos e confirmações simples: evita loop de reenvio de confirmação longa
    const cleanTokens = rawLower.replace(/[!.,;:?]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const ackWords = new Set([
      'ok', 'okay', 'obrigada', 'obrigado', 'de', 'nada', 'valeu', 'combinado',
      'show', 'beleza', 'perfeito', 'ta', 'tá', 'bom', 'combinadissimo', 'combinadíssimo',
      'ate', 'até', 'logo', 'mais', 'sexta', 'segunda', 'terca', 'terça', 'quarta', 'quinta', 'sabado', 'sábado', 'domingo', 'amanha', 'amanhã', 'la', 'lá', 'sim', 'isso', 'otimo', 'ótimo'
    ]);
    const isSimpleAck = cleanTokens.length > 0 && cleanTokens.length <= 4 && cleanTokens.every(w => ackWords.has(w));
    const lastAssistantMessage = history.filter(h => h.role === 'assistant').pop()?.content || '';
    const isRecentConfirmation = lastAssistantMessage.includes('confirmado') || lastAssistantMessage.includes('reservado');

    if (isSimpleAck && (isRecentConfirmation || history.length > 2)) {
      const quickReplies = [
        'Imagina! Te espero com todo carinho. Até logo! 😊',
        'Combinado! Qualquer dúvida antes é só me chamar. Até breve! 😊',
        'Por nada! Vai ser um prazer te atender. Até logo! 😊'
      ];
      const quickReply = quickReplies[Math.floor(Math.random() * quickReplies.length)];
      await ConversationMemoryService.addMessage(tenantId, clientPhone, 'assistant', quickReply);
      return quickReply;
    }

    // 3. Calendário dinâmico dos próximos 7 dias no fuso de Brasília
    const todayYMD = getBrazilTodayYMD();
    const weeklyCalendarText = this.buildWeeklyCalendarOverview(todayYMD, availabilityRules, tenant);

    // 4. Identificação de intenção de agendamento ou horários
    const isBookingIntent =
      rawLower.includes('agendar') ||
      rawLower.includes('marcar') ||
      rawLower.includes('horario') ||
      rawLower.includes('horário') ||
      rawLower.includes('vaga') ||
      rawLower.includes('tem vaga') ||
      rawLower.includes('tem horario') ||
      rawLower.includes('tem horário') ||
      rawLower.includes('amanha') ||
      rawLower.includes('amanhã') ||
      rawLower.includes('hoje') ||
      rawLower.includes('sexta') ||
      rawLower.includes('sabado') ||
      rawLower.includes('sábado') ||
      rawLower.includes('segunda') ||
      rawLower.includes('terça') ||
      rawLower.includes('terca') ||
      rawLower.includes('quarta') ||
      rawLower.includes('quinta') ||
      rawLower.includes('semana que vem') ||
      rawLower.includes('proxima semana') ||
      rawLower.includes('próxima semana');

    let availabilityContext = '';

    if (isBookingIntent && activeServices.length > 0) {
      // Extrai data pretendida com validação de dias da semana
      const targetDateInfo = this.extractTargetDate(rawLower, todayYMD);

      // Histórico recente + mensagem atual para identificar se um serviço foi explicitado
      const combinedContext = [...history.map(h => h.content), rawLower].join(' ').toLowerCase();

      const matchedService = activeServices.find(s => {
        const sName = s.name.toLowerCase();
        if (combinedContext.includes(sName)) return true;
        if (sName.includes('alongamento') && combinedContext.includes('alongamento')) return true;
        if (sName.includes('fibra') && combinedContext.includes('fibra')) return true;
        if (sName.includes('gel') && combinedContext.includes('gel')) return true;
        if (sName.includes('cutilagem') && combinedContext.includes('cutilagem')) return true;
        if (sName.includes('manicure') && (combinedContext.includes('manicure') || combinedContext.includes('unha') || combinedContext.includes('mão') || combinedContext.includes('mao'))) return true;
        if (sName.includes('pedicure') && (combinedContext.includes('pedicure') || combinedContext.includes('pé') || combinedContext.includes('pe'))) return true;
        if ((sName.includes('esmalte') || sName.includes('esmaltação')) && (combinedContext.includes('esmalte') || combinedContext.includes('esmaltacao') || combinedContext.includes('esmaltação'))) return true;
        if (sName.includes('corte') && combinedContext.includes('corte')) return true;
        if (sName.includes('barba') && combinedContext.includes('barba')) return true;
        if (sName.includes('escova') && combinedContext.includes('escova')) return true;
        if (sName.includes('lash') && (combinedContext.includes('lash') || combinedContext.includes('cilios') || combinedContext.includes('cílios'))) return true;
        if (sName.includes('sobrancelha') && combinedContext.includes('sobrancelha')) return true;
        return false;
      });

      // Verifica se o cliente mencionou termos de manutenção sem especificar o tipo
      const isAmbiguousMaintenance =
        rawLower.includes('manuten') &&
        !rawLower.includes('alongamento') &&
        !rawLower.includes('fibra') &&
        !rawLower.includes('gel') &&
        !rawLower.includes('outra');

      if (isAmbiguousMaintenance) {
        availabilityContext = `A cliente perguntou sobre "manutenção", mas o estúdio oferece opções com duração e preços diferentes: Manutenção de Alongamento em Fibra (R$ 135) e Manutenção de Banho de Gel (R$ 110). Pergunte com carinho qual das duas ela gostaria de agendar para verificar o horário ideal.`;
      } else {
        try {
          const serviceToQuery = matchedService || activeServices[0];
          const slotsData = await AvailabilityService.getAvailableSlots({
            tenantId,
            serviceIds: [serviceToQuery.id],
            dateStr: targetDateInfo.dateStr
          });

          if (!slotsData.isOpen) {
            // DIA FECHADO!
            const reason = slotsData.reason || 'estamos fechados neste dia da semana';
            availabilityContext = `ALERTA DE DIA FECHADO: Em ${targetDateInfo.weekdayName} (${targetDateInfo.formattedDate}), o estúdio está FECHADO (${reason}). NUNCA diga que temos horários neste dia! Avise com carinho que neste dia estamos fechados, informe os próximos dias abertos disponíveis no calendário acima, e passe o link do site: ${showcaseUrl} para ela escolher outra data.`;
          } else {
            const allAvailable = [
              ...slotsData.slots.morning.filter((s: { available: boolean }) => s.available).map((s: { time: string }) => s.time),
              ...slotsData.slots.afternoon.filter((s: { available: boolean }) => s.available).map((s: { time: string }) => s.time),
              ...slotsData.slots.night.filter((s: { available: boolean }) => s.available).map((s: { time: string }) => s.time)
            ];

            if (matchedService) {
              const cleanName = matchedService.name.replace(/\s*\|\s*/g, ' - ').replace(/\s+/g, ' ').trim();
              if (allAvailable.length > 0) {
                const sampleSlots = allAvailable.slice(0, 3).join(' ou ');
                availabilityContext = `Para ${targetDateInfo.weekdayName}, dia ${targetDateInfo.formattedDate} (${cleanName}), temos horários livres às ${sampleSlots}. Ofereça essas opções e informe que ela pode escolher por aqui ou ver todos os horários e agendar no site: ${showcaseUrl}.`;
              } else {
                availabilityContext = `Para ${targetDateInfo.weekdayName}, dia ${targetDateInfo.formattedDate}, os horários para ${cleanName} já foram preenchidos. Convide-a com carinho a ver os próximos dias disponíveis no site: ${showcaseUrl} ou pergunte se prefere outro dia por aqui.`;
              }
            } else {
              // Cliente não especificou serviço, mas o dia está aberto
              const sampleServices = activeServices
                .slice(0, 3)
                .map(s => s.name.replace(/\s*\|\s*/g, ' - ').replace(/\s+/g, ' ').trim())
                .join(', ');

              if (allAvailable.length > 0) {
                availabilityContext = `Para ${targetDateInfo.weekdayName}, dia ${targetDateInfo.formattedDate}, o estúdio está ABERTO e temos vagas livres sim. Como ela ainda não informou o serviço, pergunte com carinho qual procedimento ela gostaria de agendar (dê como exemplo: ${sampleServices}) e informe que ela também pode conferir tudo no site: ${showcaseUrl}.`;
              } else {
                availabilityContext = `Para ${targetDateInfo.weekdayName}, dia ${targetDateInfo.formattedDate}, os horários já estão esgotados. Convide-a a ver as próximas datas pelo site: ${showcaseUrl}.`;
              }
            }
          }
        } catch (err: any) {
          console.warn('[AiAssistant] Erro ao consultar disponibilidade:', err.message);
        }
      }
    }

    // 5. Regra de Sinal Anti-Falta (específica para 1ª cliente ou geral)
    let depositInfo = '';
    let previousBookingsCount = 0;
    try {
      previousBookingsCount = await prisma.schedule.count({
        where: {
          tenantId,
          client: { phone: { endsWith: clientPhone.slice(-8) } }
        }
      });
    } catch {}

    const isFirstTimeClient = previousBookingsCount === 0;

    if (isFirstTimeClient && tenant.depositOnFirstBooking) {
      depositInfo = `Regra de Sinal Anti-Falta para novas clientes (1ª vez): solicitamos sinal antecipado de ${
        tenant.depositFirstBookingType === 'PERCENTAGE'
          ? `${Number(tenant.depositFirstBookingValue)}% do valor`
          : `R$ ${Number(tenant.depositFirstBookingValue).toFixed(2)}`
      } via PIX direto para confirmar a reserva do horário. Chave PIX do salão: ${tenant.pixKey || ''}${tenant.pixKeyHolder ? ` (Favorecido: ${tenant.pixKeyHolder})` : ''}. O valor é abatido no dia do atendimento.`;
    } else if (tenant.depositRequired) {
      depositInfo = `Regra de Sinal padrão do salão: ${
        tenant.depositType === 'PERCENTAGE'
          ? `${Number(tenant.depositAmount)}%`
          : `R$ ${Number(tenant.depositAmount).toFixed(2)}`
      } via PIX direto. Chave PIX: ${tenant.pixKey || ''}${tenant.pixKeyHolder ? ` (${tenant.pixKeyHolder})` : ''}.`;
    }

    // 6. Monta o Prompt com Padrão Humanizer
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('sua_chave')) {
      const fallback = this.generateFallbackResponse(tenant, activeServices, availabilityContext, params.clientName);
      await ConversationMemoryService.addMessage(tenantId, clientPhone, 'assistant', fallback);
      return fallback;
    }

    const servicesList = activeServices
      .map(s => `• ${s.name.replace(/\s*\|\s*/g, ' - ')}: R$ ${Number(s.price).toFixed(2)} (${s.durationMinutes} min)`)
      .join('\n');

    const productsList = activeProducts.length > 0
      ? activeProducts
          .map(p => `• ${p.name} (${p.category}): R$ ${Number(p.salePrice).toFixed(2)}${p.description ? ` - ${p.description}` : ''}`)
          .join('\n')
      : 'Nenhum produto cadastrado no momento.';

    const coursesList = activeCourses.length > 0
      ? activeCourses
          .map(c => `• ${c.title}: ${c.price ? `R$ ${Number(c.price).toFixed(2)}` : 'Consulte valores'}${c.description ? ` - ${c.description}` : ''}`)
          .join('\n')
      : 'Nenhum curso cadastrado no momento.';

    const professionalsList = professionals.map(p => p.name).join(', ') || 'Nossa equipe';

    const fullAddress = [tenant.addressStreet, tenant.addressNumber, tenant.addressNeighborhood, tenant.addressCity]
      .filter(Boolean)
      .join(', ');

    const openingHours = `${tenant.openingTime || '09:00'} às ${tenant.closingTime || '20:00'}`;

    const systemPrompt = `Você é a recepcionista oficial do estúdio "${tenant.name}".
Seu objetivo é conversar com a cliente de forma humana, simpática e ÁGIL pelo WhatsApp, conduzindo o agendamento de forma leve, acolhedora e prestativa.

DADOS DO ESTABELECIMENTO:
- Estabelecimento: ${tenant.name}
- Endereço: ${fullAddress || 'Centro'}
- Horário Padrão: ${openingHours}
- Profissional Responsável: ${professionalsList}
- Link Oficial da Vitrine e Agendamento Online: ${showcaseUrl}

CALENDÁRIO OFICIAL DOS PRÓXIMOS DIAS (HORÁRIO DE BRASÍLIA):
${weeklyCalendarText}
${depositInfo ? `\nPOLÍTICA DE SINAL ANTI-FALTA:\n${depositInfo}\n` : ''}
${availabilityContext ? `\nDISPONIBILIDADE REAL DE HORÁRIOS:\n${availabilityContext}\n` : ''}
SERVIÇOS DISPONÍVEIS:
${servicesList}
${productsList ? `\nPRODUTOS À VENDA:\n${productsList}` : ''}
${coursesList ? `\nCURSOS E TREINAMENTOS:\n${coursesList}` : ''}

${aiSettings?.customInstructions ? `\nINSTRUÇÕES E DIRETRIZES ESPECÍFICAS DO SALÃO (SIGA RIGOROSAMENTE - PRIORIDADE MÁXIMA):\n${aiSettings.customInstructions}\n` : ''}

REGRAS OBRIGATÓRIAS DE COMUNICAÇÃO NO WHATSAPP (SIGA RIGOROSAMENTE):
1. RESPOSTAS CURTAS E DIRETAS (MÁXIMO 2 A 3 FRASES CURTAS):
   - Nunca envie parágrafos longos ou textos gigantes. No WhatsApp as pessoas querem agilidade.
   - Trate sempre a cliente no feminino ("Seja bem-vinda"). NUNCA chame a pessoa de "cliente".
   - Use no máximo 1 emoji discreto por mensagem.

2. DUALIDADE: SITE OU WHATSAPP (SEMPRE INFORMAR AMBAS AS OPÇÕES):
   - Em conversas sobre agendamento, horários ou dúvidas de serviços, SEMPRE informe o link da vitrine para que ela possa ver todos os horários e agendar online, OU ofereça para continuar por aqui mesmo pelo WhatsApp.
   - Exemplo: "Você pode ver todos os nossos horários e agendar direto no site: ${showcaseUrl} ou, se preferir, pode me dizer o horário que fica melhor que eu já reservo por aqui!"

3. SEGUIR FIELMENTE AS CONFIGURAÇÕES DO SALÃO:
   - Siga rigorosamente as instruções personalizadas do estabelecimento cadastradas acima (valores, diferenciação de fibra vs gel, regras de sinal e chave PIX).

4. PRECISÃO ABSOLUTA DE DATAS E DIAS DA SEMANA:
   - NUNCA invente datas ou dias da semana! Use rigorosamente o CALENDÁRIO OFICIAL acima.
   - Se um dia estiver marcado como FECHADO no calendário ou na disponibilidade, NUNCA diga que temos vaga nesse dia. Avise com carinho que estamos fechados e sugira o próximo dia aberto.
   - Se a disponibilidade indicar horários específicos, cite apenas esses horários reais.

5. QUANDO A CLIENTE APENAS AGRADECER OU DIZER "OK":
   - Responda apenas um encerramento breve e afetuoso (ex: "Imagina, te espero com carinho! Até lá! 😊").
   - NUNCA repita toda a confirmação de endereço, valores e procedimentos em loop!

6. NUNCA ALUCINAR AÇÕES INTERNAS DO SISTEMA:
   - Nunca invente que vai "desativar a secretária", "desligar a IA" ou "modificar o sistema". NUNCA use clichês robóticos ("Como assistente virtual...", "Certamente!").`;

    try {
      const conversationMessages = history.map(turn => ({
        role: turn.role === 'assistant' ? 'assistant' : 'user',
        content: turn.content
      }));

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.getModel(),
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationMessages
          ],
          temperature: 0.3,
          max_tokens: 300
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://marquesuahora.com.br',
            'X-Title': 'MarqueSuaHora',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const rawAnswer = response.data?.choices?.[0]?.message?.content?.trim();
      const sanitized = HumanizerGuardrail.sanitize(rawAnswer || '');

      const finalReply = sanitized || this.generateFallbackResponse(tenant, activeServices, availabilityContext, params.clientName);

      // Armazena no histórico
      await ConversationMemoryService.addMessage(tenantId, clientPhone, 'assistant', finalReply);

      return finalReply;
    } catch (err: any) {
      console.warn('[AiAssistant] Erro ao chamar LLM via OpenRouter:', err.response?.data || err.message);
      const fallback = this.generateFallbackResponse(tenant, activeServices, availabilityContext, params.clientName);
      await ConversationMemoryService.addMessage(tenantId, clientPhone, 'assistant', fallback);
      return fallback;
    }
  }

  /**
   * Constrói visão geral dos próximos 7 dias com datas reais e status de funcionamento.
   */
  private static buildWeeklyCalendarOverview(
    todayYMD: string,
    rules: Array<{ dayOfWeek: number; isActive?: boolean; isOpen?: boolean; startTime: string; endTime: string }>,
    tenant: any
  ): string {
    const { targetDate: baseDate } = parseYMDToSafeUtcDate(todayYMD);
    const lines: string[] = [];

    const totalRules = rules.length;
    const ruleMap = new Map<number, { isActive?: boolean; isOpen?: boolean; startTime: string; endTime: string }>();
    for (const r of rules) {
      ruleMap.set(r.dayOfWeek, r);
    }

    for (let offset = 0; offset < 7; offset++) {
      const current = new Date(baseDate.getTime() + offset * 86400000);
      const y = current.getUTCFullYear();
      const m = String(current.getUTCMonth() + 1).padStart(2, '0');
      const d = String(current.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dow = current.getUTCDay();
      const dowName = WEEKDAY_NAMES[dow];

      let label = `${dowName}, ${d}/${m}`;
      if (offset === 0) label = `HOJE (${dowName}, ${d}/${m})`;
      else if (offset === 1) label = `AMANHÃ (${dowName}, ${d}/${m})`;

      const rule = ruleMap.get(dow);
      if (totalRules > 0) {
        const isDayOpen = rule ? (rule.isActive !== undefined ? rule.isActive : rule.isOpen ?? true) : false;
        if (!isDayOpen) {
          lines.push(`• ${label}: FECHADO`);
        } else {
          lines.push(`• ${label}: ABERTO (${rule?.startTime || tenant.openingTime || '09:00'} às ${rule?.endTime || tenant.closingTime || '20:00'})`);
        }
      } else {
        // Sem regras cadastradas: domingo fechado, outros dias horário padrão
        if (dow === 0) {
          lines.push(`• ${label}: FECHADO`);
        } else {
          lines.push(`• ${label}: ABERTO (${tenant.openingTime || '09:00'} às ${tenant.closingTime || '20:00'})`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Extrai a data pretendida a partir de termos em português com precisão de calendário.
   */
  public static extractTargetDate(raw: string, todayYMD: string): ExtractedTargetDate {
    const { targetDate: baseDate, dayOfWeek: todayDow } = parseYMDToSafeUtcDate(todayYMD);

    // 1. Termos relativos diretos
    if (raw.includes('depois de amanha') || raw.includes('depois de amanhã')) {
      const target = new Date(baseDate.getTime() + 2 * 86400000);
      return this.formatDateOutput(target, true);
    }

    if (raw.includes('amanha') || raw.includes('amanhã')) {
      const target = new Date(baseDate.getTime() + 1 * 86400000);
      return this.formatDateOutput(target, true);
    }

    if (raw.includes('hoje')) {
      return this.formatDateOutput(baseDate, true);
    }

    // 2. Formato numérico explícito: "dia 23", "dia 27", "23/10", "27/10"
    const slashMatch = raw.match(/\b([0-3]?[0-9])\/(0?[1-9]|1[0-2])\b/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10);
      const year = baseDate.getUTCFullYear();
      const target = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return this.formatDateOutput(target, true);
    }

    const dayNumberMatch = raw.match(/\bdia\s+([0-3]?[0-9])\b/);
    if (dayNumberMatch) {
      const day = parseInt(dayNumberMatch[1], 10);
      let month = baseDate.getUTCMonth();
      let year = baseDate.getUTCFullYear();
      // Se o dia mencionado já passou mais de 10 dias em relação a hoje, assume próximo mês
      if (day < baseDate.getUTCDate() - 3) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
      const target = new Date(Date.UTC(year, month, day, 12, 0, 0));
      return this.formatDateOutput(target, true);
    }

    // 3. Dias da semana
    const weekMap: Record<string, number> = {
      domingo: 0,
      segunda: 1,
      terca: 2,
      terça: 2,
      quarta: 3,
      quinta: 4,
      sexta: 5,
      sabado: 6,
      sábado: 6
    };

    for (const [dayName, targetDow] of Object.entries(weekMap)) {
      if (raw.includes(dayName)) {
        let diff = targetDow - todayDow;
        if (raw.includes('que vem') || raw.includes('próxima') || raw.includes('proxima')) {
          if (diff <= 0) diff += 7;
        } else if (diff < 0) {
          diff += 7; // Próxima ocorrência daquele dia
        } else if (diff === 0 && !raw.includes('hoje')) {
          // Ex: hoje é quinta e a pessoa diz "quinta": se for durante o dia, é hoje, se disser que vem é +7
          diff = 0;
        }
        const target = new Date(baseDate.getTime() + diff * 86400000);
        return this.formatDateOutput(target, true);
      }
    }

    // Fallback padrão: se hoje ainda não passou da metade do expediente, hoje; senão amanhã
    return this.formatDateOutput(baseDate, false);
  }

  private static formatDateOutput(date: Date, isExplicit: boolean): ExtractedTargetDate {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const dow = date.getUTCDay();

    return {
      dateStr: `${y}-${m}-${d}`,
      formattedDate: `${d}/${m}`,
      weekdayName: WEEKDAY_NAMES[dow],
      dayOfWeek: dow,
      isExplicit
    };
  }

  /**
   * Resposta fallback humanizada quando a LLM estiver temporariamente indisponível.
   */
  private static generateFallbackResponse(
    tenant: any,
    services: any[],
    availabilityContext?: string,
    clientName?: string | null
  ): string {
    const firstName = clientName ? clientName.trim().split(' ')[0] : '';
    const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
    const showcaseUrl = `https://marquesuahora.com.br/${tenant.slug || 'studio-elegance'}`;

    if (availabilityContext && availabilityContext.includes('FECHADO')) {
      return (
        `${greeting} ${availabilityContext}\n\n` +
        `Você pode escolher outro dia direto pelo site: ${showcaseUrl} ou me falar por aqui mesmo qual dia prefere!`
      );
    }

    if (availabilityContext && availabilityContext.includes('manutenção')) {
      return (
        `${greeting} Você gostaria de fazer Manutenção de Alongamento em Fibra ou Banho de Gel?\n\n` +
        `Se preferir ver todas as opções e horários livres, acesse: ${showcaseUrl} ou me responda por aqui!`
      );
    }

    if (availabilityContext) {
      return (
        `${greeting} ${availabilityContext}\n\n` +
        `Você pode agendar direto no site: ${showcaseUrl} ou me dizer por aqui qual horário fica melhor!`
      );
    }

    return (
      `${greeting} Seja muito bem-vinda ao estúdio *${tenant.name}*!\n\n` +
      `Você pode conferir todos os horários e serviços pelo link: ${showcaseUrl} ou me falar por aqui o que gostaria de agendar!`
    );
  }
}
