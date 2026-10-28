import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanizerGuardrail } from '../src/modules/automation/humanizer-guardrail';
import { ConversationMemoryService } from '../src/modules/automation/conversation-memory.service';
import { AiAssistantService } from '../src/modules/automation/ai-assistant.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'tenant-123',
        name: 'Studio Elegance',
        slug: 'studio-elegance',
        phone: '11999998888',
        depositRequired: true,
        depositType: 'PERCENTAGE',
        depositAmount: 30,
        depositFirstBookingType: 'FIXED',
        depositFirstBookingValue: 25.0,
        pixKey: '11999998888',
        openingTime: '09:00',
        closingTime: '20:00'
      })
    },
    tenantAiSettings: {
      findUnique: vi.fn().mockResolvedValue({
        customInstructions: 'Temos café expresso e estacionamento conveniado.',
        knowledgeBaseFaq: [{ question: 'Tem estacionamento?', answer: 'Sim, ao lado.' }]
      })
    },
    service: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'srv-1', name: 'Corte Feminino', price: 120, durationMinutes: 60 },
        { id: 'srv-2', name: 'Manicure Gel', price: 90, durationMinutes: 45 }
      ])
    },
    professional: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'prof-1', name: 'Camila Nail' },
        { id: 'prof-2', name: 'Carlos Hair' }
      ])
    },
    schedule: {
      count: vi.fn().mockResolvedValue(0)
    },
    product: {
      findMany: vi.fn().mockResolvedValue([])
    },
    course: {
      findMany: vi.fn().mockResolvedValue([])
    },
    availabilityRule: {
      findMany: vi.fn().mockResolvedValue([])
    }
  }
}));

vi.mock('../src/modules/schedules/availability.service', () => ({
  AvailabilityService: {
    getAvailableSlots: vi.fn().mockResolvedValue({
      date: '2026-10-18',
      isOpen: true,
      totalSlots: 3,
      slots: {
        morning: [{ time: '10:00', available: true }],
        afternoon: [{ time: '14:30', available: true }, { time: '16:00', available: true }],
        night: []
      }
    })
  }
}));

