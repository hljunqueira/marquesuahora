# DOCUMENTO DE ESPECIFICAÇÃO COMPLETA — MARQUE SUA HORA

---

## 1. DOCUMENTO DE REQUISITOS DO PRODUTO (PRD)
**Objetivo:** definir o que o produto precisa fazer e como o sucesso vai ser medido.

- **Nome do produto e ideia em uma frase:**  
  Marque Sua Hora — Seu espaço com cara de lugar chique, onde o cliente escolhe o horário direto pelo celular e recebe um aviso no WhatsApp antes de sair de casa.

- **Usuários-alvo:**  
  Profissionais e donos de espaços de beleza, estética e bem-estar que atendem com hora marcada (barbearias, salões, clínicas e estúdios). Eles precisam de uma rotina sem estresse no celular, onde a agenda se preenche sozinha e o dinheiro do dia (e as comissões da equipe) fiquem organizados sem precisar de planilhas chatas.

- **Problema e solução improvisada de hoje:**  
  A dor: ter que parar o trabalho com as mãos ocupadas para responder mensagem de horário, clientes que esquecem e deixam a cadeira vazia, e ter que calcular comissão na mão no fim da semana. Como contornam hoje: usam agenda de papel ou notas do celular, digitam mensagens na pressa entre um cliente e outro e só lembram de cobrar ou confirmar presença se der tempo.

- **Objetivo e medida de sucesso:**  
  Resultado esperado: o profissional não precisar parar o atendimento para agendar horário e acabar com os buracos na agenda por cliente esquecido. Sinal mensurável: redução comprovada de mais de 60% nas faltas (no-shows) através dos lembretes no WhatsApp e 80% dos agendamentos fechados 100% sozinhos pelo link ou pelo Atendente IA.

- **Funcionalidades principais:**  
  1. *Agendamento público com catálogo e combos (`/[slug]`):* estimula o cliente a adicionar múltiplos serviços (combos em bloco contínuo) aumentando o ticket médio do salão. *(Prioridade: Alta)*  
  2. *Lembretes e avisos automáticos no WhatsApp (24h e 12h):* corta faltas e avisa a recepção em tempo real se o cliente precisar remarcar. *(Prioridade: Alta)*  
  3. *Ficha de Anamnese Digital com fotos antes/depois:* segurança jurídica para o profissional e registro visual da evolução do cliente (pele, cabelo, procedimentos). *(Prioridade: Média)*  
  4. *Fechamento de caixa diário e comissões:* entradas por PIX, dinheiro e cartão separadas com cálculo automático do repasse de cada colaborador. *(Prioridade: Alta)*  
  5. *Atendente Virtual com IA 24/7 (habilitável por plano):* responde dúvidas de localização, preços e agenda horários em linguagem natural direto no WhatsApp do salão. *(Prioridade: Média/Alta)*  
  6. *Agenda Inteligente com Prevenção de Falhas Operacionais:* travas atômicas anti-overbooking no PostgreSQL, buffer automático de 15 minutos de respiro/higienização, combos multi-serviço contínuos, visão multi-profissional em colunas com Drag & Drop, bloqueio rápido de horários (`ScheduleBlock` para almoço/pausa) e tolerância a atrasos de 15 minutos. *(Prioridade: Altíssima)*  
  7. *Gestão & Automação de Aniversariantes do Salão:* disparo automático matinal via WhatsApp às 09:00 com mensagem cordial de parabéns pelo padrão Humanizer (somente mensagem calorosa de felicitações, sem presentes ou cupons de desconto) e badge comemorativa `🎂 Aniversariante` na agenda e app móvel do profissional. *(Prioridade: Alta)*  
  8. *Onboarding Inteligente & Especialização Dinâmica por Nicho:* fluxo de primeiro acesso em 5 passos (escolha do nicho com adaptação imediata de termos, vitrine e agendamento especializado; dados do negócio por CNPJ ou CPF; localização via CEP com tratamento para CEP único; catálogo sugerido com autonomia total; e identidade visual com upload de logo e 5 templates de temas editoriais). *(Prioridade: Altíssima)*  
  9. *Sinal Opcional Anti-No-Show via PIX Dinâmico (Reserva Garantida):* o salão pode exigir um valor fixo ou percentual de sinal via PIX para segurar o horário nobre, com trava temporária de 15 minutos no Redis, abatimento automático no balcão e cancelamento caso não seja pago. *(Prioridade: Alta)*  
  10. *Preenchimento Automático de Vaga por Desistência (Smart Waitlist Auto-Fill):* ao cancelar ou remarcar um horário, o sistema aciona a fila de espera e notifica o primeiro cliente da lista no WhatsApp com janela de 10 minutos para confirmação direta ("SIM"). *(Prioridade: Alta)*  
  11. *Recuperação Automática de Clientes Sumidos (Reativação de Churn):* cálculo do intervalo médio de visitas (`Client.avgVisitDays`) e disparo cordial via WhatsApp para clientes que ultrapassaram o tempo habitual sem nova marcação, com trava de segurança de no máximo 1 contato a cada 60 dias. *(Prioridade: Alta)*  
  12. *Pesquisa de Satisfação Pós-Atendimento (NPS 1-5) com Impulsionamento no Google Meu Negócio:* 2 horas após o atendimento, o cliente recebe uma pergunta de 1 a 5 estrelas no WhatsApp. Clientes 5 estrelas são convidados a avaliar no Google com link direto do perfil do salão (`googleReviewUrl`), enquanto notas de 1 a 3 alertam a gerência internamente no painel. *(Prioridade: Altíssima)*  
  13. *Bloqueio Inteligente para Clientes Reincidentes em Falta (No-Show Shield):* clientes com faltas recorrentes (`noShowCount >= maxNoShowsAllowed`, padrão 2) são redirecionados com mensagem acolhedora para agendamento assistido diretamente no WhatsApp da recepção, eliminando prejuízos sem atritos constrangedores. *(Prioridade: Alta)*  
  14. *Configurações Completas do Dono do Salão (Edição da Loja & Troca de Senha Segura):* 7 abas no painel (`/dashboard/configuracoes` e `/dashboard/perfil`) para dados cadastrais com busca de CNPJ/CPF e CEP inteligente (com suporte a municípios de CEP único), identidade visual e escolha dos 5 temas editoriais com upload de logo, nicho e terminologias, regras da agenda (buffer de 15min ou clínico de 20-30min), políticas financeiras e sinal opcional anti-no-show, CRM/Aniversariantes/Google Review (`googleReviewUrl`), perfil do proprietário e alteração de senha segura com validação de força e criptografia Argon2id. *(Prioridade: Alta)*  
  15. *Gestão Global do SaaS no Painel Super Admin (`/admin`):* controle central de estabelecimentos com busca e filtros por nicho/plano/status, painel de consumo de agendamentos e faturamento de excedentes, assinaturas pagas (MRR), bloqueio automático por inadimplência (carência de 5 dias e tela PIX de quitação imediata) e manual com motivo de auditoria, acesso assistido (impersonate de 1-clique), editor global de planos 100% customizável pelo admin (zero defaults no banco: criação, mensalidade, limites de profissionais, modelo ilimitado ou franquia com agendamento extra, e toggles de recursos) e monitor de instâncias WhatsApp e tokens de IA. *(Prioridade: Altíssima)*  
  16. *Central de Suporte via Tickets por Loja (Chat com Áudio e Imagens + Checklist Operacional):* canal profissional integrado no painel do salão (`/dashboard/suporte`) em estilo de chat com histórico, envio de imagens/prints (`Ctrl+V`) e gravação de áudio nativa no navegador (`MediaRecorder`) com player integrado; no painel do Super Admin (`/admin/suporte`), exibe identificação clara por loja (Logo, Nome, Nicho, Plano, Dono, WhatsApp e SLA), chat com player de voz, aba de notas internas privadas e Checklist Operacional dinâmico (`TicketTask`) com templates automáticos por categoria e barra de progresso. *(Prioridade: Alta)*

