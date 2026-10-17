'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Send,
  Mic,
  Square,
  Smile,
  CheckCircle2,
  Clock,
  User,
  Headphones,
  Edit2,
  X,
  MessageSquare,
  Wrench,
  Lightbulb,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  CheckCheck,
  Sparkles
} from 'lucide-react';

export type TicketCategory = 'SUPORTE' | 'MELHORIA' | 'FINANCEIRO';

interface ChatMessage {
  id: string;
  sender: 'TENANT' | 'SUPPORT';
  content?: string;
  attachmentUrl?: string;
  audioDurationSeconds?: number;
  timestamp: string;
}

const TICKET_CATEGORIES = [
  {
    id: 'SUPORTE' as TicketCategory,
    title: 'Suporte Técnico',
    desc: 'Dúvidas de uso, configurações, agenda ou vitrine',
    icon: Wrench,
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200'
  },
  {
    id: 'MELHORIA' as TicketCategory,
    title: 'Sugestão de Melhoria',
    desc: 'Ideias de novos recursos, ajustes ou feedbacks',
    icon: Lightbulb,
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200'
  },
  {
    id: 'FINANCEIRO' as TicketCategory,
    title: 'Financeiro & Planos',
    desc: 'Dúvidas sobre assinaturas, Asaas, taxas ou upgrade',
    icon: CreditCard,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  }
];

