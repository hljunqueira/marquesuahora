import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma';
import { BookingService } from '../schedules/booking.service';
import { AvailabilityService } from '../schedules/availability.service';
import { ScheduleStatus } from '@prisma/client';
import { whatsappQueue } from '../automation/queues';
import { z } from 'zod';
import { checkBrazilianHoliday } from '../../utils/brazilian-holidays';

// Rotas públicas do tenant: vitrine, agendamento online e cursos livres

export const publicRoutes: FastifyPluginAsync = async (app) => {
  // GET /showcase/:slug ou /:slug - Dados completos da vitrine pública e link na bio
  const handleShowcase = async (slug: string, reply: any) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        plan: true,
        availabilityRules: {
          where: { professionalId: null }
        },
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
        },
        products: {
          where: { isActive: true, showInVitrine: true },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
            salePrice: true,
            stockQuantity: true,
            imageUrl: true
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

    // Horário e dia da semana precisos no fuso horário do Brasil (America/Sao_Paulo)
    const nowBRFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = nowBRFormatter.formatToParts(new Date());
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }
    const todayIso = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const currentTimeStr = `${partMap.hour}:${partMap.minute}`;

    // Dia da semana de 0 (Domingo) a 6 (Sábado) na data do Brasil
    const todayBRDate = new Date(`${todayIso}T12:00:00Z`);
    const currentDayOfWeek = todayBRDate.getUTCDay();

    // 1. Verifica se hoje é feriado nacional bloqueado pelo tenant
    let isHolidayBlocked = false;
    if (tenant.blockNationalHolidays) {
      const exceptions: string[] = Array.isArray(tenant.holidayExceptions)
        ? (tenant.holidayExceptions as string[])
        : [];
      if (!exceptions.includes(todayIso)) {
        const holiday = checkBrazilianHoliday(todayIso);
        if (holiday) {
          isHolidayBlocked = true;
        }
      }
    }

    // 2. Regra da Grade Semanal de Atendimento (AvailabilityRule global do salão)
    const todayRule = tenant.availabilityRules?.find((r) => r.dayOfWeek === currentDayOfWeek);

    let isOpenNow = false;
    let todayOpeningTime = tenant.openingTime || '09:00';
    let todayClosingTime = tenant.closingTime || '19:00';

    if (isHolidayBlocked) {
      isOpenNow = false;
    } else if (todayRule) {
      todayOpeningTime = todayRule.startTime;
      todayClosingTime = todayRule.endTime;
      if (todayRule.isActive) {
        isOpenNow = currentTimeStr >= todayRule.startTime && currentTimeStr < todayRule.endTime;
      } else {
        // Marcado como Fechado na grade semanal (ex: Domingo)
        isOpenNow = false;
      }
    } else {
      // Se não há regra cadastrada explicitamente para o dia, Domingo é fechado por padrão
      if (currentDayOfWeek === 0) {
        isOpenNow = false;
      } else {
        isOpenNow = currentTimeStr >= todayOpeningTime && currentTimeStr < todayClosingTime;
      }
    }

    const allGalleryPhotos = (tenant.galleryPhotos && tenant.galleryPhotos.length > 0)
      ? tenant.galleryPhotos
      : Array.from(new Set(tenant.services.flatMap((s) => s.photos || []))).filter(Boolean);

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
      coverUrl: tenant.coverUrl,
      googleReviewUrl: tenant.googleReviewUrl,
      instagramUrl: tenant.instagramUrl,
      description: tenant.description,
      terminology: tenant.terminology,
      openingTime: todayOpeningTime,
      closingTime: todayClosingTime,
      isOpenNow,
      galleryPhotos: allGalleryPhotos,
      depositRequired: tenant.depositRequired,
      depositType: tenant.depositType,
      depositAmount: Number(tenant.depositAmount),
      depositOnFirstBooking: tenant.depositOnFirstBooking,
      depositFirstBookingType: tenant.depositFirstBookingType || 'PERCENTAGE',
      depositFirstBookingValue: Number(tenant.depositFirstBookingValue ?? tenant.depositFirstBookingPercent ?? 50),
      depositFirstBookingPercent: Number(tenant.depositFirstBookingValue ?? tenant.depositFirstBookingPercent ?? 50),
      // PIX Direto do Salão
      pixKey: tenant.pixKey,
      pixKeyType: tenant.pixKeyType,
      pixKeyHolder: tenant.pixKeyHolder,
      aftercareGuides: tenant.aftercareGuides || [],
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
        photos: s.photos || [],
        serviceType: s.serviceType,
        requiresRemovalCheck: s.requiresRemovalCheck,
        requiresDeposit: s.requiresDeposit,
        depositType: s.depositType,
        depositAmount: Number(s.depositAmount || 50),
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
      })),
      products:
        tenant.plan?.code === 'FREE' && Number(tenant.plan?.monthlyPrice || 0) === 0
          ? []
          : tenant.products.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              description: p.description,
              salePrice: Number(p.salePrice),
              stockQuantity: p.stockQuantity,
              imageUrl: p.imageUrl
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

  // =========================================================================
  // FICHA DE ANAMNESE PÚBLICA (Preenchimento pela Cliente via Link Único)
  // =========================================================================

  // GET /public/anamnesis/:token - Buscar dados para formulário clean de anamnese
  app.get('/anamnesis/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const client = await prisma.client.findUnique({
      where: { anamnesisToken: token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            logoUrl: true,
            primaryColor: true
          }
        }
      }
    });

    if (!client) {
      return reply.status(404).send({
        error: 'Não encontrada',
        message: 'Ficha de anamnese não localizada ou link inválido.'
      });
    }

    return reply.send({
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        anamnesis: client.anamnesis
      },
      tenant: client.tenant
    });
  });

  // POST /public/anamnesis/:token - Submissão do formulário clean de anamnese
  app.post('/anamnesis/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const client = await prisma.client.findUnique({
      where: { anamnesisToken: token }
    });

    if (!client) {
      return reply.status(404).send({
        error: 'Não encontrada',
        message: 'Ficha de anamnese não localizada ou link inválido.'
      });
    }

    const anamnesisSchema = z.object({
      hasAllergies: z.boolean().default(false),
      allergies: z.string().max(500).optional().nullable(),
      isDiabetic: z.boolean().default(false),
      hasNailMycosis: z.boolean().default(false),
      isPregnant: z.boolean().default(false),
      bitesNails: z.boolean().default(false),
      chemicalHandling: z.boolean().default(false),
      preferredShape: z.string().max(50).optional().nullable(),
      notes: z.string().max(500).optional().nullable()
    });

    const body = anamnesisSchema.parse(request.body);

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: {
        anamnesis: {
          ...body,
          updatedAt: new Date().toISOString()
        }
      }
    });

    return reply.send({
      success: true,
      message: 'Ficha de anamnese enviada com sucesso! Suas informações foram salvas para seus próximos atendimentos.',
      anamnesis: updated.anamnesis
    });
  });

  // =========================================================================
  // PORTAL DA CLIENTE DA ASSINANTE (Histórico, Canal de Origem, Anamnese e Cursos)
  // =========================================================================

  // GET /public/client-portal/:slug - Consulta de agendamentos e área da cliente
  app.get('/client-portal/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const querySchema = z.object({
      phone: z.string().min(10, 'Telefone com DDD é obrigatório.')
    });

    const query = querySchema.parse(request.query);
    const normalizedPhone = query.phone.replace(/\D/g, '');

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
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
        },
        products: {
          where: { isActive: true, showInVitrine: true },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
            salePrice: true,
            stockQuantity: true,
            imageUrl: true
          }
        }
      }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não localizado.' });
    }

    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phone: normalizedPhone
      },
      include: {
        schedules: {
          orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
          take: 10,
          include: {
            service: { select: { id: true, name: true, price: true, durationMinutes: true } },
            professional: { select: { id: true, name: true, color: true } },
            items: { include: { service: true } }
          }
        }
      }
    });

    if (!client) {
      return reply.send({
        client: null,
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
          phone: tenant.phone,
          addressStreet: tenant.addressStreet,
          addressNumber: tenant.addressNumber,
          addressNeighborhood: tenant.addressNeighborhood,
          addressCity: tenant.addressCity,
          addressState: tenant.addressState,
          openingTime: tenant.openingTime,
          closingTime: tenant.closingTime,
          pixKey: tenant.pixKey,
          pixKeyType: tenant.pixKeyType,
          pixKeyHolder: tenant.pixKeyHolder,
          googleReviewUrl: tenant.googleReviewUrl,
          aftercareGuides: tenant.aftercareGuides || [],
          courses: tenant.courses.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            price: c.price ? Number(c.price) : null,
            coverUrl: c.coverUrl
          })),
          products: tenant.products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            salePrice: Number(p.salePrice),
            stockQuantity: p.stockQuantity,
            imageUrl: p.imageUrl
          }))
        },
        schedules: []
      });
    }

    // Se cliente ainda não tem anamnesisToken, garante que seja criado
    if (!client.anamnesisToken) {
      const crypto = await import('crypto');
      const generatedToken = crypto.randomUUID();
      await prisma.client.update({
        where: { id: client.id },
        data: { anamnesisToken: generatedToken }
      });
      client.anamnesisToken = generatedToken;
    }

    return reply.send({
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        anamnesis: client.anamnesis,
        anamnesisToken: client.anamnesisToken
      },
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        phone: tenant.phone,
        addressStreet: tenant.addressStreet,
        addressNumber: tenant.addressNumber,
        addressNeighborhood: tenant.addressNeighborhood,
        addressCity: tenant.addressCity,
        addressState: tenant.addressState,
        openingTime: tenant.openingTime,
        closingTime: tenant.closingTime,
        pixKey: tenant.pixKey,
        pixKeyType: tenant.pixKeyType,
        pixKeyHolder: tenant.pixKeyHolder,
        googleReviewUrl: tenant.googleReviewUrl,
        aftercareGuides: tenant.aftercareGuides || [],
        courses: tenant.courses.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          price: c.price ? Number(c.price) : null,
          coverUrl: c.coverUrl
        })),
        products: tenant.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          salePrice: Number(p.salePrice),
          stockQuantity: p.stockQuantity,
          imageUrl: p.imageUrl
        }))
      },
      schedules: client.schedules.map((s) => ({
        id: s.id,
        date: s.date.toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        source: s.source, // WHATSAPP, ONLINE, MANUAL_RECEPTION
        serviceName: s.service.name,
        professionalName: s.professional.name,
        totalPrice: Number(s.totalPrice),
        depositAmount: Number(s.depositAmount || 0),
        depositPaid: s.depositPaid,
        arrivalPhotoUrl: s.arrivalPhotoUrl,
        resultPhotoUrl: s.resultPhotoUrl
      }))
    });
  });

  // =========================================================================
  // VALIDAÇÃO PÚBLICA DE CERTIFICADOS ANTI-FRAUDE (QR CODE)
  // =========================================================================

  // GET /public/certificates/:code - Validação pública anti-fraude de certificado
  app.get('/certificates/:code', async (request, reply) => {
    const { code } = request.params as { code: string };

    const access = await prisma.courseAccess.findUnique({
      where: { certificateCode: code.toUpperCase() },
      include: {
        course: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                phone: true,
                addressCity: true,
                addressState: true
              }
            }
          }
        },
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!access || !access.completedAt) {
      return reply.status(404).send({
        valid: false,
        error: 'Certificado Não Localizado',
        message: 'Código de autenticação inválido ou não registrado em nossa base oficial.'
      });
    }

    const certConfig = (access.course.certificateConfig as any) || {};

    return reply.send({
      valid: true,
      code: access.certificateCode,
      studentName: access.client?.name || 'Aluna',
      courseTitle: access.course.title,
      tenantName: access.course.tenant.name,
      tenantCity: access.course.tenant.addressCity,
      tenantState: access.course.tenant.addressState,
      completedAt: access.completedAt,
      instructorName: certConfig.instructorName || access.course.tenant.name,
      instructorTitle: certConfig.instructorTitle || 'Instrutora Responsável',
      hours: certConfig.hours || 16,
      borderStyle: certConfig.borderStyle || 'GOLD',
      programmaticContent: certConfig.programmaticContent || null
    });
  });
};
