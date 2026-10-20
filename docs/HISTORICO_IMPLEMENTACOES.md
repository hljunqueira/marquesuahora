# MarqueSuaHora — Histórico Completo de Implementações e Evolução do Sistema

Este documento registra detalhadamente todas as entregas, decisões de arquitetura, modificações em banco de dados, rotas de API, telas frontend e integrações realizadas no projeto **MarqueSuaHora**.

---

## 1. Resumo Executivo das Entregas

Durante as sessões de desenvolvimento, o sistema foi elevado a nível de produto SaaS profissional de alta disponibilidade, focado no nicho de beleza e bem-estar (salões de beleza, barbearias, clínicas de estética, studios de lash/nail e manicures).

### Principais Pilares Entregues:
1. **Agenda Semanal Compacta com Horários Livres Clicáveis**: visualização ágil em grade semanal de 30 em 30 minutos, filtros por profissional, destaque de slots vagos e abertura direta de novo agendamento com data/hora pré-selecionadas.
2. **Modal Rica de Detalhes de Atendimentos**: histórico de visitas do cliente, discriminação de valor total e sinal retido, upload e exibição de fotos antes/depois do procedimento, atalho direto para Ficha de Anamnese Digital e ações rápidas (WhatsApp, Reagendamento, Cancelamento e Conclusão com baixa financeira).
3. **Proteção Anti-Falta (Sinal PIX Direto) com Flexibilidade Total para 1ª Cliente**:
   - Persistência no banco (`Tenant.depositFirstBookingType` e `Tenant.depositFirstBookingValue`), eliminando valores *hardcoded*.
   - Escolha entre **Valor Fixo (R$)** e **Percentual (%)** exclusivo para clientes sem histórico anterior (`previousBookingsCount === 0`).
   - Vitrine pública com cálculo dinâmico da cobrança do sinal no Passo 4 (Resumo) e acionamento automático do WhatsApp com comprovante.
4. **Copiloto IA de Comandos Rápidos e Voz na Agenda**:
   - Registro de agendamentos, despesas de balcão e bloqueios de agenda por comando de voz ou texto natural via Typesafe JEV + Fastify.
5. **Central de Suporte com IA de Alta Disponibilidade**:
   - Diagnóstico e correção de falha no frontend (descarte silencioso de erros e dependência estrita de conexão com backend).
   - Motor de inteligência local integrado com base de conhecimento completa da plataforma (`generateFrontendSmartReply` + `detectIsTechnicalError`).
   - Redução de timeout do OpenRouter para 4,5s e contingência imediata garantindo que a IA **sempre responda 100% das vezes**.
6. **Diretriz Estrita de Design**: Zero ícones decorativos / sem emojis ornamentais, preservando tipografia de alto padrão e microinterações polidas.

---

## 2. Detalhamento Técnico das Implementações

### A.0. Relatório Integrado 360° com BI, Exportação Exclusiva em PDF e Sidebar Reorganizado
- **Arquivos Backend**:
  - `apps/api/src/modules/reports/reports.routes.ts`
  - `apps/api/src/app.ts` (registro da rota `/reports`)
- **Arquivos Frontend**:
  - `apps/web/src/app/dashboard/relatorios/page.tsx` (Hub principal de relatórios & BI)
  - `apps/web/src/components/reports/ReportPeriodSelector.tsx` (Filtro por períodos e datas customizadas)
  - `apps/web/src/components/reports/ReportPdfExportButton.tsx` (Acionador de exportação PDF via `@media print`)
  - `apps/web/src/components/reports/ReportPaywallUpgrade.tsx` (Tela de upgrade para planos Solo/Free)
  - `apps/web/src/components/reports/ReportPrintView.tsx` (Layout vetorial A4 executivo para impressão direta)
  - `apps/web/src/components/reports/charts/ReportBarChart.tsx` (Gráficos verticais e horizontais em SVG com animação)
  - `apps/web/src/components/reports/charts/ReportDonutChart.tsx` (Gráfico de rosca com trigometria SVG)
  - `apps/web/src/components/reports/charts/ReportTrendChart.tsx` (Gráfico de área e tendência temporal)
  - `apps/web/src/components/reports/tabs/ReportClientsTab.tsx` (Ranking por agendamentos e LTV, badges de fidelidade e WhatsApp)
  - `apps/web/src/components/reports/tabs/ReportSchedulesTab.tsx` (Dias de pico, horários e canais de origem)
  - `apps/web/src/components/reports/tabs/ReportServicesTab.tsx` (Volume, faturamento e horas por procedimento)
  - `apps/web/src/components/reports/tabs/ReportFinancialTab.tsx` (Faturamento bruto, meios de pagamento e sinal PIX)
  - `apps/web/src/components/reports/tabs/ReportTeamTab.tsx` (Produção, comissões a pagar e retenção do espaço)
  - `apps/web/src/components/reports/tabs/ReportProductsTab.tsx` (Revenda, avaliação de estoque e alertas de reposição)
  - `apps/web/src/components/reports/tabs/ReportCoursesTab.tsx` (Matrículas, conclusões e engajamento)
  - `apps/web/src/components/reports/tabs/ReportReputationTab.tsx` (NPS com faixas de satisfação e comentários)
  - `apps/web/src/app/dashboard/layout.tsx` (Reorganização em 4 grupos, botão sutil de recolher e correção de destaque duplo)
