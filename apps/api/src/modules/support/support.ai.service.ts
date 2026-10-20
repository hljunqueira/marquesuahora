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

export interface TenantOperationalData {
  tenantName: string;
  legalName?: string | null;
  slug: string;
  niche: string;
  phone: string;
  address: string;
  businessHours: string;
  planName: string;
  planCode: string;
  planPrice: string;
  planMaxProfessionals: number;
  planUnlimitedBookings: boolean;
  billingStatus: string;
  antiNoShowStatus: string;
  pixKeyInfo: string;
  whatsappStatus: string;
  servicesList: Array<{ name: string; price: string; duration: number; category: string; allowOnlineBooking: boolean }>;
  professionalsList: Array<{ name: string; role?: string | null; commissionRate: string; isActive: boolean }>;
  todaySchedules: Array<{ time: string; clientName: string; clientPhone?: string; professionalName: string; serviceName: string; price: string; status: string }>;
  totalClients: number;
  monthBookingsCount: number;
  formattedSnapshot: string;
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
Seu objetivo é ajudar donos de salões de beleza, barbearias, clínicas de estética, manicures e estúdios de lash/nail a tirarem qualquer dúvida operacional sobre a plataforma e fornecer informações em tempo real sobre seu próprio estabelecimento.

MAPEAMENTO DAS FUNCIONALIDADES DO MARQUESUAHORA:

1. VITRINE & AGENDAMENTO ONLINE (Link na Bio: /[slug]):
   - Cada salão possui um link público exclusivo (ex: marquesuahora.com.br/studio-vip) para colocar na bio do Instagram ou enviar no WhatsApp.
   - O cliente final acessa, escolhe o serviço, profissional parceiro, data e horário disponível, e conclui o agendamento em segundos pelo celular.
   - O salão pode personalizar o tema visual, paleta de cores, fotos da galeria e perguntas de triagem na vitrine.

2. PROTEÇÃO ANTI-FALTA (SINAL PIX DIRETO DO SALÃO - SEM RETENÇÃO):
   - Onde configurar: Menu "Configurações" > aba "Proteção Anti-Falta".
   - Como funciona: O salão ativa o toggle "Exigir Sinal Antecipado no Agendamento", define se quer valor fixo em reais (ex: R$ 20,00) ou percentual (ex: 30% ou 50%), escolhe o tipo de chave PIX (CPF, CNPJ, Celular, E-mail ou Chave Aleatória), digita a chave e o nome do titular da conta.
   - Transparência total: O dinheiro do sinal vai 100% DIRETO da conta bancária do cliente para a conta do salão. A plataforma MarqueSuaHora NÃO retém nem desconta taxas desse sinal.
   - Regra para 1ª vez: Pode ser configurada com percentual ou valor diferente exclusivo para clientes novas que nunca foram ao salão.

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
    - Planos disponíveis: Gratuito (R$ 0,00/mês - até 30 agendamentos), Profissional Solo (R$ 49,99/mês), Equipe Pro (R$ 99,99/mês).
    - O checkout de planos da plataforma é 100% white-label e seguro, aceita Cartão de Crédito e PIX.
    - Sem fidelidade ou multas de cancelamento.

DIRETRIZES CRÍTICAS PARA CLASSIFICAÇÃO E RESPOSTA:

REGRA 1 - DÚVIDA DE USO OU CONFIGURAÇÃO DO SISTEMA:
- Se a mensagem do usuário for uma dúvida de como usar o sistema:
- Responda de forma extremamente prestativa, clara, didática e acolhedora.
- Indique exatamente em qual menu clicar e quais passos seguir.
- NÃO abra ticket de erro para o admin, pois a dúvida foi sanada na hora pela IA.

REGRA 2 - RELATO DE ERRO, FALHA TÉCNICA, BUG OU INSTABILIDADE:
- Se a mensagem relatar erro, bug, falha, tela branca, não consegue salvar, erro 500/400, falha de pagamento ou instabilidade técnica:
- VOCÊ DEVE ACOLHER O CLIENTE E AVISAR QUE O TICKET PRIORITÁRIO FOI ABERTO PARA A EQUIPE TÉCNICA E PARA O ADMINISTRADOR DA PLATAFORMA.
- O prazo de análise e resposta do Administrador para esse ticket é de ATÉ 24 HORAS.
- Forneça o número de protocolo do chamado.
- Peça para o cliente detalhar se possível qual tela ou qual dispositivo estava usando enquanto o administrador analisa o caso.

REGRA 3 - CONSULTA DE DADOS REAIS DO ESTABELECIMENTO:
- Você tem acesso direto de leitura ao snapshot do banco de dados do estabelecimento sob a tag <DADOS_OPERACIONAIS_DO_ESTABELECIMENTO>.
- Sempre que o assinante perguntar "quantos agendamentos tenho hoje?", "quais meus serviços?", "qual meu plano?", "meu whatsapp tá conectado?", "como tá meu pix?", "quantos clientes eu tenho?", responda com os dados precisos do estabelecimento.

REGRA 4 - ZERO EMOJIS ORNAMENTAIS:
- Não utilize emojis decorativos (como lâmpadas, foguetes, estrelas ou fogos) nas respostas. Mantenha tipografia sóbria, elegante e profissional.`;
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
   * Consulta o banco de dados PostgreSQL e extrai o snapshot operacional completo do estabelecimento
   */
  public static async getTenantOperationalData(tenantId: string): Promise<TenantOperationalData> {
    const fallback: TenantOperationalData = {
      tenantName: 'Estabelecimento',
      slug: '',
      niche: 'Beleza e Bem-Estar',
      phone: '',
      address: '',
      businessHours: '09:00 às 19:00',
      planName: 'Plano Padrão',
      planCode: 'STANDARD',
      planPrice: '0,00',
      planMaxProfessionals: 1,
      planUnlimitedBookings: true,
      billingStatus: 'ACTIVE',
      antiNoShowStatus: 'Desativada',
      pixKeyInfo: 'Não configurada',
      whatsappStatus: 'Desconectado',
      servicesList: [],
      professionalsList: [],
      todaySchedules: [],
      totalClients: 0,
      monthBookingsCount: 0,
      formattedSnapshot: 'Sem dados operacionais adicionais disponíveis no momento.'
    };

    if (!tenantId || tenantId === 'general') {
      return fallback;
    }

    try {
      // Data de hoje no fuso horário de Brasília (UTC-3)
      const nowBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const year = nowBrasilia.getFullYear();
      const month = String(nowBrasilia.getMonth() + 1).padStart(2, '0');
      const day = String(nowBrasilia.getDate()).padStart(2, '0');
      const todayDateStr = `${year}-${month}-${day}`;
      const startOfDay = new Date(`${todayDateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${todayDateStr}T23:59:59.999Z`);
      const startOfMonth = new Date(year, nowBrasilia.getMonth(), 1);

      const [
        tenant,
        services,
        professionals,
        todaySchedules,
        totalClients,
        monthBookingsCount,
        whatsapp
      ] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { plan: true }
        }),
        prisma.service.findMany({
          where: { tenantId },
          select: {
            name: true,
            price: true,
            durationMinutes: true,
            category: true,
            allowOnlineBooking: true
          },
          orderBy: { name: 'asc' }
        }),
        prisma.professional.findMany({
          where: { tenantId },
          select: {
            name: true,
            role: true,
            phone: true,
            commissionRate: true,
            isActive: true
          },
          orderBy: { name: 'asc' }
        }),
        prisma.schedule.findMany({
          where: {
            tenantId,
            date: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          include: {
            client: { select: { name: true, phone: true } },
            professional: { select: { name: true } },
            service: { select: { name: true, price: true } }
          },
          orderBy: { startTime: 'asc' }
        }),
        prisma.client.count({ where: { tenantId } }),
        prisma.schedule.count({
          where: {
            tenantId,
            date: { gte: startOfMonth },
            status: { not: 'CANCELLED' }
          }
        }),
        prisma.whatsappConfig.findUnique({
          where: { tenantId },
          select: {
            isConnected: true,
            phoneNumber: true,
            instanceName: true
          }
        })
      ]);

      if (!tenant) return fallback;

      const servicesMapped = services.map((s) => ({
        name: s.name,
        price: Number(s.price).toFixed(2),
        duration: s.durationMinutes,
        category: s.category || 'Geral',
        allowOnlineBooking: s.allowOnlineBooking
      }));

      const professionalsMapped = professionals.map((p) => ({
        name: p.name,
        role: p.role || 'Profissional',
        commissionRate: `${Number(p.commissionRate)}%`,
        isActive: p.isActive
      }));

      const todaySchedulesMapped = todaySchedules.map((s) => ({
        time: `${s.startTime} às ${s.endTime}`,
        clientName: s.client?.name || 'Cliente',
        clientPhone: s.client?.phone,
        professionalName: s.professional?.name || 'Profissional',
        serviceName: s.service?.name || 'Serviço',
        price: Number(s.totalPrice || s.service?.price || 0).toFixed(2),
        status: s.status === 'CONFIRMED' ? 'Confirmado' : s.status === 'COMPLETED' ? 'Finalizado' : s.status === 'CANCELLED' ? 'Cancelado' : s.status
      }));

      const depositGeneralStr = tenant.depositRequired
        ? `ATIVADA (${tenant.depositType === 'PERCENTAGE' ? `${Number(tenant.depositAmount)}% do serviço` : `R$ ${Number(tenant.depositAmount).toFixed(2)} fixo`})`
        : 'DESATIVADA';

      const depositFirstStr = tenant.depositOnFirstBooking
        ? `ATIVADA para clientes novas (${tenant.depositFirstBookingType === 'PERCENTAGE' ? `${Number(tenant.depositFirstBookingPercent || tenant.depositFirstBookingValue)}%` : `R$ ${Number(tenant.depositFirstBookingValue).toFixed(2)}`})`
        : 'DESATIVADA';

      const pixKeyStr = tenant.pixKey
        ? `${tenant.pixKey} (Tipo: ${tenant.pixKeyType || 'CPF'}, Favorecido: ${tenant.pixKeyHolder || 'Não informado'})`
        : 'Não configurada';

      const whatsappStr = whatsapp?.isConnected
        ? `CONECTADO no número ${whatsapp.phoneNumber || 'Instância Ativa'}`
        : 'DESCONECTADO (Pode ser conectado via QR Code ou Código de 8 Dígitos em Configurações > WhatsApp)';

      const planNameStr = tenant.plan?.name || 'Plano Padrão';
      const planCodeStr = tenant.plan?.code || 'STANDARD';
      const planPriceStr = tenant.plan ? Number(tenant.plan.monthlyPrice).toFixed(2) : '0,00';
      const planMaxProf = tenant.plan?.maxProfessionals || 1;
      const planUnlimited = tenant.plan?.isUnlimitedBookings ?? true;

      const addressStr = `${tenant.addressStreet}, ${tenant.addressNumber}${tenant.addressComplement ? ` - ${tenant.addressComplement}` : ''}, ${tenant.addressNeighborhood}, ${tenant.addressCity} - ${tenant.addressState}, CEP: ${tenant.addressZip}`;
      const hoursStr = `${tenant.openingTime} às ${tenant.closingTime} (Intervalos de ${tenant.slotIntervalMinutes} min | Higienização: ${tenant.bufferMinutes} min)`;

      // Monta o snapshot em Markdown formatado
      const formattedDateBR = `${day}/${month}/${year}`;
      let schedulesSection = `Nenhum agendamento agendado para hoje (${formattedDateBR}).`;
      if (todaySchedulesMapped.length > 0) {
        schedulesSection = todaySchedulesMapped
          .map((s, idx) => `${idx + 1}. [${s.time}] - Cliente: ${s.clientName} (${s.clientPhone || 'Sem telefone'}) | Profissional: ${s.professionalName} | Serviço: ${s.serviceName} (R$ ${s.price}) | Status: ${s.status}`)
          .join('\n');
      }

      let servicesSection = 'Nenhum serviço cadastrado no momento.';
      if (servicesMapped.length > 0) {
        servicesSection = servicesMapped
          .map((srv, idx) => `${idx + 1}. ${srv.name} - R$ ${srv.price} (${srv.duration} min) [Categoria: ${srv.category}, Agendamento Online: ${srv.allowOnlineBooking ? 'Sim' : 'Apenas Balcão'}]`)
          .join('\n');
      }

      let professionalsSection = 'Nenhum profissional da equipe cadastrado.';
      if (professionalsMapped.length > 0) {
        professionalsSection = professionalsMapped
          .map((p, idx) => `${idx + 1}. ${p.name} - ${p.role} (Comissão: ${p.commissionRate}, Status: ${p.isActive ? 'Ativo' : 'Inativo'})`)
          .join('\n');
      }

      const formattedSnapshot = `
DADOS OPERACIONAIS EM TEMPO REAL DO ESTABELECIMENTO (POSTGRESQL):
- Estabelecimento: ${tenant.name} (${tenant.legalName || tenant.name})
- Slug da Vitrine Online: /${tenant.slug} (https://marquesuahora.com.br/${tenant.slug})
- Nicho: ${tenant.niche}
- Telefone / WhatsApp de Contato: ${tenant.phone || 'Não informado'}
- Endereço Físico: ${addressStr}
- Horário de Funcionamento: ${hoursStr}
- Feriados Nacionais: ${tenant.blockNationalHolidays ? 'Bloqueados para agendamento' : 'Aberto para agendamentos'}

PLANO & ASSINATURA DA PLATAFORMA:
- Plano Atual: ${planNameStr} (${planCodeStr}) - R$ ${planPriceStr}/mês
- Status da Assinatura: ${tenant.billingStatus}
- Limite de Profissionais Simultâneos: ${planMaxProf}
- Agendamentos: ${planUnlimited ? 'Ilimitados' : `${tenant.plan?.monthlyFreeBookings || 0}/mês`}

PROTEÇÃO ANTI-FALTA (SINAL PIX DIRETO DO SALÃO):
- Exigência de Sinal Geral: ${depositGeneralStr}
- Regra Especial para 1ª Vez (Clientes Novas): ${depositFirstStr}
- Chave PIX Cadastrada: ${pixKeyStr}
- Tolerância de Faltas sem Justificativa: ${tenant.maxNoShowsAllowed} faltas

WHATSAPP & COMUNICAÇÃO:
- Integração WhatsApp: ${whatsappStr}
- Lembretes Automáticos: Ativados (24 horas e 2 horas antes do atendimento)
- Pesquisa de Satisfação NPS: ${tenant.npsFeedbackEnabled ? 'Ativada' : 'Desativada'}
- Recuperação de Clientes Sumidos (Churn): ${tenant.churnRecoveryEnabled ? `Ativada (alerta aos ${tenant.churnAlertDays} dias)` : 'Desativada'}

AGENDAMENTOS DE HOJE (${formattedDateBR}) - Total: ${todaySchedulesMapped.length}:
${schedulesSection}

CATÁLOGO DE SERVIÇOS CADASTRADOS - Total: ${servicesMapped.length}:
${servicesSection}

EQUIPE DE PROFISSIONAIS - Total: ${professionalsMapped.length}:
${professionalsSection}

MÉTRICAS DO SALÃO:
- Total de Clientes Cadastrados no CRM: ${totalClients}
- Total de Agendamentos Realizados no Mês: ${monthBookingsCount}
`.trim();

      return {
        tenantName: tenant.name,
        legalName: tenant.legalName,
        slug: tenant.slug,
        niche: String(tenant.niche),
        phone: tenant.phone || '',
        address: addressStr,
        businessHours: hoursStr,
        planName: planNameStr,
        planCode: planCodeStr,
        planPrice: planPriceStr,
        planMaxProfessionals: planMaxProf,
        planUnlimitedBookings: planUnlimited,
        billingStatus: tenant.billingStatus,
        antiNoShowStatus: depositGeneralStr,
        pixKeyInfo: pixKeyStr,
        whatsappStatus: whatsappStr,
        servicesList: servicesMapped,
        professionalsList: professionalsMapped,
        todaySchedules: todaySchedulesMapped,
        totalClients,
        monthBookingsCount,
        formattedSnapshot
      };
    } catch (err: any) {
      console.warn('[Support AI] Erro ao buscar snapshot operacional do banco:', err?.message);
      return fallback;
    }
  }

  /**
   * Processa a mensagem do chat de suporte, respondendo via IA e abrindo ticket para o admin se for erro técnico.
   */
  public static async processMessage(params: {
    tenantId: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    attendantRole?: string;
    tenantName?: string;
    tenantSlug?: string;
    tenantNiche?: string;
    messageText: string;
    category?: TicketCategory;
    protocol?: string;
  }): Promise<SupportAiProcessResult> {
    const isErrorDetected = this.detectIsTechnicalError(params.messageText);
    const protocol = params.protocol || `#TK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Busca o snapshot operacional completo dos dados reais do estabelecimento no PostgreSQL
    const operationalData = await this.getTenantOperationalData(params.tenantId);

    const effectiveTenantName = operationalData.tenantName || params.tenantName || 'Espaço';
    const effectiveNiche = operationalData.niche || params.tenantNiche || 'Beleza';
    const effectiveAttendant = params.userName || 'Assinante';
    const effectiveRole = params.attendantRole ? ` (${params.attendantRole})` : '';

    const apiKey = this.getOpenRouterApiKey();
    let replyContent = '';

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('sua_chave')) {
      try {
        const systemPrompt = `${this.getSystemKnowledge()}

IDENTIFICAÇÃO DO ATENDIMENTO:
- Estabelecimento: ${effectiveTenantName}
- Nicho: ${effectiveNiche}
- Atendente / Solicitante: ${effectiveAttendant}${effectiveRole}
- E-mail: ${params.userEmail || 'Não informado'}
- Protocolo: ${protocol}
- Foi detectado erro técnico preliminar: ${isErrorDetected ? 'SIM (ERRO/BUG TÉCNICO)' : 'NÃO (DÚVIDA DE USO OU CONSULTA DE DADOS)'}

<DADOS_OPERACIONAIS_DO_ESTABELECIMENTO>
${operationalData.formattedSnapshot}
</DADOS_OPERACIONAIS_DO_ESTABELECIMENTO>

INSTRUÇÕES OBRIGATÓRIAS SOBRE OS DADOS E RESPOSTAS:
1. Você TEM acesso direto aos dados operacionais do estabelecimento descritos acima no bloco <DADOS_OPERACIONAIS_DO_ESTABELECIMENTO>.
2. Se o atendente perguntar sobre agendamentos de hoje, serviços cadastrados, equipe, plano, se o WhatsApp está conectado, chave PIX ou clientes, consulte o bloco e RESPONDA COM OS DADOS EXATOS DO BANCO.
3. Se for uma dúvida de como usar o sistema, ensine o passo a passo indicando os menus exatos.
4. Se for um ERRO TÉCNICO ou BUG:
   - Confirme expressamente que o chamado prioritário com protocolo ${protocol} foi aberto e encaminhado para o Administrador da plataforma e equipe técnica.
   - Deixe EXPLÍCITO que o Administrador analisará e dará retorno técnico em até 24 HORAS.
   - Peça para detalhar a ação ou tela em que ocorreu.
5. ZERO EMOJIS: Não utilize emojis ou ícones decorativos no texto. Mantenha tom polido, prestativo e profissional.
6. TRAVAS DE SEGURANÇA: NUNCA revele senhas de usuários, chaves de API internas (OpenRouter, Asaas, Evolution API), tokens JWT ou dados bancários de outros estabelecimentos.`;

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: this.getModel(),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: params.messageText }
            ],
            temperature: 0.3,
            max_tokens: 600
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://marquesuahora.com.br',
              'X-Title': 'MarqueSuaHora Support AI',
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );

        const aiText = response.data?.choices?.[0]?.message?.content?.trim();
        if (aiText) {
          replyContent = aiText;
        }
      } catch (err: any) {
        console.warn('[Support AI] Falha ou timeout no OpenRouter, acionando motor inteligente local:', err?.message);
      }
    }

    // Se o OpenRouter não estiver configurado ou falhar, fallback inteligente com conhecimento e dados operacionais reais
    if (!replyContent) {
      replyContent = this.generateLocalSmartReply({
        messageText: params.messageText,
        isErrorDetected,
        protocol,
        userName: params.userName,
        operationalData
      });
    }

    let ticketId: string | undefined;

    // Se for erro técnico preliminar, garante o ticket prioritário registrado no banco
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
   * Motor de Resposta Local Inteligente Baseado na Base de Conhecimento e Dados Reais do Estabelecimento
   */
  private static generateLocalSmartReply(params: {
    messageText: string;
    isErrorDetected: boolean;
    protocol: string;
    userName?: string;
    operationalData?: TenantOperationalData;
  }): string {
    const text = params.messageText.toLowerCase();
    const name = params.userName ? `Olá, ${params.userName}! ` : 'Olá! ';
    const op = params.operationalData;

    if (params.isErrorDetected) {
      return (
        `${name}Identifiquei que você está enfrentando uma instabilidade ou erro técnico no sistema.\n\n` +
        `[Chamado Prioritário Registrado]: protocolo **${params.protocol}**.\n\n` +
        `Nosso time técnico e o Administrador da plataforma já foram notificados com prioridade alta. O chamado será analisado e respondido em **até 24 horas**.\n\n` +
        `Se puder, descreva qual tela você estava acessando ou o que estava tentando fazer para acelerar nossa investigação.`
      );
    }

    // 1. Agendamentos de Hoje / Agenda Atual
    if (
      text.includes('agendamento') ||
      text.includes('agenda hoje') ||
      text.includes('quantos agendamentos') ||
      text.includes('tem agendamento') ||
      text.includes('clientes hoje') ||
      text.includes('horario hoje')
    ) {
      if (op && op.todaySchedules) {
        if (op.todaySchedules.length === 0) {
          return (
            `${name}Consultei a sua agenda no banco de dados e você **não possui agendamentos marcados para hoje**.\n\n` +
            `Você pode compartilhar o seu link da vitrine (**/${op.slug}**) para receber novos agendamentos online ou clicar no botão **"+ Novo Agendamento"** no menu **Agenda** para registrar um atendimento manual de balcão.`
          );
        }

        const listText = op.todaySchedules
          .map(
            (s, idx) =>
              `• **${s.time}** — ${s.clientName} com ${s.professionalName} (${s.serviceName}, R$ ${s.price}) [Status: ${s.status}]`
          )
          .join('\n');

        return (
          `${name}Consultei o sistema e você possui **${op.todaySchedules.length} agendamento(s) marcado(s) para hoje**:\n\n` +
          `${listText}\n\n` +
          `Para visualizar a grade completa com detalhes ou fazer bloqueios, acesse o menu **Agenda**.`
        );
      }
    }

    // 2. Serviços Cadastrados
    if (
      text.includes('quais serviços') ||
      text.includes('meus serviços') ||
      text.includes('serviços cadastrados') ||
      text.includes('lista de serviços') ||
      text.includes('quanto custa o serviço')
    ) {
      if (op && op.servicesList && op.servicesList.length > 0) {
        const listText = op.servicesList
          .map(
            (srv, idx) =>
              `• **${srv.name}**: R$ ${srv.price} (${srv.duration} min) — Categoria: ${srv.category} ${
                srv.allowOnlineBooking ? '[Online]' : '[Apenas Balcão]'
              }`
          )
          .join('\n');

        return (
          `${name}Você possui atualmente **${op.servicesList.length} serviço(s) cadastrado(s)** no seu estabelecimento:\n\n` +
          `${listText}\n\n` +
          `Para cadastrar novos serviços, alterar preços ou durações, acesse o menu lateral **Serviços**.`
        );
      }
    }

    // 3. Plano Atual e Assinatura
    if (
      text.includes('qual meu plano') ||
      text.includes('meu plano') ||
      text.includes('minha assinatura') ||
      text.includes('quanto pago') ||
      text.includes('limite de profissionais')
    ) {
      if (op) {
        return (
          `${name}Informações sobre a sua assinatura no MarqueSuaHora:\n\n` +
          `• **Plano:** ${op.planName} (${op.planCode})\n` +
          `• **Mensalidade:** R$ ${op.planPrice}/mês\n` +
          `• **Status da Assinatura:** ${op.billingStatus}\n` +
          `• **Limite de Profissionais:** até ${op.planMaxProfessionals} colaboradores simultâneos\n` +
          `• **Agendamentos:** ${op.planUnlimitedBookings ? 'Ilimitados' : 'Conforme franquia do plano'}\n\n` +
          `Para gerenciar faturas, formas de pagamento ou efetuar upgrade de plano, acesse o menu lateral **Planos**.`
        );
      }
    }

    // 4. WhatsApp Integrado
    if (
      text.includes('whatsapp conectado') ||
      text.includes('meu whatsapp') ||
      text.includes('status whatsapp') ||
      text.includes('whatsapp ta conectado')
    ) {
      if (op) {
        return (
          `${name}Status da sua integração com o WhatsApp:\n\n` +
          `• **Situação:** ${op.whatsappStatus}\n\n` +
          `Quando o WhatsApp está conectado, o sistema envia automaticamente confirmações no ato da reserva, lembretes de 24h e 2h antes com confirmação de presença e pesquisa pós-atendimento.\n` +
          `Para conectar ou gerenciar sua instância, acesse **Configurações > WhatsApp**.`
        );
      }
    }

    // 5. Chave PIX e Sinal Anti-Falta
    if (
      text.includes('minha chave pix') ||
      text.includes('como tá meu pix') ||
      text.includes('sinal anti-falta') ||
      text.includes('proteção anti-falta') ||
      text.includes('qual pix')
    ) {
      if (op) {
        return (
          `${name}Configuração atual da Proteção Anti-Falta do seu salão:\n\n` +
          `• **Status do Sinal Geral:** ${op.antiNoShowStatus}\n` +
          `• **Chave PIX Cadastrada:** ${op.pixKeyInfo}\n\n` +
          `O valor do adiantamento cai 100% direto na sua conta bancária sem qualquer retenção ou taxa da plataforma.\n` +
          `Para alterar o valor do sinal, tipo de cobrança (fixo ou percentual) ou a chave cadastrada, acesse **Configurações > Proteção Anti-Falta**.`
        );
      }
    }

    // 6. Equipe e Profissionais
    if (
      text.includes('minha equipe') ||
      text.includes('quem trabalha') ||
      text.includes('meus profissionais') ||
      text.includes('comissão') ||
      text.includes('colaboradores')
    ) {
      if (op && op.professionalsList && op.professionalsList.length > 0) {
        const teamText = op.professionalsList
          .map(
            (p, idx) =>
              `• **${p.name}** (${p.role || 'Profissional'}) — Comissão: ${p.commissionRate} [Status: ${
                p.isActive ? 'Ativo' : 'Inativo'
              }]`
          )
          .join('\n');

        return (
          `${name}Sua equipe possui atualmente **${op.professionalsList.length} colaborador(es) cadastrado(s)**:\n\n` +
          `${teamText}\n\n` +
          `Para adicionar colaboradores, definir horários individuais de trabalho ou ajustar percentuais de comissão, acesse o menu **Equipe**.`
        );
      }
    }

    // 7. Total de Clientes / CRM
    if (
      text.includes('quantos clientes') ||
      text.includes('meus clientes') ||
      text.includes('total de clientes')
    ) {
      if (op) {
        return (
          `${name}Você possui atualmente **${op.totalClients} cliente(s) cadastrado(s)** no seu CRM.\n\n` +
          `Neste mês, o seu estabelecimento já realizou **${op.monthBookingsCount} agendamento(s)**.\n` +
          `Para consultar o histórico de visitas, aniversariantes e clientes sumidos há mais de 45 dias, acesse o menu **Clientes & CRM**.`
        );
      }
    }

    // 8. Como configurar Sinal PIX
    if (text.includes('sinal') || text.includes('pix') || text.includes('anti-falta') || text.includes('falta')) {
      return (
        `${name}Para configurar o **Sinal Antecipado (PIX Direto)** e combater faltas:\n\n` +
        `1. Acesse o menu lateral **Configurações** > aba **Proteção Anti-Falta**.\n` +
        `2. Ative o toggle **"Exigir Sinal Antecipado no Agendamento"**.\n` +
        `3. Escolha o tipo de cobrança: **Valor Fixo em R$** ou **Percentual (%)**.\n` +
        `4. Preencha o seu **Tipo de Chave PIX** (CPF, CNPJ, Celular, etc.), sua **Chave PIX** e o **Nome do Titular da Conta**.\n` +
        `5. Clique em **Salvar Configurações**.\n\n` +
        `O dinheiro cai 100% direto na sua conta bancária sem qualquer desconto ou intermediação da plataforma.`
      );
    }

    // 9. Agenda e Bloqueios
    if (text.includes('agenda') || text.includes('bloquear') || text.includes('almoço') || text.includes('folga') || text.includes('horario')) {
      return (
        `${name}Sobre o funcionamento da **Agenda**:\n\n` +
        `• **Bloquear Horário (Folga/Almoço):** No menu **Agenda**, clique no botão **"+ Bloquear Horário"** no topo, escolha o profissional, data e faixa de horário.\n` +
        `• **Agendamento Manual:** Para agendar alguém pelo balcão ou telefone, clique em **"+ Novo Agendamento"**.\n` +
        `• **Grade Semanal e Diária:** Você pode alternar a visualização entre dias e semanas no canto superior da tela para ver toda a sua equipe.`
      );
    }

    // 10. Cadastro de Serviços
    if (text.includes('serviço') || text.includes('servico') || text.includes('categoria')) {
      return (
        `${name}Para cadastrar ou editar **Serviços**:\n\n` +
        `1. Acesse o menu lateral **Serviços**.\n` +
        `2. Clique em **"+ Novo Serviço"**.\n` +
        `3. Informe o nome, categoria, preço e a **duração em minutos** (essencial para o cálculo automático dos intervalos na agenda).\n` +
        `4. Marque se o serviço pode ser agendado online pelos clientes e vincule quais profissionais da sua equipe realizam esse procedimento.`
      );
    }

    // 11. Vitrine e Link na Bio
    if (text.includes('vitrine') || text.includes('link') || text.includes('bio') || text.includes('instagram') || text.includes('site')) {
      return (
        `${name}O seu **Link Oficial de Agendamentos (Link da Bio)**:\n\n` +
        `• Fica visível no topo do seu painel e no rodapé do menu lateral ("Ver Vitrine").\n` +
        `• Você pode copiar esse link e colar diretamente na bio do seu Instagram ou enviar no WhatsApp para seus clientes.\n` +
        `• Em **Configurações > Vitrine & Cores**, você pode personalizar as cores, banner, logo e tema visual do seu espaço.`
      );
    }

    // 12. WhatsApp e Notificações em geral
    if (text.includes('whatsapp') || text.includes('notific') || text.includes('lembrete') || text.includes('mensagem')) {
      return (
        `${name}As **Notificações Automáticas no WhatsApp** funcionam assim:\n\n` +
        `• O sistema envia a confirmação imediata assim que a cliente marca o horário.\n` +
        `• Dispara lembretes automáticos com 24 horas e 2 horas de antecedência.\n` +
        `• O cliente pode responder com "1" para confirmar presença ou solicitar reagendamento.\n` +
        `• Após o atendimento, o sistema envia automaticamente a pesquisa de satisfação NPS com avaliação por estrelas.`
      );
    }

    // 13. Planos e Assinatura em geral
    if (text.includes('plano') || text.includes('assinatura') || text.includes('mensalidade') || text.includes('pagar plano') || text.includes('upgrade')) {
      return (
        `${name}Sobre os **Planos do MarqueSuaHora**:\n\n` +
        `• Você pode conferir os planos disponíveis ou fazer upgrade acessando o menu **Planos** no dashboard.\n` +
        `• O pagamento é simples e seguro, aceitando Cartão de Crédito ou PIX com ativação imediata.\n` +
        `• Não há fidelidade nem taxas ocultas.`
      );
    }

    // 14. Resposta padrão
    return (
      `${name}Sou a inteligência artificial de suporte do MarqueSuaHora!\n\n` +
      `Estou conectada ao seu estabelecimento e posso tirar qualquer dúvida sobre a plataforma ou passar informações em tempo real sobre seus dados:\n` +
      `• Seus **Agendamentos de Hoje**;\n` +
      `• Como configurar seu **Sinal PIX Direto**;\n` +
      `• Seus **Serviços** e **Profissionais** cadastrados;\n` +
      `• Como gerenciar a **Agenda** e fazer **Bloqueios**;\n` +
      `• Status do seu **Plano** e do seu **WhatsApp**.\n\n` +
      `Como posso te orientar agora?`
    );
  }
}
