import { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { onboardingSchema, updateTenantSettingsSchema } from '@marquesuahora/shared';
import { prisma } from '../../lib/prisma';
import { PlansService } from '../plans/plans.service';
import { EvolutionService } from '../automation/evolution.service';
import { AsaasService } from '../payments/asaas.service';
import { Role, ScheduleStatus } from '@prisma/client';
import { EmailService } from '../notifications/email.service';

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

  // POST /tenants/check-availability (Público - Verificação em tempo real de e-mail, telefone e slug)
  app.post('/check-availability', async (request, reply) => {
    const { email, phone, slug } = (request.body as { email?: string; phone?: string; slug?: string }) || {};

    const response = {
      emailAvailable: true,
      phoneAvailable: true,
      slugAvailable: true,
      emailMessage: '',
      phoneMessage: '',
      slugMessage: ''
    };

    if (email && email.trim().includes('@')) {
      const cleanEmail = email.trim().toLowerCase();
      const existingUser = await prisma.user.findFirst({
        where: { email: cleanEmail }
      });
      if (existingUser) {
        response.emailAvailable = false;
        response.emailMessage = 'Este e-mail já está em uso na plataforma. Faça login ou use outro.';
      }
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        const existingTenant = await prisma.tenant.findFirst({
          where: { phone: cleanPhone }
        });
        if (existingTenant) {
          response.phoneAvailable = false;
          response.phoneMessage = 'Este telefone/WhatsApp já está cadastrado em outro estabelecimento.';
        }
      }
    }

    if (slug && slug.trim().length >= 3) {
      const cleanSlug = slug.trim().toLowerCase();
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug: cleanSlug }
      });
      if (existingTenant) {
        response.slugAvailable = false;
        response.slugMessage = 'Este link de vitrine já está em uso por outro espaço.';
      }
    }

    return reply.send(response);
  });

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

    // Verifica se telefone / WhatsApp já está em uso por outro estabelecimento
    const cleanPhone = data.phone;
    const existingPhone = await prisma.tenant.findFirst({
      where: { phone: cleanPhone }
    });
    if (existingPhone) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Este número de WhatsApp/telefone já está cadastrado em outro estabelecimento.'
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

    // Seleciona o plano informado ou localiza o primeiro plano ativo via PlansService
    const resolvedPlan = await PlansService.resolvePlan(data.planId);
    const planId = resolvedPlan?.id || null;

    const effectivePassword = data.ownerPassword?.trim() || `MSH_${Math.random().toString(36).slice(-8)}!Aa1`;
    const passwordHash = await argon2.hash(effectivePassword);
    const effectiveNiche: any = data.niche || 'OTHER';
    const terminology = nicheTerminologyMap[effectiveNiche] || nicheTerminologyMap.OTHER;

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
          niche: effectiveNiche,
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

      // 3. Cadastra os Serviços Selecionados (apenas se informados explicitamente no cadastro)
      if (data.selectedServices && data.selectedServices.length > 0) {
        await tx.service.createMany({
          data: data.selectedServices.map((svc) => ({
            tenantId: tenant.id,
            name: svc.name,
            category: svc.category || 'Geral',
            price: svc.price,
            durationMinutes: svc.durationMinutes,
            allowOnlineBooking: true
          }))
        });
      }

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

    // Emite link seguro para confirmação de conta e redefinição de senha
    const resetToken = app.jwt.sign(
      { sub: result.user.id, email: result.user.email, type: 'PASSWORD_RESET' },
      { expiresIn: '24h' }
    );
    const resetLink = `https://marquesuahora.com.br/redefinir-senha?token=${resetToken}`;

    // Dispara e-mail transacional de confirmação
    EmailService.send({
      to: result.user.email,
      subject: 'Confirme seu e-mail e defina sua senha — Marque Sua Hora',
      html: `
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
          Boas-vindas ao Marque Sua Hora!
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
          Olá, <strong>${result.user.name}</strong>!
        </p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
          Seu espaço <strong>${result.tenant.name}</strong> foi cadastrado com sucesso. Para começar a usar a plataforma e definir sua senha definitiva de acesso, clique no botão seguro abaixo:
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);">
            Confirmar e Definir Minha Senha
          </a>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin: 24px 0;">
          <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Dados do Seu Acesso
          </div>
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">
            <strong>Link da Vitrine Pública:</strong>
            <a href="https://marquesuahora.com.br/${result.tenant.slug}" target="_blank" style="color: #7c3aed; text-decoration: none; font-weight: 600;">
              marquesuahora.com.br/${result.tenant.slug}
            </a>
          </p>
          <p style="margin: 0; font-size: 13px; color: #334155;">
            <strong>E-mail de Acesso:</strong> ${result.user.email}
          </p>
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 24px 0 0 0;">
          Por segurança, este link é válido por <strong>24 horas</strong>. Se você não realizou este cadastro, desconsidere esta mensagem.
        </p>
      `,
      tenantName: result.tenant.name
    }).catch((err) => {
      console.warn('[Onboarding Email] Falha no disparo do e-mail de confirmação:', err.message);
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
      accessToken,
      emailConfirmationSent: true,
      resetLink
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
          depositOnFirstBooking: data.depositOnFirstBooking,
          depositFirstBookingType: data.depositFirstBookingType,
          depositFirstBookingValue: data.depositFirstBookingValue,
          depositFirstBookingPercent: data.depositFirstBookingValue !== undefined ? data.depositFirstBookingValue : data.depositFirstBookingPercent,
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

    // GET /tenants/me/ai-settings - Configurações da Atendente IA
    tenantScope.get('/me/ai-settings', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito ao salão.' });
      }
      const aiSettings = await prisma.tenantAiSettings.upsert({
        where: { tenantId: request.user.tenantId },
        create: { tenantId: request.user.tenantId },
        update: {}
      });
      return reply.send(aiSettings);
    });

    // PUT /tenants/me/ai-settings - Atualiza instruções e FAQ da Atendente IA
    tenantScope.put('/me/ai-settings', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito ao salão.' });
      }
      const body = request.body as { customInstructions?: string; knowledgeBaseFaq?: any };
      const updated = await prisma.tenantAiSettings.upsert({
        where: { tenantId: request.user.tenantId },
        create: {
          tenantId: request.user.tenantId,
          customInstructions: body.customInstructions,
          knowledgeBaseFaq: body.knowledgeBaseFaq || []
        },
        update: {
          customInstructions: body.customInstructions,
          ...(body.knowledgeBaseFaq !== undefined ? { knowledgeBaseFaq: body.knowledgeBaseFaq } : {})
        }
      });
      return reply.send({ success: true, aiSettings: updated });
    });
  });
};

