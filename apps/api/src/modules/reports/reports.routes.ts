import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ScheduleStatus, PaymentMethod } from '@prisma/client';

const dateFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  professionalId: z.string().uuid().optional().nullable()
});

/**
 * Validador de liberação do recurso:
 * O módulo de Relatórios e Inteligência 360° é um diferencial do Plano EQUIPE_PRO ou Cortesia VIP (GRATUITY).
 */
async function isEquipeProAllowed(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true }
  });
  if (!tenant) return false;
  if (tenant.billingStatus === 'GRATUITY') return true;
  if (!tenant.plan) return false;

  const code = (tenant.plan.code || '').toUpperCase();
  const name = (tenant.plan.name || '').toLowerCase();

  return (
    code === 'EQUIPE_PRO' ||
    code === 'VIP_AI' ||
    code === 'PRO' ||
    name.includes('equipe') ||
    name.includes('vip')
  );
}

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // 0. GET /reports/plan-status - Checagem para exibição do Hub de Relatórios vs Tela de Upgrade
  app.get('/plan-status', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem salão vinculado.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true }
    });

    const isAllowed = await isEquipeProAllowed(tenantId);

    return reply.send({
      isAllowed,
      currentPlanCode: tenant?.plan?.code || 'FREE',
      currentPlanName: tenant?.plan?.name || 'Plano Básico',
      requiredPlan: 'EQUIPE_PRO'
    });
  });

  // Middleware interno para proteger os endpoints analíticos abaixo
  const enforceProGuard = async (request: any, reply: any): Promise<string | null> => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      reply.status(403).send({ error: 'Proibido', message: 'Sem salão vinculado.' });
      return null;
    }
    const allowed = await isEquipeProAllowed(tenantId);
    if (!allowed) {
      reply.status(403).send({
        error: 'PLAN_REQUIRED',
        plan: 'EQUIPE_PRO',
        message: 'A Central de Relatórios e Inteligência 360° é um recurso exclusivo para assinantes.'
      });
      return null;
    }
    return tenantId;
  };

  // 1. GET /reports/overview - KPIs executivos 360°
  app.get('/overview', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const { startDate, endDate, professionalId } = dateFilterSchema.parse(request.query);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const scheduleWhere: any = {
      tenantId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      ...(professionalId ? { professionalId } : {})
    };

    const [schedules, financialEntries, clientsCount, npsResult] = await Promise.all([
      prisma.schedule.findMany({
        where: scheduleWhere,
        select: {
          id: true,
          status: true,
          totalPrice: true,
          depositAmount: true,
          depositPaid: true,
          clientId: true
        }
      }),
      prisma.financialEntry.findMany({
        where: {
          tenantId,
          ...(Object.keys(dateFilter).length > 0 ? { paidAt: dateFilter } : {})
        },
        select: { type: true, amount: true }
      }),
      prisma.client.count({ where: { tenantId } }),
      prisma.schedule.aggregate({
        where: {
          tenantId,
          npsScore: { not: null },
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        },
        _avg: { npsScore: true },
        _count: { _all: true }
      })
    ]);

    const totalBookings = schedules.length;
    const completedSchedules = schedules.filter((s) => s.status === ScheduleStatus.COMPLETED);
    const completedCount = completedSchedules.length;
    const cancelledCount = schedules.filter((s) => s.status === ScheduleStatus.CANCELLED).length;
    const noShowCount = schedules.filter((s) => s.status === ScheduleStatus.NO_SHOW).length;

    // Faturamento dos atendimentos concluídos ou confirmados
    const activeSchedules = schedules.filter((s) => s.status !== ScheduleStatus.CANCELLED);
    const scheduleGrossRevenue = activeSchedules.reduce((acc, s) => acc + Number(s.totalPrice || 0), 0);

    // Faturamento financeiro total (entradas) e saídas
    let totalIncome = 0;
    let totalExpense = 0;
    for (const f of financialEntries) {
      const val = Number(f.amount || 0);
      if (f.type === 'INCOME') totalIncome += val;
      else if (f.type === 'EXPENSE') totalExpense += val;
    }

    const netRevenue = (totalIncome > 0 ? totalIncome : scheduleGrossRevenue) - totalExpense;
    const ticketMedio = completedCount > 0 ? scheduleGrossRevenue / completedCount : 0;
    const attendanceRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;
    const noShowRate = totalBookings > 0 ? Math.round((noShowCount / totalBookings) * 100) : 0;

    // Clientes únicas no período
    const uniqueClientsInPeriod = new Set(schedules.map((s) => s.clientId)).size;

    const avgNps = npsResult?._avg?.npsScore;
    const countNps = npsResult?._count?._all || 0;

    return reply.send({
      grossRevenue: scheduleGrossRevenue,
      netRevenue,
      totalIncome,
      totalExpense,
      totalBookings,
      completedCount,
      cancelledCount,
      noShowCount,
      ticketMedio: Math.round(ticketMedio * 100) / 100,
      attendanceRate,
      noShowRate,
      uniqueClientsInPeriod,
      totalRegisteredClients: clientsCount,
      npsAverage: avgNps ? Math.round(avgNps * 10) / 10 : 5.0,
      npsReviewsCount: countNps
    });
  });

  // 2. GET /reports/clients - Ranking de Clientes ("Quem mais agendou", "Maior LTV", "Em Risco")
  app.get('/clients', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const { startDate, endDate } = dateFilterSchema.parse(request.query);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const schedules = await prisma.schedule.findMany({
      where: {
        tenantId,
        status: { not: ScheduleStatus.CANCELLED },
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            noShowCount: true,
            lastVisitAt: true,
            createdAt: true
          }
        }
      }
    });

    // Mapeamento agregado por Cliente
    const clientAggMap = new Map<string, {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
      bookingsCount: number;
      totalSpent: number;
      lastVisitDate: string | null;
      noShowCount: number;
      createdAt: Date;
    }>();

    for (const sch of schedules) {
      if (!sch.client) continue;
      const c = sch.client;
      const existing = clientAggMap.get(c.id);

      const schPrice = Number(sch.totalPrice || 0);
      const schDateStr = sch.date ? sch.date.toISOString().slice(0, 10) : null;

      if (!existing) {
        clientAggMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          bookingsCount: 1,
          totalSpent: schPrice,
          lastVisitDate: schDateStr,
          noShowCount: c.noShowCount || 0,
          createdAt: c.createdAt
        });
      } else {
        existing.bookingsCount += 1;
        existing.totalSpent += schPrice;
        if (schDateStr && (!existing.lastVisitDate || schDateStr > existing.lastVisitDate)) {
          existing.lastVisitDate = schDateStr;
        }
      }
    }

    const now = new Date();
    const ranking = Array.from(clientAggMap.values()).map((c) => {
      const ticketMedio = c.bookingsCount > 0 ? c.totalSpent / c.bookingsCount : 0;
      
      let daysSinceLastVisit: number | null = null;
      if (c.lastVisitDate) {
        const lastDate = new Date(c.lastVisitDate);
        daysSinceLastVisit = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Classificação do perfil de fidelidade
      let fidelityStatus: 'VIP' | 'FREQUENT' | 'NEW' | 'AT_RISK' = 'NEW';
      if (daysSinceLastVisit !== null && daysSinceLastVisit >= 35) {
        fidelityStatus = 'AT_RISK';
      } else if (c.bookingsCount >= 3) {
        fidelityStatus = 'VIP';
      } else if (c.bookingsCount === 2) {
        fidelityStatus = 'FREQUENT';
      }

      return {
        ...c,
        totalSpent: Math.round(c.totalSpent * 100) / 100,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        daysSinceLastVisit,
        fidelityStatus
      };
    });

    // Ordenação padrão: Quem mais agendou (Frequência)
    const sortedByBookings = [...ranking].sort((a, b) => b.bookingsCount - a.bookingsCount || b.totalSpent - a.totalSpent);
    // Ordenação secundária: Quem mais gastou (LTV)
    const sortedBySpent = [...ranking].sort((a, b) => b.totalSpent - a.totalSpent || b.bookingsCount - a.bookingsCount);

    const vipCount = ranking.filter((c) => c.fidelityStatus === 'VIP').length;
    const atRiskCount = ranking.filter((c) => c.fidelityStatus === 'AT_RISK').length;
    const newClientsCount = ranking.filter((c) => c.fidelityStatus === 'NEW').length;

    return reply.send({
      rankingByBookings: sortedByBookings,
      rankingBySpent: sortedBySpent,
      totalActiveClientsInPeriod: ranking.length,
      metrics: {
        vipCount,
        atRiskCount,
        newClientsCount,
        mostFrequentClient: sortedByBookings[0] || null,
        highestSpenderClient: sortedBySpent[0] || null
      }
    });
  });

  // 3. GET /reports/schedules - Ocupação, Horários de Pico e Origem
  app.get('/schedules', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const { startDate, endDate, professionalId } = dateFilterSchema.parse(request.query);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const schedules = await prisma.schedule.findMany({
      where: {
        tenantId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        ...(professionalId ? { professionalId } : {})
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        source: true,
        totalPrice: true
      }
    });

    // Picos por dia da semana (0 = DOM, 1 = SEG ... 6 = SAB)
    const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayMap = weekdayLabels.map((label, idx) => ({
      dayOfWeek: idx,
      label,
      count: 0,
      revenue: 0
    }));

    // Picos por horário: Manhã (07-12h), Tarde (12-18h), Noite (18-23h)
    const timeBlocks = [
      { label: 'Manhã (07h - 12h)', count: 0, revenue: 0 },
      { label: 'Tarde (12h - 18h)', count: 0, revenue: 0 },
      { label: 'Noite (18h - 22h)', count: 0, revenue: 0 }
    ];

    // Origens de agendamento (Vitrine vs Manual vs Copiloto)
    const sourceMap: Record<string, { label: string; count: number }> = {
      ONLINE: { label: 'Vitrine Online', count: 0 },
      MANUAL_RECEPTION: { label: 'Balcão / Recepção', count: 0 },
      WHATSAPP_AI: { label: 'Copiloto IA / WhatsApp', count: 0 },
      WAITLIST_AUTOFILL: { label: 'Lista de Espera', count: 0 }
    };

    for (const sch of schedules) {
      if (sch.status === ScheduleStatus.CANCELLED) continue;
      const price = Number(sch.totalPrice || 0);

      // Dia da semana
      if (sch.date) {
        const dow = new Date(sch.date).getDay();
        if (weekdayMap[dow]) {
          weekdayMap[dow].count += 1;
          weekdayMap[dow].revenue += price;
        }
      }

      // Faixa de horário
      if (sch.startTime) {
        const hour = parseInt(sch.startTime.split(':')[0], 10);
        if (hour < 12) {
          timeBlocks[0].count += 1;
          timeBlocks[0].revenue += price;
        } else if (hour < 18) {
          timeBlocks[1].count += 1;
          timeBlocks[1].revenue += price;
        } else {
          timeBlocks[2].count += 1;
          timeBlocks[2].revenue += price;
        }
      }

      // Origem
      const src = sch.source || 'ONLINE';
      if (sourceMap[src]) {
        sourceMap[src].count += 1;
      }
    }

    return reply.send({
      weekdayDistribution: weekdayMap,
      timeBlocksDistribution: timeBlocks,
      bookingSources: Object.values(sourceMap)
    });
  });

  // 4. GET /reports/services - Procedimentos mais procurados e rentabilidade
  app.get('/services', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const { startDate, endDate } = dateFilterSchema.parse(request.query);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const schedules = await prisma.schedule.findMany({
      where: {
        tenantId,
        status: { not: ScheduleStatus.CANCELLED },
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            color: true,
            price: true,
            durationMinutes: true
          }
        }
      }
    });

    const serviceMap = new Map<string, {
      id: string;
      name: string;
      color: string;
      durationMinutes: number;
      count: number;
      revenue: number;
    }>();

    for (const sch of schedules) {
      if (!sch.service) continue;
      const s = sch.service;
      const price = Number(sch.totalPrice || s.price || 0);

      const existing = serviceMap.get(s.id);
      if (!existing) {
        serviceMap.set(s.id, {
          id: s.id,
          name: s.name,
          color: s.color || '#5c0701',
          durationMinutes: s.durationMinutes || 45,
          count: 1,
          revenue: price
        });
      } else {
        existing.count += 1;
        existing.revenue += price;
      }
    }

    const list = Array.from(serviceMap.values());
    const sortedByCount = [...list].sort((a, b) => b.count - a.count);
    const sortedByRevenue = [...list].sort((a, b) => b.revenue - a.revenue);

    return reply.send({
      rankingByVolume: sortedByCount,
      rankingByRevenue: sortedByRevenue
    });
  });

  // 5. GET /reports/financial - Entradas por Método, Sinais PIX, Despesas e Crediário
  app.get('/financial', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const { startDate, endDate } = dateFilterSchema.parse(request.query);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const [entries, creditAccounts, depositSchedules] = await Promise.all([
      prisma.financialEntry.findMany({
        where: {
          tenantId,
          ...(Object.keys(dateFilter).length > 0 ? { paidAt: dateFilter } : {})
        }
      }),
      prisma.creditAccount.findMany({
        where: { tenantId }
      }),
      prisma.schedule.findMany({
        where: {
          tenantId,
          depositPaid: true,
          depositAmount: { gt: 0 },
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        },
        select: { depositAmount: true }
      })
    ]);

    const methodsMap: Record<string, { label: string; amount: number; count: number }> = {
      PIX: { label: 'PIX', amount: 0, count: 0 },
      CREDIT_CARD: { label: 'Cartão de Crédito', amount: 0, count: 0 },
      DEBIT_CARD: { label: 'Cartão de Débito', amount: 0, count: 0 },
      CASH: { label: 'Dinheiro', amount: 0, count: 0 }
    };

    let totalIncome = 0;
    let totalExpense = 0;

    for (const e of entries) {
      const amt = Number(e.amount || 0);
      if (e.type === 'INCOME') {
        totalIncome += amt;
        const m = e.paymentMethod || 'PIX';
        if (methodsMap[m]) {
          methodsMap[m].amount += amt;
          methodsMap[m].count += 1;
        }
      } else if (e.type === 'EXPENSE') {
        totalExpense += amt;
      }
    }

    // Sinais PIX arrecadados
    const totalDeposits = depositSchedules.reduce((acc, s) => acc + Number(s.depositAmount || 0), 0);

    // Contas de Fiado / Crediário em aberto
    let openCreditTotal = 0;
    let partialCreditTotal = 0;
    for (const c of creditAccounts) {
      if (c.status === 'OPEN' || c.status === 'OVERDUE') {
        openCreditTotal += Number(c.remainingAmount || 0);
      } else if (c.status === 'PARTIAL') {
        partialCreditTotal += Number(c.remainingAmount || 0);
      }
    }

    return reply.send({
      totalIncome,
      totalExpense,
      netTotal: totalIncome - totalExpense,
      totalDeposits,
      paymentMethods: Object.values(methodsMap),
      creditAccounts: {
        totalReceivable: openCreditTotal + partialCreditTotal,
        openAmount: openCreditTotal,
        partialAmount: partialCreditTotal
      }
    });
  });

  // 6. GET /reports/team - Performance e Comissões por Profissional
  app.get('/team', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const { startDate, endDate } = dateFilterSchema.parse(request.query);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const [professionals, schedules] = await Promise.all([
      prisma.professional.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          color: true,
          commissionRate: true
        }
      }),
      prisma.schedule.findMany({
        where: {
          tenantId,
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        },
        select: {
          id: true,
          professionalId: true,
          status: true,
          totalPrice: true
        }
      })
    ]);

    const teamReport = professionals.map((prof) => {
      const profSchedules = schedules.filter((s) => s.professionalId === prof.id);
      const completed = profSchedules.filter((s) => s.status === ScheduleStatus.COMPLETED);
      const cancelled = profSchedules.filter((s) => s.status === ScheduleStatus.CANCELLED);

      const grossRevenue = completed.reduce((acc, s) => acc + Number(s.totalPrice || 0), 0);
      const commissionRate = Number(prof.commissionRate || 0);
      const estimatedCommission = commissionRate > 0 ? (grossRevenue * commissionRate) / 100 : 0;
      const completionRate = profSchedules.length > 0 ? Math.round((completed.length / profSchedules.length) * 100) : 0;

      return {
        id: prof.id,
        name: prof.name,
        role: prof.role || 'Profissional',
        color: prof.color || '#5c0701',
        totalBookings: profSchedules.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        commissionRate,
        estimatedCommission: Math.round(estimatedCommission * 100) / 100,
        completionRate
      };
    });

    teamReport.sort((a, b) => b.grossRevenue - a.grossRevenue);

    return reply.send({ team: teamReport });
  });

  // 7. GET /reports/products - Venda de cosméticos e estoque
  app.get('/products', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { stockQuantity: 'asc' }
    });

    const lowStockAlerts = products.filter((p) => p.stockQuantity <= (p.minStock || 2));
    const totalInventoryValue = products.reduce((acc, p) => acc + (Number(p.salePrice || 0) * (p.stockQuantity || 0)), 0);

    return reply.send({
      totalProducts: products.length,
      lowStockCount: lowStockAlerts.length,
      lowStockProducts: lowStockAlerts.map((p) => ({
        id: p.id,
        name: p.name,
        stockQuantity: p.stockQuantity,
        minStock: p.minStock,
        price: Number(p.salePrice)
      })),
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100
    });
  });

  // 8. GET /reports/courses - Matrículas e Alunas
  app.get('/courses', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const courses = await prisma.course.findMany({
      where: { tenantId },
      include: {
        accesses: {
          select: {
            id: true,
            completedAt: true,
            phone: true
          }
        }
      }
    });

    let totalStudents = 0;
    let completedStudents = 0;

    for (const c of courses) {
      totalStudents += c.accesses.length;
      completedStudents += c.accesses.filter((a) => a.completedAt !== null).length;
    }

    return reply.send({
      totalCourses: courses.length,
      totalStudents,
      completedStudents,
      coursesSummary: courses.map((c) => ({
        id: c.id,
        title: c.title,
        price: Number(c.price || 0),
        studentsCount: c.accesses.length
      }))
    });
  });

  // 9. GET /reports/reputation - Satisfação e NPS
  app.get('/reputation', async (request, reply) => {
    const tenantId = await enforceProGuard(request, reply);
    if (!tenantId) return;

    const npsSchedules = await prisma.schedule.findMany({
      where: {
        tenantId,
        npsScore: { not: null }
      },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } }
      },
      orderBy: { date: 'desc' },
      take: 20
    });

    const starCounts = [0, 0, 0, 0, 0]; // 1, 2, 3, 4, 5 estrelas
    let totalScore = 0;

    for (const s of npsSchedules) {
      if (s.npsScore && s.npsScore >= 1 && s.npsScore <= 5) {
        starCounts[s.npsScore - 1] += 1;
        totalScore += s.npsScore;
      }
    }

    const reviewsCount = npsSchedules.length;
    const averageScore = reviewsCount > 0 ? totalScore / reviewsCount : 5.0;

    return reply.send({
      averageScore: Math.round(averageScore * 10) / 10,
      totalReviews: reviewsCount,
      starDistribution: [
        { stars: 5, count: starCounts[4] },
        { stars: 4, count: starCounts[3] },
        { stars: 3, count: starCounts[2] },
        { stars: 2, count: starCounts[1] },
        { stars: 1, count: starCounts[0] }
      ],
      recentReviews: npsSchedules.map((s) => ({
        id: s.id,
        score: s.npsScore,
        feedback: s.npsFeedback,
        clientName: s.client?.name || 'Cliente',
        serviceName: s.service?.name || 'Atendimento',
        date: s.date ? s.date.toISOString().slice(0, 10) : null
      }))
    });
  });
};
