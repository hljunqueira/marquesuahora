import axios from 'axios';
import argon2 from 'argon2';
import { prisma } from '../../lib/prisma';
import { BookingService } from '../schedules/booking.service';
import {
  BookingSource,
  PaymentMethod,
  TransactionType,
  CreditAccountStatus,
  ScheduleStatus
} from '@prisma/client';

export interface QuickCommandPreview {
  action:
    | 'CREATE_EXPENSE'
    | 'CREATE_INCOME'
    | 'CREATE_SCHEDULE'
    | 'BLOCK_SCHEDULE'
    | 'CREATE_CREDIT'
    | 'DELETE_SCHEDULE'
    | 'DELETE_BLOCK'
    | 'DELETE_EXPENSE'
    | 'DELETE_INCOME'
    | 'DELETE_CLIENT'
    | 'DELETE_CREDIT'
    | 'DELETE_PRODUCT'
    | 'DELETE_SERVICE'
    | 'UNKNOWN';
  confidence: number;
  summary: string;
  spokenFeedback: string;
  requiresPassword?: boolean;
  payload: {
    // Financeiro
    amount?: number;
    description?: string;
    category?: string;
    date?: string; // YYYY-MM-DD
    paymentMethod?: string;
    entryId?: string;

    // Agendamento
    clientName?: string;
    clientPhone?: string;
    serviceId?: string;
    serviceName?: string;
    professionalId?: string;
    professionalName?: string;
    dateStr?: string; // YYYY-MM-DD
    startTime?: string; // HH:MM
    scheduleId?: string;

    // Bloqueio
    blockDate?: string;
    blockStartTime?: string;
    blockEndTime?: string;
    blockReason?: string;
    blockId?: string;

    // Crediário
    creditClientName?: string;
    creditAmount?: number;
    creditDueDate?: string;
    creditNotes?: string;
    creditAccountId?: string;

    // Produto
    productName?: string;
    productId?: string;
  };
  missingInfo?: string[];
}

