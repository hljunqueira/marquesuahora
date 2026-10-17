# MarqueSuaHora — Arquitetura de Infraestrutura e Operações

## 1. Visão Geral da Infraestrutura
A plataforma **MarqueSuaHora** opera em uma arquitetura moderna orientada a microsserviços monorepo, hospedada em VPS Ubuntu Linux com orquestração de containers Docker, banco de dados relacional PostgreSQL 16 e cache de alto desempenho com Redis 7.

```
                           [ Cloudflare / DNS / SSL ]
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [ Next.js 14 Frontend ]                 [ Fastify Node.js API ]
            (Porta: 3000)                           (Porta: 3333)
                    │                                     │
                    │                               ┌─────┴─────┐
                    │                               ▼           ▼
                    │                       [ PostgreSQL 16 ] [ Redis 7 ]
                    │                         (Porta 5432)   (Porta 6379)
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
       [ Evolution API v2 ]   [ Asaas API ]   [ Resend ]   [ OpenRouter / JEV ]
          (WhatsApp VPS)        (PIX/Planos)   (E-mails)       (Copiloto IA)
```

---

## 2. Portas e Serviços Locais / Produção

| Serviço | Ambiente Local | Produção VPS | Descrição |
| :--- | :--- | :--- | :--- |
| **Web Frontend (Next.js)** | `http://localhost:3000` | `https://marquesuahora.com.br` | Aplicação web SSR/SPA em React 18 / Next 14 |
| **API Backend (Fastify)** | `http://localhost:3333` | `https://api.marquesuahora.com.br` | API REST JSON com rotas raiz e `/api/v1` |
| **PostgreSQL 16** | `localhost:5432` | Container Docker interno | Banco de dados relacional principal |
| **Redis 7** | `localhost:6379` | Container Docker interno | Cache de slots, rate limit e sessões |
| **Evolution API v2** | `http://23.80.89.116:3042` | VPS (`23.80.89.116:3042`) | Gateway oficial para WhatsApp |

---

## 3. Variáveis de Ambiente Críticas (`apps/api/.env` e `apps/web/.env.local`)

### API (`apps/api/.env`):
- `NODE_ENV`: `development` | `production` | `test`
- `API_PORT`: `3333`
- `DATABASE_URL`: `postgresql://marquesuahora:<PASSWORD>@localhost:5432/marquesuahora_db?schema=public`
- `REDIS_URL`: `redis://:<PASSWORD>@localhost:6379`
- `JWT_SECRET`: Hash de 64 bytes para assinatura de Access Tokens (7 dias).
- `JWT_REFRESH_SECRET`: Hash de 64 bytes para Refresh Tokens (30 dias).
- `SESSION_SECRET`: Hash de 64 bytes para cookies de sessão HttpOnly.
- `EVOLUTION_API_URL`: URL base do endpoint da Evolution API.
- `EVOLUTION_API_KEY`: Chave mestre de autenticação da instância.
- `ASAAS_API_URL`: `https://api.asaas.com/v3` (Gateway de pagamentos).
- `ASAAS_API_KEY`: Token de autenticação da conta Asaas.
- `ASAAS_WEBHOOK_SECRET`: Segredo de validação dos webhooks de cobrança.
- `RESEND_API_KEY`: Chave de disparo de e-mails transacionais.
- `OPENROUTER_API_KEY`: Chave de acesso aos modelos LLM (DeepSeek).
- `OPENROUTER_MODEL`: `deepseek/deepseek-chat`
- `TYPESAFE_API_KEY`: Chave do modelo semântico JEV.

### Web Frontend (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL`: `http://localhost:3333` (local) ou `https://api.marquesuahora.com.br` (produção).
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` (local) ou `https://marquesuahora.com.br` (produção).

---

## 4. Integrações de Terceiros e Conectores

### A. WhatsApp via Evolution API v2
- **Propósito**: Confirmação instantânea de agendamentos, lembretes 24h e 2h antes do atendimento, pesquisa de satisfação pós-procedimento e recuperação de clientes inativos.
- **Resiliência**: Tratamento de timeout de 5 segundos; falhas na API de WhatsApp não bloqueiam a conclusão do agendamento no banco.

### B. Gateway Asaas
- **Propósito**: Gestão de assinaturas dos salões nos planos do MarqueSuaHora (Solo, Equipe Pro, etc.) com geração de PIX e cartão de crédito recorrente.
- **Importante**: O sinal cobrado do cliente final pelo salão na Proteção Anti-Falta vai **direto para a conta bancária do salão** via chave PIX informada pelo salão, sem passar por intermediários nem sofrer desconto de taxas da plataforma.

### C. E-mail Transacional via Resend
- **Propósito**: Notificações de boas-vindas, redefinição de senhas com token assinado e comprovantes de faturas.
- **Simulação**: Em ambiente de teste (`NODE_ENV === 'test'`), o envio de e-mails é simulado via log sem consumir quotas.

### D. Inteligência Artificial (OpenRouter + Typesafe JEV)
- **OpenRouter**: Alimenta o chat de suporte oficial ao assinante em `/dashboard/suporte`, com timeout de 4,5s e contingência local automática.
- **Typesafe JEV**: Processamento de comandos de voz e texto rápido na agenda (`/ai/quick-command`).

---

## 5. Scripts de Deploy e Automação

### `deploy.ps1`
Script PowerShell para build automatizado, geração do Prisma Client e deploy na VPS:
1. Validação de integridade do TypeScript em todos os pacotes: `pnpm build`
2. Criação do build de produção do Next.js: `pnpm --filter @marquesuahora/web build`
3. Sincronização do schema Prisma e migrações no banco: `pnpm prisma:generate`
4. Reinicialização graciosa dos processos via PM2 ou Docker na VPS.
