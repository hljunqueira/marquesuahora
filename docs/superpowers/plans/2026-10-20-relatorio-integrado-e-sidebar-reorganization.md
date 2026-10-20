# Plano de Implementação — Central de Relatórios 360° (Exclusivo Equipe Pro) & Sidebar Retrátil

> **Para executores agenticos:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa por tarefa. As etapas utilizam sintaxe de checkbox (`- [ ]`) para rastreamento de progresso.

**Objetivo:** Implementar a Central de Relatórios 360° do MarqueSuaHora como **recurso exclusivo do Plano Equipe Pro** (com bloqueio elegante de upgrade para planos Solo/Free), inteligência de ponta a ponta (ranking de quem mais agendou, maiores faturamentos/LTV, serviços, financeiro, equipe, produtos, cursos e reputação), gráficos modernos e interativos em SVG com Motion/React, exportação exclusiva em **PDF Executivo de Alta Resolução** (layout print A4 otimizado), além de reorganizar a Sidebar em 4 categorias e adicionar botão sutil de colapsar/expandir com persistência em `localStorage`.

**Arquitetura:**
- **Proteção e Gate de Plano (Equipe Pro)**:
  - Backend: Guard nos endpoints `/reports/*` verificando se o `tenant.plan.code === 'EQUIPE_PRO'` (ou `VIP_AI` ou `billingStatus === 'GRATUITY'`). Caso contrário, retorna HTTP 403 (`PLAN_REQUIRED`).
  - Frontend: Tela de Paywall/Upsell executiva (UX Pro Max) em `/dashboard/relatorios` para salões em planos inferiores, com prévia dos recursos e botão de upgrade direto para o Equipe Pro.
  - Sidebar: Badge discreto `PRO` no item "Relatórios & BI".
- **Revisão Integral de Dados (Backend Prisma)**: Módulo dedicado `/reports` (`reports.routes.ts`) no Fastify aproveitando os modelos existentes do Prisma (`Client`, `Schedule`, `Service`, `Professional`, `FinancialEntry`, `Product`, `Course`, `CreditAccount`), sempre com escopo restrito a `request.user.tenantId`.
- **Design & Gráficos Modernos (UX Pro Max Frontend)**:
  - Componentes de gráficos vetoriais nativos em SVG (`ReportBarChart`, `ReportDonutChart`, `ReportTrendChart`) animados com `motion/react`, com tooltips interativos, legendas dinâmicas e sem bibliotecas pesadas externas que travam a renderização de PDF ou SSR.
  - Hub de Relatórios `/dashboard/relatorios` com Abas Temáticas:
    1. **Clientes & Fidelidade**: Ranking detalhado de frequência ("quem mais agendou"), maiores gastadores (LTV), ticket médio, status (VIP, Frequente, Nova, Em Risco) e botão WhatsApp.
    2. **Atendimentos & Ocupação**: Picos por dia da semana, horários mais movimentados, canais de entrada (Vitrine, Manual, Copiloto IA), no-shows e cancelamentos.
    3. **Procedimentos & Serviços**: Serviços mais realizados em quantidade e mais rentáveis em R$, com a cor real do serviço.
    4. **Financeiro & Caixa**: Entradas por método (PIX, Cartão, Dinheiro), sinais anti-falta retidos, despesas e crediário/fiado.
    5. **Equipe & Profissionais**: Faturamento gerado, comissões calculadas e taxa de retenção por profissional.
    6. **Produtos & Estoque**: Venda de cosméticos no balcão e alertas de estoque mínimo.
    7. **Cursos & Alunas**: Matrículas, receita educacional e certificados emitidos.
    8. **Reputação & NPS**: Média de avaliação (1 a 5 estrelas) e satisfação.
- **Exportação Somente em PDF**:
  - Botão de exportação exclusivo "Gerar PDF Executivo".
  - Componente de template de impressão A4 formal (`ReportPdfPrintTemplate.tsx`) otimizado com regras `@media print`, logotipo do estabelecimento, cabeçalho institucional, sumário de KPIs em grade, gráficos e tabelas paginadas sem cortes feios.
- **Sidebar Reorganizada & Retrátil**:
  - Correção da seleção dupla simultânea (`/dashboard` vs `/dashboard/agenda`).
  - Agrupamento em 4 categorias: ATENDIMENTO, GESTÃO & CLIENTES, NEGÓCIO & EQUIPE, SISTEMA.
  - Botão sutil de alternância com ícones `PanelLeftClose` e `PanelLeftOpen`, transição fluida entre 214px e 68px (modo compacto com ícones e tooltips nativos) e persistência em `localStorage`.

