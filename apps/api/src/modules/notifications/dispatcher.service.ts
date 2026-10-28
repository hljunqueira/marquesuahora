import { NotificationTrigger } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { EvolutionService } from '../automation/evolution.service';
import { EmailService } from './email.service';
import { WhatsappTemplateEngine } from './template-engine';

export interface DispatchNotificationParams {
  tenantId: string;
  trigger: NotificationTrigger;
  scheduleId?: string;
  data: {
    clientName?: string;
    clientFirstName?: string;
    clientPhone?: string;
    clientEmail?: string;
    serviceName?: string;
    servicesList?: string;
    professionalName?: string;
    professionalPhone?: string;
    professionalEmail?: string;
    date?: string;
    time?: string;
    duration?: string;
    location?: string;
    businessName?: string;
    price?: string | number;
    pixLink?: string;
    depositAmount?: string | number;
    googleReviewUrl?: string;
    bookingUrl?: string;
    courseTitle?: string;
    courseDescription?: string;
    coursePrice?: string | number;
    courseDuration?: string;
    courseEnrollUrl?: string;
    courseAccessUrl?: string;
    couponCode?: string;
    couponDiscount?: string;
    couponValidUntil?: string;
    [key: string]: any;
  };
}

export class NotificationDispatcherService {
  /**
   * Prepara os dados normalizados e renderiza os textos de WhatsApp e E-mail de acordo com as regras do salão.
   */
  public static async prepareNotification(params: DispatchNotificationParams) {
    const { tenantId, trigger, scheduleId, data } = params;

    const [tenant, ruleRecord] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          plan: true,
          users: {
            where: { role: 'ADMIN' },
            select: { email: true, name: true },
            take: 1
          }
        }
      }),
      prisma.tenantNotificationRule.findUnique({
        where: { tenantId_trigger: { tenantId, trigger } }
      })
    ]);

    if (!tenant) {
      throw new Error('Tenant não encontrado.');
    }

    const metadata = WhatsappTemplateEngine.getMetadata(trigger);
    if (!metadata) {
      throw new Error(`Trigger ${trigger} desconhecido.`);
    }

    // Regra configurada ou padrão oficial ativo (comprovante imediato e aviso para equipe são prioritários e sempre permitidos)
    const emailEnabled = ruleRecord ? ruleRecord.emailEnabled : true;
    const isDirectConfirmation = trigger === 'BOOKING_CONFIRMATION_CLIENT' || trigger === 'BOOKING_NEW_TEAM';
    const planAllowsWhatsapp = isDirectConfirmation ? true : (tenant.plan ? tenant.plan.hasAutoWhatsapp : true);
    const whatsappEnabled = planAllowsWhatsapp && (ruleRecord ? ruleRecord.whatsappEnabled : true);
    const notifyProfessional = ruleRecord ? ruleRecord.notifyProfessional : true;
    const notifyOwner = ruleRecord ? ruleRecord.notifyOwner : true;

    // Normaliza variáveis nos dados com suporte a nomes em inglês e português
    const fullData: Record<string, any> = {
      ...data,
      business_name: data.businessName || tenant.name,
      nome_empresa: data.businessName || tenant.name,
      estabelecimento: data.businessName || tenant.name,
      location:
        data.location ||
        (tenant.addressStreet
          ? `${tenant.addressStreet}, ${tenant.addressNumber} - ${tenant.addressNeighborhood}, ${tenant.addressCity}`
          : 'Consulte nossa recepção'),
      endereco:
        data.location ||
        (tenant.addressStreet
          ? `${tenant.addressStreet}, ${tenant.addressNumber} - ${tenant.addressNeighborhood}, ${tenant.addressCity}`
          : 'Consulte nossa recepção'),
      local:
        data.location ||
        (tenant.addressStreet
          ? `${tenant.addressStreet}, ${tenant.addressNumber} - ${tenant.addressNeighborhood}, ${tenant.addressCity}`
          : 'Consulte nossa recepção'),
      google_review_url: data.googleReviewUrl || tenant.googleReviewUrl || `https://marquesuahora.com.br/${tenant.slug}`,
      booking_url: data.bookingUrl || `https://marquesuahora.com.br/${tenant.slug}`,
      link_agendamento: data.bookingUrl || `https://marquesuahora.com.br/${tenant.slug}`
    };

    if (fullData.clientName && !fullData.client_first_name) {
      fullData.client_first_name = fullData.clientName.trim().split(' ')[0];
    }
    if (fullData.clientName) {
      fullData.client_name = fullData.clientName;
      fullData.cliente = fullData.clientName;
      fullData.primeiro_nome = fullData.client_first_name;
    }
    if (fullData.clientPhone) {
      fullData.client_phone = fullData.clientPhone;
      fullData.telefone = fullData.clientPhone;
    }
    if (fullData.serviceName) {
      fullData.service_name = fullData.serviceName;
      fullData.servico = fullData.serviceName;
      fullData.procedimento = fullData.serviceName;
    }
    if (fullData.professionalName) {
      fullData.professional_name = fullData.professionalName;
      fullData.profissional = fullData.professionalName;
    }
    if (fullData.date) {
      fullData.data = fullData.date;
    }
    if (fullData.time) {
      fullData.horario = fullData.time;
      fullData.hora = fullData.time;
    }
    if (fullData.duration) {
      fullData.duracao = fullData.duration;
    } else if (fullData.durationMinutes) {
      fullData.duration = `${fullData.durationMinutes} min`;
      fullData.duracao = `${fullData.durationMinutes} min`;
    }
    if (fullData.totalPrice !== undefined || fullData.price !== undefined) {
      const p = fullData.totalPrice !== undefined ? fullData.totalPrice : fullData.price;
      const formattedPrice = typeof p === 'number' ? `R$ ${p.toFixed(2).replace('.', ',')}` : String(p);
      fullData.price = formattedPrice;
      fullData.valor = formattedPrice;
      fullData.valor_total = formattedPrice;
    }

    const whatsappText = WhatsappTemplateEngine.render(
      ruleRecord?.customWhatsappText || metadata.defaultWhatsappText,
      fullData
    );
    const emailSubject = WhatsappTemplateEngine.render(
      ruleRecord?.customEmailSubject || metadata.defaultEmailSubject,
      fullData
    );
    const emailBody = WhatsappTemplateEngine.render(
      ruleRecord?.customEmailBody || metadata.defaultEmailBody,
      fullData
    );

    const clientPhone = data.clientPhone || fullData.client_phone;
    let waLink: string | null = null;
    if (clientPhone) {
      const clean = EvolutionService.sanitizePhone(clientPhone);
      waLink = `https://wa.me/${clean}?text=${encodeURIComponent(whatsappText)}`;
    }

    return {
      tenant,
      ruleRecord,
      metadata,
      emailEnabled,
      whatsappEnabled,
      notifyProfessional,
      notifyOwner,
      fullData,
      whatsappText,
      emailSubject,
      emailBody,
      clientPhone,
      clientEmail: data.clientEmail || fullData.clientEmail,
      waLink,
      isCustomized: !!ruleRecord?.customWhatsappText || !!ruleRecord?.customEmailSubject || !!ruleRecord?.customEmailBody
    };
  }

  /**
   * Despacha uma notificação respeitando a regra de canais (WhatsApp e E-mail) e destinatários do salão.
   */
  public static async dispatch(params: DispatchNotificationParams): Promise<{
    dispatched: boolean;
    whatsappSentCount: number;
    emailSentCount: number;
    errors: string[];
    waLink?: string | null;
    whatsappText?: string;
  }> {
    const { tenantId, trigger, scheduleId, data } = params;
    const errors: string[] = [];
    let whatsappSentCount = 0;
    let emailSentCount = 0;

    let prepared: Awaited<ReturnType<typeof NotificationDispatcherService.prepareNotification>>;
    try {
      prepared = await this.prepareNotification(params);
    } catch (e: any) {
      return { dispatched: false, whatsappSentCount: 0, emailSentCount: 0, errors: [e.message] };
    }

    const {
      tenant,
      metadata,
      emailEnabled,
      whatsappEnabled,
      notifyProfessional,
      notifyOwner,
      whatsappText,
      emailSubject,
      emailBody,
      waLink
    } = prepared;

    const ownerEmail = tenant.users?.[0]?.email;

    // 1. DISPAROS PARA O CLIENTE OU ALUNA (CLIENT / STUDENT)
    if (metadata.recipientType === 'CLIENT' || metadata.recipientType === 'STUDENT') {
      const clientPhone = data.clientPhone;
      const clientEmail = data.clientEmail;

      if (whatsappEnabled && clientPhone) {
        let isDuplicate = false;
        if (scheduleId) {
          const recentLog = await prisma.notificationLog.findFirst({
            where: {
              tenantId,
              scheduleId,
              trigger,
              channel: 'WHATSAPP',
              sentAt: { gte: new Date(Date.now() - 30000) }
            }
          });
          if (recentLog) {
            isDuplicate = true;
            whatsappSentCount++;
          }
        }

        if (!isDuplicate) {
          try {
            const res = await EvolutionService.sendTextMessage(tenantId, clientPhone, whatsappText);
            whatsappSentCount++;
            await prisma.notificationLog.create({
              data: {
                tenantId,
                scheduleId,
                trigger,
                channel: 'WHATSAPP',
                recipient: clientPhone,
                status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
                sentAt: new Date()
              }
            });
          } catch (e: any) {
            errors.push(`WhatsApp Cliente: ${e.message}`);
          }
        }
      }

      if (emailEnabled && clientEmail) {
        try {
          const res = await EmailService.send({
            to: clientEmail,
            subject: emailSubject,
            html: emailBody,
            tenantName: tenant.name
          });
          if (res.success) emailSentCount++;
          await prisma.notificationLog.create({
            data: {
              tenantId,
              scheduleId,
              trigger,
              channel: 'EMAIL',
              recipient: clientEmail,
              status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
              errorMessage: res.error,
              sentAt: new Date()
            }
          });
        } catch (e: any) {
          errors.push(`Email Cliente: ${e.message}`);
        }
      }
    }

    // 2. DISPAROS PARA A EQUIPE (TEAM: PROFISSIONAL E/OU DONO DO ESTÚDIO)
    if (metadata.recipientType === 'TEAM') {
      // 2.1 Notificar Profissional
      if (notifyProfessional) {
        const profPhone = data.professionalPhone;
        const profEmail = data.professionalEmail;

        if (whatsappEnabled && profPhone) {
          try {
            const res = await EvolutionService.sendTextMessage(tenantId, profPhone, whatsappText);
            whatsappSentCount++;
            await prisma.notificationLog.create({
              data: {
                tenantId,
                scheduleId,
                trigger,
                channel: 'WHATSAPP',
                recipient: profPhone,
                status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
                sentAt: new Date()
              }
            });
          } catch (e: any) {
            errors.push(`WhatsApp Profissional: ${e.message}`);
          }
        }

        if (emailEnabled && profEmail) {
          try {
            const res = await EmailService.send({
              to: profEmail,
              subject: emailSubject,
              html: emailBody,
              tenantName: tenant.name
            });
            if (res.success) emailSentCount++;
            await prisma.notificationLog.create({
              data: {
                tenantId,
                scheduleId,
                trigger,
                channel: 'EMAIL',
                recipient: profEmail,
                status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
                errorMessage: res.error,
                sentAt: new Date()
              }
            });
          } catch (e: any) {
            errors.push(`Email Profissional: ${e.message}`);
          }
        }
      }

      // 2.2 Notificar Dono do Estúdio / Recepção
      if (notifyOwner) {
        const ownerPhone = tenant.phone;

        if (whatsappEnabled && ownerPhone) {
          try {
            const res = await EvolutionService.sendTextMessage(tenantId, ownerPhone, whatsappText);
            whatsappSentCount++;
            await prisma.notificationLog.create({
              data: {
                tenantId,
                scheduleId,
                trigger,
                channel: 'WHATSAPP',
                recipient: ownerPhone,
                status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
                sentAt: new Date()
              }
            });
          } catch (e: any) {
            errors.push(`WhatsApp Dono: ${e.message}`);
          }
        }

        if (emailEnabled && ownerEmail) {
          try {
            const res = await EmailService.send({
              to: ownerEmail,
              subject: emailSubject,
              html: emailBody,
              tenantName: tenant.name
            });
            if (res.success) emailSentCount++;
            await prisma.notificationLog.create({
              data: {
                tenantId,
                scheduleId,
                trigger,
                channel: 'EMAIL',
                recipient: ownerEmail,
                status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
                errorMessage: res.error,
                sentAt: new Date()
              }
            });
          } catch (e: any) {
            errors.push(`Email Dono: ${e.message}`);
          }
        }
      }
    }

    return {
      dispatched: true,
      whatsappSentCount,
      emailSentCount,
      errors,
      waLink,
      whatsappText
    };
  }
}