- **Regras de Negócio e Destaques**:
  - **Exclusividade Equipe Pro**: Acesso restrito a assinantes do plano `EQUIPE_PRO` ou cortesia VIP, com paywall executivo de conversão para os demais planos.
  - **Exportação Exclusiva em PDF**: Vetorial, sem distorção e sem dependências pesadas de terceiros (usando `@media print` A4 nativo).
  - **Reorganização do Sidebar**: 4 categorias semânticas (ATENDIMENTO, GESTÃO & CLIENTES, NEGÓCIO & EQUIPE, SISTEMA).
  - **Eliminação do Bug de Destaque Duplo**: `pathname === '/dashboard'` corrigido para correspondência exata, separando de `/dashboard/agenda`.
  - **Sidebar Recolhível**: Botão discreto `PanelLeftClose`/`PanelLeftOpen` com persistência em `localStorage` e transição fluida.
  - **Diretriz de Design**: Zero ícones decorativos e sem emojis ornamentais, com tipografia sóbria e ícones 100% funcionais.

### A. Agenda Semanal Compacta & Horários Livres
- **Arquivos**:
  - `apps/web/src/components/agenda/AgendaWeeklyGrid.tsx`
  - `apps/web/src/components/agenda/AgendaAppointmentDetailsModal.tsx`
  - `apps/web/src/components/agenda/AgendaAppointmentModal.tsx`
  - `apps/web/src/components/agenda/types.ts`
  - `apps/web/src/app/dashboard/agendamentos/page.tsx`
- **Funcionalidades**:
  - Grid semanal com navegação por semanas, colunas dos 7 dias e faixas horárias de 08:00 às 20:00 (intervalos de 30 minutos).
  - Slots ocupados exibem: nome do cliente, serviço, profissional parceiro, status do agendamento (Confirmado, Pendente, etc.) e badge de sinal pago quando houver.
  - Slots vazios calculados comparando a escala do profissional (`scheduleConfig`) com os agendamentos e bloqueios existentes.
  - Ao clicar em um horário vago, abre a modal de novo agendamento com data, horário e profissional pré-selecionados.
  - **Modal de Detalhes Completa**:
    - Seção de histórico: total de visitas, faltas (no-show) e valor vitalício investido (LTV).
    - Seção financeira: Valor do Serviço, Sinal PIX Pago e Saldo Restante a Cobrar no Balcão.
    - Seção de Procedimento: Fotos de Antes/Depois com upload direto e status da Ficha de Anamnese Digital.
    - Barra de ações: Botão WhatsApp com mensagem pré-formatada, Reagendamento com seleção de nova data, Cancelamento com motivo e Concluir Atendimento com geração automática de lançamento financeiro.

---

### B. Proteção Anti-Falta com Sinal Flexível para 1ª Cliente
- **Motivação**: O salão precisava de liberdade total para configurar uma regra específica para novos clientes (ex: cobrar 50% de sinal para quem nunca foi ao salão, ou cobrar R$ 20,00 fixos), sem defaults engessados no código.
- **Modificações no Banco de Dados (`schema.prisma`)**:
  ```prisma
  model Tenant {
    // ...
    depositFirstBookingType  String   @default("PERCENTAGE") // "PERCENTAGE" ou "FIXED"
    depositFirstBookingValue Decimal  @default(50.0) @db.Decimal(10, 2)
  }
  ```
- **Shared Schema (`packages/shared/src/schemas/tenant.schema.ts`)**:
  - Adicionadas validações Zod no `updateTenantSettingsSchema`:
    - `depositFirstBookingType`: enum `['PERCENTAGE', 'FIXED']`.
    - `depositFirstBookingValue`: número decimal positivo maior que zero.
