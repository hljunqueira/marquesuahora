import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const clientInputSchema = z.object({
  name: z.string().min(2, 'O nome do cliente é obrigatório.'),
  phone: z.string().min(10, 'O telefone com DDD é obrigatório.'),
  email: z.string().email('E-mail inválido.').optional().nullable(),
  documentNumber: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notifyBirthday: z.boolean().default(true),
  isBlockedOnline: z.boolean().optional(),
  noShowCount: z.number().int().min(0).optional()
});

export const clientsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /clients/metrics - Resumo de clientes (Total, Aniversariantes do Mês, Risco de Churn, No-Show Shield)
  app.get('/metrics', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const currentMonth = new Date().getMonth() + 1;
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

    const [totalClients, birthdaysResult, churnCount, shieldCount] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count
        FROM "Client"
        WHERE "tenantId" = ${tenantId}
          AND "birthday" IS NOT NULL
          AND EXTRACT(MONTH FROM "birthday") = ${currentMonth}
      `.catch(() => [{ count: 0n }]),
      prisma.client.count({
        where: {
          tenantId,
          OR: [
            { lastVisitAt: { lte: fortyFiveDaysAgo } },
            { lastVisitAt: null, createdAt: { lte: fortyFiveDaysAgo } }
          ]
        }
      }),
      prisma.client.count({
        where: {
          tenantId,
          OR: [
            { noShowCount: { gt: 0 } },
            { isBlockedOnline: true }
          ]
        }
      })
    ]);

    return reply.send({
      totalClients,
      birthdaysThisMonth: Number(birthdaysResult[0]?.count || 0),
      churnRisk: churnCount,
      shieldAlerts: shieldCount
    });
  });

  // GET /clients - Listagem de clientes com pesquisa, abas e paginação
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const querySchema = z.object({
      search: z.string().optional(),
      tab: z.enum(['ALL', 'BIRTHDAYS', 'CHURN', 'SHIELD']).default('ALL'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20)
    });

    const { search, tab, page, limit } = querySchema.parse(request.query);
    const skip = (page - 1) * limit;

    const conditions: any[] = [{ tenantId }];

    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      const digitsOnly = cleanSearch.replace(/\D/g, '');
      conditions.push({
        OR: [
          { name: { contains: cleanSearch, mode: 'insensitive' } },
          { email: { contains: cleanSearch, mode: 'insensitive' } },
          ...(digitsOnly.length > 0 ? [{ phone: { contains: digitsOnly } }] : [])
        ]
      });
    }

    if (tab === 'BIRTHDAYS') {
      const currentMonth = new Date().getMonth() + 1;
      try {
        const birthdayClientIds = (await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Client"
          WHERE "tenantId" = ${tenantId}
            AND "birthday" IS NOT NULL
            AND EXTRACT(MONTH FROM "birthday") = ${currentMonth}
        `).map((r) => r.id);
        conditions.push({ id: { in: birthdayClientIds } });
      } catch {
        // Fallback se raw query falhar
      }
    } else if (tab === 'CHURN') {
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      conditions.push({
        OR: [
          { lastVisitAt: { lte: fortyFiveDaysAgo } },
          { lastVisitAt: null, createdAt: { lte: fortyFiveDaysAgo } }
        ]
      });
    } else if (tab === 'SHIELD') {
      conditions.push({
        OR: [
          { noShowCount: { gt: 0 } },
          { isBlockedOnline: true }
        ]
      });
    }

    const whereClause = { AND: conditions };

    const [total, clients] = await Promise.all([
      prisma.client.count({ where: whereClause }),
      prisma.client.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { schedules: true }
          }
        }
      })
    ]);

    return reply.send({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: clients
    });
  });

  // GET /clients/:id - Detalhes do cliente com histórico completo de agendamentos
  app.get('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const client = await prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        schedules: {
          orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
          include: {
            professional: { select: { id: true, name: true, color: true } },
            service: { select: { id: true, name: true, price: true, durationMinutes: true } },
            items: { include: { service: true } }
          }
        }
      }
    });

    if (!client) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Cliente não localizado.' });
    }

    return reply.send(client);
  });

  // PATCH /clients/:id/toggle-block - Bloquear ou desbloquear agendamento online do cliente
  app.patch('/:id/toggle-block', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const client = await prisma.client.findFirst({
      where: { id, tenantId }
    });

    if (!client) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Cliente não localizado.' });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: { isBlockedOnline: !client.isBlockedOnline }
    });

    return reply.send(updated);
  });

  // POST /clients - Cadastrar novo cliente
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = clientInputSchema.parse(request.body);
    const normalizedPhone = data.phone.replace(/\D/g, '');

    const existing = await prisma.client.findUnique({
      where: {
        tenantId_phone: {
          tenantId,
          phone: normalizedPhone
        }
      }
    });

    if (existing) {
      return reply.status(409).send({
        error: 'Conflito',
        message: 'Já existe um cliente cadastrado com este telefone.'
      });
    }

    const client = await prisma.client.create({
      data: {
        tenantId,
        name: data.name.trim(),
        phone: normalizedPhone,
        email: data.email?.trim() || null,
        documentNumber: data.documentNumber?.replace(/\D/g, '') || null,
        notes: data.notes?.trim() || null,
        birthday: data.birthday ? new Date(`${data.birthday}T00:00:00`) : null,
        notifyBirthday: data.notifyBirthday,
        isBlockedOnline: data.isBlockedOnline ?? false,
        noShowCount: data.noShowCount ?? 0
      }
    });

    return reply.status(201).send(client);
  });

  // PUT /clients/:id - Atualizar dados do cliente
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = clientInputSchema.partial().parse(request.body);

    const client = await prisma.client.findFirst({
      where: { id, tenantId }
    });

    if (!client) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Cliente não localizado.' });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.phone ? { phone: data.phone.replace(/\D/g, '') } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
        ...(data.documentNumber !== undefined ? { documentNumber: data.documentNumber?.replace(/\D/g, '') || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.birthday !== undefined ? { birthday: data.birthday ? new Date(`${data.birthday}T00:00:00`) : null } : {}),
        ...(data.notifyBirthday !== undefined ? { notifyBirthday: data.notifyBirthday } : {}),
        ...(data.isBlockedOnline !== undefined ? { isBlockedOnline: data.isBlockedOnline } : {}),
        ...(data.noShowCount !== undefined ? { noShowCount: data.noShowCount } : {})
      }
    });

    return reply.send(updated);
  });

  // DELETE /clients/:id - Remover cliente
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const client = await prisma.client.findFirst({
      where: { id, tenantId }
    });

    if (!client) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Cliente não localizado.' });
    }

    await prisma.client.delete({
      where: { id }
    });

    return reply.status(204).send();
  });
};
