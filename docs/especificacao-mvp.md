# Marque Sua Hora: especificação de design do MVP

**Data:** 14/10/2026
**Status:** aprovado em conversa, aguardando revisão final
**Substitui, para o MVP:** as seções 1, 3, 4 e 6 de `especificacao-completa-marquesuahora.md`. A especificação completa continua valendo como visão de longo prazo.

---

## 1. Contexto e objetivo

O projeto tem hoje uma interface larga (16 mil linhas em páginas de painel) sobre um backend fino: o painel funciona com dados simulados, a API não tem rotas de gestão de agendamentos e o agendamento público não impede reserva dupla.

O objetivo do MVP é **fazer o ciclo principal funcionar de ponta a ponta, correto e seguro**:

> A profissional cadastra o que oferece e quando atende, a cliente agenda sozinha por um link, recebe confirmação e lembrete no WhatsApp, e a profissional gerencia a agenda pelo painel.

A organização do produto segue padrões observados no Guru Agenda (painel enxuto, configurações em abas com textos que explicam o efeito, wizard público curto). Reproduzimos estrutura e boas práticas de produto; marca, textos, layout e código são próprios.

**Público:** qualquer negócio com hora marcada (beleza, saúde, aulas, serviços). Vocabulário neutro: cliente, serviço, atendimento, profissional.

**Critério de sucesso do MVP:** um negócio real consegue se cadastrar, configurar serviços e horários, divulgar o link e receber agendamentos com lembretes automáticos, sem intervenção manual e sem nenhuma reserva dupla.

---

## 2. Escopo

### Entra no MVP

1. Cadastro e login da dona do negócio; onboarding curto (nome, endereço, primeiro serviço, horários).
2. Catálogo em dois níveis: categorias e serviços.
3. Disponibilidade por regras semanais, bloqueios recorrentes e pontuais, limites de antecedência.
4. Motor de horários livres com combos, vagas por horário e horas cheias opcionais.
5. Página pública única por negócio (vitrine + link na bio + agendamento em 4 passos).
6. Painel: Início, Agenda, Agendamentos, Clientes, Link na Bio, Configurações.
7. Equipe com atribuição automática de profissional.
8. Notificações por WhatsApp (Evolution API) e e-mail: confirmação, lembrete, alteração, novo agendamento para a equipe.
9. Remarcação e cancelamento pela cliente via link pessoal.
10. Cursos online: catálogo e área de vídeos gerenciada pelo próprio negócio, sem plataforma externa (o negócio insere seus vídeos/aulas para suas clientes e vende diretamente sem intermediação financeira da plataforma). Ver seção 14.
11. Landing Page institucional de alta conversão (`apps/web/src/app/page.tsx`) com 14 blocos, mockup desktop da agenda, tabela comparativa, bloco de segurança/LGPD e simulador de agendamento no celular. Ver seção 15.

### Fica para depois (código e schema preservados, fora da interface)

Atendente IA (Gemini e Jev), NPS, aniversários, reativação de clientes sumidos, fila de espera, anamnese e fotos, financeiro e comissões, produtos, sinal via PIX, cupons, cobrança de planos (Asaas), Super Admin, suporte por tickets, app móvel, modais por nicho, onboarding por nicho, integração com Google Agenda, recorrência de agendamentos, importação em massa, cursos online nas fases 2 e 3 (seção 14).

---

## 3. Arquitetura

Mantém-se a arquitetura existente:

- Monorepo pnpm: `apps/api` (Fastify 4, Prisma 5, BullMQ, Redis 7), `apps/web` (Next.js 14 App Router, Tailwind), `packages/shared` (tipos e schemas Zod compartilhados).
- PostgreSQL 16 e Redis 7 em Docker na VPS própria, atrás de Nginx com TLS.
- Evolution API v2 auto-hospedada para WhatsApp.

### Ajustes de base obrigatórios

| Item | Situação atual | Alvo |
|---|---|---|
| `packages/shared`, `pnpm-workspace.yaml`, `package.json` raiz | ausentes no projeto enviado | presentes e compilando |
| Migrations Prisma | ausentes | `prisma/migrations` versionado, incluindo SQL manual da seção 5.2 |
| Docker Compose | ausente | `docker-compose.yml` (dev) e `docker-compose.prod.yml` com api, worker, web, postgres, redis, evolution |
| URL da API no front | `http://localhost:3333` fixo | `NEXT_PUBLIC_API_URL` |
| Prefixo da API | rotas na raiz | `/api/v1`, como na especificação completa |
| Segredos | fallbacks fixos para `JWT_SECRET` e `SESSION_SECRET` | sem fallback: a API não sobe se faltar variável obrigatória (validação com Zod no boot) |
| `.env.example` | ausente | lista todas as variáveis, com valores vazios |
| Worker | workers no mesmo processo | processo `worker` separado, mesma imagem |
| Backup | previsto | `pg_dump` diário enviado para fora da VPS |

---

## 4. Correções obrigatórias (bloqueadores)

Cada item tem critério de aceite verificável por teste automatizado.

| # | Problema | Correção | Critério de aceite |
|---|---|---|---|
| C1 | `POST /public/booking/:slug` grava sem verificar disponibilidade | Criação transacional com trava e restrição de exclusão (seção 5.2) | 20 requisições simultâneas no mesmo horário: exatamente 1 sucesso e 19 respostas 409 |
| C2 | Preço e duração dos serviços adicionais vêm do navegador | O cliente envia só `serviceIds`; preço e duração são lidos do banco e congelados em `ScheduleItem` | Enviar preço adulterado não altera o valor gravado |
| C3 | `PUT /professionals/:id` sem filtro de tenant | Todo acesso por id filtra `tenantId` do token; helper único `scopedWhere()` | Teste de isolamento por rota: usuário do tenant A recebe 404 em recursos do tenant B |
| C4 | Webhook do WhatsApp sem autenticação | Token secreto por instância na URL do webhook e verificação do `instance` contra `WhatsappConfig` | POST sem token ou com instância desconhecida retorna 401 e não processa |
| C5 | Segredos com fallback no código; CORS reflete qualquer origem com credenciais | Sem fallback; CORS com lista de origens de `CORS_ORIGINS` | Boot falha sem `JWT_SECRET`; origem fora da lista não recebe cabeçalhos CORS |
| C6 | Cálculos usam o fuso do servidor | `Tenant.timezone` e cálculo com `date-fns-tz`; instantes gravados em `timestamptz` | Testes com servidor em UTC: "hoje", antecedência e lembretes corretos para `America/Sao_Paulo` às 22h locais |
| C7 | Código PIX falso com CRC fixo | Sinal fica fora do MVP; código removido do fluxo | Nenhum agendamento gera `depositPixCode` |
| C8 | Upsert de cliente por telefone sobrescreve nome e e-mail | Cliente existente é reaproveitado sem alteração de dados cadastrais; divergências vão para `Schedule.clientNameAtBooking` | Agendar com telefone existente e nome diferente não altera `Client.name` |
| C9 | `requireRole` continua após falha de autenticação | Retornar após enviar 401 | Teste de rota protegida sem token retorna 401 e não executa o handler |

---

## 5. Modelo de dados

Não há dados em produção. As migrations podem ser recriadas do zero.

### 5.1 Mudanças

