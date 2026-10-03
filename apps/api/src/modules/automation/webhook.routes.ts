import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma';
import { JevDecisionEngine } from './jev.service';
import { EvolutionService } from './evolution.service';
import { waitlistQueue } from './queues';

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // POST /webhooks/whatsapp - Webhook da Evolution API v2
  app.post('/whatsapp', async (request, reply) => {
    const body = request.body as any;

    if (!body || !body.data) {
      return reply.status(200).send({ status: 'ignored_empty' });
    }

    const instanceName = body.instance;
    const messageData = body.data;
    const key = messageData.key || {};

    // Ignora mensagens enviadas pelo próprio bot (fromMe: true)
    if (key.fromMe) {
      return reply.status(200).send({ status: 'ignored_from_me' });
    }

    const remoteJid = key.remoteJid || '';
    const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const clientPhone = rawPhone.startsWith('55') ? rawPhone.slice(2) : rawPhone;

    // Extrai o texto da mensagem recebida
    const messageText =
      messageData.message?.conversation ||
      messageData.message?.extendedTextMessage?.text ||
      messageData.message?.buttonsResponseMessage?.selectedDisplayText ||
      '';

    if (!messageText) {
      return reply.status(200).send({ status: 'ignored_no_text' });
    }

    // Identifica o salão associado à instância
    const config = await prisma.whatsappConfig.findFirst({
      where: { instanceName },
      include: { tenant: true }
    });

    if (!config || !config.tenant) {
      return reply.status(200).send({ status: 'tenant_not_found' });
    }

    const tenant = config.tenant;

    // Busca o cliente pelo telefone
    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phone: { endsWith: clientPhone.slice(-8) } // Tolerância para 8 ou 9 dígitos com/sem DDD
      }
    });

    // Classificação ultra-rápida de intenção com TypeSafe Jev (<50ms)
    const decision = JevDecisionEngine.classify(messageText);

    // 1. AÇÃO: Confirmar Presença
    if (decision.intent === 'CONFIRM_APPOINTMENT' && client) {
      const upcomingSchedule = await prisma.schedule.findFirst({
        where: {
          clientId: client.id,
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: { in: ['CONFIRMED', 'PENDING'] }
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      });

      if (upcomingSchedule) {
        await prisma.schedule.update({
          where: { id: upcomingSchedule.id },
          data: { status: 'CONFIRMED' }
        });

        await EvolutionService.sendTextMessage(
          tenant.id,
          client.phone,
          `Obrigado por confirmar, ${client.name}! ✨ Sua presença está garantida para ${upcomingSchedule.startTime}. Estamos te esperando com tudo pronto!`
        );

        return reply.status(200).send({ handled: true, action: 'confirmed' });
      }
    }

    // 2. AÇÃO: Cancelar ou Remarcar (Aciona Smart Waitlist Auto-Fill)
    if (decision.intent === 'CANCEL_OR_RESCHEDULE' && client) {
      const upcomingSchedule = await prisma.schedule.findFirst({
        where: {
          clientId: client.id,
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: { in: ['CONFIRMED', 'PENDING'] }
        },
        include: { service: true, professional: true }
      });

      if (upcomingSchedule) {
        await prisma.schedule.update({
          where: { id: upcomingSchedule.id },
          data: { status: 'CANCELLED' }
        });

        // Dispara imediatamente o preenchimento de vaga pela fila de espera (BullMQ)
        const dateStr = upcomingSchedule.date.toISOString().slice(0, 10);
        await waitlistQueue.add('auto-fill-vacancy', {
          tenantId: tenant.id,
          dateStr,
          startTime: upcomingSchedule.startTime,
          serviceId: upcomingSchedule.serviceId,
          professionalId: upcomingSchedule.professionalId
        });

        await EvolutionService.sendTextMessage(
          tenant.id,
          client.phone,
          `Compreendido, ${client.name}. Seu horário foi cancelado. Se quiser escolher um novo momento para seu atendimento, basta acessar: marquesuahora.com.br/${tenant.slug}\n\nSerá um prazer te receber quando estiver disponível!`
        );

        return reply.status(200).send({ handled: true, action: 'cancelled_waitlist_triggered' });
      }
    }

    // 3. AÇÃO: Aceite de Vaga da Lista de Espera
    if (decision.intent === 'ACCEPT_WAITLIST_SLOT' && client) {
      const activeWaitlist = await prisma.waitlistEntry.findFirst({
        where: {
          clientId: client.id,
          status: 'NOTIFIED',
          expiresAt: { gt: new Date() }
        },
        orderBy: { notifiedAt: 'desc' }
      });

      if (activeWaitlist) {
        // Converte a vaga em agendamento
        await prisma.waitlistEntry.update({
          where: { id: activeWaitlist.id },
          data: { status: 'CONVERTED' }
        });

        await EvolutionService.sendTextMessage(
          tenant.id,
          client.phone,
          `Excelente, ${client.name}! 🎉 Vaga garantida! Seu horário foi reservado com sucesso no *${tenant.name}*. Estamos preparando tudo para te atender!`
        );

        return reply.status(200).send({ handled: true, action: 'waitlist_converted' });
      }
    }

    // 4. AÇÃO: Avaliação de Satisfação NPS (1 a 5 estrelas)
    if (decision.intent === 'NPS_FEEDBACK' && client && decision.extractedScore) {
      const recentSchedule = await prisma.schedule.findFirst({
        where: {
          clientId: client.id,
          status: 'COMPLETED'
        },
        orderBy: { date: 'desc' }
      });

      if (recentSchedule) {
        await prisma.schedule.update({
          where: { id: recentSchedule.id },
          data: {
            npsScore: decision.extractedScore,
            npsFeedback: decision.extractedReason || messageText
          }
        });

        // Se nota 5 (Promotor) e salão configurou Google Review, direciona com link
        if (decision.extractedScore === 5 && tenant.googleReviewUrl) {
          await EvolutionService.sendTextMessage(
            tenant.id,
            client.phone,
            `Ficamos muito felizes que você tenha amado a experiência, ${client.name}! ⭐️✨\n\nVocê nos ajudaria com 30 segundinhos deixando essa mesma avaliação no nosso perfil do Google? Isso ajuda muito o nosso negócio a crescer:\n\n👉 ${tenant.googleReviewUrl}\n\nMuito obrigado pelo carinho!`
          );
        } else {
          await EvolutionService.sendTextMessage(
            tenant.id,
            client.phone,
            `Agradecemos de coração pela sua avaliação sincera, ${client.name}! Nosso compromisso é sempre proporcionar momentos impecáveis para você.`
          );
        }

        return reply.status(200).send({ handled: true, action: 'nps_recorded' });
      }
    }

    // 5. Fallback para Dúvidas Gerais
    await EvolutionService.sendTextMessage(
      tenant.id,
      clientPhone,
      `Olá! Recebemos sua mensagem no *${tenant.name}*. Nossa recepção já foi notificada para te responder em instantes.\n\nPara agendar um horário diretamente pelo celular a qualquer hora, acesse: marquesuahora.com.br/${tenant.slug}`
    );

    return reply.status(200).send({ handled: true, action: 'fallback_replied' });
  });
};
