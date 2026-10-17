import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AvailabilityService } from './availability.service';
import { BookingService } from './booking.service';
import { ScheduleStatus, BookingSource, NotificationCategory, NotificationPriority } from '@prisma/client';
import { whatsappQueue } from '../automation/queues';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationDispatcherService } from '../notifications/dispatcher.service';

export const schedulesRoutes: FastifyPluginAsync = async (app) => {
  // =========================================================================
  // ROTAS PÚBLICAS (Cálculo de slots para a Vitrine)
  // =========================================================================

  // GET /schedules/availability
  app.get('/availability', async (request, reply) => {
    const querySchema = z.object({
      tenantId: z.string().uuid().optional(),
      slug: z.string().optional(),
      serviceIds: z.string().transform((v) => v.split(',').filter(Boolean)),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.'),
      professionalId: z.string().uuid().optional()
    });

    const query = querySchema.parse(request.query);

    let tenantId = query.tenantId;
    if (!tenantId && query.slug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: query.slug.toLowerCase() },
        select: { id: true }
      });
      if (!tenant) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
      }
      tenantId = tenant.id;
    }

    if (!tenantId) {
      return reply.status(400).send({ error: 'Inválido', message: 'Informe o slug ou tenantId.' });
    }

    const availability = await AvailabilityService.getAvailableSlots({
      tenantId,
      serviceIds: query.serviceIds,
      dateStr: query.date,
      professionalId: query.professionalId
    });

    return reply.send(availability);
  });

  // GET /schedules/week-strip
  app.get('/week-strip', async (request, reply) => {
    const querySchema = z.object({
      tenantId: z.string().uuid().optional(),
      slug: z.string().optional(),
      serviceIds: z.string().transform((v) => v.split(',').filter(Boolean)),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    });

    const query = querySchema.parse(request.query);

    let tenantId = query.tenantId;
    if (!tenantId && query.slug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: query.slug.toLowerCase() },
        select: { id: true }
      });
      if (!tenant) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
      }
      tenantId = tenant.id;
    }

    if (!tenantId) {
      return reply.status(400).send({ error: 'Inválido', message: 'Informe o slug ou tenantId.' });
    }

    const baseDate = query.startDate ? new Date(`${query.startDate}T00:00:00`) : new Date();
    const daysResults = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      const dayAvail = await AvailabilityService.getAvailableSlots({
        tenantId,
        serviceIds: query.serviceIds,
        dateStr
      });

      daysResults.push({
        date: dateStr,
        dayOfWeek: d.getDay(),
        isOpen: dayAvail.isOpen,
        hasAvailableSlots: dayAvail.totalSlots > 0,
        totalSlots: dayAvail.totalSlots
      });
    }

    return reply.send(daysResults);
  });

  // =========================================================================
  // ROTAS AUTENTICADAS (Painel Administrativo da Dona do Negócio)
  // =========================================================================

  app.register(async (authScope) => {
    authScope.addHook('preHandler', app.authenticate);

    // GET /schedules/dashboard-summary - KPIs Reais do Dashboard
    authScope.get('/dashboard-summary', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const todayDate = new Date(`${todayStr}T00:00:00`);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [
        todayBookings,
        monthSchedules,
        activeClientsCount,
        nextAppointments
      ] = await Promise.all([
        // Agendamentos de hoje (excluindo cancelados)
        prisma.schedule.count({
          where: {
            tenantId,
            date: todayDate,
            status: { not: ScheduleStatus.CANCELLED }
          }
        }),

        // Agendamentos do mês corrente para cálculo de receita e No-Show
        prisma.schedule.findMany({
          where: {
            tenantId,
            date: { gte: startOfMonth, lte: endOfMonth }
          },
          select: {
            totalPrice: true,
            status: true
          }
        }),

        // Clientes únicos atendidos nos últimos 60 dias
        prisma.client.count({
          where: { tenantId }
        }),

        // Próximos agendamentos a partir de hoje
        prisma.schedule.findMany({
          where: {
            tenantId,
            date: { gte: todayDate },
            status: { in: [ScheduleStatus.CONFIRMED, ScheduleStatus.PENDING, ScheduleStatus.IN_SERVICE] }
          },
          take: 6,
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          include: {
            client: { select: { id: true, name: true, phone: true } },
            professional: { select: { id: true, name: true, color: true } },
            service: { select: { id: true, name: true, durationMinutes: true, price: true } },
            items: { include: { service: true } }
          }
        })
      ]);

      // Faturamento do mês (completados ou confirmados)
      const monthRevenue = monthSchedules
        .filter((s) => s.status === ScheduleStatus.COMPLETED || s.status === ScheduleStatus.CONFIRMED || s.status === ScheduleStatus.IN_SERVICE)
        .reduce((sum, s) => sum + Number(s.totalPrice), 0);

      // Taxa de No-Show
      const completedCount = monthSchedules.filter((s) => s.status === ScheduleStatus.COMPLETED).length;
      const noShowCount = monthSchedules.filter((s) => s.status === ScheduleStatus.NO_SHOW).length;
      const totalAttendedOrNoShow = completedCount + noShowCount;
      const noShowRatePercent = totalAttendedOrNoShow > 0
        ? Math.round((noShowCount / totalAttendedOrNoShow) * 100)
        : 0;

      return reply.send({
        todayBookings,
        monthRevenue,
        noShowRatePercent,
        activeClientsCount,
        nextAppointments: nextAppointments.map((a) => ({
          id: a.id,
          date: a.date.toISOString().slice(0, 10),
          time: a.startTime,
          endTime: a.endTime,
          client: a.client.name,
          clientPhone: a.client.phone,
          service: a.service.name,
          additionalServices: a.items.length > 1 ? a.items.slice(1).map((i) => i.service.name) : [],
          professional: a.professional.name,
          professionalColor: a.professional.color,
          totalPrice: Number(a.totalPrice),
          totalDurationMinutes: a.totalDurationMinutes,
          status: a.status
        }))
      });
    });

    // GET /schedules - Listagem com filtros e paginação
    authScope.get('/', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const querySchema = z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        professionalId: z.string().uuid().optional(),
        status: z.nativeEnum(ScheduleStatus).optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20)
      });

      const query = querySchema.parse(request.query);
      const skip = (query.page - 1) * query.limit;

      const whereClause: any = {
        tenantId,
        ...(query.professionalId ? { professionalId: query.professionalId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.startDate || query.endDate
          ? {
              date: {
                ...(query.startDate ? { gte: new Date(`${query.startDate}T00:00:00`) } : {}),
                ...(query.endDate ? { lte: new Date(`${query.endDate}T23:59:59`) } : {})
              }
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { client: { name: { contains: query.search, mode: 'insensitive' } } },
                { client: { phone: { contains: query.search.replace(/\D/g, '') } } }
              ]
            }
          : {})
      };

      const [total, data] = await Promise.all([
        prisma.schedule.count({ where: whereClause }),
        prisma.schedule.findMany({
          where: whereClause,
          skip,
          take: query.limit,
          orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
          include: {
            client: true,
            professional: true,
            service: true,
            items: { include: { service: true } }
          }
        })
      ]);

      return reply.send({
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        data
      });
    });

    // GET /schedules/calendar - Listagem de agendamentos no período para o Grid Semanal
    authScope.get('/calendar', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const { startDate, endDate, professionalId } = request.query as {
        startDate: string;
        endDate: string;
        professionalId?: string;
      };

      const schedules = await prisma.schedule.findMany({
        where: {
          tenantId,
          date: {
            gte: new Date(`${startDate || new Date().toISOString().slice(0, 10)}T00:00:00`),
            lte: new Date(`${endDate || new Date().toISOString().slice(0, 10)}T23:59:59`)
          },
          ...(professionalId ? { professionalId } : {})
        },
        include: {
          client: true,
          professional: true,
          service: true,
          items: { include: { service: true } }
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      });

      return reply.send(schedules);
    });

    // POST /schedules - Criar agendamento manual (Recepção / Balcão)
    authScope.post('/', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const createSchema = z.object({
        serviceIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um serviço.'),
        professionalId: z.string().uuid().optional(),
        dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        clientName: z.string().min(2, 'Nome do cliente é obrigatório.'),
        clientPhone: z.string().min(10, 'Telefone do cliente é obrigatório.'),
        clientEmail: z.string().email().optional().nullable(),
        notes: z.string().max(500).optional().nullable()
      });

      const body = createSchema.parse(request.body);

      const schedule = await BookingService.createBooking({
        tenantId,
        serviceIds: body.serviceIds,
        professionalId: body.professionalId,
        dateStr: body.dateStr,
        startTime: body.startTime,
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        clientEmail: body.clientEmail || undefined,
        notes: body.notes || undefined,
        source: BookingSource.MANUAL_RECEPTION
      });

      // Dispara confirmação no WhatsApp para a cliente se o WhatsApp do salão estiver conectado
      try {
        await whatsappQueue.add('send-immediate-confirmation', {
          scheduleId: schedule.id,
          type: 'IMMEDIATE_CONFIRMATION'
        });
      } catch (err: any) {
        console.warn('[BullMQ] Aviso ao agendar envio do WhatsApp para agendamento manual:', err.message);
      }

      return reply.status(201).send(schedule);
    });

    // POST /schedules/:id/status - Alterar status do agendamento
    authScope.post('/:id/status', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const { id } = request.params as { id: string };
      const statusSchema = z.object({
        status: z.nativeEnum(ScheduleStatus)
      });

      const { status: newStatus } = statusSchema.parse(request.body);

      const existing = await prisma.schedule.findFirst({
        where: { id, tenantId },
        include: { client: true }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
      }

      // Validação das transições permitidas da Seção 6.3:
      // Status finais não voltam
      const finalStatuses: ScheduleStatus[] = [ScheduleStatus.COMPLETED, ScheduleStatus.CANCELLED, ScheduleStatus.NO_SHOW];
      if (finalStatuses.includes(existing.status) && existing.status !== newStatus) {
        return reply.status(400).send({
          error: 'Transição Inválida',
          message: `Agendamentos no status "${existing.status}" não podem ser alterados.`
        });
      }

      // Se virar NO_SHOW, incrementa contador de faltas do cliente
      if (newStatus === ScheduleStatus.NO_SHOW && existing.status !== ScheduleStatus.NO_SHOW) {
        await prisma.client.update({
          where: { id: existing.clientId },
          data: { noShowCount: { increment: 1 } }
        });
      }

      const updated = await prisma.schedule.update({
        where: { id },
        data: { status: newStatus },
        include: {
          client: true,
          professional: true,
          service: true
        }
      });

      try {
        const clientName = updated.client?.name || 'Cliente';
        const clientFirstName = clientName.trim().split(' ')[0] || clientName;
        const profName = updated.professional?.name || 'Profissional';
        const serviceName = updated.service?.name || 'Serviço';
        const dateFormatted = updated.date.toISOString().slice(0, 10).split('-').reverse().join('/');

        if (newStatus === ScheduleStatus.CANCELLED) {
          await NotificationsService.create({
            tenantId,
            category: NotificationCategory.SCHEDULE,
            priority: NotificationPriority.HIGH,
            title: 'Agendamento Cancelado',
            message: `O agendamento de ${clientName} para às ${updated.startTime} foi cancelado.`,
            link: '/dashboard/agendamentos'
          });

          // Notifica Cliente do Cancelamento
          await NotificationDispatcherService.dispatch({
            tenantId,
            trigger: 'BOOKING_CANCELLED_CLIENT',
            scheduleId: updated.id,
            data: {
              clientName,
              clientFirstName,
              clientPhone: updated.client?.phone,
              clientEmail: updated.client?.email || undefined,
              serviceName,
              professionalName: profName,
              date: dateFormatted,
              time: updated.startTime
            }
          });

          // Notifica Equipe do Cancelamento
          await NotificationDispatcherService.dispatch({
            tenantId,
            trigger: 'BOOKING_CANCELLED_TEAM',
            scheduleId: updated.id,
            data: {
              clientName,
              clientFirstName,
              serviceName,
              professionalName: profName,
              professionalPhone: updated.professional?.phone,
              date: dateFormatted,
              time: updated.startTime
            }
          });
        } else if (newStatus === ScheduleStatus.NO_SHOW) {
          // Notifica Cliente de Falta / No-Show de forma acolhedora
          await NotificationDispatcherService.dispatch({
            tenantId,
            trigger: 'NO_SHOW_CLIENT',
            scheduleId: updated.id,
            data: {
              clientName,
              clientFirstName,
              clientPhone: updated.client?.phone,
              clientEmail: updated.client?.email || undefined,
              serviceName,
              professionalName: profName,
              date: dateFormatted,
              time: updated.startTime
            }
          });
        }
      } catch (e) {
        console.error('Erro ao notificar alteração de status:', e);
      }

      return reply.send(updated);
    });

    // PATCH /schedules/:id - Remarcar ou editar notas
    authScope.patch('/:id', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const { id } = request.params as { id: string };
      const editSchema = z.object({
        dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        professionalId: z.string().uuid().optional(),
        notes: z.string().max(500).optional().nullable()
      });

      const body = editSchema.parse(request.body);

      const existing = await prisma.schedule.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
      }

      const updated = await prisma.schedule.update({
        where: { id },
        data: {
          ...(body.dateStr ? { date: new Date(`${body.dateStr}T00:00:00`) } : {}),
          ...(body.startTime ? { startTime: body.startTime } : {}),
          ...(body.professionalId ? { professionalId: body.professionalId } : {}),
          ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {})
        },
        include: {
          client: true,
          professional: true,
          service: true
        }
      });

      try {
        if (body.dateStr || body.startTime) {
          const dateFormatted = body.dateStr ? body.dateStr.split('-').reverse().join('/') : updated.date.toISOString().slice(0, 10).split('-').reverse().join('/');
          const clientName = updated.client?.name || 'Cliente';
          const clientFirstName = clientName.trim().split(' ')[0] || clientName;

          await NotificationsService.create({
            tenantId,
            category: NotificationCategory.SCHEDULE,
            priority: NotificationPriority.MEDIUM,
            title: 'Agendamento Remarcado',
            message: `O agendamento de ${clientName} foi reagendado${dateFormatted ? ` para ${dateFormatted}` : ''}${body.startTime ? ` às ${body.startTime}` : ''}.`,
            link: '/dashboard/agendamentos'
          });

          // Notifica Cliente sobre o reagendamento via WhatsApp e Email
          await NotificationDispatcherService.dispatch({
            tenantId,
            trigger: 'BOOKING_UPDATED_CLIENT',
            scheduleId: updated.id,
            data: {
              clientName,
              clientFirstName,
              clientPhone: updated.client?.phone,
              clientEmail: updated.client?.email || undefined,
              serviceName: updated.service?.name,
              professionalName: updated.professional?.name,
              date: dateFormatted,
              time: updated.startTime
            }
          });
        }
      } catch (e) {
        console.error('Erro ao notificar reagendamento:', e);
      }

      return reply.send(updated);
    });

    // DELETE /schedules/:id - Excluir agendamento
    authScope.delete('/:id', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const { id } = request.params as { id: string };

      const existing = await prisma.schedule.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
      }

      await prisma.scheduleItem.deleteMany({
        where: { scheduleId: id }
      });

      await prisma.schedule.delete({
        where: { id }
      });

      return reply.send({ success: true, message: 'Agendamento excluído com sucesso.' });
    });
  });
};
