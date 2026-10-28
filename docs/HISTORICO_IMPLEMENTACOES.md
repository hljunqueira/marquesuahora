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

### A.-1. Sistema de Notificações no WhatsApp (Lembretes Automáticos 24h, Confirmação e Edição Sincronizados com Configurações)
- **Contexto & Diagnóstico**:
  - Anteriormente, os disparos manuais de WhatsApp nos modais de criação, edição e detalhes da Agenda utilizavam textos estáticos e hardcoded, ignorando completamente os templates personalizados salvos em `Configurações > Notificações & Mensagens` (`TenantNotificationRule`).
  - Além disso, não havia um agendador automatizado no backend para monitorar e disparar os lembretes de agendamento 24 horas antes do horário marcado (`BOOKING_REMINDER_CLIENT`).
- **Arquivos Backend Modificados/Criados**:
  - `apps/api/src/modules/notifications/dispatcher.service.ts`: Implementação do método `prepareNotification` que centraliza a normalização de variáveis (`{{clientName}}`, `{{serviceName}}`, `{{date}}`, `{{time}}`, `{{professionalName}}`, etc.), consulta os templates customizados do tenant no banco e constrói o link do WhatsApp (`waLink`). O método `dispatch` foi refatorado para reaproveitar essa lógica.
  - `apps/api/src/modules/notifications/notifications.routes.ts`: Criação do endpoint `GET /notifications/render-message` que recebe o gatilho (`BOOKING_CONFIRMATION_CLIENT`, `BOOKING_REMINDER_CLIENT`, `BOOKING_UPDATED_CLIENT`) e o ID do agendamento para renderizar o texto oficial e retornar o `waLink`.
  - `apps/api/src/modules/schedules/schedules.routes.ts`:
    - Adicionado suporte ao parâmetro `notifyClient` no schema de edição `PATCH /schedules/:id`.
    - Disparo automático de `BOOKING_UPDATED_CLIENT` quando data/horário/serviço/profissional são alterados, retornando `waLink` e `whatsappText` formatados.
    - Na rota de criação `POST /schedules`, o retorno agora inclui `waLink` e `whatsappText` baseados no template de confirmação ativo.
    - Criação da rota `POST /schedules/:id/send-reminder-24h` para disparo do lembrete de 24 horas sob demanda com atualização de `reminder24hSentAt`.
  - `apps/api/src/modules/automation/schedulers/reminder-24h.scheduler.ts`: Agendador autônomo que executa a cada 10 minutos varrendo agendamentos pendentes ou confirmados das próximas 25 horas sem lembrete enviado (`reminder24hSentAt IS NULL`).
  - `apps/api/src/modules/automation/index.ts`: Inicialização do `Reminder24hScheduler` junto aos demais serviços de automação do monorepo.
- **Arquivos Frontend Modificados**:
  - `apps/web/src/components/agenda/types.ts`: Adicionado campo `reminder24hSentAt?: string | null` na interface `ScheduleAppointment`.
  - `apps/web/src/components/agenda/AgendaAppointmentModal.tsx`:
    - Checkbox de notificação ao editar agendamentos (`notifyClientOnEdit`).
    - Integração de `waLink` no voucher/confirmação gerado a partir do template salvo em Configurações.
    - Fallback dinâmico via `GET /notifications/render-message`.
  - `apps/web/src/components/agenda/AgendaAppointmentDetailsModal.tsx`:
    - `handleOpenWhatsApp` atualizado para buscar o template de confirmação dinâmico configurado pelo assinante.
    - Botão e status de Lembrete 24h no banner da cliente (`Enviar Lembrete 24h` ou badge `Lembrete 24h Enviado`).
    - Checkbox `Notificar cliente no WhatsApp com template de alteração configurado` na aba de edição.
    - Feedback de sucesso após alteração com botão imediato "Avisar Alteração no WhatsApp".

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

