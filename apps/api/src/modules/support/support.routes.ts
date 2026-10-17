import { FastifyPluginAsync } from 'fastify';
import {
  createTicketSchema,
  createTicketMessageSchema,
  createTicketTaskSchema,
  updateTicketTaskSchema,
  updateTicketStatusSchema
} from '@marquesuahora/shared';
import { prisma } from '../../lib/prisma';
import { Role, TicketStatus, TicketSenderType, TicketCategory, TicketPriority } from '@prisma/client';
import { SupportAiService } from './support.ai.service.js';

export const supportRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /support/tickets - Lista os tickets da loja do assinante (ou todos se for SUPER_ADMIN)
  app.get('/tickets', async (request, reply) => {
    const isSuperAdmin = request.user.role === Role.SUPER_ADMIN;
    const tenantId = request.user.tenantId;

    if (!isSuperAdmin && !tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: isSuperAdmin ? {} : { tenantId: tenantId! },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, phone: true, niche: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        tasks: {
          orderBy: { position: 'asc' }
        },
        _count: {
          select: { messages: true, tasks: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return reply.send(tickets);
  });

  // POST /support/ai-chat - Atendimento interativo com IA e escalação para ticket do admin em até 24h se houver erro
  app.post('/ai-chat', async (request, reply) => {
    try {
      let tenantId = request.user?.tenantId;

      const body = request.body as {
        message: string;
        category?: string;
        protocol?: string;
      };

      if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
        return reply.status(400).send({ error: 'Dados inválidos', message: 'Mensagem obrigatória.' });
      }

      // Mapeia categoria enviada pelo frontend de forma tolerante
      let mappedCategory: TicketCategory = TicketCategory.DOUBT;
      if (body.category === 'MELHORIA' || body.category === TicketCategory.FEATURE_REQUEST) {
        mappedCategory = TicketCategory.FEATURE_REQUEST;
      } else if (body.category === 'FINANCEIRO' || body.category === TicketCategory.BILLING) {
        mappedCategory = TicketCategory.BILLING;
      } else if (body.category === TicketCategory.TECHNICAL_ISSUE) {
        mappedCategory = TicketCategory.TECHNICAL_ISSUE;
      }

      let tenantName: string | undefined;
      let tenantSlug: string | undefined;
      let tenantNiche: string | undefined;
      let userName = request.user?.name;
      let userEmail = request.user?.email;

      // Recuperação resiliente de dados com tolerância a falhas no banco de dados
      try {
        if (!tenantId && request.user?.sub) {
          const owned = await prisma.tenant.findFirst({
            where: { users: { some: { id: request.user.sub } } },
            select: { id: true, name: true, slug: true, niche: true }
          });
          if (owned) {
            tenantId = owned.id;
            tenantName = owned.name;
            tenantSlug = owned.slug;
            tenantNiche = owned.niche;
          }
        }

        if (tenantId && !tenantName) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, slug: true, niche: true }
          });
          if (tenant) {
            tenantName = tenant.name;
            tenantSlug = tenant.slug;
            tenantNiche = tenant.niche;
          }
        }

        if (request.user?.sub && (!userName || !userEmail)) {
          const user = await prisma.user.findUnique({
            where: { id: request.user.sub },
            select: { name: true, email: true }
          });
          if (user) {
            userName = user.name;
            userEmail = user.email;
          }
        }
      } catch (dbErr) {
        console.warn('[Support Routes] Aviso: Banco inacessível ao buscar dados de tenant/usuário, continuando com atendimento IA:', dbErr);
      }

      const result = await SupportAiService.processMessage({
        tenantId: tenantId || 'general',
        userId: request.user?.sub || 'user-anonymous',
        userName,
        userEmail,
        tenantName,
        tenantSlug,
        tenantNiche,
        messageText: body.message.trim(),
        category: mappedCategory,
        protocol: body.protocol
      });

      return reply.send(result);
    } catch (routeErr: any) {
      console.error('[Support Routes] Erro inesperado na rota /ai-chat, aplicando resposta de contingência:', routeErr);
      const protocol = (request.body as any)?.protocol || `#TK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      return reply.send({
        replyText: 'Olá! Sou o assistente de inteligência artificial do MarqueSuaHora. Estou pronto para te orientar sobre agendamentos, serviços, vitrine ou sinal anti-falta. Como posso te ajudar agora?',
        isTechnicalError: false,
        category: TicketCategory.DOUBT,
        priority: TicketPriority.LOW,
        protocol
      });
    }
  });

  // GET /support/active-ticket - Retorna o último chamado ativo do salão com histórico de mensagens
  app.get('/active-ticket', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        tenantId,
        status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_CLIENT] }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        tasks: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return reply.send(ticket || null);
  });

  // POST /support/tickets - Assinante abre novo chamado
  app.post('/tickets', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Apenas assinantes podem abrir tickets de suporte.' });
    }

    const data = createTicketSchema.parse(request.body);

    const protocol = `#TK-${Date.now().toString().slice(-6)}`;

    const ticket = await prisma.$transaction(async (tx) => {
      // 1. Cria o Ticket
      const t = await tx.supportTicket.create({
        data: {
          protocol,
          tenantId,
          userId: request.user.sub,
          subject: data.subject,
          category: data.category as TicketCategory,
          priority: data.priority as TicketPriority,
          status: TicketStatus.OPEN
        }
      });

      // 2. Cria a primeira mensagem
      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: request.user.sub,
          senderType: TicketSenderType.TENANT,
          content: data.initialMessage
        }
      });

      // 3. Tarefas sugeridas na checklist operacional do Admin SaaS
      const defaultTasksByCategory: Record<string, string[]> = {
        TECHNICAL_ISSUE: [
          'Reproduzir o comportamento relatado no ambiente de teste',
          'Inspecionar logs e erros da loja informada',
          'Aplicar correção e validar integridade',
          'Notificar dono do salão com retorno'
        ],
        BILLING: [
          'Verificar status da fatura no Asaas',
          'Conferir comprovante ou liquidação PIX',
          'Atualizar plano e desbloquear recursos da loja'
        ],
        FEATURE_REQUEST: [
          'Avaliar viabilidade técnica e impacto no sistema',
          'Incluir no backlog de melhorias da plataforma',
          'Dar retorno de acolhimento ao assinante'
        ],
        DOUBT: [
          'Esclarecer dúvida do assinante',
          'Enviar link de documentação ou tutorial em vídeo'
        ],
        OTHER: [
          'Analisar solicitação da loja',
          'Prestar orientação técnica'
        ]
      };

      const tasksToCreate = defaultTasksByCategory[data.category] || defaultTasksByCategory.OTHER;
      for (let idx = 0; idx < tasksToCreate.length; idx++) {
        await tx.ticketTask.create({
          data: {
            ticketId: t.id,
            title: tasksToCreate[idx],
            completed: false,
            position: idx
          }
        });
      }

      return t;
    });

    const fullTicket = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: {
        tenant: true,
        messages: true,
        tasks: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'SUPPORT_TICKET_CREATE',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        details: { protocol, subject: data.subject, category: data.category, priority: data.priority },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    }).catch(() => null);

    return reply.status(201).send(fullTicket);
  });

  // GET /support/tickets/:id - Detalhes do ticket com histórico completo de mensagens e checklist
  app.get('/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const isSuperAdmin = request.user.role === Role.SUPER_ADMIN;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        tenant: true,
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        tasks: { orderBy: { position: 'asc' } }
      }
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Chamado não localizado.' });
    }

    if (!isSuperAdmin && ticket.tenantId !== request.user.tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Acesso negado a este chamado.' });
    }

    return reply.send(ticket);
  });

  // POST /support/tickets/:id/messages - Resposta ao chamado (Dono ou Admin SaaS, com áudio/imagem opcional)
  app.post('/tickets/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const isSuperAdmin = request.user.role === Role.SUPER_ADMIN;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Chamado não localizado.' });
    }

    if (!isSuperAdmin && ticket.tenantId !== request.user.tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Acesso negado.' });
    }

    const data = createTicketMessageSchema.parse(request.body);
    const senderType = isSuperAdmin ? TicketSenderType.SUPER_ADMIN : TicketSenderType.TENANT;

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: request.user.sub,
          senderType,
          content: data.content || null,
          attachmentUrl: data.attachmentUrl || null,
          attachmentType: data.attachmentType || null,
          audioDurationSeconds: data.audioDurationSeconds || null,
          isInternalNote: data.isInternalNote
        }
      });

      const newStatus = isSuperAdmin ? TicketStatus.WAITING_CLIENT : TicketStatus.IN_PROGRESS;
      await tx.supportTicket.update({
        where: { id },
        data: { status: newStatus, updatedAt: new Date() }
      });

      return msg;
    });

    return reply.status(201).send(message);
  });

  // PATCH /support/tickets/:id/status - Atualizar status do chamado
  app.patch('/tickets/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateTicketStatusSchema.parse(request.body);

      const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.status === TicketStatus.RESOLVED || data.status === TicketStatus.CLOSED
          ? { closedAt: new Date() }
          : { closedAt: null })
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId: updated.tenantId,
        action: 'SUPPORT_TICKET_STATUS_UPDATE',
        entityType: 'SupportTicket',
        entityId: id,
        details: { status: data.status },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    }).catch(() => null);

    return reply.send(updated);
  });

  // POST /support/tickets/:id/tasks - Admin SaaS adiciona item à checklist operacional
  app.post('/tickets/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = createTicketTaskSchema.parse(request.body);

    const count = await prisma.ticketTask.count({ where: { ticketId: id } });

    const task = await prisma.ticketTask.create({
      data: {
        ticketId: id,
        title: data.title,
        completed: false,
        position: count
      }
    });

    return reply.status(201).send(task);
  });

  // PATCH /support/tasks/:taskId - Marca tarefa da checklist como concluída / pendente
  app.patch('/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const data = updateTicketTaskSchema.parse(request.body);

    const updated = await prisma.ticketTask.update({
      where: { id: taskId },
      data: {
        completed: data.completed
      }
    });

    return reply.send(updated);
  });
};
