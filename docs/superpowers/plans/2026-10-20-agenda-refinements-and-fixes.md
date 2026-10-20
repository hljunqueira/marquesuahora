# Agenda & Procedimentos Refinements and Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar o ecossistema da agenda e serviços com base no feedback visual do usuário: corrigir o fuso horário de folgas (dia 21 caindo no dia 20), permitir remarcação e correção de status sem conflito/erro de tenantId, remover foto do procedimento, corrigir exibição de fotos da galeria no celular (CORP/CORS), respeitar horários de funcionamento configurados e colorir agendamentos pela cor do serviço com bolinha indicadora de status.

**Architecture:** 
1. **Fuso de Folgas / Bloqueios**: Normalizar gravação no Prisma com `parseYMDToSafeUtcDate(date).targetDate` e leitura no frontend sem conversão indevida para Date local UTC.
2. **Remarcação & Status no Detalhes**: Passar `tenantId` e `excludeScheduleId` em `/schedules/availability`, remover desativação cega do botão "Aplicar" de status e exibir feedback inline.
3. **Cores dos Procedimentos vs Status**: No `AgendaWeeklyGrid` e `AgendaMonthGrid`, o elemento de agendamento adota a cor primária do procedimento (`service.color`) e exibe um indicador circular ("bolinha de status") com a cor do status (`statusColors[appt.status]`).
4. **Horários de Funcionamento**: `AgendaWeeklyGrid` calcula dinamicamente o início/término do expediente a partir de `availabilityRules`, evitando que janelas livres comecem às 07:00 quando o salão só abre mais tarde.
5. **Agendamento em Dias Fechados**: Permitir que profissionais cliquem em colunas de folga/fechado na agenda para agendar encaixes manuais sem bloqueio de interface.
6. **Remoção de Foto do Procedimento**: Remover a seção de upload de fotos em `dashboard/servicos/page.tsx`.
7. **Exibição de Imagens (Galeria & Fotos)**: Configurar Helmet com `crossOriginResourcePolicy: { policy: 'cross-origin' }` e cabeçalhos CORS em `/uploads` para permitir que o Safari/iOS carregue fotos sem ícone de interrogação `[?]`.

**Tech Stack:** Next.js 14, Fastify, Prisma, PostgreSQL, React 18, TailwindCSS, date-fns / dateUtils.

---

## Global Constraints
- Zero ícones decorativos / Zero emojis ornamentais em interfaces, botões ou toasts (regra inegociável do projeto).
- TypeScript estrito com 0 erros de compilação (`npx tsc --noEmit` em `apps/api` e `apps/web`).
- Isolamento multi-tenant garantido por `tenantId`.

---

## Review Focus
1. Folga salva para dia 21 não pode sofrer drift para dia 20 em nenhum fuso (America/Sao_Paulo).
2. Remarcar agendamento no modal de detalhes deve listar os horários livres reais do dia sem acusar "Informe o slug ou tenantId".
3. Clicar em "Aplicar" em "CORRIGIR STATUS" deve ter feedback claro e persistir a alteração.
4. Fotos enviadas para a galeria devem renderizar perfeitamente no Safari iOS (`marquesuahora.com.br`) sem bloqueio por CORP.
5. No grid mensal e semanal, a cor do card deve refletir a cor do serviço, com bolinha indicadora do status ao lado.

---

### Task 1: Correção do Fuso Horário de Bloqueios e Folgas
**Files:**
- Modify: `apps/api/src/modules/blocks/blocks.routes.ts`
- Modify: `apps/web/src/components/agenda/AgendaWeeklyGrid.tsx`
- Modify: `apps/web/src/components/agenda/AgendaMonthGrid.tsx`
- Modify: `apps/web/src/components/settings/SettingsBookingTab.tsx`

- [x] **Step 1: Backend - Usar `parseYMDToSafeUtcDate` no cadastro de bloqueios**
  Em `apps/api/src/modules/blocks/blocks.routes.ts`:
  Importar `parseYMDToSafeUtcDate` de `../../utils/date-utils`.
  Na criação de bloqueio (`POST /`):
  Substituir:
  ```ts
  date: data.date ? new Date(`${data.date}T00:00:00`) : null,
  ```
  Por:
  ```ts
  date: data.date ? parseYMDToSafeUtcDate(data.date).targetDate : null,
  ```

