import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('Health Check Endpoint', () => {
  it('deve responder status ok e timestamp em /health', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('Marque Sua Hora API');
    expect(body.timestamp).toBeDefined();
  });
});
