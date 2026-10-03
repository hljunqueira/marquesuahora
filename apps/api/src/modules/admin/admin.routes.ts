import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste módulo são restritas para SUPER_ADMIN
  app.addHook('preHandler', app.requireRole([Role.SUPER_ADMIN]));

  // GET /admin/overview - Métricas executivas da plataforma SaaS
  app.get('/overview', async (_request, reply) => {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      blockedTenants,
      totalSchedules,
      openTickets,
      plansWithCount
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { billingStatus: 'ACTIVE' } }),
      prisma.tenant.count({ where: { billingStatus: 'TRIAL' } }),
      prisma.tenant.count({ where: { billingStatus: 'BLOCKED' } }),
      prisma.schedule.count(),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] } } }),
      prisma.plan.findMany({
        select: {
          id: true,
          name: true,
          monthlyPrice: true,
          _count: { select: { tenants: true } }
        }
      })
    ]);

    // Calcula MRR estimado com base nos planos contratados pelas lojas ativas
    const estimatedMRR = plansWithCount.reduce(
      (acc, p) => acc + Number(p.monthlyPrice) * p._count.tenants,
      0
    );

    return reply.send({
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: trialTenants,
        blocked: blockedTenants
      },
      schedules: {
        total: totalSchedules
      },
      support: {
        openTickets
      },
      financial: {
        estimatedMRR
      },
      plansDistribution: plansWithCount
    });
  });

  // GET /admin/tenants - Listagem detalhada de todos os estabelecimentos com filtros
  app.get('/tenants', async (request, reply) => {
    const { status, search, planId } = request.query as {
      status?: string;
      search?: string;
      planId?: string;
    };

    const tenants = await prisma.tenant.findMany({
      where: {
        ...(status ? { billingStatus: status } : {}),
        ...(planId ? { planId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { documentNumber: { contains: search } },
                { phone: { contains: search } }
              ]
            }
          : {})
      },
      include: {
        plan: true,
        users: {
          where: { role: Role.ADMIN },
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            professionals: true,
            services: true,
            schedules: true,
            tickets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send(tenants);
  });

  // PATCH /admin/tenants/:id/status - Bloqueio manual ou desbloqueio de loja com auditoria
  app.patch('/tenants/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      status: z.enum(['ACTIVE', 'TRIAL', 'BLOCKED', 'CANCELLED']),
      reason: z.string().min(3, 'A justificativa é obrigatória.')
    });

    const data = schema.parse(request.body);

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        billingStatus: data.status,
        blockedReason: data.status === 'BLOCKED' ? data.reason : null,
        blockedAt: data.status === 'BLOCKED' ? new Date() : null
      }
    });

    // Registra auditoria da ação do Super Admin
    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId: id,
        action: data.status === 'BLOCKED' ? 'TENANT_BLOCKED' : 'TENANT_UNBLOCKED',
        entityType: 'Tenant',
        entityId: id,
        details: { newStatus: data.status, reason: data.reason },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.send({
      message: `Status do estabelecimento atualizado para ${data.status}.`,
      tenant
    });
  });

  // PATCH /admin/tenants/:id/plan - Alteração de plano da loja (Upgrade / Downgrade)
  app.patch('/tenants/:id/plan', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ planId: z.string().uuid() });
    const { planId } = schema.parse(request.body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Plano não localizado.' });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { planId }
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId: id,
        action: 'TENANT_PLAN_CHANGED',
        entityType: 'Tenant',
        entityId: id,
        details: { newPlanId: planId, planName: plan.name },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.send({ message: `Plano atualizado para ${plan.name}.`, tenant });
  });

  // POST /admin/tenants/:id/impersonate - Acesso transparente de suporte como dono da loja
  app.post('/tenants/:id/impersonate', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { where: { role: Role.ADMIN }, take: 1 }
      }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não localizado.' });
    }

    const owner = tenant.users[0];
    if (!owner) {
      return reply.status(404).send({ error: 'Sem administrador', message: 'Esta loja não possui um usuário administrador vinculado.' });
    }

    // Emite token temporário de 1 hora de impersonação
    const impersonateToken = app.jwt.sign(
      {
        sub: owner.id,
        tenantId: tenant.id,
        role: owner.role,
        name: owner.name,
        email: owner.email,
        isImpersonated: true,
        impersonatedBy: request.user.sub
      },
      { expiresIn: '1h' }
    );

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId: tenant.id,
        action: 'TENANT_IMPERSONATED',
        entityType: 'Tenant',
        entityId: tenant.id,
        details: { targetTenantName: tenant.name, ownerEmail: owner.email },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.send({
      message: `Sessão de suporte iniciada para ${tenant.name}.`,
      token: impersonateToken,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
    });
  });

  // GET /admin/audit-logs - Histórico de auditoria da plataforma
  app.get('/audit-logs', async (request, reply) => {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });

    return reply.send(logs);
  });
};
