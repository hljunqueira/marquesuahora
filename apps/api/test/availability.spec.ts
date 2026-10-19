import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailabilityService } from '../src/modules/schedules/availability.service';
import { prisma } from '../src/lib/prisma';

// Testes unitários do motor de disponibilidade com Prisma mockado

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
    },
    availabilityRule: {
      findMany: vi.fn(),
      count: vi.fn().mockResolvedValue(1)
    },
    scheduleBlock: {
      findMany: vi.fn()
    },
    schedule: {
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

  it('deve calcular slots corretamente considerando AvailabilityRule, bloqueios e agendamentos existentes', async () => {
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
        name: 'Carlos Barbeiro'
      }
    ]);

    // Regra semanal de atendimento (09:00 às 18:00)
    (prisma.availabilityRule.findMany as any).mockResolvedValue([
      {
        startTime: '09:00',
        endTime: '18:00',
        professionalId: 'prof-1'
      }
    ]);

    // Bloqueios: Almoço das 12:00 às 13:00 e Dentista das 15:00 às 16:00
    (prisma.scheduleBlock.findMany as any).mockResolvedValue([
      { startTime: '12:00', endTime: '13:00', professionalId: 'prof-1' },
      { startTime: '15:00', endTime: '16:00', professionalId: 'prof-1' }
    ]);

    // Agendamento existente das 10:00 às 11:00
    (prisma.schedule.findMany as any).mockResolvedValue([
      {
        startTime: '10:00',
        endTime: '11:00',
        professionalId: 'prof-1'
      }
    ]);

    // Data futura garantida (2026-10-15)
    const result = await AvailabilityService.getAvailableSlots({
      tenantId: mockTenantId,
      serviceIds: [mockServiceId],
      dateStr: '2026-10-15'
    });

    expect(result.isOpen).toBe(true);

    const allTimes = [
      ...result.slots.morning.map((s) => s.time),
      ...result.slots.afternoon.map((s) => s.time),
      ...result.slots.night.map((s) => s.time)
    ];

    expect(allTimes).toContain('09:00');
    expect(allTimes).not.toContain('10:00'); // Conflito com agendamento
    expect(allTimes).toContain('11:00');
    expect(allTimes).not.toContain('12:00'); // Conflito com almoço
    expect(allTimes).toContain('13:00');
    expect(allTimes).toContain('14:00');
    expect(allTimes).not.toContain('15:00'); // Conflito com bloqueio
    expect(allTimes).toContain('16:00');
    expect(allTimes).toContain('17:00');
    expect(result.totalSlots).toBe(6);
  });

  it('deve retornar zero slots se não houver profissionais aptos ou regras de atendimento', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: mockTenantId,
      openingTime: '00:00',
      closingTime: '00:00'
    });

    (prisma.service.findMany as any).mockResolvedValue([
      {
        id: mockServiceId,
        tenantId: mockTenantId,
        durationMinutes: 30,
        allowOnlineBooking: true
      }
    ]);

    (prisma.professional.findMany as any).mockResolvedValue([]);

    const result = await AvailabilityService.getAvailableSlots({
      tenantId: mockTenantId,
      serviceIds: [mockServiceId],
      dateStr: '2026-10-15'
    });

    expect(result.isOpen).toBe(true);
    expect(result.totalSlots).toBe(0);
  });
});
