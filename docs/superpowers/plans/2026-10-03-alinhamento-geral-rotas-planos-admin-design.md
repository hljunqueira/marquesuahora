# Plano de Alinhamento Geral: Documentação vs. Código, Painel Admin Fundo Branco e Conexão de Rotas aos Planos

> **Para agentes executores:** SUB-SKILL REQUERIDA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano passo a passo. As tarefas utilizam marcação de checkboxes (`- [ ]`) para acompanhamento em tempo real.

**Objetivo:** Realizar a comparação detalhada entre a documentação de arquitetura/PRD e o código atual, unificar a identidade visual do Painel Super Admin (`/admin`) para fundo branco (`#FAF9F7`) no mesmo padrão de luxo e sofisticação do painel do assinante (`/dashboard`), e conectar as restrições dos 4 planos comerciais em todas as rotas operacionais do sistema e na vitrine pública.

**Arquitetura:** 
1. Modernização do Design System do Admin: migração completa dos arquivos sob `apps/web/src/app/admin` do tema escuro (`bg-[#080B11]`) para o padrão Ivory Light (`bg-[#FAF9F7]` + cartões brancos `bg-white`, bordas `border-slate-200/80`, sombras `shadow-2xs` e tipografia em ardósia `text-slate-900`/`text-slate-600`).
2. Enforcement de Planos Reativo no Dashboard: aplicar cotas de profissionais (Gratuito: 1, Solo: 3, Equipe: 5, VIP: 10), bloqueio/aviso amigável de produtos e comissões no Plano Gratuito, e lembretes automáticos restritos ao VIP.
3. Vitrine e Onboarding Integrados: garantir que a experiência pública (`/[slug]` e `/onboarding`) reflita com precisão os 4 planos vigentes sem resquícios de "teste gratuito".

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Motion (framer-motion), Lucide Icons, Vitest.

---

## 1. Comparativo: Documentação (PRD/TRD) vs. Estado Atual do Projeto

| Funcionalidade da Especificação | Estado no Código | O que falta / O que requer ajuste |
| :--- | :--- | :--- |
| **1. Agendamento Público & Combos (`/[slug]`)** | **95% Concluído** | Validar que a aba "Produtos" só é visível se o plano permitir (`hasProducts: true`). |
| **2. Lembretes no WhatsApp (24h/12h)** | **90% Concluído** | Lembretes automáticos devem ser exclusivos do plano VIP (R$ 89,90); demais planos utilizam link manual `wa.me`. |
| **3. Ficha de Anamnese Digital** | **90% Concluído** | Presente nos modais de nicho e CRM; manter coerência com planos comerciais. |
| **4. Fechamento de Caixa e Comissões** | **90% Concluído** | Deixar explícito no Financeiro que rateio/comissões automáticas são recursos de Equipe Pro e VIP. |
| **5. Atendente IA 24/7 (Jev + Gemini)** | **90% Concluído** | Exclusivo do plano Império VIP & IA; integrado ao webhook. |
| **6. Agenda Inteligente & Anti-Overbooking** | **100% Concluído** | Visões dia/semana/mês, colunas por profissional, drag-and-drop e bloqueio de intervalos operacionais. |
| **7. Aniversariantes & CRM Humanizer** | **90% Concluído** | Disparo de mensagens acolhedoras configurável no painel; badges ativas na agenda. |
| **8. Onboarding por Nicho (5 Passos)** | **95% Concluído** | Alinhar textos para "Plano Gratuito" (sem menção a "teste de 7 dias"). |
| **9. Reserva Garantida via Sinal PIX** | **95% Concluído** | Configuração no painel (`/dashboard/configuracoes`) e trava temporária na vitrine pública. |
| **10. Waitlist Inteligente (Fila de Espera)** | **85% Concluído** | Modelo de dados e visualização básica na agenda; polimento de notificações. |
| **11. Reativação de Clientes Sumidos** | **85% Concluído** | Métrica `avgVisitDays` configurada na aba CRM de configurações. |
| **12. Pesquisa de Satisfação NPS (WhatsApp)** | **90% Concluído** | Aba Reputação & Google Maps no dashboard; aviso de que envio automático é VIP. |
| **13. No-Show Shield (Proteção de Falhas)** | **95% Concluído** | Modais de nicho e bloqueio amigável implementados em Barber, Salon e Clinic. |
| **14. Configurações Completas da Loja** | **95% Concluído** | 7 abas funcionais no painel do assinante com sincronização local. |
| **15. Painel Super Admin (`/admin`)** | **70% Concluído** | **Crítico:** Migrar todo o Admin do fundo escuro (`bg-[#080B11]`) para **fundo branco / design do assinante (`bg-[#FAF9F7]`)**. |
| **16. Central de Suporte & Chamados** | **95% Concluído** | Identificação pré-chat por nome/whatsapp, categorização (Suporte/Melhoria/Financeiro) e emojis nativos. |

