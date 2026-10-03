import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { Role } from '@prisma/client';

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
    contentSecurityPolicy: process.env.NODE_ENV === 'production'
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_64_bytes_secure_fallback_key_2026',
    cookie: {
      cookieName: 'refreshToken',
      signed: false
    }
  });

  await app.register(cookie, {
    secret: process.env.SESSION_SECRET || 'dev_session_secret_64_bytes_secure_fallback_2026'
  });

  // Middleware de Autenticação JWT
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
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
      if (!request.user || !allowedRoles.includes(request.user.role)) {
        reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Seu perfil de usuário não tem permissão para realizar esta operação.'
        });
      }
    };
  });
};

export default fp(securityPlugin);