**Tech Stack:** Next.js 14, Fastify 4, Prisma ORM (PostgreSQL 16), Lucide Icons, Tailwind CSS, Motion/React, CSS Paged Media `@media print`.

---

## Global Constraints
- **Exclusividade Comercial**: Módulo de Relatórios liberado exclusivamente para assinantes do Plano `EQUIPE_PRO` (ou Cortesia VIP `GRATUITY`).
- Zero ícones decorativos ou emojis ornamentais nas interfaces. Tipografia e pesos sóbrios, ícones puramente funcionais.
- TypeScript estrito com 0 erros de compilação em `apps/api` e `apps/web`.
- Isolamento multi-tenant absoluto via `request.user.tenantId`.
- Exportação estritamente em PDF (sem CSV ou formatos secundários).
- Gráficos nativos em SVG animados, com fidelidade 100% vetorial no PDF gerado.

## Review Focus
1. Validação correta do plano `EQUIPE_PRO` tanto no backend quanto no frontend sem permitir bypass de rota.
2. Agregações por período respeitando fusos horários locais de Brasília (`YYYY-MM-DD`).
3. Faturamento somando apenas agendamentos não cancelados (`status !== 'CANCELLED'`).
4. Layout de impressão `@media print` sem barras de scroll, botões de ação ou menus laterais vazando no PDF.
5. Animação de colapso da sidebar fluida sem repintura desnecessária da grade semanal da Agenda.

---

### Tarefa 1: Backend — Gate de Plano `EQUIPE_PRO` & Módulo de Relatórios (`/reports`)

**Arquivos:**
- Criar: `apps/api/src/modules/reports/reports.routes.ts`
- Modificar: `apps/api/src/app.ts`

**Etapas:**
- [ ] Implementar middleware guard `verifyEquipeProPlan`:
  - Consulta o plano do tenant via Prisma (`tenant.plan`).
  - Permite acesso se `tenant.billingStatus === 'GRATUITY'`, `tenant.plan.code === 'EQUIPE_PRO'`, ou `tenant.plan.code === 'VIP_AI'`.
  - Bloqueia com HTTP 403 e payload `{ error: 'PLAN_REQUIRED', plan: 'EQUIPE_PRO', message: 'A Central de Relatórios e Inteligência 360° é exclusiva do Plano Equipe Pro.' }`.
- [ ] Criar validação Zod de datas (`startDate`, `endDate`, `professionalId`).
- [ ] Endpoint `GET /reports/overview`:
  - Receita bruta consolidada (Serviços + Produtos + Cursos).
  - Total de agendamentos realizados, concluídos, cancelados e faltas (no-show).
  - Ticket médio geral por atendimento.
  - Total de clientes ativas no período e média de avaliação NPS.
- [ ] Endpoint `GET /reports/clients`:
  - Agrupamento no Prisma/SQL por `clientId`.
  - **Ranking de quem mais agendou**: Ordenação decrescente por quantidade de agendamentos.
  - **Ranking de quem mais gastou (LTV)**: Ordenação decrescente por valor total gasto.
  - Ticket médio por cliente (`Total Gasto / Total Visitas`).
  - Data do último atendimento e contagem de faltas (`noShowCount`).
  - Classificação automática de fidelidade: `VIP` (>= 3 visitas), `Frequente` (2 visitas), `Nova` (1 visita), `Em Risco` (> 35 dias sem agendar).
- [ ] Endpoint `GET /reports/schedules`:
  - Ocupação por dia da semana (Segunda a Domingo) e por faixa de horário (Manhã, Tarde, Noite).
  - Taxa de no-shows e cancelamentos.
  - Origem do agendamento (`BookingSource`: ONLINE, MANUAL_RECEPTION, WHATSAPP_AI).
- [ ] Endpoint `GET /reports/services`:
  - Ranking de procedimentos em volume e em faturamento.
  - Duração média real e cor configurada do procedimento.
- [ ] Endpoint `GET /reports/financial`:
  - Total recebido por método (`PIX`, `CREDIT_CARD`, `DEBIT_CARD`, `CASH`).
  - Total de sinais antecipados PIX retidos anti-falta.
  - Despesas cadastradas e faturamento líquido.
  - Saldo devedor de crediário/fiado (`CreditAccount`).
- [ ] Endpoint `GET /reports/team`:
  - Atendimentos, faturamento gerado, comissão calculada e taxa de conclusão por profissional.
