import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { PlansService } from '../plans/plans.service';
import { Role, ScheduleStatus } from '@prisma/client';
import { EmailService } from '../notifications/email.service';
import argon2 from 'argon2';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste módulo são restritas para SUPER_ADMIN
  app.addHook('preHandler', app.requireRole([Role.SUPER_ADMIN]));

  // GET /admin/overview - Métricas executivas da plataforma SaaS
  app.get('/overview', async (_request, reply) => {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      gratuityTenants,
      blockedTenants,
      totalSchedules,
      openTickets,
      plansWithCount
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { billingStatus: 'ACTIVE' } }),
      prisma.tenant.count({ where: { billingStatus: 'TRIAL' } }),
      prisma.tenant.count({ where: { billingStatus: 'GRATUITY' } }),
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

    // Calcula MRR estimado com base nos planos contratados pelas lojas ativas pagantes
    const estimatedMRR = plansWithCount.reduce(
      (acc, p) => acc + Number(p.monthlyPrice) * p._count.tenants,
      0
    );

    return reply.send({
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: trialTenants,
        gratuity: gratuityTenants,
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

  // GET /admin/tenants - Listagem detalhada de todos os estabelecimentos com filtros e estatísticas de uso
  app.get('/tenants', async (request, reply) => {
    const { status, search, planId } = request.query as {
      status?: string;
      search?: string;
      planId?: string;
    };

    const tenants = await prisma.tenant.findMany({
      where: {
        ...(status && status !== 'ALL' ? { billingStatus: status } : {}),
        ...(planId && planId !== 'ALL' ? { planId } : {}),
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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const tenantsWithStats = await Promise.all(
      tenants.map(async (t) => {
        const currentMonthBookings = await prisma.schedule.count({
          where: {
            tenantId: t.id,
            date: { gte: startOfMonth, lte: endOfMonth },
            status: { not: ScheduleStatus.CANCELLED }
          }
        });

        const isUnlimited = t.plan?.isUnlimitedBookings ?? false;
        const monthlyLimit = t.plan?.monthlyFreeBookings ?? 30;

        return {
          ...t,
          isGratuity: t.billingStatus === 'GRATUITY',
          currentMonthBookings,
          monthlyLimit,
          isUnlimitedBookings: isUnlimited,
          isQuotaExceeded: !isUnlimited && currentMonthBookings >= monthlyLimit
        };
      })
    );

    return reply.send(tenantsWithStats);
  });

  // POST /admin/tenants - Cadastro Direto de Assinante pelo Super Admin (Sem Asaas)
  app.post('/tenants', async (request, reply) => {
    const createTenantSchema = z.object({
      name: z.string().min(2, 'Nome do estabelecimento é obrigatório.'),
      slug: z.string().min(2, 'Slug / Link da vitrine é obrigatório.').toLowerCase(),
      niche: z.enum([
        'BARBERSHOP',
        'BEAUTY_SALON',
        'AESTHETICS_CLINIC',
        'PERSONAL_TRAINER',
        'NAIL_LASH_STUDIO',
        'OTHER'
      ]).optional().nullable(),
      phone: z.string().min(10, 'Telefone com DDD é obrigatório.'),
      ownerName: z.string().min(2, 'Nome do proprietário é obrigatório.'),
      ownerEmail: z.string().email('E-mail válido do administrador é obrigatório.').toLowerCase(),
      ownerPassword: z.string().min(6, 'Senha inicial deve ter no mínimo 6 caracteres.'),
      planId: z.string().default('SOLO'),
      billingStatus: z.enum(['ACTIVE', 'TRIAL', 'GRATUITY', 'BLOCKED']).default('ACTIVE'),
      documentNumber: z.string().optional()
    });

    const data = createTenantSchema.parse(request.body);
    const cleanPhone = data.phone.replace(/\D/g, '');
    const cleanDoc = data.documentNumber && data.documentNumber.replace(/\D/g, '').length >= 11
      ? data.documentNumber.replace(/\D/g, '')
      : `TEMP_${Date.now()}`;

    // 1. Valida se slug já existe
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: data.slug.trim().toLowerCase() }
    });
    if (existingSlug) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Já existe um estabelecimento cadastrado com este link / slug.'
      });
    }

    // 2. Valida se e-mail de usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.ownerEmail.trim().toLowerCase() }
    });
    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Já existe um usuário cadastrado com este e-mail na plataforma.'
      });
    }

    // 3. Valida se telefone já existe em outro estabelecimento
    const existingPhone = await prisma.tenant.findFirst({
      where: { phone: cleanPhone }
    });
    if (existingPhone) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Já existe um estabelecimento cadastrado com este número de WhatsApp/telefone.'
      });
    }

    // 4. Resolve plano
    const resolvedPlan = await PlansService.resolvePlan(data.planId);
    const planId = resolvedPlan?.id || null;

    // 5. Hash da senha
    const passwordHash = await argon2.hash(data.ownerPassword);

    const terminologyMap: Record<string, any> = {
      BARBERSHOP: { professional: 'Barbeiro', space: 'Cadeira', service: 'Corte/Barba' },
      BEAUTY_SALON: { professional: 'Cabeleireira', space: 'Bancada', service: 'Procedimento' },
      NAIL_LASH_STUDIO: { professional: 'Designer', space: 'Mesa', service: 'Aplicação/Manutenção' },
      AESTHETICS_CLINIC: { professional: 'Especialista', space: 'Cabine', service: 'Sessão' },
      PERSONAL_TRAINER: { professional: 'Treinador', space: 'Espaço', service: 'Treino' },
      OTHER: { professional: 'Profissional', space: 'Espaço', service: 'Atendimento' }
    };

    const effectiveNiche: any = data.niche || 'OTHER';
    const terminology = terminologyMap[effectiveNiche] || terminologyMap.OTHER;

    // 6. Transação Atômica no Banco de Dados (Zero Asaas)
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name.trim(),
          legalName: data.name.trim(),
          documentType: cleanDoc.length > 11 ? 'CNPJ' : 'CPF',
          documentNumber: cleanDoc,
          slug: data.slug.trim().toLowerCase(),
          phone: cleanPhone,
          addressZip: '00000-000',
          addressStreet: 'Avenida Principal',
          addressNumber: '100',
          addressNeighborhood: 'Centro',
          addressCity: 'Cidade',
          addressState: 'SP',
          niche: effectiveNiche as any,
          themeTemplate: 'PURPLE_GOLD',
          primaryColor: '#7C3AED',
          secondaryColor: '#0B0F19',
          accentColor: '#D4AF37',
          terminology,
          planId,
          billingStatus: data.billingStatus,
          openingTime: '09:00',
          closingTime: '19:00'
        }
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.ownerName.trim(),
          email: data.ownerEmail.trim().toLowerCase(),
          passwordHash,
          role: Role.ADMIN
        }
      });

      return { tenant, user };
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId: result.tenant.id,
        action: 'TENANT_CREATE_MANUAL',
        entityType: 'Tenant',
        entityId: result.tenant.id,
        details: {
          name: result.tenant.name,
          ownerEmail: result.user.email,
          plan: resolvedPlan?.name || data.planId,
          billingStatus: data.billingStatus
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.status(201).send({
      message: 'Estabelecimento cadastrado e ativado com sucesso!',
      tenant: result.tenant,
      owner: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email
      }
    });
  });

  // PATCH /admin/tenants/:id/status - Bloqueio, ativação ou concessão de gratuidade com auditoria
  app.patch('/tenants/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      status: z.enum(['ACTIVE', 'TRIAL', 'GRATUITY', 'BLOCKED', 'CANCELLED']),
      reason: z.string().min(2, 'A justificativa é obrigatória.')
    });

    const data = schema.parse(request.body);

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        billingStatus: data.status,
        blockedReason:
          data.status === 'BLOCKED'
            ? data.reason
            : data.status === 'GRATUITY'
            ? `Cortesia VIP: ${data.reason}`
            : null,
        blockedAt: data.status === 'BLOCKED' ? new Date() : null
      }
    });

    // Registra auditoria da ação do Super Admin
    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId: id,
        action:
          data.status === 'BLOCKED'
            ? 'TENANT_BLOCKED'
            : data.status === 'GRATUITY'
            ? 'TENANT_GRATUITY_GRANTED'
            : 'TENANT_STATUS_UPDATED',
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

  // PATCH /admin/tenants/:id/plan - Alteração de plano e controle de gratuidade em qualquer plano
  app.patch('/tenants/:id/plan', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      planId: z.string().min(1, 'Informe o plano.'),
      isGratuity: z.boolean().optional(),
      reason: z.string().optional()
    });
    const data = schema.parse(request.body);

    const plan = await PlansService.resolvePlan(data.planId);
    if (!plan) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Plano não localizado.' });
    }

    const currentTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!currentTenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não localizado.' });
    }

    let newBillingStatus = currentTenant.billingStatus;
    let newBlockedReason = currentTenant.blockedReason;

    if (data.isGratuity === true) {
      newBillingStatus = 'GRATUITY';
      newBlockedReason = data.reason
        ? `Cortesia VIP: ${data.reason}`
        : 'Cortesia concedida pelo Super Admin';
    } else if (data.isGratuity === false && currentTenant.billingStatus === 'GRATUITY') {
      newBillingStatus = 'ACTIVE';
      newBlockedReason = null;
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        planId: plan.id,
        billingStatus: newBillingStatus,
        blockedReason: newBlockedReason
      },
      include: { plan: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId: id,
        action: data.isGratuity ? 'TENANT_GRATUITY_GRANTED' : 'TENANT_PLAN_CHANGED',
        entityType: 'Tenant',
        entityId: id,
        details: {
          newPlanId: plan.id,
          planName: plan.name,
          planCode: plan.code,
          isGratuity: data.isGratuity,
          reason: data.reason
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.send({
      message: `Plano atualizado para ${plan.name}${data.isGratuity ? ' com cortesia ativada' : ''}.`,
      tenant
    });
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

  // GET /admin/integrations - Status de todas as integrações da plataforma
  app.get('/integrations', async (_request, reply) => {
    const apiBaseUrl = process.env.API_URL || 'https://api.marquesuahora.com.br';
    const resendApiKey = process.env.RESEND_API_KEY || '';
    const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET || '';
    const evolutionApiUrl = process.env.EVOLUTION_API_URL || '';
    const asaasApiKey = process.env.ASAAS_API_KEY || '';
    const asaasWebhookSecret = process.env.ASAAS_WEBHOOK_SECRET || '';
    const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';

    return reply.send({
      resend: {
        name: 'Resend (E-mail Transacional)',
        status: resendApiKey ? 'CONNECTED' : 'PENDING_CONFIG',
        domain: 'marquesuahora.com.br',
        sender: process.env.EMAIL_FROM || 'Marque Sua Hora <notificacoes@marquesuahora.com.br>',
        webhookUrl: `${apiBaseUrl}/webhooks/resend`,
        apiKeyConfigured: Boolean(resendApiKey),
        apiKeyMasked: resendApiKey ? `${resendApiKey.slice(0, 10)}...${resendApiKey.slice(-6)}` : null,
        apiKeyRaw: resendApiKey,
        webhookSecretConfigured: Boolean(resendWebhookSecret),
        webhookSecretMasked: resendWebhookSecret ? `${resendWebhookSecret.slice(0, 10)}...${resendWebhookSecret.slice(-6)}` : null,
        webhookSecretRaw: resendWebhookSecret,
        events: ['email.sent', 'email.delivered', 'email.bounced', 'email.complained']
      },
      evolution: {
        name: 'Evolution API v2 (WhatsApp Multi-Tenant)',
        status: evolutionApiUrl ? 'CONNECTED' : 'DISCONNECTED',
        serverUrl: evolutionApiUrl,
        webhookUrl: `${apiBaseUrl}/webhooks/whatsapp`
      },
      asaas: {
        name: 'Asaas (Gateway de Pagamentos PIX & Cartão)',
        status: asaasApiKey ? 'CONNECTED' : 'PENDING_CONFIG',
        environment: 'Produção',
        webhookUrl: `${apiBaseUrl}/webhooks/asaas`,
        apiKeyConfigured: Boolean(asaasApiKey),
        apiKeyMasked: asaasApiKey ? `${asaasApiKey.slice(0, 12)}...${asaasApiKey.slice(-6)}` : null,
        webhookSecretConfigured: Boolean(asaasWebhookSecret),
        webhookSecretMasked: asaasWebhookSecret ? `${asaasWebhookSecret.slice(0, 8)}...${asaasWebhookSecret.slice(-4)}` : null,
        events: [
          'PAYMENT_CONFIRMED',
          'PAYMENT_RECEIVED',
          'PAYMENT_ANTICIPATED',
          'PAYMENT_OVERDUE',
          'PAYMENT_DELETED',
          'PAYMENT_RESTORED',
          'PAYMENT_REFUNDED',
          'SUBSCRIPTION_CREATED',
          'SUBSCRIPTION_UPDATED',
          'SUBSCRIPTION_DELETED'
        ]
      },
      openrouter: {
        name: 'OpenRouter (Inteligência Artificial)',
        status: openRouterApiKey ? 'CONNECTED' : 'PENDING_CONFIG',
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        engine: 'Context Engine 360°'
      }
    });
  });

  // POST /admin/integrations/test-email - Disparo de teste para validar Resend e DNS
  app.post('/integrations/test-email', async (request, reply) => {
    const body = z.object({ to: z.string().email('E-mail inválido') }).parse(request.body);
    const result = await EmailService.send({
      to: body.to,
      subject: 'Teste de Integração Resend — Marque Sua Hora',
      html: `
        <div style="font-family: sans-serif; padding: 12px 0;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">Conexão Resend Validada com Sucesso!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Este e-mail confirma que a API Key do Resend e o apontamento DNS do domínio <strong>marquesuahora.com.br</strong> estão funcionando perfeitamente na plataforma <strong>Marque Sua Hora</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <ul style="font-size: 13px; color: #64748b; line-height: 1.8; padding-left: 20px;">
            <li><strong>Domínio:</strong> marquesuahora.com.br</li>
            <li><strong>Remetente Oficial:</strong> notificacoes@marquesuahora.com.br</li>
            <li><strong>Webhook Endpoint:</strong> https://api.marquesuahora.com.br/webhooks/resend</li>
            <li><strong>Data do disparo:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</li>
          </ul>
        </div>
      `,
      tenantName: 'Marque Sua Hora (Super Admin)'
    });

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Falha ao disparar e-mail pelo Resend'
      });
    }

    return reply.send({
      success: true,
      messageId: result.messageId,
      simulated: result.simulated || false
    });
  });
};
