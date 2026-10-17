import axios from 'axios';
import { prisma } from '../../lib/prisma';

export class EvolutionService {
  public static getBaseUrl(): string {
    return process.env.EVOLUTION_API_URL || 'http://23.80.89.116:3042';
  }

  public static getGlobalApiKey(): string {
    return process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || 'msh_evolution_master_key_2026';
  }

  /**
   * Obtém a mídia em formato Base64 a partir do ID da mensagem recebida via webhook.
   */
  public static async getMediaBase64(
    instanceName: string,
    messageKeyId: string,
    apiKey?: string
  ): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/chat/getBase64FromMediaMessage/${instanceName}`,
        {
          message: {
            key: {
              id: messageKeyId
            }
          },
          convertToMp4: false
        },
        {
          headers: {
            apikey: apiKey || this.getGlobalApiKey(),
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const base64Data = response.data?.base64;
      return base64Data || null;
    } catch (err: any) {
      console.warn('[EvolutionService] Falha ao obter base64 da mídia:', err.response?.data || err.message);
      return null;
    }
  }

  /**
   * Gera variações de números para cobrir 8 e 9 dígitos e identificadores JID/LID do WhatsApp.
   */
  public static generatePhoneCandidates(phone: string): string[] {
    const raw = (phone || '').trim();
    let digits = raw.replace(/\D/g, '');
    const candidates: string[] = [];

    if (raw.includes('@')) {
      candidates.push(raw);
    } else if (digits.length > 13) {
      candidates.push(`${digits}@lid`);
      candidates.push(digits);
      candidates.push(`${digits}@s.whatsapp.net`);
    } else {
      if (digits.length >= 10 && !digits.startsWith('55')) {
        digits = `55${digits}`;
      }
      candidates.push(digits);

      // Variações com e sem nono dígito para números celulares brasileiros (DDI 55)
      if (digits.startsWith('55') && digits.length === 12) {
        // Formato 55 + DDD (2) + 8 dígitos -> adiciona versão com 9: 55 + DDD + 9 + 8 dígitos
        candidates.push(`${digits.slice(0, 4)}9${digits.slice(4)}`);
      } else if (digits.startsWith('55') && digits.length === 13) {
        // Formato 55 + DDD (2) + 9 + 8 dígitos -> adiciona versão sem o 9 (para contas antigas do WhatsApp)
        candidates.push(`${digits.slice(0, 4)}${digits.slice(5)}`);
      }

      candidates.push(`${digits}@s.whatsapp.net`);
    }

    return Array.from(new Set(candidates));
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
   * Envia mensagem de texto simples usando a instância do salão com retry em variações de 8/9 dígitos.
   */
  public static async sendTextMessage(
    tenantId: string,
    toPhone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId }
    });

    const candidates = this.generatePhoneCandidates(toPhone);
    const primaryPhone = candidates[0] || this.sanitizePhone(toPhone);

    // Se não tiver instância configurada ou estiver desconectada em ambiente local, simula com sucesso
    if (!config || !config.isConnected || process.env.NODE_ENV === 'test') {
      console.log(`[Evolution WhatsApp SIMULADO] Para ${primaryPhone}: "${message}"`);
      return { success: true, simulated: true };
    }

    let lastError: any = null;

    for (const cand of candidates) {
      try {
        const response = await axios.post(
          `${this.getBaseUrl()}/message/sendText/${config.instanceName}`,
          {
            number: cand,
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
        lastError = error;
        const errMessage = error.response?.data?.message || error.message || '';
        if (errMessage.toLowerCase().includes('not connected') || error.response?.status === 401) {
          // Atualiza status local se a instância foi desconectada no aparelho
          await prisma.whatsappConfig.update({
            where: { tenantId },
            data: { isConnected: false }
          }).catch(() => {});
          break;
        }
      }
    }

    console.warn(`[Evolution WhatsApp ERRO] Falha ao enviar para ${toPhone} após tentar variações:`, lastError?.message);
    return { success: false };
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

  /**
   * Obtém o status e QR Code da instância de WhatsApp do salão.
   */
  public static async getInstanceStatus(tenantId: string) {
    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId }
    });

    if (!config) {
      return {
        configured: false,
        isConnected: false,
        instanceName: null,
        phoneNumber: null,
        qrCode: null
      };
    }

    let isConnected = config.isConnected;
    let qrCode = config.qrCode;
    let phoneNumber = config.phoneNumber;

    // Sincronização ativa em tempo real com a Evolution API na VPS
    if (config.instanceName) {
      try {
        const stateRes = await axios.get(
          `${this.getBaseUrl()}/instance/connectionState/${config.instanceName}`,
          {
            headers: { apikey: config.apiKey || this.getGlobalApiKey() },
            timeout: 3000
          }
        );

        const liveState = stateRes.data?.instance?.state || stateRes.data?.state;

        if (liveState === 'open') {
          isConnected = true;
          qrCode = null; // Já conectou, limpa QR Code
          if (!config.isConnected) {
            await prisma.whatsappConfig.update({
              where: { tenantId },
              data: { isConnected: true, qrCode: null }
            }).catch(() => {});
          }
        } else if (liveState === 'close' && config.isConnected) {
          isConnected = false;
          await prisma.whatsappConfig.update({
            where: { tenantId },
            data: { isConnected: false }
          }).catch(() => {});
        }
      } catch (err: any) {
        // Se a VPS demorar para responder, mantém o status persistido localmente
      }
    }

    return {
      configured: true,
      isConnected,
      instanceName: config.instanceName,
      phoneNumber,
      qrCode
    };
  }

  /**
   * Inicializa ou conecta a instância do salão na Evolution API e retorna o QR Code para leitura no celular.
   */
  public static async connectInstance(tenantId: string, slug: string) {
    let config = await prisma.whatsappConfig.findUnique({
      where: { tenantId }
    });

    const instanceName = config?.instanceName || `tenant_${slug.replace(/[^a-zA-Z0-9]/g, '_')}_${tenantId.slice(0, 6)}`;
    const apiKey = config?.apiKey || this.getGlobalApiKey();

    let qrCodeBase64: string | null = null;
    let isConnected = config?.isConnected || false;

    const apiUrl = process.env.API_URL || 'http://localhost:3333';
    const webhookUrl = `${apiUrl}/webhooks/whatsapp`;

    try {
      // 1. Tenta criar a instância na Evolution API já com webhook ativado
      const createRes = await axios.post(
        `${this.getBaseUrl()}/instance/create`,
        {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'QRCODE_UPDATED']
          }
        },
        {
          headers: { apikey: this.getGlobalApiKey() },
          timeout: 6000
        }
      );

      const cData = createRes.data;
      qrCodeBase64 =
        cData?.qrcode?.base64 ||
        cData?.base64 ||
        (cData?.code ? (cData.code.startsWith('data:image') ? cData.code : `data:image/png;base64,${cData.code}`) : null) ||
        null;

      if (cData?.instance?.status === 'open' || cData?.status === 'open') {
        isConnected = true;
      }
    } catch (err: any) {
      // 2. Se a instância já existir, solicita o QR Code de conexão e atualiza o webhook
      try {
        // Assegura que o webhook esteja apontado para a nossa API
        axios.post(
          `${this.getBaseUrl()}/webhook/set/${instanceName}`,
          {
            webhook: {
              enabled: true,
              url: webhookUrl,
              byEvents: false,
              base64: false,
              events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'QRCODE_UPDATED']
            }
          },
          {
            headers: { apikey: apiKey },
            timeout: 3000
          }
        ).catch(() => {});

        const connectRes = await axios.get(
          `${this.getBaseUrl()}/instance/connect/${instanceName}`,
          {
            headers: { apikey: apiKey },
            timeout: 6000
          }
        );
        const connData = connectRes.data;
        qrCodeBase64 =
          connData?.base64 ||
          connData?.qrcode?.base64 ||
          (connData?.code ? (connData.code.startsWith('data:image') ? connData.code : `data:image/png;base64,${connData.code}`) : null) ||
          null;

        if (connData?.instance?.status === 'open' || connData?.status === 'open') {
          isConnected = true;
        }
      } catch (connectErr: any) {
        console.warn(`[Evolution WhatsApp] VPS offline ou não configurada localmente. Gerando QR Code simulado para testes:`, connectErr.message);
        // Fallback para desenvolvimento e testes: QR Code mock em SVG Base64 em preto puro (#000000)
        const svgMock = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="#ffffff"/><rect x="20" y="20" width="50" height="50" fill="#000000"/><rect x="30" y="30" width="30" height="30" fill="#ffffff"/><rect x="37" y="37" width="16" height="16" fill="#000000"/><rect x="130" y="20" width="50" height="50" fill="#000000"/><rect x="140" y="30" width="30" height="30" fill="#ffffff"/><rect x="147" y="37" width="16" height="16" fill="#000000"/><rect x="20" y="130" width="50" height="50" fill="#000000"/><rect x="30" y="140" width="30" height="30" fill="#ffffff"/><rect x="37" y="147" width="16" height="16" fill="#000000"/><rect x="85" y="20" width="20" height="40" fill="#000000"/><rect x="85" y="80" width="30" height="30" fill="#000000"/><rect x="130" y="90" width="40" height="20" fill="#000000"/><rect x="90" y="130" width="20" height="50" fill="#000000"/><rect x="130" y="130" width="50" height="50" fill="#000000"/></svg>`;
        qrCodeBase64 = `data:image/svg+xml;base64,${Buffer.from(svgMock).toString('base64')}`;
      }
    }

    // Persiste ou atualiza no banco
    const updated = await prisma.whatsappConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        instanceName,
        apiKey,
        isConnected,
        qrCode: qrCodeBase64
      },
      update: {
        instanceName,
        apiKey,
        isConnected,
        qrCode: qrCodeBase64
      }
    });

    return {
      instanceName: updated.instanceName,
      isConnected: updated.isConnected,
      qrCode: updated.qrCode,
      phoneNumber: updated.phoneNumber
    };
  }

  /**
   * Desconecta o WhatsApp do salão na Evolution API de forma limpa (logout + delete).
   */
  public static async disconnectInstance(tenantId: string) {
    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId }
    });

    if (!config) {
      return { success: true };
    }

    try {
      // 1. Faz logout da sessão
      await axios.delete(
        `${this.getBaseUrl()}/instance/logout/${config.instanceName}`,
        {
          headers: { apikey: config.apiKey || this.getGlobalApiKey() },
          timeout: 5000
        }
      ).catch(() => {});

      // 2. Deleta a instância para evitar sessão zumbi no Baileys
      await axios.delete(
        `${this.getBaseUrl()}/instance/delete/${config.instanceName}`,
        {
          headers: { apikey: config.apiKey || this.getGlobalApiKey() },
          timeout: 5000
        }
      ).catch(() => {});
    } catch (err: any) {
      console.warn('[Evolution WhatsApp] Erro ao deslogar instância:', err.message);
    }

    await prisma.whatsappConfig.update({
      where: { tenantId },
      data: {
        isConnected: false,
        qrCode: null,
        phoneNumber: null
      }
    });

    return { success: true };
  }
}

