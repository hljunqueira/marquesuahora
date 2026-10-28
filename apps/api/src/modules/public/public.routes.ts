import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma';
import { BookingService } from '../schedules/booking.service';
import { AvailabilityService } from '../schedules/availability.service';
import { ScheduleStatus } from '@prisma/client';
import { whatsappQueue } from '../automation/queues';
import { z } from 'zod';
import { checkBrazilianHoliday } from '../../utils/brazilian-holidays';

// Rotas públicas do tenant: vitrine, agendamento online e cursos livres

export const DEFAULT_STANDARD_AFTERCARE_GUIDES = [
  {
    id: 'aftercare-unhas-gel',
    title: 'Alongamento em Gel & Fibra de Vidro',
    category: 'Unhas',
    description: 'Recomendações fundamentais para manter suas unhas impecáveis, resistentes e saudáveis.',
    items: [
      'Evite usar as unhas como ferramentas para abrir latas, gavetas, caixas ou raspar superfícies rígidas.',
      'Utilize luvas de proteção sempre que manusear produtos químicos de limpeza doméstica (cloro, água sanitária e detergentes concentrados).',
      'Hidrate diariamente as cutículas com óleo vegetal ou sérum nutritivo para preservar a flexibilidade do gel e o brilho do top coat.',
      'Respeite rigorosamente o período de manutenção (a cada 18 a 25 dias) para prevenir infiltrações, descolamentos e proteger a matriz natural da unha.',
      'Nunca tente arrancar o alongamento ou morder o gel. Em caso de qualquer descolamento acidental, entre em contato imediatamente com o studio.'
    ],
    isActive: true
  },
  {
    id: 'aftercare-esmaltacao-gel',
    title: 'Esmaltação em Gel & Blindagem Diamond',
    category: 'Unhas',
    description: 'Cuidados essenciais para garantir brilho espelhado e durabilidade superior a 20 dias.',
    items: [
      'Evite banhos muito quentes e contato contínuo com água fervente nas primeiras 12 horas após a aplicação.',
      'Não lixe as pontas das unhas em casa para não romper o selamento da borda livre feito em mesa.',
      'Caso deseje retirar qualquer esmalte comum aplicado sobre a blindagem, use exclusivamente removedor sem acetona.'
    ],
    isActive: true
  },
  {
    id: 'aftercare-cilios-lash',
    title: 'Extensão de Cílios & Lash Lifting',
    category: 'Cílios',
    description: 'Orientações práticas para retenção máxima do adesivo e preservação dos fios naturais.',
    items: [
      'Evite molhar a área dos olhos, vapor quente, saunas ou atividades físicas de alta sudorese nas primeiras 24 horas.',
      'Higienize os cílios diariamente a partir do segundo dia utilizando espuma micelar ou shampoo neutro diluído em água fria.',
      'Penteie suavemente as extensões com a escovinha limpa fornecida ao acordar e após secar o rosto.',
      'Não utilize máscaras de cílios (rímel) à prova d\'água nem demaquilantes à base de óleos na região dos olhos.'
    ],
    isActive: true
  }
];

