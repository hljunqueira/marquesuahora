import { prisma } from '../../lib/prisma';
import { ScheduleStatus } from '@prisma/client';

export interface TimeSlot {
  time: string; // HH:mm
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  available: boolean;
  professionalId?: string;
  professionalName?: string;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  totalSlots: number;
  slots: {
    morning: TimeSlot[];
    afternoon: TimeSlot[];
    night: TimeSlot[];
  };
}

export class AvailabilityService {
  /**
   * Calcula horários disponíveis para uma lista de serviços e data informada.
   */
  static async getAvailableSlots(params: {
    tenantId: string;
    serviceIds: string[];
    dateStr: string; // YYYY-MM-DD
    professionalId?: string;
  }): Promise<DayAvailability> {
    const { tenantId, serviceIds, dateStr, professionalId } = params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return {
        date: dateStr,
        isOpen: false,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    // 1. Busca os serviços solicitados e calcula duração contínua somada
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
        allowOnlineBooking: true
      }
    });

    if (services.length === 0) {
      return {
        date: dateStr,
        isOpen: false,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    const totalDurationMinutes = services.reduce(
      (sum, s) => sum + s.durationMinutes + (tenant.bufferMinutes || 0),
      0
    );

    // 2. Data e dia da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    const targetDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = targetDate.getDay();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayKey = dayKeys[dayOfWeek];

    // Se domingo e loja fechada (ou horário não preenchido)
    if (dayOfWeek === 0 && (!tenant.openingTime || tenant.openingTime === '00:00')) {
      return {
        date: dateStr,
        isOpen: false,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    // 3. Localiza profissionais aptos
    const candidateProfessionals = await prisma.professional.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(professionalId ? { id: professionalId } : {}),
        services: {
          some: {
            serviceId: { in: serviceIds }
          }
        }
      },
      include: {
        scheduleBlocks: {
          where: {
            date: new Date(`${dateStr}T00:00:00`)
          }
        },
        schedules: {
          where: {
            date: new Date(`${dateStr}T00:00:00`),
            status: {
              in: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED, ScheduleStatus.IN_SERVICE]
            }
          }
        }
      }
    });

    if (candidateProfessionals.length === 0) {
      return {
        date: dateStr,
        isOpen: true,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    // 4. Utilitários de conversão de tempo
    const parseMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const formatMinutes = (totalMins: number) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const tenantOpenMins = parseMinutes(tenant.openingTime || '09:00');
    const tenantCloseMins = parseMinutes(tenant.closingTime || '19:00');
    const intervalMins = tenant.slotIntervalMinutes || 30;

    const availableSlotsMap = new Map<string, TimeSlot>();

    // Horário atual no Brasil para bloquear horários do passado
    const now = new Date();
    const isToday = targetDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    const currentMinsNow = now.getHours() * 60 + now.getMinutes() + (tenant.minAdvanceBookingMinutes || 30);

    for (let slotMins = tenantOpenMins; slotMins + totalDurationMinutes <= tenantCloseMins; slotMins += intervalMins) {
      if (isToday && slotMins < currentMinsNow) {
        continue;
      }

      const slotStartStr = formatMinutes(slotMins);
      const slotEndMins = slotMins + totalDurationMinutes;
      const slotEndStr = formatMinutes(slotEndMins);

      // Encontra um profissional apto e livre neste intervalo contínuo
      for (const prof of candidateProfessionals) {
        const scheduleConfig = (prof.scheduleConfig as Record<string, any>) || {};
        const dayConfig = scheduleConfig[currentDayKey];

        if (dayConfig?.isOff) continue;

        const profStartMins = parseMinutes(dayConfig?.start || tenant.openingTime || '09:00');
        const profEndMins = parseMinutes(dayConfig?.end || tenant.closingTime || '19:00');

        // Se fora do expediente do profissional
        if (slotMins < profStartMins || slotEndMins > profEndMins) continue;

        // Se colide com intervalo de almoço/descanso
        if (dayConfig?.lunchStart && dayConfig?.lunchEnd) {
          const breakStartMins = parseMinutes(dayConfig.lunchStart);
          const breakEndMins = parseMinutes(dayConfig.lunchEnd);
          const hasBreakConflict = slotMins < breakEndMins && slotEndMins > breakStartMins;
          if (hasBreakConflict) continue;
        }

        // Se colide com bloqueio manual na data
        const hasBlockConflict = prof.scheduleBlocks.some((b) => {
          const bStart = parseMinutes(b.startTime);
          const bEnd = parseMinutes(b.endTime);
          return slotMins < bEnd && slotEndMins > bStart;
        });
        if (hasBlockConflict) continue;

        // Se colide com outro agendamento existente na data
        const hasScheduleConflict = prof.schedules.some((s) => {
          const sStart = parseMinutes(s.startTime);
          const sEnd = parseMinutes(s.endTime);
          return slotMins < sEnd && slotEndMins > sStart;
        });
        if (hasScheduleConflict) continue;

        // Turno
        let shift: 'MORNING' | 'AFTERNOON' | 'NIGHT' = 'MORNING';
        if (slotMins >= 12 * 60 && slotMins < 18 * 60) {
          shift = 'AFTERNOON';
        } else if (slotMins >= 18 * 60) {
          shift = 'NIGHT';
        }

        if (!availableSlotsMap.has(slotStartStr)) {
          availableSlotsMap.set(slotStartStr, {
            time: slotStartStr,
            shift,
            available: true,
            professionalId: prof.id,
            professionalName: prof.name
          });
        }
        break; // Achou profissional livre para este horário
      }
    }

    const allSlots = Array.from(availableSlotsMap.values()).sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    const morning = allSlots.filter((s) => s.shift === 'MORNING');
    const afternoon = allSlots.filter((s) => s.shift === 'AFTERNOON');
    const night = allSlots.filter((s) => s.shift === 'NIGHT');

    return {
      date: dateStr,
      isOpen: true,
      totalSlots: allSlots.length,
      slots: { morning, afternoon, night }
    };
  }
}
