import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma';
import { BookingService } from '../schedules/booking.service';
import { AvailabilityService } from '../schedules/availability.service';
import { ScheduleStatus } from '@prisma/client';
import { whatsappQueue } from '../automation/queues';
import { z } from 'zod';

// Rotas públicas do tenant: vitrine, agendamento online e cursos livres

export const publicRoutes: FastifyPluginAsync = async (app) => {
  // GET /showcase/:slug ou /:slug - Dados completos da vitrine pública e link na bio
  const handleShowcase = async (slug: string, reply: any) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
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
        },
        courses: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            coverUrl: true
          }
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
      description: tenant.description,
      terminology: tenant.terminology,
      openingTime: tenant.openingTime,
      closingTime: tenant.closingTime,
      isOpenNow,
      depositRequired: tenant.depositRequired,
      depositType: tenant.depositType,
      depositAmount: Number(tenant.depositAmount),
      // PIX Direto do Salão
      pixKey: tenant.pixKey,
      pixKeyType: tenant.pixKeyType,
      pixKeyHolder: tenant.pixKeyHolder,
      categories: tenant.categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder
      })),
      services: tenant.services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        categoryId: s.categoryId,
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
      })),
      courses: tenant.courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price ? Number(c.price) : null,
        coverUrl: c.coverUrl
      }))
    });
  };

  app.get('/showcase/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleShowcase(slug, reply);
  });

  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleShowcase(slug, reply);
  });

  // GET /public/:slug/slots ou /public/slots/:slug - Cálculo determinístico de horários livres
  const handleSlots = async (slug: string, query: any, reply: any) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, billingStatus: true }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
    }

    if (tenant.billingStatus === 'BLOCKED' || tenant.billingStatus === 'CANCELLED') {
      return reply.status(403).send({ error: 'Indisponível', message: 'Estabelecimento temporariamente indisponível.' });
    }

    const rawServiceIds = query.serviceIds;
    let serviceIds: string[] = [];
    if (Array.isArray(rawServiceIds)) {
      serviceIds = rawServiceIds.filter(Boolean);
    } else if (typeof rawServiceIds === 'string') {
      serviceIds = rawServiceIds.split(',').filter(Boolean);
    }

    if (serviceIds.length === 0 || !query.date) {
      return reply.send({
        date: query.date || '',
        isOpen: false,
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      });
    }

    const availability = await AvailabilityService.getAvailableSlots({
      tenantId: tenant.id,
      serviceIds,
      dateStr: query.date,
      professionalId: query.professionalId || undefined
    });

    return reply.send(availability);
  };

  app.get('/:slug/slots', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleSlots(slug, request.query, reply);
  });

  app.get('/slots/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleSlots(slug, request.query, reply);
  });

  // Schema de Agendamento Público
  const bookingBodySchema = z.object({
    serviceId: z.string().optional(),
    serviceIds: z.array(z.string()).optional(),
    additionalServices: z.array(z.any()).optional(),
    professionalId: z.string().optional(),
    date: z.string().optional(),
    dateStr: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm.'),
    clientName: z.string().min(2, 'Nome é obrigatório.'),
    clientPhone: z.string().min(10, 'Telefone com DDD é obrigatório.'),
    clientEmail: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional(),
    couponCode: z.string().optional()
  });

  // Validação de Cupom no Checkout da Vitrine Pública
  const handleValidateCoupon = async (slug: string, body: any, reply: any) => {
    const { code, totalAmount } = z.object({
      code: z.string().min(1, 'Código do cupom é obrigatório.'),
      totalAmount: z.number().min(0).default(0)
    }).parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: cleanCode
        }
      }
    });

    if (!coupon || !coupon.isActive) {
      return reply.status(400).send({
        valid: false,
        message: 'Cupom inválido ou inativo.'
      });
    }

    const now = new Date();
    if (coupon.validUntil && coupon.validUntil < now) {
      return reply.status(400).send({
        valid: false,
        message: `Este cupom expirou em ${coupon.validUntil.toLocaleDateString('pt-BR')}.`
      });
    }

    if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
      return reply.status(400).send({
        valid: false,
        message: 'Este cupom já atingiu o limite máximo de utilizações.'
      });
    }

    if (coupon.minOrderValue && totalAmount < Number(coupon.minOrderValue)) {
      return reply.status(400).send({
        valid: false,
        message: `Valor mínimo para este cupom é R$ ${Number(coupon.minOrderValue).toFixed(2).replace('.', ',')}.`
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (totalAmount * Number(coupon.discountValue)) / 100;
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), totalAmount);
    }

    const finalAmount = Math.max(0, totalAmount - discountAmount);

    return reply.send({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount: Number(discountAmount.toFixed(2)),
      finalAmount: Number(finalAmount.toFixed(2)),
      description: coupon.description,
      message: coupon.discountType === 'PERCENTAGE'
        ? `${coupon.discountValue}% de desconto aplicado com sucesso!`
        : `Desconto de R$ ${Number(coupon.discountValue).toFixed(2).replace('.', ',')} aplicado com sucesso!`
    });
  };

  const handleBookingCreation = async (slug: string, body: any, reply: any) => {
    const data = bookingBodySchema.parse(body);

    const targetDateStr = data.dateStr || data.date;
    if (!targetDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
      return reply.status(400).send({ error: 'Inválido', message: 'Data deve estar no formato AAAA-MM-DD.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
    }

    // Coleta todos os serviceIds
    const allServiceIds: string[] = [];
    if (data.serviceId) allServiceIds.push(data.serviceId);
    if (data.serviceIds && data.serviceIds.length > 0) {
      for (const id of data.serviceIds) {
        if (!allServiceIds.includes(id)) allServiceIds.push(id);
      }
    }
    if (data.additionalServices && data.additionalServices.length > 0) {
      for (const extra of data.additionalServices) {
        if (extra.id && !allServiceIds.includes(extra.id)) {
          allServiceIds.push(extra.id);
        }
      }
    }

    if (allServiceIds.length === 0) {
      return reply.status(400).send({ error: 'Inválido', message: 'Selecione ao menos um serviço para agendar.' });
    }

    // Validação opcional de Cupom se fornecido
    let appliedDiscount = 0;
    let validCouponCode: string | undefined = undefined;

    if (data.couponCode && data.couponCode.trim()) {
      const cleanCode = data.couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: cleanCode
          }
        }
      });

      if (coupon && coupon.isActive) {
        const now = new Date();
        const isNotExpired = !coupon.validUntil || coupon.validUntil >= now;
        const hasUsesLeft = !coupon.maxUses || coupon.timesUsed < coupon.maxUses;

        if (isNotExpired && hasUsesLeft) {
          validCouponCode = coupon.code;
          const servicesDb = await prisma.service.findMany({
            where: { id: { in: allServiceIds }, tenantId: tenant.id },
            select: { price: true }
          });
          const rawTotal = servicesDb.reduce((acc, s) => acc + Number(s.price), 0);

          if (coupon.discountType === 'PERCENTAGE') {
            appliedDiscount = (rawTotal * Number(coupon.discountValue)) / 100;
          } else {
            appliedDiscount = Math.min(Number(coupon.discountValue), rawTotal);
          }

          // Atualiza contagem de uso do cupom
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { timesUsed: { increment: 1 } }
          }).catch(() => { });
        }
      }
    }

    // Executa reserva com lock consultivo anti-double booking (C1)
    const schedule = await BookingService.createBooking({
      tenantId: tenant.id,
      serviceIds: allServiceIds,
      professionalId: data.professionalId,
      dateStr: targetDateStr,
      startTime: data.startTime,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail || undefined,
      notes: data.notes,
      couponCode: validCouponCode,
      discountAmount: appliedDiscount
    });

    // Enfileira disparo de notificação no WhatsApp se configurado
    try {
      await whatsappQueue.add('send-immediate-confirmation', {
        scheduleId: schedule.id,
        type: 'IMMEDIATE_CONFIRMATION'
      });
    } catch (err: any) {
      console.warn('[BullMQ] Aviso ao agendar envio do WhatsApp:', err.message);
    }

    return reply.status(201).send({
      message: 'Agendamento confirmado com sucesso!',
      schedule,
      token: schedule.rescheduleToken
    });
  };

  // POST /public/validate-coupon/:slug ou /:slug/validate-coupon
  app.post('/:slug/validate-coupon', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleValidateCoupon(slug, request.body, reply);
  });

  app.post('/validate-coupon/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleValidateCoupon(slug, request.body, reply);
  });

  // POST /public/booking/:slug (compatibilidade com frontend atual)
  app.post('/booking/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleBookingCreation(slug, request.body, reply);
  });

  // POST /public/:slug/bookings (padrão RESTful da especificação)
  app.post('/:slug/bookings', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return handleBookingCreation(slug, request.body, reply);
  });

  // GET /public/booking/:token - Consulta de agendamento por Token seguro
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
        items: {
          include: {
            service: true
          }
        }
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

  // POST /public/booking/:token/cancel - Cancelamento seguro pela cliente
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

  // =========================================================================
  // ROTAS DE CURSOS ONLINE PÚBLICOS (Sem intermediários - Seção 14)
  // =========================================================================

  // POST /public/courses/:slug/auth - Valida telefone da aluna e retorna aulas liberadas
  app.post('/courses/:slug/auth', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { phone, courseId } = request.body as { phone: string; courseId: string };

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não encontrado.' });
    }

    const normalizedPhone = phone.replace(/\D/g, '');

    const access = await prisma.courseAccess.findFirst({
      where: {
        courseId,
        phone: normalizedPhone,
        isActive: true
      },
      include: {
        course: {
          include: {
            lessons: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!access) {
      return reply.status(403).send({
        error: 'Acesso não liberado',
        message: 'Você ainda não possui acesso a este curso. Entre em contato com a instrutora pelo WhatsApp para liberar suas aulas.'
      });
    }

    return reply.send({
      course: {
        id: access.course.id,
        title: access.course.title,
        description: access.course.description,
        lessons: access.course.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          videoUrl: l.videoUrl,
          duration: l.duration,
          sortOrder: l.sortOrder
        }))
      }
    });
  });
};