function computeTenantOperatingSchedule(tenant: any) {
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
  const generalRules = (tenant.availabilityRules || []).filter((r: any) => !r.professionalId);
  const rulesToUse = generalRules.length > 0 ? generalRules : (tenant.availabilityRules || []);

  const DAY_NAMES = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];
  const SHORT_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const weeklySchedule = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const rule = rulesToUse.find((r: any) => r.dayOfWeek === day);
    const isOpen = rule ? rule.isActive : day !== 0;
    const startTime = rule?.startTime || tenant.openingTime || '09:00';
    const endTime = rule?.endTime || tenant.closingTime || '19:00';
    return {
      dayOfWeek: day,
      dayName: DAY_NAMES[day],
      shortName: SHORT_NAMES[day],
      isOpen,
      startTime,
      endTime,
      isToday: day === currentDayOfWeek
    };
  });

  const todayRule = rulesToUse.find((r: any) => r.dayOfWeek === currentDayOfWeek);
  let todayIsOpen = false;
  let todayOpeningTime = tenant.openingTime || '09:00';
  let todayClosingTime = tenant.closingTime || '19:00';

  if (isHolidayBlocked) {
    todayIsOpen = false;
  } else if (todayRule) {
    todayOpeningTime = todayRule.startTime;
    todayClosingTime = todayRule.endTime;
    todayIsOpen = todayRule.isActive;
  } else {
    todayIsOpen = currentDayOfWeek !== 0;
  }

  const isOpenNow = todayIsOpen && currentTimeStr >= todayOpeningTime && currentTimeStr < todayClosingTime;

  let todayScheduleLabel = '';
  if (isHolidayBlocked) {
    todayScheduleLabel = 'Feriado (Fechado hoje)';
  } else if (todayIsOpen) {
    todayScheduleLabel = `${todayOpeningTime} às ${todayClosingTime}`;
  } else {
    todayScheduleLabel = 'Fechado hoje';
  }

  const openDaysList = weeklySchedule.filter((d) => d.isOpen);
  let operatingHoursSummary = '';
  if (openDaysList.length === 7) {
    operatingHoursSummary = `Todos os dias das ${tenant.openingTime || '09:00'} às ${tenant.closingTime || '19:00'}`;
  } else if (openDaysList.length > 0) {
    operatingHoursSummary = openDaysList.map((d) => `${d.shortName}: ${d.startTime} às ${d.endTime}`).join(' · ');
  } else {
    operatingHoursSummary = 'Consulte horários na agenda';
  }

  return {
    todayOpeningTime,
    todayClosingTime,
    isOpenNow,
    todayIsOpen,
    todayScheduleLabel,
    weeklySchedule,
    operatingHoursSummary
  };
}

