import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('Lookup Endpoints (/api/v1/lookup)', () => {
  const app = buildApp();

  it('deve retornar HTTP 400 se o CNPJ não tiver 14 dígitos', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/lookup/document/12345'
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('CNPJ válido de 14 dígitos');
  });

  it('deve retornar HTTP 400 se o CEP não tiver 8 dígitos', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/lookup/cep/123'
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('8 dígitos numéricos');
  });
});