**Tenant**
- Novo: `timezone String @default("America/Sao_Paulo")`.
- Novo bloco de regras de agendamento: `roundSlotStarts Boolean @default(false)`, `internalInitialStatus ScheduleStatus @default(CONFIRMED)`, `requireEmail Boolean @default(false)`, `requireCpf Boolean @default(false)`, `hideProfessionalsOnline Boolean @default(false)`, `assignmentMode AssignmentMode @default(AUTO)`, `assignmentStrategy AssignmentStrategy @default(PRIORITY)`.
- Mais regras: `onlineRequiresConfirmation Boolean @default(false)` (agendamento online nasce pendente), `lastAssignedProfessionalId String?` (controle do rodízio).
- Página pública: `publicTheme PublicTheme @default(LIGHT)`, `socialLinks Json` (instagram, facebook, tiktok, youtube, x), `whatsappButtonEnabled Boolean`, `extraLinks Json` (até 3 itens com `label`, `url`, `featured`), `galleryImages String[]` (caminhos de imagens enviadas pela API e servidas pelo Nginx a partir de um volume), `cancellationPolicyHours Int @default(24)`.
- Removidos do uso: `openingTime`, `closingTime` (substituídos por `AvailabilityRule`), `themeTemplate`, `secondaryColor`, `accentColor`. `minAdvanceBookingMinutes` e `maxAdvanceBookingDays` continuam como padrão global.

**User**
- Novo: `dashboardCards Json?` (cards escolhidos para o Início).

**Category** (nova): `id`, `tenantId`, `name`, `description?`, `sortOrder`, `isActive`. `@@unique([tenantId, name])`.

**Service**
- `category String` vira `categoryId` (FK para `Category`).
- Novos: `color String`, `capacity Int @default(1)`, `isActive Boolean @default(true)`, `minAdvanceMinutes Int?`, `maxFutureDays Int?`, `availableFrom String?`, `availableUntil String?` (HH:mm, janela opcional), `sortOrder Int`.
- `allowOnlineBooking` passa a significar "visível no link público".

**Professional**
- Novo: `priority Int @default(0)` (menor atende primeiro).
- `scheduleConfig Json` sai de uso (substituído por `AvailabilityRule`).

**AvailabilityRule** (nova): `id`, `tenantId`, `professionalId`, `weekday Int` (0 = domingo), `startTime String`, `endTime String` (HH:mm, horário local do tenant). Várias faixas por dia permitidas; faixas do mesmo profissional e dia não podem se sobrepor (validação na API).

**ScheduleBlock**
- `date` + `startTime` + `endTime` viram `startsAt timestamptz` e `endsAt timestamptz` para bloqueios pontuais.
- Novos para recorrência: `isRecurring Boolean`, `weekday Int?`, `recurringStart String?`, `recurringEnd String?`, `recurringUntil Date?`, `isPaused Boolean @default(false)`.
- `professionalId` passa a ser opcional: nulo significa toda a equipe.
- Novo: `reason String?`.

**Schedule**
- `date` + `startTime` + `endTime` viram `startsAt timestamptz` e `endsAt timestamptz` (`endsAt` inclui o intervalo de higienização; ver 6.1).
- Novos: `professionalAssignmentPending Boolean @default(false)`, `createdByUserId String?`, `clientNameAtBooking String`, `remindersConsent Boolean @default(false)`, `cancelledAt DateTime?`, `isExclusive Boolean` (verdadeiro quando todos os serviços têm `capacity = 1`).
- `additionalServices Json` sai; entra a relação `items ScheduleItem[]`.
- `serviceId` permanece como serviço principal (primeiro item), para consultas simples.

**ScheduleItem** (nova): `id`, `scheduleId`, `serviceId`, `priceAtBooking Decimal`, `durationAtBooking Int`, `sortOrder Int`.

**ScheduleStatus**: `CANCELLED` é substituído por `CANCELLED_BY_CLIENT` e `CANCELLED_BY_BUSINESS`. Mantidos `PENDING`, `CONFIRMED`, `IN_SERVICE`, `COMPLETED`, `NO_SHOW`.

**NotificationSetting** (nova): `tenantId`, `trigger NotificationTrigger` (`CONFIRMATION`, `REMINDER`, `CHANGE`, `NEW_BOOKING_STAFF`), `channel` (`EMAIL`, `WHATSAPP`), `enabled Boolean`, `leadHours Int?` (só para `REMINDER`: 3, 6, 12, 24, 36 ou 48). `@@unique([tenantId, trigger, channel])`.

**MessageTemplate** (nova): `tenantId`, `trigger`, `channel`, `body String` (até 1500 caracteres), `isActive`. Variáveis: `{cliente}`, `{servico}`, `{data}`, `{hora}`, `{profissional}`, `{negocio}`, `{link_remarcar}`. Sem registro próprio, usa o texto padrão do sistema.

**Course** (nova): `id`, `tenantId`, `title`, `description?`, `coverImage?`, `priceLabel String?` (texto exibido, ex.: "R$ 197" ou "Sob consulta"), `isActive Boolean @default(true)`, `sortOrder Int`.

**CourseLesson** (nova): `id`, `courseId`, `title`, `description?`, `videoUrl String` (URL/embed de YouTube, Vimeo, Drive, Bunny, Panda ou link direto), `sortOrder Int`, `durationMinutes Int?`.

**CourseAccess** (nova): `id`, `courseId`, `clientId`, `grantedAt DateTime @default(now())`, `expiresAt DateTime?`, `isActive Boolean @default(true)`. `@@unique([courseId, clientId])`. Permite à dona do negócio liberar o acesso após receber o pagamento diretamente da aluna (sem intermediação da plataforma).

**Novos enums:** `AssignmentMode` (`AUTO`, `MANAGER`), `AssignmentStrategy` (`PRIORITY`, `BALANCED`, `ROUND_ROBIN`), `PublicTheme` (`LIGHT`, `DARK`), `NotificationTrigger`, `NotificationChannel`.

Campos de funções adiadas (sinal, aniversário, NPS, reativação, fila, pacotes, anamnese) permanecem no schema sem uso.

### 5.2 Proteção contra reserva dupla

**Camada 1, aplicação.** `BookingService.create()` executa numa transação:

1. `SELECT pg_advisory_xact_lock(hashtext(professionalId || ':' || dataLocal))`.
2. Recalcula a disponibilidade do horário pedido com o motor da seção 6.1, lendo os dados dentro da transação.
3. Se indisponível, lança `SlotUnavailableError` (HTTP 409 com os 6 horários livres mais próximos no corpo).
4. Grava `Schedule` e `ScheduleItem`.

**Camada 2, banco.** Migration SQL manual:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Schedule"
  ADD CONSTRAINT schedule_no_overlap
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE (
    "isExclusive"
    AND "professionalId" IS NOT NULL
    AND status IN ('PENDING', 'CONFIRMED', 'IN_SERVICE')
  );
