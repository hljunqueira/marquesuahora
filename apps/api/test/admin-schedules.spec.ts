import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('Rotas Administrativas e de Gestão do Painel (Opção 2)', () => {
  const app = buildApp();

  it('deve proteger GET /api/v1/schedules/dashboard-summary contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schedules/dashboard-summary'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/categories contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/categories'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/clients contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clients'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/clients/metrics contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/metrics'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PATCH /api/v1/clients/:id/toggle-block contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/clients/fake-id/toggle-block'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/schedules contra criação não autorizada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      payload: {
        serviceIds: ['00000000-0000-0000-0000-000000000001'],
        dateStr: '2026-10-20',
        startTime: '10:00',
        clientName: 'Ana Souza',
        clientPhone: '11999998888'
      }
    });

    expect(res.statusCode).toBe(401);
  });
});
