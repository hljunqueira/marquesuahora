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

      if (matchedService) {
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

          if (allAvailable.length > 0) {
            const sampleSlots = allAvailable.slice(0, 5).join(', ');
            availabilityContext = `Para ${formattedDate} (${matchedService.name}), temos horários livres como: ${sampleSlots}.`;
          } else {
            availabilityContext = `Para ${formattedDate}, a agenda está completa para o serviço de "${matchedService.name}". Sugira outro dia ou o link oficial.`;
          }
        } catch (err: any) {
          console.warn('[AiAssistant] Erro ao consultar disponibilidade:', err.message);
        }
      } else {
        // Cliente perguntou de data/horário mas NÃO indicou qual serviço quer fazer
        const sampleServices = activeServices.slice(0, 4).map(s => s.name).join(', ');
        availabilityContext = `O cliente perguntou sobre horários para ${formattedDate}, mas NÃO informou qual serviço ou procedimento deseja realizar. NUNCA assuma nem adivinhe o serviço. Responda confirmando que temos horários disponíveis para essa data e PERGUNTE com carinho qual serviço ela gostaria de fazer (dê como exemplo opções como: ${sampleServices}), para que você possa checar os horários ideais com a duração exata.`;
      }
    }

    // 4. Regra de Sinal Anti-Falta (específica para 1ª cliente ou geral)
    let depositInfo = '';
    if (tenant.depositRequired) {
      let previousBookingsCount = 0;
      try {
        previousBookingsCount = await prisma.schedule.count({
          where: {
            tenantId,
            client: { phone: { endsWith: clientPhone.slice(-8) } }
          }
        });
      } catch {}

      if (previousBookingsCount === 0 && tenant.depositFirstBookingType) {
        depositInfo = `Regra de Sinal (1ª vez no salão): exigimos sinal de ${
          tenant.depositFirstBookingType === 'PERCENTAGE'
            ? `${Number(tenant.depositFirstBookingValue)}% do valor`
            : `R$ ${Number(tenant.depositFirstBookingValue).toFixed(2)}`
        } via PIX direto para confirmar a reserva. Chave PIX: ${tenant.pixKey || 'fornecida no agendamento'}.`;
      } else {
        depositInfo = `Regra de Sinal padrão: ${
          tenant.depositType === 'PERCENTAGE'
            ? `${Number(tenant.depositAmount)}%`
            : `R$ ${Number(tenant.depositAmount).toFixed(2)}`
        } via PIX direto.`;
      }
    }

    // 5. Monta o Prompt com Padrão Humanizer
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('sua_chave')) {
      const fallback = this.generateFallbackResponse(tenant, activeServices, availabilityContext, params.clientName);
      await ConversationMemoryService.addMessage(tenantId, clientPhone, 'assistant', fallback);
      return fallback;
    }

    const servicesList = activeServices
      .map(s => `• ${s.name}: R$ ${Number(s.price).toFixed(2)} (${s.durationMinutes} min)`)
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

    const systemPrompt = `Você é a recepcionista atenciosa, educada e prestativa do estabelecimento "${tenant.name}".
Seu objetivo é acolher a cliente com carinho e naturalidade, esclarecer dúvidas com segurança e conduzir com elegância para agendamento, compra de produtos ou cursos.

DADOS DO ESTABELECIMENTO:
- Estabelecimento: ${tenant.name}
- Endereço: ${fullAddress || 'Consulte nosso endereço no link'}
- Horário de Atendimento: ${openingHours}
- Profissionais: ${professionalsList}
- Link Oficial: https://marquesuahora.com.br/${tenant.slug}
${depositInfo ? `\nPOLÍTICA DE SINAL ANTI-FALTA:\n${depositInfo}\n` : ''}
${availabilityContext ? `\nDISPONIBILIDADE / SITUAÇÃO DE HORÁRIOS:\n${availabilityContext}\n` : ''}
SERVIÇOS OFERECIDOS:
${servicesList}

PRODUTOS À VENDA:
${productsList}
Link da Vitrine de Produtos: https://marquesuahora.com.br/${tenant.slug}#produtos

CURSOS E TREINAMENTOS:
${coursesList}
Link da Vitrine de Cursos: https://marquesuahora.com.br/${tenant.slug}#cursos
${aiSettings?.customInstructions ? `\nINSTRUÇÕES ADICIONAIS DO SALÃO:\n${aiSettings.customInstructions}\n` : ''}

REGRAS DE ABORDAGEM E COMUNICAÇÃO:
1. Responda em tom humano, caloroso e simpático, como uma excelente recepcionista conversando no WhatsApp.
2. SE O CLIENTE PERGUNTAR POR HORÁRIOS/VAGAS (ex: "tem horário para amanhã?"):
   - Se ela NÃO disse qual procedimento quer fazer: confirme que temos horários disponíveis sim e PERGUNTE com gentileza qual serviço ela gostaria de agendar (cite 2 a 3 opções de exemplo), explicando que precisa saber para checar a duração exata do atendimento.
   - Se ela JÁ disse qual procedimento quer e você tem os horários livres acima: informe os horários disponíveis e pergunte qual fica melhor para ela.
3. SE O CLIENTE PERGUNTAR SOBRE PRODUTOS (cosméticos, cuidados, itens para levar):
   - Apresente os produtos da lista acima com seus respectivos valores e convide-a a ver mais detalhes ou adquirir na vitrine online: https://marquesuahora.com.br/${tenant.slug}#produtos.
4. SE O CLIENTE PERGUNTAR SOBRE CURSOS (aulas, aprender a técnica, formação):
   - Apresente os cursos disponíveis e oriente que ela pode conferir a grade completa e detalhes na aba de cursos: https://marquesuahora.com.br/${tenant.slug}#cursos.
5. Sempre que oportuno, forneça o link oficial para agendamento online: https://marquesuahora.com.br/${tenant.slug}.
6. Seja concisa: responda em 1 a 2 parágrafos curtos.
7. NUNCA use frases robóticas ("Como uma IA...", "Certamente!", "Com certeza!"). Não use travessões longos. Não use emojis em excesso.`;

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
    const greeting = clientName ? `Olá, ${clientName}!` : 'Olá!';

    if (availabilityContext && availabilityContext.includes('NÃO informou qual serviço')) {
      const sample = services.slice(0, 3).map(s => s.name).join(', ');
      return (
        `${greeting} Temos horários disponíveis sim!\n\n` +
        `Para eu te passar as opções com a duração certinha, qual procedimento você gostaria de realizar? (Por exemplo: ${sample}, entre outros).\n\n` +
        `Se preferir ver todos os serviços, produtos, cursos e agendar online agora mesmo:\n` +
        `👉 https://marquesuahora.com.br/${tenant.slug}`
      );
    }

    if (availabilityContext) {
      return (
        `${greeting} ${availabilityContext}\n\n` +
        `Para garantir sua vaga e escolher o profissional da sua preferência, acesse nosso link direto:\n` +
        `👉 https://marquesuahora.com.br/${tenant.slug}`
      );
    }

    return (
      `${greeting} Que prazer ter você em contato com o *${tenant.name}*!\n\n` +
      `Como posso te ajudar hoje?\n` +
      `• Agendamento de horários (qual procedimento você procura?)\n` +
      `• Conhecer nossos serviços, produtos e cursos\n` +
      `• Dúvidas gerais\n\n` +
      `Você também pode conferir tudo e agendar diretamente pelo nosso link oficial:\n` +
      `👉 https://marquesuahora.com.br/${tenant.slug}`
    );
  }
}