```

Violação dessa restrição é convertida pelo `errorHandler` em 409 com a mesma mensagem da camada 1.

**Idempotência.** `POST` de criação aceita o cabeçalho `Idempotency-Key`; a resposta fica em Redis por 10 minutos e é devolvida em repetições, evitando duplicidade por clique duplo.

---

## 6. Regras de negócio

### 6.1 Motor de horários livres

Módulo puro em `packages/shared/src/scheduling` (sem acesso a banco), alimentado por um repositório na API. Assim o mesmo código serve à API e aos testes.

**Entrada:** serviços escolhidos, profissional (ou qualquer), data local, configurações do tenant, regras de disponibilidade, bloqueios, agendamentos ativos, instante atual.

**Cálculo:**

1. `duracao` = soma das durações dos serviços. `ocupacao` = `duracao + bufferMinutes` (o intervalo é aplicado uma vez, ao fim do atendimento).
2. Profissionais candidatos: ativos e que executam **todos** os serviços do combo.
3. Para cada candidato, janelas do dia = faixas de `AvailabilityRule` do dia da semana, recortadas pela janela opcional de cada serviço (`availableFrom`/`availableUntil`), menos bloqueios (pontuais e recorrentes não pausados, do profissional ou da equipe toda).
4. Inícios candidatos: a partir do começo de cada janela, de `slotIntervalMinutes` em `slotIntervalMinutes`. Com `roundSlotStarts` ligado e `duracao` múltipla de 60, só inícios em hora cheia.
5. Um início é válido se `[inicio, inicio + ocupacao)` cabe inteiro na janela e:
   - para combos com todos os serviços de `capacity = 1`: não se sobrepõe a nenhum agendamento ativo do profissional;
   - para serviço com `capacity > 1`: os agendamentos ativos sobrepostos são todos do mesmo serviço, no mesmo início, e em número menor que `capacity`.
6. Limites: descarta inícios antes de `agora + antecedência mínima` e datas além de `hoje + limite futuro`. Os valores do serviço sobrescrevem os do tenant; em combo, vale o mais restritivo.
7. Resultado: lista de inícios com o profissional que atenderia cada um, agrupada em manhã (antes de 12h), tarde (12h a 18h) e noite (após 18h).

Todos os horários são interpretados no `timezone` do tenant.

### 6.2 Atribuição de profissional

Quando a cliente escolhe "qualquer profissional" ou `hideProfessionalsOnline` está ligado:

- `PRIORITY`: o candidato livre com menor `priority`.
- `BALANCED`: o candidato livre com menos agendamentos ativos futuros; empate, menos agendamentos no dia; novo empate, `priority`.
- `ROUND_ROBIN`: o próximo da ordem de `priority` depois do último atribuído (`Tenant.lastAssignedProfessionalId`); quem está ocupado é pulado sem perder a vez.

Com `assignmentMode = MANAGER`, o profissional escolhido pela estratégia segura o horário, mas o agendamento nasce com `professionalAssignmentPending = true`, aparece como "A atribuir" na agenda e a cliente vê "a definir".

### 6.3 Status

| Origem | Status inicial |
|---|---|
| Link público | `PENDING` se `onlineRequiresConfirmation`, senão `CONFIRMED` |
| Painel | `internalInitialStatus` do tenant |

Transições permitidas: `PENDING → CONFIRMED | CANCELLED_*`; `CONFIRMED → IN_SERVICE | COMPLETED | NO_SHOW | CANCELLED_*`; `IN_SERVICE → COMPLETED`. Status finais não voltam. `NO_SHOW` incrementa `Client.noShowCount`.

Cancelamento pela cliente pelo link pessoal só é permitido até `cancellationPolicyHours` antes do início; depois disso, a página orienta a falar com o negócio pelo WhatsApp.

### 6.4 Notificações

- Disparadas por eventos de domínio (`ScheduleCreated`, `ScheduleChanged`, `ScheduleCancelled`) para a fila `notifications` do BullMQ.
- Lembrete agendado com `delay` calculado no fuso do tenant; ao remarcar ou cancelar, o job anterior é removido pelo id determinístico `reminder:{scheduleId}`.
- WhatsApp sai pelo número do negócio conectado na Evolution; sem conexão, o canal WhatsApp fica indisponível e só o e-mail é enviado.
- Falhas: 5 tentativas com backoff exponencial; falha final registrada e visível no painel.
- Lembrete só é enviado se a cliente consentiu no agendamento.

---

## 7. Painel

### 7.1 Estrutura e Telas do Painel

O painel segue a arquitetura de layout observada nas referências do Guru Agenda: barra lateral expansível/recolhível com logo e navegação, topo com saudação/perfil e botão "Copiar Link da Agenda Pública" com dropdown, e botão flutuante "+" (FAB) para ações rápidas no celular e desktop.

#### 1. Início (Dashboard)
- **Cabeçalho:** Saudação personalizada ("Olá, [Nome]! 👋 - Aqui está um resumo do seu dia") e botão destacado "Copiar Link da Agenda Pública".
- **4 Cards de Métricas / KPIs no topo:**
  1. *Agendamentos Hoje* (Azul, com ícone de calendário).
  2. *Receita do Mês* (Verde, com ícone de moeda e toggle de olho para ocultar/exibir valores).
  3. *% de No-Show* (Laranja, taxa de não comparecimento do mês com toggle).
  4. *Seu Plano* (Card escuro com nome do plano, estrela e atalho "Gerenciar Plano").
- **Tabela "Próximos Agendamentos" (com link "Ver todos ->"):**
  - Colunas: Data/Hora, Cliente (avatar circular com iniciais + nome + telefone), Serviço (ponto colorido de categoria + nome + duração com ícone de ampulheta), Profissional, Status (pill estilizado) e Ações diretas em linha: *Exibir* (olho), *Editar* (lápis), *Concluir* (botão azul de check) e *Cancelar* (botão vermelho com X).
- **Card "⚡ Ações Rápidas":**
  - Botão primário azul: *+ Novo Agendamento*.
  - Botões secundários outline: *+ Cadastrar Cliente*, *Ver Agenda Completa*, *Bloquear Agenda*, *Relatórios*.

#### 2. Calendário / Agenda
- **Barra de Controle Superior:**
  - Status de integração (ex.: indicador verde do Google Agenda quando ativo).
  - Alternância de visualização: *Calendário* vs *Lista*.
  - Seletor de período: *Mês*, *Semana* (padrão) e *Dia*.
- **4 Cards de Resumo Rápido do Período:** Total de Agendamentos, Confirmados, Pendentes e Cancelados.
- **Navegador Temporal:** Botões `< Anterior`, intervalo visível (ex.: `12/10 - 18/10/2026`), `Próximo >` e atalho `Hoje`.
- **Grade Horária (Grid Semanal/Diário):**
  - Colunas por dia com destaque visual no dia atual.
  - Faixa superior de dia inteiro com hachurado/listrado cinza para períodos bloqueados.
  - Grade por hora (08:00 às 19:00+) com agendamentos renderizados como blocos coloridos (cor do serviço/categoria), exibindo horário de início, nome da cliente, serviço e profissional.
  - Clique em qualquer espaço vazio abre o modal de agendamento já com data e hora pré-selecionadas.
- **Barra de Legenda Inferior:**
  - Guia de status (*Pendente, Confirmado, Concluído, Cancelado, Não Compareceu, Bloqueado*).
  - Paleta de cores dos serviços ativos para identificação visual imediata na grade.
- **Botão Flutuante (FAB):** Botão circular azul `+` fixo no canto inferior direito para adicionar agendamento de qualquer ponto da tela.

#### 3. Agendamentos (Gestão em Tabela)
- **Ações de Topo:** Botões *Exportar Excel/CSV*, *Enviar Agendamentos* (WhatsApp em lote) e *Importar*.
- **5 Cards de Métricas do Filtro:** Total, Pendentes (laranja), Confirmados (azul), Concluídos (verde), Cancelados (vermelho).
- **Filtros Rápidos:** Botões pill para *Hoje*, *Esta Semana*, *Este Mês* e menu expansível de *Filtros Avançados* (por profissional, serviço, status).
- **Tabela Completa:**
  - *Data/Hora do atendimento* vs *Agendado em* (instante de criação para auditoria).
  - *Cliente* (nome completo e telefone formatado).
  - *Serviço* (marcador colorido, título e duração).
  - *Profissional* atribuído.
  - *Status* (badge colorido).
- **Paginação:** Exibição com contagem (ex.: "Exibindo 20 de 337 agendamentos") e navegação numerada.

#### 4. Clientes
- **Ações de Topo:** Botões *Importar em Massa* e *Adicionar Cliente* (+).
- **4 Cards de Métricas:** Total Clientes, Novos no Mês, Agendamentos Hoje e Total Pendentes.
- **Barra de Pesquisa Unificada:** Campo de busca rápida com suporte a nome, e-mail, telefone ou CPF, com filtros de status e ordenação personalizada.
- **Tabela de Clientes:**
  - *Nome Completo* com avatar de iniciais em cores rotativas.
  - *E-mail* e *Telefone* com máscara formatada.
  - *CPF* (quando preenchido).
  - *Aniversário* com destaque visual inteligente (ex.: tag verde "Este mês · 52 anos").
  - *Histórico de Agendamentos:* badge com total de atendimentos e contagem de pendências/conclusões.
  - *Ações:* Editar (lápis), Histórico Completo de Atendimentos (relógio) e Inativar/Excluir (lixeira vermelha).

#### 5. Link na Bio (Editor da Página Pública)
- **Barra de Publicação no Topo:** Toggle *Publicada (on/off)*, exibição do link público encurtado (ex.: `marquesuahora.com.br/[slug]`) com botão de copiar em 1 clique.
- **Abas de Edição:**
  1. *Geral:* Nome de exibição (abaixo do avatar), Descrição/Bio (texto curto até 120 caracteres para especialidade e tagline), e upload de Imagem de Capa (área de dropzone com recorte/enquadramento, recomendado 1200x400px).
  2. *Aparência:* Seletor visual de Tema em 2 cards largos (*Claro* e *Escuro*) e paleta de *Cor primária* com presets de 6 cores prontas (Azul, Verde esmeralda, Roxo, Âmbar, Vermelho, Rosa) mais seletor arco-íris para código HEX personalizado livre (`#HEX`).
  3. *Redes Sociais:* Digitação apenas do **nome de usuário** (sem URL completa), com prefixos visuais fixos e ícones nativos:
     - Instagram (`instagram.com/[usuario]`)
     - Facebook (`facebook.com/[pagina]`)
     - TikTok (`tiktok.com/@[perfil]`)
     - YouTube (`youtube.com/@[canal]`)
     - X / Twitter (`x.com/[perfil]`)
     - Redes não preenchidas não aparecem na vitrine pública.
  4. *Agendamento:* Regras de visibilidade do wizard na vitrine pública.
  5. *WhatsApp e Links:*
     - Toggle liga/desliga: *Exibir botão WhatsApp* flutuante.
     - *Links externos:* Até 3 links personalizados com reordenação por arrasto (drag and drop), ícone personalizável, texto do botão, URL destino (`https://...`), checkbox para *Destacar antes do agendamento* (estrela) e botão de remoção.
  6. *Cursos:* Gestão dos cursos próprios da profissional, cadastro de aulas/vídeos e alunas liberadas (`CourseAccess`).