- **Backend API**:
  - `apps/api/src/modules/tenants/tenants.routes.ts`: `PUT /tenants/me/settings` persistindo ambos os campos no PostgreSQL.
  - `apps/api/src/modules/public/public.routes.ts`: `GET /public/showcase/:slug` expondo `depositFirstBookingType` e `depositFirstBookingValue` na vitrine pública.
  - `apps/api/src/modules/schedules/booking.service.ts`:
    - Busca a contagem de agendamentos anteriores do cliente pelo telefone:
      `previousBookingsCount = await prisma.schedule.count({ where: { tenantId, client: { phone: clientData.phone } } })`
    - Se `previousBookingsCount === 0` e `depositRequireFirstBooking === true`:
      Calcula o sinal com base no tipo (`FIXED` vs `PERCENTAGE`) e no valor configurado no tenant.
    - Se for cliente recorrente (`previousBookingsCount > 0`):
      Aplica a regra padrão geral do salão (`depositType` e `depositValue`).
- **Frontend Dashboard (`apps/web/src/components/settings/SettingsShieldTab.tsx`)**:
  - Switch independente para a regra da 1ª cliente.
  - Seletor de modalidade: **Porcentagem (%)** ou **Valor Fixo (R$)**.
  - Input dinâmico com prefixo `R$` ou sufixo `%`.
  - Formulário completo para chave PIX (Tipo, Chave e Titular) e aviso de que a plataforma não retém nenhuma taxa sobre o valor recebido.
- **Frontend Vitrine (`apps/web/src/components/showcase/BookingWizard.tsx`)**:
  - No Passo 4 (Resumo e Confirmação), o wizard exibe com precisão o valor do sinal gerado pelo backend (`createdBooking.depositAmount`), a chave PIX para cópia instantânea e o botão para enviar o comprovante via WhatsApp.

---

### C. Copiloto IA de Comandos Rápidos e Voz na Agenda
- **Arquivos**:
  - `apps/api/src/modules/ai/quick-command.routes.ts`
  - `apps/api/src/modules/ai/quick-command.service.ts`
  - `apps/web/src/components/dashboard/AiVoiceCommandBar.tsx`
- **Funcionalidades**:
  - Barra de comando rápido e botão de microfone na agenda.
  - Reconhecimento de áudio via Web Speech API (`webkitSpeechRecognition`) com fallback para digitação direta.
  - Parser semântico no backend via Typesafe JEV + heurísticas locais:
    - *Agendamento*: "Agendar corte com Rodrigo amanhã às 15h para Lucas" -> identifica cliente, profissional, serviço, data e hora.
    - *Bloqueio*: "Bloquear agenda do Marcos hoje das 12h às 13h para almoço" -> gera bloqueio de expediente.
    - *Despesa*: "Registrar gasto de 85 reais com produtos de limpeza" -> lança saída no módulo financeiro.
    - *Fiado/Crediário*: "Anotar 120 reais no fiado da Maria" -> registra débito na conta-corrente da cliente.

---

### D. Central de Suporte com IA de Alta Disponibilidade
- **Arquivos**:
  - `apps/api/src/modules/support/support.routes.ts`
  - `apps/api/src/modules/support/support.ai.service.ts`
  - `apps/web/src/app/dashboard/suporte/page.tsx`
- **Causa Raiz da Falha Diagnosticada**:
  1. No frontend, qualquer erro de conexão ou timeout caía no `catch (err)` que apenas chamava `console.warn`, deixando o chat em silêncio e o usuário sem resposta.
  2. No backend, a rota `POST /support/ai-chat` exigia estritamente `request.user.tenantId`. Usuários com `SUPER_ADMIN` ou tokens antigos recebiam erro `403 Proibido`.
  3. A consulta ao OpenRouter aguardava até 12s, estourando o timeout de 10s do frontend.
  4. Falhas temporárias de conexão com o PostgreSQL causavam erro 500 antes de entregar a resposta do assistente.
