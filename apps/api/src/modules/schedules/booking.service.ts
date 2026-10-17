import { prisma } from '../../lib/prisma';
import { ScheduleStatus, BookingSource, NotificationCategory, NotificationPriority } from '@prisma/client';
import { parseTimeToMinutes, formatMinutesToTime } from '@marquesuahora/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationDispatcherService } from '../notifications/dispatcher.service';

// Serviço de reserva transacional com PostgreSQL Advisory Lock (Blocker C1) e frozen items (Blocker C2)

export interface CreateBookingInput {
  tenantId: string;
  serviceIds: string[];
  professionalId?: string;
  dateStr: string; // YYYY-MM-DD
  startTime: string; // "14:00"
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  source?: BookingSource;
  couponCode?: string;
  discountAmount?: number;
}

export class BookingService {
  /**
   * Cria um agendamento com proteção transacional rigorosa contra double-booking (Blocker C1),
   * congelamento de preços históricos (Blocker C2) e preservação do cadastro de cliente (Blocker C8).
   */
  static async createBooking(input: CreateBookingInput) {
    const {
      tenantId,
      serviceIds,
      dateStr,
      startTime,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      source = BookingSource.ONLINE,
      couponCode,
      discountAmount = 0
    } = input;

    // Normalização de telefone (apenas números)
    const normalizedPhone = clientPhone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      const err = new Error('Telefone inválido. Informe o DDD e o número completo.');
      (err as any).statusCode = 400;
      throw err;
    }

