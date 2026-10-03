import { Worker, Job } from 'bullmq';
import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { EvolutionService } from '../evolution.service';

export interface ChurnRecoveryJobData {
  tenantId?: string;
}

export const churnWorker = new Worker<ChurnRecoveryJobData>(
  'churn-queue',
  async (job: Job<ChurnRecoveryJobData>) => {
    const tenants = await prisma.tenant.findMany({
      where: {
        churnRecoveryEnabled: true,
        ...(job.data?.tenantId ? { id: job.data.tenantId } : {})
      }
    });

    let recoveredCount = 0;
    const now = new Date();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    for (const tenant of tenants) {
      const alertThresholdDays = tenant.churnAlertDays || 45;

      const clients = await prisma.client.findMany({
        where: {
          tenantId: tenant.id,
          lastVisitAt: { not: null },
          isBlockedOnline: false,
          OR: [
            { lastChurnAlertSentAt: null },
            { lastChurnAlertSentAt: { lte: sixtyDaysAgo } }
          ]
        }
      });

      for (const client of clients) {
        if (!client.lastVisitAt) continue;

        const visitDaysLimit = client.avgVisitDays || alertThresholdDays;
        const daysSinceLastVisit = Math.floor(
          (now.getTime() - new Date(client.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastVisit >= visitDaysLimit) {
          const message = `Olá, ${client.name}! ✨\n\nSentimos sua falta por aqui no *${tenant.name}*. Quando desejar reservar um momento para cuidar de você, será uma alegria receber sua visita!\n\nVocê pode consultar os horários livres da nossa equipe diretamente aqui: marquesuahora.com.br/${tenant.slug}\n\nUm grande abraço de toda a nossa equipe!`;

          await EvolutionService.sendTextMessage(tenant.id, client.phone, message);

          await prisma.client.update({
            where: { id: client.id },
            data: { lastChurnAlertSentAt: now }
          });

          recoveredCount++;
        }
      }
    }

    return { processedTenants: tenants.length, messagesSent: recoveredCount };
  },
  {
    connection: redis,
    concurrency: 2
  }
);
