import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis de ambiente da raiz do monorepo e do app
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { buildApp } from './app';

const server = buildApp();
const PORT = parseInt(process.env.PORT || '3333', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🚀 Marca Tua Hora API rodando com sucesso em http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
