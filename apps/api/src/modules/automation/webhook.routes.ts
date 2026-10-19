import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { JevDecisionEngine } from './jev.service';
import { EvolutionService } from './evolution.service';
import { OpenRouterService } from './openrouter.service';
import { AudioTranscriptionService } from './audio-transcription.service';
import { VisionService } from './vision.service';
import { AiAssistantService } from './ai-assistant.service';
import { ConversationMemoryService } from './conversation-memory.service';
import { waitlistQueue } from './queues';
import { BookingService } from '../schedules/booking.service';
import {
  BookingSource,
  NotificationCategory,
  NotificationPriority,
  NotificationTrigger,
  ScheduleStatus,
  TransactionType,
  PaymentMethod
} from '@prisma/client';
import { NotificationDispatcherService } from '../notifications/dispatcher.service';
import { NotificationsService } from '../notifications/notifications.service';
import { redis } from '../../lib/redis';

// Cache em memória para idempotência e controle de debounce (fallback caso Redis oscile)
const localProcessedMsgIds = new Map<string, number>();
const localWelcomeLocks = new Map<string, number>();
const localGreetingDebounces = new Map<string, number>();

function checkAndMarkProcessedMsg(msgId: string, ttlMs: number = 3600 * 1000): boolean {
  const now = Date.now();
  if (localProcessedMsgIds.size > 2000) {
    for (const [id, exp] of localProcessedMsgIds.entries()) {
      if (exp < now) localProcessedMsgIds.delete(id);
    }
  }
  const exp = localProcessedMsgIds.get(msgId);
  if (exp && exp > now) return false;
  localProcessedMsgIds.set(msgId, now + ttlMs);
  return true;
}

function checkAndMarkWelcomeMemory(tenantId: string, phone: string, ttlMs: number = 86400 * 1000): boolean {
  const key = `${tenantId}:${phone}`;
  const now = Date.now();
  if (localWelcomeLocks.size > 2000) {
    for (const [k, exp] of localWelcomeLocks.entries()) {
      if (exp < now) localWelcomeLocks.delete(k);
    }
  }
  const exp = localWelcomeLocks.get(key);
  if (exp && exp > now) return false;
  localWelcomeLocks.set(key, now + ttlMs);
  return true;
}

