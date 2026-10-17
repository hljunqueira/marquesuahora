# Plano de Implementação — Refatoração de Modais, Agenda Inteligente e Vitrine Responsiva

---

## 1. Visão Geral e Objetivos

Este plano estabelece a arquitetura e o passo a passo para atender às três diretrizes prioritárias:

1. **Padronização e Expansão dos Modais em Grid de 4 Colunas:**
   - Eliminar modais estreitos (`max-w-md`) que provocam rolagem excessiva.
   - Expandir a largura para `max-w-4xl` / `max-w-5xl` com **grid de 4 colunas compacto no desktop** (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`).
   - Adaptação mobile nativa: preenchimento responsivo (`w-full`), rolagem vertical fluida, botões táteis no rodapé e toques com feedback físico.
2. **Vitrine Pública (`/[slug]`): Responsividade Web/Mobile e Regra Estrita de Ícones:**
   - **Na Web (Desktop):** Expandir para `max-w-5xl` / `max-w-6xl` com grid de 2 a 3 colunas para catálogo de serviços e produtos, aproveitando o espaço com estética de luxo *Impeccable*.
   - **No Mobile:** Compactação visual (`p-3`, cards horizontais condensados, imagens menores e fontes ajustadas).
   - **Regra de Ícones:** Eliminar ícones coloridos ou estilo emoji; manter apenas ícones vetoriais sutis, monocromáticos ou de acento da marca (`brand-purple` / `emerald`).
3. **Agenda Inteligente com Agendamento ao Clicar no Dia, Filtros Temporais e Diária por Profissional:**
   - **Agendar ao Clicar no Dia:** Ao clicar em qualquer dia do mês ou da fita semanal, abrir imediatamente a criação de agendamento pré-preenchendo a data selecionada.
   - **Filtro Temporal Trimodal:** Alternador de visualização `[ 📅 Dia / Hoje ]` | `[ 📆 Esta Semana ]` | `[ 🗓️ Mês Completo ]`.
   - **Refatoração da Tab "Diária por Profissional":** Visão em colunas simultâneas lado a lado para cada membro da equipe, com blocos horários contínuos (08:00 às 20:00), status color-coded, conclusão com ajuste de valor na hora e clique em slot vago para agendar instantaneamente.

---

## 2. Mapeamento Completo de Todos os Modais da Plataforma

| Localização / Arquivo | Modal | Largura Nova | Grid Desktop | Adaptação Mobile | Recursos Especiais Incorporados |
|---|---|---|---|---|---|
| **`apps/web/src/app/dashboard/agenda/page.tsx`** | **Novo Agendamento** | `max-w-4xl` | 4 colunas (`Cliente/Cadastro Rápido`, `Serviço/Combo`, `Profissional`, `Data/Horário`) | 1 coluna, stepper tátil | • Modo inline `"Novo Cliente"` sem sair da agenda.<br>• Filtro de profissionais por especialidade do serviço.<br>• Cálculo em tempo real de duração e término. |
| **`apps/web/src/app/dashboard/agenda/page.tsx`** | **Conclusão de Atendimento** | `max-w-4xl` | 4 colunas (`Resumo/Status`, `Ajuste de Valor`, `Forma de Pagamento`, `Lançamento Caixa/Crediário`) | 1 coluna com botões de pagamento em grade 2x2 | • Ajuste fino de valor na hora (+/- acréscimos ou descontos).<br>• Lançamento direto no Crediário com parcelas.<br>• Baixa automática no fluxo de caixa. |
| **`apps/web/src/app/dashboard/agenda/page.tsx`** | **Cancelamento de Atendimento** | `max-w-2xl` | 2 colunas (`Dados do Horário`, `Motivo Obrigatório & Destino`) | 1 coluna vertical | • Coleta motivo para retenção/CRM.<br>• Opção de liberar vaga para Lista de Espera instantaneamente. |
| **`apps/web/src/app/dashboard/agenda/page.tsx`** | **Bloqueio Rápido (`ScheduleBlock`)** | `max-w-3xl` | 3 colunas (`Profissional`, `Horário Início/Fim`, `Motivo: Almoço/Pausa/Médico`) | 1 coluna | • Bloqueia horários da grade sem criar falsas receitas. |
| **`apps/web/src/app/dashboard/financeiro/page.tsx`** | **Nova Entrada / Receita** | `max-w-4xl` | 4 colunas (`Descrição/Cliente`, `Valor R$`, `Categoria`, `Forma de Pagamento/Data`) | 1 coluna compacta | • Vinculação com clientes e serviços.<br>• Invalidação imediata do fluxo de caixa. |
| **`apps/web/src/app/dashboard/financeiro/page.tsx`** | **Nova Despesa** | `max-w-4xl` | 4 colunas (`Fornecedor/Credor`, `Valor R$`, `Categoria Fixa/Variável`, `Vencimento/Comprovante`) | 1 coluna compacta | • Categorias: Aluguel, Luz/Água, Fornecedores, Salários, Impostos, Insumos. |
| **`apps/web/src/app/dashboard/financeiro/page.tsx`** | **Estorno Formal de Transação** | `max-w-3xl` | 2 colunas (`Detalhes da Transação`, `Justificativa Obrigatória & Auditoria`) | 1 coluna | • Reabre agendamento associado se necessário e estorna saldo do caixa com histórico. |
| **`apps/web/src/app/dashboard/financeiro/page.tsx`** | **Edição de Transação** | `max-w-4xl` | 4 colunas (`Descrição`, `Valor Ajustado`, `Categoria`, `Forma Pagamento`) | 1 coluna | • Permite corrigir lançamentos com recálculo do DRE. |
| **`apps/web/src/app/dashboard/financeiro/page.tsx`** | **Recebimento de Crediário** | `max-w-4xl` | 3 colunas (`Cliente/Saldo Devedor`, `Tipo: Parcela/Total/Amortização`, `Forma Pagamento`) | 1 coluna | • Baixa parcial ou total com emissão de recibo. |
| **`apps/web/src/app/dashboard/produtos/page.tsx`** | **Cadastro/Edição de Produto** | `max-w-5xl` | 4 colunas (`Dados Básicos/SKU`, `Preço Custo/Venda/Margem %`, `Estoque/Alerta Mínimo`, `Imagem/Vitrine Toggle`) | 1 coluna com preview de imagem compacto | • Cálculo automático de Markup e Margem de Lucro %.<br>• Toggle "Exibir na Vitrine Pública". |
| **`apps/web/src/app/dashboard/produtos/page.tsx`** | **Movimentação de Estoque** | `max-w-4xl` | 4 colunas (`Produto/Estoque Atual`, `Tipo: Entrada/Saída/Ajuste`, `Quantidade`, `Motivo/Nota Fiscal`) | 1 coluna | • Histórico de movimentações auditável. |
| **`apps/web/src/app/dashboard/clientes/page.tsx`** | **Cadastro/Edição de Cliente** | `max-w-4xl` | 4 colunas (`Nome/CPF`, `WhatsApp/Email`, `Nascimento/Aniversário`, `Endereço/Serviço Preferido`) | 1 coluna com InputMask | • Máscaras de telefone e CPF reativas sem saltos. |
| **`apps/web/src/app/dashboard/clientes/page.tsx`** | **Sheet 360° do Cliente** | `max-w-3xl` (Drawer) | Grid 2x2 KPIs de topo + Abas de Histórico | Drawer inferior no mobile | • Histórico de agendamentos, compras de produtos, crediário e LTV. |
| **`apps/web/src/app/[slug]/page.tsx` (Vitrine)** | **Checkout / Finalizar Reserva** | `max-w-4xl` | 2 blocos (Esquerda: Resumo dos Itens e Valores; Direita: Grid 2 colunas com Nome, WhatsApp, Notas e Sinal) | 1 coluna vertical com botão fixo | • Proteção No-Show Shield.<br>• Zero fricção sem login ou senha. |
| **`apps/web/src/app/[slug]/page.tsx` (Vitrine)** | **Sinal PIX Asaas (15 Minutos)** | `max-w-2xl` | 2 colunas (`QR Code/Instruções`, `Copia e Cola/Timer 15min`) | 1 coluna | • Timer regressivo ao vivo com botão de cópia tátil. |
| **`apps/web/src/app/[slug]/page.tsx` (Vitrine)** | **Sucesso Dopamínico** | `max-w-2xl` | Bloco único central com grid de resumo | 1 coluna | • Checkmark SVG animado + Download `.ics` + WhatsApp. |
| **`apps/web/src/components/niche/*`** | **Modais Especializados de Nicho** | `max-w-2xl` / `max-w-3xl` | Grid 2 colunas compacto | 1 coluna | • `NoShowShieldModal`, `WaitlistModal`, `BarberModals`, `SalonModals`, `AestheticsModals`, `LashNailModals`, `PersonalModals`. |

---

## 3. Plano de Execução em Fases

### Fase 1: Agenda Inteligente (Filtro por Dia/Semana/Mês, Agendamento ao Clicar no Dia e Diária por Profissional)
* **Arquivo:** `apps/web/src/app/dashboard/agenda/page.tsx`
* **Tarefas:**
  1. **Seletor de Visão Trimodal:**
     - Adicionar abas deslizantes Apple-style: `Dia` | `Semana` | `Mês`.
  2. **Agendamento ao Clicar no Dia:**
     - No calendário mensal: ao clicar em um dia específico, abrir o modal de agendamento já com a data pré-selecionada (e opção de ver a diária do dia).
     - Na fita semanal: ao clicar no dia, alternar a visão para aquele dia e destacar as vagas.
  3. **Refatoração da Tab "Diária por Profissional":**
     - Em modo `DAY`, exibir colunas simultâneas para cada profissional da equipe (`Carlos Barbeiro`, `Juliana Silva`, `Lucas Hair`).
     - Alinhar grade horária de 08:00 às 20:00 com resolução de 30min.
     - Células vazias com botão hover `+ Agendar` que abre o modal pré-selecionando o profissional, a data e a hora do clique.
     - Cards de atendimento com status visual pulsante, dados do cliente e botão de conclusão rápida.
  4. **Modais da Agenda em Grid de 4 Colunas:**
     - Modal de Novo Agendamento: Grid de 4 colunas (`max-w-4xl`) com cadastro rápido de cliente.
     - Modal de Conclusão: Grid compacto com ajuste de valor na hora e forma de pagamento.
     - Modal de Cancelamento com motivo.

### Fase 2: Vitrine Pública Responsiva (`/[slug]`) e Regra de Ícones
* **Arquivo:** `apps/web/src/app/[slug]/page.tsx`
* **Tarefas:**
  1. **Expansão na Web e Compactação no Mobile:**
     - Web (desktop `lg` e `xl`): expandir container para `max-w-5xl` / `max-w-6xl`.
     - Catálogo de serviços em cards amplos com 2 colunas.
     - Catálogo de produtos em grid de 3 a 4 colunas com imagens de produto limpas e botão de adicionar.
     - Mobile (`< 768px`): compactar paddings (`px-3`), cards horizontais de serviços e produtos de 2 colunas compactas.
  2. **Regra Estrita de Ícones na Vitrine:**
     - Remover qualquer ícone ruidoso ou infantil.
     - Padronizar ícones Lucide minimalistas em tamanho proporcional (`w-3.5 h-3.5` e `w-4 h-4`) e cores harmônicas da paleta (`text-slate-400`, `text-brand-purple`, `text-emerald-600`).
  3. **Modais da Vitrine em Formato Compacto e Largo:**
     - Modal de Checkout: `max-w-4xl` com resumo à esquerda e formulário em 2 colunas à direita.
     - Modal de Sinal PIX: `max-w-2xl` com QR Code e código Copia e Cola com timer de 15 minutos.

### Fase 3: Modais do Financeiro e Gestão de Produtos
* **Arquivos:** `apps/web/src/app/dashboard/financeiro/page.tsx` e `apps/web/src/app/dashboard/produtos/page.tsx`
* **Tarefas:**
  1. **Financeiro:**
     - Modal de Nova Entrada e Nova Despesa em `max-w-4xl` com grid de 4 colunas.
     - Modal de Estorno formal com justificativa e reabertura de agendamento.
     - Filtro por período customizado (Data Início e Data Fim).
  2. **Produtos:**
     - Modal de Cadastro/Edição em `max-w-5xl` com grid de 4 colunas (Preço de Custo, Venda e cálculo automático de Margem de Lucro %).
     - Modal de Movimentação de Estoque (Entrada/Saída/Ajuste).
     - Exportação e Importação de Produtos em CSV.

### Fase 4: Validação, Testes e Verificação Visual
* **Tarefas:**
  1. Checagem de tipagem com `npx tsc --noEmit` em `apps/web`.
  2. Execução da suíte de testes com `pnpm test`.
  3. Verificação no navegador com `browser_subagent` em viewport desktop (1536x730) e viewport mobile (375x667).

---

## 4. Critérios de Aceite

1. ✅ **Modais Expandidos e Compactos:** Todos os modais principais usam `max-w-4xl` a `max-w-5xl`, possuem grid de 4 colunas no desktop, são compactos em altura e adaptam perfeitamente para 1 coluna no mobile.
2. ✅ **Agenda Responsiva & Diária por Profissional:**
   - Clicar em qualquer dia do mês ou da semana abre/prepara o agendamento daquela data.
   - Alternador de visão `Dia`, `Semana` e `Mês` funciona instantaneamente.
   - Visão diária divide os horários em colunas dedicadas por profissional da equipe.
   - Células vazias permitem agendar com 1 clique.
3. ✅ **Vitrine Pública de Luxo:**
   - No desktop, a vitrine se expande aproveitando a tela com grid de até 3 colunas de produtos e 2 colunas de serviços.
   - No mobile, a interface se compacta sem quebras ou rolagem lateral.
   - Ícones são discretos, profissionais e minimalistas.
4. ✅ **Testes e Build:** 100% dos testes passam sem regressões.
