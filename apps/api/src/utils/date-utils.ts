/**
 * Utilitários de Data para o Backend blindados contra variações de fuso horário da VPS/Docker.
 * O MarqueSuaHora opera no fuso horário oficial de Brasília (America/Sao_Paulo / UTC-3).
 */

/**
 * Retorna a data atual no Brasil (fuso America/Sao_Paulo) no formato YYYY-MM-DD.
 * Mesmo após as 21:00 quando a VPS em UTC já avançou para o dia seguinte,
 * esta função retorna a data correta do Brasil.
 */
export function getBrazilTodayYMD(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Retorna os minutos decorridos desde 00:00 no horário de Brasília no instante atual.
 * Ex: 14:30 -> 14 * 60 + 30 = 870 minutos.
 */
export function getBrazilNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(new Date());

  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);

  return hour * 60 + minute;
}

/**
 * Converte uma string YYYY-MM-DD para um Date seguro ao meio-dia UTC (12:00:00Z)
 * e extrai o dia da semana matemático (0 = Domingo a 6 = Sábado).
 * Isso impede que qualquer offset de fuso horário (-12 a +14) altere a data ou o dia da semana.
 */
export function parseYMDToSafeUtcDate(dateStr: string): { targetDate: Date; dayOfWeek: number } {
  const cleanDateStr = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  const [y, m, d] = cleanDateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = targetDate.getUTCDay();
  return { targetDate, dayOfWeek };
}

/**
 * Formata um objeto Date ou string para YYYY-MM-DD estritamente sem drift.
 */
export function formatDateToYMD(date: Date | string): string {
  if (typeof date === 'string') {
    return date.includes('T') ? date.slice(0, 10) : date;
  }
  return date.toISOString().slice(0, 10);
}
