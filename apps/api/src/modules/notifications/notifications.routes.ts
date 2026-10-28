import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotificationCategory, NotificationPriority, NotificationTrigger, TenantNotificationRule } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotificationsService } from './notifications.service';
import { WhatsappTemplateEngine, TemplateMetadata } from './template-engine';
import { NotificationDispatcherService } from './dispatcher.service';

const listQuerySchema = z.object({
  category: z.nativeEnum(NotificationCategory).or(z.literal('ALL')).optional(),
  read: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  limit: z.preprocess((val) => (val ? Number(val) : 50), z.number().int().min(1).max(100).default(50)),
  offset: z.preprocess((val) => (val ? Number(val) : 0), z.number().int().min(0).default(0))
});

const markAllReadSchema = z.object({
  category: z.nativeEnum(NotificationCategory).optional()
});

const testNotificationSchema = z.object({
  category: z.nativeEnum(NotificationCategory).default(NotificationCategory.SYSTEM),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.MEDIUM),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional()
});

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /notifications - Listar notificações com filtros
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const query = listQuerySchema.parse(request.query);
    const result = await NotificationsService.list(tenantId, query);
    return reply.send(result);
  });

  // GET /notifications/summary - Contadores de notificações não lidas
  app.get('/summary', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const summary = await NotificationsService.getSummary(tenantId);
    return reply.send(summary);
  });

  // PATCH /notifications/:id/read - Marcar notificação individual como lida
  app.patch('/:id/read', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const updated = await NotificationsService.markAsRead(tenantId, id);

    if (!updated) {
      return reply.status(404).send({ error: 'Notificação não encontrada' });
    }

    return reply.send(updated);
  });

  // POST /notifications/read-all - Marcar todas como lidas
  app.post('/read-all', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const body = markAllReadSchema.parse(request.body || {});
    const result = await NotificationsService.markAllAsRead(tenantId, body.category);

    return reply.send({ success: true, count: result.count });
  });

  // DELETE /notifications/:id - Excluir notificação
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const deleted = await NotificationsService.delete(tenantId, id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Notificação não encontrada' });
    }

    return reply.send({ success: true });
  });

  // DELETE /notifications/read - Limpar todas lidas
  app.delete('/read', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const result = await NotificationsService.deleteAllRead(tenantId);
    return reply.send({ success: true, count: result.count });
  });

  // POST /notifications/test - Criar notificação de teste
  app.post('/test', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const body = testNotificationSchema.parse(request.body || {});
    const notification = await NotificationsService.create({
      tenantId,
      userId: request.user.sub,
      category: body.category,
      priority: body.priority,
      title: body.title,
      message: body.message,
      link: body.link
    });

    return reply.status(201).send(notification);
  });

  // GET /notifications/rules - Obter regras de notificação do tenant com templates oficiais
  app.get('/rules', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const savedRules = await prisma.tenantNotificationRule.findMany({
      where: { tenantId }
    });

    const ruleMap = new Map<NotificationTrigger, TenantNotificationRule>(
      savedRules.map((r: TenantNotificationRule) => [r.trigger, r])
    );
    const allTemplates = WhatsappTemplateEngine.getAllTemplates();

    const rules = allTemplates.map((tpl: TemplateMetadata) => {
      const saved = ruleMap.get(tpl.trigger);
      return {
        trigger: tpl.trigger,
        category: tpl.category,
        recipientType: tpl.recipientType,
        title: tpl.title,
        description: tpl.description,
        variables: tpl.variables,
        emailEnabled: saved ? saved.emailEnabled : true,
        whatsappEnabled: saved ? saved.whatsappEnabled : true,
        notifyProfessional: saved ? saved.notifyProfessional : true,
        notifyOwner: saved ? saved.notifyOwner : true,
        whatsappText: saved?.customWhatsappText || tpl.defaultWhatsappText,
        emailSubject: saved?.customEmailSubject || tpl.defaultEmailSubject,
        emailBody: saved?.customEmailBody || tpl.defaultEmailBody,
        isCustomized: !!saved?.customWhatsappText || !!saved?.customEmailSubject || !!saved?.customEmailBody
      };
    });

    return reply.send({ rules });
  });

  // PUT /notifications/rules/:trigger - Atualizar regra de notificação e texto personalizado
  app.put('/rules/:trigger', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { trigger } = request.params as { trigger: NotificationTrigger };
    const metadata = WhatsappTemplateEngine.getMetadata(trigger);
    if (!metadata) {
      return reply.status(400).send({ error: 'Trigger inválido' });
    }

    const bodySchema = z.object({
      emailEnabled: z.boolean().optional(),
      whatsappEnabled: z.boolean().optional(),
      notifyProfessional: z.boolean().optional(),
      notifyOwner: z.boolean().optional(),
      customWhatsappText: z.string().max(3000).nullable().optional(),
      customEmailSubject: z.string().max(200).nullable().optional(),
      customEmailBody: z.string().max(10000).nullable().optional()
    });

    const body = bodySchema.parse(request.body);

    const updated = await prisma.tenantNotificationRule.upsert({
      where: { tenantId_trigger: { tenantId, trigger } },
      create: {
        tenantId,
        trigger,
        emailEnabled: body.emailEnabled ?? true,
        whatsappEnabled: body.whatsappEnabled ?? true,
        notifyProfessional: body.notifyProfessional ?? true,
        notifyOwner: body.notifyOwner ?? true,
        customWhatsappText: body.customWhatsappText !== undefined ? body.customWhatsappText : null,
        customEmailSubject: body.customEmailSubject !== undefined ? body.customEmailSubject : null,
        customEmailBody: body.customEmailBody !== undefined ? body.customEmailBody : null
      },
      update: {
        ...(body.emailEnabled !== undefined ? { emailEnabled: body.emailEnabled } : {}),
        ...(body.whatsappEnabled !== undefined ? { whatsappEnabled: body.whatsappEnabled } : {}),
        ...(body.notifyProfessional !== undefined ? { notifyProfessional: body.notifyProfessional } : {}),
        ...(body.notifyOwner !== undefined ? { notifyOwner: body.notifyOwner } : {}),
        ...(body.customWhatsappText !== undefined ? { customWhatsappText: body.customWhatsappText } : {}),
        ...(body.customEmailSubject !== undefined ? { customEmailSubject: body.customEmailSubject } : {}),
        ...(body.customEmailBody !== undefined ? { customEmailBody: body.customEmailBody } : {})
      }
    });

    return reply.send({ success: true, rule: updated });
  });

  // POST /notifications/rules/:trigger/reset - Restaurar texto padrão oficial
  app.post('/rules/:trigger/reset', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { trigger } = request.params as { trigger: NotificationTrigger };
    const metadata = WhatsappTemplateEngine.getMetadata(trigger);
    if (!metadata) {
      return reply.status(400).send({ error: 'Trigger inválido' });
    }

    await prisma.tenantNotificationRule.upsert({
      where: { tenantId_trigger: { tenantId, trigger } },
      create: {
        tenantId,
        trigger,
        customWhatsappText: null,
        customEmailSubject: null,
        customEmailBody: null
      },
      update: {
        customWhatsappText: null,
        customEmailSubject: null,
        customEmailBody: null
      }
    });

    return reply.send({
      success: true,
      defaultWhatsappText: metadata.defaultWhatsappText,
      defaultEmailSubject: metadata.defaultEmailSubject,
      defaultEmailBody: metadata.defaultEmailBody
    });
  });

  const renderMessageQuerySchema = z.object({
    trigger: z.nativeEnum(NotificationTrigger),
    scheduleId: z.string().uuid().optional(),
    clientName: z.string().optional(),
    clientPhone: z.string().optional(),
    serviceName: z.string().optional(),
    professionalName: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    price: z.string().optional()
  });

  // GET /notifications/render-message - Renderizar mensagem oficial/personalizada para preview ou disparo manual
  app.get('/render-message', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const query = renderMessageQuerySchema.parse(request.query);
    let scheduleData: Record<string, any> = {};

    if (query.scheduleId) {
      const schedule = await prisma.schedule.findFirst({
        where: { id: query.scheduleId, tenantId },
        include: {
          client: true,
          professional: true,
          service: true,
          items: { include: { service: true } }
        }
      });

      if (!schedule) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
      }

      const dateFormatted = schedule.date.toISOString().slice(0, 10).split('-').reverse().join('/');
      const serviceNames = schedule.items && schedule.items.length > 0
        ? schedule.items.map((it: any) => it.service?.name).filter(Boolean).join(', ')
        : schedule.service?.name;

      scheduleData = {
        clientName: schedule.client?.name,
        clientFirstName: schedule.client?.name?.trim().split(' ')[0],
        clientPhone: schedule.client?.phone,
        clientEmail: schedule.client?.email || undefined,
        serviceName: serviceNames,
        professionalName: schedule.professional?.name,
        date: dateFormatted,
        time: schedule.startTime,
        duration: `${schedule.totalDurationMinutes} min`,
        price: Number(schedule.totalPrice || schedule.service?.price || 0).toFixed(2),
        depositAmount: schedule.depositAmount ? Number(schedule.depositAmount).toFixed(2) : undefined
      };
    }

    const mergedData = {
      ...scheduleData,
      ...(query.clientName ? { clientName: query.clientName, clientFirstName: query.clientName.trim().split(' ')[0] } : {}),
      ...(query.clientPhone ? { clientPhone: query.clientPhone } : {}),
      ...(query.serviceName ? { serviceName: query.serviceName } : {}),
      ...(query.professionalName ? { professionalName: query.professionalName } : {}),
      ...(query.date ? { date: query.date } : {}),
      ...(query.time ? { time: query.time } : {}),
      ...(query.price ? { price: query.price } : {})
    };

    try {
      const prepared = await NotificationDispatcherService.prepareNotification({
        tenantId,
        trigger: query.trigger,
        scheduleId: query.scheduleId,
        data: mergedData
      });

      return reply.send({
        success: true,
        trigger: prepared.metadata.trigger,
        title: prepared.metadata.title,
        whatsappText: prepared.whatsappText,
        emailSubject: prepared.emailSubject,
        emailBody: prepared.emailBody,
        phone: prepared.clientPhone,
        waLink: prepared.waLink,
        whatsappEnabled: prepared.whatsappEnabled,
        emailEnabled: prepared.emailEnabled,
        isCustomized: prepared.isCustomized
      });
    } catch (err: any) {
      return reply.status(400).send({ error: 'Erro ao renderizar mensagem', message: err.message });
    }
  });
};
