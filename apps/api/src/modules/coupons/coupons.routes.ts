import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { EvolutionService } from '../automation/evolution.service';
import { WhatsappTemplateEngine } from '../notifications/template-engine';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

export const couponsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /coupons - Listar cupons do estabelecimento
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const coupons = await prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send(coupons);
  });

  // POST /coupons - Criar cupom de desconto
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const createSchema = z.object({
      code: z
        .string()
        .min(2, 'Código deve ter no mínimo 2 caracteres.')
        .max(30)
        .transform((v) => v.trim().toUpperCase().replace(/\s+/g, '')),
      description: z.string().max(255).optional().nullable(),
      discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
      discountValue: z.coerce.number().positive('Valor do desconto deve ser maior que zero.'),
      minOrderValue: z.coerce.number().positive().optional().nullable(),
      maxUses: z.coerce.number().int().positive().optional().nullable(),
      validUntil: z.string().optional().nullable(),
      isActive: z.boolean().default(true)
    });

    const body = createSchema.parse(request.body);

    const existing = await prisma.coupon.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: body.code
        }
      }
    });

    if (existing) {
      return reply.status(409).send({
        error: 'Conflito',
        message: `Já existe um cupom com o código "${body.code}". Escolha outro nome.`
      });
    }

    const coupon = await prisma.coupon.create({
      data: {
        tenantId,
        code: body.code,
        description: body.description || null,
        discountType: body.discountType,
        discountValue: body.discountValue,
        minOrderValue: body.minOrderValue || null,
        maxUses: body.maxUses || null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        isActive: body.isActive
      }
    });

    return reply.status(201).send(coupon);
  });

  // PUT /coupons/:id - Atualizar cupom
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const updateSchema = z.object({
      description: z.string().max(255).optional().nullable(),
      discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
      discountValue: z.coerce.number().positive().optional(),
      minOrderValue: z.coerce.number().positive().optional().nullable(),
      maxUses: z.coerce.number().int().positive().optional().nullable(),
      validUntil: z.string().optional().nullable(),
      isActive: z.boolean().optional()
    });

    const body = updateSchema.parse(request.body);

    const existing = await prisma.coupon.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Cupom não encontrado.' });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.discountType !== undefined ? { discountType: body.discountType } : {}),
        ...(body.discountValue !== undefined ? { discountValue: body.discountValue } : {}),
        ...(body.minOrderValue !== undefined ? { minOrderValue: body.minOrderValue } : {}),
        ...(body.maxUses !== undefined ? { maxUses: body.maxUses } : {}),
        ...(body.validUntil !== undefined ? { validUntil: body.validUntil ? new Date(body.validUntil) : null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {})
      }
    });

    return reply.send(updated);
  });

  // DELETE /coupons/:id - Deletar cupom
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const existing = await prisma.coupon.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Cupom não encontrado.' });
    }

    await prisma.coupon.delete({ where: { id } });

    return reply.send({ success: true, message: 'Cupom excluído com sucesso.' });
  });

  // POST /coupons/:id/broadcast - Disparar cupom para lista selecionada no WhatsApp com Anti-Ban
  app.post('/:id/broadcast', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const broadcastSchema = z.object({
      audienceFilter: z.enum(['ALL', 'INACTIVE_30D', 'BIRTHDAY_MONTH', 'CUSTOM']).default('ALL'),
      clientIds: z.array(z.string().uuid()).optional().default([])
    });

    const { audienceFilter, clientIds } = broadcastSchema.parse(request.body || {});

    const [coupon, tenant] = await Promise.all([
      prisma.coupon.findFirst({ where: { id, tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId } })
    ]);

    if (!coupon) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Cupom não encontrado.' });
    }
    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Tenant não encontrado.' });
    }

    // 1. Localiza a audiência de clientes elegíveis
    let targetClients: { id: string; name: string; phone: string; email?: string | null }[] = [];

    if (audienceFilter === 'CUSTOM' && clientIds.length > 0) {
      targetClients = await prisma.client.findMany({
        where: {
          tenantId,
          id: { in: clientIds },
          OR: [{ phone: { not: '' } }, { email: { not: '' } }]
        },
        select: { id: true, name: true, phone: true, email: true }
      });
    } else if (audienceFilter === 'INACTIVE_30D') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clientes sem agendamentos nos últimos 30 dias
      const activeRecentClientIds = (
        await prisma.schedule.findMany({
          where: {
            tenantId,
            date: { gte: thirtyDaysAgo }
          },
          select: { clientId: true },
          distinct: ['clientId']
        })
      ).map((s) => s.clientId);

      targetClients = await prisma.client.findMany({
        where: {
          tenantId,
          id: { notIn: activeRecentClientIds },
          OR: [{ phone: { not: '' } }, { email: { not: '' } }]
        },
        select: { id: true, name: true, phone: true, email: true }
      });
    } else if (audienceFilter === 'BIRTHDAY_MONTH') {
      const currentMonth = new Date().getMonth() + 1;
      const allWithContact = await prisma.client.findMany({
        where: { tenantId, OR: [{ phone: { not: '' } }, { email: { not: '' } }] },
        select: { id: true, name: true, phone: true, email: true, birthday: true }
      });

      targetClients = allWithContact
        .filter((c) => {
          if (!c.birthday) return false;
          return new Date(c.birthday).getMonth() + 1 === currentMonth;
        })
        .map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }));
    } else {
      // 'ALL'
      targetClients = await prisma.client.findMany({
        where: { tenantId, OR: [{ phone: { not: '' } }, { email: { not: '' } }] },
        select: { id: true, name: true, phone: true, email: true }
      });
    }

    if (targetClients.length === 0) {
      return reply.status(400).send({
        error: 'Audiência Vazia',
        message: 'Nenhum cliente localizado para o filtro selecionado com telefone cadastrado.'
      });
    }

    // 2. Busca regra ou template padrão para COUPON_CAMPAIGN
    const [ruleRecord, metadata] = await Promise.all([
      prisma.tenantNotificationRule.findUnique({
        where: { tenantId_trigger: { tenantId, trigger: 'COUPON_CAMPAIGN' } }
      }),
      Promise.resolve(WhatsappTemplateEngine.getMetadata('COUPON_CAMPAIGN'))
    ]);

    const templateText = ruleRecord?.customWhatsappText || metadata.defaultWhatsappText;
    const discountFormatted =
      coupon.discountType === 'PERCENTAGE'
        ? `${coupon.discountValue}% de desconto`
        : `R$ ${Number(coupon.discountValue).toFixed(2)} de desconto`;

    const validUntilFormatted = coupon.validUntil
      ? coupon.validUntil.toLocaleDateString('pt-BR')
      : 'por tempo limitado';

    const bookingUrl = `https://marquesuahora.com.br/${tenant.slug}`;

    // 3. Execução do Disparo em Background com Cadência Anti-Ban (8 a 10s entre envios)
    // Responde ao cliente imediatamente para não travar a requisição HTTP
    setImmediate(async () => {
      let sentCount = 0;
      let failCount = 0;

      for (let i = 0; i < targetClients.length; i++) {
        const client = targetClients[i];
        const firstName = client.name.trim().split(' ')[0] || 'Cliente';

        const text = WhatsappTemplateEngine.render(templateText, {
          client_first_name: firstName,
          client_name: client.name,
          coupon_code: coupon.code,
          coupon_discount: discountFormatted,
          coupon_valid_until: validUntilFormatted,
          business_name: tenant.name,
          booking_url: bookingUrl
        });

        // 1. Envio WhatsApp
        if (ruleRecord?.whatsappEnabled !== false && client.phone) {
          try {
            const res = await EvolutionService.sendTextMessage(tenantId, client.phone, text);
            await prisma.notificationLog.create({
              data: {
                tenantId,
                trigger: 'COUPON_CAMPAIGN',
                channel: 'WHATSAPP',
                recipient: client.phone,
                status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
                sentAt: new Date()
              }
            });
            sentCount++;
          } catch (err: any) {
            failCount++;
            await prisma.notificationLog.create({
              data: {
                tenantId,
                trigger: 'COUPON_CAMPAIGN',
                channel: 'WHATSAPP',
                recipient: client.phone,
                status: 'FAILED',
                errorMessage: err.message,
                sentAt: new Date()
              }
            });
          }
        }

        // 2. Envio E-mail via Resend
        if (ruleRecord?.emailEnabled !== false && client.email) {
          const emailSubject = WhatsappTemplateEngine.render(
            ruleRecord?.customEmailSubject || metadata.defaultEmailSubject,
            {
              client_first_name: firstName,
              client_name: client.name,
              coupon_code: coupon.code,
              coupon_discount: discountFormatted,
              coupon_valid_until: validUntilFormatted,
              business_name: tenant.name,
              booking_url: bookingUrl
            }
          );
          const emailBody = WhatsappTemplateEngine.render(
            ruleRecord?.customEmailBody || metadata.defaultEmailBody,
            {
              client_first_name: firstName,
              client_name: client.name,
              coupon_code: coupon.code,
              coupon_discount: discountFormatted,
              coupon_valid_until: validUntilFormatted,
              business_name: tenant.name,
              booking_url: bookingUrl
            }
          );

          try {
            const emailRes = await EmailService.send({
              to: client.email,
              subject: emailSubject,
              html: emailBody,
              tenantName: tenant.name
            });
            await prisma.notificationLog.create({
              data: {
                tenantId,
                trigger: 'COUPON_CAMPAIGN',
                channel: 'EMAIL',
                recipient: client.email,
                status: emailRes.simulated ? 'SIMULATED' : emailRes.success ? 'SENT' : 'FAILED',
                errorMessage: emailRes.error,
                sentAt: new Date()
              }
            });
          } catch (emailErr: any) {
            await prisma.notificationLog.create({
              data: {
                tenantId,
                trigger: 'COUPON_CAMPAIGN',
                channel: 'EMAIL',
                recipient: client.email,
                status: 'FAILED',
                errorMessage: emailErr.message,
                sentAt: new Date()
              }
            });
          }
        }

        // Delay anti-ban entre mensagens se ainda houver próximas clientes
        if (i < targetClients.length - 1) {
          const antiBanDelayMs = Math.floor(Math.random() * 2000) + 8000; // 8.000ms a 10.000ms
          await new Promise((resolve) => setTimeout(resolve, antiBanDelayMs));
        }
      }

      // Notificação interna ao finalizar o lote
      await NotificationsService.create({
        tenantId,
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.LOW,
        title: 'Campanha de Cupom Concluída',
        message: `O disparo do cupom ${coupon.code} foi finalizado. ${sentCount} mensagens enviadas com sucesso (${failCount} falhas).`,
        link: '/dashboard/configuracoes'
      });
    });

    return reply.send({
      success: true,
      targetedCount: targetClients.length,
      message: `Disparo da campanha iniciado para ${targetClients.length} cliente(s) com intervalo de segurança anti-ban.`
    });
  });
};
