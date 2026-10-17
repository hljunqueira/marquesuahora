import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { TransactionType, PaymentMethod, ScheduleStatus, CreditAccountStatus } from '@prisma/client';

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

const creditAccountInputSchema = z.object({
  clientName: z.string().min(2, 'O nome do cliente é obrigatório.'),
  clientPhone: z.string().min(10, 'O telefone/WhatsApp é obrigatório.'),
  serviceOrDescription: z.string().min(2, 'A descrição ou serviço é obrigatória.'),
  totalAmount: z.number().positive('O valor deve ser maior que zero.'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (formato AAAA-MM-DD).'),
  notes: z.string().max(1000).optional().nullable()
});

const creditPaymentSchema = z.object({
  amount: z.number().positive('O valor de pagamento deve ser maior que zero.'),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH']).default('PIX')
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

  // PUT /financial/:id - Atualizar movimentação
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = financialInputSchema.partial().parse(request.body);

    const existing = await prisma.financialEntry.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Registro financeiro não localizado.' });
    }

    const validMethod = data.paymentMethod && ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH'].includes(data.paymentMethod)
      ? (data.paymentMethod as PaymentMethod)
      : undefined;

    const updated = await prisma.financialEntry.update({
      where: { id },
      data: {
        ...(data.type ? { type: data.type as TransactionType } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(validMethod ? { paymentMethod: validMethod } : {}),
        ...(data.professionalId !== undefined ? { professionalId: data.professionalId } : {}),
        ...(data.paidAt ? { paidAt: new Date(data.paidAt) } : {})
      }
    });

    return reply.send(updated);
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

  // ==============================================================================
  // MÓDULO DE CREDIÁRIO / FIADO / CONTAS A RECEBER
  // ==============================================================================

  // GET /financial/credit-accounts - Listar contas de crediário
  app.get('/credit-accounts', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const accounts = await prisma.creditAccount.findMany({
      where: { tenantId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        client: { select: { id: true, name: true, phone: true } }
      }
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    const formatted = accounts.map((acc) => {
      const dueDateStr = acc.dueDate.toISOString().slice(0, 10);
      let status = acc.status;
      if (status !== CreditAccountStatus.PAID && dueDateStr < todayStr) {
        status = CreditAccountStatus.OVERDUE;
      }

      return {
        id: acc.id,
        clientId: acc.clientId,
        clientName: acc.clientName,
        clientPhone: acc.clientPhone,
        serviceOrDescription: acc.serviceOrDescription,
        totalAmount: Number(acc.totalAmount),
        paidAmount: Number(acc.paidAmount),
        remainingAmount: Number(acc.remainingAmount),
        createdAt: acc.createdAt.toISOString().slice(0, 10),
        dueDate: dueDateStr,
        status,
        notes: acc.notes || undefined
      };
    });

    const totalDue = formatted.reduce((acc, c) => acc + (c.status !== 'PAID' ? c.remainingAmount : 0), 0);
    const activeCount = formatted.filter((c) => c.status !== 'PAID').length;

    return reply.send({
      accounts: formatted,
      summary: {
        totalDue,
        activeCount,
        totalCount: formatted.length
      }
    });
  });

  // POST /financial/credit-accounts - Criar nova conta de crediário
  app.post('/credit-accounts', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const data = creditAccountInputSchema.parse(request.body);
    const cleanPhone = data.clientPhone.replace(/\D/g, '');

    const client = await prisma.client.findFirst({
      where: {
        tenantId,
        OR: [
          { phone: cleanPhone },
          { name: { equals: data.clientName.trim(), mode: 'insensitive' } }
        ]
      }
    });

    const newAccount = await prisma.creditAccount.create({
      data: {
        tenantId,
        clientId: client?.id || null,
        clientName: data.clientName.trim(),
        clientPhone: cleanPhone,
        serviceOrDescription: data.serviceOrDescription.trim(),
        totalAmount: data.totalAmount,
        paidAmount: 0,
        remainingAmount: data.totalAmount,
        dueDate: new Date(`${data.dueDate}T00:00:00`),
        status: CreditAccountStatus.OPEN,
        notes: data.notes?.trim() || null
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'CREDIT_ACCOUNT_CREATE',
        entityType: 'CreditAccount',
        entityId: newAccount.id,
        details: { clientName: newAccount.clientName, totalAmount: data.totalAmount },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.status(201).send(newAccount);
  });

  // PUT /financial/credit-accounts/:id - Atualizar conta de crediário
  app.put('/credit-accounts/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = creditAccountInputSchema.partial().parse(request.body);

    const existing = await prisma.creditAccount.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Conta de crediário não localizada.' });
    }

    const newTotal = data.totalAmount !== undefined ? data.totalAmount : Number(existing.totalAmount);
    const currentPaid = Number(existing.paidAmount);
    const newRemaining = Math.max(0, newTotal - currentPaid);
    const newStatus = newRemaining === 0 ? CreditAccountStatus.PAID : currentPaid > 0 ? CreditAccountStatus.PARTIAL : CreditAccountStatus.OPEN;

    const updated = await prisma.creditAccount.update({
      where: { id },
      data: {
        ...(data.clientName ? { clientName: data.clientName.trim() } : {}),
        ...(data.clientPhone ? { clientPhone: data.clientPhone.replace(/\D/g, '') } : {}),
        ...(data.serviceOrDescription ? { serviceOrDescription: data.serviceOrDescription.trim() } : {}),
        ...(data.totalAmount !== undefined ? { totalAmount: newTotal } : {}),
        remainingAmount: newRemaining,
        status: newStatus,
        ...(data.dueDate ? { dueDate: new Date(`${data.dueDate}T00:00:00`) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {})
      }
    });

    return reply.send(updated);
  });

  // POST /financial/credit-accounts/:id/pay - Registrar pagamento / amortização de crediário
  app.post('/credit-accounts/:id/pay', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const { amount, paymentMethod } = creditPaymentSchema.parse(request.body);

    const account = await prisma.creditAccount.findFirst({
      where: { id, tenantId }
    });

    if (!account) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Conta de crediário não localizada.' });
    }

    const currentPaid = Number(account.paidAmount);
    const newPaidAmount = currentPaid + amount;
    const newRemaining = Math.max(0, Number(account.totalAmount) - newPaidAmount);
    const newStatus = newRemaining === 0 ? CreditAccountStatus.PAID : CreditAccountStatus.PARTIAL;

    const result = await prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.creditAccount.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: newStatus
        }
      });

      // Lança a receita correspondente no fluxo de caixa
      const entry = await tx.financialEntry.create({
        data: {
          tenantId,
          type: TransactionType.INCOME,
          amount,
          description: `Recebimento Crediário - ${account.clientName}`,
          paymentMethod: paymentMethod as PaymentMethod,
          paidAt: new Date()
        }
      });

      return { updatedAccount, entry };
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'CREDIT_ACCOUNT_PAYMENT',
        entityType: 'CreditAccount',
        entityId: id,
        details: { amount, paymentMethod, remaining: newRemaining },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.send(result);
  });

  // DELETE /financial/credit-accounts/:id - Excluir conta de crediário
  app.delete('/credit-accounts/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };

    const account = await prisma.creditAccount.findFirst({
      where: { id, tenantId }
    });

    if (!account) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Conta de crediário não localizada.' });
    }

    await prisma.creditAccount.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'CREDIT_ACCOUNT_DELETE',
        entityType: 'CreditAccount',
        entityId: id,
        details: { clientName: account.clientName, totalAmount: Number(account.totalAmount) },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.send({ message: 'Conta de crediário removida com sucesso.' });
  });
};
