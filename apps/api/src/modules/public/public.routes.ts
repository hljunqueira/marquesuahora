import { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { createBookingSchema, joinWaitlistSchema } from '@marquesuahora/shared';
import { ScheduleStatus, WaitlistStatus } from '@prisma/client';
import { whatsappQueue } from '../automation/queues';

export const publicRoutes: FastifyPluginAsync = async (app) => {
  // GET /public/showcase/:slug - Carrega todos os dados da vitrine pública do estabelecimento
  app.get('/showcase/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        services: {
          where: { allowOnlineBooking: true },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
          include: { resource: true }
        },
        professionals: {
          where: { isActive: true },
          include: {
            services: { select: { serviceId: true } }
          },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!tenant) {
      return reply.status(404).send({
        error: 'Não encontrado',
        message: 'Estabelecimento não encontrado. Verifique o endereço digitado.'
      });
    }

    if (tenant.billingStatus === 'BLOCKED' || tenant.billingStatus === 'CANCELLED') {
      return reply.status(403).send({
        error: 'Indisponível',
        message: 'Este estabelecimento está temporariamente indisponível para novos agendamentos.'
      });
    }

    // Calcula se está aberto no momento exato (Horário de Brasília)
    const now = new Date();
    const currentHours = now.getHours();
    const currentMins = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMins).padStart(2, '0')}`;

    const isOpenNow =
      currentTimeStr >= (tenant.openingTime || '09:00') &&
      currentTimeStr < (tenant.closingTime || '19:00');

    return reply.send({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      phone: tenant.phone,
      addressStreet: tenant.addressStreet,
      addressNumber: tenant.addressNumber,
      addressNeighborhood: tenant.addressNeighborhood,
      addressCity: tenant.addressCity,
      addressState: tenant.addressState,
      niche: tenant.niche,
      themeTemplate: tenant.themeTemplate,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      accentColor: tenant.accentColor,
      logoUrl: tenant.logoUrl,
      googleReviewUrl: tenant.googleReviewUrl,
      instagramUrl: tenant.instagramUrl,
      terminology: tenant.terminology,
      depositRequired: tenant.depositRequired,
      depositType: tenant.depositType,
      depositAmount: Number(tenant.depositAmount),
      openingTime: tenant.openingTime,
      closingTime: tenant.closingTime,
      isOpenNow,
      services: tenant.services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        price: Number(s.price),
        durationMinutes: s.durationMinutes,
        serviceType: s.serviceType,
        requiresRemovalCheck: s.requiresRemovalCheck,
        resourceName: s.resource?.name || null
      })),
      professionals: tenant.professionals.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        color: p.color,
        serviceIds: p.services.map((s) => s.serviceId)
      }))
    });
  });

  // POST /public/booking/:slug - Agendamento direto sem login obrigatório (zero fricção)
  app.post('/booking/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const data = createBookingSchema.parse(request.body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant || tenant.billingStatus === 'BLOCKED' || tenant.billingStatus === 'CANCELLED') {
      return reply.status(403).send({
        error: 'Indisponível',
        message: 'Este estabelecimento não pode receber agendamentos no momento.'
      });
    }

    // Busca serviço principal
    const mainService = await prisma.service.findUnique({
      where: { id: data.serviceId }
    });

    if (!mainService || !mainService.allowOnlineBooking || mainService.tenantId !== tenant.id) {
      return reply.status(400).send({
        error: 'Inválido',
        message: 'O serviço selecionado não está disponível para agendamento online.'
      });
    }

    let totalDurationMinutes = mainService.durationMinutes + (tenant.bufferMinutes || 0);
    let totalPrice = Number(mainService.price);

    if (data.additionalServices && data.additionalServices.length > 0) {
      for (const extra of data.additionalServices) {
        totalDurationMinutes += extra.durationMinutes;
        totalPrice += extra.price;
      }
    }

    const targetDate = new Date(`${data.date}T00:00:00`);
    const [sh, sm] = data.startTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = startMins + totalDurationMinutes;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Upsert do Cliente por Telefone
    const client = await prisma.client.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenant.id,
          phone: data.clientPhone
        }
      },
      create: {
        tenantId: tenant.id,
        name: data.clientName,
        phone: data.clientPhone,
        email: data.clientEmail || null,
        notes: data.notes || null
      },
      update: {
        name: data.clientName,
        email: data.clientEmail || undefined,
        notes: data.notes || undefined
      }
    });

    if (client.isBlockedOnline) {
      return reply.status(403).send({
        error: 'Bloqueado',
        message: 'Seu cadastro está temporariamente impedido de agendar online. Por favor, entre em contato direto pelo WhatsApp do salão.'
      });
    }

    // Cálculo de Sinal Anti-No-Show PIX
    const depositRequired = tenant.depositRequired && Number(tenant.depositAmount) > 0;
    let depositValue = 0;
    let depositPixCode: string | null = null;
    let depositExpiresAt: Date | null = null;

    if (depositRequired) {
      depositValue =
        tenant.depositType === 'PERCENTAGE'
          ? (totalPrice * Number(tenant.depositAmount)) / 100
          : Number(tenant.depositAmount);

      depositExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      depositPixCode = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}520400005303986540${depositValue.toFixed(2)}5802BR5913MARCATUAHORA6009SAOPAULO62070503***6304ABCD`;
    }

    const schedule = await prisma.schedule.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        professionalId: data.professionalId,
        serviceId: mainService.id,
        resourceId: mainService.resourceId,
        additionalServices: data.additionalServices && data.additionalServices.length > 0 ? (data.additionalServices as any) : undefined,
        totalDurationMinutes,
        totalPrice,
        date: targetDate,
        startTime: data.startTime,
        endTime,
        status: depositRequired ? ScheduleStatus.PENDING : ScheduleStatus.CONFIRMED,
        notes: data.notes || null,
        intakeAnswers: data.intakeAnswers || undefined,
        serviceLocation: data.serviceLocation || undefined,
        depositAmount: depositValue,
        depositPaid: false,
        depositPixCode,
        depositExpiresAt
      },
      include: {
        client: true,
        professional: true,
        service: true
      }
    });

    // Se não exigir sinal, enfileira mensagens automáticas no BullMQ
    if (!depositRequired) {
      try {
        await whatsappQueue.add('send-immediate-confirmation', {
          scheduleId: schedule.id,
          type: 'IMMEDIATE_CONFIRMATION'
        });

        const appointmentTime = new Date(`${data.date}T${data.startTime}:00`).getTime();
        const now = Date.now();
        const delay24h = appointmentTime - 24 * 60 * 60 * 1000 - now;
        const delay12h = appointmentTime - 12 * 60 * 60 * 1000 - now;

        if (delay24h > 0) {
          await whatsappQueue.add(
            'send-reminder-24h',
            { scheduleId: schedule.id, type: 'REMINDER_24H' },
            { delay: delay24h }
          );
        }

        if (delay12h > 0) {
          await whatsappQueue.add(
            'send-reminder-12h',
            { scheduleId: schedule.id, type: 'REMINDER_12H' },
            { delay: delay12h }
          );
        }
      } catch (err: any) {
        console.warn('[BullMQ] Aviso ao agendar disparos do WhatsApp:', err.message);
      }
    }

    return reply.status(201).send({
      message: depositRequired
        ? 'Agendamento pré-reservado! Realize o pagamento do sinal via PIX para garantir sua vaga.'
        : 'Agendamento confirmado com sucesso!',
      schedule,
      token: schedule.rescheduleToken
    });
  });

  // POST /public/waitlist/:slug - Inscrição na Lista de Espera Inteligente
  app.post('/waitlist/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const data = joinWaitlistSchema.parse(request.body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
    }

    const client = await prisma.client.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenant.id,
          phone: data.clientPhone
        }
      },
      create: {
        tenantId: tenant.id,
        name: data.clientName,
        phone: data.clientPhone
      },
      update: {
        name: data.clientName
      }
    });

    const waitlist = await prisma.waitlistEntry.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        serviceId: data.serviceId || null,
        professionalId: data.professionalId || null,
        date: new Date(`${data.date}T00:00:00`),
        preferredShift: data.preferredShift || 'ANY',
        status: WaitlistStatus.WAITING
      }
    });

    return reply.status(201).send({
      message: 'Você está na lista de espera! Se surgir um horário, avisaremos imediatamente no seu WhatsApp.',
      waitlist
    });
  });

  // GET /public/booking/:token - Consulta pública de agendamento por Token (sem login)
  app.get('/booking/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const schedule = await prisma.schedule.findUnique({
      where: { rescheduleToken: token },
      include: {
        tenant: {
          select: {
            name: true,
            slug: true,
            phone: true,
            addressStreet: true,
            addressNumber: true,
            addressNeighborhood: true,
            addressCity: true,
            addressState: true,
            googleReviewUrl: true,
            themeTemplate: true,
            logoUrl: true
          }
        },
        client: { select: { name: true, phone: true } },
        professional: { select: { name: true, color: true, phone: true } },
        service: true,
        resource: true
      }
    });

    if (!schedule) {
      return reply.status(404).send({
        error: 'Não encontrado',
        message: 'Agendamento não localizado.'
      });
    }

    return reply.send(schedule);
  });

  // POST /public/booking/:token/cancel - Cancelamento de agendamento pelo cliente
  app.post('/booking/:token/cancel', async (request, reply) => {
    const { token } = request.params as { token: string };

    const schedule = await prisma.schedule.findUnique({
      where: { rescheduleToken: token }
    });

    if (!schedule) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Agendamento não localizado.' });
    }

    if (schedule.status === ScheduleStatus.CANCELLED) {
      return reply.status(400).send({ error: 'Já cancelado', message: 'Este agendamento já foi cancelado anteriormente.' });
    }

    const updated = await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        status: ScheduleStatus.CANCELLED
      }
    });

    return reply.send({
      message: 'Agendamento cancelado com sucesso.',
      schedule: updated
    });
  });
};