- [x] **Step 2: Frontend - Evitar conversão com drift em `AgendaWeeklyGrid.tsx` e `AgendaMonthGrid.tsx`**
  Em `AgendaWeeklyGrid.tsx` e `AgendaMonthGrid.tsx`:
  Substituir `formatLocalDateToYMD(new Date(b.date))` por `formatLocalDateToYMD(b.date)`.
  Como `formatLocalDateToYMD` já lida com strings ISO (`input.includes('T') ? input.slice(0, 10)`), passar a string diretamente impede que o construtor `new Date()` subtraia 3 horas do fuso de Brasília.

- [x] **Step 3: Testar e verificar salvamento de folga**
  Validar que criar bloqueio para `2026-10-21` exibe exatamente na coluna de quarta-feira (dia 21).

---

### Task 2: Eliminar a Mensagem "Informe o slug ou tenantId." e Ajustar Remarcação/Status
> **Contexto da Foto do Usuário**: Na seção *REMARCAR OU EDITAR ATENDIMENTO*, logo abaixo de *HORÁRIOS LIVRES NO DIA:*, estava aparecendo a mensagem técnica amarela *"Informe o slug ou tenantId."*. Isso ocorria porque a rota `/schedules/availability` retornava HTTP 400 quando o `tenantId` não vinha explicitamente no objeto do agendamento, e o modal exibia a mensagem bruta da API.

**Files:**
- Modify: `apps/web/src/components/agenda/AgendaAppointmentDetailsModal.tsx`
- Modify: `apps/api/src/modules/schedules/schedules.routes.ts`
- Modify: `apps/api/src/modules/schedules/availability.service.ts`

- [x] **Step 1: Eliminar "Informe o slug ou tenantId." nos Horários Livres**
  Em `apps/web/src/components/agenda/AgendaAppointmentDetailsModal.tsx`:
  - Resolver `resolvedTenantId` com múltiplos fallbacks: `appointment.tenantId`, `appointment.service?.tenantId`, `localStorage['tenant_data']`, `localStorage['@marcatuahora:tenant']`, `localStorage['tenant_id']` e `localStorage['user_data']`.
  - Passar `tenantId: resolvedTenantId`, `excludeScheduleId: appointment.id`, e `serviceIds`.
  - No `catch` do frontend: filtrar mensagens técnicas da API contendo "slug" ou "tenant" para nunca vazar mensagens internas, exibindo fallback amigável caso não haja slots.
  - No backend (`apps/api/src/modules/schedules/schedules.routes.ts`):
    - Extrair `tenantId` do token JWT autenticado do usuário via `request.jwtVerify()`.
    - Fallback de segurança para requisições internas de tenant único caso o token ou query não especifiquem.
    - Em `apps/api/src/modules/schedules/availability.service.ts`: quando `excludeScheduleId` for informado (remarcação/edição no painel), permitir localizar os serviços mesmo se `allowOnlineBooking: false`, garantindo que horários livres sempre apareçam para o profissional no dashboard.
  - Resultado: a caixa amarela com *"Informe o slug ou tenantId."* é 100% eliminada, dando lugar aos botões reais de horários livres clicáveis do dia (manhã, tarde, noite).

- [x] **Step 2: Melhorar o fluxo de "CORRIGIR STATUS" com feedback inline**
  Remover `disabled={selectedStatus === appointment.status}` do botão `[ Aplicar ]`.
  Ao clicar:
  - Se `selectedStatus === appointment.status`: exibir mensagem inline "O agendamento já está com o status [Nome do Status]".
  - Se for diferente: executar a chamada à API, exibir mensagem de sucesso inline "Status atualizado com sucesso!", atualizar o estado local de `appointment.status` e chamar `onSuccess()`.

- [x] **Step 3: Feedback inline no botão "Salvar Alterações" de Remarcação**
  Adicionar mensagem de erro/sucesso logo acima de `[ Salvar Alterações ]`, garantindo que o usuário veja imediatamente qualquer motivo de bloqueio ou conflito sem precisar rolar para o topo da modal.

---

### Task 3: Remover Seção "Foto do Procedimento" do Modal de Procedimentos
**Files:**
- Modify: `apps/web/src/app/dashboard/servicos/page.tsx`

