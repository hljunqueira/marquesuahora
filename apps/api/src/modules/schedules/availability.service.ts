import { prisma } from '../../lib/prisma';
import { ScheduleStatus } from '@prisma/client';
import {
  calculateAvailableSlots,
  AvailabilityWindow,
  TimeBlock,
  ExistingBooking,
  CalculatedSlot
} from '@marquesuahora/shared';
import { checkBrazilianHoliday } from '../../utils/brazilian-holidays';
import {
  parseYMDToSafeUtcDate,
  getBrazilTodayYMD,
  getBrazilNowMinutes
} from '../../utils/date-utils';

// Motor de cálculo de disponibilidade de horários e regras semanais

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  reason?: string;
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
    excludeScheduleId?: string;
  }): Promise<DayAvailability> {
    const { tenantId, serviceIds, dateStr, professionalId, excludeScheduleId } = params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return {
        date: dateStr,
        isOpen: false,
        reason: 'Estabelecimento não localizado.',
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    // 0. Checagem de Feriado Nacional Brasileiro (Blindagem de Feriados Oficiais)
    const blockNational = tenant.blockNationalHolidays ?? true;
    const exceptions: string[] = Array.isArray(tenant.holidayExceptions)
      ? (tenant.holidayExceptions as string[])
      : [];

    const holiday = checkBrazilianHoliday(dateStr);
    if (holiday && blockNational && !exceptions.includes(dateStr)) {
      return {
        date: dateStr,
        isOpen: false,
        reason: `Feriado Nacional: ${holiday.name}`,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    // 1. Busca os serviços solicitados
    let services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
        ...(excludeScheduleId ? {} : { allowOnlineBooking: true })
      }
    });

    if (services.length === 0 && excludeScheduleId) {
      services = await prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId }
      });
    }

    if (services.length === 0) {
      const fallbackService = await prisma.service.findFirst({
        where: { tenantId }
      });
      if (fallbackService) {
        services = [fallbackService];
      } else {
        return {
          date: dateStr,
          isOpen: false,
          reason: 'Nenhum serviço disponível para agendamento.',
          totalSlots: 0,
          slots: { morning: [], afternoon: [], night: [] }
        };
      }
    }

    const totalDurationMinutes = services.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    );

    // 2. Data e dia da semana (0 = Domingo a 6 = Sábado) via parse seguro UTC
    const { targetDate, dayOfWeek } = parseYMDToSafeUtcDate(dateStr);

    // 3. Busca profissionais aptos para executar os serviços
    let candidateProfessionals = await prisma.professional.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(professionalId ? { id: professionalId } : {}),
        ...(serviceIds.length > 0 && !excludeScheduleId
          ? {
              services: {
                some: {
                  serviceId: { in: serviceIds }
                }
              }
            }
          : {})
      }
    });

    if (candidateProfessionals.length === 0 && professionalId) {
      candidateProfessionals = await prisma.professional.findMany({
        where: { id: professionalId, tenantId }
      });
    }

    if (candidateProfessionals.length === 0) {
      return {
        date: dateStr,
        isOpen: true,
        reason: 'Nenhum profissional disponível para os serviços selecionados nesta data.',
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    // 4. Busca regras de disponibilidade semanais (AvailabilityRule)
    // Verifica se o salão possui regras semanais cadastradas para o escopo geral
    const totalTenantRules = await prisma.availabilityRule.count({
      where: {
        tenantId,
        professionalId: null
      }
    });

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
    } else if (totalTenantRules === 0) {
      // Fallback APENAS se o salão nunca configurou a grade semanal de dias
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
    } else {
      // O salão configurou sua grade e este dia da semana está marcado como fechado!
      const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return {
        date: dateStr,
        isOpen: false,
        reason: `Fechado aos ${weekdayNames[dayOfWeek]}s`,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

    if (windows.length === 0) {
      return {
        date: dateStr,
        isOpen: false,
        reason: 'Sem horários de atendimento configurados para esta data.',
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

    // Checa se há recesso geral ou feriado municipal de dia inteiro para a loja
    const fullDayGeneralBlock = blocksFromDb.find(
      (b) => !b.professionalId && b.startTime <= '06:00' && b.endTime >= '22:00'
    );
    if (fullDayGeneralBlock) {
      return {
        date: dateStr,
        isOpen: false,
        reason: fullDayGeneralBlock.reason || 'Recesso / Bloqueio do Estabelecimento',
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      };
    }

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
        ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
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

    // 7. Horário oficial de Brasília (UTC-3) para filtrar horários do passado quando dateStr for hoje
    const brazilTodayStr = getBrazilTodayYMD();
    const isToday = dateStr === brazilTodayStr;
    const minAdvanceMins = tenant.minAdvanceBookingMinutes || 30;
    const nowMinutesToday = isToday ? getBrazilNowMinutes() + minAdvanceMins : null;

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
