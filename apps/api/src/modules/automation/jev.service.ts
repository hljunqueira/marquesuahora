import axios from 'axios';

export type WhatsAppIntent =
  | 'CONFIRM_APPOINTMENT'
  | 'CANCEL_OR_RESCHEDULE'
  | 'ACCEPT_WAITLIST_SLOT'
  | 'NPS_FEEDBACK'
  | 'GENERAL_INQUIRY';

export interface JevDecisionResult {
  intent: WhatsAppIntent;
  confidence: number;
  extractedScore?: number;
  extractedReason?: string;
}

/**
 * TypeSafe Jev (System One Decision Engine)
 * Tomada de decisões tipadas de alta velocidade para mensagens recebidas via WhatsApp.
 */
export class JevDecisionEngine {
  /**
   * Avaliação assíncrona com TypeSafe Jev API (jev-latest) e fallback local determinístico instantâneo.
   */
  public static async classifyAsync(
    messageText: string,
    context?: 'NPS_PENDING' | 'REMINDER_PENDING'
  ): Promise<JevDecisionResult> {
    const local = this.classify(messageText, context);

    // Se já é uma confirmação/cancelamento/NPS com alta confiança, não precisa de chamada remota
    const typesafeKey = process.env.TYPESAFE_API_KEY;
    if (local.intent !== 'GENERAL_INQUIRY' || !typesafeKey || typesafeKey.includes('sua_chave')) {
      return local;
    }

    try {
      const response = await axios.post(
        'https://api.typesafe.ai/v1/systemone',
        {
          state: messageText,
          model: 'jev-latest',
          questions: {
            intent: {
              type: 'choice',
              instructions: 'Qual é a intenção da mensagem enviada pelo cliente no WhatsApp para o salão de beleza/barbearia/estética?',
              criteria: {
                CONFIRM_APPOINTMENT: 'Cliente confirmando presença no agendamento marcado (ex: sim, confirmo, vou, 1, estarei lá)',
                CANCEL_OR_RESCHEDULE: 'Cliente querendo cancelar, desmarcar, reagendar ou trocar de horário (ex: não posso ir, cancela, 2, pode mudar?)',
                ACCEPT_WAITLIST_SLOT: 'Cliente aceitando vaga disponível que surgiu na fila de espera (ex: sim aceito, quero a vaga, pode marcar)',
                NPS_FEEDBACK: 'Cliente dando nota, avaliação ou feedback sobre o serviço recebido (ex: amei, odiei, nota 10, 5 estrelas)',
                GENERAL_INQUIRY: 'Qualquer outra dúvida, pergunta sobre preços, serviços, horários, localização ou conversa aberta'
              }
            }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${typesafeKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 4000
        }
      );

      const choice = response.data?.answers?.intent?.choice;
      const confidence = response.data?.answers?.intent?.confidence || 0.95;

      if (choice && ['CONFIRM_APPOINTMENT', 'CANCEL_OR_RESCHEDULE', 'ACCEPT_WAITLIST_SLOT', 'NPS_FEEDBACK', 'GENERAL_INQUIRY'].includes(choice)) {
        return {
          intent: choice as WhatsAppIntent,
          confidence
        };
      }
    } catch (err: any) {
      console.warn('[TypeSafe Jev API] Consulta remota falhou ou excedeu timeout, mantendo decisão local:', err.response?.data || err.message);
    }

    return local;
  }

  /**
   * Avaliação local determinística ultrarrápida (<1ms).
   */
  public static classify(
    messageText: string,
    context?: 'NPS_PENDING' | 'REMINDER_PENDING'
  ): JevDecisionResult {
    const raw = (messageText || '').trim().toLowerCase();
    const clean = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Contexto explícito de NPS pendente
    if (context === 'NPS_PENDING' && /^[1-5]$/.test(raw)) {
      return {
        intent: 'NPS_FEEDBACK',
        confidence: 0.99,
        extractedScore: parseInt(raw, 10)
      };
    }

    // 2. Classificação de Confirmação de Presença ('1', 'confirmado', 'sim', 'vou sim')
    if (
      clean === '1' ||
      clean === 'confirmado' ||
      clean === 'confirmo' ||
      clean === 'vou sim' ||
      clean === 'sim' ||
      clean.includes('confirmar') ||
      clean.includes('estarei ai') ||
      clean.includes('pode confirmar') ||
      clean.includes('com certeza') ||
      clean.includes('ta confirmado')
    ) {
      return {
        intent: 'CONFIRM_APPOINTMENT',
        confidence: 0.96
      };
    }

    // 3. Classificação de Cancelamento ou Remarcação ('2', 'cancelar', 'mudar horário')
    if (
      clean === '2' ||
      clean.includes('cancel') ||
      clean.includes('desmarc') ||
      clean.includes('remarc') ||
      clean.includes('reagend') ||
      clean.includes('mudar') ||
      clean.includes('trocar') ||
      clean.includes('nao vou conseguir') ||
      clean.includes('nao poderei')
    ) {
      return {
        intent: 'CANCEL_OR_RESCHEDULE',
        confidence: 0.95
      };
    }

    // 4. Classificação de Aceite de Fila de Espera (Smart Waitlist Auto-Fill)
    if (
      raw === 'sim aceito' ||
      raw === 'quero a vaga' ||
      raw === 'aceito' ||
      raw === 'pode marcar a vaga' ||
      raw === 'quero essa vaga'
    ) {
      return {
        intent: 'ACCEPT_WAITLIST_SLOT',
        confidence: 0.95
      };
    }

    // 5. Classificação de NPS (estrelas, notas 3, 4, 5 ou termos de elogio/crítica)
    if (/^[3-5]$/.test(raw)) {
      return {
        intent: 'NPS_FEEDBACK',
        confidence: 0.99,
        extractedScore: parseInt(raw, 10)
      };
    }

    if (raw.includes('⭐️') || raw.includes('⭐') || raw.includes('estrela')) {
      const starCount = (raw.match(/⭐|⭐️/g) || []).length;
      if (starCount >= 1 && starCount <= 5) {
        return {
          intent: 'NPS_FEEDBACK',
          confidence: 0.98,
          extractedScore: starCount
        };
      }
      const match = raw.match(/([1-5])\s*estrela/);
      if (match) {
        return {
          intent: 'NPS_FEEDBACK',
          confidence: 0.98,
          extractedScore: parseInt(match[1], 10)
        };
      }
    }

    if (
      raw.includes('maravilhoso') ||
      raw.includes('excelente') ||
      raw.includes('perfeito') ||
      raw.includes('amei') ||
      raw.includes('nota 10') ||
      raw.includes('ótimo')
    ) {
      return {
        intent: 'NPS_FEEDBACK',
        confidence: 0.92,
        extractedScore: 5
      };
    }

    if (
      raw.includes('péssimo') ||
      raw.includes('horrível') ||
      raw.includes('ruim') ||
      raw.includes('odiei') ||
      raw.includes('insatisfeito')
    ) {
      return {
        intent: 'NPS_FEEDBACK',
        confidence: 0.94,
        extractedScore: 1,
        extractedReason: messageText
      };
    }

    // 6. Fallback para Dúvidas Gerais / Atendente IA
    return {
      intent: 'GENERAL_INQUIRY',
      confidence: 0.85
    };
  }
}