- **Soluções Implementadas**:
  - **Frontend Resiliente**:
    - Criada a função `generateFrontendSmartReply` diretamente no frontend, contendo a base completa de conhecimento (Sinal PIX, Vitrine, Agenda, Serviços, Equipe, Comissões, WhatsApp, Planos e Relato de Bugs).
    - Timeout de 7s configurado no `api.post('/support/ai-chat')`.
    - No bloco `catch (err)`, o motor local é acionado de imediato, garantindo que o assistente **sempre responda 100% das vezes**.
    - No `useEffect`, recupera o nome salvo do contato e inicializa o chat com uma mensagem de abertura acolhedora.
  - **Backend Blindado**:
    - Rota `POST /support/ai-chat` busca o tenant associado ao usuário via `{ users: { some: { id: request.user.sub } } }`.
    - Try/catch global protegendo contra indisponibilidade de banco de dados.
    - Timeout da chamada ao OpenRouter reduzido para 4,5s para priorizar velocidade.
    - Validação de existência do tenant antes de persistir tickets no banco para evitar violações de chave estrangeira.

---

### E. Atendente IA Autônoma no WhatsApp (Áudio Whisper, Visão Multimodal & Agenda ao Vivo)
- **Arquivos Criados/Modificados**:
  - `apps/api/src/modules/automation/audio-transcription.service.ts`: Transcrição de mensagens de voz (`audioMessage`/PTT) via OpenAI Whisper Large v3 Turbo pelo OpenRouter.
  - `apps/api/src/modules/automation/vision.service.ts`: Análise de imagens via Gemini 2.0 Flash (detecção de comprovantes bancários de PIX com extração de valor e titular, e análise de referências de cortes, unhas e penteados).
  - `apps/api/src/modules/automation/conversation-memory.service.ts`: Memória conversacional de múltiplos turnos no Redis com TTL de 30 minutos e fallback resiliente em memória.
  - `apps/api/src/modules/automation/humanizer-guardrail.ts`: Filtro estrito que remove clichês de IA (`Certamente!`, `Com certeza!`, `Espero ter ajudado!`, travessões longos `—` e emojis repetidos).
  - `apps/api/src/modules/automation/ai-assistant.service.ts`: Motor inteligente que consulta vagas reais em tempo real via `AvailabilityService`, calcula sinal anti-falta (inclusive para 1ª cliente), gera link de agendamento e faz transbordo cordial quando solicitado atendimento humano.
  - `apps/api/src/modules/automation/webhook.routes.ts`: Integração ponta a ponta do fluxo de mídia e texto.
  - `apps/api/test/ai-assistant.spec.ts`: Suíte de testes com Vitest cobrindo guardrails, memória de turnos e consulta de disponibilidade.
  - `apps/web/src/components/settings/SettingsWhatsappTab.tsx`: Painel de controle no dashboard do assinante com visualização dos 4 superpoderes ativos e formulário para salvar instruções personalizadas da recepção.

---

### F. Master Suite: Saneamento, Checkout, Agenda Compacta, Cursos & Certificados, PDV e DRE Executivo
- **Fase 1: Saneamento de Mocks, Defaults & Diálogos Nativos**:
  - `apps/web/src/components/ui/ConfirmModal.tsx` substituiu todos os `window.confirm` e `window.alert` nativos do sistema.
  - Removidos objetos estáticos e defaults forçados de `produtos`, `equipe` e `servicos`.
  - Inserida a aba de Cuidados Pós-Atendimento dinâmicos em `configuracoes` e no Portal da Cliente.
  - Removidos todos os ícones decorativos ou ornamentais (`Sparkles`, `Bot`, etc.) e menções públicas ao plano VIP (apenas Equipe Pro para upgrades comerciais).
- **Fase 2: Motor de Comanda & Checkout de Atendimento**:
  - Endpoint `POST /schedules/:id/checkout` com split de pagamento, baixa de sinal PIX, consumo de produtos de bancada, rateio de comissão e lançamento financeiro.
  - Componente `AppointmentCheckoutModal.tsx` integrado à Agenda e Agendamentos.
- **Fase 3: UX Mobile da Agenda e Sessão Resiliente**:
  - Dashboard compacto com primeiro nome da cliente, horário e cores por procedimento.
  - Grade semanal completa e Visão Mensal (`viewMode: 'month'`) dedicada em `/dashboard/agenda`.
  - Token de 30 dias e refresh de 90 dias com interceptor contra instabilidades móveis.
- **Fase 4: Correção Anti-Fuso Horário & Cores de Procedimento & Foto do Profissional**:
  - Utilitário `formatLocalDateToYMD` corrigiu a distorção UTC-3 que deslocava horários para o dia seguinte.
  - Campo `color` em `Service` com paleta sóbria de 10 cores e prioridade visual nos cards.
  - Upload e preview de foto de perfil de profissional em `/dashboard/equipe`.