- **Fase 15: Otimização de Header da Agenda Mobile, Alinhamento de Ações, Eliminação de Bordas Duplas e Comprovante WhatsApp Instantâneo**:
  - **Botão de Cores Compacto sem Rótulo Textual**:
    - No componente `AgendaStatusColorPicker.tsx`, removido o rótulo textual `"Cores"` no mobile, preservando estritamente as bolinhas dos status (`🔴🟠🟡🔵🟣 ⌵`), reduzindo em mais de 60px a largura horizontal e evitando quebras de linha indesejadas.
  - **Ações da Agenda Lado a Lado**:
    - No `AgendaHeader.tsx`, os botões de `Cores`, `Bloquear` e `+ Novo` agora são renderizados lado a lado no mobile na mesma linha, eliminando a quebra isolada do botão de novo agendamento.
  - **Navegação de Período Integrada e Ergonomia Mobile**:
    - Seletores `[ Mês | Semana | Dia ]` e `[ Toda a Equipe ]` foram unificados ao lado da navegação `< Hoje >` com intervalo explícito por extenso (ex: `19 a 25 de outubro`), evitando que o usuário precise rolar a tela até o topo para trocar de visualização ou navegar entre semanas.
  - **Eliminação de Bordas Duplas e Linha Vazia "dia todo"**:
    - No `AgendaWeeklyGrid.tsx` e `AgendaMonthGrid.tsx`, removidas as bordas externas duplicadas e cantos arredondados redundantes, integrando a grade de forma contínua ao container da agenda.
    - A linha `"dia todo"` foi condicionada para ser renderizada exclusivamente quando existirem bloqueios de dia inteiro (`allDayBlocks.length > 0`), eliminando a linha cinza vazia que sobrepunha os primeiros horários (`09:00`) na grade.
  - **Fluxo Transacional de Comprovante via WhatsApp no Modal de Agendamento**:
    - No `AgendaAppointmentModal.tsx`, a criação manual de agendamentos foi integrada a uma tela de confirmação imediata de sucesso, discriminando cliente, serviço, data/hora e profissional, acompanhada do botão de ação em destaque **`[ Enviar Comprovante no WhatsApp ]`** (via link direto `wa.me` com mensagem pré-formatada).
    - No backend (`dispatcher.service.ts`), o gatilho `BOOKING_CONFIRMATION_CLIENT` foi parametrizado como notificação transacional prioritária, garantindo envio direto sem bloqueios indevidos por plano contratado.
    - No `server.ts`, os workers da fila BullMQ (`whatsappWorker`, etc.) foram inicializados no boot do servidor.
  - **Deploy com Sucesso na VPS de Produção**:
    - Build de produção do Next.js 14 e Fastify compilados sem erros e implantados com sucesso na VPS Ubuntu (`23.80.89.116`), com healthcheck HTTP 200 nas portas `3040` (Web) e `3041` (API).

- **Fase 16: Refinamento de Layout da Agenda, Quebra de Linha em Badges Fechado, Ajuste do Campo de Data e Nome de Profissional Único**:
  - **Ações da Agenda Acima da Previsão Financeira no Mobile**:
    - No componente [`AgendaHeader.tsx`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/apps/web/src/components/agenda/AgendaHeader.tsx), os botões `[ Cores ]`, `[ Bloquear ]` e `[ + Novo ]` foram posicionados acima do badge de previsão financeira (`Previsão da semana`), respeitando a hierarquia de ações rápidas no mobile com `order-1 sm:order-2`.
  - **Campo de Data Ajustado e Sem Truncamento**:
    - Substituído o input nativo que apresentava texto cortado (`20 de out. de 202`) por um seletor compacto e responsivo com ícone `Calendar`, formatação brasileira legível (`DD/MM/AAAA`), abertura instantânea do datepicker nativo ao toque/clique e contenção horizontal com `truncate` no título do período.
  - **Quebra de Linha no Badge "Fechado"**:
    - No [`AgendaWeeklyGrid.tsx`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/apps/web/src/components/agenda/AgendaWeeklyGrid.tsx) e [`AgendaMonthGrid.tsx`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/apps/web/src/components/agenda/AgendaMonthGrid.tsx), os badges de dias fechados com agendamentos/encaixes (`Fechado (X)`) agora utilizam quebra de linha com `flex-col`, exibindo `Fechado` na linha 1 e `(X)` na linha 2. Isso garante que o elemento permaneça 100% contido dentro da largura de cada coluna sem transbordar para os dias vizinhos.
  - **Exibição Personalizada para Profissional Solo**:
    - Quando o estabelecimento possui apenas um profissional cadastrado (`professionals.length === 1`), o seletor no topo da agenda substitui a opção genérica "Toda a Equipe" pelo nome direto do profissional (ex: "Emanuelle Telles"), selecionando-o automaticamente ao carregar.
  - **Deploy Contínuo em Produção**:
    - Todas as alterações validadas com 0 erros de compilação TypeScript (`apps/api` e `apps/web`), 94/94 testes aprovados e deploy executado na VPS (`23.80.89.116`), com containers `marquesuahora-web` e `marquesuahora-api` em execução saudável (HTTP 200).

