import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { AvailabilityService } from '../schedules/availability.service';
import { ConversationMemoryService } from './conversation-memory.service';
import { HumanizerGuardrail } from './humanizer-guardrail';

export interface ProcessAssistantMessageParams {
  tenantId: string;
  clientPhone: string;
  clientName?: string | null;
  messageText: string;
}

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

    // 1. Carrega dados do estabelecimento, configurações de IA, serviços, produtos e cursos
    const [tenant, aiSettings, activeServices, professionals, activeProducts, activeCourses] = await Promise.all([
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

    // 2. Transbordo para atendente humano se solicitado explicitamente
    if (
      rawLower.includes('falar com atendente') ||
      rawLower.includes('atendente humano') ||
      rawLower.includes('falar com pessoa') ||
      rawLower.includes('alguém humano') ||
      rawLower.includes('falar com alguem')
    ) {
      const handoffReply = `Vou avisar nossa equipe da recepção agora mesmo para te atender por aqui pelo WhatsApp! Enquanto isso, se quiser conferir nossos horários e serviços online, nosso link é: https://marquesuahora.com.br/${tenant.slug}`;
      await ConversationMemoryService.addMessage(tenantId, clientPhone, 'assistant', handoffReply);
      return handoffReply;
    }

    // 3. Tenta identificar se o cliente está buscando agendar ou consultar horários
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
      rawLower.includes('semana que vem');

    let availabilityContext = '';

    if (isBookingIntent && activeServices.length > 0) {
      // Extrai data aproximada da mensagem
      const targetDate = this.extractDateFromMessage(rawLower);
      const dateStr = targetDate.toISOString().slice(0, 10);
      const [y, m, d] = dateStr.split('-');
      const formattedDate = `${d}/${m}/${y}`;

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
      } else if (matchedService) {
        try {
          const slotsData = await AvailabilityService.getAvailableSlots({
            tenantId,
            serviceIds: [matchedService.id],
            dateStr
          });

          const allAvailable = [
            ...slotsData.slots.morning.filter(s => s.available).map(s => s.time),
            ...slotsData.slots.afternoon.filter(s => s.available).map(s => s.time),
            ...slotsData.slots.night.filter(s => s.available).map(s => s.time)
          ];

          const cleanName = matchedService.name.replace(/\s*\|\s*/g, ' - ').replace(/\s+/g, ' ').trim();

          if (allAvailable.length > 0) {
            const sampleSlots = allAvailable.slice(0, 3).join(' ou ');
            availabilityContext = `Para ${formattedDate} (${cleanName}), temos horários livres às ${sampleSlots}. Pergunte qual deles fica melhor para ela.`;
          } else {
            availabilityContext = `Para ${formattedDate}, os horários para ${cleanName} já foram preenchidos. Pergunte se ela gostaria de ver horários para outro dia.`;
          }
        } catch (err: any) {
          console.warn('[AiAssistant] Erro ao consultar disponibilidade:', err.message);
        }
      } else {
        // Cliente perguntou de data/horário mas NÃO indicou qual serviço quer fazer
        const sampleServices = activeServices
          .slice(0, 3)
          .map(s => s.name.replace(/\s*\|\s*/g, ' - ').replace(/\s+/g, ' ').trim())
          .join(', ');
        availabilityContext = `O cliente perguntou sobre horários para ${formattedDate}, mas NÃO informou qual procedimento deseja realizar. NUNCA adivinhe. Responda confirmando que temos horários disponíveis sim e pergunte com carinho qual procedimento ela gostaria de agendar (dê como exemplo: ${sampleServices}), para checar a duração certinha.`;
      }
    }

    // 4. Regra de Sinal Anti-Falta (específica para 1ª cliente ou geral)
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

    // 5. Monta o Prompt com Padrão Humanizer
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

    const systemPrompt = `Você é a recepcionista acolhedora, atenciosa e educada do estúdio "${tenant.name}".
Seu objetivo é conversar com a cliente de forma humana e calorosa pelo WhatsApp, esclarecer dúvidas com segurança e conduzir o agendamento passo a passo.

DADOS DO ESTABELECIMENTO:
- Estabelecimento: ${tenant.name}
- Endereço: ${fullAddress || 'Centro'}
- Horário de Atendimento: ${openingHours}
- Profissional Responsável: ${professionalsList}
${depositInfo ? `\nPOLÍTICA DE SINAL ANTI-FALTA:\n${depositInfo}\n` : ''}
${availabilityContext ? `\nDISPONIBILIDADE / SITUAÇÃO DE HORÁRIOS:\n${availabilityContext}\n` : ''}
SERVIÇOS DO ESTABELECIMENTO:
${servicesList}

PRODUTOS À VENDA:
${productsList}

CURSOS E TREINAMENTOS:
${coursesList}
${aiSettings?.customInstructions ? `\nINSTRUÇÕES ESPECÍFICAS DO SALÃO:\n${aiSettings.customInstructions}\n` : ''}

REGRAS OBRIGATÓRIAS DE COMUNICAÇÃO NO WHATSAPP (SIGA RIGOROSAMENTE):
1. TOM ACOLHEDOR E NATURAL: Fale de forma simpática e educada, como uma profissional de atendimento de beleza. Trate sempre a cliente no feminino ("Seja bem-vinda"). NUNCA chame a pessoa de "cliente".
2. REGRA DO LINK DO SITE (EXTREMAMENTE IMPORTANTE):
   - NUNCA envie links do site no início ou no meio da conversa!
   - NUNCA termine mensagens com frases automáticas como "Se preferir, agende pelo link oficial...". Isso parece robô e desvaloriza o atendimento.
   - Envie o link (https://marquesuahora.com.br/${tenant.slug}) APENAS se a cliente pedir expressamente ("tem site?", "qual o link?") ou no momento final da conversa para pagamento do sinal de reserva.
3. CONDUÇÃO DINÂMICA DO AGENDAMENTO:
   - Se a cliente perguntou por horários sem citar o procedimento: confirme que temos horários livres e pergunte qual procedimento ela deseja fazer (cite 2 a 3 exemplos naturais, ex: alongamento em fibra, banho de gel ou manutenção).
   - Se a cliente disse um termo genérico (ex: apenas "manutenção"): pergunte primeiro se é manutenção de alongamento ou de banho de gel para saber a duração correta.
   - Se o procedimento já estiver claro e você tiver os horários: ofereça 2 opções diretas (ex: "Temos às 11:30 ou às 14:00. Qual desses dois fica melhor para você?").
4. RESPOSTAS CURTAS (PADRÃO WHATSAPP):
   - Responda em no máximo 2 a 3 frases curtas. Mensagens longas não são lidas no WhatsApp.
   - Sempre termine com uma pergunta direta convidando a cliente a responder.
   - Remova caracteres de sistema: nunca escreva barras verticais ("|"). Use linguagem natural.
5. TRAVAS:
   - Não use frases robóticas ("Como uma IA...", "Certamente!", "Com certeza!").
   - Não exagere em emojis. Use no máximo 1 emoji discreto por mensagem.`;

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
   * Extrai a data pretendida a partir de termos em português (hoje, amanhã, etc.).
   */
  private static extractDateFromMessage(raw: string): Date {
    const now = new Date();

    if (raw.includes('amanha') || raw.includes('amanhã')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    if (raw.includes('depois de amanha') || raw.includes('depois de amanhã')) {
      const next = new Date(now);
      next.setDate(next.getDate() + 2);
      return next;
    }

    // Dias da semana
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

    for (const [dayName, targetDay] of Object.entries(weekMap)) {
      if (raw.includes(dayName)) {
        const result = new Date(now);
        const currentDay = result.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7; // Próximo dia correspondente
        result.setDate(result.getDate() + diff);
        return result;
      }
    }

    return now;
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

    if (availabilityContext && availabilityContext.includes('NÃO informou qual serviço')) {
      const sample = services
        .slice(0, 3)
        .map(s => s.name.replace(/\s*\|\s*/g, ' - ').replace(/\s+/g, ' ').trim())
        .join(', ');

      return (
        `${greeting} Temos horários disponíveis sim!\n\n` +
        `Para eu verificar as opções certinhas com a duração ideal, qual procedimento você gostaria de realizar? (Por exemplo: ${sample}).`
      );
    }

    if (availabilityContext && availabilityContext.includes('manutenção')) {
      return (
        `${greeting} Claro! Você gostaria de fazer a manutenção de Alongamento em Fibra ou de Banho de Gel?`
      );
    }

    if (availabilityContext) {
      return (
        `${greeting} ${availabilityContext}\n\n` +
        `Algum desses horários fica bom para você?`
      );
    }

    return (
      `${greeting} Seja muito bem-vinda ao estúdio *${tenant.name}*!\n\n` +
      `Como posso te ajudar hoje? Me conte qual procedimento você gostaria de agendar.`
    );
  }
}
