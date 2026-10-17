import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Carrega .env do root se não estiver carregado
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config(); // Fallback para .env local

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres para garantir segurança'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET deve ter no mínimo 32 caracteres'),
  CORS_ORIGINS: z.string().default('https://marquesuahora.com.br,https://www.marquesuahora.com.br,https://api.marquesuahora.com.br,http://localhost:3000,http://127.0.0.1:3000,http://localhost:3040'),
  EVOLUTION_API_URL: z.string().url().optional().or(z.literal('')),
  EVOLUTION_API_KEY: z.string().optional().or(z.literal('')),
  EVOLUTION_GLOBAL_KEY: z.string().optional().or(z.literal('')),
  OPENROUTER_API_KEY: z.string().optional().or(z.literal('')),
  OPENROUTER_MODEL: z.string().default('deepseek/deepseek-chat'),
  TYPESAFE_API_KEY: z.string().optional().or(z.literal('')),
  ASAAS_API_URL: z.string().url().optional().or(z.literal('')),
  ASAAS_API_KEY: z.string().optional().or(z.literal('')),
  ASAAS_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),
  RESEND_API_KEY: z.string().optional().or(z.literal('')),
  RESEND_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),
  EMAIL_FROM: z.string().optional().or(z.literal(''))
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Falha na validação das variáveis de ambiente:');
    for (const error of result.error.errors) {
      console.error(`  - ${error.path.join('.')}: ${error.message}`);
    }
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw new Error('Variáveis de ambiente inválidas');
  }

  return result.data;
}

export const env = validateEnv();
