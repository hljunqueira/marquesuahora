import { Worker, Job } from 'bullmq';
import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { EvolutionService } from '../evolution.service';

export interface WaitlistAutoFillData {
  tenantId: string;
  dateStr: string; // 'YYYY-MM-DD'
  startTime: string; // '14:30'
  serviceId?: string;
  professionalId?: string;
}

export const waitlistWorker = new Worker<WaitlistAutoFillData>(
  'waitlist-queue',
  async (job: Job<WaitlistAutoFillData>) => {
    const { tenantId, dateStr, startTime, serviceId, professionalId } = job.data;

    const targetDate = new Date(`${dateStr}T00:00:00`);

    // Busca o primeiro cliente da fila de espera disponível para esta data
    const candidate = await prisma.waitlistEntry.findFirst({
      where: {
        tenantId,
        date: targetDate,
        status: 'WAITING',
        ...(serviceId ? { OR: [{ serviceId: null }, { serviceId }] } : {}),
        ...(professionalId ? { OR: [{ professionalId: null }, { professionalId }] } : {})
      },
      include: {
        client: true,
        tenant: true,
        service: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!candidate) {
      return { filled: false, reason: 'Nenhum cliente na lista de espera para esta data.' };
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Janela exclusiva de 10 minutos

    await prisma.waitlistEntry.update({
      where: { id: candidate.id },
      data: {
        status: 'NOTIFIED',
        notifiedAt: new Date(),
        expiresAt
      }
    });

    const message = `Olá, ${candidate.client.name}! ✨\n\nUma vaga acabou de abrir no *${candidate.tenant.name}* para *${dateStr}* às *${startTime}*.\n\nComo você estava na nossa lista de espera, este horário está reservado exclusivamente para você pelos próximos *10 minutos*.\n\nResponda *SIM* para confirmar agora e garantir seu atendimento!`;

    await EvolutionService.sendTextMessage(candidate.tenant.id, candidate.client.phone, message);

    return {
      filled: true,
      waitlistEntryId: candidate.id,
      clientPhone: candidate.client.phone,
      expiresAt
    };
  },
  {
    connection: redis,
    concurrency: 2
  }
);
