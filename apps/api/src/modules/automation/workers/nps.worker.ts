import { Worker, Job } from 'bullmq';
import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { EvolutionService } from '../evolution.service';

export interface NpsJobData {
  scheduleId: string;
}

export const npsWorker = new Worker<NpsJobData>(
  'nps-queue',
  async (job: Job<NpsJobData>) => {
    const { scheduleId } = job.data;

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        tenant: true,
        client: true,
        professional: true,
        service: true
      }
    });

    if (!schedule || schedule.status !== 'COMPLETED') {
      return { skipped: true, reason: 'Atendimento não finalizado ou inexistente' };
    }

    if (schedule.npsSentAt) {
      return { skipped: true, reason: 'Pesquisa NPS já enviada anteriormente' };
    }

    if (!schedule.tenant.npsFeedbackEnabled) {
      return { skipped: true, reason: 'Pesquisa NPS desativada nas configurações do salão' };
    }

    const message = `Olá, ${schedule.client.name}! ✨\n\nEsperamos que tenha tido uma excelente experiência com ${schedule.professional.name} no *${schedule.tenant.name}*!\n\nDe 1 a 5 estrelas, como você avalia o seu atendimento de hoje?\n\n(Basta responder com o número correspondente de *1* a *5*)`;

    await EvolutionService.sendTextMessage(schedule.tenant.id, schedule.client.phone, message);

    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { npsSentAt: new Date() }
    });

    return { sent: true, scheduleId: schedule.id };
  },
  {
    connection: redis,
    concurrency: 3
  }
);
