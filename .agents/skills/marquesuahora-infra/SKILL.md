---
name: marquesuahora-infra
description: Instruções de infraestrutura, portas, variáveis de ambiente, Docker, deploy na VPS, PostgreSQL, Redis, Evolution API e Asaas do projeto MarqueSuaHora.
---

# Skill de Infraestrutura e Operações — MarqueSuaHora

Esta skill deve ser consultada sempre que o agente for realizar tarefas de infraestrutura, deploy, configuração de portas, variáveis de ambiente, migrações de banco ou depuração de conexões externas.

## 1. Topologia de Rede e Portas Locais
- **Frontend Next.js 14**: Porta `3000` (`http://localhost:3000`)
- **Backend Fastify API**: Porta `3333` (`http://localhost:3333`)
  - A API possui suporte tanto a rotas diretas (ex: `/health`, `/support/ai-chat`) quanto com prefixo versionado `/api/v1/*`.
- **PostgreSQL 16**: Porta `5432`
- **Redis 7**: Porta `6379`
- **Evolution API (WhatsApp VPS)**: `http://23.80.89.116:3042` na VPS `23.80.89.116` com chave `msh_evolution_master_key_2026`.

## 2. Comandos Operacionais

### Checagem de Tipos TypeScript (Obrigatório antes de qualquer merge)
```powershell
# No frontend:
cd "apps/web"
npx tsc --noEmit

# No backend:
cd "apps/api"
npx tsc --noEmit
```

### Sincronização e Geração do Prisma
```powershell
# Geração dos clientes Prisma:
pnpm prisma:generate

# Criação de migrações:
cd "apps/api"
npx prisma migrate dev --name <nome_da_migracao>
```

### Rodar Testes Unitários
```powershell
cd "apps/api"
pnpm test
```

## 3. Diretrizes de Segurança em Infraestrutura
1. **Nunca expor chaves de API**: `OPENROUTER_API_KEY`, `ASAAS_API_KEY`, `RESEND_API_KEY` ou segredos JWT em commits ou respostas diretas na interface do chat.
2. **Defensividade contra falhas de conexão**: Sempre utilizar `try/catch` ao comunicar com APIs de terceiros (Evolution, Asaas, Resend, OpenRouter) e possuir fallbacks locais.
3. **Persistência de Sessão**: O sistema usa tokens JWT com 7 dias de validade e Refresh Tokens armazenados em cookies `HttpOnly` com validade de 30 dias.
