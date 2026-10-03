import fastify, { FastifyInstance } from 'fastify';
import securityPlugin from './plugins/security';
import { errorHandler } from './plugins/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { lookupRoutes } from './modules/lookup/lookup.routes';
import { plansRoutes } from './modules/plans/plans.routes';
import { tenantsRoutes } from './modules/tenants/tenants.routes';
import { servicesRoutes } from './modules/services/services.routes';
import { professionalsRoutes } from './modules/professionals/professionals.routes';
import { resourcesRoutes } from './modules/resources/resources.routes';
import { schedulesRoutes } from './modules/schedules/schedules.routes';
import { publicRoutes } from './modules/public/public.routes';
import { supportRoutes } from './modules/support/support.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { webhookRoutes } from './modules/automation/webhook.routes';

export function buildApp(): FastifyInstance {
  const isTest = process.env.NODE_ENV === 'test';
  const app = fastify({
    logger: isTest
      ? false
      : {
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
        }
  });

  // Plugins centrais de segurança e tratamento de erros
  app.register(securityPlugin);
  app.setErrorHandler(errorHandler);

  // Rota de Health Check
  app.get('/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      service: 'Marque Sua Hora API',
      timestamp: new Date().toISOString()
    });
  });

  // Módulos da Aplicação
  app.register(authRoutes, { prefix: '/auth' });
  app.register(lookupRoutes, { prefix: '/lookup' });
  app.register(plansRoutes, { prefix: '/plans' });
  app.register(tenantsRoutes, { prefix: '/tenants' });
  app.register(servicesRoutes, { prefix: '/services' });
  app.register(professionalsRoutes, { prefix: '/professionals' });
  app.register(resourcesRoutes, { prefix: '/resources' });
  app.register(schedulesRoutes, { prefix: '/schedules' });
  app.register(publicRoutes, { prefix: '/public' });
  app.register(supportRoutes, { prefix: '/support' });
  app.register(adminRoutes, { prefix: '/admin' });
  app.register(webhookRoutes, { prefix: '/webhooks' });

  return app;
}
