import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { TransactionType, PaymentMethod, ScheduleStatus } from '@prisma/client';

const financialInputSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('O valor deve ser maior que zero.'),
  description: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.string().default('PIX'),
  professionalId: z.string().uuid().optional().nullable(),
  paidAt: z.string().optional()
});

export const financialRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /financial - Listagem de entradas e saídas do estabelecimento com totais
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const entries = await prisma.financialEntry.findMany({
      where: { tenantId },
      orderBy: { paidAt: 'desc' },
      include: {
        schedule: {
          select: {
            id: true,
            date: true,
            client: { select: { name: true, phone: true } },
            professional: { select: { name: true } },
            service: { select: { name: true } }
          }
        }
      }
    });

    let totalIncome = 0;
    let totalExpense = 0;

    const formatted = entries.map((entry) => {
      const val = Number(entry.amount);
      if (entry.type === TransactionType.INCOME) {
        totalIncome += val;
      } else if (entry.type === TransactionType.EXPENSE) {
        totalExpense += val;
      }

      return {
        id: entry.id,
        type: entry.type,
        title: entry.description,
        category: entry.type === TransactionType.INCOME ? 'Receitas & Serviços' : 'Despesas Operacionais',
        amount: val,
        date: entry.paidAt.toISOString().slice(0, 10),
        paymentMethod: entry.paymentMethod,
        clientName: entry.schedule?.client?.name || undefined,
        professionalName: entry.schedule?.professional?.name || undefined,
        status: 'PAID'
      };
    });

    return reply.send({
      transactions: formatted,
      summary: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        transactionsCount: entries.length
      }
    });
  });

  // POST /financial - Registrar nova movimentação (Receita ou Despesa)
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = financialInputSchema.parse(request.body);

    const validMethod = ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH'].includes(data.paymentMethod)
      ? (data.paymentMethod as PaymentMethod)
      : PaymentMethod.PIX;

    const entry = await prisma.financialEntry.create({
      data: {
        tenantId,
        type: data.type as TransactionType,
        amount: data.amount,
        description: data.description || data.title || (data.category ? `${data.category}` : 'Lançamento Manual'),
        paymentMethod: validMethod,
        professionalId: data.professionalId || null,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date()
      }
    });

    return reply.status(201).send(entry);
  });

  // DELETE /financial/:id - Excluir movimentação
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const entry = await prisma.financialEntry.findFirst({
      where: { id, tenantId }
    });

    if (!entry) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Registro financeiro não localizado.' });
    }

    await prisma.financialEntry.delete({ where: { id } });

    return reply.send({ message: 'Registro financeiro excluído com sucesso.' });
  });

  // GET /financial/commissions - Cálculo real de repasses comissionados por profissional
  app.get('/commissions', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const professionals = await prisma.professional.findMany({
      where: { tenantId, isActive: true },
      include: {
        schedules: {
          where: {
            status: ScheduleStatus.COMPLETED
          },
          select: {
            id: true,
            totalPrice: true,
            date: true
          }
        }
      }
    });

    const commissions = professionals.map((prof) => {
      const salesTotal = prof.schedules.reduce(
        (acc, curr) => acc + Number(curr.totalPrice),
        0
      );
      const rate = Number(prof.commissionRate);
      const payoutAmount = (salesTotal * rate) / 100;

      return {
        id: `comm-${prof.id}`,
        professionalId: prof.id,
        professionalName: prof.name,
        percentage: rate,
        salesTotal,
        payoutAmount,
        servicesCount: prof.schedules.length,
        status: 'PENDING'
      };
    });

    return reply.send(commissions);
  });
};