- **Rodapé de Ações:** Botão *Visualizar* (abre a página pública em nova aba) e botão primário *Salvar*.

#### 6. Relatórios & Métricas
- **Filtros Avançados:** Seletor de período (Último Mês, Esta Semana, etc.) e filtro por Profissional da equipe.
- **Visão Geral (Cards com variação % vs. período anterior):** Total de Agendamentos, Receita Total faturada, Minutos totais em atendimento e Notas/Recibos.
- **Métricas Operacionais:** Serviços cadastrados, Novos clientes no período, Total de clientes ativos na base e Clientes inativos (+60 dias, para oportunidade de reengajamento).
- **Métricas Financeiras & Retorno:** Ticket médio, Conversão de faturamento e Taxa de retorno de clientes (fidelização).
- **Métricas de Qualidade:** Taxa de No-Show (não comparecimento) e Taxa de Cancelamento (com detalhamento em percentual: *Cancelados pela Cliente* vs *Cancelados pela Profissional*).
- **Análise Visual (Gráficos):**
  - Gráfico de linha: Evolução temporal de agendamentos ao longo dos meses.
  - Gráfico de pizza/donut: Distribuição por status (Concluídos, Cancelados por profissional, Cancelados por cliente, Confirmados, Pendentes).
  - Gráfico de barras: Top 5 serviços mais rentáveis.
- **Ação de Topo:** Botão *Exportar Relatório*.

#### 7. Perfil & Personalização da Marca
- **Header Card de Identificação:** Avatar circular com foto real, Razão Social / Nome Fantasia, e-mail do proprietário e botão *Remover foto*.
- **Abas do Perfil:**
  1. *Pessoal:* Primeiro nome, Último nome, E-mail do responsável, Telefone celular com DDD e checkbox opcional *"Meu número é internacional"*.
  2. *Estúdio / Negócio:*
     - Foto de perfil pública (upload até 5MB redimensionada automaticamente).
     - Razão Social e Nome Fantasia.
     - Registro Profissional opcional (conselhos de classe: CRM, COREN, etc.).
     - *Link de Agendamento Personalizado:* campo de slug com checagem de disponibilidade em tempo real (*"Link disponível!"* em verde) e exibição do endereço final formatado (`agenda.marquesuahora.com.br/[seu-nome]`).
     - *Link de Avaliação:* URL direta do Google Meu Negócio ou Facebook para coleta de avaliações após o atendimento.
  3. *Endereço:*
     - Campo CEP com botão/badge *Auto-fill* para preenchimento automático.
     - Rua, Número, Complemento, Bairro, Cidade e Estado (UF).
  4. *Personalização:*
     - *Terminologia:* Tipo de Estabelecimento (Estúdio, Salão, Clínica, etc.) e Tipo de Cliente (Cliente, Paciente, Aluna, etc.).
     - *Cores da Vitrine:* Cor Principal (presets + ajuste fino em hexadecimal `#HEX`) e Cor de Fundo da página (Branco, Cinza claro, Creme, Sand `#F2F0EA`).
     - *Controle de Exibição:* Checkbox *"Mostrar preço na página pública"* (liga/desliga visibilidade de preços).
     - *Logo do Estabelecimento:* upload com prévia e recorte antes de salvar.
     - *Banner da Página de Agendamento:* imagem de capa panorâmica (recomendado 1600x640px).
     - *Mensagem de Boas-vindas:* texto de apresentação (até 600 caracteres, primeiras linhas visíveis com "ver mais").
     - *Galeria de Trabalhos Recentes:* grid com até 6 fotos (JPG/PNG até 5MB), exclusão instantânea individual com botão `X` e contador `X/6`.
     - *Privacidade do Endereço:* Checkbox *"Exibir endereço na página pública"* (permite ocultar endereço e "Ver no mapa" para atendimento 100% online ou residencial).
  5. *Suporte:* Exibição de identificadores únicos para suporte técnico (ID de suporte profissional e ID de suporte estúdio).

