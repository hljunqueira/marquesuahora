import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // 1. Erro de Validação Zod (HTTP 400)
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));

    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Dados enviados incompletos ou inválidos.',
      issues: formattedErrors
    });
  }

  // 2. Interceptor Global Prisma P2002 — Violação de Unicidade (HTTP 409 Humanizado)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = (error.meta?.target as string[]) || [];
    let userMessage = 'Já existe um registro cadastrado com essas informações.';

    if (target.some((f) => f.includes('documentNumber'))) {
      userMessage = 'Já existe um estabelecimento cadastrado com este CNPJ ou CPF.';
    } else if (target.some((f) => f.includes('slug'))) {
      userMessage = 'Este link exclusivo já está em uso por outro salão. Por favor, escolha outro.';
    } else if (target.some((f) => f.includes('phone'))) {
      userMessage = 'Já existe um cliente cadastrado com este telefone neste salão.';
    } else if (target.some((f) => f.includes('email'))) {
      userMessage = 'Este e-mail já está cadastrado na plataforma.';
    } else if (target.some((f) => f.includes('name'))) {
      userMessage = 'Já existe um serviço cadastrado com este nome no seu estabelecimento.';
    } else if (target.some((f) => f.includes('code'))) {
      userMessage = 'Já existe um plano com este código identificador.';
    }

    return reply.status(409).send({
      statusCode: 409,
      error: 'Conflict',
      message: userMessage,
      target
    });
  }

  // 3. Erro de Autenticação JWT (HTTP 401)
  if (error.statusCode === 401) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Sessão expirada ou não autorizada. Por favor, acerte seu login.'
    });
  }

  // 4. Erros Internos Não Tratados (HTTP 500)
  request.log.error(error);
  return reply.status(error.statusCode || 500).send({
    statusCode: error.statusCode || 500,
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Ocorreu um erro interno momentâneo. Nossa equipe foi notificada.'
        : error.message
  });
}