    // 1. Busca os serviços reais e calcula preço e duração congelados (Blocker C2)
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
        ...(source === BookingSource.ONLINE ? { allowOnlineBooking: true } : {})
      }
    });

    if (services.length === 0) {
      const err = new Error('Nenhum dos serviços selecionados está disponível para agendamento.');
      (err as any).statusCode = 400;
      throw err;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true }
    });

    if (!tenant) {
      const err = new Error('Estabelecimento não encontrado.');
      (err as any).statusCode = 404;
      throw err;
    }

    // Validação estrita da cota de agendamentos do plano contratado
    if (tenant.plan && !tenant.plan.isUnlimitedBookings && tenant.plan.monthlyFreeBookings > 0) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const currentMonthCount = await prisma.schedule.count({
        where: {
          tenantId,
          date: { gte: startOfMonth, lte: endOfMonth },
          status: { not: ScheduleStatus.CANCELLED }
        }
      });

      if (currentMonthCount >= tenant.plan.monthlyFreeBookings) {
        const err = new Error(
          `Limite de agendamentos mensais atingido (${tenant.plan.monthlyFreeBookings} agendamentos no plano ${tenant.plan.name}). Faça o upgrade para o plano Profissional Solo para ter agendamentos ilimitados.`
        );
        (err as any).statusCode = 403;
        throw err;
      }
    }

    const totalDurationMinutes = services.reduce(
      (sum, s) => sum + s.durationMinutes + (tenant.bufferMinutes || 0),
      0
    );
    const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = startMinutes + totalDurationMinutes;
    const endTime = formatMinutesToTime(endMinutes);

    const targetDate = new Date(`${dateStr}T00:00:00`);

    // 2. Se professionalId não foi fornecido, seleciona um profissional apto
    let selectedProfessionalId = input.professionalId;

    if (!selectedProfessionalId) {
      const candidateProfessionals = await prisma.professional.findMany({
        where: {
          tenantId,
          isActive: true,
          services: {
            some: {
              serviceId: { in: serviceIds }
            }
          }
        }
      });

      if (candidateProfessionals.length === 0) {
        const fallbackProf = await prisma.professional.findFirst({
          where: { tenantId, isActive: true }
        });
        if (fallbackProf) {
          selectedProfessionalId = fallbackProf.id;
        } else {
          const err = new Error('Não há profissionais cadastrados ou ativos neste estabelecimento.');
          (err as any).statusCode = 400;
          throw err;
        }
      } else {
        selectedProfessionalId = candidateProfessionals[0].id;
      }
    }

    // 3. Execução dentro de transação com PostgreSQL Advisory Lock (Blocker C1)
    const result = await prisma.$transaction(async (tx) => {
      // Lock consultivo transacional por tenant + profissional + data
      const lockKey = `booking:${tenantId}:${selectedProfessionalId}:${dateStr}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 4. Verifica conflito de horário dentro da trava
      const conflictingSchedule = await tx.schedule.findFirst({
        where: {
          tenantId,
          professionalId: selectedProfessionalId,
          date: targetDate,
          status: {
            in: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED, ScheduleStatus.IN_SERVICE]
          },
          startTime: { lt: endTime },
          endTime: { gt: startTime }
        }
      });

      if (conflictingSchedule) {
        const err = new Error(
          'Este horário acabou de ser reservado por outra cliente. Por favor, escolha outro horário.'
        );
        (err as any).statusCode = 409;
        throw err;
      }

      // Verifica conflito com bloqueios
      const conflictingBlock = await tx.scheduleBlock.findFirst({
        where: {
          tenantId,
          isPaused: false,
          OR: [{ date: targetDate }, { dayOfWeek: targetDate.getDay() }],
          AND: [
            {
              OR: [{ professionalId: null }, { professionalId: selectedProfessionalId }]
            },
            {
              startTime: { lt: endTime },
              endTime: { gt: startTime }
            }
          ]
        }
      });

      if (conflictingBlock) {
        const err = new Error(`Este horário está bloqueado (${conflictingBlock.reason}). Escolha outro horário.`);
        (err as any).statusCode = 409;
        throw err;
      }

      // 5. Gestão de Cliente: busca por telefone sem sobrescrever histórico (Blocker C8)
      let client = await tx.client.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone: normalizedPhone
          }
        }
      });

      if (!client) {
        client = await tx.client.create({
          data: {
            tenantId,
            name: clientName.trim(),
            phone: normalizedPhone,
            email: clientEmail?.trim() || null
          }
        });
      } else if (clientEmail && !client.email) {
        // Atualiza apenas e-mail se cliente ainda não tinha e-mail cadastrado
        client = await tx.client.update({
          where: { id: client.id },
          data: { email: clientEmail.trim() }
        });
      }

      // 6. Criação do Agendamento e ScheduleItems congelados
      const initialStatus = tenant.depositRequired ? ScheduleStatus.PENDING : ScheduleStatus.CONFIRMED;
      const finalPrice = Math.max(0, totalPrice - (discountAmount || 0));

      let depositAmount = 0;
      if (tenant.depositRequired) {
        if (tenant.depositType === 'PERCENTAGE') {
          depositAmount = (finalPrice * Number(tenant.depositAmount || 30)) / 100;
        } else {
          depositAmount = Math.min(Number(tenant.depositAmount || 30), finalPrice);
        }
      }

      const formattedNotes = [
        notes?.trim(),
        couponCode ? `[Cupom: ${couponCode} - Desconto: R$ ${(discountAmount || 0).toFixed(2)}]` : null,
        depositAmount > 0 ? `[Sinal PIX Direto: R$ ${depositAmount.toFixed(2)}]` : null
      ].filter(Boolean).join(' | ') || null;

      const schedule = await tx.schedule.create({
        data: {
          tenantId,
          clientId: client.id,
          professionalId: selectedProfessionalId!,
          serviceId: services[0].id,
          date: targetDate,
          startTime,
          endTime,
          totalDurationMinutes,
          totalPrice: finalPrice,
          depositAmount,
          depositPaid: false,
          status: initialStatus,
          source,
          notes: formattedNotes,
          items: {
            create: services.map((s) => ({
              serviceId: s.id,
              price: s.price,
              durationMinutes: s.durationMinutes
            }))
          }
        },
        include: {
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

      return schedule;
    });

    // Dispara notificação assíncrona para o tenant sobre o novo agendamento
    try {
      const clientName = result.client?.name || 'Cliente';
      const profName = result.professional?.name || 'Profissional';
      const serviceNames = result.items?.map((it: any) => it.service?.name).filter(Boolean).join(', ') || result.service?.name || 'Serviço';

      await NotificationsService.create({
        tenantId,
        category: NotificationCategory.SCHEDULE,
        priority: NotificationPriority.MEDIUM,
        title: 'Novo Agendamento Confirmado',
        message: `${clientName} agendou ${serviceNames} para ${startTime} com ${profName}.`,
        link: '/dashboard/agendamentos',
        metadata: {
          scheduleId: result.id,
          clientId: result.clientId,
          professionalId: result.professionalId
        }
      });

      // Dispara mensagens em WhatsApp e E-mail para Cliente e Equipe
      const clientFirstName = clientName.trim().split(' ')[0] || clientName;
      const dateFormatted = dateStr.split('-').reverse().join('/');

      // Notificação ao Cliente
      await NotificationDispatcherService.dispatch({
        tenantId,
        trigger: 'BOOKING_CONFIRMATION_CLIENT',
        scheduleId: result.id,
        data: {
          clientName,
          clientFirstName,
          clientPhone: result.client?.phone,
          clientEmail: result.client?.email || undefined,
          serviceName: serviceNames,
          professionalName: profName,
          date: dateFormatted,
          time: startTime,
          duration: `${totalDurationMinutes} min`,
          price: Number(totalPrice).toFixed(2)
        }
      });

      // Notificação à Equipe (Profissional + Dono)
      await NotificationDispatcherService.dispatch({
        tenantId,
        trigger: 'BOOKING_NEW_TEAM',
        scheduleId: result.id,
        data: {
          clientName,
          clientFirstName,
          clientPhone: result.client?.phone,
          serviceName: serviceNames,
          professionalName: profName,
          professionalPhone: result.professional?.phone,
          date: dateFormatted,
          time: startTime,
          duration: `${totalDurationMinutes} min`,
          price: Number(totalPrice).toFixed(2)
        }
      });
    } catch (notifErr) {
      console.error('Falha não-bloqueante ao registrar notificação de agendamento:', notifErr);
    }

    return result;
  }
}
