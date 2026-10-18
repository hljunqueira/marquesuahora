import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlansService } from '../src/modules/plans/plans.service';
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

  it('deve ter suporte a resolução dinâmica de planos pelo banco de dados', async () => {
    (prisma.plan.findFirst as any).mockResolvedValue({
      id: 'uuid-free',
      code: 'FREE',
      name: 'Gratuito',
      monthlyPrice: 0,
      active: true
    });

    const defaultPlan = await PlansService.resolvePlan(null);
    expect(defaultPlan?.code).toBe('FREE');
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
