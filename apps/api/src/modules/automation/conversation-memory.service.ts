import { redis } from '../../lib/redis';

export interface ChatMessageTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class ConversationMemoryService {
  private static localFallback = new Map<string, ChatMessageTurn[]>();
  private static TTL_SECONDS = 1800; // 30 minutos

  private static getKey(tenantId: string, phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    return `msh:chat_memory:${tenantId}:${cleanPhone}`;
  }

  /**
   * Adiciona uma mensagem ao histórico recente do cliente com o salão.
   */
  public static async addMessage(
    tenantId: string,
    phone: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const key = this.getKey(tenantId, phone);
    const turn: ChatMessageTurn = {
      role,
      content,
      timestamp: Date.now()
    };

    try {
      if (redis.status === 'ready') {
        const raw = await redis.get(key);
        const list: ChatMessageTurn[] = raw ? JSON.parse(raw) : [];
        list.push(turn);
        // Mantém os últimos 6 turnos de diálogo
        const trimmed = list.slice(-6);
        await redis.setex(key, this.TTL_SECONDS, JSON.stringify(trimmed));
        return;
      }
    } catch {
      // Falha no Redis não quebra o atendimento
    }

    // Fallback em memória
    const current = this.localFallback.get(key) || [];
    current.push(turn);
    this.localFallback.set(key, current.slice(-6));
  }

  /**
   * Recupera o histórico das últimas mensagens trocadas com o cliente.
   */
  public static async getRecentHistory(tenantId: string, phone: string): Promise<ChatMessageTurn[]> {
    const key = this.getKey(tenantId, phone);

    try {
      if (redis.status === 'ready') {
        const raw = await redis.get(key);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {
      // Ignora erro de Redis
    }

    return this.localFallback.get(key) || [];
  }

  /**
   * Limpa o histórico de diálogo após um agendamento ser concluído com sucesso.
   */
  public static async clearHistory(tenantId: string, phone: string): Promise<void> {
    const key = this.getKey(tenantId, phone);
    try {
      if (redis.status === 'ready') {
        await redis.del(key);
      }
    } catch {}
    this.localFallback.delete(key);
  }
}
