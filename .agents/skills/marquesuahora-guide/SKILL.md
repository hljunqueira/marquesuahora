---
name: marquesuahora-guide
description: Guia mestre do ecossistema MarqueSuaHora. Mapeia a arquitetura, regras de ouro, catálogo de skills a utilizar e padrões de código para os agentes de IA.
---

# Guia Mestre para Agentes de IA — MarqueSuaHora

Este guia é a bússola essencial para qualquer agente de IA que iniciar uma conversa ou tarefa no repositório **MarqueSuaHora**.

---

## 1. Mapa de Navegação do Repositório

| Domínio | Caminho | Descrição |
| :--- | :--- | :--- |
| **Documentação & PRD** | `docs/` | `PRD.md`, `INFRAESTRUTURA.md`, `ESPECIFICACOES_TECNICAS.md`, `HISTORICO_IMPLEMENTACOES.md` |
| **Banco de Dados** | `apps/api/prisma/schema.prisma` | Modelagem relacional completa do PostgreSQL 16 |
| **Schemas Compartilhados** | `packages/shared/src/schemas/` | Validações Zod e tipagens TypeScript comuns |
| **Rotas da API** | `apps/api/src/modules/` | Endpoints Fastify divididos por domínios de negócio |
| **Vitrine Pública** | `apps/web/src/app/[slug]/` | Agendamento online do cliente final |
| **Dashboard do Salão** | `apps/web/src/app/dashboard/` | Agenda, Clientes, Serviços, Equipe, Configurações, Suporte |
| **Componentes de Agenda** | `apps/web/src/components/agenda/` | Grid semanal, modal de detalhes, modal de criação |
| **Componentes de Configuração** | `apps/web/src/components/settings/` | Aba de Proteção Anti-Falta (Sinal PIX) |
| **Componentes da Vitrine** | `apps/web/src/components/showcase/` | Wizard de agendamento em 4 etapas |

---

## 2. Catálogo de Skills: Qual Skill Usar em Cada Cenário?

Quando você estiver trabalhando neste repositório, consulte e ative as seguintes skills de acordo com o objetivo da sua tarefa:

1. **Para implementar novas features, refatorações ou correções de bugs complexos**:
   - Utilize a skill `gravitas` (localizada em `.agents/skills/gravitas/SKILL.md`). Ela assegura levantamento de requisitos, planejamento com checkpoints e validação com evidências reais.
2. **Para criar ou ajustar animações, transições e microinterações**:
   - Utilize a skill `motion` (localizada em `.agents/skills/motion/SKILL.md`). Garante uso eficiente do `motion/react` com excelente performance e zero jank.
3. **Para tarefas de infraestrutura, VPS, Docker, banco de dados ou integrações de terceiros**:
   - Utilize a skill `marquesuahora-infra` (localizada em `.agents/skills/marquesuahora-infra/SKILL.md`).
4. **Para regras de negócio, fluxos de vitrine, cálculo de sinal anti-falta ou comissões**:
   - Utilize a skill `marquesuahora-prd` (localizada em `.agents/skills/marquesuahora-prd/SKILL.md`).
5. **Para tarefas de design e interface web**:
   - Utilize a skill `frontend-ui-engineering` garantindo responsividade mobile, acessibilidade e respeito à diretriz de **zero ícones decorativos**.

---

## 3. As 5 Regras de Ouro do MarqueSuaHora

1. **Zero Ícones Decorativos / Sem Emojis Ornamentais**:
   - Proibido usar emojis como enfeite visual (`💡`, `✨`, `🔥`, etc.) nas telas e componentes. Priorize tipografia sóbria, hierarquia de pesos de fonte e badges de status funcionais.
2. **Alta Disponibilidade e Zero Downtime no Suporte**:
   - O chat de IA de suporte ao assinante (`/dashboard/suporte`) possui motor local de contingência e **sempre deve responder ao usuário**, mesmo em quedas de rede ou instabilidade do backend.
3. **Proteção Anti-Falta Flexível sem Defaults Engessados**:
   - Qualquer regra de sinal deve ser configurável no banco de dados do tenant, respeitando tanto a regra geral quanto a regra específica para 1ª cliente (Percentual ou Valor Fixo).
4. **Verificação Estrita de Tipos antes de Concluir**:
   - Sempre execute `npx tsc --noEmit` tanto em `apps/api` quanto em `apps/web` para certificar que nenhum erro de TypeScript foi introduzido.
5. **Preservação de Integridade de Dados Multi-Tenant**:
   - Nunca execute queries no Prisma sem isolamento por `tenantId`, garantindo que nenhum estabelecimento acesse dados de outro.
