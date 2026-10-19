/**
 * brazilian-holidays.ts
 * Cálculo determinístico dos feriados nacionais brasileiros (fixos e móveis).
 * Inclui feriados federais e pontos de alta relevância comercial para estabelecimentos de beleza e estética.
 * Lei Federal nº 14.759/2023 (Dia Nacional de Zumbi e da Consciência Negra - 20 de novembro).
 */

export interface BrazilianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'NATIONAL_FIXED' | 'NATIONAL_MOVABLE';
  formattedDate: string; // DD/MM/YYYY
  dayOfWeek: number; // 0 = Domingo, 6 = Sábado
}

/**
 * Calcula a data do Domingo de Páscoa para qualquer ano no calendário gregoriano (Algoritmo de Meeus/Jones/Butcher).
 */
export function getEasterSunday(year: number): { year: number; month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return { year, month, day };
}

/**
 * Soma ou subtrai dias de uma data UTC de forma puramente determinística.
 */
function addDaysUtc(year: number, month: number, day: number, daysToAdd: number): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function formatDateIso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function formatDateBr(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Retorna todos os feriados nacionais do ano informado, ordenados cronologicamente.
 */
export function getBrazilianHolidays(year: number): BrazilianHoliday[] {
  const easter = getEasterSunday(year);

  // Feriados móveis calculados a partir da Páscoa
  const carnavalMon = addDaysUtc(easter.year, easter.month, easter.day, -48);
  const carnavalTue = addDaysUtc(easter.year, easter.month, easter.day, -47);
  const goodFriday = addDaysUtc(easter.year, easter.month, easter.day, -2);
  const corpusChristi = addDaysUtc(easter.year, easter.month, easter.day, 60);

  const rawHolidays: Array<{ year: number; month: number; day: number; name: string; type: 'NATIONAL_FIXED' | 'NATIONAL_MOVABLE' }> = [
    // Feriados Fixos
    { year, month: 1, day: 1, name: 'Confraternização Universal (Ano Novo)', type: 'NATIONAL_FIXED' },
    { year, month: 4, day: 21, name: 'Tiradentes', type: 'NATIONAL_FIXED' },
    { year, month: 5, day: 1, name: 'Dia do Trabalho', type: 'NATIONAL_FIXED' },
    { year, month: 9, day: 7, name: 'Independência do Brasil', type: 'NATIONAL_FIXED' },
    { year, month: 10, day: 12, name: 'Nossa Senhora Aparecida', type: 'NATIONAL_FIXED' },
    { year, month: 11, day: 2, name: 'Finados', type: 'NATIONAL_FIXED' },
    { year, month: 11, day: 15, name: 'Proclamação da República', type: 'NATIONAL_FIXED' },
    { year, month: 11, day: 20, name: 'Dia da Consciência Negra', type: 'NATIONAL_FIXED' },
    { year, month: 12, day: 25, name: 'Natal', type: 'NATIONAL_FIXED' },

    // Feriados Móveis
    { year: carnavalMon.year, month: carnavalMon.month, day: carnavalMon.day, name: 'Carnaval (Segunda-feira)', type: 'NATIONAL_MOVABLE' },
    { year: carnavalTue.year, month: carnavalTue.month, day: carnavalTue.day, name: 'Carnaval (Terça-feira)', type: 'NATIONAL_MOVABLE' },
    { year: goodFriday.year, month: goodFriday.month, day: goodFriday.day, name: 'Sexta-feira Santa (Paixão de Cristo)', type: 'NATIONAL_MOVABLE' },
    { year: easter.year, month: easter.month, day: easter.day, name: 'Domingo de Páscoa', type: 'NATIONAL_MOVABLE' },
    { year: corpusChristi.year, month: corpusChristi.month, day: corpusChristi.day, name: 'Corpus Christi', type: 'NATIONAL_MOVABLE' }
  ];

  const holidays: BrazilianHoliday[] = rawHolidays.map((h) => ({
    date: formatDateIso(h.year, h.month, h.day),
    formattedDate: formatDateBr(h.year, h.month, h.day),
    name: h.name,
    type: h.type,
    dayOfWeek: getDayOfWeek(h.year, h.month, h.day)
  }));

  // Ordena por data
  holidays.sort((a, b) => a.date.localeCompare(b.date));

  return holidays;
}

/**
 * Retorna os feriados para uma faixa de anos (ex: ano atual e próximo ano).
 */
export function getHolidaysForRange(startYear: number, endYear: number): BrazilianHoliday[] {
  const result: BrazilianHoliday[] = [];
  for (let y = startYear; y <= endYear; y++) {
    result.push(...getBrazilianHolidays(y));
  }
  return result;
}

/**
 * Checa se uma data ISO (YYYY-MM-DD) é um feriado nacional brasileiro.
 */
export function checkBrazilianHoliday(dateStr: string): BrazilianHoliday | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const holidays = getBrazilianHolidays(year);
  return holidays.find((h) => h.date === dateStr) || null;
}