---

### 7.2 Configurações Operacionais (Navegação Dividida em ESTÚDIO e CONTA)

A barra superior de Configurações divide as abas operacionais em dois grupos claros:

#### Grupo 1: ESTÚDIO

1. **Serviços (Especialidades & Catálogo):**
   - Botão de topo: `+ Nova Especialidade` (cria uma categoria pai com nome e texto descritivo de apresentação).
   - Acordeões recolhíveis por Especialidade/Categoria (ex.: ALONGAMENTOS, BANHO DE GEL, ESMALTAÇÃO EM GEL, MANUTENÇÕES, SPA DOS PÉS), exibindo contagem de serviços, descrição, botões de Editar/Excluir a especialidade e seta expandir/recolher.
   - Lista de Serviços aninhados dentro da categoria:
     - Marcador visual colorido da categoria.
     - Título do serviço + Badge verde `Ativo`.
     - Descrição do procedimento.
     - Profissionais habilitados (ex.: "Todos os profissionais" ou lista nominal).
     - Preço formatado (ex.: `R$ 250,00`) e Duração com ícone de ampulheta (ex.: `1h 30min` ou `2h 30min`).
     - Ações diretas: *Editar* e *Excluir*.
   - Botão no rodapé de cada categoria: `+ Novo Serviço nesta Especialidade`.

2. **Horários (Disponibilidade & Regras de Grade):**
   - *Limites de Agendamento:*
     - Antecedência mínima (horas) para agendamentos online (padrão global, 0 = sem restrição, máx 36h).
     - Limite futuro (dias) para quão longe clientes podem agendar (0 = sem limite, máx 365 dias).
     - Botão *Salvar Limites*.
   - *Sugerir apenas horários fechados (`roundSlotStarts`):*
     - Toggle liga/desliga com explicação de regra: os horários sugeridos passam a cair em marcas redondas (14h00, 15h00, 16h00), abrindo mão de folgas de intervalos quebrados para serviços de 1h ou múltiplos.
   - *Horários Disponíveis (`AvailabilityRule`):*
     - Botão `+ Nova Regra`.
     - Lista de regras por dia da semana em cards limpos (ex.: Terça-feira `10:00 - 17:00`, Quarta-feira `12:00 - 21:00`, Sábado `09:00 - 15:00`).
     - Suporte a múltiplos turnos/faixas no mesmo dia (ex.: manhã e tarde com intervalo de almoço).
     - Ações em cada regra: *Editar* e *Excluir*.

3. **Agendamento (Regras de Reserva & Atribuição):**
   - *Card 1: Campos Obrigatórios no Agendamento:*
     - Toggles individuais para: *E-mail* (para envio de confirmações e recibos), *Telefone* (obrigatório para WhatsApp) e *CPF* (opcional com alerta visual: *"Sem CPF obrigatório, o sistema não conseguirá emitir notas fiscais automaticamente"*).
   - *Card 2: Profissionais no Link de Agendamento:*
     - Toggle: *Ocultar profissionais na escolha de serviços e horários* (desligado por padrão; quando ligado, a cliente só vê horários livres gerais).
     - *Modo de Definição do Profissional:*
       - Radio: **Atribuição automática** (o sistema aloca um profissional livre no ato da reserva).
       - Radio: **O gestor atribui** (o horário é reservado com status provisório *"A atribuir"*, a cliente vê *"a definir"* e o gestor confirma quem atende no painel).
     - *Critério de Atribuição Automática:*
       - Radio: **Por ordem de prioridade** (`PRIORITY`: vai para o profissional livre com menor número de prioridade).
       - Radio: **Sequencial / Equilibra a equipe** (`BALANCED`: rodízio para quem tem menos atendimentos no período).
       - Radio: **Fila sequencial** (`ROUND_ROBIN`: um de cada vez na ordem; quem estiver ocupado é pulado sem perder a vez).
     - *Tabela de Ordem de Prioridade:* lista de colaboradores com campo numérico de prioridade editável diretamente na tabela.
   - *Card 3: Status Inicial dos Agendamentos Internos:*
     - Radio: **Confirmado** (padrão, o agendamento criado no painel ou via WhatsApp já nasce confirmado).
     - Radio: **Pendente** (o agendamento interno nasce pendente para confirmação posterior).
   - *Card 4: Atalho de WhatsApp nos Telefones:*
     - Toggle: *Transformar telefones em link do WhatsApp* (no painel e em tabelas, clicar no telefone abre diretamente a conversa no WhatsApp Web/App).
     - *Mensagem inicial configurável:* campo de texto com suporte a chips/variáveis: `{client_first_name}`, `{client_name}`, `{service_name}`, `{professional_name}`, `{date}`, `{time}`, `{business_name}`.

4. **Bloqueados (`ScheduleBlock`):**
   - *Bloqueios Recorrentes:* botão `+ Novo Bloqueio Recorrente` para travar horários fixos toda semana (ex.: Almoço diário `12:00 - 13:30`, Folgas na segunda-feira), com toggle de pausa temporária sem precisar excluir a regra.
   - *Bloqueios Pontuais:* botão `+ Novo Bloqueio Pontual` para datas ou períodos específicos (ex.: Feriados, Cursos, Férias, Consultas médicas), com campo de motivo visível na agenda.

5. **Equipe (`Professional`):**
   - Contador de utilização de licenças: *"X de 20 vagas do plano em uso"*.
   - Botão `+ Convidar Novo Colaborador` (envio de convite com papel `ADMIN`, `PROFESSIONAL` ou `RECEPTIONIST`).
   - Tabela de colaboradores com foto/cor de identificação, especialidades que executa, prioridade e status.

#### Grupo 2: CONTA

6. **Funcionalidades (Módulos do Sistema):**
   - *Módulos Ativos:* WhatsApp Próprio, Comissões, Fila Online, Anexos no Agendamento, Cupons de Desconto (com botão de *Gerenciar* e *Desativar*).
   - *Disponíveis para Ativação:* Teleatendimento, Notas Fiscais (NFS-e automática), Fichas/Anamnese personalizada, Sinal de Agendamento (PIX antecipado), Calendário Embeddable, Receituário e Prescrições, Capacidade de Serviços e Times, Satisfação do Cliente (NPS).
   - *Disponíveis em Planos Superiores:* API & Webhooks.

7. **Notificações (Matriz de Comunicação com Cliente e Equipe):**
   - Cada gatilho possui toggles independentes para canal **E-mail** e canal **WhatsApp**:
     1. *Confirmação de Agendamento:* enviada à cliente imediatamente após a criação.
     2. *Lembrete de Agendamento:* enviada com antecedência configurável (seletor: 2h, 3h, 6h, 12h, 24h ou 48h antes).
     3. *Alteração de Agendamento:* disparada caso o horário ou serviço seja remarcado pelo painel.
     4. *Novo Agendamento Recebido:* notificação interna com checkboxes para *Notificar profissional que atende* e *Notificar dono do estúdio*.
     5. *Acompanhamento Pós-Agendamento:* mensagem automática de retorno após 30 dias do atendimento concluído.
     6. *Entrada na Fila Online:* envio do link para a cliente acompanhar sua posição na fila.
     7. *Chamada na Fila Online:* aviso de que chegou a vez da cliente com prazo limite para comparecer.
   - Botão fixo no rodapé: *Salvar Configurações*.

