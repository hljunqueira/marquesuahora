import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const ruleInputSchema = z.object({
  professionalId: z.string().uuid().optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Domingo, 6 = Sábado
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
  slotIntervalMinutes: z.number().int().min(5).default(30)
});

export const availabilityRulesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

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
