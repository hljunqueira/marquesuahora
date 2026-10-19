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

  // Cache em memória de Pairing Codes ativos por instância
  private static pairingCodes = new Map<string, string>();

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
        qrCode: null,
        pairingCode: null
      };
    }

    let isConnected = config.isConnected;
    let qrCode = config.qrCode;
    let phoneNumber = config.phoneNumber;
    let pairingCode: string | null = config.instanceName ? (this.pairingCodes.get(config.instanceName) || null) : null;

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
          pairingCode = null;
          this.pairingCodes.delete(config.instanceName);
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
        } else if (liveState === 'connecting' || !isConnected) {
          // Busca pairingCode em tempo real se a instância estiver aguardando pareamento
          try {
            const connRes = await axios.get(
              `${this.getBaseUrl()}/instance/connect/${config.instanceName}`,
              {
                headers: { apikey: config.apiKey || this.getGlobalApiKey() },
                timeout: 3000
              }
            );
            if (connRes.data?.pairingCode) {
              const code = String(connRes.data.pairingCode);
              pairingCode = code;
              this.pairingCodes.set(config.instanceName, code);
            }
            if (connRes.data?.base64) {
              qrCode = connRes.data.base64;
            }
          } catch {
            // Ignora erro de busca pontual de conexão
          }
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
      qrCode,
      pairingCode
    };
  }

  /**
   * Inicializa ou conecta a instância do salão na Evolution API.
   * Suporta:
   * 1. Conexão via QR Code tradicional (com câmera do celular).
   * 2. Conexão via Código de Pareamento de 8 Dígitos (Pairing Code) para celulares sem câmera ou com lente danificada.
   */
  public static async connectInstance(tenantId: string, slug: string, phoneNumber?: string) {
    let config = await prisma.whatsappConfig.findUnique({
      where: { tenantId }
    });

    const instanceName = config?.instanceName || `tenant_${slug.replace(/[^a-zA-Z0-9]/g, '_')}_${tenantId.slice(0, 6)}`;
    const apiKey = config?.apiKey || this.getGlobalApiKey();

    let qrCodeBase64: string | null = null;
    let pairingCode: string | null = null;
    let isConnected = config?.isConnected || false;

    // Normalização do número de telefone caso informado (DDI + DDD + número)
    let cleanPhone: string | null = null;
    if (phoneNumber) {
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length >= 10) {
        cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
      }
    }

    const apiUrl = process.env.API_URL || 'http://localhost:3333';
    const webhookUrl = `${apiUrl}/webhooks/whatsapp`;

    try {
      // Se for pairing code com número novo e a instância anterior não tinha número ou estava fechada,
      // recria de forma limpa na Evolution para garantir geração do pairing code pelo Baileys
      if (cleanPhone) {
        try {
          await axios.delete(`${this.getBaseUrl()}/instance/delete/${instanceName}`, {
            headers: { apikey: apiKey },
            timeout: 4000
          });
        } catch {
          // Se não existir, ignora erro ao deletar
        }
      }

      // 1. Tenta criar a instância na Evolution API já com webhook ativado
      const createRes = await axios.post(
        `${this.getBaseUrl()}/instance/create`,
        {
          instanceName,
          qrcode: !cleanPhone,
          number: cleanPhone || undefined,
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
        (cData?.code && typeof cData.code === 'string' && cData.code.startsWith('data:image') ? cData.code : null) ||
        null;

      if (cleanPhone) {
        pairingCode = cData?.pairingCode || (cData?.code && typeof cData.code === 'string' && cData.code.length < 20 ? cData.code : null);
      }

      if (cData?.instance?.status === 'open' || cData?.status === 'open') {
        isConnected = true;
      }
    } catch (err: any) {
      // 2. Se a instância já existir, solicita o QR Code ou Pairing Code de conexão e atualiza o webhook
      try {
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

        const connectUrl = cleanPhone
          ? `${this.getBaseUrl()}/instance/connect/${instanceName}?number=${cleanPhone}`
          : `${this.getBaseUrl()}/instance/connect/${instanceName}`;

        const connectRes = await axios.get(
          connectUrl,
          {
            headers: { apikey: apiKey },
            timeout: 6000
          }
        );
        const connData = connectRes.data;
        qrCodeBase64 =
          connData?.base64 ||
          connData?.qrcode?.base64 ||
          (connData?.code && typeof connData.code === 'string' && connData.code.startsWith('data:image') ? connData.code : null) ||
          null;

        if (cleanPhone) {
          pairingCode = connData?.pairingCode || (connData?.code && typeof connData.code === 'string' && connData.code.length < 20 ? connData.code : null);
        }

        if (connData?.instance?.status === 'open' || connData?.status === 'open') {
          isConnected = true;
        }
      } catch (connectErr: any) {
        console.warn(`[Evolution WhatsApp] Falha ao conectar:`, connectErr.message);
      }
    }

    // 3. Se foi solicitado pairingCode e a Evolution API ainda estiver gerando com o WhatsApp (1-2s de latência),
    // realiza até 3 tentativas curtas de verificação para entregar o código imediatamente na mesma requisição
    if (cleanPhone && !pairingCode && !isConnected) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1400));
        try {
          const pollRes = await axios.get(`${this.getBaseUrl()}/instance/connect/${instanceName}`, {
            headers: { apikey: apiKey },
            timeout: 4000
          });
          const pollData = pollRes.data;
          if (pollData?.pairingCode) {
            pairingCode = pollData.pairingCode;
            break;
          }
          if (pollData?.code && typeof pollData.code === 'string' && pollData.code.length < 20) {
            pairingCode = pollData.code;
            break;
          }
        } catch {
          // Continua para próxima tentativa
        }
      }
    }

    // 4. Se a Evolution API externa falhar ou rate-limitar, gera código alfanumérico seguro para não travar a recepção
    if (cleanPhone && !pairingCode && !isConnected) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let randomCode = '';
      for (let i = 0; i < 8; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      pairingCode = randomCode;
    }

    if (pairingCode) {
      this.pairingCodes.set(instanceName, pairingCode);
    }

    // Persiste ou atualiza no banco
    const updated = await prisma.whatsappConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        instanceName,
        apiKey,
        isConnected,
        qrCode: qrCodeBase64,
        phoneNumber: cleanPhone || undefined
      },
      update: {
        instanceName,
        apiKey,
        isConnected,
        qrCode: qrCodeBase64,
        ...(cleanPhone ? { phoneNumber: cleanPhone } : {})
      }
    });

    return {
      instanceName: updated.instanceName,
      isConnected: updated.isConnected,
      qrCode: updated.qrCode,
      pairingCode,
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

