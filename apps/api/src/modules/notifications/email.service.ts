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
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${options.subject}</title>
        <style type="text/css">
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
          a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
          @media only screen and (max-width: 600px) {
            .email-wrapper { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
            .email-padding { padding: 24px 20px !important; }
            .header-cell { padding: 20px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 36px 12px; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 0;">
              <!-- Container Card -->
              <table role="presentation" class="email-wrapper" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);">
                
                <!-- Header com Logo Oficial -->
                <tr>
                  <td class="header-cell" style="padding: 24px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" style="vertical-align: middle;">
                          <a href="https://marquesuahora.com.br" target="_blank" style="text-decoration: none; display: inline-block;">
                            <img src="https://marquesuahora.com.br/brand/logooficial-semfundo.png" alt="Marque Sua Hora" height="38" style="height: 38px; width: auto; max-width: 180px; display: block; border: 0;" />
                          </a>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          ${options.tenantName ? `
                            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #475569; background-color: #f8fafc; padding: 5px 12px; border-radius: 9999px; border: 1px solid #e2e8f0; display: inline-block; letter-spacing: 0.3px; text-transform: uppercase;">
                              ${options.tenantName}
                            </span>
                          ` : `
                            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #7c3aed; background-color: #f5f3ff; padding: 5px 12px; border-radius: 9999px; border: 1px solid #ddd6fe; display: inline-block; letter-spacing: 0.3px;">
                              Gestão & Agendamento
                            </span>
                          `}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Conteudo -->
                <tr>
                  <td class="email-padding" style="padding: 36px 32px; font-size: 15px; line-height: 1.65; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    ${options.html}
                  </td>
                </tr>

                <!-- Rodape -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.6; color: #64748b; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">
                      Marque Sua Hora • Gestão e Agendamento Online
                    </p>
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">
                      Mensagem automática enviada pelo sistema Marque Sua Hora${options.tenantName ? ` em nome de <strong>${options.tenantName}</strong>` : ''}.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      <a href="https://marquesuahora.com.br" target="_blank" style="color: #7c3aed; text-decoration: none; font-weight: 600;">marquesuahora.com.br</a> • Todos os direitos reservados.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
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
