import axios from 'axios';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  tenantName?: string;
  forceLive?: boolean;
}

export class EmailService {
  private static getApiKey(): string | undefined {
    return process.env.RESEND_API_KEY;
  }

  private static getFromAddress(): string {
    return process.env.EMAIL_FROM || 'Marque Sua Hora <notificacoes@marquesuahora.com.br>';
  }

  /**
   * Envia e-mail transacional via Resend com fallback limpo para desenvolvimento.
   */
  public static async send(options: SendEmailOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
    const apiKey = this.getApiKey();

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; background: #fafafa; }
          .header h1 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
          .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #334155; }
          .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${options.tenantName || 'Marque Sua Hora'}</h1>
          </div>
          <div class="content">
            ${options.html}
          </div>
          <div class="footer">
            Mensagem automática enviada pelo sistema Marque Sua Hora em nome de ${options.tenantName || 'seu estabelecimento'}.
          </div>
        </div>
      </body>
      </html>
    `;

    const isTestSimulated = process.env.NODE_ENV === 'test' && !options.forceLive;
    if (!apiKey || apiKey.includes('sua_chave') || isTestSimulated) {
      console.log(`[Email SIMULADO] Para: ${options.to} | Assunto: "${options.subject}"`);
      return { success: true, simulated: true, messageId: `mock-email-${Date.now()}` };
    }

    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: this.getFromAddress(),
          to: [options.to],
          subject: options.subject,
          html: fullHtml
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      return {
        success: true,
        messageId: response.data?.id
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      console.warn(`[Resend Email] Erro ao enviar para ${options.to}:`, errMsg);
      return {
        success: false,
        error: errMsg
      };
    }
  }
}
