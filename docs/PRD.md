# MarqueSuaHora — Product Requirements Document (PRD)

## 1. Visão Geral do Produto
O **MarqueSuaHora** é uma plataforma SaaS multi-tenant voltada para o mercado de beleza, estética e bem-estar (barbearias, salões de beleza, estúdios de lash/nail, clínicas de estética e profissionais autônomos).

O produto resolve três grandes dores do setor:
1. **Faltas e Cancelamentos de Última Hora (No-Show)**: resolvido com a Proteção Anti-Falta (Sinal PIX direto para a conta do estabelecimento com zero taxa de intermediação).
2. **Atendimento Lento e Fricção de Agendamento**: resolvido com o Link na Bio da Vitrine Online e com a Atendente IA no WhatsApp.
3. **Complexidade de Gestão Financeira e Comissões**: resolvido com divisão automática de comissões, relatórios de faturamento e controle de produtos e crediário.

---

## 2. Personas e Casos de Uso

### Persona 1: Dono(a) do Estabelecimento (Tenant Admin)
- **Perfil**: Empreendedor(a) do ramo da beleza que precisa de controle da agenda da equipe, previsibilidade financeira e redução de faltas.
- **Necessidades**:
  - Configurar vitrine com link próprio (ex: `marquesuahora.com.br/meustudio`).
  - Cobrar sinal prévio de agendamento (especialmente para clientes novas).
  - Acompanhar comissões e faturamento em tempo real.
  - Receber suporte rápido da plataforma via IA e chamados prioritários.

### Persona 2: Profissional Parceiro (Staff/Collaborator)
- **Perfil**: Barbeiro, manicure, cabeleireiro(a) ou esteticista parceiro(a).
- **Necessidades**:
  - Acessar sua grade de horários diária e semanal.
  - Bloquear horários de folga ou almoço.
  - Registrar fotos antes e depois dos procedimentos realizados.
  - Acompanhar seu saldo acumulado de comissões.

### Persona 3: Cliente Final (Consumer)
- **Perfil**: Usuário(a) que busca praticidade para agendar serviços sem necessidade de baixar aplicativos pesados.
- **Necessidades**:
  - Acessar pelo navegador do celular através do link do Instagram ou WhatsApp.
  - Escolher serviço, profissional, dia e horário disponível.
  - Efetuar pagamento do sinal via PIX Copia e Cola instantâneo.
  - Receber lembretes de agendamento no WhatsApp com opção de confirmação ou remarcação.

---

## 3. Módulos do Sistema e Requisitos Funcionais

### Módulo 1: Vitrine Pública & Agendamento Online (`/[slug]`)
- **RF1.1**: Cada salão possui um slug único (`/[slug]`) com layout responsivo mobile-first.
- **RF1.2**: Wizard em 4 etapas:
  1. Escolha de Serviços (com tempo de duração e preço).
  2. Escolha do Profissional (ou "Qualquer Profissional").
  3. Escolha de Data e Horário (apenas horários válidos conforme escala de trabalho e disponibilidade real).
  4. Identificação do Cliente, Resumo Financeiro e Instruções de PIX (quando houver exigência de sinal).
- **RF1.3**: Botão de envio de comprovante no WhatsApp com mensagem pré-formatada contendo os dados do agendamento.

### Módulo 2: Proteção Anti-Falta & Sinal PIX Direto
- **RF2.1**: O tenant pode ativar a cobrança de sinal antecipado e escolher modalidade: **Valor Fixo (R$)** ou **Porcentagem (%)**.
- **RF2.2**: O tenant pode configurar de forma independente a **Regra para a 1ª Cliente** (com modalidade e valor próprios no banco de dados).
- **RF2.3**: O valor vai 100% direto para a conta bancária do salão via chave PIX cadastrada (CPF, CNPJ, Telefone, E-mail ou Aleatória), sem retenção pela plataforma.
- **RF2.4**: Cálculo dinâmico pelo backend verificando se o telefone do cliente possui agendamentos prévios (`previousBookingsCount === 0`).