- **Fora da versão 1:**  
  Fica para a Fase 2: pagamentos online antecipados com split bancário complexo, chamadas de vídeo integradas (Google Meet), gestão de redes com múltiplas filiais (multi-unidade), integração com maquininhas físicas (POS), campanhas de e-mail marketing em massa e publicação de aplicativo em lojas para o cliente final (o cliente agenda direto pelo navegador do celular sem baixar nada). A cobrança do SaaS para os salões será integrada nativamente com o **Asaas** via PIX e cartão.

- **Histórias de usuário:**  
  Como cliente de um salão, eu quero acessar o link no celular, escolher meu horário em menos de 1 minuto e receber um lembrete no WhatsApp, para que eu não esqueça do meu compromisso.

- **Critérios de aceite:**  
  Dado que o cliente acessou o link do salão, quando ele escolhe o serviço, profissional e horário livre e digita seu WhatsApp, então o sistema reserva a vaga na hora com trava anti-overbooking, avisa o profissional na bancada e agenda o disparo de confirmação no WhatsApp para 24h antes.

- **Definição de Proteção contra No-Shows (No-Show Shield):**  
  Clientes que acumularem 2 faltas consecutivas sem desmarcar (`noShowCount >= 2`) têm o agendamento autônomo pausado na vitrine pública e são direcionados amigavelmente via botão tátil para o WhatsApp da recepção, onde a atendente confirma o horário de forma assistida ou combina um sinal prévio.

- **Estratégia de Planos 100% Customizáveis pelo Super Admin (Zero Defaults no Sistema):**  
  Nenhum plano comercial, valor de mensalidade, limite de profissionais ou franquia de agendamentos é fixado com valores padrão (defaults) no banco de dados ou no código. O Super Admin possui autonomia total no painel (`/admin/planos`) para:  
  1. Criar e nomear planos comerciais com código identificador único (ex: `FREE_HYBRID`, `SOLO`, `EQUIPE_PRO`, `VIP_AI` ou planos promocionais/sazonais);  
  2. Definir o valor exato da mensalidade em R$;  
  3. Definir o limite máximo de profissionais atendendo simultaneamente;  
  4. Configurar a política de agendamentos (Ilimitado vs. Franquia mensal com taxa avulsa por agendamento extra cobrada via Asaas);  
  5. Habilitar ou desabilitar cada recurso do sistema por plano (Atendente Virtual IA no WhatsApp, Ficha de Anamnese Digital, Módulo de Comissões e Sincronização Google Calendar);  
  6. Ativar ou inativar planos para novas contratações na vitrine e onboarding.

---

## 2. DOCUMENTO DE REQUISITOS TÉCNICOS (TRD)
**Objetivo:** deixar as escolhas técnicas explícitas, pra construção não depender de chute.

- **Plataformas:**  
  Web (clientes agendando pelo navegador do celular e salões no painel administrativo) + Mobile (aplicativo iOS e Android via React Native/Expo exclusivo para o profissional consultar sua agenda na bancada e marcar comparecimento).

- **Frontend e hospedagem:**  
  Next.js 14 (App Router) com TypeScript, Tailwind CSS e Shadcn/Radix adaptado ao Impeccable Design System, rodando em container Docker diretamente na VPS própria (`46.202.144.181`).

- **Backend e banco de dados:**  
  Node.js com Fastify v4+, Prisma ORM, banco de dados PostgreSQL 16 nativo em Docker e Redis 7 (para filas BullMQ de WhatsApp) hospedados na VPS Ubuntu 24.04 (`46.202.144.181`).

- **Autenticação e permissões:**  
  E-mail e senha com criptografia Argon2, Access Token JWT (15 minutos) e Refresh Token seguro em cookies HttpOnly (7 dias). Quatro níveis de acesso: `SUPER_ADMIN` (gestão do SaaS), `ADMIN` (dono do salão), `PROFESSIONAL` (colaborador que só vê a própria agenda/comissões) e `RECEPTIONIST` (atendente geral).

- **Serviços externos e APIs:**  
  1. *Evolution API v2:* Mensagens e webhooks de WhatsApp (auto-hospedada na VPS em Docker, salão conecta via QR Code).  
  2. *Asaas:* Cobrança das assinaturas dos salões (conforme valores cadastrados e customizados dinamicamente pelo Super Admin) e agendamentos extras via PIX e cartão de crédito.  
  3. *Google Calendar API:* Sincronização de agenda em duas vias (OAuth2 por salão).  
  4. *TypeSafe Jev (System One):* Tomada de decisões tipadas de alta velocidade (< 100ms) para classificação de intenção, confirmação expressa e extração seletiva de serviços.  
  5. *Google Gemini 1.5 Flash:* Atendente Virtual com IA 24/7 no WhatsApp para diálogo acolhedor.

