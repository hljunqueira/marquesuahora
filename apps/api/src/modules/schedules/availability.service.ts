import { prisma } from '../../lib/prisma';
import { ScheduleStatus } from '@prisma/client';
import {
  calculateAvailableSlots,
  AvailabilityWindow,
  TimeBlock,
  ExistingBooking,
  CalculatedSlot
} from '@marquesuahora/shared';

// Motor de cálculo de disponibilidade de horários e regras semanais

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  totalSlots: number;
  slots: {
    morning: CalculatedSlot[];
    afternoon: CalculatedSlot[];
    night: CalculatedSlot[];
  };
}

export class AvailabilityService {
  /**
   * Calcula horários disponíveis para uma lista de serviços e data informada,
   * utilizando o motor determinístico compartilhado.
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

    // 1. Busca os serviços solicitados
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

    // 2. Data e dia da semana (0 = Domingo a 6 = Sábado)
    const targetDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = targetDate.getDay();

    // 3. Busca profissionais aptos para executar os serviços
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

    // 4. Busca regras de disponibilidade semanais (AvailabilityRule)
    const availabilityRules = await prisma.availabilityRule.findMany({
      where: {
        tenantId,
        dayOfWeek,
        isActive: true,
        OR: [
          { professionalId: null },
          { professionalId: { in: candidateProfessionals.map((p) => p.id) } }
        ]
      }
    });

    // Monta janelas de atendimento (windows)
    const windows: AvailabilityWindow[] = [];

    if (availabilityRules.length > 0) {
      for (const rule of availabilityRules) {
        if (rule.professionalId) {
          const prof = candidateProfessionals.find((p) => p.id === rule.professionalId);
          windows.push({
            startTime: rule.startTime,
            endTime: rule.endTime,
            professionalId: rule.professionalId,
            professionalName: prof?.name
          });
        } else {
          // Regra geral da loja: aplica para todos os profissionais aptos
          for (const prof of candidateProfessionals) {
            windows.push({
              startTime: rule.startTime,
              endTime: rule.endTime,
              professionalId: prof.id,
              professionalName: prof.name
            });
          }
        }
      }
    } else {
      // Fallback para horários de abertura/fechamento do estabelecimento
      if (tenant.openingTime && tenant.closingTime && tenant.openingTime !== '00:00') {
        for (const prof of candidateProfessionals) {
          windows.push({
            startTime: tenant.openingTime,
            endTime: tenant.closingTime,
            professionalId: prof.id,
            professionalName: prof.name
          });
        }
      }
    }

    if (windows.length === 0) {
      return {
        date: dateStr,
        isOpen: false,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    // 5. Busca bloqueios pontuais e recorrentes (ScheduleBlock)
    const blocksFromDb = await prisma.scheduleBlock.findMany({
      where: {
        tenantId,
        isPaused: false,
        OR: [
          { date: targetDate },
          { dayOfWeek }
        ]
      }
    });

    const blocks: TimeBlock[] = blocksFromDb.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      professionalId: b.professionalId || undefined
    }));

    // 6. Busca agendamentos ativos na data
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        tenantId,
        date: targetDate,
        status: {
          in: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED, ScheduleStatus.IN_SERVICE]
        }
      },
      select: {
        startTime: true,
        endTime: true,
        professionalId: true
      }
    });

    const bookings: ExistingBooking[] = existingSchedules.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      professionalId: s.professionalId
    }));

    // 7. Horário atual para filtrar horários do passado quando dateStr for hoje
    const now = new Date();
    const isToday = targetDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    const minAdvanceMins = tenant.minAdvanceBookingMinutes || 30;
    const nowMinutesToday = isToday ? now.getHours() * 60 + now.getMinutes() + minAdvanceMins : null;

    // 8. Executa o cálculo determinístico
    const allSlots = calculateAvailableSlots({
      dateStr,
      totalDurationMinutes,
      slotIntervalMinutes: tenant.slotIntervalMinutes || 30,
      roundSlotStarts: false,
      windows,
      blocks,
      bookings,
      nowMinutesToday
    });

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
