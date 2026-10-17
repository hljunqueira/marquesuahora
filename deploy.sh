#!/usr/bin/env bash
# ==============================================================================
# MARQUE SUA HORA — SCRIPT DE DEPLOY PRODUÇÃO (BASH / LINUX / WSL)
# ==============================================================================

set -euo pipefail

SERVER_HOST="${SERVER_HOST:-23.80.89.116}"
SERVER_USER="${SERVER_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/root/marquesuahora}"
SERVICES="${1:-web api}"
MIGRATE="${MIGRATE:-false}"
TAR_FILE="deploy.tar.gz"

echo "🚀 Iniciando deploy MarqueSuaHora -> ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}..."

# 1. Teste de conexão SSH
echo "1/4 Testando conexão SSH..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "${SERVER_USER}@${SERVER_HOST}" "echo 'SSH OK'"

# 2. Empacotamento
echo "2/4 Empacotando arquivos locais no ${TAR_FILE}..."
rm -f "${TAR_FILE}"
tar --exclude="node_modules" \
    --exclude=".next" \
    --exclude=".git" \
    --exclude="dist" \
    --exclude=".env" \
    --exclude=".env.*" \
    --exclude="*.log" \
    --exclude="*.tar.gz" \
    -czf "${TAR_FILE}" apps packages package.json pnpm-lock.yaml pnpm-workspace.yaml Dockerfile.api Dockerfile.web docker-compose.prod.yml

# 3. Upload SCP
echo "3/4 Enviando para o servidor via SCP..."
scp -o ConnectTimeout=15 "${TAR_FILE}" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/${TAR_FILE}"

# 4. Execução remota no servidor
echo "4/4 Atualizando containers no servidor (${SERVICES})..."
ssh "${SERVER_USER}@${SERVER_HOST}" bash -s <<REMOTE_SCRIPT
set -e
cd ${REMOTE_DIR}
tar -xzf ${TAR_FILE}
rm -f ${TAR_FILE}
docker compose -f docker-compose.prod.yml up -d --build ${SERVICES}

if [ "${MIGRATE}" = "true" ]; then
  echo "--> Executando migrations do Prisma..."
  docker exec marquesuahora-api npx prisma migrate deploy
fi

echo "--> Status dos containers:"
docker ps --filter name=marquesuahora --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
REMOTE_SCRIPT

echo "✅ Deploy concluído com sucesso!"
