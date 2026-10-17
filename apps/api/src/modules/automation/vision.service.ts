import axios from 'axios';

export interface PixReceiptAnalysis {
  isPixReceipt: boolean;
  amount?: number | null;
  receiverName?: string | null;
  transactionId?: string | null;
  dateStr?: string | null;
  status?: 'SUCCESS' | 'PENDING' | 'FAILED' | 'UNKNOWN';
}

export interface BeautyReferenceAnalysis {
  isBeautyReference: boolean;
  detectedServiceCategory?: string | null;
  description?: string;
  recommendedServiceNames?: string[];
}

export class VisionService {
  private static getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }

  private static getModel(): string {
    return 'google/gemini-2.0-flash-001';
  }

  /**
   * Analisa um comprovante de transferência PIX enviado por foto no WhatsApp.
   * Identifica se é um comprovante bancário legítimo e extrai o valor e dados.
   */
  public static async analyzePixReceipt(imageBase64: string): Promise<PixReceiptAnalysis> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('sua_chave')) {
      return { isPixReceipt: false, status: 'UNKNOWN' };
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const dataUri = `data:image/jpeg;base64,${cleanBase64}`;

    const prompt = `Analise a imagem anexada e determine se ela é um comprovante de pagamento ou transferência PIX.
Responda ESTRITAMENTE em formato JSON puro, sem blocos markdown ou explicações fora do JSON:
{
  "isPixReceipt": boolean,
  "amount": number | null (valor numérico em reais, ex: 50.00),
  "receiverName": string | null (nome da pessoa ou empresa que recebeu o PIX),
  "transactionId": string | null (código de autenticação/id da transação),
  "dateStr": string | null (data e hora no formato DD/MM/AAAA HH:MM se visível),
  "status": "SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN"
}`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.getModel(),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUri } }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 300
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://marquesuahora.com.br',
            'X-Title': 'MarqueSuaHora',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content?.trim() || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { isPixReceipt: false, status: 'UNKNOWN' };
    } catch (err: any) {
      console.warn('[VisionService] Erro ao analisar comprovante PIX:', err.response?.data || err.message);
      return { isPixReceipt: false, status: 'UNKNOWN' };
    }
  }

  /**
   * Analisa uma foto de referência de procedimento enviada pela cliente (ex: unha, corte, barba, mechas).
   */
  public static async analyzeBeautyReference(
    imageBase64: string,
    availableServiceNames: string[]
  ): Promise<BeautyReferenceAnalysis> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('sua_chave')) {
      return { isBeautyReference: false };
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const dataUri = `data:image/jpeg;base64,${cleanBase64}`;

    const prompt = `Analise a foto enviada pelo cliente para o salão/barbearia/estética.
Serviços oferecidos pelo salão:
${availableServiceNames.map(s => `- ${s}`).join('\n')}

Determine se é uma foto de referência de beleza/estética (ex: corte de cabelo, penteado, barba, design de sobrancelhas, unhas, alongamento, maquiagem).
Responda ESTRITAMENTE em formato JSON puro:
{
  "isBeautyReference": boolean,
  "detectedServiceCategory": string | null (ex: "Unhas", "Cabelo", "Barba", "Sobrancelhas"),
  "description": string (descrição breve em português do procedimento visto na imagem, ex: "Alongamento de unha formato amendoado com esmaltação em gel e francesinha"),
  "recommendedServiceNames": string[] (serviços do catálogo do salão que mais combinam com essa referência)
}`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.getModel(),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUri } }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 350
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://marquesuahora.com.br',
            'X-Title': 'MarqueSuaHora',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content?.trim() || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { isBeautyReference: false };
    } catch (err: any) {
      console.warn('[VisionService] Erro ao analisar foto de referência:', err.response?.data || err.message);
      return { isBeautyReference: false };
    }
  }
}
