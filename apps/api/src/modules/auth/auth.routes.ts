import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.').toLowerCase().trim(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'A senha atual é obrigatória.'),
  newPassword: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Login de Usuário (Dono, Profissional, Recepção ou Super Admin)
  app.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'E-mail ou senha incorretos.'
      });
    }

    // Validação de Hash com Argon2id
    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'E-mail ou senha incorretos.'
      });
    }

    // Se o usuário pertencer a uma loja bloqueada
    if (user.tenant && user.tenant.blockedAt && user.role !== Role.SUPER_ADMIN) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'O acesso do seu estabelecimento está temporariamente suspenso.',
        blockedReason: user.tenant.blockedReason
      });
    }

    // Geração do Access Token JWT (15 minutos)
    const token = app.jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        name: user.name
      },
      { expiresIn: '15m' }
    );

    // Geração do Refresh Token (7 dias)
    const refreshToken = app.jwt.sign(
      { sub: user.id },
      { expiresIn: '7d' }
    );

    // Armazena Refresh Token em Cookie HttpOnly Seguro
    reply.setCookie('refreshToken', refreshToken, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 // 7 dias em segundos
    });

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name ?? null,
        tenantSlug: user.tenant?.slug ?? null
      },
      token
    });
  });

  // Rotação de Token (Refresh)
  app.post('/refresh', async (request, reply) => {
    const rawRefreshToken = request.cookies.refreshToken;
    if (!rawRefreshToken) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Sessão expirada. Faça login novamente.'
      });
    }

    try {
      const decoded = app.jwt.verify<{ sub: string }>(rawRefreshToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { tenant: true }
      });

      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Usuário não encontrado.'
        });
      }

      const token = app.jwt.sign(
        {
          sub: user.id,
          tenantId: user.tenantId,
          role: user.role,
          email: user.email,
          name: user.name
        },
        { expiresIn: '15m' }
      );

      return reply.send({ token });
    } catch {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token inválido ou expirado.'
      });
    }
  });

  // Logout (Limpeza de Cookie)
  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.send({ message: 'Sessão encerrada com sucesso.' });
  });

  // Alteração Segura de Senha do Salão (Argon2id)
  app.post(
    '/change-password',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
      const userId = request.user.sub;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Usuário não encontrado.'
        });
      }

      // Validação da senha atual com Argon2
      const isValid = await argon2.verify(user.passwordHash, currentPassword);
      if (!isValid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'A senha atual informada está incorreta.'
        });
      }

      // Hash da nova senha com Argon2id
      const newPasswordHash = await argon2.hash(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      // Registro de Auditoria
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'USER_PASSWORD_CHANGE',
          entityType: 'User',
          entityId: user.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        message: 'Senha alterada com sucesso.'
      });
    }
  );
};
