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

    // Todo novo cadastro começa no Plano Gratuito (sem período de teste)
    const targetPlanCode = data.planId || 'FREE';
    const resolvedPlan = await PlansService.resolvePlan(targetPlanCode);
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
          billingStatus: 'ACTIVE',
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

    // Emite Tokens JWT para Login Imediato e Contínuo
    const accessToken = app.jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
        name: result.user.name,
        email: result.user.email
      },
      { expiresIn: '30d' }
    );

    const refreshToken = app.jwt.sign(
      { sub: result.user.id, tokenType: 'refresh' },
      { expiresIn: '90d' }
    );

    reply.setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 // 90 dias
    });

    return reply.status(201).send({
      message: 'Estabelecimento cadastrado com sucesso! Bem-vindo ao Marca Sua Hora.',
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

      let cleanDoc = data.documentNumber ? data.documentNumber.replace(/\D/g, '') : undefined;
      if (cleanDoc) {
        if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'O documento deve conter 11 dígitos para CPF ou 14 dígitos para CNPJ.'
          });
        }

        const existingTenantWithDoc = await prisma.tenant.findUnique({
          where: { documentNumber: cleanDoc }
        });

        if (existingTenantWithDoc && existingTenantWithDoc.id !== request.user.tenantId) {
          return reply.status(409).send({
            error: 'Conflito',
            message: 'Já existe um estabelecimento cadastrado com este CPF/CNPJ.'
          });
        }
      }

      const resolvedDocType = data.documentType 
        ? data.documentType 
        : (cleanDoc ? (cleanDoc.length === 14 ? 'CNPJ' : 'CPF') : undefined);

      const updated = await prisma.tenant.update({
        where: { id: request.user.tenantId },
        data: {
          name: data.name,
          legalName: data.legalName,
          ...(resolvedDocType ? { documentType: resolvedDocType } : {}),
          ...(cleanDoc ? { documentNumber: cleanDoc } : {}),
          description: data.description,
          ...(data.niche ? {
            niche: data.niche,
            terminology: nicheTerminologyMap[data.niche] || nicheTerminologyMap.OTHER
          } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || '' } : {}),
          instagramUrl: data.instagramUrl,
          themeTemplate: data.themeTemplate,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          accentColor: data.accentColor,
          logoUrl: data.logoUrl,
          coverUrl: data.coverUrl,
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
          welcomeMessageEnabled: data.welcomeMessageEnabled,
          welcomeMessageCustom: data.welcomeMessageCustom,
          ...(data.aiAssistantEnabled !== undefined ? { aiAssistantEnabled: data.aiAssistantEnabled } : {}),
          birthdayMessageEnabled: data.birthdayMessageEnabled,
          birthdayMessageCustom: data.birthdayMessageCustom,
          bufferMinutes: data.bufferMinutes,
          ...(data.openingTime !== undefined ? { openingTime: data.openingTime } : {}),
          ...(data.closingTime !== undefined ? { closingTime: data.closingTime } : {}),
          ...(data.slotIntervalMinutes !== undefined ? { slotIntervalMinutes: data.slotIntervalMinutes } : {}),
          minAdvanceBookingMinutes: data.minAdvanceBookingMinutes,
          maxAdvanceBookingDays: data.maxAdvanceBookingDays,
          ...(data.blockNationalHolidays !== undefined ? { blockNationalHolidays: data.blockNationalHolidays } : {}),
          ...(data.holidayExceptions !== undefined ? { holidayExceptions: data.holidayExceptions } : {}),
          ...(data.addressStreet !== undefined ? { addressStreet: data.addressStreet } : {}),
          ...(data.addressNumber !== undefined ? { addressNumber: data.addressNumber } : {}),
          ...(data.addressComplement !== undefined ? { addressComplement: data.addressComplement } : {}),
          ...(data.addressNeighborhood !== undefined ? { addressNeighborhood: data.addressNeighborhood } : {}),
          ...(data.addressCity !== undefined ? { addressCity: data.addressCity } : {}),
          ...(data.addressState !== undefined ? { addressState: data.addressState } : {}),
          ...(data.addressZip !== undefined ? { addressZip: data.addressZip } : {}),
          ...(data.galleryPhotos !== undefined ? { galleryPhotos: data.galleryPhotos } : {}),
          ...(data.aftercareGuides !== undefined ? { aftercareGuides: data.aftercareGuides } : {})
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

    // GET /tenants/me/gallery - Consulta da galeria de fotos oficial de resultados e unhas
    tenantScope.get('/me/gallery', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: request.user.tenantId },
        select: { id: true, name: true, galleryPhotos: true }
      });

      return reply.send({
        photos: tenant?.galleryPhotos || []
      });
    });

    // PUT /tenants/me/gallery - Atualização rápida da galeria de fotos oficial
    tenantScope.put('/me/gallery', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const body = request.body as { photos?: string[] };
      const photos = Array.isArray(body?.photos)
        ? body.photos.filter((p) => typeof p === 'string' && p.trim().length > 0)
        : [];

      const updated = await prisma.tenant.update({
        where: { id: request.user.tenantId },
        data: { galleryPhotos: photos },
        select: { id: true, galleryPhotos: true }
      });

      return reply.send({
        success: true,
        photos: updated.galleryPhotos
      });
    });

    // PUT /tenants/me/aftercare - Atualização rápida dos guias de cuidados pós-atendimento
    tenantScope.put('/me/aftercare', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const body = request.body as { aftercareGuides: any[] };
      const guides = Array.isArray(body?.aftercareGuides) ? body.aftercareGuides : [];

      const updated = await prisma.tenant.update({
        where: { id: request.user.tenantId },
        data: { aftercareGuides: guides }
      });

      return reply.send({ success: true, aftercareGuides: updated.aftercareGuides });
    });

    // POST /tenants/me/plan/checkout-intent - Gera ou obtém o QR Code Pix e dados de pagamento da assinatura Asaas
    tenantScope.post('/me/plan/checkout-intent', async (request, reply) => {
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
        include: { plan: true, users: { select: { email: true } } }
      });

      if (!tenant) {
        return reply.status(404).send({ error: 'Not Found', message: 'Estabelecimento não encontrado.' });
      }

      // Blindagem VIP: estabelecimentos VIP não precisam nem podem alterar plano
      const isCurrentVip = Boolean(
        tenant.plan?.code === 'VIP_PRO' ||
        tenant.plan?.code === 'VIP_AI' ||
        (tenant.plan?.name && tenant.plan.name.toUpperCase().includes('VIP')) ||
        tenant.billingStatus === 'GRATUITY'
      );

      if (isCurrentVip) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Seu estabelecimento possui Plano VIP Vitalício completo com acesso total a todas as funcionalidades.'
        });
      }

      const ownerEmail = tenant.users[0]?.email;
      let subscriptionResult: any = null;

      if (plan.code !== 'FREE' && AsaasService.isConfigured()) {
        subscriptionResult = await AsaasService.createOrUpdateSubscription(
          { ...tenant, ownerEmail },
          plan,
          body.billingType || 'PIX'
        );
      }

      const rawPrice = Number(plan.monthlyPrice);
      const feeRate = 0.0199;
      const fee = rawPrice * feeRate;
      const total = rawPrice + fee;

      return reply.send({
        plan: {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          monthlyPrice: rawPrice
        },
        fee: Number(fee.toFixed(2)),
        total: Number(total.toFixed(2)),
        subscriptionId: subscriptionResult?.subscriptionId,
        paymentId: subscriptionResult?.paymentId,
        pixQrCodeBase64: subscriptionResult?.pixQrCodeBase64,
        pixCopiaECola: subscriptionResult?.pixCopiaECola,
        expirationDate: subscriptionResult?.expirationDate,
        invoiceUrl: subscriptionResult?.invoiceUrl
      });
    });

    // POST /tenants/me/plan - Rota para alteração de plano (apenas downgrade gratuito; planos pagos exigem checkout)
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
        include: { plan: true, users: { select: { email: true } } }
      });

      if (!tenant) {
        return reply.status(404).send({ error: 'Not Found', message: 'Estabelecimento não encontrado.' });
      }

      // 1. Blindagem VIP: estabelecimentos VIP não podem ter o plano alterado nem sofrer downgrade
      const isCurrentVip = Boolean(
        tenant.plan?.code === 'VIP_PRO' ||
        tenant.plan?.code === 'VIP_AI' ||
        (tenant.plan?.name && tenant.plan.name.toUpperCase().includes('VIP')) ||
        tenant.billingStatus === 'GRATUITY'
      );

      if (isCurrentVip) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Seu estabelecimento possui Plano VIP Vitalício completo com acesso total a todas as funcionalidades. A alteração de plano está bloqueada.'
        });
      }

      // 2. Proteção contra ativação gratuita de planos pagos:
      // Planos comerciais pagos (Solo, Equipe Pro) DEVEM passar pelo checkout com confirmação bancária
      if (Number(plan.monthlyPrice) > 0) {
        return reply.status(402).send({
          error: 'PaymentRequired',
          message: 'A contratação de planos pagos requer confirmação de pagamento no checkout. Conclua o pagamento via PIX ou Cartão para ativar.'
        });
      }

      // 3. Downgrade para o Plano Gratuito (permitido apenas para estabelecimentos não-VIP)
      if (tenant.asaasSubscriptionId && AsaasService.isConfigured()) {
        await AsaasService.cancelSubscription(tenant.asaasSubscriptionId).catch((cancelErr) => {
          console.warn('[Asaas] Falha ao cancelar assinatura durante downgrade:', cancelErr?.message);
        });
      }

      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          planId: plan.id,
          billingStatus: 'ACTIVE',
          asaasSubscriptionId: null,
          blockedReason: null,
          blockedAt: null
        },
        include: { plan: true }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId: tenant.id,
          action: 'TENANT_PLAN_DOWNGRADE_FREE',
          entityType: 'Tenant',
          entityId: tenant.id,
          details: {
            planCode: plan.code,
            planName: plan.name
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        message: 'Plano alterado para Gratuito com sucesso.',
        tenant: updated,
        plan
      });
    });

    // POST /tenants/me/plan/verify-payment - Valida o pagamento no gateway Asaas e ativa o plano correspondente
    tenantScope.post('/me/plan/verify-payment', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Usuário sem estabelecimento vinculado.' });
      }

      const body = request.body as {
        planCode?: string;
        paymentId?: string;
        subscriptionId?: string;
      };

      if (!body?.planCode) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Código do plano (planCode) é obrigatório.' });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: request.user.tenantId },
        include: { plan: true, users: { select: { email: true } } }
      });

      if (!tenant) {
        return reply.status(404).send({ error: 'Not Found', message: 'Estabelecimento não encontrado.' });
      }

      // Blindagem VIP
      const isCurrentVip = Boolean(
        tenant.plan?.code === 'VIP_PRO' ||
        tenant.plan?.code === 'VIP_AI' ||
        (tenant.plan?.name && tenant.plan.name.toUpperCase().includes('VIP')) ||
        tenant.billingStatus === 'GRATUITY'
      );

      if (isCurrentVip) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Seu estabelecimento possui Plano VIP Vitalício completo com acesso total a todas as funcionalidades.'
        });
      }

      const targetPlan = await PlansService.resolvePlan(body.planCode);
      if (!targetPlan) {
        return reply.status(404).send({ error: 'Not Found', message: 'Plano não encontrado.' });
      }

      // Se for plano gratuito, ativa sem exigência de pagamento
      if (Number(targetPlan.monthlyPrice) === 0) {
        const updated = await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            planId: targetPlan.id,
            billingStatus: 'ACTIVE',
            blockedReason: null,
            blockedAt: null
          },
          include: { plan: true }
        });
        return reply.send({
          confirmed: true,
          message: 'Plano gratuito ativado com sucesso.',
          tenant: updated,
          plan: targetPlan
        });
      }

      // Para planos pagos, valida a compensação bancária real no Asaas
      if (!AsaasService.isConfigured()) {
        return reply.send({
          confirmed: false,
          message: 'Gateway de pagamento indisponível no momento. Por favor, entre em contato com o suporte.'
        });
      }

      let isPaid = false;

      // 1. Tenta validar pelo ID da cobrança específica
      if (body.paymentId) {
        isPaid = await AsaasService.checkPaymentConfirmed(body.paymentId);
      }

      // 2. Se não confirmado ainda, tenta validar pelas parcelas da assinatura
      if (!isPaid) {
        const subId = body.subscriptionId || tenant.asaasSubscriptionId;
        if (subId) {
          isPaid = await AsaasService.checkSubscriptionPaymentConfirmed(subId);
        }
      }

      if (!isPaid) {
        return reply.send({
          confirmed: false,
          message: 'Pagamento PIX ainda não identificado pela compensação bancária. Se você já realizou a transferência, aguarde cerca de 30 segundos e clique novamente para verificar.'
        });
      }

      // Pagamento COMPROVADO no gateway: ativação do plano no banco de dados
      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          planId: targetPlan.id,
          billingStatus: 'ACTIVE',
          blockedReason: null,
          blockedAt: null,
          ...(body.subscriptionId ? { asaasSubscriptionId: body.subscriptionId } : {})
        },
        include: { plan: true }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId: tenant.id,
          action: 'TENANT_PLAN_UPGRADE_CONFIRMED',
          entityType: 'Tenant',
          entityId: tenant.id,
          details: {
            planCode: targetPlan.code,
            planName: targetPlan.name,
            monthlyPrice: targetPlan.monthlyPrice,
            paymentId: body.paymentId,
            subscriptionId: body.subscriptionId || tenant.asaasSubscriptionId
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        confirmed: true,
        message: `Pagamento confirmado com sucesso! O plano ${targetPlan.name} já está ativo.`,
        tenant: updated,
        plan: targetPlan
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

      const body = (request.body as { phoneNumber?: string } | undefined) || {};
      const result = await EvolutionService.connectInstance(tenant.id, tenant.slug, body.phoneNumber);
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

    // POST /tenants/me/whatsapp/test-message - Envia mensagem de teste oficial para validar o WhatsApp
    tenantScope.post('/me/whatsapp/test-message', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito ao salão.' });
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: request.user.tenantId }
      });
      const config = await prisma.whatsappConfig.findUnique({
        where: { tenantId: request.user.tenantId }
      });

      if (!config || !config.isConnected) {
        return reply.status(400).send({
          error: 'WhatsApp desconectado',
          message: 'Conecte o WhatsApp do seu salão antes de enviar mensagens de teste.'
        });
      }

      const body = (request.body as { targetPhone?: string } | undefined) || {};
      const targetPhone = body.targetPhone || config.phoneNumber;

      if (!targetPhone) {
        return reply.status(400).send({
          error: 'Número não informado',
          message: 'Nenhum número de telefone disponível para envio do teste.'
        });
      }

      const testMsg = `Ola! Esta e uma mensagem de teste oficial do MarqueSuaHora enviada atraves do WhatsApp do estabelecimento ${tenant?.name || 'seu salao'}.\n\nA sua Atendente IA e os lembretes anti-falta estao ativos e prontos para atender seus clientes com maxima agilidade!`;

      const sendResult = await EvolutionService.sendTextMessage(
        request.user.tenantId,
        targetPhone,
        testMsg
      );

      if (!sendResult.success) {
        return reply.status(500).send({
          error: 'Falha no envio',
          message: 'Nao foi possivel enviar a mensagem de teste. Verifique se o aparelho esta conectado e com internet ativa.'
        });
      }

      return reply.send({
        success: true,
        message: 'Mensagem de teste enviada com sucesso para ' + targetPhone,
        targetPhone
      });
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