function checkAndMarkGreetingDebounceMemory(tenantId: string, phone: string, ttlMs: number = 30 * 1000): boolean {
  const key = `${tenantId}:${phone}`;
  const now = Date.now();
  if (localGreetingDebounces.size > 2000) {
    for (const [k, exp] of localGreetingDebounces.entries()) {
      if (exp < now) localGreetingDebounces.delete(k);
    }
  }
  const exp = localGreetingDebounces.get(key);
  if (exp && exp > now) return false;
  localGreetingDebounces.set(key, now + ttlMs);
  return true;
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // POST /webhooks/whatsapp - Webhook da Evolution API v2
  app.post('/whatsapp', async (request, reply) => {
    const body = request.body as any;

    if (!body) {
      return reply.status(200).send({ status: 'ignored_empty' });
    }

    const eventName = (body.event || '').toLowerCase();
    const instanceName = body.instance;

    // 1. Trata eventos de atualização de conexão da instância (QR Code lido ou desconexão)
    if (eventName === 'connection.update' || eventName === 'connection_update') {
      const state = body.data?.state;
      if (instanceName && state) {
        if (state === 'open') {
          const ownerJid = body.data?.owner || body.data?.wuid || '';
          const phone = ownerJid ? ownerJid.replace('@s.whatsapp.net', '').replace(/\D/g, '') : null;
          await prisma.whatsappConfig.updateMany({
            where: { instanceName },
            data: {
              isConnected: true,
              qrCode: null,
              ...(phone ? { phoneNumber: phone } : {})
            }
          });

          // Envia mensagem automática de boas-vindas confirmando a conexão no próprio WhatsApp
          const connectedConfig = await prisma.whatsappConfig.findFirst({
            where: { instanceName },
            include: { tenant: true }
          });
          const targetPhone = phone || connectedConfig?.phoneNumber;
          if (connectedConfig && targetPhone) {
            EvolutionService.sendTextMessage(
              connectedConfig.tenantId,
              targetPhone,
              `Ola! O WhatsApp da recepcao do estabelecimento *${connectedConfig.tenant.name}* foi conectado com sucesso ao MarqueSuaHora.\n\nA sua Atendente IA e as confirmacoes automaticas de agendamento ja estao ativas no seu numero.`
            ).catch((err) => {
              console.warn('[WhatsApp Webhook] Falha ao enviar mensagem de boas-vindas:', err.message);
            });
          }

          return reply.status(200).send({ handled: true, event: 'connected' });
        } else if (state === 'close') {
          await prisma.whatsappConfig.updateMany({
            where: { instanceName },
            data: { isConnected: false }
          });
          return reply.status(200).send({ handled: true, event: 'disconnected' });
        }
      }
      return reply.status(200).send({ handled: true, event: 'connection_update_ignored' });
    }

    // 2. Trata eventos de atualização de QR Code
    if (eventName === 'qrcode.updated' || eventName === 'qrcode_updated') {
      const newQr = body.data?.qrcode?.base64 || body.data?.base64 || null;
      if (instanceName && newQr) {
        await prisma.whatsappConfig.updateMany({
          where: { instanceName },
          data: { qrCode: newQr, isConnected: false }
        });
        return reply.status(200).send({ handled: true, event: 'qrcode_updated' });
      }
      return reply.status(200).send({ handled: true, event: 'qrcode_update_ignored' });
    }

    if (!body.data) {
      return reply.status(200).send({ status: 'ignored_no_data' });
    }

    // Normalização defensiva: body.data pode ser um objeto, um array de mensagens, ou conter messages[]
    const messageData = Array.isArray(body.data) 
      ? body.data[0] 
      : (body.data?.messages?.[0] || body.data || {});

    const key = messageData.key || {};

    // Extrai os possíveis identificadores de telefone (suporte a JID tradicional, LID do WhatsApp Web e participantes)
    const jidCandidates = [
      key.remoteJidAlt,
      key.remoteJid,
      key.participant,
      messageData.sender,
      body.sender,
      body.data?.sender
    ].filter(Boolean) as string[];

    // Prioriza o JID que contenha o número real de telefone (@s.whatsapp.net ou formato numérico)
    let phoneJid = jidCandidates.find(j => j.includes('@s.whatsapp.net')) || jidCandidates[0] || '';
    let cleanJid = phoneJid.split('@')[0].split(':')[0];
    let rawPhone = cleanJid.replace(/\D/g, '');

    // Se ainda parecer um LID (>14 dígitos numéricos não começando com DDI 55), tenta encontrar outro candidato válido
    if (rawPhone.length > 14 && !rawPhone.startsWith('55')) {
      const realPhoneCandidate = jidCandidates.find(j => {
        const d = j.split('@')[0].split(':')[0].replace(/\D/g, '');
        return d.startsWith('55') && (d.length === 12 || d.length === 13);
      });
      if (realPhoneCandidate) {
        rawPhone = realPhoneCandidate.split('@')[0].split(':')[0].replace(/\D/g, '');
      }
    }

    const clientPhone = rawPhone.startsWith('55') ? rawPhone.slice(2) : rawPhone;

    // Identifica o salão associado à instância
    const config = await prisma.whatsappConfig.findFirst({
      where: { instanceName },
      include: { tenant: true }
    });

    if (!config || !config.tenant) {
      console.warn(`[WhatsApp Webhook] Estabelecimento não localizado para a instância: ${instanceName}`);
      return reply.status(200).send({ status: 'tenant_not_found' });
    }

    // Se for mensagem originada do próprio aparelho conectado (fromMe = true)
    if (key.fromMe) {
      const salonDigits = (config.phoneNumber || '').replace(/\D/g, '');
      const isSelfChat = salonDigits && (rawPhone.includes(salonDigits.slice(-8)) || salonDigits.includes(rawPhone.slice(-8)));
      if (!isSelfChat) {
        return reply.status(200).send({ status: 'ignored_from_me' });
      }
      console.log(`[WhatsApp Webhook] Auto-conversa de teste detectada (fromMe = true): ${clientPhone}`);
    }

    const tenant = config.tenant;

    // Deduplicação de Mensagem (Idempotência por key.id para evitar processar a mesma mensagem duas vezes)
    if (key.id) {
      const msgDedupKey = `msh:msg_processed:${key.id}`;
      let isDuplicate = false;
      try {
        if (redis.status === 'ready') {
          const lock = await redis.set(msgDedupKey, '1', 'EX', 3600, 'NX');
          isDuplicate = (lock === null);
        } else {
          isDuplicate = !checkAndMarkProcessedMsg(key.id);
        }
      } catch {
        isDuplicate = !checkAndMarkProcessedMsg(key.id);
      }

      if (isDuplicate) {
        console.log(`[WhatsApp Webhook] Mensagem ${key.id} já processada recentemente. Ignorando duplicata.`);
        return reply.status(200).send({ status: 'ignored_duplicate_message' });
      }
    }

    const messageContent = messageData.message || {};
    const isAudio = Boolean(messageContent.audioMessage || messageData.messageType === 'audioMessage');
    const isImage = Boolean(messageContent.imageMessage || messageData.messageType === 'imageMessage');

    let messageText =
      (typeof messageData.body === 'string' ? messageData.body : '') ||
      messageContent.conversation ||
      messageContent.extendedTextMessage?.text ||
      messageContent.buttonsResponseMessage?.selectedDisplayText ||
      messageContent.templateButtonReplyMessage?.selectedDisplayText ||
      messageContent.listResponseMessage?.title ||
      messageContent.ephemeralMessage?.message?.conversation ||
      messageContent.ephemeralMessage?.message?.extendedTextMessage?.text ||
      messageContent.viewOnceMessage?.message?.conversation ||
      messageContent.viewOnceMessage?.message?.extendedTextMessage?.text ||
      '';

    // 1. Processamento de Áudio com Whisper via OpenRouter
    if (isAudio && key.id) {
      const audioBase64 = await EvolutionService.getMediaBase64(instanceName, key.id, config.apiKey || undefined);
      if (audioBase64) {
        const transcribed = await AudioTranscriptionService.transcribe({
          base64Data: audioBase64,
          format: 'ogg'
        });
        if (transcribed) {
          messageText = transcribed;
          console.log(`[WhatsApp Áudio Transcrito] "${transcribed}" de ${clientPhone}`);
        }
      }
    }

    // 2. Processamento de Imagens com Visão Multimodal (Comprovante PIX ou Referência Estética)
    if (isImage && key.id) {
      const imageBase64 = await EvolutionService.getMediaBase64(instanceName, key.id, config.apiKey || undefined);
      if (imageBase64) {
        // Tenta identificar se é comprovante PIX
        const pixAnalysis = await VisionService.analyzePixReceipt(imageBase64);
        if (pixAnalysis.isPixReceipt && pixAnalysis.status === 'SUCCESS') {
          const valueStr = pixAnalysis.amount ? `no valor de R$ ${Number(pixAnalysis.amount).toFixed(2)}` : '';
          const replyText = `Recebemos seu comprovante de PIX ${valueStr}! Nossa equipe já foi notificada para confirmar a baixa do seu sinal e garantir o seu horário. Muito obrigado!`;
          await EvolutionService.sendTextMessage(tenant.id, clientPhone, replyText);
          return reply.status(200).send({ handled: true, action: 'pix_receipt_received' });
        }

        // Tenta identificar se é foto de referência estética (unha, corte, penteado)
        const activeServices = await prisma.service.findMany({
          where: { tenantId: tenant.id, allowOnlineBooking: true },
          select: { name: true }
        });
        const beautyAnalysis = await VisionService.analyzeBeautyReference(
          imageBase64,
          activeServices.map(s => s.name)
        );

        if (beautyAnalysis.isBeautyReference) {
          const serviceRecommendation = beautyAnalysis.recommendedServiceNames?.length
            ? ` Esse procedimento combina muito com nosso serviço de *${beautyAnalysis.recommendedServiceNames[0]}*.`
            : '';
          const replyText = `Que linda essa referência!${serviceRecommendation}\n\nPara conferir os profissionais disponíveis e escolher o melhor dia e horário para fazer esse atendimento, acesse nosso link oficial:\n👉 https://marquesuahora.com.br/${tenant.slug}`;
          await EvolutionService.sendTextMessage(tenant.id, clientPhone, replyText);
          return reply.status(200).send({ handled: true, action: 'beauty_reference_analyzed' });
        }
      }
    }

    if (!messageText) {
      return reply.status(200).send({ status: 'ignored_no_text' });
    }

    console.log(`[WhatsApp Inbound] Instância: ${instanceName} | Salão: ${tenant.name} | De: ${clientPhone} | Texto: "${messageText}"`);

    // Busca o cliente pelo telefone
    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phone: { endsWith: clientPhone.slice(-8) } // Tolerância para 8 ou 9 dígitos com/sem DDD
      }
    });

    // 0. AÇÃO: Mensagem de Boas-Vindas para Saudações Iniciais ("Olá", "oi", "bom dia", etc)
    const cleanLowerText = messageText.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isPureGreeting = /^(oi|ola|oie|opa|bom dia|boa tarde|boa noite|ola tudo bem|oi tudo bem|hello|hey)[\s!.,?]*$/i.test(cleanLowerText);

    if (isPureGreeting && tenant.welcomeMessageEnabled !== false) {
      const cleanPhone = clientPhone.replace(/\D/g, '');
      const welcomeLockKey = `msh:welcome_sent:${tenant.id}:${cleanPhone}`;
      const recentGreetingKey = `msh:greeting_debounced:${tenant.id}:${cleanPhone}`;

      // 1. Verifica se já enviou boas-vindas nas últimas 24 horas (86400s)
      let alreadyWelcomed = false;
      try {
        if (redis.status === 'ready') {
          // SET com NX garante lock atômico: retorna 'OK' se foi definido agora (primeira vez), ou null se já existia
          const lockResult = await redis.set(welcomeLockKey, '1', 'EX', 86400, 'NX');
          alreadyWelcomed = (lockResult === null);
        } else {
          alreadyWelcomed = !checkAndMarkWelcomeMemory(tenant.id, cleanPhone, 86400 * 1000);
        }
      } catch {
        alreadyWelcomed = !checkAndMarkWelcomeMemory(tenant.id, cleanPhone, 86400 * 1000);
      }

      if (alreadyWelcomed) {
        // O cliente já recebeu as boas-vindas completas nas últimas 24h.
        // Debounce de 30 segundos para saudações consecutivas ("oi", "olá" em sequência):
        let isDebounced = false;
        try {
          if (redis.status === 'ready') {
            const deb = await redis.set(recentGreetingKey, '1', 'EX', 30, 'NX');
            isDebounced = (deb === null);
          } else {
            isDebounced = !checkAndMarkGreetingDebounceMemory(tenant.id, cleanPhone, 30 * 1000);
          }
        } catch {
          isDebounced = !checkAndMarkGreetingDebounceMemory(tenant.id, cleanPhone, 30 * 1000);
        }

        if (isDebounced) {
          console.log(`[WhatsApp Boas-Vindas] Saudação de ${clientPhone} ignorada por debounce de 30s.`);
          return reply.status(200).send({ handled: true, action: 'greeting_debounced' });
        }

        // Se já passaram mais de 30 segundos, responde de forma natural, calorosa e concisa:
        const clientDisplayName = client?.name ? `, ${client.name}` : '';
        const shortGreeting = `Olá${clientDisplayName}! Como posso te ajudar hoje? Se quiser agendar ou consultar nossos serviços, produtos e cursos, é só acessar: https://marquesuahora.com.br/${tenant.slug}`;

        console.log(`[WhatsApp Boas-Vindas] Cliente ${clientPhone} já recebeu boas-vindas nas últimas 24h. Enviando saudação curta.`);
        await EvolutionService.sendTextMessage(tenant.id, clientPhone, shortGreeting);
        await ConversationMemoryService.addMessage(tenant.id, clientPhone, 'user', messageText);
        await ConversationMemoryService.addMessage(tenant.id, clientPhone, 'assistant', shortGreeting);

        return reply.status(200).send({ handled: true, action: 'greeting_short_replied' });
      }

      // Dispara o template de boas-vindas configurado (1ª vez nas 24h):
      let welcomeText = (tenant.welcomeMessageCustom?.trim()) ||
        'Olá, {cliente}! Seja muito bem-vinda(o) ao *{salão}*!\n\nComo posso te ajudar hoje?\n• Agendar um horário (qual procedimento você gostaria de realizar?)\n• Conhecer nossos serviços, produtos e cursos\n• Tirar dúvidas\n\nSe preferir escolher o seu profissional e agendar online com facilidade, acesse nosso link oficial:\n👉 {link}';

      const clientDisplayName = client?.name || 'cliente';
      welcomeText = welcomeText
        .replace(/{cliente}/gi, clientDisplayName)
        .replace(/{salão}|{salao}/gi, tenant.name)
        .replace(/{link}/gi, `https://marquesuahora.com.br/${tenant.slug}`);

      console.log(`[WhatsApp Boas-Vindas] Enviando mensagem de boas-vindas inicial para ${clientPhone} (${tenant.name})`);

      await EvolutionService.sendTextMessage(tenant.id, clientPhone, welcomeText);
      await ConversationMemoryService.addMessage(tenant.id, clientPhone, 'user', messageText);
      await ConversationMemoryService.addMessage(tenant.id, clientPhone, 'assistant', welcomeText);

      return reply.status(200).send({ handled: true, action: 'welcome_message_sent' });
    }

    // Classificação de intenção com TypeSafe Jev (Local + System One API)
    const decision = await JevDecisionEngine.classifyAsync(messageText);

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
          `Obrigado por confirmar, ${client.name}! Sua presença está garantida para ${upcomingSchedule.startTime}. Estamos te esperando com tudo pronto!`
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
          rawPhone,
          `Compreendido, ${client.name}. Seu horário foi cancelado. Se quiser escolher um novo momento para seu atendimento, basta acessar: https://marquesuahora.com.br/${tenant.slug}\n\nSerá um prazer te receber quando estiver disponível!`
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

        // Cria o agendamento real no banco de dados com advisory lock
        let serviceIdToBook = activeWaitlist.serviceId;
        if (!serviceIdToBook) {
          const firstService = await prisma.service.findFirst({
            where: { tenantId: tenant.id, allowOnlineBooking: true }
          });
          serviceIdToBook = firstService?.id || null;
        }

        if (serviceIdToBook) {
          const slotTime = activeWaitlist.preferredShift && activeWaitlist.preferredShift.includes(':')
            ? activeWaitlist.preferredShift
            : '09:00';
          const dateStr = activeWaitlist.date.toISOString().slice(0, 10);

          await BookingService.createBooking({
            tenantId: tenant.id,
            serviceIds: [serviceIdToBook],
            professionalId: activeWaitlist.professionalId || undefined,
            dateStr,
            startTime: slotTime,
            clientName: client.name,
            clientPhone: client.phone,
            source: BookingSource.WAITLIST_AUTOFILL
          }).catch((err) => {
            console.warn('[Waitlist Booking] Erro ao criar agendamento da fila de espera:', err.message);
          });
        }

        await EvolutionService.sendTextMessage(
          tenant.id,
          rawPhone,
          `Excelente, ${client.name}! Vaga garantida! Seu horário foi reservado com sucesso no *${tenant.name}*. Estamos preparando tudo para te atender!`
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
            `Ficamos muito felizes que você tenha amado a experiência, ${client.name}!\n\nVocê nos ajudaria com 30 segundinhos deixando essa mesma avaliação no nosso perfil do Google? Isso ajuda muito o nosso negócio a crescer:\n\n👉 ${tenant.googleReviewUrl}\n\nMuito obrigado pelo carinho!`
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

    // 5. Atendimento Inteligente para Dúvidas Gerais (System Two via OpenRouter ou Fallback) com Context Engine 360°
    // 5. Atendente IA Autônoma (Disponibilidade em Tempo Real, Memória de Turnos no Redis e Padrão Humanizer)
    const aiAnswer = await AiAssistantService.processMessage({
      tenantId: tenant.id,
      clientPhone,
      clientName: client?.name,
      messageText
    });

    await EvolutionService.sendTextMessage(tenant.id, clientPhone, aiAnswer);

    return reply.status(200).send({ handled: true, action: 'ai_autonomous_answered' });
  });

  // POST /webhooks/resend - Webhook de entrega e eventos de e-mail do Resend
  app.post('/resend', async (request, reply) => {
    const body = request.body as any;

    if (!body) {
      return reply.status(200).send({ received: true });
    }

    // Validação de assinatura Svix / Resend (se RESEND_WEBHOOK_SECRET configurado e cabeçalhos presentes)
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const svixId = request.headers['svix-id'] as string;
    const svixTimestamp = request.headers['svix-timestamp'] as string;
    const svixSignature = request.headers['svix-signature'] as string;

    if (secret && svixId && svixTimestamp && svixSignature) {
      try {
        const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret;
        const secretBytes = Buffer.from(secretKey, 'base64');
        const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
        const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
        const hmac = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
        const expectedSignatures = svixSignature.split(' ').map((s) => s.split(',')[1] || s);

        if (!expectedSignatures.includes(hmac)) {
          console.warn('[Resend Webhook] Aviso: Assinatura Svix recebida, verificação flexível para compatibilidade.');
        }
      } catch (err: any) {
        console.warn('[Resend Webhook] Erro ao validar assinatura:', err.message);
      }
    }

    const eventType = (body.type || body.event || '').toLowerCase();
    const data = body.data || {};
    const recipient = Array.isArray(data.to) ? data.to[0] : (data.to || '');

    // Se temos destinatário e evento, atualiza o NotificationLog mais recente correspondente
    if (recipient) {
      const mappedStatus =
        eventType.includes('delivered') ? 'DELIVERED' :
        eventType.includes('bounced') ? 'BOUNCED' :
        eventType.includes('complained') ? 'COMPLAINED' :
        eventType.includes('sent') ? 'SENT' :
        'PROCESSED';

      await prisma.notificationLog.updateMany({
        where: {
          channel: 'EMAIL',
          recipient: { contains: recipient }
        },
        data: {
          status: mappedStatus,
          errorMessage: eventType.includes('bounced') ? (data.bounce?.message || 'Bounced por rejeição do servidor') : null
        }
      }).catch((err) => {
        console.warn('[Resend Webhook] Erro ao atualizar NotificationLog:', err.message);
      });
    }

    return reply.status(200).send({
      received: true,
      event: eventType,
      timestamp: new Date().toISOString()
    });
  });

  // POST /webhooks/asaas - Webhook de pagamentos e assinaturas do Asaas
  app.post('/asaas', async (request, reply) => {
    // 1. Validação de Segurança via Header asaas-access-token
    const configuredSecret = process.env.ASAAS_WEBHOOK_SECRET?.trim();
    if (configuredSecret) {
      const incomingToken = (request.headers['asaas-access-token'] as string || '').trim();
      if (incomingToken !== configuredSecret) {
        console.warn('[Asaas Webhook] Tentativa de acesso não autorizada. Token inválido.');
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token de autorização do webhook Asaas inválido.'
        });
      }
    }

    const body = request.body as any;
    if (!body || !body.event) {
      return reply.status(200).send({ received: true, ignored: true });
    }

    const eventName = (body.event as string).toUpperCase();
    const payment = body.payment;
    const subscription = body.subscription;

    console.log(`[Asaas Webhook] Evento recebido: ${eventName}`, {
      paymentId: payment?.id,
      subscriptionId: payment?.subscription || subscription?.id,
      externalReference: payment?.externalReference || subscription?.externalReference
    });

    try {
      // --------------------------------------------------------------------------
      // CASO A: Cobrança de Sinal PIX de Agendamento (Anti-No-Show)
      // --------------------------------------------------------------------------
      const externalRef = (payment?.externalReference || '').trim();
      const isScheduleDeposit = externalRef.startsWith('schedule:') || externalRef.startsWith('schedule_');
      const scheduleId = isScheduleDeposit ? externalRef.replace(/^schedule[_:]/, '') : null;

      if (scheduleId) {
        const schedule = await prisma.schedule.findUnique({
          where: { id: scheduleId },
          include: {
            client: true,
            professional: true,
            service: true,
            tenant: true
          }
        });

        if (schedule) {
          if (eventName === 'PAYMENT_CONFIRMED' || eventName === 'PAYMENT_RECEIVED') {
            // Marca o sinal como pago e confirma o agendamento se estiver pendente
            await prisma.schedule.update({
              where: { id: schedule.id },
              data: {
                depositPaid: true,
                status: schedule.status === ScheduleStatus.PENDING ? ScheduleStatus.CONFIRMED : schedule.status
              }
            });

            // Registra entrada financeira automática do sinal
            await prisma.financialEntry.upsert({
              where: { scheduleId: schedule.id },
              update: {
                depositDeducted: payment.value || schedule.depositAmount,
                amount: payment.value || schedule.depositAmount
              },
              create: {
                tenantId: schedule.tenantId,
                scheduleId: schedule.id,
                professionalId: schedule.professionalId,
                type: TransactionType.INCOME,
                amount: payment.value || schedule.depositAmount,
                depositDeducted: payment.value || schedule.depositAmount,
                description: `Sinal PIX recebido via Asaas — ${schedule.client?.name || 'Cliente'}`,
                paymentMethod: PaymentMethod.PIX,
                paidAt: new Date()
              }
            });

            // Dispara notificação de confirmação do sinal ao cliente
            await NotificationDispatcherService.dispatch({
              tenantId: schedule.tenantId,
              trigger: NotificationTrigger.PAYMENT_CONFIRMED,
              scheduleId: schedule.id,
              data: {
                clientName: schedule.client?.name,
                clientFirstName: schedule.client?.name?.split(' ')[0],
                clientPhone: schedule.client?.phone,
                clientEmail: schedule.client?.email || undefined,
                serviceName: schedule.service?.name,
                professionalName: schedule.professional?.name,
                date: schedule.date.toISOString().slice(0, 10).split('-').reverse().join('/'),
                time: schedule.startTime,
                depositAmount: Number(payment.value || schedule.depositAmount).toFixed(2),
                businessName: schedule.tenant?.name
              }
            });

            // Se o agendamento estava PENDENTE aguardando sinal, avisa também a equipe
            if (schedule.status === ScheduleStatus.PENDING) {
              await NotificationDispatcherService.dispatch({
                tenantId: schedule.tenantId,
                trigger: NotificationTrigger.BOOKING_NEW_TEAM,
                scheduleId: schedule.id,
                data: {
                  clientName: schedule.client?.name,
                  clientFirstName: schedule.client?.name?.split(' ')[0],
                  clientPhone: schedule.client?.phone,
                  serviceName: schedule.service?.name,
                  professionalName: schedule.professional?.name,
                  professionalPhone: schedule.professional?.phone,
                  date: schedule.date.toISOString().slice(0, 10).split('-').reverse().join('/'),
                  time: schedule.startTime,
                  duration: `${schedule.totalDurationMinutes} min`,
                  price: Number(schedule.totalPrice).toFixed(2)
                }
              });
            }
          } else if (eventName === 'PAYMENT_OVERDUE' || eventName === 'PAYMENT_DELETED') {
            // Se o sinal não foi pago no tempo de tolerância e o agendamento ainda está PENDENTE, cancela
            if (schedule.status === ScheduleStatus.PENDING) {
              await prisma.schedule.update({
                where: { id: schedule.id },
                data: { status: ScheduleStatus.CANCELLED }
              });

              await NotificationDispatcherService.dispatch({
                tenantId: schedule.tenantId,
                trigger: NotificationTrigger.BOOKING_CANCELLED_CLIENT,
                scheduleId: schedule.id,
                data: {
                  clientName: schedule.client?.name,
                  clientFirstName: schedule.client?.name?.split(' ')[0],
                  clientPhone: schedule.client?.phone,
                  clientEmail: schedule.client?.email || undefined,
                  serviceName: schedule.service?.name,
                  date: schedule.date.toISOString().slice(0, 10).split('-').reverse().join('/'),
                  time: schedule.startTime,
                  businessName: schedule.tenant?.name
                }
              });
            }
          }

          return reply.status(200).send({
            received: true,
            type: 'SCHEDULE_DEPOSIT',
            scheduleId: schedule.id,
            event: eventName
          });
        }
      }

      // --------------------------------------------------------------------------
      // CASO B: Assinatura / Mensalidade do Salão (Plano MarqueSuaHora)
      // --------------------------------------------------------------------------
      const subId = payment?.subscription || subscription?.id || null;
      const custId = payment?.customer || subscription?.customer || null;
      const tenantRef = (payment?.externalReference || subscription?.externalReference || '')
        .replace(/^tenant[_:]/, '')
        .trim();

      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            ...(subId ? [{ asaasSubscriptionId: subId }] : []),
            ...(custId ? [{ asaasCustomerId: custId }] : []),
            ...(tenantRef ? [{ id: tenantRef }] : [])
          ]
        },
        include: { plan: true }
      });

      if (!tenant) {
        console.warn('[Asaas Webhook] Salão/Tenant não localizado para o evento:', {
          subId,
          custId,
          tenantRef,
          eventName
        });
        return reply.status(200).send({ received: true, handled: false, reason: 'TENANT_NOT_FOUND' });
      }

      // 1. Confirmação / Recebimento de Mensalidade
      if (eventName === 'PAYMENT_CONFIRMED' || eventName === 'PAYMENT_RECEIVED' || eventName === 'PAYMENT_RESTORED') {
        const isVip = Boolean(
          tenant.plan?.code === 'VIP_PRO' ||
          tenant.plan?.code === 'VIP_AI' ||
          (tenant.plan?.name && tenant.plan.name.toUpperCase().includes('VIP')) ||
          tenant.billingStatus === 'GRATUITY'
        );

        let matchedPlanId = tenant.planId;
        if (!isVip) {
          const desc = (payment?.description || subscription?.description || '').toUpperCase();
          if (desc.includes('EQUIPE') || desc.includes('PRO')) {
            const eqPlan = await prisma.plan.findUnique({ where: { code: 'EQUIPE_PRO' } });
            if (eqPlan) matchedPlanId = eqPlan.id;
          } else if (desc.includes('SOLO')) {
            const soloPlan = await prisma.plan.findUnique({ where: { code: 'SOLO' } });
            if (soloPlan) matchedPlanId = soloPlan.id;
          } else if (payment?.value) {
            const planByPrice = await prisma.plan.findFirst({
              where: {
                monthlyPrice: Number(payment.value),
                active: true
              }
            });
            if (planByPrice) matchedPlanId = planByPrice.id;
          }
        }

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            billingStatus: 'ACTIVE',
            blockedReason: null,
            blockedAt: null,
            ...(matchedPlanId && !isVip ? { planId: matchedPlanId } : {}),
            ...(subId && !tenant.asaasSubscriptionId ? { asaasSubscriptionId: subId } : {}),
            ...(custId && !tenant.asaasCustomerId ? { asaasCustomerId: custId } : {})
          }
        });

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: 'TENANT_PLAN_PAYMENT_CONFIRMED',
            entityType: 'Tenant',
            entityId: tenant.id,
            details: {
              paymentId: payment?.id,
              subscriptionId: subId,
              amount: payment?.value,
              billingType: payment?.billingType,
              event: eventName,
              isVipPreserved: isVip
            }
          }
        });

        await NotificationsService.create({
          tenantId: tenant.id,
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.HIGH,
          title: 'Mensalidade Confirmada',
          message: `O pagamento do seu plano ${tenant.plan?.name || ''} no valor de R$ ${Number(payment?.value || tenant.plan?.monthlyPrice || 0).toFixed(2)} foi confirmado com sucesso. Sua conta está 100% ativa!`,
          link: '/dashboard/configuracoes'
        });
      }

      // 2. Fatura em atraso (OVERDUE)
      else if (eventName === 'PAYMENT_OVERDUE') {
        // Altera status para OVERDUE mantendo a loja navegável temporariamente
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { billingStatus: 'OVERDUE' }
        });

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: 'TENANT_PLAN_PAYMENT_OVERDUE',
            entityType: 'Tenant',
            entityId: tenant.id,
            details: {
              paymentId: payment?.id,
              subscriptionId: subId,
              amount: payment?.value,
              dueDate: payment?.dueDate,
              event: eventName
            }
          }
        });

        await NotificationsService.create({
          tenantId: tenant.id,
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.URGENT,
          title: 'Mensalidade em Atraso',
          message: `A fatura da sua assinatura no valor de R$ ${Number(payment?.value || tenant.plan?.monthlyPrice || 0).toFixed(2)} venceu em ${payment?.dueDate || 'hoje'}. Regularize para evitar o bloqueio dos agendamentos online.`,
          link: '/dashboard/configuracoes'
        });
      }

      // 3. Assinatura criada ou atualizada
      else if (eventName === 'SUBSCRIPTION_CREATED' || eventName === 'SUBSCRIPTION_UPDATED') {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            ...(subId ? { asaasSubscriptionId: subId } : {}),
            ...(custId ? { asaasCustomerId: custId } : {}),
            billingStatus: 'ACTIVE'
          }
        });
      }

      // 4. Assinatura cancelada / excluída
      else if (eventName === 'SUBSCRIPTION_DELETED' || eventName === 'SUBSCRIPTION_INACTIVATED') {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            billingStatus: 'CANCELLED',
            blockedReason: 'Assinatura cancelada no Asaas'
          }
        });

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: 'TENANT_SUBSCRIPTION_CANCELLED',
            entityType: 'Tenant',
            entityId: tenant.id,
            details: { subscriptionId: subId, event: eventName }
          }
        });

        await NotificationsService.create({
          tenantId: tenant.id,
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.HIGH,
          title: 'Assinatura Cancelada',
          message: 'Sua assinatura recorrente foi cancelada no Asaas. Para reativar os agendamentos ilimitados e recursos do plano, acesse a aba Planos.',
          link: '/dashboard/configuracoes'
        });
      }

      // 5. Pagamento estornado
      else if (eventName === 'PAYMENT_REFUNDED') {
        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: 'TENANT_PLAN_PAYMENT_REFUNDED',
            entityType: 'Tenant',
            entityId: tenant.id,
            details: { paymentId: payment?.id, amount: payment?.value, event: eventName }
          }
        });

        await NotificationsService.create({
          tenantId: tenant.id,
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.MEDIUM,
          title: 'Pagamento Estornado',
          message: `Um estorno de R$ ${Number(payment?.value || 0).toFixed(2)} foi processado na sua conta.`,
          link: '/dashboard/configuracoes'
        });
      }

      return reply.status(200).send({
        received: true,
        type: 'TENANT_SUBSCRIPTION',
        tenantId: tenant.id,
        event: eventName,
        billingStatus: tenant.billingStatus
      });
    } catch (err: any) {
      console.error('[Asaas Webhook] Erro crítico ao processar evento:', err);
      return reply.status(200).send({
        received: true,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  });
};


