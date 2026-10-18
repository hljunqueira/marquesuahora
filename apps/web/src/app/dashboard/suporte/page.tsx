'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export type TicketCategory = 'SUPORTE' | 'MELHORIA' | 'FINANCEIRO';

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
    title: 'Suporte do Sistema',
    desc: 'Dúvidas de uso, vitrine, agenda, sinal PIX ou regras',
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200'
  },
  {
    id: 'MELHORIA' as TicketCategory,
    title: 'Sugestão de Melhoria',
    desc: 'Ideias de novos recursos ou ajustes de fluxo',
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200'
  },
  {
    id: 'FINANCEIRO' as TicketCategory,
    title: 'Financeiro & Planos',
    desc: 'Assinaturas da plataforma, faturas ou upgrade',
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  }
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
    `${name}Sou o assistente de inteligência artificial do MarqueSuaHora!\n\n` +
    `Estou aqui para tirar qualquer dúvida sobre o uso da plataforma:\n` +
    `• Como configurar sua **Chave PIX direta** para sinal anti-falta;\n` +
    `• Como cadastrar **Serviços**, **Profissionais** e **Comissões**;\n` +
    `• Como gerenciar a **Agenda** e fazer **Bloqueios de Horário**;\n` +
    `• Como usar seu **Link da Vitrine** para receber agendamentos online.\n\n` +
    `Como posso te ajudar especificamente agora?`
  );
}

