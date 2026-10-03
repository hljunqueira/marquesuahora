import { Worker, Job } from 'bullmq';
import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { EvolutionService } from '../evolution.service';

export interface WhatsAppJobData {
  scheduleId: string;
  type: 'IMMEDIATE_CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_12H';
}

export const whatsappWorker = new Worker<WhatsAppJobData>(
  'whatsapp-queue',
  async (job: Job<WhatsAppJobData>) => {
    const { scheduleId, type } = job.data;

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        tenant: true,
        client: true,
        professional: true,
        service: true
      }
    });

    if (!schedule || schedule.status === 'CANCELLED') {
      return { skipped: true, reason: 'Agendamento não encontrado ou cancelado' };
    }

    const { tenant, client, professional, service } = schedule;
    const formattedDate = new Date(schedule.date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });

    if (type === 'IMMEDIATE_CONFIRMATION') {
      const addressDisplay = tenant.addressStreet
        ? `${tenant.addressStreet}, ${tenant.addressNumber} - ${tenant.addressNeighborhood}, ${tenant.addressCity}`
        : 'Consulte nossa recepção';

      const message = `Olá, ${client.name}. Seu horário no ${tenant.name} está confirmado.\n\nData: ${formattedDate}\nHorário: ${schedule.startTime}\nServiço: ${service.name}\nProfissional: ${professional.name}\nEndereço: ${addressDisplay}\n\nSe precisar remarcar, basta responder por aqui. Até logo!`;

      await EvolutionService.sendTextMessage(tenant.id, client.phone, message);

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { whatsappSentAt: new Date() }
      });

      return { sent: true, type };
    }

    if (type === 'REMINDER_24H') {
      const message = `Olá, ${client.name}. Lembramos do seu horário amanhã no ${tenant.name}:\n\nHorário: ${schedule.startTime}\nServiço: ${service.name}\nProfissional: ${professional.name}\n\nPodemos confirmar sua presença?\nResponda 1 para confirmar ou 2 se precisar remarcar.`;

      await EvolutionService.sendTextMessage(tenant.id, client.phone, message);

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { reminder24hSentAt: new Date() }
      });

      return { sent: true, type };
    }

    if (type === 'REMINDER_12H') {
      const message = `Olá, ${client.name}. Seu atendimento no ${tenant.name} é hoje às ${schedule.startTime} com ${professional.name}. Se tiver qualquer imprevisto, avise por aqui.`;

      await EvolutionService.sendTextMessage(tenant.id, client.phone, message);

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { reminder12hSentAt: new Date() }
      });

      return { sent: true, type };
    }

    return { sent: false };
  },
  {
    connection: redis,
    concurrency: 5
  }
);