---

## 2. Mapa de Arquivos a Serem Modificados

### Painel Super Admin (Conversão para Fundo Branco e Design do Assinante):
- `apps/web/src/app/admin/layout.tsx`: Layout mestre com sidebar clara (`bg-white`), navegação com pílulas arredondadas, badges de controle global elegantes e fundo principal `bg-[#FAF9F7]`.
- `apps/web/src/app/admin/page.tsx`: Visão Global & MRR com cartões brancos (`bg-white rounded-3xl border border-slate-200/80 shadow-2xs`), números legíveis em fonte mono e gráficos/KPIs claros.
- `apps/web/src/app/admin/planos/page.tsx`: Editor de Planos com cards brancos, grid responsivo de 4 colunas (`lg:grid-cols-4`), modal de edição claro com backdrop sutil e sem referências a teste.
- `apps/web/src/app/admin/saloes/page.tsx`: Tabela de Lojas & Assinantes com filtros modernos, badges de status claras (Ativo, Gratuito, Bloqueado) e modal de bloqueio claro.
- `apps/web/src/app/admin/suporte/page.tsx`: Central de Chamados com lista de tickets em cartões brancos, chat com fundo claro e player de voz moderno.
- `apps/web/src/app/admin/auditoria/page.tsx`: Trilha de Auditoria com visual claro e organizado.

### Dashboard do Assinante (Enforcement de Planos & Limites):
- `apps/web/src/app/dashboard/equipe/page.tsx`: Validação do limite de profissionais baseado no plano ativo (`marquesuahora_tenant_plan_code`), exibição da cota (ex: 1/1 no Gratuito, 3 no Solo, 5 no Pro, 10 no VIP) e banner amigável de upgrade ao atingir o teto.
- `apps/web/src/app/dashboard/produtos/page.tsx`: Banner explicativo quando no Plano Gratuito informando que produtos e estoque online estão liberados a partir do Equipe Pro, com botão para upgrade.
- `apps/web/src/app/dashboard/financeiro/page.tsx`: Destaque de que comissões automáticas são a partir do plano Equipe Pro.
- `apps/web/src/app/dashboard/configuracoes/page.tsx`: Aviso de que automações de WhatsApp e NPS automático são exclusivas do plano VIP.

### Vitrine Pública e Onboarding:
- `apps/web/src/app/onboarding/page.tsx`: Alinhamento textual para reforçar o início no Plano Gratuito sem cartão de crédito.
- `apps/web/src/app/[slug]/page.tsx`: Reforço na integração de planos (ocultando aba de produtos quando no plano gratuito).

---

## 3. Tarefas de Implementação

### Tarefa 1: Migração Visual do Layout do Super Admin (`admin/layout.tsx`)
- [ ] Alterar fundo geral de `bg-[#080B11]` para `bg-[#FAF9F7]` e texto padrão para `text-slate-900`.
- [ ] Reformular a sidebar lateral para `bg-white border-r border-slate-200/80`.
- [ ] Aplicar logo com imagem oficial colorida (sem filtro `brightness-0 invert`).
- [ ] Atualizar navegação com botões táteis no estilo do assinante (`hover:bg-slate-100`, ativo com fundo lilás/âmbar suave ou `bg-purple-600 text-white`).
- [ ] Atualizar rodapé da sidebar com links para "Ver Painel Assinante" e "Sair".