8. **WhatsApp:** Conexão de instância via QR Code (Evolution API v2), status em tempo real, desconexão e editor visual de modelos de mensagens com variáveis dinâmicas (`{cliente}`, `{servico}`, `{data}`, `{hora}`, `{profissional}`, `{link_remarcar}`).
9. **Integração:**
   - *Contabilidade (Seu Contador):*
     - Conexão segura para escritórios contábeis: campo de código único do contador (`MARQUE-XXXXXX`).
     - Controle de permissão via radio: *Só ver as notas fiscais* vs *Ver, emitir, agendar e cancelar notas*.
     - Checkbox de consentimento: *"Autorizo este contador a acessar as notas fiscais do meu negócio. Posso desvincular a qualquer momento."*
     - Botão *Vincular contador*.
   - *Parceiro de Marketing (Agência ou Gestor de Tráfego):*
     - Vínculo direto de agência: campo para código do parceiro (`MARQUE-XXXXXX`).
     - Permite ao parceiro gerenciar Facebook Pixel, Google Analytics e tags de conversão diretamente nas páginas públicas (link na bio e agendamento) sem precisar de acesso à agenda ou dados financeiros.

---

### 7.3 Telas Adicionais da Barra Lateral

#### 1. Meu Plano (`/dashboard/planos`)
- **Card Principal da Assinatura:**
  - Identificação: Nome do plano atual (ex.: *Plano Padrão*), badge verde `Ativo` e data de início da assinatura.
  - Informações financeiras: Valor mensal (ex.: `R$ 149,00`) e data da próxima cobrança recorrente.
  - Cartão cadastrado: bandeira e 4 últimos dígitos (`•••• 5134`) com atalho *Atualizar*.
  - Ações: Botão primário *Trocar de Plano* e botão outline vermelho *Cancelar Assinatura*.
- **Uso do Plano no Período Atual (Barras de Progresso e Franquias):**
  - *Colaboradores:* contagem de licenças em uso (ex.: `0 / 20`).
  - *Serviços cadastrados:* barra de progresso (ex.: `18 / 30`).
  - *Especialidades / Categorias:* barra de progresso (ex.: `8 / 15`).
  - *Teleatendimento:* minutos utilizados (ex.: `0 / 6600 min`).
  - *Notas Fiscais:* quota mensal emitida (ex.: `0 / 1000`).
- **Coluna Lateral de Suporte e Histórico:**
  - Card de Upgrade: indicação de utilização e botão *Ver Planos Superiores*.
  - *Histórico de Pagamentos:* lista das últimas faturas com mês, data do pagamento, valor e status `Pago`, com link *Ver Histórico Completo*.
  - Card *Falar com Suporte*.

#### 2. Novidades & Sugestões (`/dashboard/novidades`)
- **Cabeçalho:** Título, explicação sobre o roadmap público e botão primário `+ Sugerir Funcionalidade`.
- **Kanban Interativo de 3 Colunas:**
  1. *Sugestões:* cards enviados por usuários com título, descrição e botão de coração para votação da comunidade (exibe número de votos).
  2. *Em Desenvolvimento:* funcionalidades em construção pelo time de engenharia com data prevista de entrega.
  3. *Entregues:* changelog cronológico das funcionalidades já lançadas e ativas no sistema.

---

## 8. Página pública e Link na Bio (`/{slug}`)

Página única mobile-first e responsiva em 2 colunas no desktop, unindo **Vitrine da Marca**, **Link na Bio** e **Agendamento Online** no padrão de alta conversão observado no Guru Agenda.

### 8.1 Anatomia da Página e Layout Responsivo

#### 1. Topo da Marca (Header Panorâmico)
- **Banner Panorâmico de Capa:** Imagem fotográfica ou arte da profissional (1600x640px) ou gradiente elegante com a paleta da marca.
- **Avatar Sobreposto (Overlapping Avatar):** Foto de perfil circular da profissional (ou logo do estúdio) centralizado na linha de divisão entre a capa e o fundo, com borda branca contrastante.
- **Identificação Principal:**
  - Nome de exibição em destaque (ex.: *Emanuelle Telles unhas*).
  - Categorias / Especialidades em linha destacados na cor da marca (ex.: *ALONGAMENTOS · BANHO DE GEL · ESMALTAÇÃO EM GEL · MANUTENÇÕES*).
  - Mensagem de Boas-vindas / Bio institucional (até 600 caracteres) com link de expansão *"ver mais"*.
  - Ícones de redes sociais ativas (Instagram, WhatsApp, TikTok, etc.) e links externos da bio (quando configurados).

#### 2. Layout em 2 Colunas no Desktop (Empilhado no Celular)

* **Coluna da Esquerda: Vitrine, Prova Social e Confiança**
  1. **Trabalhos Recentes (Galeria 3x2):** Grid com até 6 fotos quadradas de trabalhos reais do negócio com cantos arredondados, permitindo à cliente visualizar a qualidade do serviço no próprio momento da decisão.
  2. **Card de Endereço Físico:** Ícone de localização, endereço completo (Rua, Número, Bairro, Cidade/UF) e link direto sublinhado *"Ver no mapa"* (abre Google Maps). Ocultável no painel caso o negócio atenda exclusivamente a domicílio ou online.
  3. **Card de Segurança e Política:** Aviso padronizado com ícone de alerta: *"Seus dados são protegidos conforme a LGPD. Remarcação sem custo até [X]h antes."*
  4. **Seção de Cursos Próprios (quando houver):** Card elegante com miniatura, título, valor e botão *"Comprar pelo WhatsApp"* para contato direto, além do atalho *"Acessar Minhas Aulas"* para alunas matriculadas.

* **Coluna da Direita: Card do Agendador (Widget em 4 Passos)**
  - Card branco com bordas arredondadas e sombra suave.
  - Indicador de etapas no topo: `Passo 1 de 4` à esquerda, barra de progresso segmentada em 4 barras e nome da etapa à direita (`Motivo`).
  - **Passo 1: Motivo / Especialidade & Serviços:**
    - Título: *"Como podemos te ajudar?"*
    - Subtítulo: *"Escolha a especialidade, o serviço e o profissional desejados."*
    - Seção `ESPECIALIDADE`: Lista em cards limpos com botões de seleção tipo rádio:
      - Título da especialidade em caixa alta e negrito (ex.: *ALONGAMENTOS, BANHO DE GEL, ESMALTAÇÃO EM GEL, MANUTENÇÕES, SPA DOS PÉS*).
      - **Texto explicativo da especialidade:** Breve descrição do procedimento logo abaixo do título para orientar a cliente (ex.: diferença entre alongamento e fortalecimento).
      - Ao selecionar, expande os serviços com preço, duração e seleção de profissional.
  - **Passo 2: Data e Horário:**
    - Calendário interativo no primeiro dia disponível, com horários divididos por turnos (Manhã, Tarde, Noite).
  - **Passo 3: Dados da Cliente:**
    - Telefone com WhatsApp primeiro (autofill), nome completo, e-mail (se obrigatório) e aceite de lembretes.
  - **Passo 4: Confirmação & Resumo:**
    - Resumo dos dados, botão Google Agenda / `.ics` e link seguro para remarcar/cancelar.
  - Card de política no rodapé do widget: *"Remarcação e cancelamento sem custo até [X]h antes. Seus dados são protegidos conforme a LGPD."*
