import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { QuickCommandService, QuickCommandPreview } from './quick-command.service';

const quickCommandInputSchema = z.object({
  transcript: z.string().min(1, 'Transcrição ou texto obrigatório.'),
  executeImmediately: z.boolean().optional().default(false),
  preview: z.any().optional()
});

export const quickCommandRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // POST /ai/quick-command - Interpreta ou Executa Comando por Voz / Texto
  app.post('/quick-command', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const body = quickCommandInputSchema.parse(request.body);

    // Se o cliente já confirmou o card de prévia e pediu execução direta:
    if (body.executeImmediately && body.preview) {
      try {
        const executionResult = await QuickCommandService.executeCommand({
          tenantId,
          userId: request.user.sub,
          preview: body.preview as QuickCommandPreview,
          ip: request.ip,
          userAgent: request.headers['user-agent']
        });
        return reply.status(200).send(executionResult);
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: 'Falha na Execução',
          message: err?.message || 'Não foi possível concluir o lançamento.'
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
      return reply.status(500).send({
        success: false,
        error: 'Erro na Interpretação',
        message: err?.message || 'Falha ao interpretar comando de voz.'
      });
    }
  });
};
