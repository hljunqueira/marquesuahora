import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlansService, DEFAULT_PLANS } from '../src/modules/plans/plans.service';
import { BookingService } from '../src/modules/schedules/booking.service';
import { prisma } from '../src/lib/prisma';
import { BookingSource } from '@prisma/client';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    plan: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn()
    },
    tenant: {
      findUnique: vi.fn()
    },
    service: {
      findMany: vi.fn()
    },
    professional: {
      findMany: vi.fn()
    },
    schedule: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

describe('Planos e Regras Contratadas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve ter a definição dos 3 planos canônicos com as regras corretas', () => {
    expect(DEFAULT_PLANS).toHaveLength(3);

    const free = DEFAULT_PLANS.find((p) => p.code === 'FREE');
    expect(free?.monthlyPrice).toBe(0);
    expect(free?.maxProfessionals).toBe(1);
    expect(free?.isUnlimitedBookings).toBe(false);
    expect(free?.monthlyFreeBookings).toBe(30);

    const solo = DEFAULT_PLANS.find((p) => p.code === 'SOLO');
    expect(solo?.monthlyPrice).toBe(39);
    expect(solo?.maxProfessionals).toBe(1);
    expect(solo?.isUnlimitedBookings).toBe(true);

    const equipe = DEFAULT_PLANS.find((p) => p.code === 'EQUIPE_PRO');
    expect(equipe?.monthlyPrice).toBe(79);
    expect(equipe?.maxProfessionals).toBe(5);
    expect(equipe?.isUnlimitedBookings).toBe(true);
  });

  it('deve resolver o plano correto por código normalizado', async () => {
    (prisma.plan.upsert as any).mockResolvedValue({});
    (prisma.plan.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.code === 'SOLO') {
        return Promise.resolve({ id: 'uuid-solo', code: 'SOLO', name: 'Profissional Solo' });
      }
      if (where.code === 'EQUIPE_PRO') {
        return Promise.resolve({ id: 'uuid-equipe', code: 'EQUIPE_PRO', name: 'Equipe Pro' });
      }
      if (where.code === 'FREE') {
        return Promise.resolve({ id: 'uuid-free', code: 'FREE', name: 'Gratuito' });
      }
      return Promise.resolve(null);
    });

    const solo = await PlansService.resolvePlan('solo');
    expect(solo?.code).toBe('SOLO');

    const equipe = await PlansService.resolvePlan('equipe');
    expect(equipe?.code).toBe('EQUIPE_PRO');

    const gratis = await PlansService.resolvePlan('gratis');
    expect(gratis?.code).toBe('FREE');
  });

  it('deve bloquear criação de agendamento quando a cota mensal do plano for atingida', async () => {
    const mockTenantId = 'tenant-free-123';
    const mockServiceId = 'service-1';

    (prisma.service.findMany as any).mockResolvedValue([
      {
        id: mockServiceId,
        tenantId: mockTenantId,
        name: 'Corte Tradicional',
        price: 45,
        durationMinutes: 30,
        allowOnlineBooking: true
      }
    ]);

    // Tenant no plano gratuito com cota de 30 agendamentos
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: mockTenantId,
      bufferMinutes: 10,
      plan: {
        id: 'plan-free',
        code: 'FREE',
        name: 'Gratuito',
        isUnlimitedBookings: false,
        monthlyFreeBookings: 30
      }
    });

    // Já atingiu 30 agendamentos no mês corrente
    (prisma.schedule.count as any).mockResolvedValue(30);

    await expect(
      BookingService.createBooking({
        tenantId: mockTenantId,
        serviceIds: [mockServiceId],
        dateStr: '2026-10-20',
        startTime: '10:00',
        clientName: 'Ana Beatriz',
        clientPhone: '11999998888',
        source: BookingSource.ONLINE
      })
    ).rejects.toThrow(/Limite de agendamentos mensais atingido/);
  });
});
