import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface UserPayload {
  sub: string;
  tenantId: string | null;
  role: Role;
  email: string;
  name: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: UserPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const securityPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production'
  });

  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());

  await app.register(cors, {
    origin: (origin, cb) => {
      // Permite requisições sem origin (ex.: curl, mobile apps nativos, healthchecks)
      if (!origin) return cb(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.includes('marquesuahora.com.br') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        env.NODE_ENV === 'development'
      ) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false
    }
  });

  await app.register(cookie, {
    secret: env.SESSION_SECRET
  });

  // Middleware de Autenticação JWT (Blocker C9: retorno obrigatório para encerrar a pipeline)
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Acesso restrito. Faça login para continuar.'
      });
    }
  });

  // Middleware de Autorização por Role (RBAC)
  app.decorate('requireRole', (allowedRoles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      if (reply.sent) return;

      if (!request.user || !allowedRoles.includes(request.user.role)) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Seu perfil de usuário não tem permissão para realizar esta operação.'
        });
      }
    };
  });
};

export default fp(securityPlugin);