- **Rodapé:** *"Agendamento por Marque Sua Hora"*.

---

## 9. Visual

- **Painel:** paleta fixa da marca Marque Sua Hora; fundo claro, superfícies brancas com borda suave; cor primária para ações e item ativo; cores de status fixas (pendente âmbar, confirmado azul, em atendimento violeta, concluído verde, cancelado vermelho, falta cinza).
- **Página pública:** cor primária e tema claro/escuro escolhidos pelo negócio; cor do texto sobre a primária escolhida automaticamente por contraste (WCAG AA).
- **Componentes:** shadcn/Radix, ícones lucide, uma família tipográfica sem serifa (Inter).
- **Animação:** apenas transições curtas de modal, etapa e confirmação (até 200 ms); sem layout springs nem efeitos decorativos.
- **Código:** páginas atuais servem como referência de conteúdo; o painel é refeito com componentes pequenos em `apps/web/src/components` e `apps/web/src/features/<área>`. Nenhum arquivo de página acima de 300 linhas.

---

## 10. API do MVP (`/api/v1`)

**Públicas**
- `GET /public/:slug` vitrine, categorias, serviços visíveis, profissionais visíveis, configurações públicas
- `GET /public/:slug/calendar?serviceIds&professionalId&month` dias do mês com vaga
- `GET /public/:slug/slots?serviceIds&professionalId&date` horários do dia
- `POST /public/:slug/bookings` criação (com `Idempotency-Key`)
- `GET /public/bookings/:token`, `POST /public/bookings/:token/cancel`, `POST /public/bookings/:token/reschedule`
- `GET /public/:slug/courses` vitrine de cursos disponíveis com dados informativos
- `POST /public/:slug/courses/:courseId/auth` valida acesso da aluna (por telefone/link) e retorna as aulas
- `GET /public/:slug/courses/:courseId/lessons` lista aulas e vídeos para aluna autenticada

**Autenticadas (escopo do tenant do token)**
- `auth`: login, refresh, logout, troca de senha
- `categories`, `services`, `professionals`, `availability-rules`, `blocks`: CRUD
- `schedules`: `GET` por intervalo e filtros, `POST`, `PATCH /:id` (remarcar, trocar profissional, observações), `POST /:id/status`, `GET /export`
- `clients`: lista com busca, detalhe, criação, edição
- `settings`: `GET`/`PATCH` de negócio, agendamento, página pública e notificações
- `templates`: `GET`/`PUT`/`DELETE` (restaurar padrão)
- `courses`: CRUD de cursos, CRUD de aulas (`CourseLesson`) e gestão de alunas com acesso liberado (`CourseAccess`)
- `whatsapp`: conectar (QR), status, desconectar
- `dashboard/summary`

**Integração**
- `POST /webhooks/whatsapp/:instanceToken`

Todas as entradas validadas com schemas Zod de `packages/shared`.

---

## 11. Testes

- **Unitários (Vitest), motor de horários:** combos, regras com várias faixas, bloqueios recorrentes e pausados, janela por serviço, horas cheias, vagas por horário, antecedência e limite futuro, servidor em UTC com tenant em `America/Sao_Paulo`, virada de dia às 21h–23h locais.
- **Integração com Postgres real** (container de teste): concorrência (C1), restrição de exclusão, transições de status, cálculo de preço no servidor (C2), não sobrescrita de cliente (C8).
- **Isolamento de tenant:** teste gerado para cada rota autenticada com id na URL (C3).
- **Segurança:** webhook sem token (C4), boot sem segredos (C5), rota protegida sem token (C9).
- **E2E (Playwright):** agendamento público completo; criação, remarcação e cancelamento no painel; cancelamento pelo link pessoal.

---

## 12. Etapas de implementação

Cada etapa só termina com testes passando e verificação manual do fluxo.

| Etapa | Conteúdo | Pronto quando |
|---|---|---|
| 0. Base | Monorepo completo, Docker Compose, migrations do zero, validação de ambiente, prefixo `/api/v1`, CORS restrito, `NEXT_PUBLIC_API_URL` | `pnpm install && docker compose up` sobe tudo; C5 e C9 testados |
| 1. Núcleo | Schema da seção 5, motor 6.1, `BookingService` com trava 5.2, atribuição 6.2, status 6.3, escopo de tenant | Testes da seção 11 para C1, C2, C3, C6, C8 passando |
| 2. Painel | Layout, Configurações (todas as abas exceto WhatsApp), Agenda, Agendamentos, Clientes, Início | Negócio de teste configurado e agenda gerida só pelo painel |
| 3. Páginas públicas | Vitrine (`/{slug}`), wizard de agendamento em 4 passos, link pessoal, editor do Link na Bio, vitrine de cursos e Landing Page institucional (`/`) com 14 blocos | E2E do agendamento público passando; curso ativo aparece na vitrine; landing page com comparativo e mockups ativa |
| 4. Notificações | E-mail, Evolution, aba WhatsApp, modelos, fila com retentativas, webhook autenticado (C4) | Confirmação e lembrete recebidos no WhatsApp de teste no horário certo |
| 5. Lançamento | `docker-compose.prod.yml`, backup diário verificado, monitoramento de erros, primeiro negócio real | Um negócio real agendando por uma semana sem incidente |

---

## 13. Decisões e alternativas descartadas

- **Manter Fastify + Prisma em vez de migrar para Next.js monolito com Drizzle:** o projeto já está estruturado assim e a separação favorece o worker e o futuro app móvel.
- **Página pública única em vez de Link na Bio e agendamento separados:** menos telas e um único link para divulgar.
- **Trava em duas camadas em vez de só Redis:** a restrição no banco garante a regra mesmo com erro na aplicação; a trava consultiva cobre serviços com várias vagas, que a restrição não alcança.
- **Uma cor primária por negócio em vez de cinco temas:** menos código e nenhuma combinação ilegível.
- **Refazer o painel em vez de conectar as páginas atuais à API:** arquivos de 60 a 120 KB com dados simulados custam mais para adaptar do que para reconstruir com componentes.
- **Sinal via PIX fora do MVP:** só volta integrado de verdade com Asaas, nunca com código gerado à mão.
- **Cursos online com hospedagem/incorporação direta sem intermediação financeira:** o negócio cadastra seus vídeos (YouTube não listado, Vimeo, Google Drive, Panda, Bunny ou MP4 direto) e vende direto para as clientes (via WhatsApp/PIX próprio). A plataforma não cobra comissão, não retém valores e não depende de plataformas externas (Hotmart/Kiwify).

---

## 14. Cursos online (Direto com o Negócio, Sem Plataforma Externa)

**Quem vende e entrega:** os próprios negócios cadastrados para suas alunas e clientes (ex.: manicure vendendo curso de cutilagem russa, barbeiro vendendo técnica de fade). A plataforma Marque Sua Hora **não intermedeia pagamentos nem cobra comissões**.

### Como funciona no MVP:

1. **Cadastro de Cursos e Aulas no Painel:**
   - A profissional cria o Curso com título, descrição, foto de capa e valor (rótulo informativo).
   - Cadastra as Aulas (`CourseLesson`) com título, descrição opcional e URL do vídeo (suporta links e embeds: YouTube não listado, Vimeo, Google Drive, Panda Video, Bunny ou link direto).
   - Reordena as aulas conforme a sequência pedagógica.
