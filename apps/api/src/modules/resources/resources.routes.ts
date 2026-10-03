import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const resourceInputSchema = z.object({
  name: z.string().min(2, 'O nome da sala, cabine ou equipamento é obrigatório.'),
  type: z.enum(['ROOM', 'EQUIPMENT', 'CHAIR']).default('ROOM'),
  isActive: z.boolean().default(true)
});

export const resourcesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /resources - Listar recursos físicos do estabelecimento
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const resources = await prisma.resource.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        services: { select: { id: true, name: true } },
        _count: { select: { schedules: true } }
      }
    });

    return reply.send(resources);
  });

  // POST /resources - Cadastrar recurso físico
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = resourceInputSchema.parse(request.body);

    const resource = await prisma.resource.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        isActive: data.isActive
      }
    });

    return reply.status(201).send(resource);
  });

  // PUT /resources/:id - Atualizar recurso físico
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = resourceInputSchema.partial().parse(request.body);

    const updated = await prisma.resource.updateMany({
      where: { id, tenantId },
      data
    });

    if (updated.count === 0) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Recurso não encontrado.' });
    }

    const res = await prisma.resource.findUnique({ where: { id } });
    return reply.send(res);
  });

  // DELETE /resources/:id - Desativar recurso
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    await prisma.resource.updateMany({
      where: { id, tenantId },
      data: { isActive: false }
    });

    return reply.send({ message: 'Recurso desativado com sucesso.' });
  });
};
