import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AvailabilityService } from './availability.service';
import { BookingService } from './booking.service';
import {
  ScheduleStatus,
  BookingSource,
  NotificationCategory,
  NotificationPriority,
  TransactionType,
  PaymentMethod,
  CreditAccountStatus
} from '@prisma/client';
import { whatsappQueue } from '../automation/queues';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationDispatcherService } from '../notifications/dispatcher.service';
import { parseTimeToMinutes, formatMinutesToTime } from '@marquesuahora/shared';
import { getBrazilTodayYMD, parseYMDToSafeUtcDate } from '../../utils/date-utils';

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

    let tenantId = query.tenantId || (request.user as any)?.tenantId;
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

    const baseDateStr = query.startDate || getBrazilTodayYMD();
    const { targetDate: baseDate } = parseYMDToSafeUtcDate(baseDateStr);
    const daysResults = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setUTCDate(baseDate.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getUTCDay();

      const dayAvail = await AvailabilityService.getAvailableSlots({
        tenantId,
        serviceIds: query.serviceIds,
        dateStr
      });

      daysResults.push({
        date: dateStr,
        dayOfWeek,
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

      const todayStr = getBrazilTodayYMD();
      const { targetDate: todayDate } = parseYMDToSafeUtcDate(todayStr);

      const [y, m] = todayStr.split('-').map(Number);
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

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
        limit: z.coerce.number().int().min(1).max(2000).default(50)
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
                ...(query.startDate ? { gte: parseYMDToSafeUtcDate(query.startDate).targetDate } : {}),
                ...(query.endDate ? { lte: parseYMDToSafeUtcDate(query.endDate).targetDate } : {})
              }
            }
          : {}),
        ...(query.search
          ? {
              OR: (() => {
                const cleanedPhone = query.search.replace(/\D/g, '');
                const conditions: any[] = [
                  { client: { name: { contains: query.search, mode: 'insensitive' } } }
                ];
                if (cleanedPhone.length > 0) {
                  conditions.push({ client: { phone: { contains: cleanedPhone } } });
                }
                return conditions;
              })()
            }
          : {})
      };

      const orderByClause = (query.startDate && query.endDate)
        ? [{ date: 'asc' as const }, { startTime: 'asc' as const }]
        : [{ date: 'desc' as const }, { startTime: 'desc' as const }];

      const [total, data] = await Promise.all([
        prisma.schedule.count({ where: whereClause }),
        prisma.schedule.findMany({
          where: whereClause,
          skip,
          take: query.limit,
          orderBy: orderByClause,
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

    // GET /schedules/calendar - Listagem otimizada de agendamentos para o Grid Semanal
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
            gte: parseYMDToSafeUtcDate(startDate || getBrazilTodayYMD()).targetDate,
            lte: parseYMDToSafeUtcDate(endDate || getBrazilTodayYMD()).targetDate
          },
          ...(professionalId ? { professionalId } : {})
        },
        select: {
          id: true,
          clientId: true,
          professionalId: true,
          serviceId: true,
          date: true,
          startTime: true,
          endTime: true,
          totalPrice: true,
          totalDurationMinutes: true,
          status: true,
          notes: true,
          depositAmount: true,
          depositPaid: true,
          arrivalPhotoUrl: true,
          resultPhotoUrl: true,
          source: true,
          client: {
            select: { id: true, name: true, phone: true, anamnesis: true, anamnesisToken: true }
          },
          professional: {
            select: { id: true, name: true, color: true }
          },
          service: {
            select: { id: true, name: true, price: true, durationMinutes: true, color: true }
          },
          items: {
            select: {
              service: {
                select: { id: true, name: true, price: true, durationMinutes: true, color: true }
              }
            }
          }
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
        notes: z.string().max(500).optional().nullable(),
        customTotalPrice: z.coerce.number().min(0, 'Valor total não pode ser negativo.').optional()
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
        customTotalPrice: body.customTotalPrice,
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

      // Validação das transições: Status realmente finais não voltam
      const finalStatuses: ScheduleStatus[] = [ScheduleStatus.COMPLETED, ScheduleStatus.CANCELLED];
      if (finalStatuses.includes(existing.status) && existing.status !== newStatus) {
        return reply.status(400).send({
          error: 'Transição Inválida',
          message: `Agendamentos no status "${existing.status}" não podem ser alterados.`
        });
      }

      // Se estava como NO_SHOW e foi retificado para outro status (ex: cliente chegou atrasado ou engano)
      if (existing.status === ScheduleStatus.NO_SHOW && newStatus !== ScheduleStatus.NO_SHOW) {
        if (existing.client && existing.client.noShowCount > 0) {
          await prisma.client.update({
            where: { id: existing.clientId },
            data: { noShowCount: { decrement: 1 } }
          });
        }
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

    // POST /schedules/:id/confirm-deposit - Confirmar recebimento do Sinal (PIX) com lançamento automático no Financeiro
    authScope.post('/:id/confirm-deposit', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const { id } = request.params as { id: string };

      const existing = await prisma.schedule.findFirst({
        where: { id, tenantId },
        include: { client: true, service: true, professional: true }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
      }

      if (existing.depositPaid) {
        return reply.status(400).send({ error: 'Já Confirmado', message: 'O sinal deste agendamento já foi confirmado anteriormente.' });
      }

      const depositAmountNumber = Number(existing.depositAmount || 0);

      const result = await prisma.$transaction(async (tx) => {
        // 1. Atualiza agendamento
        const updatedSchedule = await tx.schedule.update({
          where: { id },
          data: {
            depositPaid: true,
            status: ScheduleStatus.CONFIRMED
          },
          include: {
            client: true,
            professional: true,
            service: true
          }
        });

        // 2. Se houver valor de sinal, lança entrada de receita no Financeiro
        let financialEntry = null;
        if (depositAmountNumber > 0) {
          financialEntry = await tx.financialEntry.create({
            data: {
              tenantId,
              scheduleId: existing.id,
              professionalId: existing.professionalId,
              type: TransactionType.INCOME,
              amount: depositAmountNumber,
              paidAt: new Date(),
              description: `Sinal PIX: ${existing.client?.name || 'Cliente'} - ${existing.service?.name || 'Serviço'}`,
              paymentMethod: PaymentMethod.PIX
            }
          });
        }

        // 3. Auditoria
        await tx.auditLog.create({
          data: {
            userId: request.user.sub,
            tenantId,
            action: 'CONFIRM_SCHEDULE_DEPOSIT',
            entityType: 'Schedule',
            entityId: id,
            details: { depositAmount: depositAmountNumber, clientName: existing.client?.name },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
          }
        }).catch(() => null);

        return { updatedSchedule, financialEntry };
      });

      return reply.status(200).send({
        success: true,
        message: `Sinal de R$ ${depositAmountNumber.toFixed(2).replace('.', ',')} confirmado e horário garantido!`,
        schedule: result.updatedSchedule,
        financialEntry: result.financialEntry
      });
    });

    // POST /schedules/:id/checkout - Fechamento completo de Comanda & PDV Balcão
    authScope.post('/:id/checkout', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const { id } = request.params as { id: string };

      const checkoutSchema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['SERVICE', 'PRODUCT']),
            itemId: z.string(),
            name: z.string(),
            quantity: z.number().int().positive().default(1),
            unitPrice: z.number().min(0),
            professionalId: z.string().optional().nullable()
          })
        ).min(1, 'Adicione pelo menos um serviço ou produto à comanda.'),
        payments: z.array(
          z.object({
            method: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CREDIT_ACCOUNT']),
            amount: z.number().positive('O valor de cada pagamento deve ser maior que zero.'),
            dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
          })
        ).default([]),
        discountAmount: z.number().min(0).default(0),
        notes: z.string().max(1000).optional().nullable()
      });

      const data = checkoutSchema.parse(request.body);

      const existing = await prisma.schedule.findFirst({
        where: { id, tenantId },
        include: {
          client: true,
          service: true,
          professional: true
        }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
      }

      // Calcula totais
      const itemsSubtotal = data.items.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
      const discount = Math.min(data.discountAmount, itemsSubtotal);
      const finalTotal = Math.max(0, itemsSubtotal - discount);

      // Sinal antecipado já quitado
      const depositPaidVal = existing.depositPaid ? Number(existing.depositAmount || 0) : 0;
      const balanceToPay = Math.max(0, finalTotal - depositPaidVal);

      // Soma dos pagamentos fornecidos
      const totalPaidInCheckout = data.payments.reduce((acc, p) => acc + p.amount, 0);

      // Validação de tolerância de centavos
      if (Math.abs(totalPaidInCheckout - balanceToPay) > 0.05) {
        return reply.status(400).send({
          error: 'Valor Divergente',
          message: `A soma dos pagamentos (R$ ${totalPaidInCheckout.toFixed(2).replace('.', ',')}) deve ser igual ao saldo a pagar (R$ ${balanceToPay.toFixed(2).replace('.', ',')}).`
        });
      }

      // Verifica estoque dos produtos antes de iniciar a transação
      for (const item of data.items) {
        if (item.type === 'PRODUCT') {
          const product = await prisma.product.findFirst({
            where: { id: item.itemId, tenantId }
          });
          if (!product) {
            return reply.status(404).send({ error: 'Não encontrado', message: `Produto "${item.name}" não encontrado.` });
          }
          if (product.stockQuantity < item.quantity) {
            return reply.status(400).send({
              error: 'Estoque Insuficiente',
              message: `O produto "${product.name}" possui apenas ${product.stockQuantity} unidades em estoque.`
            });
          }
        }
      }

      // Checa se já existe FinancialEntry vinculado ao agendamento
      const existingFinancial = await prisma.financialEntry.findUnique({
        where: { scheduleId: id }
      });

      const result = await prisma.$transaction(async (tx) => {
        // 1. Atualiza Schedule
        const updatedSchedule = await tx.schedule.update({
          where: { id },
          data: {
            status: ScheduleStatus.COMPLETED,
            totalPrice: finalTotal,
            notes: data.notes?.trim() || existing.notes
          },
          include: {
            client: true,
            service: true,
            professional: true
          }
        });

        // 2. Dá baixa no estoque de cada produto
        const stockNotifications: Array<{ name: string; quantity: number; minStock: number }> = [];
        for (const item of data.items) {
          if (item.type === 'PRODUCT') {
            const updatedProduct = await tx.product.update({
              where: { id: item.itemId },
              data: {
                stockQuantity: { decrement: item.quantity }
              }
            });

            if (updatedProduct.stockQuantity <= updatedProduct.minStock) {
              stockNotifications.push({
                name: updatedProduct.name,
                quantity: updatedProduct.stockQuantity,
                minStock: updatedProduct.minStock
              });
            }
          }
        }

        // 3. Processa cada pagamento
        const createdEntries = [];
        const createdCreditAccounts = [];
        let usedScheduleIdForFirstEntry = Boolean(existingFinancial);

        for (const pay of data.payments) {
          if (pay.method === 'CREDIT_ACCOUNT') {
            // Cria conta no Crediário / Fiado
            const dueDate = pay.dueDate ? new Date(`${pay.dueDate}T00:00:00`) : new Date(Date.now() + 15 * 86400000);
            const creditAcc = await tx.creditAccount.create({
              data: {
                tenantId,
                clientId: existing.clientId,
                clientName: existing.client?.name || 'Cliente Balcão',
                clientPhone: existing.client?.phone || '',
                serviceOrDescription: `Comanda #${id.slice(0, 8)}: ${data.items.map((i) => i.name).join(', ')}`,
                totalAmount: pay.amount,
                paidAmount: 0,
                remainingAmount: pay.amount,
                dueDate,
                status: CreditAccountStatus.OPEN,
                notes: `Origem: Comanda do agendamento #${id}`
              }
            });
            createdCreditAccounts.push(creditAcc);
          } else {
            // Pagamento imediato (PIX, CARTAO, DINHEIRO) -> Lança no Financeiro
            const pMethod = pay.method as PaymentMethod;
            const canUseScheduleId = !usedScheduleIdForFirstEntry;
            if (canUseScheduleId) {
              usedScheduleIdForFirstEntry = true;
            }

            const entry = await tx.financialEntry.create({
              data: {
                tenantId,
                scheduleId: canUseScheduleId ? id : null,
                professionalId: existing.professionalId,
                type: TransactionType.INCOME,
                amount: pay.amount,
                depositDeducted: depositPaidVal,
                description: `Recebimento Comanda #${id.slice(0, 8)} (${pMethod}): ${existing.client?.name || 'Cliente'}`,
                paymentMethod: pMethod,
                paidAt: new Date()
              }
            });
            createdEntries.push(entry);
          }
        }

        // 4. Auditoria
        await tx.auditLog.create({
          data: {
            userId: request.user.sub,
            tenantId,
            action: 'SCHEDULE_CHECKOUT',
            entityType: 'Schedule',
            entityId: id,
            details: {
              items: data.items,
              finalTotal,
              discount,
              depositPaidVal,
              payments: data.payments
            },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
          }
        }).catch(() => null);

        return {
          updatedSchedule,
          createdEntries,
          createdCreditAccounts,
          stockNotifications
        };
      });

      // Dispara alertas assíncronos de estoque se algum produto zerou ou baixou do limite
      for (const alertItem of result.stockNotifications) {
        NotificationsService.create({
          tenantId,
          category: NotificationCategory.PRODUCT,
          priority: alertItem.quantity === 0 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
          title: alertItem.quantity === 0 ? 'Estoque Esgotado' : 'Estoque Baixo',
          message: `O produto "${alertItem.name}" possui apenas ${alertItem.quantity} unidade(s) restantes após fechamento de comanda.`,
          link: '/dashboard/produtos'
        }).catch(() => null);
      }

      return reply.status(200).send({
        success: true,
        message: 'Comanda finalizada com sucesso! Financeiro e estoque atualizados.',
        schedule: result.updatedSchedule,
        financialEntries: result.createdEntries,
        creditAccounts: result.createdCreditAccounts
      });
    });

    // PATCH /schedules/:id - Remarcar ou editar notas com recálculo de endTime e validação de conflitos
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
        notes: z.string().max(500).optional().nullable(),
        totalPrice: z.coerce.number().min(0, 'Valor total não pode ser negativo.').optional(),
        arrivalPhotoUrl: z.string().nullable().optional(),
        resultPhotoUrl: z.string().nullable().optional()
      });

      const body = editSchema.parse(request.body);

      const existing = await prisma.schedule.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
      }

      // Calcula novo horário e término com base na duração total
      const targetDate = body.dateStr ? new Date(`${body.dateStr}T00:00:00`) : existing.date;
      const targetStartTime = body.startTime || existing.startTime;
      const targetProfessionalId = body.professionalId || existing.professionalId;
      const duration = existing.totalDurationMinutes || 30;
      const startMinutes = parseTimeToMinutes(targetStartTime);
      const endMinutes = startMinutes + duration;
      const targetEndTime = formatMinutesToTime(endMinutes);

      // Validação de conflito se data, horário ou profissional foram alterados
      if (body.dateStr || body.startTime || body.professionalId) {
        const conflictingSchedule = await prisma.schedule.findFirst({
          where: {
            tenantId,
            id: { not: id },
            professionalId: targetProfessionalId,
            date: targetDate,
            status: { in: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED, ScheduleStatus.IN_SERVICE] },
            startTime: { lt: targetEndTime },
            endTime: { gt: targetStartTime }
          }
        });

        if (conflictingSchedule) {
          return reply.status(409).send({
            error: 'Conflito de Horário',
            message: 'Este horário já está ocupado por outro agendamento.'
          });
        }

        const conflictingBlock = await prisma.scheduleBlock.findFirst({
          where: {
            tenantId,
            isPaused: false,
            OR: [{ date: targetDate }, { dayOfWeek: targetDate.getDay() }],
            AND: [
              { OR: [{ professionalId: null }, { professionalId: targetProfessionalId }] },
              { startTime: { lt: targetEndTime }, endTime: { gt: targetStartTime } }
            ]
          }
        });

        if (conflictingBlock) {
          return reply.status(409).send({
            error: 'Horário Bloqueado',
            message: `Este horário está bloqueado (${conflictingBlock.reason}).`
          });
        }
      }

      const updated = await prisma.schedule.update({
        where: { id },
        data: {
          date: targetDate,
          startTime: targetStartTime,
          endTime: targetEndTime,
          professionalId: targetProfessionalId,
          ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
          ...(body.totalPrice !== undefined ? { totalPrice: body.totalPrice } : {}),
          ...(body.arrivalPhotoUrl !== undefined ? { arrivalPhotoUrl: body.arrivalPhotoUrl } : {}),
          ...(body.resultPhotoUrl !== undefined ? { resultPhotoUrl: body.resultPhotoUrl } : {})
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
