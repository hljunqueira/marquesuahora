import axios from 'axios';

export interface ServiceContext {
  name: string;
  price: number;
  durationMinutes: number;
}

export interface CourseContext {
  title: string;
  price?: number | null;
  description?: string | null;
}

export interface ProductContext {
  name: string;
  salePrice: number;
  description?: string | null;
}

export interface InquiryParams {
  tenantName: string;
  tenantSlug: string;
  services: ServiceContext[];
  courses?: CourseContext[];
  products?: ProductContext[];
  customInstructions?: string | null;
  knowledgeBaseFaq?: Array<{ question: string; answer: string }> | null;
  address?: string | null;
  openingHours?: string | null;
  clientName?: string;
  messageText: string;
}

export class OpenRouterService {
  private static getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }

  private static getModel(): string {
    return process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
  }

  /**
   * Indica se a integração com o OpenRouter está configurada com chave de API.
   */
  public static isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim().length > 0 && !key.includes('sua_chave');
  }

  /**
   * Gera uma resposta humanizada via LLM pelo OpenRouter com Context Engine 360°
   * (serviços, cursos, produtos da vitrine, regras do salão e FAQ).
   */
  public static async answerGeneralInquiry(params: InquiryParams): Promise<string> {
    if (!this.isConfigured()) {
      return this.getDefaultFallback(params);
    }

    try {
      const servicesList = params.services.length > 0
        ? params.services.map((s) => `• ${s.name}: R$ ${Number(s.price).toFixed(2)} (${s.durationMinutes} min)`).join('\n')
        : 'Consulte nossa tabela atualizada diretamente no link oficial de agendamento.';

      const coursesList = params.courses && params.courses.length > 0
        ? params.courses.map((c) => `• ${c.title}${c.price ? ` - R$ ${Number(c.price).toFixed(2)}` : ' - Acesso Livre'}${c.description ? `: ${c.description}` : ''}`).join('\n')
        : 'Nenhum curso aberto no momento.';

      const productsList = params.products && params.products.length > 0
        ? params.products.map((p) => `• ${p.name}: R$ ${Number(p.salePrice).toFixed(2)}${p.description ? ` (${p.description})` : ''}`).join('\n')
        : 'Consulte os produtos e cosméticos disponíveis na recepção ou vitrine online.';

      const faqSection = params.knowledgeBaseFaq && params.knowledgeBaseFaq.length > 0
        ? params.knowledgeBaseFaq.map((item) => `P: ${item.question}\nR: ${item.answer}`).join('\n\n')
        : '';

      const systemPrompt = `Você é a atendente virtual e recepcionista oficial do estabelecimento "${params.tenantName}".
Seu papel é responder dúvidas de clientes de forma acolhedora, objetiva, profissional e sempre orientar para o link oficial de agendamento e vitrine.

DADOS DO ESTABELECIMENTO:
- Nome: ${params.tenantName}
- Endereço: ${params.address || 'Consulte nosso endereço completo no link de agendamento'}
- Horário de Atendimento: ${params.openingHours || 'Consulte os dias e horários livres no link'}
- Link Oficial: https://marquesuahora.com.br/${params.tenantSlug}

SERVIÇOS DE ATENDIMENTO:
${servicesList}

CURSOS & TREINAMENTOS:
${coursesList}

PRODUTOS DA VITRINE:
${productsList}
${params.customInstructions ? `\nINSTRUÇÕES ESPECÍFICAS DA EQUIPE:\n${params.customInstructions}\n` : ''}
${faqSection ? `\nPERGUNTAS FREQUENTES (FAQ):\n${faqSection}\n` : ''}
DIRETRIZES DE COMUNICAÇÃO:
1. Responda em até 3 parágrafos curtos, ideal para leitura rápida no WhatsApp.
2. Seja transparente e nunca invente valores, profissionais ou procedimentos que não constam nas informações acima.
3. Se perguntarem sobre dias e horários livres, informe que a agenda em tempo real está disponível no link oficial.
4. Mantenha tom educado e limpo, sem emojis decorativos excessivos.
5. Finalize sempre convidando a cliente com gentileza a acessar o link oficial para garantir seu horário.`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.getModel(),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${params.clientName ? `Cliente: ${params.clientName}\n` : ''}Mensagem: "${params.messageText}"` }
          ],
          temperature: 0.3,
          max_tokens: 300
        },
        {
          headers: {
            Authorization: `Bearer ${this.getApiKey()}`,
            'HTTP-Referer': 'https://marquesuahora.com.br',
            'X-Title': 'MarqueSuaHora',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const replyContent = response.data?.choices?.[0]?.message?.content?.trim();
      if (replyContent) {
        return replyContent;
      }

      return this.getDefaultFallback(params);
    } catch (err: any) {
      console.warn('[OpenRouter AI] Falha ao consultar LLM via OpenRouter:', err.response?.data || err.message);
      return this.getDefaultFallback(params);
    }
  }

  /**
   * Resposta padrão caso o OpenRouter esteja offline ou sem chave configurada.
   */
  public static getDefaultFallback(params: Pick<InquiryParams, 'tenantName' | 'tenantSlug'>): string {
    return (
      `Olá! Recebemos sua mensagem no *${params.tenantName}*. Nossa equipe já foi notificada para te responder em breve!\n\n` +
      `Para conferir nossos serviços, valores e agendar seu horário pelo celular a qualquer hora, acesse:\n` +
      `👉 https://marquesuahora.com.br/${params.tenantSlug}`
    );
  }
}
