import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AvailabilityService } from './availability.service';

export const schedulesRoutes: FastifyPluginAsync = async (app) => {
  // GET /schedules/availability (Público - cálculo de slots para a Vitrine)
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

  // GET /schedules/week-strip (Público - Fita de 7 dias com pontos de disponibilidade)
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

  // Rotas autenticadas para o calendário do Dashboard
  app.register(async (authScope) => {
    authScope.addHook('preHandler', app.authenticate);

    // GET /schedules/calendar - Listagem de agendamentos no período para o Dashboard
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
          resource: true
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      });

      return reply.send(schedules);
    });

    // POST /schedules/manual-block - Criar bloqueio de agenda de um profissional
    authScope.post('/manual-block', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const schema = z.object({
        professionalId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        reason: z.string().min(2, 'O motivo do bloqueio é obrigatório.')
      });

      const data = schema.parse(request.body);

      const block = await prisma.scheduleBlock.create({
        data: {
          tenantId,
          professionalId: data.professionalId,
          date: new Date(`${data.date}T00:00:00`),
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason
        }
      });

      return reply.status(201).send(block);
    });
  });
};
