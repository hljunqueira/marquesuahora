import { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { onboardingSchema, updateTenantSettingsSchema } from '@marquesuahora/shared';
import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

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

    // Verifica se documento já está em uso
    const existingDoc = await prisma.tenant.findUnique({
      where: { documentNumber: data.documentNumber }
    });
    if (existingDoc) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Já existe um estabelecimento cadastrado com este CPF/CNPJ.'
      });
    }

    // Seleciona o plano informado ou localiza o primeiro plano ativo
    let planId = data.planId;
    if (!planId) {
      const defaultPlan = await prisma.plan.findFirst({
        where: { active: true },
        orderBy: { monthlyPrice: 'asc' }
      });
      planId = defaultPlan?.id;
    }

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
          documentNumber: data.documentNumber,
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

      // 3. Cadastra os Serviços Selecionados/Customizados pelo Assinante no Onboarding
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

    // Emite Tokens JWT para Login Imediato
    const accessToken = app.jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
        name: result.user.name,
        email: result.user.email
      },
      { expiresIn: '15m' }
    );

    const refreshToken = app.jwt.sign(
      { sub: result.user.id, tokenType: 'refresh' },
      { expiresIn: '7d' }
    );

    reply.setCookie('refreshToken', refreshToken, {
      path: '/auth/refresh',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60
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
        billingStatus: result.tenant.billingStatus
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

    // GET /tenants/me - Dados do estabelecimento do usuário autenticado
    tenantScope.get('/me', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Usuário sem estabelecimento vinculado.' });
      }

      const tenant = await prisma.tenant.findUnique({
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
      });

      if (!tenant) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
      }

      return reply.send(tenant);
    });

    // PUT /tenants/me/settings - Atualização de configurações gerais, temas e cores
    tenantScope.put('/me/settings', async (request, reply) => {
      if (!request.user.tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Apenas administradores da loja podem alterar configurações.' });
      }

      const data = updateTenantSettingsSchema.parse(request.body);

      const updated = await prisma.tenant.update({
        where: { id: request.user.tenantId },
        data: {
          name: data.name,
          description: data.description,
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
          maxNoShowsAllowed: data.maxNoShowsAllowed,
          churnRecoveryEnabled: data.churnRecoveryEnabled,
          churnAlertDays: data.churnAlertDays,
          birthdayMessageEnabled: data.birthdayMessageEnabled,
          birthdayMessageCustom: data.birthdayMessageCustom,
          bufferMinutes: data.bufferMinutes,
          minAdvanceBookingMinutes: data.minAdvanceBookingMinutes,
          maxAdvanceBookingDays: data.maxAdvanceBookingDays
        }
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
  });
};
