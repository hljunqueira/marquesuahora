import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { TicketCategory, TicketPriority, TicketStatus, TicketSenderType } from '@prisma/client';

export interface SupportAiProcessResult {
  replyText: string;
  isTechnicalError: boolean;
  category: TicketCategory;
  priority: TicketPriority;
  ticketId?: string;
  protocol: string;
  slaHours?: number;
}

export class SupportAiService {
  private static getOpenRouterApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }

  private static getModel(): string {
    return process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
  }

  /**
   * Conhecimento profundo estruturado de todas as funcionalidades do MarqueSuaHora
   */
  private static getSystemKnowledge(): string {
    return `Você é a inteligência artificial especialista e analista de suporte oficial da plataforma SaaS "MarqueSuaHora".
Seu objetivo é ajudar donos de salões de beleza, barbearias, clínicas de estética, manicures e estúdios de lash/nail a tirarem qualquer dúvida operacional sobre a plataforma, guiando-os passo a passo pelo sistema.

MAPEAMENTO DAS FUNCIONALIDADES DO MARQUESUAHORA:

1. VITRINE & AGENDAMENTO ONLINE (Link na Bio: /[slug]):
   - Cada salão possui um link público exclusivo (ex: marquesuahora.com.br/studio-vip) para colocar na bio do Instagram ou enviar no WhatsApp.
   - O cliente final acessa, escolhe o serviço, profissional parceiro, data e horário disponível, e conclui o agendamento em segundos pelo celular.
   - O salão pode personalizar o tema visual, paleta de cores, fotos da galeria e perguntas de triagem na vitrine.

2. PROTEÇÃO ANTI-FALTA (SINAL PIX DIRETO DO SALÃO - SEM RETENÇÃO):
   - Onde configurar: Menu "Configurações" > aba "Proteção Anti-Falta".
   - Como funciona: O salão ativa o toggle "Exigir Sinal Antecipado no Agendamento", define se quer valor fixo em reais (ex: R$ 20,00) ou percentual (ex: 30% ou 50%), escolhe o tipo de chave PIX (CPF, CNPJ, Celular, E-mail ou Chave Aleatória), digita a chave e o nome do titular da conta.
   - Transparência total: O dinheiro do sinal vai 100% DIRETO da conta bancária do cliente para a conta do salão. A plataforma MarqueSuaHora NÃO retém nem desconta taxas desse sinal.
   - Na vitrine, o cliente copia a chave PIX, paga no app do banco dele e clica no botão do WhatsApp que já abre com a mensagem pronta enviando o comprovante para o salão confirmar o agendamento.

3. AGENDA & ATENDIMENTOS:
   - Menu "Agenda" e "Agendamentos".
   - Visualização em grade semanal e visão diária em tempo real.
   - Para agendar manualmente um cliente que ligou ou chamou no balcão: clique no botão "+ Novo Agendamento", selecione cliente, profissional, serviço, data e horário.
   - Para bloquear horários (almoço, médico, folga): clique em "+ Bloquear Horário", selecione o profissional, data e faixa de horário de início e fim.
   - Para reagendar ou cancelar: clique sobre o agendamento no calendário para abrir os detalhes, com botões de confirmar, remarcar ou cancelar.

4. CLIENTES & CRM:
   - Menu "Clientes & CRM".
   - Lista completa de clientes com histórico de visitas, total investido no salão e data do último atendimento.
   - Controle de faltas (no-show): o sistema contabiliza faltas e pode alertar ou restringir clientes com faltas recorrentes.
   - Recuperação de clientes sumidos (Churn Recovery): alerta automático de clientes que não voltam há mais de 45 dias para o salão mandar mensagem de reativação com cupom.

5. SERVIÇOS & PREÇOS:
   - Menu "Serviços".
   - Cadastro com nome, descrição, categoria, preço e tempo de duração (minutos).
   - Flag "Permitir Agendamento Online na Vitrine": se desativado, o serviço só pode ser agendado internamente pela equipe.
   - Vínculo por profissional: cada serviço pode ser habilitado apenas para os colaboradores qualificados.

6. EQUIPE & COMISSÕES:
   - Menu "Equipe".
   - Cadastro de profissionais parceiros, fotos de avatar, cor no calendário, dias e horários de trabalho individualizados.
   - Configuração da taxa de comissão (%) de cada colaborador para cálculo automático no financeiro.

7. FINANCEIRO & RELATÓRIOS:
   - Menu "Financeiro".
   - Gráficos de faturamento diário, semanal e mensal, faturamento total por profissional e comissões calculadas prontas para acerto.
   - Ticket médio por atendimento e previsão de recebíveis.

8. PRODUTOS & BALCÃO:
   - Menu "Produtos".
   - Cadastro de cosméticos, pomadas, shampoos e óleos para venda de balcão durante o atendimento, com estoque e preço de custo/venda.

9. CURSOS & AULAS LIVRES:
   - Menu "Cursos & Aulas".
   - Criação de workshops, mentorias ou aulas com título, valor de inscrição, link das aulas em vídeo e venda direta na vitrine.

10. AUTOMAÇÕES WHATSAPP & E-MAIL:
    - Notificações automáticas via Evolution API e Resend:
      • Confirmação instantânea assim que o agendamento é feito.
      • Lembretes inteligentes 24h e 2h antes do atendimento com botão "1 para Confirmar" ou "2 para Remarcar".
      • Pesquisa de satisfação pós-atendimento (NPS com estrelas ou nota 1 a 5).
      • Mensagens de felicitações de aniversário automáticas com cupom de desconto.

11. PLANOS E ASSINATURA MARQUESUAHORA:
    - Menu "Planos" no Dashboard.
    - Planos disponíveis: Solo (R$ 39/mês), Equipe Pro (R$ 79/mês), etc.
    - O checkout de planos da plataforma é 100% white-label e seguro, aceita Cartão de Crédito e PIX.
    - Sem fidelidade ou multas de cancelamento.

DIRETRIZES CRÍTICAS PARA CLASSIFICAÇÃO E RESPOSTA:

REGRA 1 - DÚVIDA DE USO OU CONFIGURAÇÃO DO SISTEMA:
- Se a mensagem do usuário for uma dúvida de como usar o sistema (ex: "como coloco o PIX?", "como cadastro um serviço?", "onde vejo minha agenda?", "como dou desconto?", "como funciona o lembrete?"):
- Responda de forma extremamente prestativa, clara, didática e calorosa.
- Indique exatamente em qual menu clicar e quais passos seguir.
- NÃO abra ticket de erro para o admin, pois a dúvida foi sanada na hora pela IA.

REGRA 2 - RELATO DE ERRO, FALHA TÉCNICA, BUG OU INSTABILIDADE:
- Se a mensagem relatar que algo deu erro, falhou, travou, tela branca, não consegue salvar, erro 500/400, falha de pagamento de fatura, não recebe código, ou qualquer problema técnico inesperado no sistema:
- VOCÊ DEVE ACOLHER O CLIENTE E AVISAR QUE O TICKET FOI ABERTO PARA A EQUIPE TÉCNICA E PARA O ADMINISTRADOR DA PLATAFORMA.
- O prazo de análise e resposta do Administrador para esse ticket é de ATÉ 24 HORAS.
- Forneça o número de protocolo do chamado.
- Peça para o cliente detalhar se possível qual tela ou qual dispositivo estava usando enquanto o administrador analisa o caso.`;
  }

  /**
   * Identifica se o texto contém fortes indícios de erro técnico / bug
   */
  public static detectIsTechnicalError(text: string): boolean {
    const lower = text.toLowerCase();
    const errorKeywords = [
      'erro',
      'bug',
      'travou',
      'falha',
      'não consigo salvar',
      'nao consigo salvar',
      'tela branca',
      'parou de funcionar',
      'não está funcionando',
      'nao esta funcionando',
      'caiu',
      'quebrou',
      'deu pau',
      'problema no sistema',
      'instabilidade',
      'chamado urgente',
      'socorro',
      'falha ao agendar',
      'erro 500',
      'erro 400',
      'não carrega',
      'nao carrega',
      'perdi meus dados',
      'sumiu tudo',
      'bugou'
    ];

    return errorKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * Processa a mensagem do chat de suporte, respondendo via IA e abrindo ticket para o admin se for erro técnico.
   */
  public static async processMessage(params: {
    tenantId: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    tenantName?: string;
    tenantSlug?: string;
    tenantNiche?: string;
    messageText: string;
    category?: TicketCategory;
    protocol?: string;
  }): Promise<SupportAiProcessResult> {
    const isErrorDetected = this.detectIsTechnicalError(params.messageText);
    const protocol = params.protocol || `#TK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const nicheMap: Record<string, string> = {
      BARBERSHOP: 'Barbearia / Estética Masculina (use termos nativos: barbeiro, barba, corte, estilo, produtos de barbearia)',
      BEAUTY_SALON: 'Salão de Beleza / Cabeleireiro (use termos nativos: cabeleireira, mechas, escova, hidratação, procedimento)',
      NAIL_LASH_STUDIO: 'Studio de Unhas & Cílios (use termos nativos: manicure, pedicure, alongamento em gel, extensão de cílios, lash, volume russo)',
      AESTHETICS_CLINIC: 'Clínica de Estética & Bem-Estar (use termos nativos: esteticista, sessão, procedimento estético, avaliação facial/corporal)',
      OTHER: 'Espaço de Beleza e Bem-Estar'
    };
    const nicheGuide = nicheMap[params.tenantNiche || ''] || 'Espaço de Beleza e Bem-Estar';

    const apiKey = this.getOpenRouterApiKey();
    let replyContent = '';

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('sua_chave')) {
      try {
        const systemPrompt = `${this.getSystemKnowledge()}

IDENTIFICAÇÃO DO ESTABELECIMENTO E NICHO:
- Estabelecimento: ${params.tenantName || 'Espaço'}
- Nicho de Atuação: ${nicheGuide}
- Usuário em atendimento: ${params.userName || 'Assinante'} (${params.userEmail || ''})
- Protocolo do atendimento: ${protocol}
- Foi detectado erro técnico preliminar: ${isErrorDetected ? 'SIM (ERRO/BUG)' : 'NÃO (DÚVIDA DE USO)'}

TRAVAS DE SEGURANÇA E SIGILO ABSOLUTO:
1. É ESTRITAMENTE PROIBIDO informar, divulgar, sugerir ou confirmar qualquer senha, chave de API (OpenRouter, Asaas, Resend, Evolution API, etc.), segredo de webhook, token de autenticação JWT, credenciais de banco de dados ou detalhes internos de infraestrutura/código.
2. Responda EXCLUSIVAMENTE sobre como usar o sistema MarqueSuaHora (telas, botões, agendamentos, serviços, regras e configurações).
3. Se alguém perguntar por senhas, credenciais ou tokens de API, responda de forma cordial e profissional que o suporte ao usuário não fornece dados de segurança ou infraestrutura técnica.

INSTRUÇÕES OBRIGATÓRIAS DE RESPOSTA:
1. Responda em português claro, profissional, acolhedor e seguro, tratando o usuário pelo nome (${params.userName || 'parceiro'}) e usando termos do seu nicho (${params.tenantNiche || 'Beleza'}).
2. Se for um ERRO TÉCNICO ou BUG:
   - Confirme expressamente que um ticket prioritário com protocolo ${protocol} foi encaminhado para a equipe técnica e para o Administrador da plataforma.
   - Deixe EXPLÍCITO que o Administrador analisará e dará o retorno técnico em até 24 HORAS.
   - Peça, caso queira, para enviar um print ou detalhar a ação que causou o erro.
3. Se for DÚVIDA DO SISTEMA:
   - Responda objetivamente explicando onde clicar na plataforma (ex: "Acesse Configurações > Proteção Anti-Falta...") e tire 100% da dúvida.
4. Mantenha as mensagens agradáveis, sem formatações quebradas ou excesso de jargões técnicos complexos.`;

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: this.getModel(),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: params.messageText }
            ],
            temperature: 0.3,
            max_tokens: 500
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://marquesuahora.com.br',
              'X-Title': 'MarqueSuaHora Support AI',
              'Content-Type': 'application/json'
            },
            timeout: 4500
          }
        );

        const aiText = response.data?.choices?.[0]?.message?.content?.trim();
        if (aiText) {
          replyContent = aiText;
        }
      } catch (err: any) {
        console.warn('[Support AI] Falha ou timeout ao consultar OpenRouter, acionando motor inteligente local:', err?.message);
      }
    }

    // Se o OpenRouter não estiver configurado ou falhar, fallback inteligente com regras mapeadas
    if (!replyContent) {
      replyContent = this.generateLocalSmartReply({
        messageText: params.messageText,
        isErrorDetected,
        protocol,
        userName: params.userName
      });
    }

    let ticketId: string | undefined;

    // Se for um ERRO TÉCNICO ou BUG, registra o chamado no banco para o Administrador resolver em até 24h
    if (isErrorDetected && params.tenantId && params.tenantId !== 'general') {
      try {
        const tenantExists = await prisma.tenant.findUnique({
          where: { id: params.tenantId },
          select: { id: true }
        });

        if (tenantExists) {
          const ticket = await prisma.supportTicket.create({
            data: {
              protocol,
              tenantId: params.tenantId,
              userId: params.userId,
              subject: `[SUPORTE IA - ERRO TÉCNICO] ${params.messageText.slice(0, 80)}`,
              category: TicketCategory.TECHNICAL_ISSUE,
              priority: TicketPriority.HIGH,
              status: TicketStatus.OPEN,
              messages: {
                create: [
                  {
                    senderId: params.userId,
                    senderType: TicketSenderType.TENANT,
                    content: params.messageText
                  },
                  {
                    senderId: params.userId,
                    senderType: TicketSenderType.SUPER_ADMIN,
                    content: `[IA Assistente]: ${replyContent}`
                  }
                ]
              },
              tasks: {
                create: [
                  { title: 'Analisar relato de erro técnico e reproduzir', completed: false, position: 0 },
                  { title: 'Verificar logs da API e banco de dados do salão', completed: false, position: 1 },
                  { title: 'Aplicar correção e validar estabilidade', completed: false, position: 2 },
                  { title: 'Retornar ao cliente em até 24 horas', completed: false, position: 3 }
                ]
              }
            }
          });
          ticketId = ticket.id;
        }
      } catch (dbErr) {
        console.warn('[Support AI] Aviso: Não foi possível persistir ticket de erro no banco:', dbErr);
      }
    }

    return {
      replyText: replyContent,
      isTechnicalError: isErrorDetected,
      category: isErrorDetected ? TicketCategory.TECHNICAL_ISSUE : TicketCategory.DOUBT,
      priority: isErrorDetected ? TicketPriority.HIGH : TicketPriority.LOW,
      ticketId,
      protocol,
      slaHours: isErrorDetected ? 24 : undefined
    };
  }

  /**
   * Motor de Resposta Local Inteligente Baseado na Base de Conhecimento do MarqueSuaHora
   */
  private static generateLocalSmartReply(params: {
    messageText: string;
    isErrorDetected: boolean;
    protocol: string;
    userName?: string;
  }): string {
    const text = params.messageText.toLowerCase();
    const name = params.userName ? `Olá, ${params.userName}! ` : 'Olá! ';

    if (params.isErrorDetected) {
      return (
        `${name}Identifiquei que você está enfrentando uma instabilidade ou erro técnico no sistema.\n\n` +
        `🚨 **Chamado Prioritário Registrado:** protocolo **${params.protocol}**.\n\n` +
        `Nosso time técnico e o Administrador da plataforma já foram notificados com prioridade alta. O chamado será analisado e respondido em **até 24 horas**.\n\n` +
        `Se puder, descreva qual tela você estava acessando ou o que estava tentando fazer para acelerar nossa investigação.`
      );
    }

    // 1. Sinal PIX Direto
    if (text.includes('sinal') || text.includes('pix') || text.includes('anti-falta') || text.includes('falta')) {
      return (
        `${name}Para configurar o **Sinal Antecipado (PIX Direto)** e combater faltas:\n\n` +
        `1. Acesse o menu lateral **Configurações** > aba **Proteção Anti-Falta**.\n` +
        `2. Ative o toggle **"Exigir Sinal Antecipado no Agendamento"**.\n` +
        `3. Escolha o tipo de cobrança: **Valor Fixo em R$** ou **Percentual (%)**.\n` +
        `4. Preencha o seu **Tipo de Chave PIX** (CPF, CNPJ, Celular, etc.), sua **Chave PIX** e o **Nome do Titular da Conta**.\n` +
        `5. Clique em **Salvar Configurações**.\n\n` +
        `💡 *Lembre-se: O dinheiro cai 100% direto na sua conta bancária sem qualquer desconto ou intermediação da plataforma!*`
      );
    }

    // 2. Agenda e Bloqueios
    if (text.includes('agenda') || text.includes('bloquear') || text.includes('almoço') || text.includes('folga') || text.includes('horario')) {
      return (
        `${name}Sobre o funcionamento da **Agenda**:\n\n` +
        `• **Bloquear Horário (Folga/Almoço):** No menu **Agenda**, clique no botão **"+ Bloquear Horário"** no topo, escolha o profissional, data e faixa de horário.\n` +
        `• **Agendamento Manual:** Para agendar alguém pelo balcão ou telefone, clique em **"+ Novo Agendamento"**.\n` +
        `• **Grade Semanal e Diária:** Você pode alternar a visualização entre dias e semanas no canto superior da tela para ver toda a sua equipe.`
      );
    }

    // 3. Serviços
    if (text.includes('serviço') || text.includes('servico') || text.includes('preço') || text.includes('preco') || text.includes('categoria')) {
      return (
        `${name}Para cadastrar ou editar **Serviços**:\n\n` +
        `1. Acesse o menu lateral **Serviços**.\n` +
        `2. Clique em **"+ Novo Serviço"**.\n` +
        `3. Informe o nome, categoria, preço e a **duração em minutos** (essencial para o cálculo automático dos intervalos na agenda).\n` +
        `4. Marque se o serviço pode ser agendado online pelos clientes e vincule quais profissionais da sua equipe realizam esse procedimento.`
      );
    }

    // 4. Equipe e Comissões
    if (text.includes('equipe') || text.includes('comiss') || text.includes('colaborador') || text.includes('profissional')) {
      return (
        `${name}Para gerenciar sua **Equipe e Comissões**:\n\n` +
        `1. Acesse o menu lateral **Equipe**.\n` +
        `2. Adicione os colaboradores com nome, telefone e foto.\n` +
        `3. Defina a **taxa de comissão (%)** de cada um. O sistema calcula automaticamente os valores a pagar em cada atendimento no menu **Financeiro**.\n` +
        `4. Configure os dias e horários de expediente de cada colaborador para que a vitrine só abra vagas nos dias em que eles realmente trabalham.`
      );
    }

    // 5. Vitrine e Link na Bio
    if (text.includes('vitrine') || text.includes('link') || text.includes('bio') || text.includes('instagram') || text.includes('site')) {
      return (
        `${name}O seu **Link Oficial de Agendamentos (Link da Bio)**:\n\n` +
        `• Fica visível no topo do seu painel e no rodapé do menu lateral ("Ver Vitrine").\n` +
        `• Você pode copiar esse link e colar diretamente na bio do seu Instagram ou enviar no WhatsApp para seus clientes.\n` +
        `• Em **Configurações > Vitrine & Cores**, você pode personalizar as cores, banner, logo e tema visual do seu espaço.`
      );
    }

    // 6. WhatsApp e Notificações
    if (text.includes('whatsapp') || text.includes('notific') || text.includes('lembrete') || text.includes('mensagem')) {
      return (
        `${name}As **Notificações Automáticas no WhatsApp** funcionam assim:\n\n` +
        `• O sistema envia a confirmação imediata assim que a cliente marca o horário.\n` +
        `• Dispara lembretes automáticos com 24 horas e 2 horas de antecedência.\n` +
        `• O cliente pode responder com "1" para confirmar presença ou solicitar reagendamento.\n` +
        `• Após o atendimento, o sistema envia automaticamente a pesquisa de satisfação NPS com avaliação por estrelas!`
      );
    }

    // 7. Planos e Assinatura
    if (text.includes('plano') || text.includes('assinatura') || text.includes('mensalidade') || text.includes('pagar plano') || text.includes('upgrade')) {
      return (
        `${name}Sobre os **Planos do MarqueSuaHora**:\n\n` +
        `• Você pode conferir os planos disponíveis ou fazer upgrade acessando o menu **Planos** no dashboard.\n` +
        `• O pagamento é simples e seguro, aceitando Cartão de Crédito ou PIX com ativação imediata.\n` +
        `• Não há fidelidade nem taxas ocultas.`
      );
    }

    // 8. Resposta acolhedora padrão para outras dúvidas
    return (
      `${name}Sou o assistente de inteligência artificial do MarqueSuaHora!\n\n` +
      `Estou aqui para tirar qualquer dúvida sobre o uso da plataforma:\n` +
      `• Como configurar sua **Chave PIX direta** para sinal anti-falta;\n` +
      `• Como cadastrar **Serviços**, **Profissionais** e **Comissões**;\n` +
      `• Como gerenciar a **Agenda** e fazer **Bloqueios de Horário**;\n` +
      `• Como usar seu **Link da Vitrine** para receber agendamentos online.\n\n` +
      `Como posso te ajudar especificamente hoje?`
    );
  }
}
