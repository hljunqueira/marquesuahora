/**
 * Humanizer Guardrail — MarqueSuaHora
 * Garante que nenhuma resposta gerada pela Atendente IA contenha clichês robóticos,
 * resíduos de chatbot ou construções artificiais de LLM antes de ser enviada ao cliente.
 */
export class HumanizerGuardrail {
  private static BANNED_PATTERNS: RegExp[] = [
    /^(certamente|com certeza)[,!.]?\s*/i,
    /espero ter ajudado[!.]?/gi,
    /espero que ajude[!.]?/gi,
    /qualquer d[uú]vida,? fico [aà] disposi[cç][aã]o[!.]?/gi,
    /estou [aà] disposi[cç][aã]o para esclarecer[!.]?/gi,
    /como um modelo de (ia|linguagem|intelig[eê]ncia)[^,.]*[,.]?/gi,
    /como assistente virtual[^,.]*[,.]?/gi,
    /n[aã]o hesite em entrar em contato[!.]?/gi,
    /tenha um (excelente|maravilhoso|incr[ií]vel) dia[!.]?/gi,
    /posso te ajudar em algo mais\??/gi
  ];

  /**
   * Higieniza o texto produzido pela IA garantindo padrão humano de recepcionista de salão.
   */
  public static sanitize(text: string): string {
    if (!text) return '';

    let cleaned = text.trim();

    // 1. Remove padrões banidos de chatbot
    for (const pattern of this.BANNED_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 2. Substitui travessões longos ('—' e '–') por pontuação limpa
    cleaned = cleaned.replace(/\s*[—–]\s*/g, ', ');

    // 3. Remove múltiplos emojis decorativos consecutivos (mantendo no máximo 1 funcional por bloco)
    cleaned = cleaned.replace(/(\p{Extended_Pictographic}\s*){2,}/gu, '');

    // 4. Corrige pontuação duplicada ou espaços residuais deixados pela remoção
    cleaned = cleaned
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+,/g, ',')
      .replace(/\s+\./g, '.')
      .replace(/^\s*,\s*/, '')
      .trim();

    // Capitaliza a primeira letra caso tenha sido cortado o início
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
  }
}
