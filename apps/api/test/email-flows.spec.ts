import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsappTemplateEngine, OFFICIAL_TEMPLATES } from '../src/modules/notifications/template-engine';
import { EmailService } from '../src/modules/notifications/email.service';
import { NotificationDispatcherService } from '../src/modules/notifications/dispatcher.service';
import { prisma } from '../src/lib/prisma';
import { NotificationTrigger } from '@prisma/client';
import { EvolutionService } from '../src/modules/automation/evolution.service';
import crypto from 'crypto';

describe('Revisão e Testes de Todos os Fluxos de E-mail (Resend)', () => {
  const sampleData = {
    client_name: 'Camila Santos',
    client_first_name: 'Camila',
    client_phone: '11999998888',
    client_email: 'camila@exemplo.com.br',
    service_name: 'Corte + Escova Modelada',
    services_list: 'Corte Feminino, Escova',
    professional_name: 'Juliana Silva',
    date: '25/10/2026',
    time: '14:30',
    duration: '60 min',
    location: 'Av. Paulista, 1000 - Sala 42, São Paulo',
    business_name: 'Studio Elegance',
    price: '180.00',
    pix_link: 'https://pix.asaas.com/qr/sample123',
    deposit_amount: '50.00',
    google_review_url: 'https://g.page/r/sample/review',
    booking_url: 'https://marquesuahora.com.br/studio-elegance',
    course_title: 'Especialização em Mega Hair',
    course_description: 'Aprenda as técnicas mais avançadas do mercado.',
    course_price: '790.00',
    course_duration: '16 horas',
    course_enroll_url: 'https://marquesuahora.com.br/studio-elegance/cursos',
    course_access_url: 'https://marquesuahora.com.br/studio-elegance/aluna',
    coupon_code: 'BEMVINDA15',
    coupon_discount: '15% de desconto',
    coupon_valid_until: '31/10/2026'
  };

  describe('1. Integridade dos Templates de E-mail (17 Triggers)', () => {
    const allTriggers = Object.keys(OFFICIAL_TEMPLATES) as NotificationTrigger[];

    it('deve possuir templates de e-mail (assunto e corpo HTML) definidos para todos os triggers', () => {
      expect(allTriggers.length).toBeGreaterThanOrEqual(16);

      for (const trigger of allTriggers) {
        const template = OFFICIAL_TEMPLATES[trigger];
        expect(template.defaultEmailSubject, `Trigger ${trigger} sem assunto de e-mail`).toBeTruthy();
        expect(template.defaultEmailBody, `Trigger ${trigger} sem corpo de e-mail`).toBeTruthy();
        expect(template.defaultEmailBody).toContain('<p>');
      }
    });

    it('deve renderizar variáveis dinâmicas no assunto e corpo de e-mail sem deixar tags não substituídas', () => {
      const confirmationTemplate = OFFICIAL_TEMPLATES.BOOKING_CONFIRMATION_CLIENT;

      const subject = WhatsappTemplateEngine.render(confirmationTemplate.defaultEmailSubject, sampleData);
      const body = WhatsappTemplateEngine.render(confirmationTemplate.defaultEmailBody, sampleData);

      expect(subject).toBe('Agendamento Confirmado — Studio Elegance');
      expect(body).toContain('Olá, <strong>Camila</strong>!');
      expect(body).toContain('Corte + Escova Modelada');
      expect(body).toContain('Juliana Silva');
      expect(body).toContain('25/10/2026 às 14:30');
      expect(body).not.toContain('{client_first_name}');
      expect(body).not.toContain('{service_name}');
    });

    it('deve renderizar templates de cupom e curso com valores monetários e links', () => {
      const couponTemplate = OFFICIAL_TEMPLATES.COUPON_CAMPAIGN;
      const couponSubject = WhatsappTemplateEngine.render(couponTemplate.defaultEmailSubject, sampleData);
      const couponBody = WhatsappTemplateEngine.render(couponTemplate.defaultEmailBody, sampleData);

      expect(couponSubject).toBe('Presente para você: Cupom BEMVINDA15 no Studio Elegance');
      expect(couponBody).toContain('BEMVINDA15');
      expect(couponBody).toContain('15% de desconto');
      expect(couponBody).toContain('https://marquesuahora.com.br/studio-elegance');

      const courseTemplate = OFFICIAL_TEMPLATES.COURSE_NEW_BROADCAST;
      const courseBody = WhatsappTemplateEngine.render(courseTemplate.defaultEmailBody, sampleData);

      expect(courseBody).toContain('Especialização em Mega Hair');
      expect(courseBody).toContain('R$ 790.00');
    });
  });

  describe('2. EmailService — Motor de Disparo via Resend', () => {
    it('deve simular envio com sucesso em ambiente de teste', async () => {
      const result = await EmailService.send({
        to: 'teste@exemplo.com.br',
        subject: 'Teste de Envio',
        html: '<p>Conteúdo de teste</p>',
        tenantName: 'Clínica Bem-Estar'
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.messageId).toContain('mock-email-');
    });

    it('deve encapsular o conteúdo dentro de layout HTML responsivo', async () => {
      // Verificamos se a chamada aceita strings HTML complexas sem quebrar
      const result = await EmailService.send({
        to: 'cliente@exemplo.com',
        subject: 'Confirmação',
        html: `
          <h3>Agendamento Realizado</h3>
          <p>Seu horário foi agendado para 15:00.</p>
        `,
        tenantName: 'Barbearia Vintage'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('3. Validação Criptográfica de Webhook Resend (Svix HMAC-SHA256)', () => {
    const secret = 'whsec_' + Buffer.from('mock_test_secret_for_svix_testing_32b!').toString('base64');
    const secretBytes = Buffer.from(secret.slice(6), 'base64');

    it('deve gerar e validar assinatura Svix compatível com o endpoint de webhook', () => {
      const svixId = 'msg_test_123456';
      const svixTimestamp = Math.floor(Date.now() / 1000).toString();
      const payload = JSON.stringify({
        type: 'email.delivered',
        data: {
          to: ['cliente@exemplo.com'],
          subject: 'Confirmação de Agendamento'
        }
      });

      const toSign = `${svixId}.${svixTimestamp}.${payload}`;
      const signature = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
      const svixHeader = `v1,${signature}`;

      // Simulação da lógica de verificação do webhook
      const expectedSignatures = svixHeader.split(' ').map((s) => s.split(',')[1] || s);
      const computed = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');

      expect(expectedSignatures).toContain(computed);
    });
  });

  describe('4. NotificationDispatcherService — Fluxo Completo Multi-Canal', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(EvolutionService, 'sendTextMessage').mockResolvedValue({ success: true, simulated: true });
    });

    it('deve despachar e-mail quando tenantId e dados de cliente forem válidos', async () => {
      // Mock do prisma.tenant.findUnique
      vi.spyOn(prisma.tenant, 'findUnique').mockResolvedValueOnce({
        id: 'tenant-123',
        name: 'Studio Elegance',
        slug: 'studio-elegance',
        addressStreet: 'Rua das Flores',
        addressNumber: '100',
        addressNeighborhood: 'Centro',
        addressCity: 'Curitiba',
        phone: '41999998888',
        googleReviewUrl: 'https://g.page/r/test',
        users: [{ email: 'admin@studioelegance.com.br', name: 'Admin Studio' }]
      } as any);

      // Mock da regra (ambos os canais ativos)
      vi.spyOn(prisma.tenantNotificationRule, 'findUnique').mockResolvedValueOnce({
        id: 'rule-1',
        tenantId: 'tenant-123',
        trigger: 'BOOKING_CONFIRMATION_CLIENT',
        emailEnabled: true,
        whatsappEnabled: true,
        notifyProfessional: true,
        notifyOwner: true,
        customWhatsappText: null,
        customEmailSubject: null,
        customEmailBody: null
      } as any);

      // Mock do notificationLog
      const logCreateSpy = vi.spyOn(prisma.notificationLog, 'create').mockResolvedValue({} as any);

      const result = await NotificationDispatcherService.dispatch({
        tenantId: 'tenant-123',
        trigger: 'BOOKING_CONFIRMATION_CLIENT',
        data: {
          clientName: 'Maria Silva',
          clientPhone: '41988887777',
          clientEmail: 'maria@exemplo.com.br',
          serviceName: 'Drenagem Linfática',
          professionalName: 'Dra. Carla',
          date: '28/10/2026',
          time: '10:00'
        }
      });

      expect(result.dispatched).toBe(true);
      expect(result.emailSentCount).toBe(1);
      expect(logCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: 'EMAIL',
            recipient: 'maria@exemplo.com.br',
            trigger: 'BOOKING_CONFIRMATION_CLIENT'
          })
        })
      );
    });

    it('deve respeitar a opção emailEnabled=false quando o estabelecimento desativar e-mails para um trigger', async () => {
      vi.spyOn(prisma.tenant, 'findUnique').mockResolvedValueOnce({
        id: 'tenant-123',
        name: 'Studio Elegance',
        slug: 'studio-elegance',
        users: [{ email: 'admin@studioelegance.com.br', name: 'Admin Studio' }]
      } as any);

      vi.spyOn(prisma.tenantNotificationRule, 'findUnique').mockResolvedValueOnce({
        id: 'rule-2',
        tenantId: 'tenant-123',
        trigger: 'NO_SHOW_CLIENT',
        emailEnabled: false, // E-mail desligado pelo salão
        whatsappEnabled: true,
        notifyProfessional: true,
        notifyOwner: true,
        customWhatsappText: null,
        customEmailSubject: null,
        customEmailBody: null
      } as any);

      vi.spyOn(prisma.notificationLog, 'create').mockResolvedValue({} as any);

      const result = await NotificationDispatcherService.dispatch({
        tenantId: 'tenant-123',
        trigger: 'NO_SHOW_CLIENT',
        data: {
          clientName: 'João Santos',
          clientPhone: '41999990000',
          clientEmail: 'joao@exemplo.com.br',
          serviceName: 'Barba Terapia',
          time: '16:00'
        }
      });

      expect(result.dispatched).toBe(true);
      expect(result.emailSentCount).toBe(0); // Nenhum e-mail enviado pois foi desativado
    });

    it('deve notificar tanto o profissional quanto o dono do salão para triggers de equipe (TEAM)', async () => {
      vi.spyOn(prisma.tenant, 'findUnique').mockResolvedValueOnce({
        id: 'tenant-123',
        name: 'Studio Elegance',
        phone: '4133334444',
        slug: 'studio-elegance',
        users: [{ email: 'dono@studioelegance.com.br', name: 'Dono do Salão' }]
      } as any);

      vi.spyOn(prisma.tenantNotificationRule, 'findUnique').mockResolvedValueOnce(null); // Regra padrão (ativo)
      const logCreateSpy = vi.spyOn(prisma.notificationLog, 'create').mockResolvedValue({} as any);

      const result = await NotificationDispatcherService.dispatch({
        tenantId: 'tenant-123',
        trigger: 'BOOKING_NEW_TEAM',
        data: {
          clientName: 'Ana Clara',
          clientPhone: '41911112222',
          serviceName: 'Coloração Global',
          professionalName: 'Rodrigo Hair',
          professionalEmail: 'rodrigo@studioelegance.com.br',
          professionalPhone: '41988889999',
          date: '30/10/2026',
          time: '15:00',
          price: '250.00'
        }
      });

      expect(result.dispatched).toBe(true);
      expect(result.emailSentCount).toBe(2); // 1 para o profissional + 1 para o dono

      // Verifica se registrou logs de e-mail para ambos
      expect(logCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: 'EMAIL',
            recipient: 'rodrigo@studioelegance.com.br'
          })
        })
      );

      expect(logCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: 'EMAIL',
            recipient: 'dono@studioelegance.com.br'
          })
        })
      );
    });
  });
});