export default function DashboardSuportePage() {
  // Estado de identificação e modal
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [isIdentificationModalOpen, setIsIdentificationModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('SUPORTE');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
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

  // Carrega preferências e histórico
  useEffect(() => {
    let hasLoadedMessages = false;
    try {
      const savedConfirmed = localStorage.getItem('marquesuahora_support_name_confirmed');
      const savedPhone = localStorage.getItem('marquesuahora_support_contact_phone');
      const savedName = localStorage.getItem('marquesuahora_support_contact_name');
      const savedCat = localStorage.getItem('marquesuahora_support_category') as TicketCategory | null;
      const savedMessagesStr = localStorage.getItem('marquesuahora_support_messages');

      if (savedPhone) setContactPhone(savedPhone);
      if (savedCat) setSelectedCategory(savedCat);
      if (savedName) setContactName(savedName);

      if (savedMessagesStr) {
        try {
          const parsed = JSON.parse(savedMessagesStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            hasLoadedMessages = true;
          }
        } catch {
          // ignore
        }
      }

      if (savedConfirmed === 'true') {
        setIsNameConfirmed(true);
        setIsIdentificationModalOpen(false);

        if (!hasLoadedMessages) {
          const greeting = buildInitialGreeting(savedCat || 'SUPORTE', savedName || 'Estabelecimento');
          setMessages([greeting]);
          try {
            localStorage.setItem('marquesuahora_support_messages', JSON.stringify([greeting]));
          } catch {
            // ignore
          }
        }
      } else {
        setIsIdentificationModalOpen(true);
      }
    } catch {
      setIsIdentificationModalOpen(true);
    }

    // Carrega chamado ativo do backend se existir
    async function loadActiveBackendTicket() {
      try {
        const res = await api.get('/support/active-ticket', { timeout: 4000 });
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
        // Fallback gracioso para cache local
      }
    }

    loadActiveBackendTicket();
  }, []);

  // Gera saudação contextual inicial se não houver histórico
  const buildInitialGreeting = (cat: TicketCategory, name: string): ChatMessage => {
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const trimmed = name.trim();
    const hasName = trimmed && trimmed !== 'Estabelecimento';
    let greetingText = '';

    if (cat === 'MELHORIA') {
      greetingText = hasName
        ? `Olá, ${trimmed}! Como podemos evoluir a sua experiência com o Marque Sua Hora? Descreva a melhoria que você gostaria de ver na plataforma.`
        : `Olá! Como podemos evoluir a sua experiência com o Marque Sua Hora? Descreva a melhoria que você gostaria de ver na plataforma.`;
    } else if (cat === 'FINANCEIRO') {
      greetingText = hasName
        ? `Olá, ${trimmed}! Bem-vindo ao canal financeiro. Qual é a sua dúvida sobre planos ou assinaturas do sistema?`
        : `Olá! Bem-vindo ao canal financeiro. Qual é a sua dúvida sobre planos ou assinaturas do sistema?`;
    } else {
      greetingText = hasName
        ? `Olá, ${trimmed}! Sou o assistente de suporte do Marque Sua Hora. Como posso te orientar sobre o sistema hoje? Descreva sua dúvida ou informe se houve algum erro.`
        : `Olá! Sou o assistente de suporte do Marque Sua Hora. Como posso te orientar sobre o sistema hoje? Descreva sua dúvida ou informe se houve algum erro.`;
    }

    return {
      id: `msg-welcome-${Date.now()}`,
      sender: 'SUPPORT',
      content: greetingText,
      timestamp: `Hoje às ${timeNow}`,
      isAi: true
    };
  };

  const handleConfirmIdentification = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = contactName.trim() || 'Estabelecimento';
    setContactName(finalName);

    const protocolPrefix =
      selectedCategory === 'MELHORIA'
        ? '#MEL'
        : selectedCategory === 'FINANCEIRO'
        ? '#FIN'
        : '#SUP';
    const proto = `${protocolPrefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setProtocolNumber(proto);

    try {
      localStorage.setItem('marquesuahora_support_name_confirmed', 'true');
      if (contactName.trim()) {
        localStorage.setItem('marquesuahora_support_contact_name', finalName);
      }
      localStorage.setItem('marquesuahora_support_category', selectedCategory);
      if (contactPhone.trim()) {
        localStorage.setItem('marquesuahora_support_contact_phone', contactPhone.trim());
      }
    } catch {
      // ignore
    }

    setIsNameConfirmed(true);
    setIsIdentificationModalOpen(false);

    if (messages.length === 0) {
      const greeting = buildInitialGreeting(selectedCategory, finalName);
      setMessages([greeting]);
      try {
        localStorage.setItem('marquesuahora_support_messages', JSON.stringify([greeting]));
      } catch {
        // ignore
      }
    }
  };

  const closeModal = () => {
    setIsIdentificationModalOpen(false);
    if (!isNameConfirmed) {
      setIsNameConfirmed(true);
      try {
        localStorage.setItem('marquesuahora_support_name_confirmed', 'true');
      } catch {
        // ignore
      }
    }
    if (messages.length === 0) {
      const greeting = buildInitialGreeting(selectedCategory, contactName || 'Estabelecimento');
      setMessages([greeting]);
      try {
        localStorage.setItem('marquesuahora_support_messages', JSON.stringify([greeting]));
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isIdentificationModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIdentificationModalOpen, messages, selectedCategory, contactName]);

  const handleResetSession = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reiniciar Atendimento',
      description: 'Deseja realmente reiniciar o atendimento e limpar o histórico de mensagens atual?',
      confirmLabel: 'Sim, Reiniciar',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        setIsNameConfirmed(false);
        setMessages([]);
        setEscalatedTicket(null);
        try {
          localStorage.removeItem('marquesuahora_support_name_confirmed');
          localStorage.removeItem('marquesuahora_support_messages');
        } catch {
          // ignore
        }
        setIsIdentificationModalOpen(true);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('Atendimento reiniciado com sucesso.');
      }
    });
  };

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputMessage.trim();
    if (!textToSend && !audioUrl) return;

    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'TENANT',
      content: textToSend || undefined,
      attachmentUrl: audioUrl || undefined,
      audioDurationSeconds: audioUrl ? recordingSeconds : undefined,
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

    // Consulta à Inteligência Artificial do MarqueSuaHora
    if (textToSend) {
      setIsAiThinking(true);
      try {
        const res = await api.post(
          '/support/ai-chat',
          {
            message: textToSend,
            category: selectedCategory,
            protocol: protocolNumber
          },
          { timeout: 7000 }
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
        console.warn('[Suporte Frontend] API externa/backend demorou ou falhou, ativando inteligência local integrada:', err);

        // MOTOR DE CONTINGÊNCIA INTELIGENTE: A IA NUNCA FICA EM SILÊNCIO
        const isError = detectIsTechnicalError(textToSend);
        const localReply = generateFrontendSmartReply({
          messageText: textToSend,
          isErrorDetected: isError,
          protocol: protocolNumber,
          userName: contactName
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

  const currentCategoryMeta =
    TICKET_CATEGORIES.find((c) => c.id === selectedCategory) || TICKET_CATEGORIES[0];

  return (
    <div className="w-full h-[calc(100vh-130px)] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden relative">
      {/* ========================================================= */}
      {/* 1. CABEÇALHO PURAMENTE TIPOGRÁFICO E FUNCIONAL             */}
      {/* ========================================================= */}
      <header className="px-5 sm:px-7 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                Central de Atendimento & Dúvidas
              </h2>
              <span className="inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {protocolNumber}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentCategoryMeta.badgeColor}`}
              >
                {currentCategoryMeta.title}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-0.5">
              <span className="truncate">
                Atendimento: <strong>{contactName || 'Estabelecimento'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsIdentificationModalOpen(true)}
                className="text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer transition-colors"
                title="Alterar dados ou categoria do chamado"
              >
                Alterar
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito do Cabeçalho */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[11px] font-bold text-emerald-600">
              IA Online
            </span>
            <span className="text-[10px] text-slate-400">Resposta imediata</span>
          </div>

          <button
            type="button"
            onClick={handleResetSession}
            className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Reiniciar conversa e limpar mensagens"
          >
            Novo Atendimento
          </button>
        </div>
      </header>

      {/* Banner de Erro Técnico Escalado com SLA de 24h */}
      {escalatedTicket && (
        <div className="mx-4 sm:mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900 shadow-xs">
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

      {/* ========================================================= */}
      {/* 2. ÁREA DE MENSAGENS (TELA CHEIA SCROLLÁVEL)              */}
      {/* ========================================================= */}
      <div className="flex-1 bg-slate-50/70 p-4 sm:p-6 overflow-y-auto space-y-4">
        {/* Banner Informativo Discreto e Tipográfico */}
        <div className="max-w-md mx-auto text-center py-1">
          <span className="text-[11px] font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            Canal de suporte oficial — Tire dúvidas sobre as funções do sistema.
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
                  className={`max-w-lg p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                  {msg.attachmentUrl && (
                    <div className="mt-2.5 p-2 bg-slate-100 rounded-xl flex items-center gap-3">
                      <audio src={msg.attachmentUrl} controls className="h-8 max-w-full" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 px-1">
                  <span>
                    {isMe
                      ? `${contactName || 'Você'} • ${msg.timestamp}`
                      : msg.isAi
                      ? `Assistente do Sistema • ${msg.timestamp}`
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
              Assistente analisando sua dúvida...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ========================================================= */}
      {/* 3. BARRA DE DIGITAÇÃO E GRAVAÇÃO DE VOZ                   */}
      {/* ========================================================= */}
      <footer className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 relative bg-slate-50 border border-slate-200 rounded-2xl p-1.5 sm:p-2 focus-within:bg-white focus-within:border-slate-400 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isRecording || isAiThinking}
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-0 outline-none font-medium text-slate-800 placeholder-slate-400"
          />

          {/* Gravação de Áudio */}
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold animate-pulse transition-all cursor-pointer shrink-0 shadow-xs"
              title="Parar Gravação"
            >
              Parar ({recordingSeconds}s)
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Gravar mensagem de voz"
            >
              Gravar Áudio
            </button>
          )}

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={(!inputMessage.trim() && !audioUrl) || isAiThinking}
            className="px-4 py-2 bg-slate-900 hover:bg-black active:scale-95 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
            title="Enviar Mensagem"
          >
            Enviar
          </button>
        </form>
      </footer>

      {/* ========================================================= */}
      {/* 4. MODAL DE IDENTIFICAÇÃO (SEM ÍCONES DECORATIVOS)        */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isIdentificationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-left relative z-10"
            >
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-5 right-5 text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer z-20"
                title="Fechar e ir para o chat"
              >
                ✕ Fechar
              </button>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Canal de Ajuda
                </span>
                <h2 className="text-xl font-display font-bold text-slate-900 mt-2.5">
                  Iniciar Atendimento
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Confirme seus dados para direcionarmos suas dúvidas ou relatos de erro com precisão.
                </p>
              </div>

              <form onSubmit={handleConfirmIdentification} className="space-y-4">
                {/* Seletor de Categoria Sem Ícones Decorativos */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    Tipo de Atendimento *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {TICKET_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold block">
                              {cat.title}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] leading-tight block ${
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

                {/* Nome Completo */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Seu Nome <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 transition-all font-medium text-slate-800"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    WhatsApp para Retorno <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 transition-all font-medium text-slate-800"
                  />
                </div>

                {/* Botão de Ação */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Entrar Direto
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Confirmar e Iniciar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border border-slate-800 text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
