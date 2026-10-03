import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { onlyDigits } from '@marquesuahora/shared';

const professionalInputSchema = z.object({
  name: z.string().min(2, 'O nome do profissional é obrigatório.'),
  phone: z
    .string()
    .transform((val) => onlyDigits(val))
    .refine((val) => val.length === 10 || val.length === 11, {
      message: 'Telefone/WhatsApp deve ter 10 ou 11 dígitos com DDD.'
    }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#7C3AED'),
  commissionRate: z.number().min(0).max(100).default(50),
  scheduleConfig: z.record(z.any()).optional().default({
    mon: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00' },
    tue: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00' },
    wed: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00' },
    thu: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00' },
    fri: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00' },
    sat: { start: '09:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    sun: { isOff: true }
  }),
  serviceIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().default(true)
});

export const professionalsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /professionals - Listar profissionais da loja
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const professionals = await prisma.professional.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        services: {
          include: {
            service: true
          }
        },
        _count: {
          select: { schedules: true }
        }
      }
    });

    return reply.send(professionals);
  });

  // POST /professionals - Cadastrar novo profissional
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    // Verifica limite do plano contratado
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        _count: { select: { professionals: { where: { isActive: true } } } }
      }
    });

    if (tenant?.plan && tenant.plan.maxProfessionals > 0) {
      if (tenant._count.professionals >= tenant.plan.maxProfessionals) {
        return reply.status(403).send({
          error: 'Limite do Plano Atingido',
          message: `Seu plano atual (${tenant.plan.name}) permite até ${tenant.plan.maxProfessionals} profissional(is) ativo(s). Faça um upgrade para adicionar mais membros.`
        });
      }
    }

    const data = professionalInputSchema.parse(request.body);

    const professional = await prisma.$transaction(async (tx) => {
      const prof = await tx.professional.create({
        data: {
          tenantId,
          name: data.name,
          phone: data.phone,
          color: data.color,
          commissionRate: data.commissionRate,
          scheduleConfig: data.scheduleConfig,
          isActive: data.isActive
        }
      });

      if (data.serviceIds && data.serviceIds.length > 0) {
        await tx.serviceProfessional.createMany({
          data: data.serviceIds.map((serviceId) => ({
            professionalId: prof.id,
            serviceId
          }))
        });
      }

      return prof;
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'PROFESSIONAL_CREATE',
        entityType: 'Professional',
        entityId: professional.id,
        details: { name: professional.name, phone: professional.phone },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return reply.status(201).send(professional);
  });

  // PUT /professionals/:id - Atualizar dados cadastrais e escala
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const { id } = request.params as { id: string };
    const data = professionalInputSchema.partial().parse(request.body);

    const updated = await prisma.$transaction(async (tx) => {
      const prof = await tx.professional.update({
        where: { id },
        data: {
          name: data.name,
          phone: data.phone,
          color: data.color,
          commissionRate: data.commissionRate,
          scheduleConfig: data.scheduleConfig,
          isActive: data.isActive
        }
      });

      if (data.serviceIds) {
        await tx.serviceProfessional.deleteMany({
          where: { professionalId: id }
        });
        if (data.serviceIds.length > 0) {
          await tx.serviceProfessional.createMany({
            data: data.serviceIds.map((serviceId) => ({
              professionalId: id,
              serviceId
            }))
          });
        }
      }

      return prof;
    });

    return reply.send(updated);
  });
};
