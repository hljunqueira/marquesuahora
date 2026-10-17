import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickCommandService } from '../src/modules/ai/quick-command.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    service: { findMany: vi.fn().mockResolvedValue([]) },
    professional: { findMany: vi.fn().mockResolvedValue([]) }
  }
}));

describe('Copiloto IA de Comandos Rápidos e Voz (QuickCommandService)', () => {
  const dummyTenantId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it('deve interpretar comando de despesa em loja/produtos com valor', async () => {
    const preview = await QuickCommandService.parseCommand({
      tenantId: dummyTenantId,
      transcript: 'anotar 150 reais em produtos da loja Fraceto hoje'
    });

    expect(preview.action).toBe('CREATE_EXPENSE');
    expect(preview.payload.amount).toBe(150);
    expect(preview.payload.category).toBe('PRODUTOS');
    expect(preview.summary).toContain('150,00');
    expect(preview.spokenFeedback).toBeDefined();
  });

  it('deve interpretar comando de gasto com mercado', async () => {
    const preview = await QuickCommandService.parseCommand({
      tenantId: dummyTenantId,
      transcript: 'gasto hoje de 80 reais no mercado'
    });

    expect(preview.action).toBe('CREATE_EXPENSE');
    expect(preview.payload.amount).toBe(80);
    expect(preview.payload.category).toBe('INSUMOS');
    expect(preview.payload.description).toContain('Mercado');
  });

  it('deve interpretar comando de crediário/fiado para cliente', async () => {
    const preview = await QuickCommandService.parseCommand({
      tenantId: dummyTenantId,
      transcript: 'anotar crediario para Carla de 200 reais'
    });

    expect(preview.action).toBe('CREATE_CREDIT');
    expect(preview.payload.creditAmount).toBe(200);
    expect(preview.payload.creditClientName?.toLowerCase()).toContain('carla');
  });

  it('deve interpretar comando de bloqueio de horário', async () => {
    const preview = await QuickCommandService.parseCommand({
      tenantId: dummyTenantId,
      transcript: 'bloquear horario das 14:00 as 16:00 almoco com dentista'
    });

    expect(preview.action).toBe('BLOCK_SCHEDULE');
    expect(preview.payload.blockStartTime).toBe('14:00');
    expect(preview.payload.blockEndTime).toBe('16:00');
  });

  it('deve identificar comando desconhecido quando sem padrão reconhecível', async () => {
    const preview = await QuickCommandService.parseCommand({
      tenantId: dummyTenantId,
      transcript: 'bom dia tudo bem como vai'
    });

    expect(preview.action).toBe('UNKNOWN');
    expect(preview.summary).toContain('Não foi possível identificar');
  });
});
