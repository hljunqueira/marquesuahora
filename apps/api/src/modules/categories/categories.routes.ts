import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const categoryInputSchema = z.object({
  name: z.string().min(2, 'O nome da categoria é obrigatório.'),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true)
});

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /categories - Listagem de categorias do estabelecimento
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const categories = await prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { services: true }
        }
      }
    });

    return reply.send(categories);
  });

  // POST /categories - Cadastrar nova categoria
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = categoryInputSchema.parse(request.body);

    const category = await prisma.category.create({
      data: {
        tenantId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive
      }
    });

    return reply.status(201).send(category);
  });

  // PUT /categories/:id - Atualizar categoria existente
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = categoryInputSchema.partial().parse(request.body);

    const category = await prisma.category.findFirst({
      where: { id, tenantId }
    });

    if (!category) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Categoria não localizada.' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
      }
    });

    return reply.send(updated);
  });

  // DELETE /categories/:id - Remover categoria
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const category = await prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { services: true } }
      }
    });

    if (!category) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Categoria não localizada.' });
    }

    if (category._count.services > 0) {
      return reply.status(400).send({
        error: 'Conflito',
        message: 'Não é possível excluir uma categoria que possui serviços vinculados. Desvincule os serviços antes de excluir.'
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    return reply.status(204).send();
  });
};
