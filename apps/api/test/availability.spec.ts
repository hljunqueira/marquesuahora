import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailabilityService } from '../src/modules/schedules/availability.service';
import { prisma } from '../src/lib/prisma';
import { ScheduleStatus } from '@prisma/client';

// Mock do Prisma
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn()
    },
    service: {
      findMany: vi.fn()
    },
    professional: {
      findMany: vi.fn()
    }
  }
}));

describe('AvailabilityService - Motor de Cálculo de Horários Disponíveis', () => {
  const mockTenantId = 'tenant-123';
  const mockServiceId = 'service-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar isOpen = false se o estabelecimento não for encontrado', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue(null);

    const result = await AvailabilityService.getAvailableSlots({
      tenantId: mockTenantId,
      serviceIds: [mockServiceId],
      dateStr: '2026-10-15'
    });

    expect(result.isOpen).toBe(false);
    expect(result.totalSlots).toBe(0);
    expect(result.slots.morning).toHaveLength(0);
  });

  it('deve calcular slots corretamente considerando expediente, buffer e almoço do profissional', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: mockTenantId,
      openingTime: '09:00',
      closingTime: '18:00',
      slotIntervalMinutes: 60,
      bufferMinutes: 0,
      minAdvanceBookingMinutes: 0
    });

    (prisma.service.findMany as any).mockResolvedValue([
      {
        id: mockServiceId,
        tenantId: mockTenantId,
        durationMinutes: 60,
        allowOnlineBooking: true
      }
    ]);

    (prisma.professional.findMany as any).mockResolvedValue([
      {
        id: 'prof-1',
        name: 'Carlos Barbeiro',
        scheduleConfig: {
          thu: {
            isOff: false,
            start: '09:00',
            end: '18:00',
            lunchStart: '12:00',
            lunchEnd: '13:00'
          }
        },
        scheduleBlocks: [
          // Bloqueio das 15:00 às 16:00 (ex: dentista)
          { startTime: '15:00', endTime: '16:00' }
        ],
        schedules: [
          // Agendamento das 10:00 às 11:00
          {
            startTime: '10:00',
            endTime: '11:00',
            status: ScheduleStatus.CONFIRMED
          }
        ]
      }
    ]);

    // Data futura garantida (Quinta-feira, 2026-10-15)
    const result = await AvailabilityService.getAvailableSlots({
      tenantId: mockTenantId,
      serviceIds: [mockServiceId],
      dateStr: '2026-10-15'
    });

    expect(result.isOpen).toBe(true);
    // Esperado:
    // 09:00 (Livre)
    // 10:00 (Ocupado por agendamento existente) -> não deve constar
    // 11:00 (Livre)
    // 12:00 (Almoço 12h-13h) -> não deve constar
    // 13:00 (Livre)
    // 14:00 (Livre)
    // 15:00 (Bloqueio manual ScheduleBlock) -> não deve constar
    // 16:00 (Livre)
    // 17:00 (Livre, termina 18:00)

    const allTimes = [
      ...result.slots.morning.map((s) => s.time),
      ...result.slots.afternoon.map((s) => s.time),
      ...result.slots.night.map((s) => s.time)
    ];

    expect(allTimes).toContain('09:00');
    expect(allTimes).not.toContain('10:00');
    expect(allTimes).toContain('11:00');
    expect(allTimes).not.toContain('12:00');
    expect(allTimes).toContain('13:00');
    expect(allTimes).toContain('14:00');
    expect(allTimes).not.toContain('15:00');
    expect(allTimes).toContain('16:00');
    expect(allTimes).toContain('17:00');
    expect(result.totalSlots).toBe(6);
  });

  it('deve respeitar dia de folga do profissional (isOff = true)', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: mockTenantId,
      openingTime: '09:00',
      closingTime: '18:00',
      slotIntervalMinutes: 30,
      bufferMinutes: 0
    });

    (prisma.service.findMany as any).mockResolvedValue([
      {
        id: mockServiceId,
        tenantId: mockTenantId,
        durationMinutes: 30,
        allowOnlineBooking: true
      }
    ]);

    (prisma.professional.findMany as any).mockResolvedValue([
      {
        id: 'prof-1',
        name: 'Carlos Barbeiro',
        scheduleConfig: {
          thu: { isOff: true } // Folga na quinta
        },
        scheduleBlocks: [],
        schedules: []
      }
    ]);

    const result = await AvailabilityService.getAvailableSlots({
      tenantId: mockTenantId,
      serviceIds: [mockServiceId],
      dateStr: '2026-10-15' // Quinta
    });

    expect(result.isOpen).toBe(true);
    expect(result.totalSlots).toBe(0);
  });
});
