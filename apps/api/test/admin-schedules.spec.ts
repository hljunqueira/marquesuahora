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

  it('deve proteger PATCH /api/v1/schedules/:id contra remarcação não autorizada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/schedules/00000000-0000-0000-0000-000000000001',
      payload: {
        dateStr: '2026-10-25',
        startTime: '14:00'
      }
    });

    expect(res.statusCode).toBe(401);
  });

  it('deve proteger PUT /api/v1/clients/:id contra atualizações sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/clients/00000000-0000-0000-0000-000000000001',
      payload: {
        name: 'Maria Atualizada'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger DELETE /api/v1/clients/:id contra exclusão sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/clients/00000000-0000-0000-0000-000000000001'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/schedules/:id/status contra alteração sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules/00000000-0000-0000-0000-000000000001/status',
      payload: {
        status: 'CONFIRMED'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/professionals contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/professionals'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PUT /api/v1/professionals/:id contra alterações sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/professionals/00000000-0000-0000-0000-000000000001',
      payload: {
        name: 'Profissional Atualizado'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger DELETE /api/v1/professionals/:id contra exclusão sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/professionals/00000000-0000-0000-0000-000000000001'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Financeiro e Crediário
  it('deve proteger GET /api/v1/financial contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/financial'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/financial contra criação de lançamentos sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/financial',
      payload: {
        type: 'INCOME',
        amount: 150.0,
        description: 'Corte e Barba'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PUT /api/v1/financial/:id contra atualização de lançamentos sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/financial/00000000-0000-0000-0000-000000000001',
      payload: {
        amount: 200.0
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger DELETE /api/v1/financial/:id contra exclusão de lançamentos sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/financial/00000000-0000-0000-0000-000000000001'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/financial/commissions contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/financial/commissions'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/financial/credit-accounts contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/financial/credit-accounts'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/financial/credit-accounts contra criação de crediário sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/financial/credit-accounts',
      payload: {
        clientName: 'Cliente Teste',
        clientPhone: '11988887777',
        serviceOrDescription: 'Manicure Quinzenal',
        totalAmount: 120.0,
        dueDate: '2026-11-01'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PUT /api/v1/financial/credit-accounts/:id contra alteração de crediário sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/financial/credit-accounts/00000000-0000-0000-0000-000000000001',
      payload: {
        totalAmount: 150.0
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/financial/credit-accounts/:id/pay contra baixa de crediário sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/financial/credit-accounts/00000000-0000-0000-0000-000000000001/pay',
      payload: {
        amount: 60.0,
        paymentMethod: 'PIX'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger DELETE /api/v1/financial/credit-accounts/:id contra exclusão de crediário sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/financial/credit-accounts/00000000-0000-0000-0000-000000000001'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Produtos e Estoque
  it('deve proteger GET /api/v1/products contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/products contra criação de produto sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: {
        name: 'Óleo de Argan',
        category: 'Finalizadores',
        salePrice: 85.0
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PUT /api/v1/products/:id contra atualização de produto sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/products/00000000-0000-0000-0000-000000000001',
      payload: {
        salePrice: 90.0,
        stockQuantity: 15
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger DELETE /api/v1/products/:id contra exclusão de produto sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/products/00000000-0000-0000-0000-000000000001'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Cursos, Aulas e Assinantes
  it('deve proteger GET /api/v1/courses contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/courses'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/courses contra criação de curso sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      payload: {
        title: 'Workshop Lash Master Pro',
        price: 297.0
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PUT /api/v1/courses/:id contra atualização sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/courses/00000000-0000-0000-0000-000000000001',
      payload: {
        title: 'Workshop Lash Master Pro V2'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger DELETE /api/v1/courses/:id contra exclusão sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/courses/00000000-0000-0000-0000-000000000001'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/courses/:id/lessons contra criação de aula sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses/00000000-0000-0000-0000-000000000001/lessons',
      payload: {
        title: 'Aula 01 - Fundamentos',
        videoUrl: 'https://youtube.com/watch?v=12345678901'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger DELETE /api/v1/courses/lessons/:id contra exclusão de aula sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/courses/lessons/00000000-0000-0000-0000-000000000001'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/courses/subscribers contra listagem de alunas sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/courses/subscribers'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Configurações do Estabelecimento
  it('deve proteger PUT /api/v1/tenants/me/settings contra alterações sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/tenants/me/settings',
      payload: {
        name: 'Studio Teste Sem Token'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Suporte e Chamados
  it('deve proteger POST /api/v1/support/ai-chat contra interações sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/support/ai-chat',
      payload: {
        message: 'Como configuro o sinal PIX?'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/support/active-ticket contra consultas sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/support/active-ticket'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/support/tickets contra abertura de chamado sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/support/tickets',
      payload: {
        subject: 'Dúvida com vitrine',
        category: 'DOUBT',
        priority: 'MEDIUM',
        initialMessage: 'Gostaria de ajuda para trocar a foto de capa'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Copiloto IA de Comandos Rápidos
  it('deve proteger POST /api/v1/ai/quick-command contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/quick-command',
      payload: {
        transcript: 'anotar 150 reais em produtos da loja Fraceto hoje'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Cobrança Antecipada de Sinal / Taxa de Reserva
  it('deve proteger POST /api/v1/schedules/:id/confirm-deposit contra confirmações sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules/00000000-0000-0000-0000-000000000001/confirm-deposit'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PUT /api/v1/tenants/me/settings com campos de sinal contra requisições sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/tenants/me/settings',
      payload: {
        depositOnFirstBooking: true,
        depositFirstBookingPercent: 50
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger POST /api/v1/services com configuração de sinal contra requisições sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/services',
      payload: {
        name: 'Alongamento em Gel',
        price: 180,
        durationMinutes: 120,
        requiresDeposit: true,
        depositType: 'PERCENTAGE',
        depositAmount: 50
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  // Testes de Segurança e Proteção - Valores Flexíveis, Fotos de Entrada/Saída e Anamnese
  it('deve proteger PATCH /api/v1/schedules/:id com totalPrice e fotos contra requisições sem token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/schedules/00000000-0000-0000-0000-000000000001',
      payload: {
        totalPrice: 150,
        arrivalPhotoUrl: 'https://example.com/chegada.jpg',
        resultPhotoUrl: 'https://example.com/resultado.jpg'
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger GET /api/v1/clients/:id/anamnesis contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/00000000-0000-0000-0000-000000000001/anamnesis'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('deve proteger PATCH /api/v1/clients/:id/anamnesis contra acessos sem token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/clients/00000000-0000-0000-0000-000000000001/anamnesis',
      payload: {
        anamnesis: {
          hasAllergies: true,
          allergiesDescription: 'Alergia a monomer'
        }
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });
});


