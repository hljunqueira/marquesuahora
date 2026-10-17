import { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { onboardingSchema, updateTenantSettingsSchema } from '@marquesuahora/shared';
import { prisma } from '../../lib/prisma';
import { PlansService } from '../plans/plans.service';
import { EvolutionService } from '../automation/evolution.service';
import { AsaasService } from '../payments/asaas.service';
import { Role, ScheduleStatus } from '@prisma/client';

export const tenantsRoutes: FastifyPluginAsync = async (app) => {
  // Mapeamento editorial de terminologia por nicho
  const nicheTerminologyMap: Record<string, { professional: string; resource: string; client: string; service: string }> = {
    BARBERSHOP: { professional: 'Barbeiro', resource: 'Cadeira', client: 'Cliente', service: 'Corte / Barba' },
    BEAUTY_SALON: { professional: 'Cabeleireira(o)', resource: 'Bancada', client: 'Cliente', service: 'Cabelo / Make' },
    AESTHETICS_CLINIC: { professional: 'Biomédica(o) / Esteticista', resource: 'Cabine', client: 'Paciente', service: 'Procedimento' },
    PERSONAL_TRAINER: { professional: 'Personal Trainer', resource: 'Área / Aparelho', client: 'Aluno', service: 'Treino' },
    NAIL_LASH_STUDIO: { professional: 'Designer', resource: 'Mesa / Poltrona', client: 'Cliente', service: 'Unhas / Cílios' },
    OTHER: { professional: 'Profissional', resource: 'Espaço', client: 'Cliente', service: 'Atendimento' }
  };

  // POST /tenants/onboarding (Público - Criação do Estabelecimento + Usuário Administrador + Serviços Iniciais)
  app.post('/onboarding', async (request, reply) => {
    const data = onboardingSchema.parse(request.body);

    // Verifica se o slug já está em uso
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: data.slug }
    });
    if (existingSlug) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Este link de vitrine já está em uso por outro estabelecimento. Escolha outro.'
      });
    }

    // Verifica se e-mail de acesso já está em uso
    const existingUser = await prisma.user.findFirst({
      where: { email: data.ownerEmail.toLowerCase() }
    });
    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Já existe uma conta cadastrada com este endereço de e-mail.'
      });
    }

    // Verifica se documento já está em uso (se informado)
    let finalDocNumber = data.documentNumber;
    if (finalDocNumber) {
      const existingDoc = await prisma.tenant.findUnique({
        where: { documentNumber: finalDocNumber }
      });
      if (existingDoc) {
        return reply.status(409).send({
          error: 'Conflito',
          message: 'Já existe um estabelecimento cadastrado com este CPF/CNPJ.'
        });
      }
    } else {
      finalDocNumber = 'DOC' + Date.now() + Math.floor(Math.random() * 1000);
    }

    const defaultServicesByNiche: Record<string, Array<{ name: string; price: number; durationMinutes: number; category: string }>> = {
      BARBERSHOP: [
        { name: 'Corte Cabelo Degradê', price: 45, durationMinutes: 30, category: 'Cabelo' },
        { name: 'Barboterapia & Toalha Quente', price: 40, durationMinutes: 30, category: 'Barba' },
        { name: 'Combo Cabelo + Barba', price: 75, durationMinutes: 50, category: 'Combos' }
      ],
      BEAUTY_SALON: [
        { name: 'Escova Modelada', price: 70, durationMinutes: 45, category: 'Cabelo' },
        { name: 'Corte Feminino com Finalização', price: 90, durationMinutes: 50, category: 'Cabelo' },
        { name: 'Hidratação Profunda', price: 120, durationMinutes: 40, category: 'Tratamentos' }
      ],
      AESTHETICS_CLINIC: [
        { name: 'Limpeza de Pele Profunda', price: 150, durationMinutes: 60, category: 'Facial' },
        { name: 'Drenagem Linfática Corporal', price: 130, durationMinutes: 50, category: 'Corporal' },
        { name: 'Avaliação Estética Facial', price: 50, durationMinutes: 30, category: 'Avaliação' }
      ],
      PERSONAL_TRAINER: [
        { name: 'Sessão de Treino Presencial 1h', price: 100, durationMinutes: 60, category: 'Treinos' },
        { name: 'Avaliação Física & Bioimpedância', price: 120, durationMinutes: 45, category: 'Avaliação' }
      ],
      NAIL_LASH_STUDIO: [
        { name: 'Extensão de Cílios Volume Russo', price: 180, durationMinutes: 90, category: 'Cílios' },
        { name: 'Manutenção de Cílios (até 20 dias)', price: 110, durationMinutes: 60, category: 'Cílios' },
        { name: 'Alongamento de Unhas em Gel', price: 140, durationMinutes: 80, category: 'Unhas' }
      ],
      OTHER: [
        { name: 'Atendimento Personalizado', price: 100, durationMinutes: 60, category: 'Geral' }
      ]
    };

    // Seleciona o plano informado ou localiza o primeiro plano ativo via PlansService
    const resolvedPlan = await PlansService.resolvePlan(data.planId);
    const planId = resolvedPlan?.id || null;

    const passwordHash = await argon2.hash(data.ownerPassword);
    const terminology = nicheTerminologyMap[data.niche] || nicheTerminologyMap.OTHER;

    // Transação Atômica no Banco de Dados
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cria Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          legalName: data.legalName || data.name,
          documentType: data.documentType,
          documentNumber: finalDocNumber,
          slug: data.slug.toLowerCase(),
          phone: data.phone,
          addressZip: data.addressZip,
          addressStreet: data.addressStreet,
          addressNumber: data.addressNumber,
          addressComplement: data.addressComplement || null,
          addressNeighborhood: data.addressNeighborhood,
          addressCity: data.addressCity,
          addressState: data.addressState.toUpperCase(),
          isSingleCityZip: data.isSingleCityZip,
          niche: data.niche,
          themeTemplate: data.themeTemplate,
          primaryColor: data.primaryColor || '#7C3AED',
          secondaryColor: data.secondaryColor || '#0B0F19',
          accentColor: data.accentColor || '#D4AF37',
          terminology,
          logoUrl: data.logoUrl || null,
          planId,
          billingStatus: 'TRIAL',
          openingTime: '09:00',
          closingTime: '19:00'
        }
      });

      // 2. Cria Usuário Administrador da Loja
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.ownerName,
          email: data.ownerEmail.toLowerCase(),
          passwordHash,
          role: Role.ADMIN
        }
      });

      // 3. Cadastra os Serviços Selecionados ou Serviços Padrão do Nicho
      const servicesToCreate = (data.selectedServices && data.selectedServices.length > 0)
        ? data.selectedServices
        : (defaultServicesByNiche[data.niche] || defaultServicesByNiche.OTHER);

      await tx.service.createMany({
        data: servicesToCreate.map((svc) => ({
          tenantId: tenant.id,
          name: svc.name,
          category: svc.category || 'Geral',
          price: svc.price,
          durationMinutes: svc.durationMinutes,
          allowOnlineBooking: true
        }))
      });

      // 4. Registra Auditoria
      await tx.auditLog.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          action: 'TENANT_ONBOARDING',
          entityType: 'Tenant',
          entityId: tenant.id,
          details: { name: tenant.name, slug: tenant.slug, niche: tenant.niche },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return { tenant, user };
    });

    // Emite Tokens JWT para Login Imediato
    const accessToken = app.jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
        name: result.user.name,
        email: result.user.email
      },
      { expiresIn: '7d' }
    );

    const refreshToken = app.jwt.sign(
      { sub: result.user.id, tokenType: 'refresh' },
      { expiresIn: '30d' }
    );

    reply.setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });

    return reply.status(201).send({
      message: 'Estabelecimento cadastrado com sucesso! Bem-vindo ao Marca Tua Hora.',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        niche: result.tenant.niche,
        themeTemplate: result.tenant.themeTemplate,
        terminology: result.tenant.terminology,
        billingStatus: result.tenant.billingStatus,
        planId: result.tenant.planId,
        plan: resolvedPlan
          ? {
            id: resolvedPlan.id,
            name: resolvedPlan.name,
            code: resolvedPlan.code,
            maxProfessionals: resolvedPlan.maxProfessionals,
            isUnlimitedBookings: resolvedPlan.isUnlimitedBookings,
            monthlyFreeBookings: resolvedPlan.monthlyFreeBookings
          }
          : null
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      },
      accessToken
    });
  });

  // Rotas autenticadas do Tenant (Dono do Salão / Gestores)
  app.register(async (tenantScope) => {
    tenantScope.addHook('preHandler', app.authenticate);

    // GET /tenants/me - Dados do estabelecimento do usuário autenticado + métricas de uso do plano
    tenantScope.get('/me', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Usuário sem estabelecimento vinculado.' });
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [tenant, currentMonthBookings] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: request.user.tenantId },
          include: {
            plan: true,
            _count: {
              select: {
                professionals: true,
                services: true,
                resources: true,
                schedules: true
              }
            }
          }
        }),
        prisma.schedule.count({
          where: {
            tenantId: request.user.tenantId,
            date: { gte: startOfMonth, lte: endOfMonth },
            status: { not: ScheduleStatus.CANCELLED }
          }
        })
      ]);

      if (!tenant) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
      }

      const plan = tenant.plan;
      const isUnlimited = plan?.isUnlimitedBookings ?? false;
      const monthlyLimit = plan?.monthlyFreeBookings ?? 30;

      return reply.send({
        ...tenant,
        usage: {
          currentProfessionals: tenant._count.professionals,
          maxProfessionals: plan?.maxProfessionals ?? 1,
          currentMonthBookings,
          monthlyFreeBookings: monthlyLimit,
          isUnlimitedBookings: isUnlimited,
          isLimitReached: !isUnlimited && currentMonthBookings >= monthlyLimit
        }
      });
    });

    // PUT /tenants/me/settings - Atualização de configurações gerais, temas e cores
    tenantScope.put('/me/settings', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Apenas administradores da loja podem alterar configurações.' });
      }

      const data = updateTenantSettingsSchema.parse(request.body);

      // Trata upgrade/mudança de plano se planCode for informado
      let resolvedPlanId: string | undefined = undefined;
      let newBillingStatus: string | undefined = undefined;

      if (data.planCode) {
        const resolvedPlan = await PlansService.resolvePlan(data.planCode);
        if (resolvedPlan) {
          resolvedPlanId = resolvedPlan.id;
          newBillingStatus = 'ACTIVE';

          // Se for plano pago e Asaas estiver configurado, cria ou atualiza assinatura recorrente
          if (resolvedPlan.code !== 'FREE' && AsaasService.isConfigured()) {
            const currentTenant = await prisma.tenant.findUnique({
              where: { id: request.user.tenantId },
              include: { users: { select: { email: true } } }
            });
            if (currentTenant) {
              const ownerEmail = currentTenant.users[0]?.email;
              AsaasService.createOrUpdateSubscription(
                { ...currentTenant, ownerEmail },
                resolvedPlan,
                'PIX'
              ).catch((subErr) => {
                console.warn('[Asaas] Falha não-bloqueante ao registrar assinatura:', subErr?.message);
              });
            }
          }
        }
      }

      const updated = await prisma.tenant.update({
        where: { id: request.user.tenantId },
        data: {
          name: data.name,
          legalName: data.legalName,
          description: data.description,
          ...(data.niche ? {
            niche: data.niche,
            terminology: nicheTerminologyMap[data.niche] || nicheTerminologyMap.OTHER
          } : {}),
          phone: data.phone,
          instagramUrl: data.instagramUrl,
          themeTemplate: data.themeTemplate,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          accentColor: data.accentColor,
          logoUrl: data.logoUrl,
          googleReviewUrl: data.googleReviewUrl,
          npsFeedbackEnabled: data.npsFeedbackEnabled,
          depositRequired: data.depositRequired,
          depositType: data.depositType,
          depositAmount: data.depositAmount,
          // PIX Direto do Salão
          pixKey: data.pixKey,
          pixKeyType: data.pixKeyType,
          pixKeyHolder: data.pixKeyHolder,
          maxNoShowsAllowed: data.maxNoShowsAllowed,
          churnRecoveryEnabled: data.churnRecoveryEnabled,
          churnAlertDays: data.churnAlertDays,
          birthdayMessageEnabled: data.birthdayMessageEnabled,
          birthdayMessageCustom: data.birthdayMessageCustom,
          bufferMinutes: data.bufferMinutes,
          ...(data.openingTime !== undefined ? { openingTime: data.openingTime } : {}),
          ...(data.closingTime !== undefined ? { closingTime: data.closingTime } : {}),
          ...(data.slotIntervalMinutes !== undefined ? { slotIntervalMinutes: data.slotIntervalMinutes } : {}),
          minAdvanceBookingMinutes: data.minAdvanceBookingMinutes,
          maxAdvanceBookingDays: data.maxAdvanceBookingDays,
          ...(data.addressStreet !== undefined ? { addressStreet: data.addressStreet } : {}),
          ...(data.addressNumber !== undefined ? { addressNumber: data.addressNumber } : {}),
          ...(data.addressComplement !== undefined ? { addressComplement: data.addressComplement } : {}),
          ...(data.addressNeighborhood !== undefined ? { addressNeighborhood: data.addressNeighborhood } : {}),
          ...(data.addressCity !== undefined ? { addressCity: data.addressCity } : {}),
          ...(data.addressState !== undefined ? { addressState: data.addressState } : {}),
          ...(data.addressZip !== undefined ? { addressZip: data.addressZip } : {}),
          ...(resolvedPlanId ? { planId: resolvedPlanId } : {}),
          ...(newBillingStatus ? { billingStatus: newBillingStatus } : {})
        },
        include: { plan: true }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId: request.user.tenantId,
          action: 'TENANT_SETTINGS_UPDATE',
          entityType: 'Tenant',
          entityId: updated.id,
          details: data,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        message: 'Configurações atualizadas com sucesso.',
        tenant: updated
      });
    });

    // POST /tenants/me/plan - Rota direta para contratação ou alteração de plano
    tenantScope.post('/me/plan', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Usuário sem estabelecimento vinculado.' });
      }

      const body = request.body as { planCode?: string; billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' };
      if (!body?.planCode) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Código do plano (planCode) é obrigatório.' });
      }

      const plan = await PlansService.resolvePlan(body.planCode);
      if (!plan) {
        return reply.status(404).send({ error: 'Not Found', message: 'Plano não encontrado.' });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: request.user.tenantId },
        include: { users: { select: { email: true } } }
      });

      if (!tenant) {
        return reply.status(404).send({ error: 'Not Found', message: 'Estabelecimento não encontrado.' });
      }

      let subscriptionResult: any = null;

      if (plan.code !== 'FREE' && AsaasService.isConfigured()) {
        const ownerEmail = tenant.users[0]?.email;
        subscriptionResult = await AsaasService.createOrUpdateSubscription(
          { ...tenant, ownerEmail },
          plan,
          body.billingType || 'PIX'
        );
      }

      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          planId: plan.id,
          billingStatus: 'ACTIVE',
          blockedReason: null,
          blockedAt: null
        },
        include: { plan: true }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId: tenant.id,
          action: 'TENANT_PLAN_CHANGE',
          entityType: 'Tenant',
          entityId: tenant.id,
          details: {
            planCode: plan.code,
            planName: plan.name,
            monthlyPrice: plan.monthlyPrice,
            subscription: subscriptionResult
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        message: `Plano atualizado com sucesso para ${plan.name}!`,
        tenant: updated,
        plan,
        subscription: subscriptionResult
      });
    });

    // GET /tenants/me/whatsapp - Status da conexão WhatsApp
    tenantScope.get('/me/whatsapp', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito ao salão.' });
      }
      const status = await EvolutionService.getInstanceStatus(request.user.tenantId);
      return reply.send(status);
    });

    // POST /tenants/me/whatsapp/connect - Inicia conexão e gera QR Code
    tenantScope.post('/me/whatsapp/connect', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito ao salão.' });
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: request.user.tenantId },
        include: { plan: true }
      });
      if (!tenant) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não localizado.' });
      }

      // Permite se for Cortesia VIP ou se o plano for diferente do Gratuito (ex: SOLO, EQUIPE_PRO)
      const isAllowed =
        tenant.billingStatus === 'GRATUITY' ||
        !tenant.plan ||
        tenant.plan.code !== 'FREE';

      if (!isAllowed) {
        return reply.status(403).send({
          error: 'Plano incompatível',
          message: 'A automação de WhatsApp está disponível no plano Profissional Solo ou Equipe Pro.'
        });
      }

      const result = await EvolutionService.connectInstance(tenant.id, tenant.slug);
      return reply.send(result);
    });

    // POST /tenants/me/whatsapp/disconnect - Desconecta a instância
    tenantScope.post('/me/whatsapp/disconnect', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito ao salão.' });
      }
      const result = await EvolutionService.disconnectInstance(request.user.tenantId);
      return reply.send(result);
    });
  });
};

