/**
 * Utilitários de Data Robustos contra Fuso Horário (UTC / UTC-3 Brasília)
 * Evita saltos de dia causados por toISOString() após as 21:00 ou serialização @db.Date.
 */

/**
 * Converte qualquer Date ou string de data para formato YYYY-MM-DD
 * usando estritamente o calendário local sem drift de fuso horário.
 */
export function formatLocalDateToYMD(input: Date | string | null | undefined): string {
  if (!input) return '';

  if (typeof input === 'string') {
    // Se for string ISO com timestamp (ex: "2026-10-18T00:00:00.000Z" ou "2026-10-18")
    if (input.includes('T')) {
      return input.slice(0, 10);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
      return input.slice(0, 10);
    }
    // Caso venha no padrão brasileiro "DD/MM/YYYY"
    if (/^\d{2}\/\d{2}\/\d{4}/.test(input)) {
      const [d, m, y] = input.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return input.slice(0, 10);
  }

  // É um objeto Date
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const day = String(input.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cria um objeto Date seguro normalizado para 12:00:00 (meio-dia)
 * impedindo que fusos horários de -12 a +12 saltem o dia.
 */
export function createSafeLocalDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

/**
 * Retorna os 7 dias da semana (Segunda a Domingo) contendo a data informada
 */
export function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  d.setHours(12, 0, 0, 0);
  const dayOfWeek = d.getDay();
  // Segunda-feira como início: se domingo (0), volta 6; senão volta (dayOfWeek - 1)
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

/**
 * Retorna todos os dias para a grade de visão mensal (incluindo preenchimento de semanas)
 */
export function getMonthGridDays(year: number, monthIndex: number): {
  date: Date;
  isCurrentMonth: boolean;
  dateStr: string;
}[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0);

  // Início na segunda-feira da semana em que cai o primeiro dia
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysBefore = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - daysBefore);

  // Matriz de 35 a 42 dias para preencher a grade mensal completa (5 ou 6 semanas)
  const grid: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];
  const totalDays = 42; // 6 semanas fixas para estabilidade visual perfeita

  for (let i = 0; i < totalDays; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const isCurrentMonth = cellDate.getMonth() === monthIndex;
    grid.push({
      date: cellDate,
      isCurrentMonth,
      dateStr: formatLocalDateToYMD(cellDate)
    });
  }

  return grid;
}

/**
 * Compara se duas datas representam exatamente o mesmo dia civil
 */
export function isSameDay(d1: Date | string | null | undefined, d2: Date | string | null | undefined): boolean {
  return formatLocalDateToYMD(d1) === formatLocalDateToYMD(d2);
}
