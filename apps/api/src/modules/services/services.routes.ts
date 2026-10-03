import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const serviceInputSchema = z.object({
  name: z.string().min(2, 'O nome do serviço é obrigatório.'),
  category: z.string().default('Geral'),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0, 'O preço não pode ser negativo.'),
  durationMinutes: z.number().int().min(5, 'A duração mínima é de 5 minutos.'),
  allowOnlineBooking: z.boolean().default(true),
  serviceType: z.string().default('STANDARD'),
  resourceId: z.string().uuid().optional().nullable()
});

export const servicesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /services - Listagem de serviços do estabelecimento
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const services = await prisma.service.findMany({
      where: { tenantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        resource: true,
        professionals: {
          include: {
            professional: {
              select: { id: true, name: true, phone: true, color: true }
            }
          }
        },
        _count: {
          select: { schedules: true }
        }
      }
    });

    return reply.send(services);
  });

  // POST /services - Cadastrar novo serviço
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = serviceInputSchema.parse(request.body);

    const service = await prisma.service.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        description: data.description,
        price: data.price,
        durationMinutes: data.durationMinutes,
        allowOnlineBooking: data.allowOnlineBooking,
        serviceType: data.serviceType,
        resourceId: data.resourceId || null
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'SERVICE_CREATE',
        entityType: 'Service',
        entityId: service.id,
        details: { name: service.name, price: service.price, durationMinutes: service.durationMinutes },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.status(201).send(service);
  });

  // PUT /services/:id - Atualizar serviço existente
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = serviceInputSchema.partial().parse(request.body);

    const service = await prisma.service.updateMany({
      where: { id, tenantId },
      data
    });

    if (service.count === 0) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Serviço não encontrado.' });
    }

    const updated = await prisma.service.findUnique({ where: { id } });
    return reply.send(updated);
  });

  // DELETE /services/:id - Desativar da vitrine
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    await prisma.service.updateMany({
      where: { id, tenantId },
      data: { allowOnlineBooking: false }
    });

    return reply.send({ message: 'Serviço desativado da vitrine com sucesso.' });
  });
};
