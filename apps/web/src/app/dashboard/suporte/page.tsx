'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Mic, Send, HelpCircle, User } from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export type TicketCategory = 'SUPORTE' | 'MELHORIA' | 'FINANCEIRO' | 'ERRO_TECNICO';

const QUICK_QUESTIONS = [
  'Quantos agendamentos tenho hoje?',
  'Quais são meus serviços?',
  'Meu WhatsApp tá conectado?',
  'Como configurar sinal PIX?',
  'Qual é o meu plano?',
  'Relatar erro no sistema'
];

interface ChatMessage {
  id: string;
  sender: 'TENANT' | 'SUPPORT';
  content?: string;
  attachmentUrl?: string;
  audioDurationSeconds?: number;
  timestamp: string;
  isAi?: boolean;
  isTechnicalError?: boolean;
  slaHours?: number;
}

const TICKET_CATEGORIES = [
  {
    id: 'SUPORTE' as TicketCategory,
    title: 'Dúvidas e Uso do Sistema',
    desc: 'Agenda, vitrine online, sinal anti-falta PIX ou regras',
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200'
  },
  {
    id: 'ERRO_TECNICO' as TicketCategory,
    title: 'Relatar Erro Técnico / Bug',
    desc: 'Falhas, travamentos ou instabilidade (SLA prioritário 24h)',
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200'
  },
  {
    id: 'FINANCEIRO' as TicketCategory,
    title: 'Financeiro & Planos',
    desc: 'Assinaturas da plataforma, upgrade ou faturas',
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  {
    id: 'MELHORIA' as TicketCategory,
    title: 'Sugestão de Melhoria',
    desc: 'Ideias de novos recursos ou ajustes de fluxo',
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200'
  }
];

const ATTENDANT_ROLES = [
  'Proprietário(a) / Administrador(a)',
  'Recepção / Atendimento',
  'Profissional Parceiro(a)',
  'Financeiro / Gestão'
];

function detectIsTechnicalError(text: string): boolean {
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

function generateFrontendSmartReply(params: {
  messageText: string;
  isErrorDetected: boolean;
  protocol: string;
  userName?: string;
  tenantName?: string;
}): string {
  const text = params.messageText.toLowerCase();
  const name = params.userName && params.userName !== 'Estabelecimento' ? `Olá, ${params.userName}! ` : 'Olá! ';

  if (params.isErrorDetected) {
    return (
      `${name}Identifiquei que você está enfrentando uma instabilidade ou erro técnico no sistema.\n\n` +
      `[Chamado Prioritário Registrado]: protocolo **${params.protocol}**.\n\n` +
      `Nosso time técnico e o Administrador da plataforma já foram notificados com prioridade alta. O chamado será analisado e respondido em **até 24 horas**.\n\n` +
      `Se puder, descreva qual tela você estava acessando ou o que estava tentando fazer para acelerar nossa investigação.`
    );
  }

  // 1. Sinal PIX Direto e Proteção Anti-Falta
  if (text.includes('sinal') || text.includes('pix') || text.includes('anti-falta') || text.includes('falta') || text.includes('adiantamento')) {
    return (
      `${name}Para configurar o **Sinal Antecipado (PIX Direto)** e combater faltas:\n\n` +
      `1. Acesse o menu lateral **Configurações** > aba **Proteção Anti-Falta**.\n` +
      `2. Ative o toggle **"Exigir Sinal Antecipado no Agendamento"**.\n` +
      `3. Escolha o tipo de cobrança: **Valor Fixo em R$** ou **Percentual (%)**.\n` +
      `4. Você também pode ativar a regra específica para a **1ª vez da cliente** de forma independente.\n` +
      `5. Preencha o seu **Tipo de Chave PIX** (CPF, CNPJ, Celular, etc.), sua **Chave PIX** e o **Nome do Titular da Conta**.\n` +
      `6. Clique em **Salvar Configurações**.\n\n` +
      `O valor pago pelo cliente vai 100% direto para a sua conta bancária sem qualquer retenção ou taxa da plataforma.`
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
      `• Após o atendimento, o sistema envia automaticamente a pesquisa de satisfação NPS com avaliação por estrelas.`
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

  // 8. Resposta padrão acolhedora
  return (
    `${name}Sou a inteligência artificial de suporte do MarqueSuaHora!\n\n` +
    `Estou conectada ao seu estabelecimento e posso tirar qualquer dúvida operacional sobre a plataforma ou consultar informações dos seus dados no sistema:\n` +
    `• Seus **Agendamentos de Hoje**;\n` +
    `• Configuração do **Sinal PIX Direto**;\n` +
    `• Seus **Serviços** e **Profissionais** da equipe;\n` +
    `• Como gerenciar a **Agenda** e fazer **Bloqueios**;\n` +
    `• Status do seu **Plano** e do seu **WhatsApp**.\n\n` +
    `Como posso te orientar agora?`
  );
}

function renderInlineText(text: string, isMe: boolean) {
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={pIdx} className={`font-bold ${isMe ? 'text-white' : 'text-slate-900'}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={pIdx}
          className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
            isMe ? 'bg-slate-800 text-purple-300' : 'bg-slate-100 text-purple-700'
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          key={pIdx}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className={`underline font-semibold underline-offset-2 ${
            isMe ? 'text-purple-300 hover:text-white' : 'text-purple-700 hover:text-purple-900'
          }`}
        >
          {label}
        </a>
      );
    }
    return part;
  });
}

function renderFormattedMessage(text: string, isMe: boolean) {
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const isNumbered = /^\d+\.\s/.test(trimmed);

    if (isBullet) {
      const cleanLine = trimmed.replace(/^[•\-\*]\s*/, '');
      return (
        <div key={lineIdx} className="flex items-start gap-2 my-1 pl-0.5">
          <span className={`font-bold shrink-0 leading-relaxed ${isMe ? 'text-purple-300' : 'text-purple-600'}`}>
            •
          </span>
          <span className="flex-1 leading-relaxed">{renderInlineText(cleanLine, isMe)}</span>
        </div>
      );
    }

    if (isNumbered) {
      const numMatch = trimmed.match(/^(\d+\.)\s*(.*)$/);
      if (numMatch) {
        const [, num, rest] = numMatch;
        return (
          <div key={lineIdx} className="flex items-start gap-2 my-1 pl-0.5">
            <span className={`font-bold font-mono text-xs shrink-0 leading-relaxed ${isMe ? 'text-purple-300' : 'text-purple-700'}`}>
              {num}
            </span>
            <span className="flex-1 leading-relaxed">{renderInlineText(rest, isMe)}</span>
          </div>
        );
      }
    }

    if (trimmed === '') {
      return <div key={lineIdx} className="h-1.5" />;
    }

    return (
      <p key={lineIdx} className="leading-relaxed my-0.5">
        {renderInlineText(line, isMe)}
      </p>
    );
  });
}

export default function DashboardSuportePage() {
  // Estado de identificação obrigatória
  const [isIdentified, setIsIdentified] = useState(false);
  const [isSwitchingAttendant, setIsSwitchingAttendant] = useState(false);
  const [attendantName, setAttendantName] = useState('');
  const [attendantRole, setAttendantRole] = useState(ATTENDANT_ROLES[0]);
  const [attendantPhone, setAttendantPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('SUPORTE');
  const [tenantName, setTenantName] = useState('Estabelecimento');
  const [protocolNumber, setProtocolNumber] = useState(
    () => `#TK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Mensagens do chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Estado de IA e Escalação de Erros
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [escalatedTicket, setEscalatedTicket] = useState<{ protocol: string; slaHours: number } | null>(null);

  // Gravação de Áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Toast Notifier
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Modal de Confirmação Seguro
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Auto-scroll ao receber ou enviar mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

  // Carrega preferências do tenant e histórico da sessão
  useEffect(() => {
    let loadedTenantName = 'Estabelecimento';

    // 1. Carrega dados do estabelecimento para pré-preenchimento
    api
      .get('/tenants/me')
      .then((res) => {
        if (res.data?.name) {
          loadedTenantName = res.data.name;
          setTenantName(res.data.name);
        }
      })
      .catch(() => {});

    // 2. Verifica se já se identificou nesta sessão
    try {
      const savedIdentified = sessionStorage.getItem('msh_support_identified');
      const savedName = sessionStorage.getItem('msh_support_attendant_name');
      const savedRole = sessionStorage.getItem('msh_support_attendant_role');
      const savedPhone = sessionStorage.getItem('msh_support_attendant_phone');
      const savedCategory = sessionStorage.getItem('msh_support_category') as TicketCategory | null;
      const savedMessagesStr = localStorage.getItem('marquesuahora_support_messages');

      if (savedName) setAttendantName(savedName);
      if (savedRole) setAttendantRole(savedRole);
      if (savedPhone) setAttendantPhone(savedPhone);
      if (savedCategory) setSelectedCategory(savedCategory);

      let hasLocalMessages = false;
      if (savedMessagesStr) {
        try {
          const parsed = JSON.parse(savedMessagesStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            hasLocalMessages = true;
          }
        } catch {
          // ignore
        }
      }

      if (savedIdentified === 'true' && savedName && savedName.trim().length >= 2) {
        setIsIdentified(true);
        if (!hasLocalMessages) {
          const greeting = buildInitialGreeting(savedCategory || 'SUPORTE', savedName, savedRole || ATTENDANT_ROLES[0], loadedTenantName);
          setMessages([greeting]);
        }
      } else {
        setIsIdentified(false);
      }
    } catch {
      setIsIdentified(false);
    }

    // 3. Carrega ticket ativo do PostgreSQL no backend
    async function loadActiveBackendTicket() {
      try {
        const res = await api.get('/support/active-ticket', { timeout: 4500 });
        if (res.data) {
          const t = res.data;
          setProtocolNumber(t.protocol);
          if (t.category === 'TECHNICAL_ISSUE' && t.status === 'OPEN') {
            setEscalatedTicket({ protocol: t.protocol, slaHours: 24 });
          }
          if (Array.isArray(t.messages) && t.messages.length > 0) {
            const mapped: ChatMessage[] = t.messages.map((m: any) => ({
              id: m.id,
              sender: m.senderType === 'TENANT' ? 'TENANT' : 'SUPPORT',
              content: m.content || undefined,
              attachmentUrl: m.attachmentUrl || undefined,
              audioDurationSeconds: m.audioDurationSeconds || undefined,
              timestamp: new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              isAi: m.senderType !== 'TENANT',
              isTechnicalError: t.category === 'TECHNICAL_ISSUE'
            }));
            setMessages(mapped);
          }
        }
      } catch {
        // Fallback silencioso
      }
    }

    loadActiveBackendTicket();
  }, []);

  // Gera mensagem contextual inicial com dados da pessoa e estabelecimento
  const buildInitialGreeting = (cat: TicketCategory, name: string, role: string, establishment: string): ChatMessage => {
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const trimmedName = name.trim();
    const roleText = role ? ` (${role})` : '';
    const establishmentText = establishment && establishment !== 'Estabelecimento' ? ` do **${establishment}**` : '';

    let greetingText = '';

    if (cat === 'ERRO_TECNICO') {
      greetingText =
        `Olá, ${trimmedName}${roleText}!\n\n` +
        `Sou a inteligência artificial de suporte do **MarqueSuaHora**.\n\n` +
        `Estou pronta para registrar qualquer erro técnico ou instabilidade no seu estabelecimento${establishmentText}.\n\n` +
        `Descreva o que ocorreu, a tela em que estava ou o que tentou fazer. Se for um erro do sistema, abriremos um chamado prioritário com protocolo para o Administrador da plataforma analisar em **até 24 horas**.`;
    } else if (cat === 'MELHORIA') {
      greetingText =
        `Olá, ${trimmedName}${roleText}!\n\n` +
        `Como podemos evoluir a plataforma para o seu estabelecimento${establishmentText}?\n\n` +
        `Descreva a sugestão de melhoria ou novo recurso que você gostaria de ver no sistema. Suas sugestões são analisadas diretamente pela nossa equipe de produto.`;
    } else if (cat === 'FINANCEIRO') {
      greetingText =
        `Olá, ${trimmedName}${roleText}!\n\n` +
        `Bem-vindo(a) ao canal financeiro do **MarqueSuaHora**.\n\n` +
        `Tenho acesso em tempo real ao status do seu plano, valores de mensalidade e faturas do estabelecimento${establishmentText}.\n\n` +
        `Qual é a sua dúvida ou solicitação financeira?`;
    } else {
      greetingText =
        `Olá, ${trimmedName}${roleText}!\n\n` +
        `Sou a inteligência artificial especialista em suporte do **MarqueSuaHora**.\n\n` +
        `Estou conectada ao sistema do seu estabelecimento${establishmentText} com acesso em tempo real aos dados operacionais do PostgreSQL (serviços cadastrados, agendamentos de hoje, configurações do sinal PIX, equipe e regras da plataforma).\n\n` +
        `Você pode me perguntar sobre seus **agendamentos de hoje**, tirar dúvidas de configuração ou relatar qualquer necessidade. Como posso te ajudar agora?`;
    }

    return {
      id: `msg-welcome-${Date.now()}`,
      sender: 'SUPPORT',
      content: greetingText,
      timestamp: `Hoje às ${timeNow}`,
      isAi: true
    };
  };

  // Submissão do formulário obrigatório de identificação
  const handleConfirmIdentification = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = attendantName.trim();
    if (!cleanName || cleanName.length < 2) {
      showToast('Por favor, informe seu nome completo para se identificar.');
      return;
    }

    const protocolPrefix =
      selectedCategory === 'ERRO_TECNICO'
        ? '#ERR'
        : selectedCategory === 'MELHORIA'
        ? '#MEL'
        : selectedCategory === 'FINANCEIRO'
        ? '#FIN'
        : '#SUP';
    const proto = `${protocolPrefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setProtocolNumber(proto);

    try {
      sessionStorage.setItem('msh_support_identified', 'true');
      sessionStorage.setItem('msh_support_attendant_name', cleanName);
      sessionStorage.setItem('msh_support_attendant_role', attendantRole);
      if (attendantPhone.trim()) {
        sessionStorage.setItem('msh_support_attendant_phone', attendantPhone.trim());
      }
      sessionStorage.setItem('msh_support_category', selectedCategory);
    } catch {
      // ignore
    }

    setIsIdentified(true);
    setIsSwitchingAttendant(false);

    // Se ainda não houver mensagens no chat, gera a saudação personalizada
    if (messages.length === 0) {
      const greeting = buildInitialGreeting(selectedCategory, cleanName, attendantRole, tenantName);
      setMessages([greeting]);
      try {
        localStorage.setItem('marquesuahora_support_messages', JSON.stringify([greeting]));
      } catch {
        // ignore
      }
    }

    showToast(`Atendimento iniciado como ${cleanName}.`);
  };

  // Reiniciar sessão de atendimento
  const handleResetSession = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reiniciar Atendimento',
      description: 'Deseja realmente reiniciar o atendimento e limpar o histórico de mensagens atual?',
      confirmLabel: 'Sim, Reiniciar',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        setIsIdentified(false);
        setIsSwitchingAttendant(false);
        setMessages([]);
        setEscalatedTicket(null);
        try {
          sessionStorage.removeItem('msh_support_identified');
          localStorage.removeItem('marquesuahora_support_messages');
        } catch {
          // ignore
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('Atendimento reiniciado com sucesso.');
      }
    });
  };

  // Trocar de atendente mantendo ou renovando o chat
  const handleOpenSwitchAttendant = () => {
    setIsSwitchingAttendant(true);
  };

  // Gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      showToast('Não foi possível acessar o microfone para gravação de voz.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Envio de mensagem (texto ou áudio)
  const submitMessage = async (rawText?: string, rawAudio?: string | null) => {
    const textToSend = (rawText !== undefined ? rawText : inputMessage).trim();
    const currentAudio = rawAudio !== undefined ? rawAudio : audioUrl;
    if (!textToSend && !currentAudio) return;

    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'TENANT',
      content: textToSend || undefined,
      attachmentUrl: currentAudio || undefined,
      audioDurationSeconds: currentAudio ? recordingSeconds : undefined,
      timestamp: `Hoje às ${timeNow}`
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    try {
      localStorage.setItem('marquesuahora_support_messages', JSON.stringify(updated));
    } catch {
      // ignore
    }

    setInputMessage('');
    setAudioUrl(null);
    setRecordingSeconds(0);

    // Consulta à Inteligência Artificial do MarqueSuaHora conectada ao banco
    if (textToSend) {
      setIsAiThinking(true);
      try {
        const res = await api.post(
          '/support/ai-chat',
          {
            message: textToSend,
            category: selectedCategory,
            protocol: protocolNumber,
            attendantName: attendantName.trim() || 'Assinante',
            attendantRole: attendantRole
          },
          { timeout: 8500 }
        );

        const replyData = res.data;
        const aiMsg: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'SUPPORT',
          content: replyData.replyText,
          timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          isAi: true,
          isTechnicalError: replyData.isTechnicalError,
          slaHours: replyData.slaHours
        };

        const withAi = [...updated, aiMsg];
        setMessages(withAi);
        try {
          localStorage.setItem('marquesuahora_support_messages', JSON.stringify(withAi));
        } catch {
          // ignore
        }

        if (replyData.isTechnicalError) {
          setEscalatedTicket({
            protocol: replyData.protocol,
            slaHours: replyData.slaHours || 24
          });
          setProtocolNumber(replyData.protocol);
        }
      } catch (err) {
        console.warn('[Suporte Frontend] API externa demorou ou falhou, ativando motor local integrado:', err);

        // MOTOR DE CONTINGÊNCIA INTELIGENTE: A IA NUNCA FICA EM SILÊNCIO
        const isError = detectIsTechnicalError(textToSend);
        const localReply = generateFrontendSmartReply({
          messageText: textToSend,
          isErrorDetected: isError,
          protocol: protocolNumber,
          userName: attendantName,
          tenantName
        });

        const aiMsg: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'SUPPORT',
          content: localReply,
          timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          isAi: true,
          isTechnicalError: isError,
          slaHours: isError ? 24 : undefined
        };

        const withAi = [...updated, aiMsg];
        setMessages(withAi);
        try {
          localStorage.setItem('marquesuahora_support_messages', JSON.stringify(withAi));
        } catch {
          // ignore
        }

        if (isError) {
          setEscalatedTicket({
            protocol: protocolNumber,
            slaHours: 24
          });
        }
      } finally {
        setIsAiThinking(false);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleSendDirectText = (text: string) => {
    submitMessage(text, null);
  };

  const currentCategoryMeta =
    TICKET_CATEGORIES.find((c) => c.id === selectedCategory) || TICKET_CATEGORIES[0];

  // =========================================================================
  // PASSO 1: IDENTIFICAÇÃO OBRIGATÓRIA ANTES DE FALAR COM O SUPORTE
  // =========================================================================
  if (!isIdentified || isSwitchingAttendant) {
    return (
      <div className="w-full max-w-2xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 text-left space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Identificação Obrigatória
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2.5">
                Identifique-se para Iniciar o Suporte
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Antes de iniciar o chat inteligente, confirme quem está solicitando o atendimento no estabelecimento{' '}
                <strong>{tenantName}</strong>.
              </p>
            </div>
            {isSwitchingAttendant && (
              <button
                type="button"
                onClick={() => setIsSwitchingAttendant(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Voltar ao Chat
              </button>
            )}
          </div>

          <form onSubmit={handleConfirmIdentification} className="space-y-5">
            {/* 1. Nome do Atendente */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Quem está falando? (Seu Nome) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Ex: Emanuelle Telles"
                  value={attendantName}
                  onChange={(e) => setAttendantName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all font-medium text-slate-900"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Nome de quem está operando o sistema ou solicitando auxílio.
              </span>
            </div>

            {/* 2. Função / Cargo */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Sua Função no Estabelecimento *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ATTENDANT_ROLES.map((role) => {
                  const isSelected = attendantRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setAttendantRole(role)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. WhatsApp para Contato */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                WhatsApp de Retorno <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="(DDD) 99999-9999"
                value={attendantPhone}
                onChange={(e) => setAttendantPhone(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all font-medium text-slate-900"
              />
            </div>

            {/* 4. Categoria do Atendimento */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Assunto Principal do Atendimento *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TICKET_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block mb-1">
                        {cat.title}
                      </span>
                      <span
                        className={`text-[11px] leading-tight block ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {cat.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botão de Confirmação */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                A IA carregará os dados operacionais do seu salão em tempo real.
              </span>
              <button
                type="submit"
                disabled={!attendantName.trim() || attendantName.trim().length < 2}
                className="px-6 py-3 bg-slate-900 hover:bg-black disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Confirmar e Iniciar Atendimento
              </button>
            </div>
          </form>
        </div>

        {/* Toast Notifier */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // PASSO 2: CHAT DE SUPORTE INTERATIVO COM ACESSO AO BANCO DE DADOS
  // =========================================================================
  return (
    <div className="w-full h-[calc(100dvh-120px)] sm:h-[calc(100vh-130px)] max-h-[860px] min-h-[520px] flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden relative">
      {/* 1. CABEÇALHO COM IDENTIFICAÇÃO E PROTOCOLO */}
      <header className="px-3.5 sm:px-7 py-2.5 sm:py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Central de Suporte Oficial
              </h2>
              <span className="inline-flex items-center text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {protocolNumber}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${currentCategoryMeta.badgeColor}`}
              >
                {currentCategoryMeta.title}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 mt-0.5">
              <span className="truncate">
                Atendente: <strong>{attendantName}</strong> ({attendantRole}) • <strong>{tenantName}</strong>
              </span>
              <button
                type="button"
                onClick={handleOpenSwitchAttendant}
                className="text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer transition-colors"
                title="Trocar atendente ou atualizar dados de contato"
              >
                Trocar Atendente
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito do Cabeçalho */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[11px] font-bold text-emerald-600">
              IA com Acesso ao Banco
            </span>
            <span className="text-[10px] text-slate-400">PostgreSQL Ativo</span>
          </div>

          <button
            type="button"
            onClick={handleResetSession}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Reiniciar conversa e limpar mensagens"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Novo Atendimento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </header>

      {/* Sugestões Rápidas de 1 Toque */}
      <div className="px-3 sm:px-6 py-2 bg-slate-50/90 border-b border-slate-200/60 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
          Sugestões:
        </span>
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={isAiThinking}
            onClick={() => handleSendDirectText(q)}
            className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs transition-all shrink-0 cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Banner de Erro Técnico Escalado com SLA de 24h */}
      {escalatedTicket && (
        <div className="mx-3 sm:mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900 uppercase">
                SLA: até {escalatedTicket.slaHours}h
              </span>
              <strong className="text-xs font-bold">
                Chamado Prioritário Aberto ({escalatedTicket.protocol})
              </strong>
            </div>
            <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
              O erro técnico foi registrado e encaminhado diretamente para o Administrador da plataforma. Você receberá o retorno técnico em até 24 horas.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 text-[11px] font-bold rounded-lg shrink-0">
            Pendente Admin
          </span>
        </div>
      )}

      {/* 2. ÁREA DE MENSAGENS */}
      <div className="flex-1 bg-slate-50/70 p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
        {/* Banner Informativo Discreto e Tipográfico */}
        <div className="max-w-md mx-auto text-center py-1">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            Canal oficial com IA — Respostas operacionais com acesso ao banco e regras do sistema.
          </span>
        </div>

        {/* Lista de Mensagens */}
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
            <p className="text-sm font-bold text-slate-800">
              Canal de Atendimento Aberto
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Digite abaixo sua dúvida sobre a agenda, vitrine, sinal PIX ou configurações. Se tiver encontrado algum erro, descreva para o suporte analisar.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === 'TENANT';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-lg p-3 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {msg.content && <div className="space-y-1">{renderFormattedMessage(msg.content, isMe)}</div>}

                  {msg.attachmentUrl && (
                    <div className="mt-2.5 p-2 bg-slate-100 rounded-xl flex items-center gap-3">
                      <audio src={msg.attachmentUrl} controls className="h-8 max-w-full" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 px-1">
                  <span>
                    {isMe
                      ? `${attendantName || 'Você'} • ${msg.timestamp}`
                      : msg.isAi
                      ? `IA MarqueSuaHora • ${msg.timestamp}`
                      : `Administrador Oficial • ${msg.timestamp}`}
                  </span>
                  {msg.isTechnicalError && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                      Chamado Aberto (24h)
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Indicador de Processamento da IA */}
        {isAiThinking && (
          <div className="flex flex-col items-start space-y-1">
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-bl-xs text-xs text-slate-600 shadow-xs">
              IA consultando dados e analisando sua solicitação...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. BARRA DE DIGITAÇÃO E GRAVAÇÃO DE VOZ */}
      <footer className="p-2 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-1.5 sm:gap-2 relative bg-slate-50 border border-slate-200 rounded-2xl p-1 sm:p-2 focus-within:bg-white focus-within:border-slate-400 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isRecording || isAiThinking}
            placeholder={isRecording ? 'Gravando áudio...' : 'Digite sua dúvida, pergunta sobre agendamentos ou relato de erro...'}
            className="flex-1 min-w-0 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-transparent border-0 outline-none font-medium text-slate-800 placeholder-slate-400"
          />

          {/* Gravação de Áudio */}
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold animate-pulse transition-all cursor-pointer shrink-0 shadow-xs"
              title="Parar Gravação"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Parar ({recordingSeconds}s)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Gravar mensagem de voz"
            >
              <Mic className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Gravar Áudio</span>
            </button>
          )}

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={(!inputMessage.trim() && !audioUrl) || isAiThinking}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 hover:bg-black active:scale-95 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
            title="Enviar Mensagem"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </footer>

      {/* Modal de Confirmação Seguro */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        isDestructive={confirmModal.isDestructive}
        isLoading={confirmModal.isLoading}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
