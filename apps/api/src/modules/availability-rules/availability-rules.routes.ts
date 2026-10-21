import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { getHolidaysForRange } from '../../utils/brazilian-holidays';

const ruleInputSchema = z.object({
  professionalId: z.string().uuid().optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Domingo, 6 = Sábado
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
  slotIntervalMinutes: z.number().int().min(5).default(30)
});

export const availabilityRulesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /availability-rules/holidays - Lista feriados nacionais com status do tenant
  app.get('/holidays', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { year } = request.query as { year?: string };
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { blockNationalHolidays: true, holidayExceptions: true }
    });

    const blockNational = tenant?.blockNationalHolidays ?? true;
    const exceptions: string[] = Array.isArray(tenant?.holidayExceptions)
      ? (tenant.holidayExceptions as string[])
      : [];

    const holidays = getHolidaysForRange(currentYear, currentYear + 1);

    const holidaysWithStatus = holidays.map((h) => {
      const isException = exceptions.includes(h.date);
      const isBlocked = blockNational && !isException;
      return {
        ...h,
        isBlocked,
        isException
      };
    });

    return reply.send({
      blockNationalHolidays: blockNational,
      holidayExceptions: exceptions,
      holidays: holidaysWithStatus
    });
  });

  // PUT /availability-rules/batch - Atualização atômica da grade semanal de 7 dias
  app.put('/batch', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const batchSchema = z.object({
      professionalId: z.string().uuid().optional().nullable(),
      days: z.array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          isOpen: z.boolean(),
          startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
          endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
          slotIntervalMinutes: z.number().int().min(5).default(30)
        })
      )
    });

    const data = batchSchema.parse(request.body);
    const targetProfessionalId = data.professionalId || null;

    for (const d of data.days) {
      if (d.isOpen && d.startTime >= d.endTime) {
        return reply.status(400).send({
          error: 'Inválido',
          message: `O horário inicial (${d.startTime}) deve ser anterior ao horário final (${d.endTime}) para o dia ${d.dayOfWeek}.`
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({
        where: {
          tenantId,
          professionalId: targetProfessionalId
        }
      });

      if (data.days.length > 0) {
        await tx.availabilityRule.createMany({
          data: data.days.map((d) => ({
            tenantId,
            professionalId: targetProfessionalId,
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            slotIntervalMinutes: d.slotIntervalMinutes,
            isActive: d.isOpen
          }))
        });

        // Sincroniza horários gerais no Tenant quando a grade for geral da loja
        if (!targetProfessionalId) {
          const openDays = data.days.filter((d) => d.isOpen);
          if (openDays.length > 0) {
            const sortedStarts = [...openDays].sort((a, b) => a.startTime.localeCompare(b.startTime));
            const sortedEnds = [...openDays].sort((a, b) => b.endTime.localeCompare(a.endTime));
            await tx.tenant.update({
              where: { id: tenantId },
              data: {
                openingTime: sortedStarts[0].startTime,
                closingTime: sortedEnds[0].endTime
              }
            });
          }
        }
      }
    });

    const updatedRules = await prisma.availabilityRule.findMany({
      where: {
        tenantId,
        professionalId: targetProfessionalId
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    return reply.send(updatedRules);
  });

  // GET /availability-rules - Listar regras semanais de atendimento do tenant
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const rules = await prisma.availabilityRule.findMany({
      where: { tenantId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        professional: {
          select: { id: true, name: true, color: true }
        }
      }
    });

    return reply.send(rules);
  });

  // POST /availability-rules - Criar nova regra semanal
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = ruleInputSchema.parse(request.body);

    if (data.startTime >= data.endTime) {
      return reply.status(400).send({
        error: 'Inválido',
        message: 'O horário inicial deve ser anterior ao horário final.'
      });
    }

    const rule = await prisma.availabilityRule.create({
      data: {
        tenantId,
        professionalId: data.professionalId || null,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotIntervalMinutes: data.slotIntervalMinutes
      },
      include: {
        professional: {
          select: { id: true, name: true, color: true }
        }
      }
    });

    return reply.status(201).send(rule);
  });

  // PUT /availability-rules/:id - Atualizar regra semanal
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = ruleInputSchema.partial().parse(request.body);

    const existing = await prisma.availabilityRule.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Regra de disponibilidade não localizada.' });
    }

    const startTime = data.startTime || existing.startTime;
    const endTime = data.endTime || existing.endTime;

    if (startTime >= endTime) {
      return reply.status(400).send({
        error: 'Inválido',
        message: 'O horário inicial deve ser anterior ao horário final.'
      });
    }

    const updated = await prisma.availabilityRule.update({
      where: { id },
      data: {
        ...(data.professionalId !== undefined ? { professionalId: data.professionalId } : {}),
        ...(data.dayOfWeek !== undefined ? { dayOfWeek: data.dayOfWeek } : {}),
        ...(data.startTime ? { startTime: data.startTime } : {}),
        ...(data.endTime ? { endTime: data.endTime } : {}),
        ...(data.slotIntervalMinutes ? { slotIntervalMinutes: data.slotIntervalMinutes } : {})
      },
      include: {
        professional: {
          select: { id: true, name: true, color: true }
        }
      }
    });

    return reply.send(updated);
  });

  // DELETE /availability-rules/:id - Excluir regra semanal
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const existing = await prisma.availabilityRule.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Regra de disponibilidade não localizada.' });
    }

    await prisma.availabilityRule.delete({
      where: { id }
    });

    return reply.status(204).send();
  });
};
