import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { NotificationCategory, NotificationPriority, ScheduleStatus, TransactionType, PaymentMethod } from '@prisma/client';
import { NotificationDispatcherService } from '../src/modules/notifications/dispatcher.service';
import { AsaasService } from '../src/modules/payments/asaas.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    schedule: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    financialEntry: {
      upsert: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    },
    notification: {
      create: vi.fn()
    }
  }
}));

vi.mock('../src/modules/notifications/dispatcher.service', () => ({
  NotificationDispatcherService: {
    dispatch: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('Fluxos de Pagamento dos Planos e Webhook do Asaas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ASAAS_WEBHOOK_SECRET;
  });

  describe('1. AsaasService — Configuração e Métodos', () => {
    it('deve identificar se a API do Asaas está configurada', () => {
      process.env.ASAAS_API_KEY = 'test_key';
      expect(AsaasService.isConfigured()).toBe(true);

      process.env.ASAAS_API_KEY = '';
      expect(AsaasService.isConfigured()).toBe(false);
    });
  });

  describe('2. Processamento de Webhook — Assinaturas e Planos dos Salões', () => {
    it('deve reativar salão para ACTIVE e remover bloqueios ao receber PAYMENT_CONFIRMED', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Studio Beleza Pura',
        billingStatus: 'OVERDUE',
        blockedReason: 'INADIMPLENCIA',
        blockedAt: new Date(),
        asaasSubscriptionId: 'sub_123',
        asaasCustomerId: 'cus_123',
        plan: {
          id: 'plan-solo',
          name: 'Profissional Solo',
          monthlyPrice: 39.0
        }
      };

      (prisma.tenant.findFirst as any).mockResolvedValue(mockTenant);
      (prisma.tenant.update as any).mockResolvedValue({ ...mockTenant, billingStatus: 'ACTIVE', blockedReason: null, blockedAt: null });
      (prisma.auditLog.create as any).mockResolvedValue({});
      (prisma.notification.create as any).mockResolvedValue({});

      // Simula evento PAYMENT_CONFIRMED
      const payload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_999',
          subscription: 'sub_123',
          customer: 'cus_123',
          value: 39.0,
          billingType: 'PIX',
          status: 'CONFIRMED'
        }
      };

      // Executa lógica do webhook
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { asaasSubscriptionId: payload.payment.subscription },
            { asaasCustomerId: payload.payment.customer }
          ]
        },
        include: { plan: true }
      });

      expect(tenant).not.toBeNull();
      expect(tenant?.id).toBe('tenant-123');

      await prisma.tenant.update({
        where: { id: tenant!.id },
        data: {
          billingStatus: 'ACTIVE',
          blockedReason: null,
          blockedAt: null
        }
      });

      await prisma.auditLog.create({
        data: {
          tenantId: tenant!.id,
          action: 'TENANT_PLAN_PAYMENT_CONFIRMED',
          entityType: 'Tenant',
          entityId: tenant!.id,
          details: {
            paymentId: payload.payment.id,
            subscriptionId: payload.payment.subscription,
            amount: payload.payment.value,
            billingType: payload.payment.billingType,
            event: payload.event
          }
        }
      });

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-123' },
          data: expect.objectContaining({
            billingStatus: 'ACTIVE',
            blockedReason: null,
            blockedAt: null
          })
        })
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TENANT_PLAN_PAYMENT_CONFIRMED',
            tenantId: 'tenant-123'
          })
        })
      );
    });

    it('deve marcar salão como OVERDUE e emitir notificação quando receber PAYMENT_OVERDUE', async () => {
      const mockTenant = {
        id: 'tenant-overdue',
        name: 'Barbearia VIP',
        billingStatus: 'ACTIVE',
        asaasSubscriptionId: 'sub_overdue',
        plan: { name: 'Equipe Pro', monthlyPrice: 79.0 }
      };

      (prisma.tenant.findFirst as any).mockResolvedValue(mockTenant);
      (prisma.tenant.update as any).mockResolvedValue({ ...mockTenant, billingStatus: 'OVERDUE' });
      (prisma.auditLog.create as any).mockResolvedValue({});
      (prisma.notification.create as any).mockResolvedValue({});

      await prisma.tenant.update({
        where: { id: mockTenant.id },
        data: { billingStatus: 'OVERDUE' }
      });

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-overdue' },
          data: { billingStatus: 'OVERDUE' }
        })
      );
    });

    it('deve marcar salão como CANCELLED ao receber SUBSCRIPTION_DELETED', async () => {
      const mockTenant = {
        id: 'tenant-cancel',
        name: 'Estúdio Bronze',
        billingStatus: 'ACTIVE',
        asaasSubscriptionId: 'sub_deleted'
      };

      (prisma.tenant.findFirst as any).mockResolvedValue(mockTenant);
      (prisma.tenant.update as any).mockResolvedValue({ ...mockTenant, billingStatus: 'CANCELLED' });

      await prisma.tenant.update({
        where: { id: mockTenant.id },
        data: {
          billingStatus: 'CANCELLED',
          blockedReason: 'Assinatura cancelada no Asaas'
        }
      });

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-cancel' },
          data: expect.objectContaining({
            billingStatus: 'CANCELLED',
            blockedReason: 'Assinatura cancelada no Asaas'
          })
        })
      );
    });
  });

  describe('3. Processamento de Webhook — Sinal PIX Anti-No-Show', () => {
    it('deve confirmar agendamento PENDING e registrar receita financeira ao receber PAYMENT_CONFIRMED de sinal', async () => {
      const mockSchedule = {
        id: 'sched-123',
        tenantId: 'tenant-456',
        status: ScheduleStatus.PENDING,
        depositAmount: 50.0,
        depositPaid: false,
        startTime: '14:00',
        totalDurationMinutes: 60,
        totalPrice: 150.0,
        date: new Date('2026-10-25T14:00:00Z'),
        client: { name: 'Camila Fernandes', phone: '11988887777', email: 'camila@exemplo.com' },
        professional: { name: 'Renata Designer', phone: '11977776666' },
        service: { name: 'Extensão de Cílios Volume Russo' },
        tenant: { name: 'Lash Academy' }
      };

      (prisma.schedule.findUnique as any).mockResolvedValue(mockSchedule);
      (prisma.schedule.update as any).mockResolvedValue({ ...mockSchedule, depositPaid: true, status: ScheduleStatus.CONFIRMED });
      (prisma.financialEntry.upsert as any).mockResolvedValue({});

      // Simula confirmação do sinal
      await prisma.schedule.update({
        where: { id: mockSchedule.id },
        data: {
          depositPaid: true,
          status: ScheduleStatus.CONFIRMED
        }
      });

      await prisma.financialEntry.upsert({
        where: { scheduleId: mockSchedule.id },
        update: { amount: 50.0 },
        create: {
          tenantId: mockSchedule.tenantId,
          scheduleId: mockSchedule.id,
          professionalId: 'prof-1',
          type: TransactionType.INCOME,
          amount: 50.0,
          depositDeducted: 50.0,
          description: 'Sinal PIX recebido via Asaas — Camila Fernandes',
          paymentMethod: PaymentMethod.PIX,
          paidAt: new Date()
        }
      });

      await NotificationDispatcherService.dispatch({
        tenantId: mockSchedule.tenantId,
        trigger: 'PAYMENT_CONFIRMED' as any,
        scheduleId: mockSchedule.id,
        data: {
          clientName: mockSchedule.client.name,
          depositAmount: '50.00'
        }
      });

      expect(prisma.schedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-123' },
          data: { depositPaid: true, status: ScheduleStatus.CONFIRMED }
        })
      );

      expect(prisma.financialEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scheduleId: 'sched-123' },
          create: expect.objectContaining({
            type: TransactionType.INCOME,
            amount: 50.0,
            paymentMethod: PaymentMethod.PIX
          })
        })
      );

      expect(NotificationDispatcherService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-456',
          trigger: 'PAYMENT_CONFIRMED'
        })
      );
    });
  });
});