- **Arquitetura:**  
  Monorepo estruturado em `pnpm workspace` contendo `apps/web` (Next.js 14), `apps/api` (Fastify REST com prefixo `/api/v1`), `apps/mobile` (React Native/Expo) e `packages/shared` (tipos, schemas Zod, Humanizer e decisões Jev compartilhados). O tráfego externo passa pelo Nginx com SSL/TLS (Let's Encrypt), roteando para o frontend ou API interna.

- **Segurança e privacidade:**  
  Comunicação 100% encriptada via SSL/TLS, senhas protegidas com Argon2, dados segregados por salão via `tenantId` em todas as tabelas, fotos de procedimentos restritas, exclusão suave (*soft-delete*) para preservar dados contábeis, conformidade com a LGPD e rotina de backup diário do PostgreSQL na VPS (`pg_dump`).

- **Metas de desempenho e confiabilidade:**  
  Consulta de horários livres (`GET /slots`) em menos de 100ms; criação de agendamento em menos de 300ms; tomada de decisão no webhook do WhatsApp com Jev em menos de 100ms; disponibilidade de 99,5%; backup automático diário às 03:00.

- **Ambientes e entrega:**  
  Ambiente de desenvolvimento local, ambiente de homologação (`docker-compose.staging.yml`) e ambiente de produção na VPS (`docker-compose.prod.yml`). Pipeline no GitHub Actions executando lint, testes unitários com Vitest e deploy automatizado na VPS via SSH ao receber push na branch `main`.

- **Decisões técnicas e trocas:**  
  1. *Fastify em vez de Express:* 3x mais veloz, tipagem TypeScript nativa e validação com Zod.  
  2. *VPS própria com Docker em vez de Supabase/Vercel serverless:* Permite rodar a Evolution API (WhatsApp) e filas Redis sem custos de terceiros e sem timeout de servidor.  
  3. *Componente ConfirmModal em vez de window.confirm nativo:* Garante padrão de luxo Impeccable sem caixas cinzas amadoras do navegador.  
  4. *Validador Humanizer automatizado:* Módulo em `packages/shared/src/humanizer` para auditar templates de WhatsApp e o system prompt da Atendente IA contra 25 vícios de escrita de IA.  
  5. *TypeSafe Jev em vez de LLMs generativos para decisões:* Classificação estruturada com Choice/Noul/Score em menos de 100ms, eliminando custos de tokens e alucinações em regras de negócio.

---

## 3. FLUXO DO APP (APP FLOW)
**Objetivo:** mostrar cada tela, cada caminho do usuário e o que acontece em cada toque ou clique.

- **Pontos de entrada:**  
  Link na bio do Instagram do salão (`marquesuahora.com.br/nome-do-salao`), botão de agendar enviado no WhatsApp, QR Code físico no espelho/balcão do salão e portal de login para os donos e profissionais.

- **Inventário de telas:**  
  1. *Portal Público (`/[slug]`):* Vitrine de serviços com suporte a múltiplos serviços (combos contínuos), escolha de profissional, slot-picker, drawer de sinal PIX dinâmico (com contador de 15 min), formulário de lista de espera (`WaitlistModal`), proteção acolhedora contra clientes reincidentes em faltas (`NoShowShieldModal`) e confirmação em tela única tipo Accordion/Drawer.  
  2. *Login & Recuperação (`/login`, `/forgot-password`):* Autenticação de salões e profissionais.  
  3. *Dashboard Geral (`/dashboard`):* Faturamento do dia, total de agendamentos, faltas e taxa de satisfação NPS.  
  4. *Agenda Multi-Profissional (`/dashboard/agenda`):* Visão vertical em colunas por colaborador com Drag & Drop, botão de bloqueio rápido de horários (`ScheduleBlock` para almoço/pausa), status color-coded (incluindo Em Atendimento `IN_SERVICE`), badges de sinal pago/restante (`🟢 R$ 30 / 🟡 R$ 50`), tolerância de no-show com disparo para fila de espera e badge sutil `🎂 Aniversariante`.  
  5. *CRM de Clientes & Anamnese (`/dashboard/clientes`, `[id]`):* Ficha do cliente, histórico, fotos, abas de filtro rápido para "Aniversariantes do Mês/Semana", "Clientes em Risco (Sumidos / Churn)" e "Faltas Recorrentes (No-Show Shield)", com botão de WhatsApp direto para parabenizar ou reativar.  
  6. *Reputação & Google Meu Negócio (`/dashboard/reputacao`):* Configuração do link direto de avaliação do Google (`googleReviewUrl`), toggle de ativação do NPS automático pós-2h e feed em tempo real de notas de 1 a 5 estrelas com triagem de promotores e detratores.  
  7. *Serviços & Equipe (`/dashboard/servicos`, `/dashboard/equipe`):* Cadastros com durações e comissões.  
  8. *Financeiro (`/dashboard/financeiro`):* Fluxo de caixa com abatimento de sinal PIX no balcão, comissões a pagar e DRE.  
  9. *Planos & Faturamento (`/dashboard/planos`):* Visualização do plano atual contratado, consumo de agendamentos/franquia mensal e opções de contratação/upgrade dentre os planos ativos configurados pelo Super Admin.  
  10. *Configurações Completas do Salão (`/dashboard/configuracoes`, `/dashboard/perfil`):* 7 abas organizadas: Dados da Loja (CNPJ/CPF, CEP inteligente com suporte a municípios de CEP único), Identidade Visual (Upload de logo com recorte e 5 templates editoriais), Especialização por Nicho e Terminologia, Regras da Agenda (buffer de 15min ou clínico de 20-30min), Políticas Financeiras (Sinal PIX e No-Show Shield), Automações/CRM/Google Review (`googleReviewUrl`) e Minha Conta com Troca de Senha Segura (Argon2id e desconexão de sessões).  
  11. *Central de Suporte do Dono do Salão (`/dashboard/suporte`):* Abertura de chamados com protocolo amigável, interface estilo chat, envio de prints de tela (`Ctrl+V`), gravação de mensagens de voz nativas no navegador (`MediaRecorder`) com player integrado, e notificação de resposta via WhatsApp.  
  12. *Painel Super Admin (`/admin`):* Overview de MRR global, faturamento consolidado de excedentes e monitor de instâncias WhatsApp/IA.  
  13. *Central de Atendimento de Suporte do Super Admin (`/admin/suporte`):* Listagem unificada com identificação visual por loja (Logo, Nome, Nicho, Plano, Dono, WhatsApp e SLA), chat com player de áudio e visualizador de prints, aba de notas privadas internas e Checklist Operacional de resolução (`TicketTask`) com templates automáticos por categoria e barra de progresso.  
  14. *Gestão Global do SaaS no Super Admin (`/admin/saloes`, `/admin/planos`, `/admin/whatsapp`, `/admin/configuracoes`):* Gestão de lojas com filtros e impersonate de 1-clique, painel de consumo de agendamentos e faturamento de excedentes, bloqueio automático por inadimplência (carência de 5 dias e tela PIX de quitação instantânea) e manual com motivo de auditoria, Editor Global de Planos (`/admin/planos`) 100% configurável pelo admin (criação, preços, franquias, taxa extra e toggles de recursos, sem nenhum default no banco) e credenciais mestres com log de auditoria.  
  15. *App Mobile da Bancada:* Agenda do dia do profissional com 1-toque para Em Atendimento, Atendido ✅ ou Falta ❌, e alerta de aniversariante do dia.

- **Jornada principal (Cliente Final):**  
  Acessa o link `/[slug]` ➔ Experiência em tela única expansível tipo Accordion/Drawer:  
  1. Seleciona o Serviço ➔  
  2. Seleciona o Profissional (ou "Primeiro disponível") ➔  
  3. Escolhe a Data e o Horário livre no calendário inteligente (ou entra na Lista de Espera caso a data esteja lotada) ➔  
  4. Digita Nome e WhatsApp com máscara adaptativa (se possuir faltas reincidentes, é direcionado com carinho para o WhatsApp da recepção) ➔  
  5. Clica no botão fixo de confirmação no rodapé:  
     - Se o salão exigir sinal (`depositRequired`): abre drawer com QR Code e código PIX Copia e Cola com trava de 15 minutos;  
     - Se não exigir sinal: confirma imediatamente; ➔  
  6. Tela de Sucesso imediata com resumo, botão "Salvar na Agenda" (.ics) e aviso de confirmação via WhatsApp.  
  7. Pós-Atendimento (2 horas após conclusão): Cliente recebe no WhatsApp a pesquisa de 1 a 5 estrelas; ao responder 5 estrelas, recebe o link de avaliação do Google Meu Negócio (`googleReviewUrl`).

- **Especialização da Vitrine (`/[slug]`), Formas de Agendamento & Recursos da Agenda por Nicho:**  
  1. *Barbearia Clássica & Grooming (`BARBERSHOP`):*  
     - **Formas de Agendamento:** Agendamento Express (< 30s) sem senha; opção prioritária *"Próximo Barbeiro Disponível ⚡"*; combos contínuos de alta frequência (Corte + Barba + Acabamento); Fila de espera e Walk-in digital para dias lotados.  
     - **Modais:** `BarberExpressUpsellModal` (sugestão tátil de combo de barba por +R$ 35 com mola física), `BarberWaitlistModal` (lista de espera), `BarberWalkInModal` (botão flutuante `+ Encaixe Rápido` presencial), `BarberChairActionModal` (1 toque para "Sentou na Cadeira", "Concluído" ou "Não Compareceu") e `BarberQuickBlockModal` (pausas de 15min/30min/1h).  
     - **Recursos da Agenda:** Visão de bancada ultra-compacta; status `IN_SERVICE` verde pulsante; liberação instantânea de cadeira por falta (no-show) para encaixes imediatos do balcão.  
  2. *Salão de Beleza & Hair Studio (`BEAUTY_SALON`):*  
     - **Formas de Agendamento:** Agendamento de Precisão com Tempo de Pausa Química (Gap Booking / Precision Scheduling de 3 blocos: Aplicação ➔ Pausa Química `processingMinutes` [livre para encaixes de corte/escova] ➔ Finalização/Lavatório `finishingMinutes`); combos encadeados contínuos com ordem lógica (Coloração -> Tratamento -> Corte -> Escova); consulta prévia com análise capilar.  
     - **Modais:** `SalonPatchTestNoticeModal` (alerta acolhedor de teste de mecha 48h antes para químicas fortes), `SalonGalleryModal` (carrossel fotográfico fullscreen com fotos reais e swipe tátil), `SalonTimelineSummaryModal` (breakdown do tempo total dividido em blocos no checkout), `SalonWashStationModal` (alocação de cadeiras de lavatório) e `SalonColorFormulaModal` (registro da fórmula de coloração e volumagem).  
     - **Recursos da Agenda:** Grade com faixa translúcida listrada de ação química (`🧪 Pausa Química`), permitindo encaixar procedimentos rápidos sem conflito; alocação de lavatórios; tag de cliente com primeira química e teste pendente.  
  3. *Clínica de Estética & Harmonização Facial (`AESTHETICS_CLINIC`):*  
     - **Formas de Agendamento:** Agendamento com Bloqueio Duplo de Recursos (Resource & Room Scheduling: Profissional Habilitado + Sala/Equipamento Físico `Resource`, como Laser Soprano, Criolipólise ou Cabine Estéril); buffer automático estendido de biossegurança de 20 a 30 minutos; agendamento ou lembrete de retorno pós-procedimento (15 a 30 dias para Botox).  
     - **Modais:** `ClinicalIntakeScreeningModal` (triagem pré-agendamento de 3 perguntas eliminatórias: gestação/lactação, alergias, procedimentos recentes), `PreCareGuidelinesModal` (orientações de preparo no checkout e WhatsApp), `DigitalConsentModal` (Termo de Consentimento Livre e Esclarecido digital), `PostCareFollowUpModal` (agendamento imediato do retorno de avaliação de 15 dias) e `AnamnesisEvolutionModal` (mapa facial com pontos de aplicação e comparador antes/depois).  
     - **Recursos da Agenda:** Alternador de visão "Por Profissional" vs "Por Sala / Equipamento" (`View by Resource`) prevenindo conflitos de máquinas; bloco visual de assepsia (`🧴 Desinfecção da Cabine`); prontuário clínico integrado ao card.  
  4. *Studio de Unhas & Lash Designer (`NAIL_LASH_STUDIO`):*  
     - **Formas de Agendamento:** Agendamento por Ciclo de Vida do Procedimento (Aplicação Nova 2h-2h30 vs Manutenção Periódica 15-21d 1h15-1h30 vs Remoção Segura); checagem e acréscimo automático de remoção externa (Foreign Work Policy: se feito em outro local, auto-adiciona "Remoção de Terceiros +30 min"); régua automatizada de retorno no WhatsApp aos 18 dias.  
     - **Modais:** `LashNailPhaseSelectorModal` (seletor de fase), `ForeignWorkAlertModal` (checagem de trabalho de terceiros com acréscimo de tempo e taxa), `LashNailCustomizationModal` (estilo de cílios e formato de unhas com nail art), `PrepCareInstructionsModal` (alerta de vir sem rímel, óleos ou lentes) e `TechnicalAnamnesisModal` (registro de curvatura, espessura e adesivo/cola).  
     - **Recursos da Agenda:** Badges de ciclo nos cards (`🌸 Manutenção 18d`, `✨ Aplicação Nova`, `⚠️ Remoção Externa Necessária`); aba no CRM de clientes próximas dos 21 dias com 1 toque no WhatsApp; alerta de sensibilidade a cianoacrilato.  
  5. *Personal Trainer & Studio VIP (`PERSONAL_TRAINER`):*  
     - **Formas de Agendamento:** Agendamento Híbrido por Local (Studio próprio, Condomínio/Casa do aluno ou Parque/Ao ar livre); janela dinâmica de deslocamento (Travel Time Buffer de 30 a 45 min bloqueado automaticamente na agenda para aulas domiciliares); agendamento com resgate de créditos de pacote (Session Pack Deduction: ex. "Sessão 4 de 10" debitada na hora); política rígida de cancelamento com tolerância de 2h de antecedência.  
     - **Modais:** `TrainingLocationModal` (seletor de ambiente com input de endereço), `SessionPackRedeemModal` (confirmação em 1 toque para alunos com pacote ativo), `ParQReadinessModal` (questionário PAR-Q e objetivo da sessão), `StrictCancelPolicyModal` (termo de ciência da antecedência mínima de cancelamento de 2h) e `StudentWorkoutCardModal` (ficha de treino do dia com anotação de cargas).  
     - **Recursos da Agenda:** Botão de rota instantânea no card para abrir o endereço no Waze / Google Maps em 1 toque; contador de sessões nos cards (`🏋️ Sessão 4/10`); faixa visual de trânsito urbano (`🚗 Deslocamento 30 min`).  
  6. *Outros Serviços com Hora Marcada (`OTHER`):*  
     - Configuração neutra, modular e flexível com `CustomIntakeModal` (perguntas customizadas) e `GenericConfirmationModal`.

- **Jornadas alternativas:**  
  - *Remarcação:* Cliente clica no link do WhatsApp ou responde com ❌; a mensagem o direciona de forma assistida para a recepção no WhatsApp para reorganização rápida de horário.  
  - *Cancelamento:* Solicitação confirmada com liberação instantânea do slot para outros clientes.

- **Regras de navegação:**  
  Portal do cliente sem barras laterais, 100% focado na conversão mobile; Painel do salão com sidebar recolhível no desktop e drawer inferior no mobile; todas as rotas sensíveis protegidas por middleware de sessão.

- **Estados vazios e bloqueados:**  
  Se não houver horários disponíveis na data, exibe mensagem clara: *"Nenhum horário disponível para esta data"* com atalho para a próxima data disponível. Bloqueio automático com aviso de renovação caso a fatura do plano esteja pendente no Asaas.

- **Primeiro uso (Onboarding do Salão em 5 Passos sem Fricção & Autonomia Total):**  
  Onboarding guiado inteligente de alta conversão:  
  1. *Seleção do Nicho:* Barbearia, Salão, Estética, Unhas/Lash ou Personal — a interface muta instantaneamente para a terminologia daquele setor (ex: "Barbeiro" vs "Biomédica", "Cadeira" vs "Cabine") e personaliza a experiência.  
  2. *Identificação por CNPJ ou CPF:* O sistema localiza os dados da empresa instantaneamente sem digitação manual burocrática, preenchendo Razão Social e Nome Fantasia, com foco 100% na experiência do usuário e zero menção a nomes de APIs ou provedores externos.  
  3. *Localização via CEP com Tratamento para CEP Único:* Digitação do CEP preenche automaticamente logradouro, bairro, cidade e UF com foco no número; em cidades com CEP único de município, identifica a cidade e instrui amigavelmente o usuário a digitar sua rua/avenida sem erros ou telas travadas.  
  4. *Catálogo de Serviços Sugeridos com Autonomia Total:* O sistema NÃO grava serviços de forma automática ou cega. O assinante visualiza sugestões populares do seu nicho em cards com checkbox, ajusta preço (R$) e duração (minutos) diretamente na tela em inputs inline, pode adicionar seus próprios serviços customizados ou pular para cadastrar depois.  
  5. *Identidade Visual da Vitrine (Upload da Logo & 5 Templates de Temas):* Upload da marca oficial com preview instantâneo na vitrine do smartphone (ou monograma tipográfico elegante caso ainda não tenha logo) + escolha entre 5 templates visuais editoriais (Roxo Imperial & Ouro, Dark Obsidian & Grafite, Rose Gold & Nude, Verde Esmeralda & Sage, e Azul Safira Real).

---

## 4. BRIEFING DE UI E UX
**Objetivo:** dar ao app uma direção visual consistente e fácil de usar.

- **Público e tom:**  
  Negócios de beleza e saúde que prezam pelo bom gosto e cobram ticket médio valorizado. Três adjetivos: *Sofisticado*, *Preciso* e *Acolhedor*.

- **Produtos de referência:**  
  - *Copiar:* O espaçamento generoso, tipografia refinada e minimalismo da **Apple**; o fluxo de escolha de horários descomplicado do **Cal.com**.  
  - *Evitar:* A poluição visual dos apps tradicionais de salão (cheios de ícones coloridos infantis, banners piscando, popups chatos e caixas cinzas nativas do sistema).

- **Paleta de cores & 5 Templates de Tema da Vitrine:**  
  O assinante escolhe no Onboarding um dos 5 temas prontos com suporte a modo claro e escuro:  
  1. *Roxo Imperial & Ouro Champagne (Padrão Oficial):* `#7C3AED` e `#D4AF37` com fundos em `#FFFFFF` e `#0F172A`. Para salões de alto padrão, barbearias premium e estética facial.  
  2. *Dark Obsidian & Grafite Metálico:* `#0B0F19` e `#F8FAFC` com acentos em `#64748B`. Para barbearias industriais urbanas e personal trainers VIP.  
  3. *Rose Gold & Nude Estético:* `#FAF7F5` e `#C07A65` com acentos em `#FDF2F8`. Para clínicas de estética, lash designers e spas.  
  4. *Verde Esmeralda & Sage Botânico:* `#047857` e `#F0FDF4` com acentos em `#A7F3D0`. Para spas holísticos, massoterapia e estética natural.  
  5. *Azul Meia-Noite & Safira Real:* `#2563EB` e `#030712` com acentos em `#93C5FD`. Para estúdios fitness, fisioterapia e clínicas esportivas.  
  - Cores de Status Gerais: Sucesso Forest (`#059669`), Alerta Amber (`#D97706`), Cancelado Burgundy (`#DC2626`)

- **Tipografia:**  
  - Logo Oficial: Caligrafia cursiva luxuosa (`brand/logo.jpg` para Favicon e Ícones da aplicação; `brand/logo-semfundo.png` com transparência para todas as páginas, navegação e telas da plataforma)  
  - Display / Títulos de Interface: `Poppins` (SemiBold 600-700, letter-spacing -0.5px)  
  - Subtítulos e detalhes refinados: `Lora` (Regular italic)  
  - Corpo de texto e formulários: `Inter` (Regular 400 / Medium 500)  
  - Horários, Moedas e Datas: `JetBrains Mono` (Medium 500)

- **Componentes:**  
  Botões com micro-transições táteis, cards com sombras suaves e sem bordas pesadas, badges de status elegantes e dois componentes fundamentais de integridade e UX:
  1. **`InputMask` (Máscaras Inteligentes nos Formulários):** Inputs reativos com formatação fluida sem saltos de cursor ou travamento de backspace/paste:
     - *Documento Nacional Dinâmico:* detecta a quantidade de dígitos em tempo real — até 11 dígitos aplica CPF (`000.000.000-00`), a partir do 12º aplica CNPJ (`00.000.000/0000-00`), sanitizando na submissão apenas a sequência numérica limpa.
     - *Telefone / WhatsApp com DDD:* formata fixos com 10 dígitos `(00) 0000-0000` e celulares com 11 dígitos `(00) 00000-0000` com transição imediata ao digitar o 9º dígito.
     - *CEP com Auto-busca:* `00000-000` com disparo imediato da busca no 8º dígito.
     - *Moeda BRL:* formatação monetária `R$ 0,00` com conversão bidirecional segura para tipo Decimal do banco.
     - *Data de Nascimento & Geral:* `DD/MM/AAAA` com validações de dias (01-31), meses (01-12) e bloqueio de anos futuros para nascimentos.
  2. **`ConfirmModal` / `DestructiveDialog` (Proibição Estrita de Diálogos Nativos):** Substituto obrigatório para qualquer `window.confirm()` ou `window.alert()`. Backdrop blur, fechamento por ESC e botão vermelho com feedback de loading.

- **Regras de layout:**  
  Grid de 8pt estrito; espaçamentos generosos e intencionais; pontos de quebra responsivos: 375px (mobile base), 768px (tablet), 1024px (desktop) e 1440px (ultrawide).

- **Notas por tela & Benchmarks de Vitrine de Alto Padrão (Boulevard, GlossGenius, Apple & Nike):**  
  A vitrine pública (`/[slug]`) opera como um aplicativo de luxo em tela única com micro-animações do Motion (`motion/react` v12+):
  - *Sticky Brand Header:* Cabeçalho fixo com o logo transparente oficial (`brand/logo-semfundo.png`), indicador de funcionamento ao vivo (`🟢 Aberto agora até 20:00` / `🟡 Fechado agora`), avaliação dos clientes e atalhos de 1 toque (WhatsApp da recepção, rota Waze/Maps e Instagram).
  - *Category Pill Bar:* Pílulas de categoria deslizantes com anel ativo em mola física (`layoutId="activeCategoryPill"`).
  - *Multi-Service Floating Action Drawer:* Barra inferior persistente que surge com mola física (`translateY: [100, 0]`) ao selecionar serviços, somando itens, tempo contínuo e preço em tempo real (*"2 serviços selecionados • 1h15 • R$ 130,00"*) com botão *"Continuar →"*, sem sair do catálogo.
  - *Horizontal Day Strip:* Fita dos próximos 7 dias com pontos luminosos de disponibilidade (*availability dots*) substituindo calendários lentos.
  - *Shift Slot Picker:* Horários agrupados por turnos (☀️ Manhã, 🌤️ Tarde, 🌙 Noite) com anel de foco tátil (`layoutId="activeSlot"`).
  - *Zero-Friction Login-Free Checkout:* Sem exigência de criar senha; checkout em 1 passo com Nome e WhatsApp (máscara adaptativa `InputMask`).
  - *Modal de Sinal PIX Asaas:* Contador de 15 min, botão de cópia tátil (*"Copiado! ✅"*) e detecção de liquidação em tempo real sem recarregar.
  - *Tela de Sucesso Dopamínica:* Animação vetorial do checkmark SVG desenhando seu contorno (`pathLength: [0, 1]`) com botões de adicionar à agenda (`.ics`) e acompanhar no WhatsApp.

- **Acessibilidade:**  
  Contraste mínimo garantido de 4.5:1 (WCAG AA); navegação por teclado completa em formulários e modais; áreas de toque móveis com dimensão mínima de 44x44px.

- **Design de Movimento & Micro-Animações com Motion (Assinantes & Vitrine):**  
  Toda a camada visual do frontend utiliza a biblioteca oficial **Motion** (`motion/react` v12+, proibido o uso do pacote legado `framer-motion`), com suporte do **Motion AI Kit** (`npx motion-ai`) para garantir fluidez impecável a 60/120 FPS:  
  - *Molas Físicas Reais (Springs):* Proibidas transições lineares duras. Todos os movimentos utilizam molas ajustadas: modais (`stiffness: 260, damping: 25`), drawers laterais (`stiffness: 240, damping: 28`) e layouts reativos (`stiffness: 350, damping: 30`).  
  - *Vitrine Pública (`/[slug]`):* Passos do agendamento expandem suavemente via prop `layout`, cards com micro-interações táteis `whileHover={{ y: -2, scale: 1.01 }}` e `whileTap={{ scale: 0.98 }}`, slot-picker com entrada em cascata de horários (`staggerChildren: 0.03s`) e tela de confirmação com checkmark SVG traçado em tempo real (`pathLength: 0` ➔ `1`).  
  - *Painel dos Assinantes (`/dashboard`):* Drag & drop elástico na grade multi-profissional da agenda, alternador de abas deslizante (padrão Apple) via `<motion.div layoutId="segmentedControl" />`, drawer lateral com `<AnimatePresence>` e cards financeiros com entrada escalonada.  
  - *Acessibilidade:* Respeito compulsório ao hook `useReducedMotion()`, convertendo deslocamentos espaciais em crossfades sutis para usuários sensíveis.  
  - *Auditoria MotionScore:* Animações auditadas contra layout thrashing e jank com o subagente `motion-reviewer`.

- **Padrão Humanizer de Redação (Linguagem Humana & Sem Vícios de IA):**  
  Toda a microcopy da interface, mensagens de erro, botões, modais, formulários, e-mails, notificações de WhatsApp e o prompt system da Atendente Virtual seguem estritamente as 25 regras da skill [Humanizer](https://github.com/blader/humanizer). Proibido o uso de jargões vazios (*crucial, robusto, mergulho profundo, tapeçaria, ecossistema*), travessões como conectores universais, contrastes artificiais (*não X, mas Y*), encerramentos dramáticos, tríades forçadas e resíduos de chatbot (*"Certamente!", "Espero que ajude!"*). O tom é o de uma recepcionista educada, acolhedora e direta de um salão de alto padrão.

- **Arquivos necessários:**  
  - **Favicon & Ícones:** `brand/logo.jpg`.  
  - **Páginas & Telas:** `brand/logo-semfundo.png` (PNG transparente de alta resolução para cabeçalho, navbar, onboarding, vitrine pública `/[slug]` e dashboard).  
  - **Cópia Mestre:** `brand/logo-official.jpg`.

---

## 5. SCHEMA DO BACKEND
**Objetivo:** definir quais dados ficam guardados, como se relacionam e quem pode acessar.

- **Entidades:**  
  1. `Plan`: Planos de assinatura do SaaS 100% customizáveis pelo Super Admin sem nenhum valor default no banco de dados. Campos obrigatórios definidos no cadastro: `name` (nome comercial), `code` (código identificador único em caixa alta, ex: `FREE_HYBRID`, `SOLO`, `EQUIPE_PRO`, `VIP_AI`), `description` (descrição comercial), `monthlyPrice` (mensalidade em Decimal), `maxProfessionals` (limite máximo de profissionais), `isUnlimitedBookings` (booleano indicando se é ilimitado), `monthlyFreeBookings` (franquia mensal para planos híbridos), `extraBookingFee` (tarifa avulsa por agendamento excedente), toggles de recursos (`hasAiAssistant`, `hasAnamnesis`, `hasCommissions`, `hasGoogleCalendar`), `features` (lista textual de benefícios) e `active` (booleano de plano ativo para novas contratações).  
  2. `Tenant`: O estabelecimento (salão/clínica), nicho de atuação obrigatório selecionado ativamente no onboarding sem valor default (`BusinessNiche`), tipo e número de documento normalizado (`CNPJ` ou `CPF`, com constraint de unicidade `@@unique([documentNumber])` impedindo cadastro duplicado de empresas), slug único com proteção anti-colisão, razão social, telefone e WhatsApp comercial da recepção (`phone`), bio e descrição pública da vitrine (`description`), perfil no Instagram (`instagramUrl`), endereço completo com flag de CEP único de município (`isSingleCityZip`), terminologia personalizada (`terminology`), logotipo oficial (`logoUrl`), template visual escolhido (`themeTemplate`), paleta de cores (`primaryColor`, `secondaryColor`, `accentColor`), configurações de vitrine contextual por nicho (`showcaseConfig`), perguntas de triagem pré-agendamento (`intakeQuestions`), regras de agendamento (buffer de 15min, antecedência mínima/máxima), configurações de mensagem de felicitações de aniversário (`birthdayMessageEnabled`, `birthdayMessageCustom`), link direto de avaliação do Google Meu Negócio (`googleReviewUrl`), toggle de pesquisa NPS pós-atendimento (`npsFeedbackEnabled`), regras de sinal anti-no-show (`depositRequired`, `depositType`, `depositAmount`), política de tolerância de faltas (`maxNoShowsAllowed`, padrão 2), automação de reativação de clientes (`churnRecoveryEnabled`, `churnAlertDays`), identificadores e status no gateway Asaas (`asaasCustomerId`, `asaasSubscriptionId`, `billingStatus`, `extraBookingsBalance`) e campos de bloqueio de loja (`blockedReason`, `blockedAt`).  
  3. `Resource`: Recursos físicos compartilhados do estabelecimento (salas clínicas, cabines estéreis, aparelhos como Laser Soprano, Criolipólise ou cadeiras de lavatório), prevenindo conflitos de máquinas ou salas entre profissionais (`ROOM`, `EQUIPMENT`, `CHAIR`).  
  4. `User`: Usuários com credenciais de acesso e permissões (Super Admin, Dono, Profissional, Recepção), com e-mail único global (`@unique`) e sanitizado em minúsculas.  
  5. `Professional`: Cadastro do colaborador, especialidade, comissão % e escala semanal.  
  6. `Service`: Serviços prestados, duração em minutos, preço, categoria, recurso físico vinculado (`resourceId`), tipo de procedimento (`serviceType`: `STANDARD`, `APPLICATION`, `MAINTENANCE`, `REMOVAL`, `EVALUATION`), tempo de pausa/ação química (`processingMinutes`), tempo de finalização e escova pós-pausa (`finishingMinutes`), orientações prévias de preparo (`intakeWarning`), galeria de fotos de resultados reais (`photos`), alerta de trabalho prévio de terceiros (`requiresRemovalCheck`), com unicidade de nome por salão (`@@unique([tenantId, name])`).  
  7. `ServiceProfessional`: Tabela intermediária de vínculo entre serviços e quem os executa.  
  8. `Client`: Cadastro do cliente final, telefone/WhatsApp normalizado (somente dígitos com DDD), com constraint de unicidade estrita por estabelecimento `@@unique([tenantId, phone])`. **Padrão Find-or-Create / Upsert Atômico:** ao agendar, o backend busca pelo telefone; se já existir, atualiza dados e reaproveita o registro acumulando histórico e tags VIP sem nunca criar clientes duplicados. Campos de aniversário (`birthday`), preferência de notificação (`notifyBirthday`), ano do último envio (`lastBirthdayGreetingYear`), saldo de créditos de pacotes de sessões (`packageBalance`), contador de faltas (`noShowCount`), ciclo médio de visitas em dias (`avgVisitDays`), data da última visita (`lastVisitAt`), data do último alerta de reativação (`lastChurnAlertSentAt`) e bloqueio preventivo para agendamento online (`isBlockedOnline`).  
  9. `ClientPhoto`: Fotos antes/depois da ficha de anamnese com data e anotações.  
  10. `Schedule`: Registro do agendamento, recurso/sala/aparelho alocado (`resourceId`), serviços adicionais (combos `additionalServices`), duração total contínua (`totalDurationMinutes`), valor total (`totalPrice`), horários de início/fim, respostas da triagem clínica prévia (`intakeAnswers`), local do atendimento para treinos (`serviceLocation`), janela de deslocamento urbano (`travelBufferMinutes`), saldo de sessões restantes (`packageRemainingSessions`), flag indicativa de manutenção periódica (`isMaintenance`), dados de sinal PIX (`depositAmount`, `depositPaid`, `depositPixCode`, `depositExpiresAt`), dados de pesquisa NPS (`npsScore`, `npsFeedback`, `npsSentAt`), status (`PENDING`, `CONFIRMED`, `IN_SERVICE`, `COMPLETED`, `NO_SHOW`, `CANCELLED`), token seguro e canal. Protegido contra duplo clique via header `Idempotency-Key` (TTL 60s no Redis) e trava de concorrência PostgreSQL a nível de linha (`SELECT ... FOR UPDATE`).  
  11. `ScheduleBlock`: Bloqueios rápidos e pausas na agenda (almoço, médico, manutenção ou folga geral).  
  12. `WaitlistEntry`: Lista de espera inteligente para preenchimento automático de vagas liberadas por desistência, contendo preferência de turno (`preferredShift`: "MORNING", "AFTERNOON", "NIGHT", "ANY"), data desejada, serviço e profissional opcionais, e status (`WAITING`, `NOTIFIED`, `CONVERTED`, `EXPIRED`, `CANCELLED`) com timestamps de controle (`notifiedAt`, `expiresAt`).  
  13. `FinancialEntry`: Lançamentos financeiros de receitas, despesas e comissões, com registro e abatimento do sinal PIX liquidado antecipadamente.  
  14. `WhatsappConfig`: Dados da instância conectada na Evolution API do salão.  
  15. `TenantAiSettings`: Instruções, FAQ e consumo de tokens da Atendente Virtual IA.  
  16. `SupportTicket`: Chamados de suporte abertos pelo salão para resolução com o time do SaaS, com protocolo amigável (`protocol`, ex: `#TK-YYYY-XXXX`), `tenantId`, `userId`, `subject`, `category` (`TECHNICAL_ISSUE`, `FEATURE_REQUEST`, `BILLING`, `DOUBT`, `OTHER`), `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `status` (`OPEN`, `IN_PROGRESS`, `WAITING_CLIENT`, `RESOLVED`, `CLOSED`), data de criação, atualização e encerramento.  
  17. `TicketMessage`: Mensagens cronológicas da conversa entre salão e suporte, com `ticketId`, `senderId`, `senderType` (`TENANT` ou `SUPER_ADMIN`), `content` textual, `attachmentUrl`, `attachmentType` (`IMAGE`, `AUDIO`, `FILE`), `audioDurationSeconds` (duração em segundos para player nativo), `isInternalNote` (nota privada entre administradores invisível para o cliente) e timestamp.  
  18. `TicketTask`: Checklist operacional dinâmica de resolução do chamado no painel do Super Admin, com `ticketId`, `title`, `completed` (booleano) e `position` (ordem), instanciada automaticamente por templates baseados na categoria do chamado e com suporte a adição manual de novas tarefas.  
  19. `AuditLog`: Trilha de auditoria imutável de eventos sensíveis do SaaS exclusiva para o Super Admin (`id`, `tenantId`, `userId`, `action`, `entityType`, `entityId`, `details`, `ipAddress`, `userAgent`, `createdAt`).
 
- **Relacionamentos:**  
  - Um `Plan` possui muitos `Tenants` (1:N).  
  - Um `Tenant` possui muitos `Users`, `Professionals`, `Services`, `Resources`, `Clients`, `Schedules`, `ScheduleBlocks`, `WaitlistEntries`, `FinancialEntries`, `SupportTickets` e `AuditLogs` (1:N com isolamento por `tenantId`).  
  - `Professional` e `Service` possuem relacionamento muitos-para-muitos (N:N) via `ServiceProfessional`.  
  - Um `Resource` pode estar vinculado a muitos `Services` e `Schedules` (1:N).  
  - Um `Professional` possui muitos `Schedules`, `ScheduleBlocks` e `WaitlistEntries` (1:N).  
  - Um `Service` possui muitas `WaitlistEntries` (1:N).  
  - Um `Client` possui muitos `Schedules`, `ClientPhotos` e `WaitlistEntries` (1:N).  
  - Um `Schedule` possui uma `FinancialEntry` vinculada opcional (1:1).  
  - Um `User` possui muitos `SupportTickets` e muitos `AuditLogs` (1:N).  
  - Um `SupportTicket` possui muitas `TicketMessages` e muitas `TicketTasks` (1:N com exclusão em cascata).

- **Dono de cada registro:**  
  Isolamento multi-tenant estrito: todas as tabelas contêm a coluna indexada `tenantId`. O middleware de autorização da API valida o `tenantId` do token JWT em 100% das requisições para impedir vazamento entre estabelecimentos.

- **Fluxo de autenticação:**  
  Cadastro no onboarding ➔ Criação do salão e do usuário proprietário ➔ Login com geração de JWT (15min) e Refresh Token HttpOnly (7 dias) ➔ Rotação automática de token em `/api/v1/auth/refresh`.

- **Regras de autorização:**  
  - `SUPER_ADMIN`: Acesso global ao painel `/admin` para ver métricas de MRR, bloquear salões e gerenciar planos.  
  - `ADMIN`: Dono do salão com permissão total sobre profissionais, serviços, financeiro e clientes do seu `tenantId`.  
  - `PROFESSIONAL`: Acesso restrito à sua própria agenda e ao seu demonstrativo de comissões acumuladas.  
  - `RECEPTIONIST`: Pode marcar, reagendar e lançar recebimentos, sem acesso à margem de lucro ou alteração de planos.

- **Validação de dados, Anti-Duplicação & Idempotência:**  
  - Validação estrita em tempo de execução via Zod em todos os endpoints (`body`, `query`, `params`).
  - **Interceptor Global de Erros Prisma `P2002`:** captura violações de constraints únicas do PostgreSQL e responde com HTTP 409 humanizado (ex: *"Este e-mail já está em uso"*, *"Já existe um salão cadastrado com este CNPJ/CPF"*).
  - **Idempotência no Redis:** header `Idempotency-Key` com chave temporária de 60s para evitar requisições idênticas disparadas por duplo clique do cliente.
  - **Trava de Concorrência Pessimista no PostgreSQL:** `SELECT ... FOR UPDATE` no intervalo de agendamento eliminando qualquer chance de *double-booking* concorrente.
  - **Trava de Sinal no Redis:** chave temporária `deposit:lock:{scheduleId}` de 15 minutos que reserva o slot enquanto o cliente conclui o PIX no banco.

- **Retenção e exclusão:**  
  Exclusão lógica (*soft-delete*) via `isActive: false` para manter a integridade fiscal e histórica do fluxo de caixa; dados de clientes podem ser anonimizados sob demanda (LGPD); relatórios podem ser exportados em CSV e PDF.

- **Migração e integridade da base:**  
  Migrações gerenciadas pelo Prisma ORM aplicadas diretamente no banco de dados. **Base 100% Limpa (Zero Seeds / Zero Mocks):** Proibida a inserção de salões modelo, clientes fictícios, agendamentos mockados ou dados artificiais. O banco permanece totalmente limpo para permitir testes reais de ponta a ponta desde o primeiro cadastro no onboarding.

---

## 6. PLANO DE IMPLEMENTAÇÃO
**Objetivo:** dar ao agente de IA uma ordem de construção com pontos de checagem.

- **Etapa 1, Configuração do Projeto, Utilitários de Máscaras & Infraestrutura:**  
  Monorepo pnpm workspace (`apps/web`, `apps/api`, `apps/mobile`, `packages/shared`) + Biblioteca de animações `motion` (`motion/react` v12+) + Módulo compartilhado de máscaras (`packages/shared/src/utils/masks.ts` e `masks.spec.ts`) + Configuração do Docker Compose na VPS (`PostgreSQL 16` e `Redis 7`) + Setup da suíte de testes com Vitest + Schemas Zod compartilhados para todos os recursos (Gestão Dinâmica de Planos sem defaults [`createPlanSchema`, `updatePlanSchema`], Onboarding, Vitrine por Nicho, Recursos Físicos Compartilhados [`Resource`], Sinal Anti-No-Show, Smart Waitlist, Reputação Google Meu Negócio com `googleReviewUrl`, NPS 1-5, No-Show Shield, Reativação de Churn, Suporte via Tickets [chamados, mensagens com anexos de imagem e áudio `MediaRecorder`, checklist `TicketTask`], Trilha de Auditoria [`AuditLog`] e Troca de Senha Segura do Salão com Argon2id).

- **Etapa 2, Dados, Autenticação, Anti-Duplicação & Lookups de Onboarding:**  
  Prisma schema relacional completo com `Plan` (zero defaults), `Resource` (salas/cabines/equipamentos), `ScheduleBlock`, `WaitlistEntry`, `SupportTicket`, `TicketMessage`, `TicketTask`, `AuditLog` e constraints de unicidade (`documentNumber`, `@@unique([tenantId, phone])`, `@@unique([tenantId, name])`) aplicado no Postgres da VPS + Interceptor global de erro Prisma P2002 (HTTP 409 amigável) + Base de dados 100% limpa (sem seeds ou mocks artificiais) + Módulo de autenticação com Argon2id, JWT com RBAC e endpoint seguro de alteração de senha (`POST /api/v1/auth/change-password`) + Rotas públicas da vitrine e agendamento (`GET/POST /api/v1/public/*`) + CRUD completo de planos dinâmicos no Fastify com validação estrita (`GET /api/v1/plans`, `GET /api/v1/admin/plans`, `POST /api/v1/admin/plans`, `PUT /api/v1/admin/plans/:id`, `PATCH /api/v1/admin/plans/:id/toggle-active`) + CRUD de recursos físicos (`GET/POST/PUT/DELETE /api/v1/resources`) + Módulo backend de suporte via tickets com upload multipart de prints e mensagens de áudio (`MediaRecorder`), templates de checklist operacional e transições de status + Endpoints de reputação e avaliação Google (`GET/PUT /api/v1/reputation/*`) + Trilha de auditoria (`GET /api/v1/admin/audit-logs`) + Endpoints seguros de resolução de dados cadastrais (CNPJ/CPF) com validação de documento único e localização (CEP inteligente) com cache Redis e zero menção a ferramentas externas na UI + Motor de Sinal PIX Asaas com trava de 15 minutos no Redis + Interceptor de No-Show Shield.

- **Etapa 3, Jornada Principal do Usuário (Motor, Vitrine Especializada Fora da Curva com Motion & Portal do Cliente):**  
  Implementação TDD do algoritmo de cálculo de slots livres (`availability.service.ts` com testes unitários cobrindo folgas, almoço, bloqueios de agenda `ScheduleBlock`, combos multi-serviços contínuos, tempo de pausa química/gap booking, bloqueio duplo de recursos/salas `Resource`, travel buffers de deslocamento, trava de sinal PIX ativa e 15min de buffer higiênico) + Trava atômica anti-overbooking com row locks no Postgres + Idempotência no Redis para prevenir duplo clique + Padrão Find-or-Create de clientes por telefone + Construção do portal público `/[slug]` com componente `InputMask`, o logo oficial transparente `brand/logo-semfundo.png`, cabeçalho com status ao vivo `StickyBrandHeader`, barra de categorias deslizante `CategoryPillBar`, gaveta inferior flutuante de multi-serviços `MultiServiceFloatingDrawer`, fita horizontal de 7 dias `HorizontalDayStrip` com *availability dots*, seletor de horários segmentado por turnos `ShiftSlotPicker`, adaptação especializada com todo o inventário de modais por nicho (Barbearia: `BarberExpressUpsellModal`, `BarberWaitlistModal`; Salão: `SalonPatchTestNoticeModal`, `SalonGalleryModal`, `SalonTimelineSummaryModal`; Estética: `ClinicalIntakeScreeningModal`, `PreCareGuidelinesModal`, `DigitalConsentModal`; Lash/Unhas: `LashNailPhaseSelectorModal`, `ForeignWorkAlertModal`, `LashNailCustomizationModal`, `PrepCareInstructionsModal`; Personal: `TrainingLocationModal`, `SessionPackRedeemModal`, `ParQReadinessModal`, `StrictCancelPolicyModal`; Outros: `CustomIntakeModal`, `GenericConfirmationModal`) + Modais de Sinal PIX com contador de 15 min, modal de Lista de Espera e modal acolhedor do No-Show Shield + Micro-animações do Motion (passos em accordion expansível, cards táteis, cascata de slots e traçado vetorial SVG `BookingSuccessScreen`).

- **Etapa 4, Automação WhatsApp, Filas BullMQ, Motor de Decisões Jev & Atendente Virtual IA:**  
  Subida da Evolution API v2 na VPS + Filas BullMQ:
  - `whatsapp-queue`: confirmação imediata e lembretes de 24h e 12h.
  - `birthday-queue`: rotina diária matinal às 09:00 de felicitações cordiais pelo padrão Humanizer (sem presentes ou descontos).
  - `waitlist-queue`: worker de auto-fill imediato ao cancelar horários, convocando o primeiro da fila com janela de 10 minutos.
  - `nps-queue`: worker disparado 2h pós-atendimento para pesquisa de 1 a 5 estrelas; clientes nota 5 recebem o link direto de avaliação do Google Meu Negócio (`googleReviewUrl`), notas 1-3 alertam o painel.
  - `churn-queue`: cron semanal (segundas às 10:00) calculando ciclo de retorno (`avgVisitDays`) e enviando mensagem cordial de reativação com trava de segurança de 60 dias.
  + Motor de Decisões TypeSafe Jev (System One) para roteamento determinístico de intenções e confirmações rápidas (< 100ms) + Atendente Virtual com Gemini 1.5 Flash sob o padrão Humanizer.

- **Etapa 5, Painel do Salão, Suporte via Tickets & Super Admin com Recursos Especializados:**  
  Dashboard administrativo com agenda multi-profissional (colunas verticais com Drag & Drop animado com layout springs, abas deslizantes via layoutId, drawer lateral com AnimatePresence, botão de bloqueio rápido `ScheduleBlock`, status `IN_SERVICE`, badge `🎂 Aniversariante`, badges de sinal pago/restante e recursos específicos de nicho: Barbearia com `BarberWalkInModal`, `BarberChairActionModal`, `BarberQuickBlockModal`; Salão com visualização de faixa de pausa química translúcida, `SalonWashStationModal` e `SalonColorFormulaModal`; Estética com alternador de visão por Profissional vs Sala/Equipamento `Resource`, buffer de assepsia estendido de 20-30 min, `PostCareFollowUpModal` e `AnamnesisEvolutionModal`; Lash/Unhas com badges de ciclo, `TechnicalAnamnesisModal` e régua de retorno de 18 dias; Personal com rota instantânea no Maps, `StudentWorkoutCardModal`, contador de sessões e travel buffer de 30 min) + CRM de clientes com abas de Aniversariantes do Mês/Semana, Clientes em Risco (Sumidos / Churn) e Faltas Recorrentes (No-Show Shield) + Aba Reputação & Google Meu Negócio com configuração do link `googleReviewUrl` e feed de avaliações NPS + Ficha de anamnese + Gestão financeira com abatimento de sinal PIX e comissões automáticas + Integração Asaas + Telas de Configurações do Salão em 7 abas (`/dashboard/configuracoes` e `/dashboard/perfil` com troca de senha segura via Argon2id) + Central de Suporte do Dono do Salão (`/dashboard/suporte`) com interface estilo chat, envio de prints `Ctrl+V`, gravador de áudio nativo `MediaRecorder` e player integrado + Painel Super Admin (`/admin`) com gestão global de lojas, painel de consumo de agendamentos e faturamento de excedentes, bloqueio automático por inadimplência (carência de 5 dias e tela PIX) e manual, impersonate de 1-clique, Editor Global de Planos (`/admin/planos`) com customização dinâmica completa de preços, limites, franquias e recursos sem valores default rígidos, Central de Atendimento de Suporte (`/admin/suporte`) com identificação por salão, chat com notas privadas e Checklist Operacional dinâmico (`TicketTask`) com templates automáticos por categoria e barra de progresso, e Trilha de Auditoria do Super Admin (`/admin/auditoria`) com filtros e visualizador JSON dos logs de auditoria (`AuditLog`). Todos os fluxos de exclusão protegidos pelo componente `ConfirmModal`.

- **Etapa 6, App Mobile do Profissional, Testes E2E & Lançamento:**  
  App Expo com NativeWind focado na bancada do profissional + Testes de ponta a ponta com Playwright no fluxo de agendamento + Pipeline de deploy automático no GitHub Actions para a VPS via SSH.

- **Regra de Checagem Obrigatória:**  
  Antes de passar para a próxima etapa: rodar a suíte de testes automatizados, validar os critérios de aceite visualmente e registrar qualquer ponto de atenção antes de avançar.
