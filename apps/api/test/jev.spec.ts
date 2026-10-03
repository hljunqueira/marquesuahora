import { describe, it, expect } from 'vitest';
import { JevDecisionEngine } from '../src/modules/automation/jev.service';
import { EvolutionService } from '../src/modules/automation/evolution.service';

describe('TypeSafe Jev (System One) - Motor de Decisões do WhatsApp', () => {
  it('deve classificar confirmações de presença com alta confiança', () => {
    const phrases = [
      '1',
      'Confirmado',
      'confirmo',
      'Vou sim',
      'Estarei aí com certeza',
      'Pode confirmar meu horário'
    ];

    for (const phrase of phrases) {
      const result = JevDecisionEngine.classify(phrase);
      expect(result.intent).toBe('CONFIRM_APPOINTMENT');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('deve classificar cancelamentos ou remarcações determinando liberação de vaga', () => {
    const phrases = [
      '2',
      'cancelar',
      'Cancela por favor',
      'Preciso desmarcar',
      'Não vou conseguir ir',
      'Gostaria de mudar meu horário'
    ];

    for (const phrase of phrases) {
      const result = JevDecisionEngine.classify(phrase);
      expect(result.intent).toBe('CANCEL_OR_RESCHEDULE');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('deve classificar aceite de vaga da Lista de Espera Inteligente (Auto-Fill)', () => {
    const phrases = [
      'sim aceito',
      'quero a vaga',
      'aceito',
      'Pode marcar a vaga'
    ];

    for (const phrase of phrases) {
      const result = JevDecisionEngine.classify(phrase);
      expect(result.intent).toBe('ACCEPT_WAITLIST_SLOT');
    }
  });

  it('deve extrair pontuações de NPS de 1 a 5 estrelas', () => {
    expect(JevDecisionEngine.classify('5')).toEqual({
      intent: 'NPS_FEEDBACK',
      confidence: 0.99,
      extractedScore: 5
    });

    expect(JevDecisionEngine.classify('⭐⭐⭐⭐⭐').extractedScore).toBe(5);
    expect(JevDecisionEngine.classify('1', 'NPS_PENDING').extractedScore).toBe(1);
    expect(JevDecisionEngine.classify('1 estrela').extractedScore).toBe(1);
    expect(JevDecisionEngine.classify('Péssimo serviço').extractedScore).toBe(1);
  });

  it('deve cair em dúvida geral para perguntas abertas', () => {
    const result = JevDecisionEngine.classify('Qual é o endereço e horário de funcionamento?');
    expect(result.intent).toBe('GENERAL_INQUIRY');
  });
});

describe('EvolutionService - Sanitização de Telefones', () => {
  it('deve acrescentar o DDI 55 quando ausente', () => {
    expect(EvolutionService.sanitizePhone('(11) 98765-4321')).toBe('5511987654321');
    expect(EvolutionService.sanitizePhone('21999998888')).toBe('5521999998888');
  });

  it('deve manter o número inalterado caso já contenha DDI 55', () => {
    expect(EvolutionService.sanitizePhone('5511987654321')).toBe('5511987654321');
  });
});
