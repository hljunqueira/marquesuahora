import { Worker, Job } from 'bullmq';
import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { NotificationDispatcherService } from '../../notifications/dispatcher.service';

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
        service: true,
        items: {
          include: {
            service: true
          }
        }
      }
    });

    if (!schedule || schedule.status === 'CANCELLED') {
      return { skipped: true, reason: 'Agendamento não encontrado ou cancelado' };
    }

    const { tenant, client, professional, service, items } = schedule;
    const dateStr = schedule.date instanceof Date ? schedule.date.toISOString().slice(0, 10) : String(schedule.date).slice(0, 10);
    const [year, month, day] = dateStr.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const serviceNames = items && items.length > 0
      ? items.map((it: any) => it.service?.name).filter(Boolean).join(', ')
      : service.name;

    if (type === 'IMMEDIATE_CONFIRMATION') {
      // 1. Mensagem oficial de confirmação para a cliente usando o template do estabelecimento
      await NotificationDispatcherService.dispatch({
        tenantId: tenant.id,
        trigger: 'BOOKING_CONFIRMATION_CLIENT',
        scheduleId: schedule.id,
        data: {
          clientName: client.name,
          clientFirstName: client.name.trim().split(' ')[0],
          clientPhone: client.phone,
          clientEmail: client.email || undefined,
          serviceName: serviceNames,
          professionalName: professional.name,
          date: formattedDate,
          time: schedule.startTime,
          duration: `${schedule.totalDurationMinutes} min`,
          price: Number(schedule.totalPrice || service.price).toFixed(2)
        }
      });

      // 2. Se o agendamento foi realizado pela cliente (Vitrine Online ou WhatsApp IA), notifica a equipe
      if (schedule.source === 'ONLINE' || schedule.source === 'WHATSAPP_AI') {
        await NotificationDispatcherService.dispatch({
          tenantId: tenant.id,
          trigger: 'BOOKING_NEW_TEAM',
          scheduleId: schedule.id,
          data: {
            clientName: client.name,
            clientFirstName: client.name.trim().split(' ')[0],
            clientPhone: client.phone,
            serviceName: serviceNames,
            professionalName: professional.name,
            professionalPhone: professional.phone || undefined,
            date: formattedDate,
            time: schedule.startTime,
            duration: `${schedule.totalDurationMinutes} min`,
            price: Number(schedule.totalPrice || service.price).toFixed(2)
          }
        });
      }

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { whatsappSentAt: new Date() }
      });

      return { sent: true, type };
    }

    if (type === 'REMINDER_24H') {
      await NotificationDispatcherService.dispatch({
        tenantId: tenant.id,
        trigger: 'BOOKING_REMINDER_CLIENT',
        scheduleId: schedule.id,
        data: {
          clientName: client.name,
          clientFirstName: client.name.trim().split(' ')[0],
          clientPhone: client.phone,
          clientEmail: client.email || undefined,
          serviceName: serviceNames,
          professionalName: professional.name,
          date: formattedDate,
          time: schedule.startTime,
          duration: `${schedule.totalDurationMinutes} min`
        }
      });

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { reminder24hSentAt: new Date() }
      });

      return { sent: true, type };
    }

    if (type === 'REMINDER_12H') {
      await NotificationDispatcherService.dispatch({
        tenantId: tenant.id,
        trigger: 'BOOKING_REMINDER_CLIENT',
        scheduleId: schedule.id,
        data: {
          clientName: client.name,
          clientFirstName: client.name.trim().split(' ')[0],
          clientPhone: client.phone,
          clientEmail: client.email || undefined,
          serviceName: serviceNames,
          professionalName: professional.name,
          date: formattedDate,
          time: schedule.startTime,
          duration: `${schedule.totalDurationMinutes} min`
        }
      });

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
