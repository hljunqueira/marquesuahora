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
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f1f5f9;
            margin: 0;
            padding: 32px 16px;
            color: #1e293b;
            -webkit-font-smoothing: antialiased;
          }
          .email-wrapper {
            max-width: 580px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          }
          .email-header {
            padding: 28px 32px;
            background: #ffffff;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .email-header table {
            width: 100%;
          }
          .email-content {
            padding: 36px 32px;
            font-size: 15px;
            line-height: 1.65;
            color: #334155;
          }
          .email-footer {
            padding: 24px 32px;
            background: #f8fafc;
            border-top: 1px solid #f1f5f9;
            font-size: 12px;
            line-height: 1.5;
            color: #64748b;
            text-align: center;
          }
          .email-footer a {
            color: #7c3aed;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td align="left" style="vertical-align: middle;">
                  <a href="https://marquesuahora.com.br" target="_blank" style="text-decoration: none; display: inline-block;">
                    <img src="https://marquesuahora.com.br/brand/logooficial-semfundo.png" alt="Marque Sua Hora" height="38" style="height: 38px; width: auto; max-width: 180px; display: block; border: 0;" />
                  </a>
                </td>
                <td align="right" style="vertical-align: middle;">
                  ${options.tenantName ? `
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; background: #f8fafc; padding: 4px 10px; border-radius: 9999px; border: 1px solid #e2e8f0; display: inline-block; letter-spacing: 0.3px;">
                      ${options.tenantName}
                    </span>
                  ` : ''}
                </td>
              </tr>
            </table>
          </div>

          <div class="email-content">
            ${options.html}
          </div>

          <div class="email-footer">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">
              Marque Sua Hora • Gestão e Agendamento Online
            </p>
            <p style="margin: 0 0 10px 0;">
              Mensagem automática enviada pelo sistema Marque Sua Hora${options.tenantName ? ` para ${options.tenantName}` : ''}.
            </p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
              <a href="https://marquesuahora.com.br" target="_blank">marquesuahora.com.br</a> • Todos os direitos reservados.
            </p>
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