- **Fase 5: Módulo Unificado de Cursos & Alunas com Certificados Digitais**:
  - Modelagem Prisma com `certificateConfig` em `Course`, `certificateCode` único em `CourseAccess`.
  - Template em A4 paisagem com borda vetorial nobre em SVG, QR Code dinâmico e suporte a impressão nativa sem margens.
  - Página pública anti-fraude `/validar/[code]` e endpoint `GET /api/v1/public/certificates/:code`.
  - Unificação de `/dashboard/cursos` e `/dashboard/assinantes` com abas integradas e menu único `Cursos & Alunas`.
- **Fase 6: PDV de Balcão, Estoque com CMV, Comissões & DRE Executivo**:
  - Endpoint `POST /products/sell` com apuração automática de CMV e baixa atômica de estoque.
  - Modal `QuickSaleModal.tsx` para vendas rápidas em `/dashboard/produtos` e `/dashboard/financeiro`.
  - Liquidação de comissões com geração automática de `EXPENSE` no caixa.
  - Demonstrativo de Resultados do Exercício (DRE) com apuração de Receita Bruta, CMV, Margem de Contribuição, Comissões, Despesas Fixas e Lucro Líquido Real.
- **Fase 7: Verificação Estrita & Deploy em Produção na VPS**:
  - TypeScript estrito com **0 erros de compilação** em todos os pacotes.
  - Deploy efetuado na VPS Ubuntu (`23.80.89.116`) com sincronização do banco de dados via Prisma `db push`.
  - Aplicações ativas e validadas ao vivo: Web (HTTP 200) e API (HTTP 200).
- **Fase 8: Correção Crítica de Client-Side Exception no Dashboard (`/dashboard`)**:
  - **Diagnóstico da Causa Raiz**: O endpoint `GET /schedules` retorna payload paginado no formato `{ total, page, limit, totalPages, data: [...] }`. No frontend (`dashboard/page.tsx` e `agenda/page.tsx`), a atribuição `res.data?.schedules || res.data || []` atribuía o objeto não-iterável ao estado `appointments`, provocando falha em tempo de execução (`TypeError: appointments.filter is not a function` / `appointments is not iterable`), resultando no erro em tela `Application error: a client-side exception has occurred`.
  - **Solução Aplicada**: Normalização estrita da extração de dados com `Array.isArray()` e verificação em cascata (`res.data?.data || res.data?.schedules || (Array.isArray(res.data) ? res.data : [])`), com fallbacks defensivos adicionados também nos hooks `useMemo` (`dayAppointments`, `countByDate`) e na página `/dashboard/financeiro`.
  - **Validação e Deploy**: Compilação TypeScript com 0 erros e deploy com build de produção otimizado na VPS (HTTP 200 em `web` e `api`).
- **Fase 9: Reformulação da Agenda Mobile (Padrão App GuruAgenda)**:
  - **Cabeçalho de Dias da Semana (Top Day Bar)**: Linha com os 7 dias da semana (`SEG 19`, `TER 20`, ..., `DOM 25`) com círculo azul preenchido no dia selecionado e navegação instantânea por toque.
  - **Timeline Vertical Contínua de Horários (07:00 às 21:00)**: Posição absoluta em minutos com base no início e duração real dos atendimentos.
  - **Algoritmo de Colunas Concorrentes (Overlap)**: Atendimentos simultâneos e encaixes dividem a coluna proporcionalmente (50% de largura cada), permitindo visualizar procedimentos paralelos lado a lado.
  - **Estilização dos Cards & Bloqueios**: Preenchimento cromático hierárquico com base na cor do serviço e bloqueios com padrão listrado diagonal hachurado (`repeating-linear-gradient`).
  - **Botão Flutuante FAB (`+`) no Mobile**: Botão circular azul no canto inferior direito para abertura instantânea de novo agendamento.
  - **Barra de Navegação Inferior Fixa Mobile (Bottom Nav)**: Acesso direto a `Início`, `Agenda`, `Clientes` e `Menu`.
  - **Legenda de Status no Rodapé**: Indicadores sóbrios de `Pendente`, `Confirmado`, `Em Atendimento` e `Concluído`.