- **Fase 17: Confirmação e Notificações Personalizadas de Mudança no WhatsApp, Encaixe Manual sem Bloqueio 409, Edição de Procedimento e Correção de Bloqueio de Horário**:
  - **1. Notificações WhatsApp com Template Personalizado e Avisos de Mudança**:
    - Refatorado o worker do WhatsApp (`apps/api/src/modules/automation/workers/whatsapp.worker.ts`) para eliminar textos estáticos hardcoded e utilizar o `NotificationDispatcherService.dispatch`. As mensagens de confirmação agora respeitam 100% o texto personalizado configurado pelo salão nas Configurações (`TenantNotificationRule.customWhatsappText`), contemplando regras de tolerância, reagendamento e cancelamento.
    - Adicionado suporte a variáveis dinâmicas em português (`{cliente}`, `{primeiro_nome}`, `{servico}`, `{procedimento}`, `{profissional}`, `{data}`, `{horario}`, `{valor}`, `{duracao}`, `{endereco}`, `{nome_empresa}`) no `dispatcher.service.ts`.
    - Adicionada trava de deduplicação idempotente de 30 segundos no `NotificationDispatcherService` para evitar duplicidade de mensagens entre disparos síncronos e assíncronos.
    - Qualquer alteração em agendamento existente (mudança de horário, data, profissional ou procedimento) agora dispara automaticamente `BOOKING_UPDATED_CLIENT` via WhatsApp e e-mail.
    - A confirmação de status (`ScheduleStatus.CONFIRMED`) e confirmação de sinal PIX (`POST /schedules/:id/confirm-deposit`) disparam imediatamente `BOOKING_CONFIRMATION_CLIENT`.
  - **2. Encaixe / Sobreposição no Cadastro Manual (Imagem 01)**:
    - No `apps/api/src/modules/schedules/booking.service.ts` e `schedules.routes.ts`, adicionado parâmetro `allowOverlap?: boolean`. Para agendamentos manuais da recepção/balcão (`source !== BookingSource.ONLINE`), o sistema não bloqueia mais com erro 409 de conflito de horário, permitindo o encaixe de clientes no mesmo horário.
    - No modal `AgendaAppointmentModal.tsx`, removido o bloqueio impeditivo no envio do formulário quando há sobreposição. A interface agora exibe um badge âmbar informativo de horário compartilhado/encaixe sem travar a submissão.
  - **3. Edição do Procedimento/Serviço nos Detalhes do Agendamento (Imagem 02)**:
    - No modal `AgendaAppointmentDetailsModal.tsx`, adicionado o seletor de "Procedimento / Serviço" na seção "Remarcar ou Editar Atendimento", com sincronização automática do valor cobrado e recálculo da duração.
    - No backend (`PATCH /schedules/:id`), adicionado suporte a `serviceId`: atualiza o serviço principal, os itens (`ScheduleItem`), recalcula o término (`endTime`) e notifica a cliente sobre a mudança do procedimento.
  - **4. Correção Definitiva do Bloqueio de Horário**:
    - No backend (`apps/api/src/modules/blocks/blocks.routes.ts`), corrigida a consulta Prisma em `GET /blocks`: ao filtrar por profissional (`professionalId`), agora utiliza `OR: [{ professionalId: null }, { professionalId }]`. Isso impede que bloqueios gerais do salão fiquem ocultos da grade quando o usuário filtra por um profissional específico.
    - No modal `AgendaBlockModal.tsx`, corrigido o cálculo do horário final para avançar 1 hora automaticamente em relação ao início, prevenindo erros de validação (`startTime >= endTime`), e adicionado suporte a `initialProfessionalId`.
    - Na página [`apps/web/src/app/dashboard/agenda/page.tsx`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/MarqueSuaHora/apps/web/src/app/dashboard/agenda/page.tsx), os botões de bloqueio agora passam a data atualmente navegada (`currentDate`) e o profissional ativo, emitindo toast de confirmação imediato na interface.