export const publicRoutes: FastifyPluginAsync = async (app) => {
  // GET /showcase/:slug ou /:slug - Dados completos da vitrine pública e link na bio
  const handleShowcase = async (slug: string, reply: any) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        plan: true,
        availabilityRules: {
          orderBy: [{ professionalId: 'asc' }, { dayOfWeek: 'asc' }]
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
    const schedule = computeTenantOperatingSchedule(tenant);

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
      addressComplement: tenant.addressComplement,
      addressNeighborhood: tenant.addressNeighborhood,
      addressCity: tenant.addressCity,
      addressState: tenant.addressState,
      addressZip: tenant.addressZip,
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
      openingTime: schedule.todayOpeningTime,
      closingTime: schedule.todayClosingTime,
      generalOpeningTime: tenant.openingTime || schedule.todayOpeningTime,
      generalClosingTime: tenant.closingTime || schedule.todayClosingTime,
      isOpenNow: schedule.isOpenNow,
      todayIsOpen: schedule.todayIsOpen,
      todayScheduleLabel: schedule.todayScheduleLabel,
      weeklySchedule: schedule.weeklySchedule,
      operatingHoursSummary: schedule.operatingHoursSummary,
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
      aftercareGuides: (Array.isArray(tenant.aftercareGuides) && tenant.aftercareGuides.length > 0)
        ? tenant.aftercareGuides
        : DEFAULT_STANDARD_AFTERCARE_GUIDES,
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

  // GET /check-slug/:slug - Validação de disponibilidade de slug para cadastro imediato (Lead Catcher)
  const RESERVED_SLUGS = new Set([
    'admin', 'dashboard', 'login', 'cadastro', 'api', 'app', 'suporte',
    'planos', 'auth', 'public', 'showcase', 'checkout', 'termos', 'privacidade'
  ]);

  app.get('/check-slug/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const normalized = (slug || '').trim().toLowerCase();

    if (!normalized || normalized.length < 3) {
      return reply.code(400).send({
        slug: normalized,
        isAvailable: false,
        message: 'O link deve conter no mínimo 3 caracteres.'
      });
    }

    if (!/^[a-z0-9-]+$/.test(normalized)) {
      return reply.code(400).send({
        slug: normalized,
        isAvailable: false,
        message: 'O link deve conter apenas letras, números e hífens.'
      });
    }

    if (RESERVED_SLUGS.has(normalized)) {
      return reply.send({
        slug: normalized,
        isAvailable: false,
        message: 'Este endereço é reservado pelo sistema.'
      });
    }

    const existing = await prisma.tenant.findUnique({
      where: { slug: normalized },
      select: { id: true }
    });

    if (existing) {
      return reply.send({
        slug: normalized,
        isAvailable: false,
        message: 'Este endereço já foi registrado por outro estabelecimento.'
      });
    }

    return reply.send({
      slug: normalized,
      isAvailable: true,
      message: 'Endereço disponível para registro imediato!'
    });
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
        availabilityRules: {
          orderBy: [{ professionalId: 'asc' }, { dayOfWeek: 'asc' }]
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
      return reply.status(404).send({ error: 'Não encontrado', message: 'Estabelecimento não localizado.' });
    }

    const schedule = computeTenantOperatingSchedule(tenant);
    const resolvedAftercareGuides = (Array.isArray(tenant.aftercareGuides) && tenant.aftercareGuides.length > 0)
      ? tenant.aftercareGuides
      : DEFAULT_STANDARD_AFTERCARE_GUIDES;

    const tenantPayload = {
      name: tenant.name,
      slug: tenant.slug,
      phone: tenant.phone,
      addressStreet: tenant.addressStreet,
      addressNumber: tenant.addressNumber,
      addressComplement: tenant.addressComplement,
      addressNeighborhood: tenant.addressNeighborhood,
      addressCity: tenant.addressCity,
      addressState: tenant.addressState,
      addressZip: tenant.addressZip,
      openingTime: schedule.todayOpeningTime,
      closingTime: schedule.todayClosingTime,
      generalOpeningTime: tenant.openingTime || schedule.todayOpeningTime,
      generalClosingTime: tenant.closingTime || schedule.todayClosingTime,
      todayIsOpen: schedule.todayIsOpen,
      todayScheduleLabel: schedule.todayScheduleLabel,
      operatingHoursSummary: schedule.operatingHoursSummary,
      weeklySchedule: schedule.weeklySchedule,
      isOpenNow: schedule.isOpenNow,
      pixKey: tenant.pixKey,
      pixKeyType: tenant.pixKeyType,
      pixKeyHolder: tenant.pixKeyHolder,
      googleReviewUrl: tenant.googleReviewUrl,
      instagramUrl: tenant.instagramUrl,
      aftercareGuides: resolvedAftercareGuides,
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
    };

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
        tenant: tenantPayload,
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
      tenant: tenantPayload,
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
        resultPhotoUrl: s.resultPhotoUrl,
        npsScore: s.npsScore,
        npsFeedback: s.npsFeedback
      }))
    });
  });

  // POST /public/client-portal/:slug/schedules/:scheduleId/review - Avaliação real pós-atendimento pela Área da Cliente
  app.post('/client-portal/:slug/schedules/:scheduleId/review', async (request, reply) => {
    const { slug, scheduleId } = request.params as { slug: string; scheduleId: string };

    const bodySchema = z.object({
      phone: z.string().min(10, 'Telefone com DDD é obrigatório.'),
      score: z.number().int().min(1, 'Nota mínima é 1 estrela.').max(5, 'Nota máxima é 5 estrelas.'),
      feedback: z.string().max(500, 'Comentário muito longo (máximo 500 caracteres).').optional().nullable()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Dados inválidos para avaliação.'
      });
    }

    const { phone, score, feedback } = parsed.data;
    const normalizedPhone = phone.replace(/\D/g, '');

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Estabelecimento não localizado.' });
    }

    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phone: normalizedPhone
      }
    });

    if (!client) {
      return reply.status(404).send({ error: 'CLIENT_NOT_FOUND', message: 'Cliente não localizada para este telefone.' });
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        tenantId: tenant.id,
        clientId: client.id
      }
    });

    if (!schedule) {
      return reply.status(404).send({ error: 'SCHEDULE_NOT_FOUND', message: 'Agendamento não encontrado para esta cliente.' });
    }

    if (schedule.status !== ScheduleStatus.COMPLETED) {
      return reply.status(400).send({
        error: 'NOT_COMPLETED',
        message: 'Apenas atendimentos já finalizados podem ser avaliados.'
      });
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        npsScore: score,
        npsFeedback: feedback?.trim() || null
      }
    });

    return reply.status(200).send({
      success: true,
      message: 'Avaliação registrada com sucesso! Agradecemos sua opinião.',
      schedule: {
        id: updated.id,
        npsScore: updated.npsScore,
        npsFeedback: updated.npsFeedback
      },
      googleReviewUrl: score >= 4 ? tenant.googleReviewUrl : null
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