### Módulo 3: Agenda & Atendimentos
- **RF3.1**: Visualização semanal e diária em tempo real com blocos de 30 minutos.
- **RF3.2**: Detecção automática de slots livres com ação de clique direto para agendar.
- **RF3.3**: Modal rica de atendimento com:
  - Dados do cliente e histórico completo de atendimentos anteriores e faltas.
  - Discriminação de valor total, sinal já pago e saldo a cobrar.
  - Galeria de fotos antes/depois do procedimento com upload direto.
  - Link de visualização e preenchimento da Ficha de Anamnese Digital.
  - Ações rápidas: Iniciar conversa no WhatsApp, Reagendamento, Cancelamento e Conclusão com baixa financeira.
- **RF3.4**: Copiloto IA de Comandos Rápidos e Voz para registrar agendamentos, despesas e bloqueios por linguagem natural.

### Módulo 4: Clientes & CRM
- **RF4.1**: Cadastro automático de clientes a partir do primeiro agendamento.
- **RF4.2**: Métricas de LTV (valor total investido), frequência de visitas e controle de no-show (faltas).
- **RF4.3**: Alertas de churn (clientes sem visitas há mais de 45 dias) com envio de mensagens de reativação com cupons.
- **RF4.4**: Ficha de Anamnese Digital personalizável com assinatura e fotos.

### Módulo 5: Serviços, Profissionais & Comissões
- **RF5.1**: Cadastro de serviços com duração em minutos, preço, categoria e flag de liberação na vitrine.
- **RF5.2**: Cadastro de equipe com cor personalizada na agenda, foto de avatar, taxa de comissão (%) e escala de trabalho semanal com pausas.
- **RF5.3**: Cálculo automatizado de repasses e comissões no módulo financeiro.

### Módulo 6: Produtos & Balcão
- **RF6.1**: Cadastro de produtos para venda casada ou balcão (pomadas, cosméticos, kits).
- **RF6.2**: Controle de estoque com aviso de estoque mínimo e baixa automática na venda.

### Módulo 7: Financeiro & Relatórios
- **RF7.1**: DRE simplificada: faturamento bruto, custos de produtos, comissões pagas e faturamento líquido.
- **RF7.2**: Métricas de ticket médio, serviços mais lucrativos e faturamento por profissional.
- **RF7.3**: Controle de Crediário/Fiado por cliente com lançamentos e quitação parcial ou total.

### Módulo 8: Automações WhatsApp & Notificações
- **RF8.1**: Confirmação instantânea de agendamento com dados completos.
- **RF8.2**: Lembretes automáticos 24 horas e 2 horas antes do procedimento com botões rápidos de confirmação.
- **RF8.3**: Pesquisa de satisfação pós-atendimento (NPS de estrelas) disparada automaticamente após a conclusão.
- **RF8.4**: Mensagens automáticas de felicitações de aniversário com cupom.

### Módulo 9: Suporte ao Assinante com Inteligência Artificial
- **RF9.1**: Central interativa de dúvidas e suporte operacional acessível pelo painel (`/dashboard/suporte`).
- **RF9.2**: Respostas imediatas e didáticas sobre todas as telas e regras do MarqueSuaHora.
- **RF9.3**: Identificação automática de erros técnicos e bugs com abertura de protocolo e encaminhamento para análise do administrador em até 24 horas.
- **RF9.4**: Arquitetura de contingência com alta disponibilidade: motor local integrado no frontend que responde imediatamente caso a API externa ou o servidor sofram instabilidade.

---

## 4. Requisitos Não-Funcionais
- **RNF1 (Design)**: Estilo minimalista e sóbrio com TailwindCSS. **Diretriz de zero ícones decorativos / sem emojis ornamentais**. Tipografia legível e contrastes adequados (WCAG AA).
- **RNF2 (Performance)**: Carregamento da vitrine pública em menos de 1,2s em conexões 4G mobile.
- **RNF3 (Segurança)**: Senhas com hash Argon2id, tokens JWT com prazo de 7 dias e refresh tokens seguros em cookies HttpOnly com 30 dias. Isolamento estrito multi-tenant no banco de dados (`tenantId`).
- **RNF4 (Disponibilidade)**: O chat de suporte de IA deve responder em 100% das vezes, com fallback local no cliente caso a chamada de rede falhe.
