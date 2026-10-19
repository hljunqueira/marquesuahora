import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { QuickCommandService, QuickCommandPreview } from './quick-command.service';

const quickCommandInputSchema = z.object({
  transcript: z.string().min(1, 'Transcrição ou texto obrigatório.'),
  executeImmediately: z.boolean().optional().default(false),
  preview: z.any().optional(),
  password: z.string().optional()
});

export const quickCommandRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // POST /ai/quick-command - Interpreta ou Executa Comando por Voz / Texto
  app.post('/quick-command', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true }
    });

    if (tenant?.plan && !tenant.plan.hasAiAssistant) {
      return reply.status(403).send({
        success: false,
        error: 'Recurso Bloqueado',
        message: 'O Copiloto IA (comandos de voz e texto na agenda) está disponível nos planos com IA ou VIP. Faça o upgrade para desbloquear.'
      });
    }

    const body = quickCommandInputSchema.parse(request.body);

    // Se o cliente já confirmou o card de prévia e pediu execução direta:
    if (body.executeImmediately && body.preview) {
      try {
        const executionResult = await QuickCommandService.executeCommand({
          tenantId,
          userId: request.user.sub,
          preview: body.preview as QuickCommandPreview,
          password: body.password,
          ip: request.ip,
          userAgent: request.headers['user-agent']
        });
        return reply.status(200).send(executionResult);
      } catch (err: any) {
        const isPasswordOrValidation =
          err?.message?.includes('Senha') ||
          err?.message?.includes('obrigatório') ||
          err?.message?.includes('não localizado') ||
          err?.message?.includes('não encontrado');

        // Log formal no AuditLog para administradores
        await prisma.auditLog.create({
          data: {
            userId: request.user.sub,
            tenantId,
            action: 'AI_QUICK_COMMAND_ERROR',
            entityType: 'CopilotIA',
            entityId: tenantId,
            details: {
              errorMessage: err?.message,
              stack: err?.stack,
              actionAttempted: body.preview?.action,
              payload: body.preview?.payload
            },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
          }
        }).catch(() => null);

        const returnMessage = isPasswordOrValidation
          ? err.message
          : 'Não foi possível concluir esta ação no momento. Por favor, verifique com o suporte.';

        return reply.status(400).send({
          success: false,
          error: isPasswordOrValidation ? 'Validação de Segurança' : 'Falha na Execução',
          message: returnMessage
        });
      }
    }

    // Modo Prévia (interpretação para 1 clique de confirmação)
    try {
      const preview = await QuickCommandService.parseCommand({
        tenantId,
        transcript: body.transcript
      });

      return reply.status(200).send({
        success: true,
        preview
      });
    } catch (err: any) {
      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'AI_QUICK_COMMAND_PARSE_ERROR',
          entityType: 'CopilotIA',
          entityId: tenantId,
          details: {
            errorMessage: err?.message,
            stack: err?.stack,
            transcript: body.transcript
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.status(200).send({
        success: false,
        error: 'Erro na Interpretação',
        message: 'Não foi possível interpretar o comando no momento. Por favor, verifique com o suporte.'
      });
    }
  });
};
