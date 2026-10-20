export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export interface CalculatedSlot {
  time: string; // "09:00"
  endTime: string; // "10:30"
  shift: ShiftType;
  available: boolean;
  professionalId?: string;
  professionalName?: string;
}

export interface AvailabilityWindow {
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  professionalId?: string;
  professionalName?: string;
}

export interface TimeBlock {
  startTime: string; // "12:00"
  endTime: string; // "13:30"
  professionalId?: string;
}

export interface ExistingBooking {
  startTime: string; // "14:00"
  endTime: string; // "15:00"
  professionalId: string;
}

export interface SlotCalculationOptions {
  dateStr: string; // YYYY-MM-DD
  totalDurationMinutes: number;
  slotIntervalMinutes?: number; // padrão: 30 min
  roundSlotStarts?: boolean; // quando true: início apenas em horas cheias (ex: 14:00, 15:00)
  windows: AvailabilityWindow[];
  blocks?: TimeBlock[];
  bookings?: ExistingBooking[];
  nowMinutesToday?: number | null; // minutos transcorridos hoje + antecedência mínima, se hoje
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutesToTime(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getShiftForMinutes(mins: number): ShiftType {
  if (mins < 12 * 60) return 'MORNING';
  if (mins < 18 * 60) return 'AFTERNOON';
  return 'NIGHT';
}

/**
 * Função pura e determinística para cálculo de horários livres sem efeitos colaterais.
 */
export function calculateAvailableSlots(options: SlotCalculationOptions): CalculatedSlot[] {
  const {
    totalDurationMinutes,
    slotIntervalMinutes = 30,
    roundSlotStarts = false,
    windows,
    blocks = [],
    bookings = [],
    nowMinutesToday = null
  } = options;

  if (windows.length === 0 || totalDurationMinutes <= 0) {
    return [];
  }

  const slotMap = new Map<string, CalculatedSlot>();

  // Itera por cada janela de atendimento (expediente do estúdio ou profissional)
  for (const win of windows) {
    const winStartMins = parseTimeToMinutes(win.startTime);
    const winEndMins = parseTimeToMinutes(win.endTime);

    // Ajusta o primeiro slot para respeitar roundSlotStarts se ativado
    let startSlot = winStartMins;
    if (roundSlotStarts) {
      const remainder = startSlot % 60;
      if (remainder !== 0) {
        startSlot = startSlot + (60 - remainder);
      }
    }

    const step = roundSlotStarts ? 60 : slotIntervalMinutes;

    // Coleciona pontos de partida:
    // 1. Grade regular (ex: de 30 em 30 min)
    // 2. Términos de agendamentos existentes (para permitir agendar imediatamente na sequência!)
    const candidateStarts = new Set<number>();
    for (let slotMins = startSlot; slotMins + totalDurationMinutes <= winEndMins; slotMins += step) {
      candidateStarts.add(slotMins);
    }
    for (const bk of bookings) {
      if (!win.professionalId || bk.professionalId === win.professionalId) {
        const bkEnd = parseTimeToMinutes(bk.endTime);
        if (bkEnd >= winStartMins && bkEnd + totalDurationMinutes <= winEndMins) {
          candidateStarts.add(bkEnd);
        }
      }
    }
    const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);

    for (const slotMins of sortedStarts) {
      // Bloqueia horários no passado se for hoje
      if (nowMinutesToday !== null && slotMins < nowMinutesToday) {
        continue;
      }

      const slotEndMins = slotMins + totalDurationMinutes;
      const profId = win.professionalId;

      // 1. Verifica conflito com bloqueios (almoço, folga, feriado)
      const hasBlockConflict = blocks.some((b) => {
        // Se o bloqueio for geral (sem profId) ou do mesmo profissional
        if (!b.professionalId || !profId || b.professionalId === profId) {
          const bStart = parseTimeToMinutes(b.startTime);
          const bEnd = parseTimeToMinutes(b.endTime);
          return slotMins < bEnd && slotEndMins > bStart;
        }
        return false;
      });

      if (hasBlockConflict) {
        continue;
      }

      // 2. Verifica conflito com agendamentos existentes
      const hasBookingConflict = bookings.some((bk) => {
        if (!profId || bk.professionalId === profId) {
          const bkStart = parseTimeToMinutes(bk.startTime);
          const bkEnd = parseTimeToMinutes(bk.endTime);
          return slotMins < bkEnd && slotEndMins > bkStart;
        }
        return false;
      });

      if (hasBookingConflict) {
        continue;
      }

      const timeStr = formatMinutesToTime(slotMins);
      const endTimeStr = formatMinutesToTime(slotEndMins);

      if (!slotMap.has(timeStr)) {
        slotMap.set(timeStr, {
          time: timeStr,
          endTime: endTimeStr,
          shift: getShiftForMinutes(slotMins),
          available: true,
          professionalId: win.professionalId,
          professionalName: win.professionalName
        });
      }
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => a.time.localeCompare(b.time));
}
