import { ScheduleStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { NotificationDispatcherService } from '../../notifications/dispatcher.service';

/**
 * Scheduler autônomo de Lembretes de 24 Horas.
 * Executa periodicamente a cada 10 minutos para identificar agendamentos
 * nas próximas 24 horas que ainda não receberam a notificação de lembrete prévio.
 */
export class Reminder24hScheduler {
  private static intervalTimer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Inicia o ciclo do scheduler
   */
  public static start(intervalMs = 10 * 60 * 1000) {
    if (this.intervalTimer) {
      return;
    }

    console.log('[Reminder24hScheduler] Iniciado - escaneando agendamentos a cada 10 minutos.');

    // Executa a primeira checagem 15 segundos após o boot da API
    setTimeout(() => {
      this.checkAndSendReminders().catch((err) => {
        console.error('[Reminder24hScheduler] Erro na checagem inicial:', err.message);
      });
    }, 15000);

    this.intervalTimer = setInterval(() => {
      this.checkAndSendReminders().catch((err) => {
        console.error('[Reminder24hScheduler] Erro no ciclo periódico:', err.message);
      });
    }, intervalMs);
  }

  /**
   * Para o scheduler caso necessário (testes ou graceful shutdown)
   */
  public static stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Executa a checagem e envio dos lembretes de 24h
   */
  public static async checkAndSendReminders(): Promise<{ checked: number; sent: number }> {
    if (this.isRunning) {
      return { checked: 0, sent: 0 };
    }

    this.isRunning = true;
    let sentCount = 0;

    try {
      const now = new Date();
      // Janela de busca: próximos 2 dias a partir de ontem para cobrir qualquer diferença de fuso
      const minDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const maxDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Busca agendamentos pendentes ou confirmados sem lembrete enviado
      const candidates = await prisma.schedule.findMany({
        where: {
          status: { in: [ScheduleStatus.CONFIRMED, ScheduleStatus.PENDING] },
          reminder24hSentAt: null,
          date: {
            gte: minDate,
            lte: maxDate
          }
        },
        include: {
          tenant: true,
          client: true,
          professional: true,
          service: true,
          items: { include: { service: true } }
        }
      });

      const nowEpoch = now.getTime();

      for (const schedule of candidates) {
        if (!schedule.client?.phone) {
          continue;
        }

        // Calcula timestamp exato do agendamento no fuso de Brasília (UTC-3)
        const dateStr = schedule.date instanceof Date
          ? schedule.date.toISOString().slice(0, 10)
          : String(schedule.date).slice(0, 10);
        const timeStr = schedule.startTime || '09:00';

        // Monta ISO seguro com offset de Brasília (-03:00)
        const appointmentEpoch = new Date(`${dateStr}T${timeStr}:00-03:00`).getTime();
        const diffHours = (appointmentEpoch - nowEpoch) / (1000 * 60 * 60);

        // Dispara se o horário estiver a no máximo 25 horas e ainda no futuro (diffHours > 0)
        // Isso cobre tanto o marco exato de 24h quanto agendamentos recentes feitos para o dia seguinte
        if (diffHours > 0 && diffHours <= 25) {
          try {
            const dateFormatted = dateStr.split('-').reverse().join('/');
            const serviceNames = schedule.items && schedule.items.length > 0
              ? schedule.items.map((it: any) => it.service?.name).filter(Boolean).join(', ')
              : schedule.service?.name;

            const clientName = schedule.client.name || 'Cliente';
            const clientFirstName = clientName.trim().split(' ')[0] || clientName;

            await NotificationDispatcherService.dispatch({
              tenantId: schedule.tenantId,
              trigger: 'BOOKING_REMINDER_CLIENT',
              scheduleId: schedule.id,
              data: {
                clientName,
                clientFirstName,
                clientPhone: schedule.client.phone,
                clientEmail: schedule.client.email || undefined,
                serviceName: serviceNames,
                professionalName: schedule.professional?.name,
                date: dateFormatted,
                time: schedule.startTime,
                duration: `${schedule.totalDurationMinutes} min`
              }
            });

            // Marca o agendamento como lembrado
            await prisma.schedule.update({
              where: { id: schedule.id },
              data: { reminder24hSentAt: new Date() }
            });

            sentCount++;
            console.log(`[Reminder24hScheduler] Lembrete 24h enviado para ${clientName} (${schedule.client.phone}) - Horário: ${dateFormatted} às ${schedule.startTime}`);
          } catch (itemErr: any) {
            console.error(`[Reminder24hScheduler] Falha ao enviar lembrete para schedule ${schedule.id}:`, itemErr.message);
          }
        }
      }

      return { checked: candidates.length, sent: sentCount };
    } finally {
      this.isRunning = false;
    }
  }
}