- **Fase 18: Forçar Agendamento Manual / Encaixes sem Bloqueio de Horário (Estilo Guru)**:
  - **1. Liberação Completa de Agendamento Forçado no Backend**:
    - Em `apps/api/src/modules/schedules/schedules.routes.ts`, adicionado `allowOverlap: z.boolean().optional()` no `createSchema` de `POST /schedules` e repassado explicitamente `allowOverlap: body.allowOverlap ?? true` na chamada de `bookingService.createBooking`.
    - No `booking.service.ts`, condicionado o bloqueio de `conflictingBlock` (bloqueios manuais de expediente/folga) para que só barre agendamentos externos (`!canOverlap`). Agendamentos manuais internos de balcão/WhatsApp agora têm autonomia total para forçar horários sobrepostos ou bloqueados, sem que esses horários fiquem abertos para as clientes na vitrine pública.
    - No `PATCH /schedules/:id`, condicionado `conflictingBlock` ao `!allowOverlap`.
  - **2. Refinamento de UX no Modal de Agendamento (`AgendaAppointmentModal.tsx`)**:
    - Eliminado aviso de conflito duplicado e atualizado o banner âmbar para "Encaixe / Horário Compartilhado", informando que o agendamento será forçado e salvo como encaixe normalmente sem abrir o horário na vitrine pública online.
  - **3. Deploy em Produção**:
    - Realizado deploy na VPS Ubuntu (`23.80.89.116`), com containers `marquesuahora-api` e `marquesuahora-web` operando com status HTTP 200.

- **Fase 19: Modo Apenas Notificações e Chave de Desativação da Atendente IA no WhatsApp**:
  - **1. Campo de Configuração `aiAssistantEnabled` no Banco e Schemas**:
    - Adicionado campo `aiAssistantEnabled Boolean @default(true)` no modelo `Tenant` do Prisma (`schema.prisma`) e no schema Zod de validação `updateTenantSettingsSchema` em `@marquesuahora/shared`.
    - Atualizada a rota `PUT /tenants/me/settings` no backend (`tenants.routes.ts`) para persistência e auditoria da alteração.
  - **2. Silenciamento de Auto-Respostas Inbound no Webhook da Evolution API**:
    - Em `apps/api/src/modules/automation/webhook.routes.ts`, implementada guarda no processamento de mensagens recebidas: quando `tenant.aiAssistantEnabled === false`, o webhook ignora a mensagem imediatamente com status `ignored_ai_assistant_disabled`, sem gerar respostas automáticas de IA, sem transcrição e sem envios de boas-vindas. O canal do WhatsApp no celular do estabelecimento fica 100% livre para atendimento humano.
    - Todas as notificações ativas (confirmações imediatas, lembretes de 24h e 2h antes, sinal PIX e guias pós-atendimento) continuam operando normalmente via `NotificationDispatcherService`.
  - **3. Interface de Controle no Painel do Assinante**:
    - Em `apps/web/src/components/settings/SettingsWhatsappTab.tsx`, adicionado toggle visual para ligar/desligar a Atendente IA Autônoma com feedback instantâneo de salvamento.
    - Quando desativada, a interface exibe o badge "Desativada (Modo Apenas Notificações)" e um card explicativo confirmando que o robô está silenciado e as notificações automáticas de agendamento permanecem ativas.
  - **4. Testes e Validação de Tipagem**:
    - TypeScript estrito validado com 0 erros em `apps/api` e `apps/web` (`npx tsc --noEmit`).
    - Todos os testes unitários da API aprovados no Vitest (`12 passed, 99 tests`).

---

## 3. Estado Atual do Repositório Git

- **Verificação de Tipos TypeScript (`npx tsc --noEmit`)**:
  - `packages/shared`: **0 erros**.
  - `apps/api`: **0 erros**.
  - `apps/web`: **0 erros**.
- **Testes Unitários da API (`vitest run`)**: Todos os **99 testes unitários** aprovados com 100% de sucesso.
- **Ambiente de Produção**: Ativo e operando na VPS `23.80.89.116` (Web e API em HTTP 200).

