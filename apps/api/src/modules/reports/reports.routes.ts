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
      currentPlan: tenant?.plan?.code || 'FREE',
      currentPlanCode: tenant?.plan?.code || 'FREE',
      currentPlanName: tenant?.plan?.name || 'Plano Básico',
      requiredPlan: 'EQUIPE_PRO',
      tenantName: tenant?.name || 'MarqueSuaHora',
      tenantPrimaryColor: tenant?.primaryColor || '#5c0701'
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
          clientId: true,
          client: {
            select: { id: true, name: true }
          }
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

    // Sinais PIX retidos
    let antiNoShowTotal = 0;
    for (const s of schedules) {
      if (s.depositPaid && Number(s.depositAmount || 0) > 0) {
        antiNoShowTotal += Number(s.depositAmount || 0);
      }
    }

    // Cliente Campeão (quem mais agendou ou mais investiu no período)
    const clientAggMap = new Map<string, { name: string; bookings: number; spent: number }>();
    for (const s of activeSchedules) {
      if (!s.client) continue;
      const existing = clientAggMap.get(s.clientId);
      const price = Number(s.totalPrice || 0);
      if (!existing) {
        clientAggMap.set(s.clientId, { name: s.client.name, bookings: 1, spent: price });
      } else {
        existing.bookings += 1;
        existing.spent += price;
      }
    }

    let topClient: { name: string; bookings: number; spent: number } | null = null;
    if (clientAggMap.size > 0) {
      const sorted = Array.from(clientAggMap.values()).sort(
        (a, b) => b.bookings - a.bookings || b.spent - a.spent
      );
      topClient = sorted[0];
    }

    // Faturamento financeiro total (entradas) e saídas
    let totalIncome = 0;
    let totalExpense = 0;
    for (const f of financialEntries) {
      const val = Number(f.amount || 0);
      if (f.type === 'INCOME') totalIncome += val;
      else if (f.type === 'EXPENSE') totalExpense += val;
    }

    const netRevenue = (totalIncome > 0 ? totalIncome : scheduleGrossRevenue) - totalExpense;
    const ticketMedio =
      completedCount > 0
        ? scheduleGrossRevenue / completedCount
        : totalBookings > 0
          ? scheduleGrossRevenue / totalBookings
          : 0;
    const attendanceRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;
    const noShowRate = totalBookings > 0 ? Math.round((noShowCount / totalBookings) * 100) : 0;

    // Clientes únicas no período
    const uniqueClientsInPeriod = new Set(schedules.map((s) => s.clientId)).size;

    const avgNps = npsResult?._avg?.npsScore;
    const countNps = npsResult?._count?._all || 0;

    return reply.send({
      // Ambos formatos para compatibilidade perfeita com qualquer componente
      grossRevenue: Math.round(scheduleGrossRevenue * 100) / 100,
      totalRevenue: Math.round(scheduleGrossRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalBookings,
      totalSchedules: totalBookings,
      completedCount,
      completedSchedules: completedCount,
      cancelledCount,
      noShowCount,
      ticketMedio: Math.round(ticketMedio * 100) / 100,
      attendanceRate,
      completionRate: attendanceRate,
      noShowRate,
      uniqueClientsInPeriod,
      totalRegisteredClients: clientsCount,
      topClient: topClient || { name: 'Nenhum', bookings: 0, spent: 0 },
      antiNoShowTotal: Math.round(antiNoShowTotal * 100) / 100,
      npsScore: countNps > 0 && avgNps ? Math.round(avgNps * 10) / 10 : 0,
      npsAverage: countNps > 0 && avgNps ? Math.round(avgNps * 10) / 10 : 0,
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
    const clientAggMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        email?: string | null;
        bookingsCount: number;
        totalSpent: number;
        lastVisitDate: string | null;
        noShowCount: number;
        createdAt: Date;
      }
    >();

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
        totalBookings: c.bookingsCount,
        completedBookings: c.bookingsCount,
        cancelledBookings: 0,
        totalSpent: Math.round(c.totalSpent * 100) / 100,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        averageTicket: Math.round(ticketMedio * 100) / 100,
        lastBookingDate: c.lastVisitDate,
        daysSinceLastVisit,
        fidelityStatus
      };
    });

    // Ordenação padrão: Quem mais agendou (Frequência)
    const sortedByBookings = [...ranking].sort(
      (a, b) => b.bookingsCount - a.bookingsCount || b.totalSpent - a.totalSpent
    );
    // Ordenação secundária: Quem mais gastou (LTV)
    const sortedBySpent = [...ranking].sort(
      (a, b) => b.totalSpent - a.totalSpent || b.bookingsCount - a.bookingsCount
    );

    const totalClientsCount = await prisma.client.count({ where: { tenantId } });
    const vipCount = ranking.filter((c) => c.fidelityStatus === 'VIP').length;
    const atRiskCount = ranking.filter((c) => c.fidelityStatus === 'AT_RISK').length;
    const frequentCount = ranking.filter((c) => c.fidelityStatus === 'FREQUENT' || c.fidelityStatus === 'VIP').length;
    const totalSpentSum = ranking.reduce((acc, c) => acc + c.totalSpent, 0);
    const averageLtv = ranking.length > 0 ? Math.round((totalSpentSum / ranking.length) * 100) / 100 : 0;

    return reply.send({
      summary: {
        totalClients: totalClientsCount,
        activeInPeriod: ranking.length,
        frequentCount: frequentCount || vipCount,
        atRiskCount,
        averageLtv
      },
      rankingByBookings: sortedByBookings,
      rankingBySpent: sortedBySpent,
      allClients: sortedByBookings,
      totalActiveClientsInPeriod: ranking.length,
      metrics: {
        vipCount,
        atRiskCount,
        newClientsCount: ranking.filter((c) => c.fidelityStatus === 'NEW').length,
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
        totalPrice: true,
        depositAmount: true,
        depositPaid: true
      }
    });

    // Picos por dia da semana (0 = DOM, 1 = SEG ... 6 = SAB)
    const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayMap = weekdayLabels.map((label, idx) => ({
      dayOfWeek: idx,
      day: label,
      label,
      count: 0,
      revenue: 0
    }));

    // Picos por horário: Manhã (07-12h), Tarde (12-18h), Noite (18-23h)
    const timeBlocks = [
      { bracket: 'Manhã (07h - 12h)', label: 'Manhã (07h - 12h)', count: 0, revenue: 0 },
      { bracket: 'Tarde (12h - 18h)', label: 'Tarde (12h - 18h)', count: 0, revenue: 0 },
      { bracket: 'Noite (18h - 22h)', label: 'Noite (18h - 22h)', count: 0, revenue: 0 }
    ];

    // Origens de agendamento (Vitrine vs Manual vs Copiloto)
    const sourceMap: Record<string, { source: string; label: string; count: number; percentage: number }> = {
      ONLINE: { source: 'ONLINE', label: 'Vitrine Online', count: 0, percentage: 0 },
      MANUAL_RECEPTION: { source: 'MANUAL_RECEPTION', label: 'Balcão / Recepção', count: 0, percentage: 0 },
      WHATSAPP_AI: { source: 'WHATSAPP_AI', label: 'Copiloto IA / WhatsApp', count: 0, percentage: 0 },
      WAITLIST_AUTOFILL: { source: 'WAITLIST_AUTOFILL', label: 'Lista de Espera', count: 0, percentage: 0 }
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

    const totalSchedules = schedules.length;
    const completed = schedules.filter((s) => s.status === ScheduleStatus.COMPLETED).length;
    const cancelled = schedules.filter((s) => s.status === ScheduleStatus.CANCELLED).length;
    const noShow = schedules.filter((s) => s.status === ScheduleStatus.NO_SHOW).length;
    const completionRate = totalSchedules > 0 ? Math.round((completed / totalSchedules) * 100) : 0;
    const cancellationRate = totalSchedules > 0 ? Math.round((cancelled / totalSchedules) * 100) : 0;

    const activeCount = totalSchedules - cancelled;
    for (const k of Object.keys(sourceMap)) {
      sourceMap[k].percentage = activeCount > 0 ? Math.round((sourceMap[k].count / activeCount) * 100) : 0;
    }

    const protectedBookings = schedules.filter((s) => s.depositPaid && Number(s.depositAmount || 0) > 0).length;
    const totalDepositHeld = schedules.reduce(
      (acc, s) => acc + (s.depositPaid ? Number(s.depositAmount || 0) : 0),
      0
    );

    return reply.send({
      summary: {
        totalSchedules,
        completed,
        cancelled,
        noShow,
        completionRate,
        cancellationRate
      },
      byDayOfWeek: weekdayMap.map((w) => ({
        day: w.label,
        count: w.count,
        revenue: Math.round(w.revenue * 100) / 100
      })),
      byTimeBracket: timeBlocks.map((t) => ({
        bracket: t.label,
        count: t.count,
        revenue: Math.round(t.revenue * 100) / 100
      })),
      bySource: Object.values(sourceMap),
      antiNoShowStats: {
        protectedBookings,
        totalDepositHeld: Math.round(totalDepositHeld * 100) / 100
      },
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

    const serviceMap = new Map<
      string,
      {
        id: string;
        name: string;
        color: string;
        durationMinutes: number;
        count: number;
        revenue: number;
      }
    >();

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

    const totalServicesSold = list.reduce((acc, s) => acc + s.count, 0);
    const totalRevenue = list.reduce((acc, s) => acc + s.revenue, 0);
    const totalDurationMinutes = list.reduce((acc, s) => acc + s.count * s.durationMinutes, 0);
    const totalHoursDelivered = Math.round((totalDurationMinutes / 60) * 10) / 10;
    const averageTicket =
      totalServicesSold > 0 ? Math.round((totalRevenue / totalServicesSold) * 100) / 100 : 0;

    const mapService = (s: any) => ({
      id: s.id,
      name: s.name,
      category: null,
      color: s.color,
      count: s.count,
      totalRevenue: s.revenue,
      revenue: s.revenue,
      averagePrice: s.count > 0 ? Math.round((s.revenue / s.count) * 100) / 100 : 0,
      durationMinutes: s.durationMinutes,
      totalDurationMinutes: s.count * s.durationMinutes
    });

    return reply.send({
      summary: {
        totalServicesSold,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageTicket,
        totalHoursDelivered
      },
      rankingByVolume: sortedByCount.map(mapService),
      rankingByRevenue: sortedByRevenue.map(mapService)
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

    const [entries, creditAccounts, depositSchedules, periodSchedules] = await Promise.all([
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
      }),
      prisma.schedule.findMany({
        where: {
          tenantId,
          status: { not: ScheduleStatus.CANCELLED },
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        },
        select: { totalPrice: true }
      })
    ]);

    const methodsMap: Record<string, { method: string; label: string; amount: number; count: number }> = {
      PIX: { method: 'PIX', label: 'PIX', amount: 0, count: 0 },
      CREDIT_CARD: { method: 'CREDIT_CARD', label: 'Cartão de Crédito', amount: 0, count: 0 },
      DEBIT_CARD: { method: 'DEBIT_CARD', label: 'Cartão de Débito', amount: 0, count: 0 },
      CASH: { method: 'CASH', label: 'Dinheiro', amount: 0, count: 0 }
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

    // Se não há entradas manuais em FinancialEntry, usa faturamento dos agendamentos
    const scheduleRevenue = periodSchedules.reduce((acc, s) => acc + Number(s.totalPrice || 0), 0);
    const effectiveGrossRevenue = totalIncome > 0 ? totalIncome : scheduleRevenue;
    if (totalIncome === 0 && scheduleRevenue > 0) {
      methodsMap.PIX.amount = scheduleRevenue;
      methodsMap.PIX.count = periodSchedules.length;
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

    const totalMethodAmount = Object.values(methodsMap).reduce((acc, m) => acc + m.amount, 0);
    const byMethod = Object.entries(methodsMap).map(([k, m]) => ({
      method: k,
      label: m.label,
      amount: Math.round(m.amount * 100) / 100,
      percentage: totalMethodAmount > 0 ? Math.round((m.amount / totalMethodAmount) * 100) : 0
    }));

    const incomeCount = entries.filter((e) => e.type === 'INCOME').length;
    const effectiveTransactions = incomeCount > 0 ? incomeCount : periodSchedules.length;
    const averageTicket = effectiveTransactions > 0 ? Math.round((effectiveGrossRevenue / effectiveTransactions) * 100) / 100 : 0;

    return reply.send({
      summary: {
        grossRevenue: Math.round(effectiveGrossRevenue * 100) / 100,
        netEstimatedRevenue: Math.round((effectiveGrossRevenue - totalExpense) * 100) / 100,
        totalTransactions: entries.length > 0 ? entries.length : periodSchedules.length,
        averageTicket
      },
      byMethod,
      antiNoShowStats: {
        depositCollected: Math.round(totalDeposits * 100) / 100,
        depositCount: depositSchedules.length,
        noShowsAvoidedEstimatedValue: Math.round(totalDeposits * 2 * 100) / 100
      },
      creditAccounts: {
        totalDebtOpen: Math.round((openCreditTotal + partialCreditTotal) * 100) / 100,
        totalPaidInPeriod: 0,
        activeDebtorsCount: creditAccounts.filter(
          (c) => c.status === 'OPEN' || c.status === 'OVERDUE' || c.status === 'PARTIAL'
        ).length,
        totalReceivable: Math.round((openCreditTotal + partialCreditTotal) * 100) / 100,
        openAmount: Math.round(openCreditTotal * 100) / 100,
        partialAmount: Math.round(partialCreditTotal * 100) / 100
      },
      totalIncome: Math.round(effectiveGrossRevenue * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netTotal: Math.round((effectiveGrossRevenue - totalExpense) * 100) / 100,
      totalDeposits: Math.round(totalDeposits * 100) / 100,
      paymentMethods: Object.values(methodsMap)
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

    const [professionalsList, schedules] = await Promise.all([
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

    const teamReport = professionalsList.map((prof) => {
      const profSchedules = schedules.filter((s) => s.professionalId === prof.id);
      const completed = profSchedules.filter((s) => s.status === ScheduleStatus.COMPLETED);
      const cancelled = profSchedules.filter((s) => s.status === ScheduleStatus.CANCELLED);

      const grossRevenue = completed.reduce((acc, s) => acc + Number(s.totalPrice || 0), 0);
      const commissionRate = Number(prof.commissionRate || 0);
      const estimatedCommission = commissionRate > 0 ? (grossRevenue * commissionRate) / 100 : 0;
      const completionRate =
        profSchedules.length > 0 ? Math.round((completed.length / profSchedules.length) * 100) : 0;

      return {
        id: prof.id,
        name: prof.name,
        role: prof.role || 'Profissional',
        color: prof.color || '#5c0701',
        avatarUrl: null,
        totalAppointments: profSchedules.length,
        totalBookings: profSchedules.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        commissionRate,
        commissionEarned: Math.round(estimatedCommission * 100) / 100,
        estimatedCommission: Math.round(estimatedCommission * 100) / 100,
        salonNetRevenue: Math.round((grossRevenue - estimatedCommission) * 100) / 100,
        completionRate
      };
    });

    teamReport.sort((a, b) => b.grossRevenue - a.grossRevenue);

    const activeProfessionals = teamReport.filter((p) => p.totalBookings > 0).length;
    const totalTeamRevenue = teamReport.reduce((acc, p) => acc + p.grossRevenue, 0);
    const totalCommissionsDue = teamReport.reduce((acc, p) => acc + p.estimatedCommission, 0);
    const salonRetainedRevenue = totalTeamRevenue - totalCommissionsDue;

    return reply.send({
      summary: {
        activeProfessionals,
        totalTeamRevenue: Math.round(totalTeamRevenue * 100) / 100,
        totalCommissionsDue: Math.round(totalCommissionsDue * 100) / 100,
        salonRetainedRevenue: Math.round(salonRetainedRevenue * 100) / 100
      },
      professionals: teamReport,
      team: teamReport
    });
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
    const totalInventoryValue = products.reduce(
      (acc, p) => acc + Number(p.salePrice || 0) * (p.stockQuantity || 0),
      0
    );

    const mapProduct = (p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category || 'Geral',
      salePrice: Number(p.salePrice || 0),
      stock: p.stockQuantity || 0,
      minStock: p.minStock || 0,
      totalSoldInPeriod: 0,
      revenueInPeriod: 0,
      isLowStock: (p.stockQuantity || 0) <= (p.minStock || 2)
    });

    const mappedLowStock = lowStockAlerts.map(mapProduct);
    const mappedTop = products.map(mapProduct).slice(0, 10);

    return reply.send({
      summary: {
        totalProducts: products.length,
        totalStockValuation: Math.round(totalInventoryValue * 100) / 100,
        totalItemsSold: 0,
        totalProductRevenue: 0,
        lowStockAlertCount: lowStockAlerts.length
      },
      topSold: mappedTop,
      lowStockList: mappedLowStock,
      totalProducts: products.length,
      lowStockCount: lowStockAlerts.length,
      lowStockProducts: mappedLowStock,
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

    const averageCompletionRate =
      totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;

    const mappedCourses = courses.map((c) => {
      const tStudents = c.accesses.length;
      const cStudents = c.accesses.filter((a) => a.completedAt !== null).length;
      return {
        id: c.id,
        title: c.title,
        category: null,
        totalStudents: tStudents,
        completedStudents: cStudents,
        completionRate: tStudents > 0 ? Math.round((cStudents / tStudents) * 100) : 0
      };
    });

    return reply.send({
      summary: {
        totalCourses: courses.length,
        totalEnrollments: totalStudents,
        totalCompletions: completedStudents,
        averageCompletionRate
      },
      courses: mappedCourses,
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

    const { startDate, endDate, professionalId } = dateFilterSchema.parse(request.query);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const npsSchedules = await prisma.schedule.findMany({
      where: {
        tenantId,
        npsScore: { not: null },
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        ...(professionalId ? { professionalId } : {})
      },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } }
      },
      orderBy: { date: 'desc' },
      take: 50
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
    const averageScore = reviewsCount > 0 ? totalScore / reviewsCount : 0;

    const promotersCount = starCounts[4] + starCounts[3]; // 5 e 4 estrelas
    const passivesCount = starCounts[2]; // 3 estrelas
    const detractorsCount = starCounts[1] + starCounts[0]; // 2 e 1 estrelas
    const promoterPercentage = reviewsCount > 0 ? Math.round((promotersCount / reviewsCount) * 100) : 0;
    const passivePercentage = reviewsCount > 0 ? Math.round((passivesCount / reviewsCount) * 100) : 0;
    const detractorPercentage = reviewsCount > 0 ? Math.round((detractorsCount / reviewsCount) * 100) : 0;
    const npsScore = reviewsCount > 0 ? promoterPercentage - detractorPercentage : 0;

    const recentFeedbacks = npsSchedules.map((s) => ({
      id: s.id,
      score: s.npsScore || 5,
      feedback: s.npsFeedback,
      clientName: s.client?.name || 'Cliente',
      serviceName: s.service?.name || 'Atendimento',
      date: s.date ? s.date.toISOString().slice(0, 10) : ''
    }));

    return reply.send({
      summary: {
        npsScore,
        averageRating: Math.round(averageScore * 10) / 10,
        totalEvaluations: reviewsCount,
        promotersCount,
        passivesCount,
        detractorsCount,
        promoterPercentage,
        passivePercentage,
        detractorPercentage
      },
      recentFeedbacks,
      averageScore: Math.round(averageScore * 10) / 10,
      totalReviews: reviewsCount,
      starDistribution: [
        { stars: 5, count: starCounts[4] },
        { stars: 4, count: starCounts[3] },
        { stars: 3, count: starCounts[2] },
        { stars: 2, count: starCounts[1] },
        { stars: 1, count: starCounts[0] }
      ],
      recentReviews: recentFeedbacks
    });
  });
};
