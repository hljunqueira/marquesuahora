import { FastifyPluginAsync } from 'fastify';
import { createPlanSchema, updatePlanSchema } from '@marquesuahora/shared';
import { prisma } from '../../lib/prisma';
import { PlansService } from './plans.service';
import { Role } from '@prisma/client';

export const plansRoutes: FastifyPluginAsync = async (app) => {
  // Listagem pública de planos ativos (para Landing Page, Onboarding e Upgrade)
  app.get('/', async (_request, reply) => {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { monthlyPrice: 'asc' }
    });

    return reply.send(plans);
  });

  // Rotas restritas para o Super Admin
  app.register(async (adminScope) => {
    adminScope.addHook('preHandler', app.requireRole([Role.SUPER_ADMIN]));

    // Listagem completa de planos para gestão (com contagem de assinantes)
    adminScope.get('/admin', async (_request, reply) => {
      const plans = await prisma.plan.findMany({
        include: {
          _count: {
            select: { tenants: true }
          }
        },
        orderBy: { monthlyPrice: 'asc' }
      });
      return reply.send(plans);
    });

    // Criação de plano customizado (ZERO DEFAULTS — tudo vem do payload validado)
    adminScope.post('/admin', async (request, reply) => {
      const data = createPlanSchema.parse(request.body);

      const plan = await prisma.plan.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          monthlyPrice: data.monthlyPrice,
          maxProfessionals: data.maxProfessionals,
          isUnlimitedBookings: data.isUnlimitedBookings,
          monthlyFreeBookings: data.monthlyFreeBookings,
          extraBookingFee: data.extraBookingFee,
          hasAiAssistant: data.hasAiAssistant,
          hasAutoWhatsapp: data.hasAutoWhatsapp ?? false,
          hasCourses: data.hasCourses ?? false,
          hasSupport: data.hasSupport ?? true,
          hasAnamnesis: data.hasAnamnesis,
          hasCommissions: data.hasCommissions,
          hasGoogleCalendar: data.hasGoogleCalendar,
          features: data.features,
          active: data.active
        }
      });

      // Registro de Auditoria
      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          action: 'PLAN_CREATE',
          entityType: 'Plan',
          entityId: plan.id,
          details: { name: plan.name, code: plan.code, price: plan.monthlyPrice },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.status(201).send(plan);
    });

    // Atualização de parâmetros do plano
    adminScope.put('/admin/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = updatePlanSchema.parse({ ...request.body as object, id });

      const plan = await prisma.plan.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          monthlyPrice: data.monthlyPrice,
          maxProfessionals: data.maxProfessionals,
          isUnlimitedBookings: data.isUnlimitedBookings,
          monthlyFreeBookings: data.monthlyFreeBookings,
          extraBookingFee: data.extraBookingFee,
          hasAiAssistant: data.hasAiAssistant,
          hasAutoWhatsapp: data.hasAutoWhatsapp,
          hasCourses: data.hasCourses,
          hasSupport: data.hasSupport,
          hasAnamnesis: data.hasAnamnesis,
          hasCommissions: data.hasCommissions,
          hasGoogleCalendar: data.hasGoogleCalendar,
          features: data.features,
          active: data.active
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          action: 'PLAN_UPDATE',
          entityType: 'Plan',
          entityId: plan.id,
          details: { name: plan.name, price: plan.monthlyPrice },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send(plan);
    });

    // Ativar / Inativar plano para novas contratações
    adminScope.patch('/admin/:id/toggle-active', async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.plan.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Plano não encontrado.'
        });
      }

      const plan = await prisma.plan.update({
        where: { id },
        data: { active: !existing.active }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          action: 'PLAN_TOGGLE_ACTIVE',
          entityType: 'Plan',
          entityId: plan.id,
          details: { active: plan.active },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send(plan);
    });

    // Exclusão de plano (se não houver tenants vinculados)
    adminScope.delete('/admin/:id', async (request, reply) => {
      const { id } = request.params as { id: string };

      const tenantsCount = await prisma.tenant.count({
        where: { planId: id }
      });

      if (tenantsCount > 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Não é possível excluir este plano pois existem ${tenantsCount} estabelecimentos vinculados a ele. Inative-o para impedir novas contratações.`
        });
      }

      await prisma.plan.delete({
        where: { id }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          action: 'PLAN_DELETE',
          entityType: 'Plan',
          entityId: id,
          details: { id },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({ success: true, message: 'Plano excluído com sucesso.' });
    });
  });
};
