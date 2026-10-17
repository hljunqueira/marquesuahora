import { env } from './config/env';
import { buildApp } from './app';

const server = buildApp();
const PORT = env.PORT;
const HOST = '0.0.0.0';

async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🚀 Marque Sua Hora API rodando com sucesso em http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
