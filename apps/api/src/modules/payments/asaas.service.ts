import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { Plan, Tenant } from '@prisma/client';

export interface AsaasCustomerData {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
}

export interface AsaasSubscriptionResult {
  subscriptionId?: string;
  invoiceUrl?: string;
  status?: string;
}

export interface AsaasDepositResult {
  paymentId?: string;
  pixCopiaECola?: string;
  pixQrCodeBase64?: string;
  invoiceUrl?: string;
}

export class AsaasService {
  private static get baseUrl(): string {
    const url = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
    return url.replace(/\/+$/, '');
  }

  private static get apiKey(): string {
    return process.env.ASAAS_API_KEY || '';
  }

  private static get headers() {
    return {
      'Content-Type': 'application/json',
      'access_token': this.apiKey
    };
  }

  public static isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Localiza cliente existente pelo CPF/CNPJ ou cria um novo no gateway Asaas
   */
  public static async findOrCreateCustomer(
    tenant: Pick<Tenant, 'id' | 'name' | 'legalName' | 'documentNumber' | 'phone' | 'asaasCustomerId'> & {
      ownerEmail?: string;
    }
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      console.warn('[AsaasService] ASAAS_API_KEY não configurada. Operação de cliente ignorada.');
      return null;
    }

    try {
      // 1. Se o tenant já possui ID registrado no Asaas, retorna diretamente
      if (tenant.asaasCustomerId) {
        return tenant.asaasCustomerId;
      }

      // 2. Busca por CPF/CNPJ limpo
      const cleanDoc = tenant.documentNumber.replace(/\D/g, '');
      const searchRes = await axios.get(`${this.baseUrl}/customers`, {
        params: { cpfCnpj: cleanDoc },
        headers: this.headers,
        timeout: 10000
      });

      if (searchRes.data?.data && searchRes.data.data.length > 0) {
        const existingId = searchRes.data.data[0].id;
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { asaasCustomerId: existingId }
        });
        return existingId;
      }

      // 3. Cria cliente novo no Asaas
      const cleanPhone = tenant.phone ? tenant.phone.replace(/\D/g, '') : undefined;
      const createRes = await axios.post(
        `${this.baseUrl}/customers`,
        {
          name: tenant.legalName || tenant.name,
          cpfCnpj: cleanDoc,
          email: tenant.ownerEmail || 'contato@marquesuahora.com.br',
          phone: cleanPhone,
          mobilePhone: cleanPhone,
          externalReference: tenant.id
        },
        {
          headers: this.headers,
          timeout: 10000
        }
      );

      const customerId = createRes.data?.id;
      if (customerId) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { asaasCustomerId: customerId }
        });
      }

      return customerId || null;
    } catch (err: any) {
      console.error('[AsaasService] Erro ao buscar/criar cliente no Asaas:', err?.response?.data || err.message);
      return null;
    }
  }

  /**
   * Cria ou atualiza assinatura recorrente para o plano do salão no Asaas
   */
  public static async createOrUpdateSubscription(
    tenant: Tenant & { ownerEmail?: string },
    plan: Plan,
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = 'PIX'
  ): Promise<AsaasSubscriptionResult | null> {
    if (!this.isConfigured()) {
      console.warn('[AsaasService] ASAAS_API_KEY não configurada. Assinatura simulada ativada.');
      return null;
    }

    try {
      const customerId = await this.findOrCreateCustomer(tenant);
      if (!customerId) {
        throw new Error('Não foi possível obter ou criar o cliente no Asaas.');
      }

      // Data do primeiro vencimento (30 dias para planos com carência ou amanhã)
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 30);
      const dueDateStr = nextDueDate.toISOString().slice(0, 10);

      const subRes = await axios.post(
        `${this.baseUrl}/subscriptions`,
        {
          customer: customerId,
          billingType,
          value: Number(plan.monthlyPrice),
          nextDueDate: dueDateStr,
          cycle: 'MONTHLY',
          description: `Assinatura Plano ${plan.name} — Marque Sua Hora`,
          externalReference: tenant.id
        },
        {
          headers: this.headers,
          timeout: 10000
        }
      );

      const subData = subRes.data;
      if (subData?.id) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            asaasSubscriptionId: subData.id,
            billingStatus: 'ACTIVE'
          }
        });
      }

      return {
        subscriptionId: subData?.id,
        invoiceUrl: subData?.invoiceUrl,
        status: subData?.status
      };
    } catch (err: any) {
      console.error('[AsaasService] Erro ao criar assinatura no Asaas:', err?.response?.data || err.message);
      return null;
    }
  }

  /**
   * Cria cobrança avulsa PIX para o sinal de agendamento (Anti-No-Show)
   */
  public static async createDepositCharge(
    scheduleId: string
  ): Promise<AsaasDepositResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          client: true,
          tenant: true,
          service: true
        }
      });

      if (!schedule || !schedule.client || Number(schedule.depositAmount) <= 0) {
        return null;
      }

      // Localiza ou cria cliente para o cliente final
      const cleanPhone = schedule.client.phone.replace(/\D/g, '');
      const custRes = await axios.post(
        `${this.baseUrl}/customers`,
        {
          name: schedule.client.name,
          email: schedule.client.email || undefined,
          phone: cleanPhone,
          mobilePhone: cleanPhone,
          externalReference: `client:${schedule.client.id}`
        },
        {
          headers: this.headers,
          timeout: 10000
        }
      ).catch(async () => {
        // Fallback: se cliente já existe, tenta buscar
        const search = await axios.get(`${this.baseUrl}/customers`, {
          params: { name: schedule.client.name },
          headers: this.headers,
          timeout: 10000
        });
        return { data: search.data?.data?.[0] };
      });

      const customerId = custRes.data?.id;
      if (!customerId) return null;

      const todayStr = new Date().toISOString().slice(0, 10);
      const chargeRes = await axios.post(
        `${this.baseUrl}/payments`,
        {
          customer: customerId,
          billingType: 'PIX',
          value: Number(schedule.depositAmount),
          dueDate: todayStr,
          description: `Sinal de agendamento: ${schedule.service?.name || 'Serviço'} — ${schedule.tenant.name}`,
          externalReference: `schedule:${schedule.id}`
        },
        {
          headers: this.headers,
          timeout: 10000
        }
      );

      const paymentId = chargeRes.data?.id;
      if (!paymentId) return null;

      // Obtém dados do QR Code Pix
      const qrRes = await axios.get(`${this.baseUrl}/payments/${paymentId}/pixQrCode`, {
        headers: this.headers,
        timeout: 10000
      });

      const pixCopiaECola = qrRes.data?.payload;
      const pixQrCodeBase64 = qrRes.data?.encodedImage;

      // Atualiza o agendamento com o código Pix gerado
      if (pixCopiaECola) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            depositPixCode: pixCopiaECola,
            depositExpiresAt: expiresAt
          }
        });
      }

      return {
        paymentId,
        pixCopiaECola,
        pixQrCodeBase64,
        invoiceUrl: chargeRes.data?.invoiceUrl
      };
    } catch (err: any) {
      console.error('[AsaasService] Erro ao gerar sinal PIX no Asaas:', err?.response?.data || err.message);
      return null;
    }
  }
}