- [ ] Endpoint `GET /reports/products`:
  - Cosméticos mais vendidos no balcão e produtos com estoque abaixo do mínimo.
- [ ] Endpoint `GET /reports/courses`:
  - Alunas matriculadas, receita de cursos e certificados emitidos.
- [ ] Endpoint `GET /reports/reputation`:
  - Média de estrelas NPS e comentários de satisfação pós-atendimento.
- [ ] Registrar `reportsRoutes` no `app.ts` sob `/reports` com autenticação JWT.

---

### Tarefa 2: Frontend — Gráficos Modernos em SVG Nativo (UX Pro Max)

**Arquivos:**
- Criar: `apps/web/src/components/reports/charts/ReportBarChart.tsx`
- Criar: `apps/web/src/components/reports/charts/ReportDonutChart.tsx`
- Criar: `apps/web/src/components/reports/charts/ReportTrendChart.tsx`

**Etapas:**
- [ ] Desenvolver `ReportBarChart.tsx`:
  - Gráfico de barras verticais e horizontais em SVG com alturas dinâmicas proporcionais.
  - Animação de entrada suave via `motion/react`.
  - Tooltips suspensos com detalhes do valor monetário e contagem ao passar o cursor.
  - 100% vetorial e perfeitamente renderizável no PDF.
- [ ] Desenvolver `ReportDonutChart.tsx`:
  - Gráfico Donut/Pizza em SVG com arcos calculados trigonometricamente (`strokeDasharray` e `strokeDashoffset`).
  - Legenda interativa ao lado destacando porcentagem e total em R$.
- [ ] Desenvolver `ReportTrendChart.tsx`:
  - Gráfico de linha/área com gradiente suave demonstrando a evolução de faturamento e atendimentos ao longo do período.

---

### Tarefa 3: Frontend — Exportação Exclusiva em PDF Executivo & Tela de Paywall

**Arquivos:**
- Criar: `apps/web/src/components/reports/ReportPdfExportButton.tsx`
- Criar: `apps/web/src/components/reports/ReportPrintView.tsx`
- Criar: `apps/web/src/components/reports/ReportPaywallUpgrade.tsx`

**Etapas:**
- [ ] Criar `ReportPaywallUpgrade.tsx`:
  - Tela de upgrade state-of-the-art para salões em plano Free ou Solo.
  - Título sóbrio: "Inteligência 360° & Relatórios — Recurso Exclusivo Equipe Pro".
  - Demonstração visual com mockups sóbrios do ranking de clientes, gráficos de faturamento e PDF executivo.
  - Botão de ação: "Fazer Upgrade para Equipe Pro" abrindo o modal de contratação ou redirecionando para `/dashboard/planos`.
- [ ] Criar `ReportPrintView.tsx`:
  - Template A4 dedicado para impressão com estilos `@media print`.
  - Cabeçalho formal: Logotipo do salão, Nome da Empresa, CNPJ/Telefone, Período de Análise e Data de Emissão.
  - Grade executiva com os 4 KPIs principais (Faturamento, Atendimentos, Ticket Médio, Clientes Únicas).
  - Tabela formatada das Top Clientes (com destaque para as clientes que mais agendaram).
  - Resumo de Serviços mais rentáveis e Desempenho da Equipe com comissões.
  - Ocupação de horários e sinais PIX retidos.
  - Rodapé institucional formal com numeração de página ("Página 1 de 1").
  - Ocultar automaticamente botões de navegação, sidebars, filtros e cabeçalhos web na impressão.
- [ ] Criar `ReportPdfExportButton.tsx`:
  - Botão de destaque estilizado: ícone `FileText`, texto "Exportar Relatório em PDF".
  - Aciona o gerador de PDF vetorial nativo com configurações de página A4 portrait.

---

### Tarefa 4: Frontend — Abas Especializadas dos Relatórios (`/dashboard/relatorios`)

**Arquivos:**
- Criar: `apps/web/src/app/dashboard/relatorios/page.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportClientsTab.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportSchedulesTab.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportServicesTab.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportFinancialTab.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportTeamTab.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportProductsTab.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportCoursesTab.tsx`
- Criar: `apps/web/src/components/reports/tabs/ReportReputationTab.tsx`