const EMOJI_CATEGORIES = [
  {
    label: 'Populares',
    emojis: ['😀', '😁', '😂', '🥹', '😊', '😍', '🤔', '😅', '🥳', '😎', '👍', '👏', '🙏', '🤝', '❤️', '🔥', '⚡', '⭐', '💡', '🚀']
  },
  {
    label: 'Salão & Beleza',
    emojis: ['✂️', '💈', '💇‍♀️', '💇‍♂️', '💅', '💄', '🧴', '💆‍♀️', '🪮', '🧖‍♀️', '🪞', '🧼', '🌸', '💖', '👑', '🪄', '💎', '🌿', '🤍', '🎀']
  },
  {
    label: 'Agenda & Negócios',
    emojis: ['📅', '⏰', '💬', '📱', '💳', '📍', '📝', '❓', '📞', '🛠️', '📊', '💰', '🏷️', '🏢', '🔒', '🛎️', '🎯', '⏳', '📬', '✅']
  }
];

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
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);

  // Gravação de Áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
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
  }, [messages]);

  // Carrega preferências e histórico
  useEffect(() => {
    try {
      const savedConfirmed = localStorage.getItem('marquesuahora_support_name_confirmed');
      const savedPhone = localStorage.getItem('marquesuahora_support_contact_phone');
      const savedCat = localStorage.getItem('marquesuahora_support_category') as TicketCategory | null;
      const savedMessagesStr = localStorage.getItem('marquesuahora_support_messages');

      // Não preenche automaticamente o nome (inicia limpo conforme solicitado pelo usuário)
      if (savedPhone) setContactPhone(savedPhone);
      if (savedCat) setSelectedCategory(savedCat);

      if (savedMessagesStr) {
        try {
          const parsed = JSON.parse(savedMessagesStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch {
          // ignore
        }
      }

      if (savedConfirmed === 'true') {
        setIsNameConfirmed(true);
        setIsIdentificationModalOpen(false);
      } else {
        // Se ainda não se identificou, abre o modal sobre o chat
        setIsIdentificationModalOpen(true);
      }
    } catch {
      setIsIdentificationModalOpen(true);
    }
  }, []);

  // Fechar emoji picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  // Gera saudação contextual inicial se não houver histórico
  const buildInitialGreeting = (cat: TicketCategory, name: string): ChatMessage => {
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const trimmed = name.trim();
    const hasName = trimmed && trimmed !== 'Estabelecimento';
    let greetingText = '';

    if (cat === 'MELHORIA') {
      greetingText = hasName
        ? `Olá, ${trimmed}! Agradecemos por querer nos ajudar a evoluir o Marque Sua Hora. Qual melhoria ou nova funcionalidade você gostaria de sugerir para nossa equipe de produto?`
        : `Olá! Agradecemos por querer nos ajudar a evoluir o Marque Sua Hora. Qual melhoria ou nova funcionalidade você gostaria de sugerir para nossa equipe de produto?`;
    } else if (cat === 'FINANCEIRO') {
      greetingText = hasName
        ? `Olá, ${trimmed}! Bem-vindo ao canal de suporte financeiro e planos. Você tem alguma dúvida sobre assinaturas, cobranças ou faturamento via Asaas?`
        : `Olá! Bem-vindo ao canal de suporte financeiro e planos. Você tem alguma dúvida sobre assinaturas, cobranças ou faturamento via Asaas?`;
    } else {
      greetingText = hasName
        ? `Olá, ${trimmed}! Bem-vindo ao Suporte Técnico do Marque Sua Hora. Como podemos ajudar seu espaço hoje? Descreva sua dúvida ou envie um áudio.`
        : `Olá! Bem-vindo ao Suporte Técnico do Marque Sua Hora. Como podemos ajudar seu espaço hoje? Descreva sua dúvida ou envie um áudio.`;
    }

    return {
      id: `msg-welcome-${Date.now()}`,
      sender: 'SUPPORT',
      content: greetingText,
      timestamp: `Hoje às ${timeNow}`
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

    // Se ainda não existiam mensagens reais, inicia com a saudação limpa da categoria
    if (messages.length === 0) {
      const initialMsg = buildInitialGreeting(selectedCategory, finalName);
      setMessages([initialMsg]);
      try {
        localStorage.setItem('marquesuahora_support_messages', JSON.stringify([initialMsg]));
      } catch {
        // ignore
      }
    }

    setIsNameConfirmed(true);
    setIsIdentificationModalOpen(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const closeModal = () => {
    setIsNameConfirmed(true);
    setIsIdentificationModalOpen(false);
    try {
      localStorage.setItem('marquesuahora_support_name_confirmed', 'true');
    } catch {
      // ignore
    }

    if (messages.length === 0) {
      const finalName = contactName.trim();
      const initialMsg = buildInitialGreeting(selectedCategory, finalName);
      setMessages([initialMsg]);
      try {
        localStorage.setItem('marquesuahora_support_messages', JSON.stringify([initialMsg]));
      } catch {
        // ignore
      }
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  // Fecha modal ao pressionar ESC
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
    if (confirm('Deseja realmente reiniciar o atendimento e limpar o histórico atual?')) {
      setIsNameConfirmed(false);
      setMessages([]);
      try {
        localStorage.removeItem('marquesuahora_support_name_confirmed');
        localStorage.removeItem('marquesuahora_support_messages');
      } catch {
        // ignore
      }
      setIsIdentificationModalOpen(true);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
      alert('Não foi possível acessar o microfone para gravação de voz.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !audioUrl) return;

    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'TENANT',
      content: inputMessage.trim() || undefined,
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
    setIsEmojiPickerOpen(false);
  };

  const currentCategoryMeta =
    TICKET_CATEGORIES.find((c) => c.id === selectedCategory) || TICKET_CATEGORIES[0];
  const CategoryIcon = currentCategoryMeta.icon;

  return (
    <div className="w-full h-[calc(100vh-130px)] flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden relative">
      {/* ========================================================= */}
      {/* 1. CABEÇALHO DO CHAT (PREENCHIMENTO COMPLETO)             */}
      {/* ========================================================= */}
      <header className="px-5 sm:px-7 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-tenant-light text-tenant-primary flex items-center justify-center font-bold shadow-2xs border border-tenant-primary/20">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                Central de Suporte Marque Sua Hora
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                {protocolNumber}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${currentCategoryMeta.badgeColor}`}
              >
                {currentCategoryMeta.title}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span className="truncate">
                Falando com: <strong>{contactName || 'Estabelecimento'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsIdentificationModalOpen(true)}
                className="text-tenant-primary hover:opacity-80 underline font-semibold flex items-center gap-1 cursor-pointer transition-opacity"
                title="Alterar dados ou categoria do chamado"
              >
                <Edit2 className="w-3 h-3" />
                <span>Alterar Chamado</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito do Cabeçalho */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Equipe Online
            </span>
            <span className="text-[10px] text-slate-400">Tempo de resposta: ~10 min</span>
          </div>

          <button
            type="button"
            onClick={handleResetSession}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reiniciar conversa e limpar mensagens"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Atendimento</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. ÁREA DE MENSAGENS (TELA CHEIA SCROLLÁVEL)              */}
      {/* ========================================================= */}
      <div className="flex-1 bg-slate-50/60 p-4 sm:p-6 overflow-y-auto space-y-4">
        {/* Banner Informativo no Topo do Chat */}
        <div className="max-w-md mx-auto text-center py-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200/80 rounded-full shadow-2xs text-[11px] font-medium text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-tenant-primary" />
            <span>Atendimento seguro com canal direto para nossa equipe técnica.</span>
          </div>
        </div>

        {/* Lista de Mensagens */}
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-tenant-primary flex items-center justify-center mx-auto shadow-2xs">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Canal de Atendimento Aberto
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Envie sua dúvida, problema ou feedback abaixo. Se preferir, você também pode gravar um áudio.
              </p>
            </div>
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
                  className={`max-w-lg p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-tenant-primary text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                  {msg.attachmentUrl && (
                    <div className="mt-2.5 p-2.5 bg-black/10 rounded-2xl flex items-center gap-3">
                      <audio src={msg.attachmentUrl} controls className="h-8 max-w-full" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 px-1">
                  <span>
                    {isMe
                      ? `${contactName || 'Você'} • ${msg.timestamp}`
                      : `Especialista (${currentCategoryMeta.title}) • ${msg.timestamp}`}
                  </span>
                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-tenant-primary" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Popover Flutuante de Emojis */}
      <AnimatePresence>
        {isEmojiPickerOpen && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-20 left-4 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 w-[290px] sm:w-[340px]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-1.5">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActiveEmojiCategory(idx)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                      activeEmojiCategory === idx
                        ? 'bg-tenant-light text-tenant-primary'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-44 overflow-y-auto p-1">
              {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-lg transition-transform active:scale-125 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 3. BARRA DE DIGITAÇÃO E GRAVAÇÃO DE VOZ                   */}
      {/* ========================================================= */}
      <footer className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 relative bg-slate-50/80 border border-slate-200 rounded-2xl p-1.5 sm:p-2 focus-within:bg-white focus-within:border-tenant-primary/80 transition-all"
        >
          {/* Botão de Emojis */}
          <button
            type="button"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isEmojiPickerOpen
                ? 'bg-tenant-light text-tenant-primary'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Inserir Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isRecording
                ? `Gravando áudio de voz... (${recordingSeconds}s)`
                : `Digite sua mensagem sobre ${currentCategoryMeta.title.toLowerCase()}...`
            }
            disabled={isRecording}
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-0 outline-none font-medium text-slate-800 placeholder-slate-400"
          />

          {/* Botão de Gravação de Áudio */}
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse transition-all cursor-pointer shrink-0 shadow-sm"
              title="Parar Gravação"
            >
              <Square className="w-4 h-4 fill-white" />
              <span className="font-mono text-xs">{recordingSeconds}s</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 text-slate-400 hover:text-tenant-primary hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Gravar mensagem de voz"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={!inputMessage.trim() && !audioUrl}
            className="p-2.5 btn-primary-tenant disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
            title="Enviar Mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* ========================================================= */}
      {/* 4. MODAL DE IDENTIFICAÇÃO & TIPO DE CHAMADO               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isIdentificationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop com Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-center relative z-10"
            >
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer z-20"
                title="Fechar e ir para o chat"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-3xl bg-tenant-light text-tenant-primary flex items-center justify-center mx-auto shadow-2xs border border-tenant-primary/20">
                <Headphones className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-tenant-primary bg-tenant-light px-3 py-1 rounded-full border border-tenant-primary/20">
                  Central de Atendimento
                </span>
                <h2 className="text-xl font-display font-bold text-slate-900 mt-2.5">
                  Identificação & Tipo de Chamado
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Selecione o tipo de atendimento e confirme seus dados para direcionarmos à equipe especialista.
                </p>
              </div>

              <form onSubmit={handleConfirmIdentification} className="space-y-4 text-left">
                {/* Seletor de Categoria */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    O que você precisa hoje? *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {TICKET_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-tenant-light border-tenant-primary ring-2 ring-tenant-primary/20 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                isSelected
                                  ? 'bg-tenant-primary text-white'
                                  : 'bg-white text-slate-600 shadow-2xs'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-tenant-primary" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {cat.title}
                            </span>
                            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                              {cat.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nome Completo */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Seu Nome Completo <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Digite seu nome (ou deixe em branco)"
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-tenant-primary transition-all font-medium text-slate-800"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    WhatsApp de Retorno (Opcional)
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-tenant-primary transition-all font-medium text-slate-800"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 btn-primary-tenant text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md shadow-tenant-primary/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Entrar no Chat em {currentCategoryMeta.title}</span>
                  </button>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer text-center block"
                  >
                    Continuar para o chat sem preencher
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
