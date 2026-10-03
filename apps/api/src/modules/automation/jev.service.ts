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
 * Tomada de decisões determinísticas tipadas em menos de 50ms para mensagens recebidas via WhatsApp.
 */
export class JevDecisionEngine {
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
