import { Worker, Job } from 'bullmq';
import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { EvolutionService } from '../evolution.service';

export interface BirthdayJobData {
  tenantId?: string;
}

export const birthdayWorker = new Worker<BirthdayJobData>(
  'birthday-queue',
  async (job: Job<BirthdayJobData>) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();

    // Busca clientes aniversariantes do dia
    const clients = await prisma.client.findMany({
      where: {
        notifyBirthday: true,
        birthday: { not: null },
        ...(job.data?.tenantId ? { tenantId: job.data.tenantId } : {})
      },
      include: {
        tenant: true
      }
    });

    let sentCount = 0;

    for (const client of clients) {
      if (!client.birthday) continue;

      const birthDate = new Date(client.birthday);
      const isBirthdayToday =
        birthDate.getUTCDate() === currentDay &&
        birthDate.getUTCMonth() + 1 === currentMonth;

      if (!isBirthdayToday) continue;

      // Trava para evitar reenvio no mesmo ano
      if (client.lastBirthdayGreetingYear === currentYear) {
        continue;
      }

      // Se o salão desativou felicitações, respeita
      if (client.tenant.birthdayMessageEnabled === false) {
        continue;
      }

      // Mensagem padrão Humanizer (sem presentes ou descontos forçados)
      const message =
        client.tenant.birthdayMessageCustom ||
        `Olá, ${client.name}! 🎂\n\nPassando para desejar um feliz aniversário! Que o seu novo ciclo seja repleto de momentos leves, muita saúde e boas realizações.\n\nUm abraço carinhoso de toda a equipe do *${client.tenant.name}*!`;

      await EvolutionService.sendTextMessage(client.tenant.id, client.phone, message);

      await prisma.client.update({
        where: { id: client.id },
        data: { lastBirthdayGreetingYear: currentYear }
      });

      sentCount++;
    }

    return { processed: clients.length, sentCount };
  },
  {
    connection: redis,
    concurrency: 2
  }
);
