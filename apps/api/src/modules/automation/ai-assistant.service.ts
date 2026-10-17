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

    // 1. Carrega dados do estabelecimento e configurações de IA
    const [tenant, aiSettings, activeServices, professionals] = await Promise.all([
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
      rawLower.includes('sábado');

    let availabilityContext = '';

    if (isBookingIntent && activeServices.length > 0) {
      // Extrai data aproximada da mensagem
      const targetDate = this.extractDateFromMessage(rawLower);
      const dateStr = targetDate.toISOString().slice(0, 10);

      // Tenta associar serviço mencionado
      const matchedService = activeServices.find(s =>
        rawLower.includes(s.name.toLowerCase()) ||
        (s.name.toLowerCase().includes('corte') && rawLower.includes('corte')) ||
        (s.name.toLowerCase().includes('unha') && (rawLower.includes('unha') || rawLower.includes('manicure') || rawLower.includes('pedicure'))) ||
        (s.name.toLowerCase().includes('barba') && rawLower.includes('barba')) ||
        (s.name.toLowerCase().includes('escova') && rawLower.includes('escova'))
      ) || activeServices[0];

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

        const [y, m, d] = dateStr.split('-');
        const formattedDate = `${d}/${m}/${y}`;

        if (allAvailable.length > 0) {
          const sampleSlots = allAvailable.slice(0, 5).join(', ');
          availabilityContext = `Para ${formattedDate} (${matchedService.name}), temos horários livres como: ${sampleSlots}.`;
        } else {
          availabilityContext = `Para ${formattedDate}, a agenda está completa para esse serviço. Sugira outro dia ou o link oficial.`;
        }
      } catch (err: any) {
        console.warn('[AiAssistant] Erro ao consultar disponibilidade:', err.message);
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

    const professionalsList = professionals.map(p => p.name).join(', ') || 'Nossa equipe';

    const fullAddress = [tenant.addressStreet, tenant.addressNumber, tenant.addressNeighborhood, tenant.addressCity]
      .filter(Boolean)
      .join(', ');

    const openingHours = `${tenant.openingTime || '09:00'} às ${tenant.closingTime || '20:00'}`;

    const systemPrompt = `Você é a recepcionista atenciosa e educada do estabelecimento "${tenant.name}".
Seu objetivo é acolher o cliente, responder perguntas com clareza e facilitar o agendamento de horários.

DADOS DO ESTABELECIMENTO:
- Estabelecimento: ${tenant.name}
- Endereço: ${fullAddress || 'Consulte nosso endereço no link'}
- Horário de Atendimento: ${openingHours}
- Profissionais: ${professionalsList}
- Link Oficial de Agendamento: https://marquesuahora.com.br/${tenant.slug}
${depositInfo ? `\nPOLÍTICA DE SINAL ANTI-FALTA:\n${depositInfo}\n` : ''}
${availabilityContext ? `\nDISPONIBILIDADE EM TEMPO REAL:\n${availabilityContext}\n` : ''}
SERVIÇOS OFERECIDOS:
${servicesList}
${aiSettings?.customInstructions ? `\nINSTRUÇÕES ADICIONAIS DO SALÃO:\n${aiSettings.customInstructions}\n` : ''}

REGRAS ESTRITAS DE COMUNICAÇÃO:
1. Responda em tom natural e caloroso de salão de beleza, como uma pessoa real conversando no WhatsApp.
2. Seja conciso: use 1 a 2 parágrafos curtos.
3. Se o cliente perguntou sobre horários e você tem a disponibilidade acima, informe os horários e pergunte qual prefere.
4. Finalize com gentileza convidando para confirmar o horário ou enviar o link oficial.
5. NUNCA use frases prontas de robô como "Certamente!", "Com certeza!", "Como uma inteligência artificial...", "Espero ter ajudado!".
6. NUNCA use travessões longos como em dashes (—). Use vírgulas ou pontos.
7. Evite emojis decorativos excessivos.`;

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

    if (availabilityContext) {
      return (
        `${greeting} ${availabilityContext}\n\n` +
        `Para garantir sua vaga e escolher o profissional da sua preferência, acesse nosso link direto:\n` +
        `👉 https://marquesuahora.com.br/${tenant.slug}`
      );
    }

    return (
      `${greeting} Obrigado pela sua mensagem no *${tenant.name}*!\n\n` +
      `Para consultar nossos serviços, valores e agendar seu horário com facilidade pelo celular, acesse:\n` +
      `👉 https://marquesuahora.com.br/${tenant.slug}\n\n` +
      `Nossa equipe da recepção também está à disposição por aqui se precisar de algo especial!`
    );
  }
}