- **Fase 10: Dinamização Cromática Total da Identidade Visual do Estabelecimento**:
  - **Diagnóstico da Causa Raiz**: O schema do banco e DTOs atribuíam `#3B82F6` (azul) como cor padrão de serviços criados ou importados, e múltiplos componentes da Agenda e do Dashboard utilizavam classes Tailwind estáticas (`bg-blue-600`, `text-blue-600`, `border-blue-200`) em vez de herdar a cor primária configurada pelo usuário (`Tenant.primaryColor` / `var(--brand-primary)`).
  - **Cards de Atendimento na Grade (`AgendaWeeklyGrid.tsx`)**: Atualizada a função `getAppointmentColor` para ignorar o azul genérico de fábrica e herdar dinamicamente `tenantPrimaryColor` (com contraste automático YIQ para texto claro/escuro) sempre que o serviço não possuir uma cor personalizada intencional.
  - **Cabeçalho da Semana & Círculo do Dia Ativo**: O círculo indicador do dia selecionado (`SEG 19`) e o fundo suave da coluna ativa agora utilizam a cor primária dinâmica do salão (`tenantPrimaryColor` / `bg-tenant-light`).
  - **Dashboard Operacional (`dashboard/page.tsx`)**: O botão de "+ Novo Agendamento", as abas do seletor de dias da semana, a barra vertical esquerda dos cards, as bolinhas de procedimentos e os botões de "Cobrar" agora refletem 100% a cor configurada pelo usuário.
  - **Navegação Mobile e Botão Flutuante (FAB)**: O botão circular flutuante (`+`) na Agenda mobile e os itens ativos da barra inferior (Bottom Navigation) em `dashboard/layout.tsx` passam a sincronizar em tempo real com `subscriberPrimaryColor`.
  - **Catálogo de Serviços (`dashboard/servicos/page.tsx`)**: Novos procedimentos criados assumem a cor do estabelecimento por padrão, e a paleta do modal inclui a cor do tenant no topo.

- **Fase 11: Correção Definitiva do Fuso Horário Noturno (UTC-3 / Horário de Brasília) na Vitrine e no Painel**:
  - **Diagnóstico da Causa Raiz**:
    - No componente `BookingWizard.tsx` (Passo 2 - Escolha de Data e Horário), a geração dos 14 dias da barra superior utilizava `d.toISOString().split('T')[0]`, e a inicialização do estado `selectedDate` utilizava `new Date().toISOString().split('T')[0]`.
    - No Brasil (fuso UTC-3 / America/Sao_Paulo), após as 21:00 (como observado no relógio do usuário às 23:42 de 18/10), `toISOString()` projeta o horário para UTC (+3h), saltando para o dia civil seguinte (`2026-10-19`).
    - Como resultado, os botões visuais da vitrine exibiam a data civil local (`DOM 18 OUT`, `QUA 21 OUT`), mas gravavam no estado e enviavam para a API a data avançada em UTC (`2026-10-19` - Segunda-feira e `2026-10-22` - Quinta-feira). A API recebia Segunda/Quinta, dias em que o estabelecimento está fechado, e respondia com a mensagem incongruente "Fechado aos Segunda-feiras" (com o dia 18 selecionado) e "Fechado aos Quinta-feiras" (com o dia 21 selecionado).
  - **Solução Implementada**:
    - `BookingWizard.tsx`: Todos os `toISOString().split('T')[0]` foram substituídos por `formatLocalDateToYMD(d)`, com normalização segura para meio-dia local (`today.setHours(12, 0, 0, 0)`), impedindo qualquer salto ou variação de horário de verão. Adicionada garantia de que `selectedDate` inicial sincronize diretamente com a data civil do primeiro dia da barra.
    - Backend API (`apps/api/src/utils/date-utils.ts`): Criados utilitários `getBrazilTodayYMD()`, `getBrazilNowMinutes()` e `parseYMDToSafeUtcDate(dateStr)` que extraem com precisão matemática o dia da semana (`dayOfWeek`) e a data civil, sem qualquer interferência do timezone da VPS ou container Docker.
    - `availability.service.ts`: O cálculo do dia da semana (`dayOfWeek`) e a verificação de horário atual para bloqueio de horários passados no dia corrente (`isToday`) agora utilizam o fuso oficial de Brasília (`America/Sao_Paulo`).
    - `booking.service.ts` & `schedules.routes.ts`: `targetDate`, filtros de `startDate`/`endDate` e cálculo de `dashboard-summary` blindados contra saltos de fuso na VPS.
    - Painel Administrativo (`agendamentos/page.tsx`, `dashboard/page.tsx`, `AgendaAppointmentModal.tsx`, `AgendaAppointmentDetailsModal.tsx`, `AgendaBlockModal.tsx`): Todos os pontos com `toISOString()` convertidos para `formatLocalDateToYMD` e `getWeekDays`.

