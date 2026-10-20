import fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
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
import { categoriesRoutes } from './modules/categories/categories.routes';
import { availabilityRulesRoutes } from './modules/availability-rules/availability-rules.routes';
import { blocksRoutes } from './modules/blocks/blocks.routes';
import { clientsRoutes } from './modules/clients/clients.routes';
import { publicRoutes } from './modules/public/public.routes';
import { supportRoutes } from './modules/support/support.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { webhookRoutes } from './modules/automation/webhook.routes';
import { financialRoutes } from './modules/financial/financial.routes';
import { productsRoutes } from './modules/products/products.routes';
import { coursesRoutes } from './modules/courses/courses.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { couponsRoutes } from './modules/coupons/coupons.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import { quickCommandRoutes } from './modules/ai/quick-command.routes';
import { reportsRoutes } from './modules/reports/reports.routes';
import { env } from './config/env';

export function buildApp(): FastifyInstance {
  const isTest = env.NODE_ENV === 'test';
  const app = fastify({
    bodyLimit: 100 * 1024 * 1024, // 100MB
    logger: isTest
      ? false
      : {
          level: env.NODE_ENV === 'production' ? 'info' : 'debug'
        }
  });

  // Plugins centrais de segurança e tratamento de erros
  app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB
    }
  });
  app.register(securityPlugin);
  app.setErrorHandler(errorHandler);

  // Função unificada para registro de todos os módulos de negócio
  const registerAllRoutes = async (instance: any) => {
    instance.get('/health', async (req: any, reply: any) => {
      const isV1 = req.url.includes('/api/v1');
      return reply.send({
        status: 'ok',
        service: isV1 ? 'Marque Sua Hora API v1' : 'Marque Sua Hora API',
        timestamp: new Date().toISOString()
      });
    });

    instance.register(authRoutes, { prefix: '/auth' });
    instance.register(lookupRoutes, { prefix: '/lookup' });
    instance.register(plansRoutes, { prefix: '/plans' });
    instance.register(tenantsRoutes, { prefix: '/tenants' });
    instance.register(servicesRoutes, { prefix: '/services' });
    instance.register(professionalsRoutes, { prefix: '/professionals' });
    instance.register(resourcesRoutes, { prefix: '/resources' });
    instance.register(schedulesRoutes, { prefix: '/schedules' });
    instance.register(categoriesRoutes, { prefix: '/categories' });
    instance.register(availabilityRulesRoutes, { prefix: '/availability-rules' });
    instance.register(blocksRoutes, { prefix: '/blocks' });
    instance.register(clientsRoutes, { prefix: '/clients' });
    instance.register(publicRoutes, { prefix: '/public' });
    instance.register(supportRoutes, { prefix: '/support' });
    instance.register(adminRoutes, { prefix: '/admin' });
    instance.register(webhookRoutes, { prefix: '/webhooks' });
    instance.register(financialRoutes, { prefix: '/financial' });
    instance.register(productsRoutes, { prefix: '/products' });
    instance.register(coursesRoutes, { prefix: '/courses' });
    instance.register(notificationsRoutes, { prefix: '/notifications' });
    instance.register(couponsRoutes, { prefix: '/coupons' });
    instance.register(uploadRoutes, { prefix: '/uploads' });
    instance.register(quickCommandRoutes, { prefix: '/ai' });
    instance.register(reportsRoutes, { prefix: '/reports' });
  };

  // Suporte a chamadas diretas na raiz (ex: /admin/overview, /plans/admin)
  app.register(registerAllRoutes);

  // Suporte a chamadas versionadas (ex: /api/v1/admin/overview, /api/v1/plans/admin)
  app.register(registerAllRoutes, { prefix: '/api/v1' });

  return app;
}