**Etapas:**
- [ ] Desenvolver `ReportClientsTab.tsx`:
  - Seletor de visualização: "Quem mais agendou (Frequência)" vs "Quem mais gastou (LTV)".
  - Tabela rica com: Posição (#1, #2...), Nome da cliente, Telefone, Qtd. Atendimentos, Total Gasto (R$), Ticket Médio, Última Visita, Pill de Fidelidade (VIP, Frequente, Nova, Em Risco).
  - Botão de WhatsApp direto com mensagem personalizada de agradecimento ou resgate.
- [ ] Desenvolver `ReportSchedulesTab.tsx`:
  - Ocupação da semana com `ReportBarChart` dos dias de maior movimento e horários de pico.
  - Gráfico Donut de canais de agendamento (Vitrine Online, Manual, Copiloto IA).
- [ ] Desenvolver `ReportServicesTab.tsx`:
  - Gráfico de barras horizontais dos serviços mais procurados, exibindo a cor autêntica configurada em cada procedimento.
- [ ] Desenvolver `ReportFinancialTab.tsx`:
  - Comparativo de entradas vs despesas, métodos de pagamento em Donut e valor de sinais PIX retidos.
- [ ] Desenvolver `ReportTeamTab.tsx`:
  - Tabela com faturamento, comissões a pagar e volume atendido por profissional.
- [ ] Desenvolver abas de Produtos, Cursos e Reputação/NPS.
- [ ] Montar a página principal `/dashboard/relatorios/page.tsx` verificando permissão de plano (se não for Equipe Pro, exibe `ReportPaywallUpgrade`), integrando os filtros de período, KPIs de topo, abas e o botão de exportar PDF.

---

### Tarefa 5: Sidebar — Reorganização em Grupos & Correção da Seleção Dupla

**Arquivos:**
- Modificar: `apps/web/src/app/dashboard/layout.tsx`

**Etapas:**
- [ ] Corrigir a lógica de seleção de rota na linha 368 de `layout.tsx`:
  - `Dashboard`: ativo estritamente em `pathname === '/dashboard'`.
  - `Agenda`: ativo estritamente em `pathname === '/dashboard/agenda'`.
- [ ] Agrupar a navegação em 4 seções com separadores discretos:
  - **ATENDIMENTO**: Dashboard (`/dashboard`), Agenda (`/dashboard/agenda`), Agendamentos (`/dashboard/agendamentos`).
  - **GESTÃO & CLIENTES**: Clientes & CRM (`/dashboard/clientes`), **Relatórios & BI** (`/dashboard/relatorios`) com badge `PRO`, Serviços (`/dashboard/servicos`), Produtos & Estoque (`/dashboard/produtos`), Galeria & Fotos (`/dashboard/galeria`).
  - **NEGÓCIO & EQUIPE**: Financeiro & Caixa (`/dashboard/financeiro`), Equipe & Profissionais (`/dashboard/equipe`), Cursos & Alunas (`/dashboard/cursos`).
  - **SISTEMA**: Configurações (`/dashboard/configuracoes`), Planos & Assinatura (`/dashboard/planos`), Suporte & Ajuda (`/dashboard/suporte`).
- [ ] Adicionar subtítulos de categorias sóbrios (`text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 pt-3 pb-1`).

---

### Tarefa 6: Sidebar Retrátil / Colapsável com Botão Sutil

**Arquivos:**
- Modificar: `apps/web/src/app/dashboard/layout.tsx`

**Etapas:**
- [ ] Adicionar estado `isSidebarCollapsed` inicializado a partir de `localStorage.getItem('marquesuahora_sidebar_collapsed') === 'true'`.
- [ ] Posicionar botão sutil de colapsar no cabeçalho da sidebar desktop com ícone `PanelLeftClose` (quando expandido) e `PanelLeftOpen` (quando recolhido).
- [ ] No modo expandido (`w-[214px]`): exibição normal completa com badge `PRO`.
- [ ] No modo recolhido (`w-[68px]`):
  - Avatar compacto com iniciais ou logo centralizado.
  - Subtítulos de categoria ocultados.
  - Itens de menu em ícones centralizados (`justify-center`) com bordas suaves de hover e tooltips nativos (`title={item.label}`).
- [ ] Transição fluida de largura via CSS (`transition-all duration-200 ease-in-out`).

---

### Tarefa 7: Validação e Deploy em Produção

**Arquivos:**
- Executar validações nos pacotes `apps/api` e `apps/web`.

**Etapas:**
- [ ] Rodar `pnpm --filter @marquesuahora/api exec tsc --noEmit`.
- [ ] Executar `./deploy.ps1 -SkipTypeCheck` para aplicar as atualizações na VPS de produção.
- [ ] Verificar status HTTP 200 nas rotas do frontend e backend.