- **Fase 12: Alinhamento da Agenda (Mês, Semana e Dia), Smart Free Time Gaps, Captura 404 de Lead e SVG Oficial do WhatsApp**:
  - **Alinhamento do Header da Agenda (`AgendaHeader.tsx`)**: Reestruturado em duas faixas horizontais simétricas e niveladas (Tier 1: Navegação, Datas, [Mês | Semana | Dia], Seletor de Equipe; Tier 2: Previsão Financeira, Total de Atendimentos, Legenda de Cores de Status, Botão Bloquear Horário e Botão Novo Agendamento).
  - **Consistência de Dias Fechados no Mês, Semana e Dia**: Dias fechados por regras de disponibilidade do estabelecimento (`availabilityRules`) agora recebem o mesmo tratamento no Mês e no Dia que já tinham na Semana (fundo cinza hachurado `repeating-linear-gradient`, badge "Fechado" e remoção de slots fictícios de agendamento).
  - **Correção do Corte do Rótulo 07:00**: O primeiro marcador de hora da régua vertical agora utiliza `translate-y-0` e alinhamento compensado, eliminando o corte pelo `overflow-y-auto` e a sobreposição com a linha de "dia todo".
  - **Motor de Janelas Livres Inteligentes ("Smart Free Time Gaps")**: Substituídos os dezenas de botões repetitivos de `+ XX:XX LIVRE` a cada 30min por cards consolidados calculados dinamicamente (`computeDayFreeGaps`), exibindo o tempo contínuo real disponível (ex: "2 horas livres até o próximo atendimento" ou "6h30 livres até o 1º atendimento") com clique inteligente em qualquer posição.
  - **Endpoint de Validação de Links no Backend (`GET /check-slug/:slug`)**: Verificação em tempo real de slugs disponíveis, reservados e ocupados por estabelecimentos cadastrados.
  - **Página de Captura 404 de Lead Catcher (`SlugClaim404Page.tsx`)**: Quando um link de vitrine (`/[slug]`) não existe no banco, exibe página de alta conversão no Design System oficial com os pilares anti-falta da plataforma e CTA para reivindicar o link exclusivo em `/cadastro?slug={slug}`.
  - **Pré-preenchimento Inteligente no Cadastro (`/cadastro?slug=...`)**: O formulário de onboarding captura o parâmetro da URL, reserva o slug e exibe confirmação visual de "Link reservado para o seu cadastro!".
  - **SVG Oficial do WhatsApp com Proporções Meta (`WhatsAppIcon.tsx`)**: Variante oficial (`variant="official"`) com círculo verde `#25D366` e telefone branco, integrada no botão flutuante da vitrine pública (`[slug]/page.tsx`), no cabeçalho panorâmico (`ShowcaseHeader.tsx`), nos cards de produtos (`ShowcaseProducts.tsx`) e nos cursos (`ShowcaseCourses.tsx`).

- **Fase 13: Brandkit Oficial, Logo Oficial Sem Fundo, Tabela de Planos & UX Mobile Nativa**:
  - **Logo Oficial & Identidade Visual (`SlugClaim404Page.tsx`)**: Substituído o ícone M improvisado pela imagem oficial da marca `/brand/logooficial-semfundo.png` com proporções responsivas, contraste sóbrio e paleta bordô `#5c0701` / `#480501` do brandkit.
  - **Apresentação dos Planos & Opção Gratuita**:
    - Removidas mensagens de trial temporário ("15 dias grátis") e adicionada comunicação transparente da precificação da plataforma.
    - Destaque claro de que profissionais com poucos clientes ou que desejam testar o sistema podem se cadastrar gratuitamente no **Plano Gratuito** (até 30 agendamentos por mês sem custo).
    - Apresentação completa e comparativa dos planos **Plano Gratuito (R$ 0,00/mês)**, **Profissional Solo (R$ 49,99/mês)** e **Equipe Pro (R$ 99,99/mês)**, com CTAs parametrizados para `/cadastro?slug={slug}&plan={plan}` e ênfase no repasse de 100% do sinal PIX direto para a conta do assinante.
  - **Menu Mobile Exclusivo na Base (`apps/web/src/app/dashboard/layout.tsx`)**:
    - Removido o menu hambúrguer duplicado do topo no mobile, unificando o cabeçalho em Logo Oficial + Nome do Estabelecimento + Central de Notificações.
    - Transformado o menu mobile em um **Bottom Sheet** nativo com animação fluida da base da tela, backdrop escuro com blur e safe area padding para iPhone 17 (`safe-area-inset-bottom`), eliminando qualquer sobreposição invasiva.
  - **Blindagem da Agenda no Mobile (`AgendaWeeklyGrid.tsx`)**:
    - Ajustado o container de rolagem vertical para `max-h-[calc(100dvh-230px)]` com suporte a `touch-pan-y` e folga de rodapé `pb-32`, impedindo que os últimos horários do dia (20:00, 21:00) fiquem ocultos atrás da barra inferior.
    - Nos modais de agendamento (`AgendaAppointmentModal.tsx` e `AgendaAppointmentDetailsModal.tsx`), quando o dia selecionado for fechado, exibe aviso claro de estabelecimento fechado com compensação de safe area no rodapé.


