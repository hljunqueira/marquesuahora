import axios from 'axios';
import { prisma } from '../../lib/prisma';

export class EvolutionService {
  private static getBaseUrl(): string {
    return process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  }

  private static getGlobalApiKey(): string {
    return process.env.EVOLUTION_GLOBAL_KEY || 'evolution_secret_key_123';
  }

  /**
   * Sanitiza o número de telefone para o formato internacional aceito pelo WhatsApp (DDI 55 + DDD + dígitos).
   */
  public static sanitizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) {
      return digits;
    }
    return `55${digits}`;
  }

  /**
   * Envia mensagem de texto simples usando a instância do salão.
   */
  public static async sendTextMessage(
    tenantId: string,
    toPhone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId }
    });

    const sanitizedPhone = this.sanitizePhone(toPhone);

    // Se não tiver instância configurada ou estiver desconectada em ambiente local, simula com sucesso
    if (!config || !config.isConnected || process.env.NODE_ENV === 'test') {
      console.log(`[Evolution WhatsApp SIMULADO] Para ${sanitizedPhone}: "${message}"`);
      return { success: true, simulated: true };
    }

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/message/sendText/${config.instanceName}`,
        {
          number: sanitizedPhone,
          text: message,
          delay: 1200
        },
        {
          headers: {
            apikey: config.apiKey || this.getGlobalApiKey(),
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      return {
        success: true,
        messageId: response.data?.key?.id
      };
    } catch (error: any) {
      console.warn(`[Evolution WhatsApp ERRO] Falha ao enviar para ${sanitizedPhone}:`, error.message);
      return { success: false };
    }
  }

  /**
   * Envia mensagem interativa com botões de ação (ex: Confirmar / Remarcar).
   */
  public static async sendButtonMessage(
    tenantId: string,
    toPhone: string,
    title: string,
    description: string,
    buttons: Array<{ id: string; label: string }>
  ): Promise<{ success: boolean; simulated?: boolean }> {
    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId }
    });

    const sanitizedPhone = this.sanitizePhone(toPhone);

    if (!config || !config.isConnected || process.env.NODE_ENV === 'test') {
      console.log(`[Evolution WhatsApp BOTÕES SIMULADO] Para ${sanitizedPhone} - ${title}: ${description} (${buttons.map(b => b.label).join(' | ')})`);
      return { success: true, simulated: true };
    }

    try {
      await axios.post(
        `${this.getBaseUrl()}/message/sendButtons/${config.instanceName}`,
        {
          number: sanitizedPhone,
          title,
          description,
          buttons: buttons.map((b) => ({
            id: b.id,
            displayText: b.label
          }))
        },
        {
          headers: {
            apikey: config.apiKey || this.getGlobalApiKey(),
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      return { success: true };
    } catch (error: any) {
      // Fallback para texto plano caso a versão da API não suporte botões em template
      console.warn('[Evolution WhatsApp] Falha ao enviar botões, enviando fallback de texto:', error.message);
      const textFallback = `${title}\n\n${description}\n\n${buttons.map((b, i) => `${i + 1}. ${b.label}`).join('\n')}`;
      return this.sendTextMessage(tenantId, toPhone, textFallback);
    }
  }
}