export class QuickCommandService {
  private static getOpenRouterApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }

  private static getModel(): string {
    return process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
  }

  /**
   * 1. Interpreta o comando em linguagem natural gerando a prévia estruturada
   */
  public static async parseCommand(params: {
    tenantId: string;
    transcript: string;
    referenceDate?: Date;
  }): Promise<QuickCommandPreview> {
    const { tenantId, transcript } = params;
    const now = params.referenceDate || new Date();
    const currentDateStr = now.toISOString().slice(0, 10);

    // Carrega contexto do catálogo e clientes do salão (com tratamento resiliente)
    let rawServices: any[] = [];
    let professionals: any[] = [];
    let clients: any[] = [];
    let tenant: any = null;

    try {
      const results = await Promise.all([
        prisma.service.findMany({
          where: { tenantId },
          select: { id: true, name: true, price: true }
        }),
        prisma.professional.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true }
        }),
        prisma.client.findMany({
          where: { tenantId },
          select: { id: true, name: true, phone: true },
          take: 300
        }),
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { plan: { select: { code: true, monthlyPrice: true } } }
        })
      ]);
      rawServices = results[0];
      professionals = results[1];
      clients = results[2];
      tenant = results[3];
    } catch {
      rawServices = [];
      professionals = [];
      clients = [];
      tenant = null;
    }

    const isFreePlan = tenant?.plan?.code === 'FREE' && Number(tenant.plan.monthlyPrice) === 0;

    const sanitizeResult = (res: QuickCommandPreview): QuickCommandPreview => {
      if (isFreePlan && (res.action === 'CREATE_CREDIT' || res.action === 'DELETE_CREDIT')) {
        return {
          action: 'UNKNOWN',
          confidence: 0.95,
          summary: 'A gestão de crediário/fiado é um recurso dos planos Solo, Equipe Pro e VIP.',
          spokenFeedback: 'A gestão de crediário e fiado é um recurso dos planos Solo, Equipe Pro e VIP. Acesse a aba de planos para liberar.',
          payload: {},
          missingInfo: ['Recurso dos planos Solo, Equipe Pro e VIP']
        };
      }
      return res;
    };

    const services = rawServices.map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price)
    }));

    // Tenta primeiro via LLM (se houver chave de API)
    const apiKey = this.getOpenRouterApiKey();
    if (apiKey) {
      try {
        const llmResult = await this.parseWithLlm({
          transcript,
          services,
          professionals,
          clients,
          currentDateStr,
          apiKey
        });
        if (llmResult && llmResult.action !== 'UNKNOWN') {
          return sanitizeResult(llmResult);
        }
      } catch (err) {
        console.warn('[QuickCommand] LLM indisponível ou falhou, acionando fallback determinístico:', err);
      }
    }

    // Fallback Inteligente baseado em regras determinísticas (NLP em Português)
    const ruleResult = this.parseWithRules({
      transcript,
      services,
      professionals,
      clients,
      currentDateStr,
      now
    });

    return sanitizeResult(ruleResult);
  }

  /**
   * Parser via LLM (OpenRouter / DeepSeek / Gemini) com schema JSON estrito
   */
  private static async parseWithLlm(params: {
    transcript: string;
    services: Array<{ id: string; name: string; price: number }>;
    professionals: Array<{ id: string; name: string }>;
    clients: Array<{ id: string; name: string; phone: string }>;
    currentDateStr: string;
    apiKey: string;
  }): Promise<QuickCommandPreview | null> {
    const servicesList = params.services.map((s) => `ID: "${s.id}", Nome: "${s.name}", Preço: R$ ${s.price}`).join('; ');
    const professionalsList = params.professionals.map((p) => `ID: "${p.id}", Nome: "${p.name}"`).join('; ');
    const clientsList = params.clients.slice(0, 50).map((c) => `"${c.name}" (${c.phone})`).join(', ');

    const systemPrompt = `Você é o interpretador de comandos por voz do aplicativo de gestão de salão de beleza e barbearia "MarqueSuaHora".
A data de hoje é: ${params.currentDateStr}.

Serviços cadastrados no salão: [${servicesList || 'Nenhum'}]
Profissionais cadastrados no salão: [${professionalsList || 'Nenhum'}]
Clientes recentes cadastrados: [${clientsList || 'Nenhum'}]

Sua tarefa é analisar a frase falada pela dona do salão e classificá-la estritamente em uma das ações:
1. CREATE_EXPENSE: Registra uma saída/despesa financeira (ex: "gastei 150 no mercado", "anotar 150 reais em produtos loja Fraceto", "paguei 40 de conta de luz").
2. CREATE_INCOME: Registra uma entrada/receita avulsa (ex: "recebi 200 de venda de shampoo", "entrou 80 em dinheiro").
3. CREATE_SCHEDULE: Registra um agendamento de cliente (ex: "agendar Maria dia 22 às 17h", "marcar corte com Paula para amanhã às 14h").
4. BLOCK_SCHEDULE: Registra bloqueio de horário (ex: "bloquear minha agenda amanhã das 12h às 13h almoço").
5. CREATE_CREDIT: Registra crediário/fiado para cliente (ex: "anotar crediário de 180 reais para Carla vencer dia 30").
6. DELETE_SCHEDULE: Cancela ou desmarca um agendamento existente (ex: "cancelar horário da Maria amanhã", "desmarcar Paula"). DEVE incluir "requiresPassword": true.
7. DELETE_BLOCK: Remove um bloqueio de agenda (ex: "desbloquear agenda das 12h", "remover bloqueio de almoço"). DEVE incluir "requiresPassword": true.
8. DELETE_EXPENSE: Exclui uma despesa financeira lançada (ex: "apagar despesa de 150", "excluir gasto no mercado"). DEVE incluir "requiresPassword": true.
9. DELETE_CREDIT: Cancela ou apaga uma conta de crediário/fiado (ex: "cancelar fiado da Carla", "apagar dívida de 180"). DEVE incluir "requiresPassword": true.
10. DELETE_CLIENT: Exclui o cadastro de um cliente (ex: "apagar cadastro da cliente Joana"). DEVE incluir "requiresPassword": true.
11. DELETE_PRODUCT: Exclui um produto do estoque (ex: "excluir produto shampoo anti-resíduos"). DEVE incluir "requiresPassword": true.
12. UNKNOWN: Frase não compreendida como comando.

Responda SOMENTE um objeto JSON válido (sem tags markdown, sem código extra) no formato:
{
  "action": "CREATE_EXPENSE" | "CREATE_INCOME" | "CREATE_SCHEDULE" | "BLOCK_SCHEDULE" | "CREATE_CREDIT" | "DELETE_SCHEDULE" | "DELETE_BLOCK" | "DELETE_EXPENSE" | "DELETE_CREDIT" | "DELETE_CLIENT" | "DELETE_PRODUCT" | "UNKNOWN",
  "confidence": 0.95,
  "summary": "Resumo amigável em português do que será feito",
  "spokenFeedback": "Texto curto para falar de volta para a usuária confirmando a ação",
  "requiresPassword": true | false,
  "payload": {
    "amount": 150.00,
    "description": "Produtos loja Fraceto",
    "category": "PRODUTOS" | "INSUMOS" | "OUTROS" | "SERVICOS",
    "date": "YYYY-MM-DD",
    "clientName": "Nome do cliente se aplicável",
    "serviceId": "ID do serviço se identificado",
    "serviceName": "Nome do serviço se identificado",
    "professionalId": "ID do profissional se identificado",
    "professionalName": "Nome do profissional se identificado",
    "dateStr": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "blockDate": "YYYY-MM-DD",
    "blockStartTime": "HH:MM",
    "blockEndTime": "HH:MM",
    "blockReason": "Motivo do bloqueio",
    "creditClientName": "Nome cliente crediário",
    "creditAmount": 180.00,
    "creditDueDate": "YYYY-MM-DD",
    "creditNotes": "Observações do crediário",
    "productName": "Nome do produto se aplicável"
  }
}`;

    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: this.getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.transcript }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const content = res.data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return parsed as QuickCommandPreview;
  }

  /**
   * Parser Determinístico de Regras (Executado instantaneamente sem necessidade de rede externa)
   */
  private static parseWithRules(params: {
    transcript: string;
    services: Array<{ id: string; name: string; price: number }>;
    professionals: Array<{ id: string; name: string }>;
    clients: Array<{ id: string; name: string; phone: string }>;
    currentDateStr: string;
    now: Date;
  }): QuickCommandPreview {
    const text = params.transcript.trim();
    const lower = text.toLowerCase();

    // 1. Extração de valor monetário (ex: "150 reais", "R$ 150", "150,00", "85")
    const amountMatch = lower.match(/(?:r\$\s*|reais\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais)?/i);
    let amount: number | undefined = undefined;
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    }

    // 2. Extração de horário (ex: "às 17 horas", "17h", "17:00", "das 14h às 16h", "das 14:00 as 16:00")
    const timeRangeMatch = lower.match(/das\s*(\d{1,2})(?:h|:(\d{2}))?\s*(?:às|as)\s*(\d{1,2})(?:h|:(\d{2}))?/);
    const singleTimeMatch = lower.match(/(?:às|as)\s*(\d{1,2})(?:h|:(\d{2}))?/);

    // 3. Extração de data (ex: "hoje", "amanhã", "dia 22 do 10", "dia 22/10", "dia 30")
    let targetDateStr = params.currentDateStr;
    if (lower.includes('amanhã') || lower.includes('amanha')) {
      const tomorrow = new Date(params.now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDateStr = tomorrow.toISOString().slice(0, 10);
    } else {
      const dayMonthMatch = lower.match(/dia\s*(\d{1,2})(?:\s*(?:de|do|\/)\s*(\d{1,2}))?/);
      if (dayMonthMatch) {
        const day = parseInt(dayMonthMatch[1], 10);
        const currentYear = params.now.getFullYear();
        let month = params.now.getMonth() + 1;
        if (dayMonthMatch[2]) {
          month = parseInt(dayMonthMatch[2], 10);
        }
        targetDateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // =========================================================================
    // REGRA A: DESPESA FINANCEIRA
    // =========================================================================
    const isExpense =
      lower.includes('gasto') ||
      lower.includes('gastei') ||
      lower.includes('despesa') ||
      lower.includes('paguei') ||
      lower.includes('comprei') ||
      lower.includes('mercado') ||
      lower.includes('loja');

    if (isExpense && amount) {
      let desc = 'Despesa Lançada por Voz';
      if (lower.includes('mercado')) desc = 'Compras no Mercado';
      else if (lower.includes('loja')) {
        const lojaMatch = text.match(/loja\s+([^,.\n]+)/i);
        desc = lojaMatch ? `Produtos loja ${lojaMatch[1].trim()}` : 'Produtos da Loja';
      } else if (lower.includes('produtos')) {
        desc = 'Produtos e Insumos';
      }

      return {
        action: 'CREATE_EXPENSE',
        confidence: 0.95,
        summary: `Lançar despesa de R$ ${amount.toFixed(2).replace('.', ',')} (${desc})`,
        spokenFeedback: `Despesa de ${amount.toFixed(0)} reais em ${desc} pronta para confirmar.`,
        payload: {
          amount,
          description: desc,
          category: lower.includes('mercado') ? 'INSUMOS' : 'PRODUTOS',
          date: targetDateStr,
          paymentMethod: 'PIX'
        }
      };
    }

    // =========================================================================
    // REGRA B: CREDIÁRIO / FIADO
    // =========================================================================
    const isCredit = lower.includes('crediário') || lower.includes('crediario') || lower.includes('fiado') || lower.includes('conta de');
    if (isCredit && amount) {
      const clientMatch = text.match(/(?:para|da|do|de)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i);
      const clientName = clientMatch ? clientMatch[1].trim() : 'Cliente';

      return {
        action: 'CREATE_CREDIT',
        confidence: 0.92,
        summary: `Abrir crediário de R$ ${amount.toFixed(2).replace('.', ',')} para ${clientName} com vencimento em ${targetDateStr.slice(8, 10)}/${targetDateStr.slice(5, 7)}`,
        spokenFeedback: `Crediário de ${amount.toFixed(0)} reais para ${clientName} pronto para lançar.`,
        payload: {
          creditClientName: clientName,
          creditAmount: amount,
          creditDueDate: targetDateStr,
          creditNotes: `Anotado via comando de voz: "${text}"`
        }
      };
    }

    // =========================================================================
    // REGRA C: RECEITA AVULSA
    // =========================================================================
    const isIncome = lower.includes('recebi') || lower.includes('entrou') || lower.includes('venda de') || lower.includes('receita');
    if (isIncome && amount) {
      return {
        action: 'CREATE_INCOME',
        confidence: 0.9,
        summary: `Registrar receita de R$ ${amount.toFixed(2).replace('.', ',')} no financeiro`,
        spokenFeedback: `Receita de ${amount.toFixed(0)} reais pronta para lançar.`,
        payload: {
          amount,
          description: 'Receita avulsa lançada por voz',
          category: 'PRODUTOS',
          date: targetDateStr,
          paymentMethod: 'CASH'
        }
      };
    }

    // =========================================================================
    // REGRA D: BLOQUEIO DE HORÁRIO
    // =========================================================================
    const isBlock = lower.includes('bloquear') || lower.includes('bloqueio') || lower.includes('fechar horário') || lower.includes('fechar agenda');
    if (isBlock) {
      let startTime = '12:00';
      let endTime = '13:00';
      if (timeRangeMatch) {
        startTime = `${String(timeRangeMatch[1]).padStart(2, '0')}:${timeRangeMatch[2] || '00'}`;
        endTime = `${String(timeRangeMatch[3]).padStart(2, '0')}:${timeRangeMatch[4] || '00'}`;
      } else if (singleTimeMatch) {
        startTime = `${String(singleTimeMatch[1]).padStart(2, '0')}:${singleTimeMatch[2] || '00'}`;
        const endHour = Math.min(23, parseInt(singleTimeMatch[1], 10) + 1);
        endTime = `${String(endHour).padStart(2, '0')}:${singleTimeMatch[2] || '00'}`;
      }

      const defaultProf = params.professionals[0];

      return {
        action: 'BLOCK_SCHEDULE',
        confidence: 0.9,
        summary: `Bloquear agenda no dia ${targetDateStr.slice(8, 10)}/${targetDateStr.slice(5, 7)} das ${startTime} às ${endTime}`,
        spokenFeedback: `Bloqueio das ${startTime} às ${endTime} pronto para confirmar.`,
        payload: {
          blockDate: targetDateStr,
          blockStartTime: startTime,
          blockEndTime: endTime,
          blockReason: 'Bloqueio rápido via comando de voz',
          professionalId: defaultProf?.id,
          professionalName: defaultProf?.name
        }
      };
    }

    // =========================================================================
    // REGRA E: AGENDAMENTO DE CLIENTE
    // =========================================================================
    const isSchedule =
      lower.includes('agendar') ||
      lower.includes('marcar') ||
      lower.includes('agendamento') ||
      lower.includes('agenda');

    if (isSchedule) {
      // Tenta achar nome da cliente
      const clientMatch = text.match(/(?:cliente|para|com|pra)\s+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)?)/i);
      let clientName = clientMatch ? clientMatch[1].trim() : '';

      if (lower.includes('pra mim') || lower.includes('para mim')) {
        clientName = 'Cliente';
      }

      // Busca na lista de clientes cadastrados do salão por similaridade de nome
      let matchedClient = (params.clients || []).find((c) => {
        const cLower = c.name.toLowerCase();
        return (
          (clientName && clientName.length >= 3 && (cLower.includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(cLower))) ||
          (c.name.length >= 3 && lower.includes(cLower))
        );
      });

      if (matchedClient) {
        clientName = matchedClient.name;
      } else if (!clientName || clientName.toLowerCase() === 'mim') {
        clientName = 'Cliente';
      }

      // Horário
      let startTime = '10:00';
      if (singleTimeMatch) {
        const h = singleTimeMatch[1];
        const m = singleTimeMatch[2] || singleTimeMatch[3] || '00';
        startTime = `${String(h).padStart(2, '0')}:${m}`;
      }

      // Serviço mais próximo ou primeiro ativo
      let matchedService = params.services[0];
      for (const s of params.services) {
        if (lower.includes(s.name.toLowerCase())) {
          matchedService = s;
          break;
        }
      }

      const defaultProf = params.professionals[0];

      return {
        action: 'CREATE_SCHEDULE',
        confidence: 0.88,
        summary: `Agendar ${clientName} para dia ${targetDateStr.slice(8, 10)}/${targetDateStr.slice(5, 7)} às ${startTime} (${matchedService?.name || 'Serviço do Espaço'})`,
        spokenFeedback: `Agendamento de ${clientName} para ${targetDateStr.slice(8, 10)} do ${targetDateStr.slice(5, 7)} às ${startTime} pronto para confirmar.`,
        payload: {
          clientName,
          clientPhone: matchedClient?.phone || '',
          serviceId: matchedService?.id,
          serviceName: matchedService?.name || 'Serviço do Espaço',
          professionalId: defaultProf?.id,
          professionalName: defaultProf?.name || 'Equipe',
          dateStr: targetDateStr,
          startTime
        }
      };
    }

    // =========================================================================
    // REGRA F: CANCELAR / APAGAR AGENDAMENTO (Exige Senha)
    // =========================================================================
    const isDeleteSchedule =
      (lower.includes('cancelar') || lower.includes('desmarcar') || lower.includes('apagar') || lower.includes('excluir')) &&
      (lower.includes('agendamento') || lower.includes('horário') || lower.includes('horario') || lower.includes('agenda'));

    if (isDeleteSchedule) {
      const clientMatch = text.match(/(?:da|do|de|cliente)\s+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)?)/i);
      const clientName = clientMatch ? clientMatch[1].trim() : '';

      return {
        action: 'DELETE_SCHEDULE',
        confidence: 0.9,
        summary: clientName
          ? `Cancelar agendamento de ${clientName} (Ação destrutiva - requer senha)`
          : `Cancelar agendamento na agenda (Ação destrutiva - requer senha)`,
        spokenFeedback: `Atenção: o cancelamento de agendamento requer sua senha de acesso para confirmar.`,
        requiresPassword: true,
        payload: {
          clientName: clientName || undefined,
          dateStr: targetDateStr
        }
      };
    }

    // =========================================================================
    // REGRA G: REMOVER BLOQUEIO DE AGENDA (Exige Senha)
    // =========================================================================
    const isDeleteBlock =
      (lower.includes('remover') || lower.includes('cancelar') || lower.includes('apagar') || lower.includes('excluir') || lower.includes('desbloquear')) &&
      (lower.includes('bloqueio') || lower.includes('bloqueado'));

    if (isDeleteBlock) {
      return {
        action: 'DELETE_BLOCK',
        confidence: 0.9,
        summary: `Remover bloqueio de agenda (Ação destrutiva - requer senha)`,
        spokenFeedback: `Remoção de bloqueio requer sua senha de acesso.`,
        requiresPassword: true,
        payload: {
          blockDate: targetDateStr,
          blockStartTime: singleTimeMatch ? `${String(singleTimeMatch[1]).padStart(2, '0')}:00` : undefined
        }
      };
    }

    // =========================================================================
    // REGRA H: EXCLUIR DESPESA FINANCEIRA (Exige Senha)
    // =========================================================================
    const isDeleteExpense =
      (lower.includes('excluir') || lower.includes('apagar') || lower.includes('deletar') || lower.includes('cancelar')) &&
      (lower.includes('despesa') || lower.includes('gasto') || lower.includes('saída') || lower.includes('saida'));

    if (isDeleteExpense) {
      return {
        action: 'DELETE_EXPENSE',
        confidence: 0.9,
        summary: amount
          ? `Excluir despesa de R$ ${amount.toFixed(2).replace('.', ',')} (Ação destrutiva - requer senha)`
          : `Excluir lançamento de despesa (Ação destrutiva - requer senha)`,
        spokenFeedback: `Exclusão de despesa requer sua senha de acesso.`,
        requiresPassword: true,
        payload: {
          amount,
          date: targetDateStr
        }
      };
    }

    // =========================================================================
    // REGRA I: CANCELAR CREDIÁRIO / FIADO (Exige Senha)
    // =========================================================================
    const isDeleteCredit =
      (lower.includes('cancelar') || lower.includes('apagar') || lower.includes('excluir') || lower.includes('remover')) &&
      (lower.includes('crediário') || lower.includes('crediario') || lower.includes('fiado'));

    if (isDeleteCredit) {
      const clientMatch = text.match(/(?:da|do|de|cliente)\s+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)?)/i);
      const clientName = clientMatch ? clientMatch[1].trim() : '';

      return {
        action: 'DELETE_CREDIT',
        confidence: 0.9,
        summary: clientName
          ? `Cancelar conta de crediário/fiado de ${clientName} (Ação destrutiva - requer senha)`
          : `Cancelar conta de crediário/fiado (Ação destrutiva - requer senha)`,
        spokenFeedback: `Cancelamento de dívida de crediário requer sua senha de acesso.`,
        requiresPassword: true,
        payload: {
          creditClientName: clientName || undefined,
          creditAmount: amount
        }
      };
    }

    // =========================================================================
    // REGRA J: EXCLUIR CLIENTE (Exige Senha)
    // =========================================================================
    const isDeleteClient =
      (lower.includes('excluir') || lower.includes('apagar') || lower.includes('deletar') || lower.includes('remover')) &&
      lower.includes('cliente');

    if (isDeleteClient) {
      const clientMatch = text.match(/(?:cliente)\s+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)?)/i);
      const clientName = clientMatch ? clientMatch[1].trim() : '';

      return {
        action: 'DELETE_CLIENT',
        confidence: 0.9,
        summary: clientName
          ? `Excluir cadastro da cliente ${clientName} (Ação destrutiva - requer senha)`
          : `Excluir cadastro de cliente (Ação destrutiva - requer senha)`,
        spokenFeedback: `Exclusão de cliente requer sua senha de acesso.`,
        requiresPassword: true,
        payload: {
          clientName: clientName || undefined
        }
      };
    }

    // =========================================================================
    // REGRA K: EXCLUIR PRODUTO (Exige Senha)
    // =========================================================================
    const isDeleteProduct =
      (lower.includes('excluir') || lower.includes('apagar') || lower.includes('deletar') || lower.includes('remover')) &&
      lower.includes('produto');

    if (isDeleteProduct) {
      const prodMatch = text.match(/(?:produto)\s+([^,.\n]+)/i);
      const prodName = prodMatch ? prodMatch[1].trim() : '';

      return {
        action: 'DELETE_PRODUCT',
        confidence: 0.9,
        summary: prodName
          ? `Excluir produto "${prodName}" do estoque (Ação destrutiva - requer senha)`
          : `Excluir produto do estoque (Ação destrutiva - requer senha)`,
        spokenFeedback: `Exclusão de produto requer sua senha de acesso.`,
        requiresPassword: true,
        payload: {
          productName: prodName || undefined
        }
      };
    }

    return {
      action: 'UNKNOWN',
      confidence: 0.2,
      summary: `Não foi possível identificar uma ação para "${text}".`,
      spokenFeedback: 'Não consegui entender o comando. Pode repetir por favor?',
      payload: {},
      missingInfo: ['Ação não identificada']
    };
  }

  /**
   * 2. Executa a ação confirmada no banco de dados com isolamento multi-tenant
   */
  public static async executeCommand(params: {
    tenantId: string;
    userId: string;
    preview: QuickCommandPreview;
    password?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { tenantId, userId, preview, password, ip, userAgent } = params;
    const { action, payload } = preview;

    // Verificação de Segurança Estrita: Ações destrutivas / de exclusão exigem senha do usuário
    if (preview.requiresPassword || action.startsWith('DELETE_')) {
      if (!password || !password.trim()) {
        throw new Error('Senha de acesso obrigatória para confirmar a exclusão.');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('Usuário autenticado não localizado.');
      }

      const isPasswordValid = await argon2.verify(user.passwordHash, password.trim());
      if (!isPasswordValid) {
        await prisma.auditLog.create({
          data: {
            userId,
            tenantId,
            action: 'AI_DESTRUCTIVE_PASSWORD_FAILED',
            entityType: 'CopilotIA',
            entityId: tenantId,
            details: { action, payload },
            ipAddress: ip,
            userAgent
          }
        }).catch(() => null);

        throw new Error('Senha incorreta. Ação cancelada por segurança.');
      }

      await prisma.auditLog.create({
        data: {
          userId,
          tenantId,
          action: 'AI_DESTRUCTIVE_AUTHORIZED',
          entityType: 'CopilotIA',
          entityId: tenantId,
          details: { action, payload },
          ipAddress: ip,
          userAgent
        }
      }).catch(() => null);
    }

    switch (action) {
      case 'CREATE_EXPENSE': {
        if (!payload.amount) throw new Error('Valor da despesa não informado.');

        const entry = await prisma.financialEntry.create({
          data: {
            tenantId,
            type: TransactionType.EXPENSE,
            amount: payload.amount,
            description: payload.description || 'Despesa lançada por voz',
            paymentMethod: PaymentMethod.PIX,
            paidAt: payload.date ? new Date(`${payload.date}T12:00:00Z`) : new Date()
          }
        });

        await prisma.auditLog.create({
          data: {
            userId,
            tenantId,
            action: 'AI_QUICK_COMMAND_EXPENSE',
            entityType: 'FinancialEntry',
            entityId: entry.id,
            details: { amount: payload.amount, description: payload.description, date: payload.date },
            ipAddress: ip,
            userAgent
          }
        }).catch(() => null);

        return {
          success: true,
          message: `Despesa de R$ ${payload.amount.toFixed(2).replace('.', ',')} lançada no financeiro!`,
          spokenFeedback: `Pronto! Despesa de ${payload.amount.toFixed(0)} reais lançada com sucesso no financeiro.`,
          data: entry
        };
      }

      case 'CREATE_INCOME': {
        if (!payload.amount) throw new Error('Valor da receita não informado.');

        const entry = await prisma.financialEntry.create({
          data: {
            tenantId,
            type: TransactionType.INCOME,
            amount: payload.amount,
            description: payload.description || 'Receita lançada por voz',
            paymentMethod: PaymentMethod.CASH,
            paidAt: payload.date ? new Date(`${payload.date}T12:00:00Z`) : new Date()
          }
        });

        await prisma.auditLog.create({
          data: {
            userId,
            tenantId,
            action: 'AI_QUICK_COMMAND_INCOME',
            entityType: 'FinancialEntry',
            entityId: entry.id,
            details: { amount: payload.amount, description: payload.description, date: payload.date },
            ipAddress: ip,
            userAgent
          }
        }).catch(() => null);

        return {
          success: true,
          message: `Receita de R$ ${payload.amount.toFixed(2).replace('.', ',')} anotada no financeiro!`,
          spokenFeedback: `Pronto! Receita de ${payload.amount.toFixed(0)} reais anotada com sucesso.`,
          data: entry
        };
      }

      case 'CREATE_CREDIT': {
        if (!payload.creditAmount || !payload.creditClientName) {
          throw new Error('Nome do cliente e valor do crediário são obrigatórios.');
        }

        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { plan: true }
        });
        if (tenant?.plan?.code === 'FREE' && Number(tenant.plan.monthlyPrice) === 0) {
          throw new Error('A gestão de crediário e fiado é um recurso dos planos Solo, Equipe Pro e VIP. Faça upgrade para desbloquear.');
        }

        // Localiza ou cria cliente
        let client = await prisma.client.findFirst({
          where: {
            tenantId,
            name: { equals: payload.creditClientName.trim(), mode: 'insensitive' }
          }
        });

        if (!client) {
          client = await prisma.client.create({
            data: {
              tenantId,
              name: payload.creditClientName.trim(),
              phone: '00000000000'
            }
          });
        }

        const dueDate = payload.creditDueDate ? new Date(`${payload.creditDueDate}T23:59:59Z`) : new Date();

        const creditAccount = await prisma.creditAccount.create({
          data: {
            tenantId,
            clientId: client.id,
            clientName: payload.creditClientName.trim(),
            clientPhone: client.phone || '00000000000',
            serviceOrDescription: payload.creditNotes || 'Conta aberta por comando de voz',
            totalAmount: payload.creditAmount,
            remainingAmount: payload.creditAmount,
            paidAmount: 0,
            dueDate,
            status: CreditAccountStatus.OPEN,
            notes: payload.creditNotes || 'Conta aberta por comando de voz'
          }
        });

        await prisma.auditLog.create({
          data: {
            userId,
            tenantId,
            action: 'AI_QUICK_COMMAND_CREDIT',
            entityType: 'CreditAccount',
            entityId: creditAccount.id,
            details: { clientId: client.id, amount: payload.creditAmount, dueDate: payload.creditDueDate },
            ipAddress: ip,
            userAgent
          }
        }).catch(() => null);

        return {
          success: true,
          message: `Crediário de R$ ${payload.creditAmount.toFixed(2).replace('.', ',')} para ${client.name} registrado!`,
          spokenFeedback: `Crediário de ${payload.creditAmount.toFixed(0)} reais para ${client.name} criado com sucesso.`,
          data: creditAccount
        };
      }

      case 'BLOCK_SCHEDULE': {
        if (!payload.blockStartTime || !payload.blockEndTime) {
          throw new Error('Horários inicial e final do bloqueio são obrigatórios.');
        }

        // Correção de Data Segura ISO-8601 para DateTime @db.Date do Prisma
        const rawDate = payload.blockDate || new Date().toISOString().slice(0, 10);
        const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
        let blockDateObj = new Date(`${datePart}T12:00:00.000Z`);
        if (isNaN(blockDateObj.getTime())) {
          blockDateObj = new Date();
        }

        const block = await prisma.scheduleBlock.create({
          data: {
            tenantId,
            professionalId: payload.professionalId || null,
            date: blockDateObj,
            startTime: payload.blockStartTime,
            endTime: payload.blockEndTime,
            reason: payload.blockReason || 'Bloqueio via comando de voz'
          }
        });

        await prisma.auditLog.create({
          data: {
            userId,
            tenantId,
            action: 'AI_QUICK_COMMAND_BLOCK',
            entityType: 'ScheduleBlock',
            entityId: block.id,
            details: payload,
            ipAddress: ip,
            userAgent
          }
        }).catch(() => null);

        return {
          success: true,
          message: `Horário das ${payload.blockStartTime} às ${payload.blockEndTime} bloqueado na agenda!`,
          spokenFeedback: `Agenda bloqueada das ${payload.blockStartTime} às ${payload.blockEndTime}.`,
          data: block
        };
      }

      case 'CREATE_SCHEDULE': {
        // Resolução segura de serviço e profissional com fallback ativo
        let sId = payload.serviceId;
        if (!sId) {
          const firstServ = await prisma.service.findFirst({ where: { tenantId } });
          sId = firstServ?.id;
        }

        let pId = payload.professionalId;
        if (!pId) {
          const firstProf = await prisma.professional.findFirst({ where: { tenantId, isActive: true } });
          pId = firstProf?.id;
        }

        if (!sId || !pId || !payload.dateStr || !payload.startTime) {
          throw new Error('Dados de agendamento incompletos. Verifique os serviços e profissionais cadastrados.');
        }

        let phone = payload.clientPhone ? payload.clientPhone.replace(/\D/g, '') : '';
        if (phone.length < 10) {
          // Se não foi informado telefone, verifica se cliente já existe pelo nome no salão
          const existingClient = await prisma.client.findFirst({
            where: {
              tenantId,
              name: { equals: (payload.clientName || '').trim(), mode: 'insensitive' }
            }
          });
          if (existingClient && existingClient.phone && existingClient.phone.length >= 10 && !existingClient.phone.startsWith('00')) {
            phone = existingClient.phone;
          } else {
            // Gera identificador único numérico para não colidir no banco
            phone = `00${Date.now().toString().slice(-9)}`;
          }
        }

        const booking = await BookingService.createBooking({
          tenantId,
          serviceIds: [sId],
          professionalId: pId,
          dateStr: payload.dateStr,
          startTime: payload.startTime,
          clientName: payload.clientName || 'Cliente Balcão',
          clientPhone: phone,
          source: BookingSource.MANUAL_RECEPTION,
          notes: 'Agendamento rápido via Copiloto IA'
        });

        await prisma.auditLog.create({
          data: {
            userId,
            tenantId,
            action: 'AI_QUICK_COMMAND_SCHEDULE',
            entityType: 'Schedule',
            entityId: booking.id,
            details: payload,
            ipAddress: ip,
            userAgent
          }
        }).catch(() => null);

        const realPhone = phone.startsWith('00') ? '' : phone;

        return {
          success: true,
          message: `Agendamento de ${payload.clientName} confirmado para ${payload.dateStr.slice(8, 10)}/${payload.dateStr.slice(5, 7)} às ${payload.startTime}!`,
          spokenFeedback: `Agendamento de ${payload.clientName} marcado com sucesso para às ${payload.startTime}.`,
          data: {
            ...booking,
            clientName: payload.clientName,
            clientPhone: realPhone
          }
        };
      }

      // =========================================================================
      // CASOS DELETAR / EXCLUIR (Com autenticação obrigatória de senha)
      // =========================================================================
      case 'DELETE_SCHEDULE': {
        let schedule = null;
        if (payload.scheduleId) {
          schedule = await prisma.schedule.findFirst({
            where: { id: payload.scheduleId, tenantId },
            include: { client: true }
          });
        } else if (payload.clientName) {
          schedule = await prisma.schedule.findFirst({
            where: {
              tenantId,
              client: { name: { contains: payload.clientName.trim(), mode: 'insensitive' } },
              status: { in: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED] }
            },
            orderBy: { date: 'asc' },
            include: { client: true }
          });
        } else {
          // Último agendamento ativo
          schedule = await prisma.schedule.findFirst({
            where: {
              tenantId,
              status: { in: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED] }
            },
            orderBy: { createdAt: 'desc' },
            include: { client: true }
          });
        }

        if (!schedule) {
          throw new Error('Nenhum agendamento ativo localizado para cancelar.');
        }

        await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            status: ScheduleStatus.CANCELLED,
            notes: 'Cancelado via comando de voz com confirmação de senha'
          }
        });

        return {
          success: true,
          message: `Agendamento de ${schedule.client?.name || 'Cliente'} cancelado com sucesso!`,
          spokenFeedback: `Agendamento cancelado com sucesso.`,
          data: { id: schedule.id }
        };
      }

      case 'DELETE_BLOCK': {
        let block = null;
        if (payload.blockId) {
          block = await prisma.scheduleBlock.findFirst({ where: { id: payload.blockId, tenantId } });
        } else {
          block = await prisma.scheduleBlock.findFirst({
            where: {
              tenantId,
              ...(payload.blockStartTime ? { startTime: payload.blockStartTime } : {})
            },
            orderBy: { createdAt: 'desc' }
          });
        }

        if (!block) {
          throw new Error('Bloqueio de agenda não localizado para remover.');
        }

        await prisma.scheduleBlock.delete({ where: { id: block.id } });

        return {
          success: true,
          message: `Bloqueio de horário (${block.startTime} às ${block.endTime}) removido da agenda!`,
          spokenFeedback: `Bloqueio de horário removido da agenda.`,
          data: { id: block.id }
        };
      }

      case 'DELETE_EXPENSE': {
        let entry = null;
        if (payload.entryId) {
          entry = await prisma.financialEntry.findFirst({ where: { id: payload.entryId, tenantId } });
        } else {
          entry = await prisma.financialEntry.findFirst({
            where: {
              tenantId,
              type: TransactionType.EXPENSE,
              ...(payload.amount ? { amount: payload.amount } : {})
            },
            orderBy: { paidAt: 'desc' }
          });
        }

        if (!entry) {
          throw new Error('Lançamento de despesa não localizado para excluir.');
        }

        await prisma.financialEntry.delete({ where: { id: entry.id } });

        return {
          success: true,
          message: `Despesa de R$ ${Number(entry.amount).toFixed(2).replace('.', ',')} excluída com sucesso!`,
          spokenFeedback: `Despesa excluída com sucesso.`,
          data: { id: entry.id }
        };
      }

      case 'DELETE_INCOME': {
        let entry = null;
        if (payload.entryId) {
          entry = await prisma.financialEntry.findFirst({ where: { id: payload.entryId, tenantId } });
        } else {
          entry = await prisma.financialEntry.findFirst({
            where: {
              tenantId,
              type: TransactionType.INCOME,
              ...(payload.amount ? { amount: payload.amount } : {})
            },
            orderBy: { paidAt: 'desc' }
          });
        }

        if (!entry) {
          throw new Error('Lançamento de receita não localizado para excluir.');
        }

        await prisma.financialEntry.delete({ where: { id: entry.id } });

        return {
          success: true,
          message: `Receita de R$ ${Number(entry.amount).toFixed(2).replace('.', ',')} excluída do financeiro!`,
          spokenFeedback: `Receita excluída do financeiro.`,
          data: { id: entry.id }
        };
      }

      case 'DELETE_CREDIT': {
        let credit = null;
        if (payload.creditAccountId) {
          credit = await prisma.creditAccount.findFirst({ where: { id: payload.creditAccountId, tenantId } });
        } else {
          credit = await prisma.creditAccount.findFirst({
            where: {
              tenantId,
              ...(payload.creditClientName
                ? { clientName: { contains: payload.creditClientName.trim(), mode: 'insensitive' } }
                : {}),
              status: { in: [CreditAccountStatus.OPEN, CreditAccountStatus.PARTIAL] }
            },
            orderBy: { createdAt: 'desc' }
          });
        }

        if (!credit) {
          throw new Error('Conta de crediário/fiado não localizada.');
        }

        await prisma.creditAccount.delete({
          where: { id: credit.id }
        });

        return {
          success: true,
          message: `Conta de crediário de ${credit.clientName} excluída com sucesso!`,
          spokenFeedback: `Conta de crediário excluída com sucesso.`,
          data: { id: credit.id }
        };
      }

      case 'DELETE_CLIENT': {
        if (!payload.clientName) {
          throw new Error('Nome da cliente não informado para exclusão.');
        }

        const client = await prisma.client.findFirst({
          where: {
            tenantId,
            name: { contains: payload.clientName.trim(), mode: 'insensitive' }
          }
        });

        if (!client) {
          throw new Error(`Cliente "${payload.clientName}" não localizada no cadastro.`);
        }

        await prisma.client.delete({ where: { id: client.id } });

        return {
          success: true,
          message: `Cadastro da cliente ${client.name} excluído com sucesso!`,
          spokenFeedback: `Cadastro da cliente excluído com sucesso.`,
          data: { id: client.id }
        };
      }

      case 'DELETE_PRODUCT': {
        if (!payload.productName) {
          throw new Error('Nome do produto não informado para exclusão.');
        }

        const product = await prisma.product.findFirst({
          where: {
            tenantId,
            name: { contains: payload.productName.trim(), mode: 'insensitive' }
          }
        });

        if (!product) {
          throw new Error(`Produto "${payload.productName}" não localizado no catálogo.`);
        }

        await prisma.product.delete({ where: { id: product.id } });

        return {
          success: true,
          message: `Produto "${product.name}" excluído do estoque com sucesso!`,
          spokenFeedback: `Produto excluído do estoque.`,
          data: { id: product.id }
        };
      }

      case 'DELETE_SERVICE': {
        if (!payload.serviceName) {
          throw new Error('Nome do procedimento não informado.');
        }

        const service = await prisma.service.findFirst({
          where: {
            tenantId,
            name: { contains: payload.serviceName.trim(), mode: 'insensitive' }
          }
        });

        if (!service) {
          throw new Error(`Procedimento "${payload.serviceName}" não localizado no catálogo.`);
        }

        await prisma.service.update({
          where: { id: service.id },
          data: { allowOnlineBooking: false }
        });

        return {
          success: true,
          message: `Procedimento "${service.name}" desativado do catálogo com sucesso!`,
          spokenFeedback: `Procedimento desativado com sucesso.`,
          data: { id: service.id }
        };
      }

      default:
        throw new Error('Comando não reconhecido ou ação não suportada.');
    }
  }
}