- **Fase 14: Correções e Refinamentos da Agenda, Fuso de Bloqueios, Cores de Procedimentos e Suporte Cross-Origin a Fotos**:
  - **Correção do Fuso de Bloqueios/Folgas (Dia 21 -> Dia 20)**: Normalizado o armazenamento com `parseYMDToSafeUtcDate(data.date).targetDate` em `apps/api/src/modules/blocks/blocks.routes.ts` e leitura no frontend sem conversão indevida para `Date` local UTC em `AgendaWeeklyGrid.tsx` e `AgendaMonthGrid.tsx`, eliminando o desvio de fuso (UTC-3).
  - **Eliminação da Mensagem "Informe o slug ou tenantId." no Modal de Detalhes**:
    - No frontend (`AgendaAppointmentDetailsModal.tsx`), adicionada resolução completa do `tenantId` com múltiplos fallbacks (`appointment.tenantId`, `service.tenantId`, `tenant_data`, `@marcatuahora:tenant`, `tenant_id`, `user_data`), além de filtro no `catch` para nunca vazar mensagens internas de validação para a UI.
    - No backend (`apps/api/src/modules/schedules/schedules.routes.ts` e `availability.service.ts`), a rota `/schedules/availability` extrai o `tenantId` do token JWT do usuário autenticado e possui fallback para tenant único, garantindo que horários livres sempre apareçam na remarcação do dashboard.
    - Adicionado suporte a `excludeScheduleId` para não conflitar com o próprio atendimento ao reagendar.
    - O botão `[ Aplicar ]` de status foi reativado com feedback inline amigável e persistência em tempo real.
  - **Remoção de Foto do Procedimento**: Removida a seção de upload de fotos de serviços em `apps/web/src/app/dashboard/servicos/page.tsx`, mantendo a configuração de procedimentos focada em categoria, preço, duração e cor.
  - **Correção de Fotos da Galeria no Mobile (Safari iOS / CORP)**: Configurado Helmet com `crossOriginResourcePolicy: { policy: 'cross-origin' }` em `apps/api/src/plugins/security.ts`, cabeçalhos explícitos `Access-Control-Allow-Origin: *` em `apps/api/src/modules/upload/upload.routes.ts`, e sanitização de URLs em `apps/web/src/lib/imageUrl.ts` para promover URLs para HTTPS em produção.
  - **Identificação Visual por Cores de Procedimento e Bolinha de Status**:
    - No `AgendaMonthGrid.tsx` e `AgendaWeeklyGrid.tsx`, os cards de agendamento passaram a adotar a cor do procedimento (`service.color`) como cor de identificação primária.
    - O status do atendimento passou a ser exibido através de uma bolinha indicadora circular (`w-2 h-2 rounded-full`) ao lado do horário de início.
  - **Horários de Expediente e Agendamento em Dias Fechados**:
    - As janelas livres do `AgendaWeeklyGrid.tsx` agora respeitam o horário configurado nas regras de funcionamento (`getDayWorkingHours`), em vez de iniciar compulsoriamente às 07:00.
    - Profissionais podem clicar em colunas de dias fechados para realizar encaixes manuais sem impedimento da interface.

---

## 3. Estado Atual do Repositório Git

- **Verificação de Tipos TypeScript (`npx tsc --noEmit`)**:
  - `packages/shared`: **0 erros**.
  - `apps/api`: **0 erros**.
  - `apps/web`: **0 erros**.
- **Testes Unitários da API (`vitest run`)**: Todos os **94 testes unitários** aprovados com 100% de sucesso.
- **Ambiente de Produção**: Pronto para deploy na VPS `23.80.89.116`.