2. **Venda e Pagamento Direto:**
   - Na página pública (`/{slug}`), o curso é exibido na vitrine com o valor e o botão "Comprar pelo WhatsApp", que abre conversa direta no WhatsApp do estabelecimento para que a cliente pague (PIX, dinheiro ou maquininha própria da profissional).
   - A plataforma Marque Sua Hora tem **zero intervenção financeira** (sem split, sem taxas de gateway, sem risco de chargeback).
3. **Liberação de Acesso e Player de Aulas:**
   - A profissional clica em "Liberar Acesso" no painel e vincula a cliente (pelo telefone/cadastro existente em `CourseAccess`).
   - A cliente acessa a área de aulas (via identificação por telefone com código SMS/WhatsApp ou link pessoal do agendamento) e assiste aos vídeos diretamente no navegador em um player limpo e responsivo.
   - A profissional pode suspender ou revogar o acesso a qualquer momento.

### Relação com a agenda

Aulas e mentorias ao vivo, presenciais ou online, não dependem deste módulo: são serviços com `capacity > 1` na agenda.

---

## 15. Landing Page Institucional (`apps/web/src/app/page.tsx`)

A porta de entrada comercial do produto adota as melhores práticas de autoridade e copywriting observadas no benchmark (Guru Agenda), unindo a seriedade corporativa com elementos interativos e os diferenciais exclusivos do Marque Sua Hora.

### 15.1 Estrutura em 14 Blocos de Alta Conversão

1. **Faixa de Novidades (Announcement Bar):** Faixa sutil no topo com gradiente suave anunciando novidades (ex.: *"Novo: Venda seus próprios Cursos e Aulas pelo link da bio · Teste 7 dias grátis"*).
2. **Navegação (Header Glassmorphism):**
   - Logo oficial imponente com contraste perfeito.
   - Links de ancoragem: *Recursos, Nichos, Calculadora, Planos, FAQ*.
   - Ações à direita: Botão *Entrar* e botão primário com brilho suave *Começar Grátis*.
3. **Hero Section (Impacto & Visão Geral):**
   - Pill badge de categoria: *"✨ A plataforma completa para o seu negócio"*.
   - Headline: **"Centralize sua agenda, clientes e cursos em um só lugar."**
   - Subtítulo direto: *"Elimine o caos do WhatsApp, reduza faltas em até 85% e receba agendamentos 24 horas por dia no celular ou computador."*
   - CTAs duplos: Botão primário com gradiente *"Começar no Plano Gratuito"* e botão outline *"Ver demonstração interativa"*.
   - Mini pill de prova social e confiança (*"Sem cartão de crédito · Configuração em 2 minutos"*).
   - **Mockup do Produto em Desktop (MacBook):** Imagem em alta definição da tela de Calendário Semanal com cards de agendamento coloridos por serviço e botões de alternância (*Semana, Dia, Mês*).
4. **Bento Grid de Recursos ("Tudo que você precisa em um só lugar"):**
   - Grid moderno com 6 cards destacando as ferramentas essenciais:
     1. *Agendamento Online 24/7:* Link na bio personalizável com fotos dos seus trabalhos.
     2. *Lembretes Automáticos por WhatsApp:* Confirmações e avisos automáticos anti-falta sem custo adicional.
     3. *Cursos e Aulas Próprias (Exclusivo):* Venda direta dos seus vídeos e técnicas para clientes e alunas sem intermediação e sem taxas.
     4. *Gestão Completa de Clientes:* Histórico de atendimentos, aniversários e preferências.
     5. *Equipe e Colaboradores:* Distribuição automática de horários e controle de vagas.
     6. *Relatórios & Métricas Operacionais:* Faturamento, taxa de ocupação e índice de faltas em tempo real.
5. **Demonstração Interativa do Celular (iPhone Mockup):**
   - Simulador interativo em tempo real onde a visitante pode clicar no celular, escolher um serviço, um horário e experimentar o fluxo de agendamento em 30 segundos exatamente como suas clientes experimentarão.
6. **Carrossel de Nichos Atendidos (Identificação Imediata):**
   - Cards com fotografia profissional de alta qualidade:
     - *Nail Designers & Manicures*
     - *Salões de Beleza & Cabeleireiras*
     - *Barbearias*
     - *Clínicas de Estética & Spa*
     - *Tatuagem & Piercing*
     - *Personal Trainers & Aulas*
     - *Profissionais da Saúde & Terapeutas*
7. **Calculadora Interativa de Perda por No-Show:**
   - Sliders de atendimento/dia, valor médio e taxa de faltas.
   - Cálculo em tempo real do prejuízo mensal e quanto a profissional recupera ao utilizar lembretes automáticos de confirmação.
8. **Bloco de Segurança & LGPD (Dark Section Institucional):**
   - Seção de fundo escuro imponente transmitindo máxima autoridade:
   - Título: *"Seus dados e os das suas clientes protegidos com a LGPD"*.
   - 4 pilares técnicos destacados:
     - Criptografia ponta a ponta e senhas com hash seguro Argon2.
     - Servidores dedicados de alta disponibilidade com backups automáticos diários.
     - Conformidade total com a Lei Geral de Proteção de Dados (LGPD).
     - Controle estrito de acesso por perfis (Dono do Estúdio, Profissionais e Recepção).
9. **Depoimentos & Prova Social (Grid de Avaliações):**
   - Cards de depoimentos com avaliação 5 estrelas, foto real, nome e nicho da profissional.
10. **Tabela Comparativa Matadora ("Por que o Marque Sua Hora é diferente"):**
    - Comparativo direto entre **Marque Sua Hora** (coluna destacada em roxo/índigo com checks verdes) vs **Outros Sistemas** (com "cobrado à parte" ou "não possui"):
      - Lembretes automáticos no WhatsApp inclusos.
      - Vitrine pública com galeria de trabalhos reais (grid 3x2).
      - Módulo de Cursos Online para alunas sem taxa de plataforma.
      - Sem necessidade de a cliente baixar aplicativo.
      - Suporte humano via WhatsApp.
11. **Tabela de Preços Transparente:**
    - Toggle de pagamento: **Mensal** vs **Anual (com 20% de desconto)**.
    - 3 planos calibrados: *Gratuito (para começar)*, *Profissional Solo* e *Equipe Pro*.
12. **FAQ em Acordeão (Quebra de Objeções):**
    - Perguntas e respostas objetivas para destravar o cadastro imediato:
      - *"Preciso cadastrar cartão de crédito para testar?"*
      - *"Meus clientes precisam baixar algum aplicativo para agendar?"*
      - *"Como funciona o envio de mensagens pelo WhatsApp?"*
      - *"Posso cadastrar mais de um profissional na minha equipe?"*
      - *"Como funciona a vitrine de cursos online?"*
      - *"Posso cancelar a qualquer momento?"*
13. **Chamada Final para Ação (CTA Banner):**
    - Card com fundo escuro e iluminação sutil: *"Pronto para organizar sua agenda e faturar mais?"*, com botão destacado *"Começar Agora Grátis"*.
14. **Rodapé Oficial:**
    - Logo, links institucionais, políticas de privacidade, termos de uso e copyright.