### Tarefa 2: Migração Visual da Visão Geral do Admin (`admin/page.tsx`)
- [ ] Converter os 4 cards de KPIs para `bg-white rounded-3xl border border-slate-200/80 shadow-2xs text-slate-900`.
- [ ] Ajustar textos de métricas secundárias (`text-slate-500` e indicadores em `text-emerald-600` e `text-amber-600`).
- [ ] Mudar texto de lojas em teste para "no plano gratuito".
- [ ] Adequar os cards de Infraestrutura (Instâncias WhatsApp e Tokens IA) com design limpo e moderno.

### Tarefa 3: Migração Visual do Editor Global de Planos (`admin/planos/page.tsx`)
- [ ] Transformar os cards dos 4 planos em cartões brancos com bordas suaves e badges coloridas elegantes.
- [ ] Ajustar modal de criação/edição para modal claro com container `bg-white text-slate-900 border border-slate-200 shadow-2xl`.
- [ ] Garantir que toggles e inputs utilizem estilos claros (`bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white`).
- [ ] Manter sincronização reativa com o dashboard do assinante via `marquesuahora_system_plans`.

### Tarefa 4: Migração Visual de Lojas & Assinantes (`admin/saloes/page.tsx`)
- [ ] Converter tabela e cartões de estabelecimentos para fundo branco e linhas em `border-slate-100`.
- [ ] Atualizar barra de busca e filtros para inputs claros com ícones discretos.
- [ ] Atualizar badges de status (`TRIAL` -> "Plano Gratuito", `ACTIVE` -> "Assinante Ativo", `BLOCKED` -> "Suspenso").
- [ ] Atualizar ConfirmModal de bloqueio/desbloqueio.

### Tarefa 5: Migração Visual da Central de Chamados (`admin/suporte/page.tsx`)
- [ ] Converter lista lateral de tickets para cartões brancos elegantes.
- [ ] Converter painel principal do chat para container branco com balões de mensagem limpos (atendente em roxo suave, lojista em slate claro).
- [ ] Modernizar player de áudio nativo e checklist operacional de tarefas.

### Tarefa 6: Migração Visual da Trilha de Auditoria (`admin/auditoria/page.tsx`)
- [ ] Converter lista de logs de auditoria para tabela/cards com fundo branco e monospace discreto para IPs e payloads JSON.
- [ ] Ajustar campo de busca e filtros de evento.

### Tarefa 7: Integração de Cotas do Plano no Módulo de Equipe (`dashboard/equipe/page.tsx`)
- [ ] Ler o plano ativo do tenant (`marquesuahora_tenant_plan_code`).
- [ ] Determinar limite de profissionais: Gratuito (1), Solo (3), Equipe Pro (5), VIP (10).
- [ ] Exibir no topo da página contador de profissionais ativos vs. limite permitido.
- [ ] Bloquear adição de novos profissionais se atingido o limite, com modal/banner cordial direcionando para `/dashboard/planos`.

### Tarefa 8: Conexão e Avisos de Planos em Produtos e Financeiro
- [ ] Em `/dashboard/produtos`: Exibir banner no topo quando o tenant estiver no Plano Gratuito explicando que a vitrine com produtos é desbloqueada no plano Equipe Pro.
- [ ] Em `/dashboard/financeiro`: Exibir badge informando recursos disponíveis conforme o plano (básico vs comissões avançadas).
- [ ] Em `/dashboard/configuracoes`: Na aba Reputação & NPS, indicar que lembretes automáticos e pesquisa automática são recursos do plano VIP.

### Tarefa 9: Validação e Testes em Todas as Rotas
- [ ] Executar checagem de tipos TypeScript (`pnpm --filter @marquesuahora/web exec tsc --noEmit`).
- [ ] Executar bateria de testes com Vitest (`pnpm test`).
- [ ] Navegar por todas as rotas operacionais e administrativas garantindo consistência visual e funcional.
