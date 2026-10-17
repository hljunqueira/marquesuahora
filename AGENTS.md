# MarqueSuaHora — Memória Operacional e Guia de Contexto para Agentes

Bem-vindo ao projeto **MarqueSuaHora**! Este arquivo fornece o contexto completo, histórico consolidado, decisões arquiteturais e instruções para qualquer agente de IA que iniciar uma conversa ou tarefa no repositório.

---

## 1. O que é o MarqueSuaHora?
SaaS multi-tenant focado em estabelecimentos de beleza e estética (salões, barbearias, clínicas de estética, studios de lash/nail e manicures).

### Pilares Centrais:
- **Vitrine Pública & Link na Bio (`/[slug]`)**: Agendamento em 4 passos rápidos pelo celular, sem download de apps.
- **Proteção Anti-Falta (Sinal PIX Direto)**: Combate no-shows exigindo sinal antecipado (Valor Fixo ou Percentual), com regra independente e flexível para clientes novas (1ª vez no salão). O valor vai 100% direto para a conta do estabelecimento, sem retenção da plataforma.
- **Agenda Semanal Compacta**: Visualização em blocos de 30min, horários livres clicáveis com pré-seleção automática e modal rica de detalhes (histórico do cliente, fotos antes/depois, anamnese e botões rápidos de WhatsApp, remarcação e cancelamento).
- **Copiloto IA de Comandos Rápidos e Voz**: Agendamentos, bloqueios e despesas registrados em linguagem natural via Typesafe JEV.
- **Central de Suporte IA de Alta Disponibilidade**: Atendimento interativo com IA que tira dúvidas da plataforma e escala erros técnicos com protocolo e SLA de 24h. Possui motor local integrado de contingência (alta disponibilidade / zero downtime).

---

## 2. Mapa Rápido da Documentação

Consulte os arquivos na pasta `docs/` para se aprofundar:
- [`docs/PRD.md`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/docs/PRD.md): Product Requirements Document completo, personas e requisitos de cada módulo.
- [`docs/INFRAESTRUTURA.md`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/docs/INFRAESTRUTURA.md): Portas locais (`3000` para Web, `3333` para API), VPS Ubuntu, Docker, PostgreSQL 16, Redis 7, Evolution API (WhatsApp) e Asaas.
- [`docs/ESPECIFICACOES_TECNICAS.md`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/docs/ESPECIFICACOES_TECNICAS.md): Monorepo pnpm, schemas Zod, DTOs e boas práticas de código.
- [`docs/HISTORICO_IMPLEMENTACOES.md`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/docs/HISTORICO_IMPLEMENTACOES.md): Histórico detalhado de todas as implementações e refatorações realizadas.

---

## 3. Skills Disponíveis no Projeto

Ao trabalhar neste repositório, utilize as skills dedicadas em `.agents/skills/`:
- **`marquesuahora-guide`**: Guia mestre de navegação e orquestração.
- **`marquesuahora-prd`**: Regras de negócio, cálculo de sinal anti-falta e fluxos de agendamento.
- **`marquesuahora-infra`**: Infraestrutura, deploy, portas, variáveis de ambiente e banco de dados.
- **`gravitas`**: Metodologia rigorosa para implementar features complexas, refatorações e correções.
- **`motion`**: Animações fluidas em `motion/react` com MotionScore alto.

---

## 4. As Regras Inegociáveis do Repositório

1. **Zero Ícones Decorativos / Zero Emojis Ornamentais**:
   - Proibido usar emojis como enfeites visuais (`💡`, `✨`, `🔥`, etc.) nas interfaces, toasts, botões ou cards. Use tipografia sóbria, hierarquia de pesos e ícones funcionais.
2. **TypeScript Estrito com 0 Erros de Compilação**:
   - Sempre rode `npx tsc --noEmit` em `apps/api` e `apps/web` antes de concluir qualquer tarefa.
3. **Alta Disponibilidade no Suporte**:
   - A IA do chat de suporte ao assinante (`/dashboard/suporte`) nunca pode ficar em silêncio; em caso de falha de conexão com a API externa ou backend, o motor local integrado assume instantaneamente.
4. **Isolamento Multi-Tenant**:
   - Sempre isole consultas no banco pelo `tenantId`.
