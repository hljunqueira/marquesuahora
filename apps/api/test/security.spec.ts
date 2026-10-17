import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('Base e Segurança (Etapa 0 - C5 e C9)', () => {
  it('deve responder status ok em /health na raiz e em /api/v1/health', async () => {
    const app = buildApp();

    const rootRes = await app.inject({
      method: 'GET',
      url: '/health'
    });
    expect(rootRes.statusCode).toBe(200);
    expect(rootRes.json().status).toBe('ok');

    const v1Res = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });
    expect(v1Res.statusCode).toBe(200);
    expect(v1Res.json().status).toBe('ok');
    expect(v1Res.json().service).toBe('Marque Sua Hora API v1');
  });

  it('deve retornar 401 e interromper a pipeline ao tentar acessar rota autenticada sem token (C9)', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schedules/calendar'
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('deve retornar 401 ao tentar acessar rota com token inválido/adulterado', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schedules/calendar',
      headers: {
        authorization: 'Bearer token_invalido_falso'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });
});