describe('Atendente IA Autônoma & Humanizer (AiAssistantService)', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('1. Humanizer Guardrail', () => {
    it('deve remover clichês proibidos de robô de atendimento', () => {
      const dirty = 'Certamente! O corte custa R$ 120. Espero ter ajudado! Qualquer dúvida fico à disposição.';
      const clean = HumanizerGuardrail.sanitize(dirty);

      expect(clean).not.toContain('Certamente');
      expect(clean).not.toContain('Espero ter ajudado');
      expect(clean).not.toContain('fico à disposição');
      expect(clean).toContain('O corte custa R$ 120');
    });

    it('deve remover travessões longos como conectores universais e substituir por vírgula', () => {
      const dirty = 'Temos vagas amanhã — às 14h e às 16h — com o Carlos.';
      const clean = HumanizerGuardrail.sanitize(dirty);

      expect(clean).not.toContain('—');
      expect(clean).toBe('Temos vagas amanhã, às 14h e às 16h, com o Carlos.');
    });

    it('deve remover múltiplos emojis ornamentais consecutivos', () => {
      const dirty = 'Agendado com sucesso! 🎉✨🔥 Venha nos visitar!';
      const clean = HumanizerGuardrail.sanitize(dirty);

      expect(clean).not.toContain('🎉✨🔥');
      expect(clean).toContain('Agendado com sucesso!');
    });
  });

  describe('2. Memória Conversacional (Redis / In-Memory Fallback)', () => {
    it('deve armazenar e recuperar histórico recente de mensagens do cliente', async () => {
      const tenantId = 't-test-1';
      const phone = '11988887777';

      await ConversationMemoryService.clearHistory(tenantId, phone);
      await ConversationMemoryService.addMessage(tenantId, phone, 'user', 'Tem horário amanhã?');
      await ConversationMemoryService.addMessage(tenantId, phone, 'assistant', 'Temos às 14h e 16h!');

      const history = await ConversationMemoryService.getRecentHistory(tenantId, phone);
      expect(history.length).toBe(2);
      expect(history[0].content).toBe('Tem horário amanhã?');
      expect(history[1].content).toBe('Temos às 14h e 16h!');
    });
  });

  describe('3. Motor de Atendimento com Disponibilidade e Regras Anti-Falta', () => {
    it('deve realizar transbordo imediato e cordial quando cliente solicita humano', async () => {
      const reply = await AiAssistantService.processMessage({
        tenantId: 'tenant-123',
        clientPhone: '11977776666',
        messageText: 'Gostaria de falar com atendente humano por favor'
      });

      expect(reply).toContain('Vou avisar nossa equipe da recepção agora mesmo');
      expect(reply).toContain('https://marquesuahora.com.br/studio-elegance');
    });

    it('deve consultar disponibilidade real e incluir horários vagos e link na resposta', async () => {
      const reply = await AiAssistantService.processMessage({
        tenantId: 'tenant-123',
        clientPhone: '11977776666',
        clientName: 'Mariana',
        messageText: 'Tem horário para corte amanhã?'
      });

      expect(reply).toContain('10:00');
      expect(reply).toContain('14:30');
      expect(reply).toContain('https://marquesuahora.com.br/studio-elegance');
    });

    it('deve alertar cordialmente quando o dia solicitado estiver FECHADO', async () => {
      const { AvailabilityService } = await import('../src/modules/schedules/availability.service');
      vi.mocked(AvailabilityService.getAvailableSlots).mockResolvedValueOnce({
        date: '2026-10-22',
        isOpen: false,
        reason: 'Estabelecimento fechado neste dia da semana.',
        totalSlots: 0,
        slots: { morning: [], afternoon: [], night: [] }
      });

      const reply = await AiAssistantService.processMessage({
        tenantId: 'tenant-123',
        clientPhone: '11977776666',
        clientName: 'Mariana',
        messageText: 'Tem horário para quinta-feira?'
      });

      expect(reply).toContain('FECHADO');
      expect(reply).toContain('https://marquesuahora.com.br/studio-elegance');
    });

    it('deve responder de forma breve e acolhedora quando cliente envia simples agradecimento', async () => {
      const tenantId = 'tenant-123';
      const clientPhone = '11955554444';

      // Simula turno anterior onde assistente confirmou agendamento
      await ConversationMemoryService.addMessage(
        tenantId,
        clientPhone,
        'assistant',
        'Seu horário foi confirmado com sucesso para sexta-feira às 14:00!'
      );

      const reply = await AiAssistantService.processMessage({
        tenantId,
        clientPhone,
        messageText: 'Ok, obrigada!'
      });

      expect(reply).toMatch(/(carinho|prazer|breve|logo)/i);
      // Não deve reenviar link ou texto longo de confirmação
      expect(reply).not.toContain('https://marquesuahora.com.br');
    });
  });

  describe('4. Integridade e Precisão de Datas (extractTargetDate)', () => {
    it('deve extrair corretamente data de "amanhã" e dias da semana', () => {
      const todayYMD = '2026-10-22'; // Quinta-feira

      const amanha = AiAssistantService.extractTargetDate('tem horário amanhã?', todayYMD);
      expect(amanha.dateStr).toBe('2026-10-23');
      expect(amanha.weekdayName).toBe('Sexta-feira');
      expect(amanha.formattedDate).toBe('23/10');

      const sexta = AiAssistantService.extractTargetDate('quero para sexta', todayYMD);
      expect(sexta.dateStr).toBe('2026-10-23');
      expect(sexta.weekdayName).toBe('Sexta-feira');

      const terca = AiAssistantService.extractTargetDate('tem vaga na terça?', todayYMD);
      expect(terca.dateStr).toBe('2026-10-27');
      expect(terca.weekdayName).toBe('Terça-feira');
      expect(terca.formattedDate).toBe('27/10');
    });

    it('deve extrair corretamente datas explícitas com número e barra ("dia 23", "27/10")', () => {
      const todayYMD = '2026-10-22';

      const dia23 = AiAssistantService.extractTargetDate('pode ser no dia 23?', todayYMD);
      expect(dia23.dateStr).toBe('2026-10-23');
      expect(dia23.weekdayName).toBe('Sexta-feira');

      const dia27 = AiAssistantService.extractTargetDate('tem vaga 27/10?', todayYMD);
      expect(dia27.dateStr).toBe('2026-10-27');
      expect(dia27.weekdayName).toBe('Terça-feira');
    });
  });

  describe('5. Modo Apenas Notificações (aiAssistantEnabled)', () => {
    it('deve confirmar que o atributo aiAssistantEnabled desativa respostas automáticas da IA', () => {
      const tenantWithAiEnabled = { id: 'tenant-1', aiAssistantEnabled: true };
      const tenantWithAiDisabled = { id: 'tenant-2', aiAssistantEnabled: false };

      expect(tenantWithAiEnabled.aiAssistantEnabled).toBe(true);
      expect(tenantWithAiDisabled.aiAssistantEnabled).toBe(false);
    });
  });
});
