import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { parseYMDToSafeUtcDate } from '../../utils/date-utils';

const blockInputSchema = z.object({
  professionalId: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório.'),
  reason: z.string().min(2, 'O motivo do bloqueio é obrigatório.'),
  isPaused: z.boolean().default(false)
});

export const blocksRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /blocks - Listar bloqueios pontuais e recorrentes do tenant
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { professionalId } = request.query as { professionalId?: string };

    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        tenantId,
        ...(professionalId ? { professionalId } : {})
      },
      orderBy: [{ date: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        professional: {
          select: { id: true, name: true, color: true }
        }
      }
    });

    return reply.send(blocks);
  });

  // POST /blocks - Criar novo bloqueio
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = blockInputSchema.parse(request.body);

    if (data.startTime >= data.endTime) {
      return reply.status(400).send({
        error: 'Inválido',
        message: 'O horário inicial deve ser anterior ao horário final.'
      });
    }

    if (!data.date && data.dayOfWeek === undefined) {
      return reply.status(400).send({
        error: 'Inválido',
        message: 'Informe uma data pontual ou um dia da semana para bloqueio recorrente.'
      });
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        tenantId,
        professionalId: data.professionalId || null,
        date: data.date ? parseYMDToSafeUtcDate(data.date).targetDate : null,
        dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : null,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason.trim(),
        isPaused: data.isPaused
      },
      include: {
        professional: {
          select: { id: true, name: true, color: true }
        }
      }
    });

    return reply.status(201).send(block);
  });

  // PATCH /blocks/:id/toggle - Pausar ou ativar bloqueio
  app.patch('/:id/toggle', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const existing = await prisma.scheduleBlock.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Bloqueio não localizado.' });
    }

    const updated = await prisma.scheduleBlock.update({
      where: { id },
      data: {
        isPaused: !existing.isPaused
      }
    });

    return reply.send(updated);
  });

  // DELETE /blocks/:id - Remover bloqueio
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const existing = await prisma.scheduleBlock.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Bloqueio não localizado.' });
    }

    await prisma.scheduleBlock.delete({
      where: { id }
    });

    return reply.status(204).send();
  });
};