- [x] **Step 1: Remover o bloco visual de upload de foto do serviço**
  Em `apps/web/src/app/dashboard/servicos/page.tsx`:
  Remover o container `{/* SEÇÃO 1: FOTO DO PROCEDIMENTO (UPLOAD REAL VIA MULTIPART) */}` que envolve a caixa "Sem imagem", "Enviar Foto" e orientações.
  Manter o resto do formulário intacto (Nome, Categoria, Duração, Preço, Descrição, Cor do Procedimento, etc.).

---

### Task 4: Correção de Exibição de Fotos da Galeria (CORP / CORS no Mobile)
**Files:**
- Modify: `apps/api/src/plugins/security.ts`
- Modify: `apps/api/src/modules/upload/upload.routes.ts`
- Modify: `apps/web/src/lib/imageUrl.ts`

- [x] **Step 1: Configurar Helmet para permitir cross-origin em imagens**
  Em `apps/api/src/plugins/security.ts`:
  Configurar o plugin helmet com:
  ```ts
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
  ```

- [x] **Step 2: Definir cabeçalhos explícitos na rota de entrega de arquivos estáticos**
  Em `apps/api/src/modules/upload/upload.routes.ts`:
  No endpoint `GET /:filename`, adicionar:
  ```ts
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
  ```

- [x] **Step 3: Sanitizar URLs no `resolveImageUrl`**
  Em `apps/web/src/lib/imageUrl.ts`:
  Garantir que URLs com `http://` apontando para o domínio da API sejam promovidas para `https://`, e referências a `localhost` em ambiente de produção sejam mapeadas para a URL de produção da API.

---

### Task 5: Cores dos Procedimentos na Agenda com Indicador de Status ("Bolinha")
**Files:**
- Modify: `apps/web/src/components/agenda/AgendaWeeklyGrid.tsx`
- Modify: `apps/web/src/components/agenda/AgendaMonthGrid.tsx`

- [x] **Step 1: Atualizar `AgendaMonthGrid.tsx`**
  No mapeamento de `visibleChips`:
  - Usar a cor do procedimento (`appt.service?.color || appt.items?.[0]?.service?.color || tenantPrimaryColor`) como cor principal da borda/marcação do card.
  - Ao lado do horário de início do agendamento, adicionar uma bolinha (`w-2 h-2 rounded-full ring-1 ring-white/80 shrink-0`) com a cor do status correspondente (`activeStatusColors[appt.status]`).
  - Manter a legenda de status no rodapé.

- [x] **Step 2: Atualizar `AgendaWeeklyGrid.tsx`**
  Em `getAppointmentColor`:
  - Obter a cor primária do serviço: `const serviceColor = appt.service?.color || appt.items?.[0]?.service?.color || tenantColor || '#5c0701'`.
  - Definir o fundo e borda do card baseados na cor do serviço (ou versão com contraste agradável).
  - No corpo do card, posicionar ao lado do horário a bolinha indicadora de status com a cor do status correspondente.

---

### Task 6: Ajustar Horários de Funcionamento e Liberar Agendamento em Dias Fechados
**Files:**
- Modify: `apps/web/src/components/agenda/AgendaWeeklyGrid.tsx`

- [x] **Step 1: Horários livres no Grid Semanal respeitando regras de disponibilidade**
  Em `AgendaWeeklyGrid.tsx`:
  Ao calcular `freeGaps` de cada coluna, buscar a regra de abertura para o dia da semana (`colRule = availabilityRules.find(r => r.dayOfWeek === dayOfWeek)`).
  Se houver horário de abertura definido (ex: 09:00 às 18:00), passar esses limites para `computeDayFreeGaps` em vez do padrão hardcoded 07:00 às 21:00.

- [x] **Step 2: Permitir agendamento manual (encaixe) em dias fechados**
  Em `AgendaWeeklyGrid.tsx`:
  Ao clicar em uma coluna fechada (`isEffectivelyClosed`), em vez de bloquear com `return`, acionar `onSlotClick(dateStr, '09:00', col.professionalId)` para abrir o modal de novo agendamento com a data selecionada, permitindo que a profissional agende encaixes nos dias em que não abre normalmente ao público.

---

### Task 7: Verificação Geral e Compilação TypeScript
**Files:**
- Run: `npx tsc --noEmit` em `apps/api`
- Run: `npx tsc --noEmit` em `apps/web`
- Run: `pnpm --filter api test` e `pnpm --filter @marquesuahora/shared test`

- [x] **Step 1: Rodar typecheck nos pacotes**
- [x] **Step 2: Rodar suíte de testes automatizados**
