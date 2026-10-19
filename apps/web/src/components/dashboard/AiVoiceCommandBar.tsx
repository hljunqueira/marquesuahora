'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Clock,
  User,
  Tag,
  ArrowRight,
  Phone,
  MessageCircle,
  HelpCircle,
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Package,
  Layers,
  Info,
  X
} from 'lucide-react';
import { api } from '@/lib/api';

interface QuickCommandPreview {
  action:
    | 'CREATE_EXPENSE'
    | 'CREATE_INCOME'
    | 'CREATE_SCHEDULE'
    | 'BLOCK_SCHEDULE'
    | 'CREATE_CREDIT'
    | 'DELETE_SCHEDULE'
    | 'DELETE_BLOCK'
    | 'DELETE_EXPENSE'
    | 'DELETE_INCOME'
    | 'DELETE_CLIENT'
    | 'DELETE_CREDIT'
    | 'DELETE_PRODUCT'
    | 'DELETE_SERVICE'
    | 'UNKNOWN';
  confidence: number;
  summary: string;
  spokenFeedback: string;
  requiresPassword?: boolean;
  payload: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
    paymentMethod?: string;
    clientName?: string;
    clientPhone?: string;
    serviceId?: string;
    serviceName?: string;
    professionalId?: string;
    professionalName?: string;
    dateStr?: string;
    startTime?: string;
    blockDate?: string;
    blockStartTime?: string;
    blockEndTime?: string;
    blockReason?: string;
    creditClientName?: string;
    creditAmount?: number;
    creditDueDate?: string;
    creditNotes?: string;
    productName?: string;
  };
  missingInfo?: string[];
}

interface AiVoiceCommandBarProps {
  onCommandExecuted?: () => void;
}

export function AiVoiceCommandBar({ onCommandExecuted }: AiVoiceCommandBarProps) {
  const [commandText, setCommandText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [preview, setPreview] = useState<QuickCommandPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastScheduleCreated, setLastScheduleCreated] = useState<{
    id?: string;
    clientName: string;
    clientPhone: string;
    dateStr: string;
    startTime: string;
    serviceName?: string;
  } | null>(null);

  const [hasAiAssistant, setHasAiAssistant] = useState<boolean>(true);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Verifica se o plano do estabelecimento possui Copiloto IA liberado
  useEffect(() => {
    const checkAiAccess = () => {
      try {
        const savedTenant = localStorage.getItem('tenant_data');
        if (savedTenant) {
          const parsed = JSON.parse(savedTenant);
          if (parsed?.plan) {
            setHasAiAssistant(Boolean(parsed.plan.hasAiAssistant));
            return;
          }
        }
      } catch {
        // ignore
      }
    };

    checkAiAccess();
    window.addEventListener('storage', checkAiAccess);
    window.addEventListener('marquesuahora_tenant_sync', checkAiAccess);
    return () => {
      window.removeEventListener('storage', checkAiAccess);
      window.removeEventListener('marquesuahora_tenant_sync', checkAiAccess);
    };
  }, []);

  // Inicializa o reconhecimento de voz do navegador (Web Speech API)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
        setSuccessMessage(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setCommandText(transcript);
          handleInterpret(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Permissão de microfone negada. Você pode digitar seu comando normalmente.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage('Não consegui ouvir o comando com clareza. Tente novamente ou digite.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Alterna ativação do microfone
  const toggleListening = () => {
    if (!speechSupported) {
      setErrorMessage('Seu navegador não suporta reconhecimento de voz. Você pode digitar o comando.');
      inputRef.current?.focus();
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      setErrorMessage(null);
      setSuccessMessage(null);
      setPreview(null);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Falha ao iniciar microfone:', err);
      }
    }
  };

  // Envia texto transcrito ou digitado para o backend interpretar e gerar prévia
  const handleInterpret = async (textToParse?: string) => {
    const text = (textToParse || commandText).trim();
    if (!text) return;

    setIsParsing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreview(null);

    try {
      const response = await api.post('/ai/quick-command', {
        transcript: text,
        executeImmediately: false
      });

      if (response.data?.preview) {
        setPreview(response.data.preview);
      } else {
        setErrorMessage('Não foi possível interpretar o comando.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Falha ao processar comando com IA. Verifique sua conexão.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  // Executa o comando em 1 clique após confirmação do usuário
  const handleConfirmExecution = async () => {
    if (!preview) return;

    if (preview.requiresPassword && !passwordInput.trim()) {
      setErrorMessage('Por favor, digite sua senha de acesso para autorizar a exclusão.');
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const response = await api.post('/ai/quick-command', {
        transcript: commandText,
        executeImmediately: true,
        preview,
        password: passwordInput ? passwordInput.trim() : undefined
      });

      if (response.data?.success) {
        const msg = response.data.message || 'Lançamento realizado com sucesso!';
        setSuccessMessage(msg);
        setPasswordInput('');

        // Feedback sonoro amigável via síntese de voz (se disponível)
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && response.data.spokenFeedback) {
          try {
            const utterance = new SpeechSynthesisUtterance(response.data.spokenFeedback);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
          } catch {
            // ignore speech synthesis errors
          }
        }

        if (preview.action === 'CREATE_SCHEDULE') {
          const bookingData = response.data?.data;
          setLastScheduleCreated({
            id: bookingData?.id,
            clientName: preview.payload.clientName || 'Cliente',
            clientPhone: bookingData?.clientPhone || preview.payload.clientPhone || '',
            dateStr: preview.payload.dateStr || '',
            startTime: preview.payload.startTime || '',
            serviceName: preview.payload.serviceName || ''
          });
        }

        // Emite eventos de sincronização para a agenda, finanças e clientes atualizarem em tempo real
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
          window.dispatchEvent(new CustomEvent('marquesuahora_financial_sync'));
          window.dispatchEvent(new CustomEvent('marquesuahora_client_sync'));
        }

        onCommandExecuted?.();

        // Limpa estado da prévia após 2.5 segundos
        setTimeout(() => {
          setPreview(null);
          setCommandText('');
          setSuccessMessage(null);
          setPasswordInput('');
        }, 2500);
      } else {
        setErrorMessage(response.data?.message || 'Erro ao efetivar lançamento.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Erro ao executar o comando na sua conta.'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setErrorMessage(null);
    setPasswordInput('');
  };

  // Ícone e cores de acordo com a ação interpretada
  const getActionBadge = (action: QuickCommandPreview['action']) => {
    switch (action) {
      case 'CREATE_EXPENSE':
        return {
          label: 'Despesa Financeira',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <DollarSign className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'CREATE_INCOME':
        return {
          label: 'Receita / Entrada',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
        };
      case 'CREATE_CREDIT':
        return {
          label: 'Crediário / Fiado',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <Tag className="w-3.5 h-3.5 text-amber-600" />
        };
      case 'CREATE_SCHEDULE':
        return {
          label: 'Novo Agendamento',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <Calendar className="w-3.5 h-3.5 text-purple-600" />
        };
      case 'BLOCK_SCHEDULE':
        return {
          label: 'Bloqueio de Horário',
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: <Clock className="w-3.5 h-3.5 text-slate-600" />
        };
      case 'DELETE_SCHEDULE':
        return {
          label: 'Excluir Agendamento',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'DELETE_BLOCK':
        return {
          label: 'Excluir Bloqueio',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'DELETE_EXPENSE':
        return {
          label: 'Excluir Despesa',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'DELETE_INCOME':
        return {
          label: 'Excluir Entrada',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'DELETE_CREDIT':
        return {
          label: 'Excluir Fiado / Crediário',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'DELETE_CLIENT':
        return {
          label: 'Excluir Cliente',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'DELETE_PRODUCT':
        return {
          label: 'Excluir Produto',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'DELETE_SERVICE':
        return {
          label: 'Excluir Serviço',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        };
      default:
        return {
          label: 'Comando Não Reconhecido',
          color: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
        };
    }
  };

  const commandCategories = [
    {
      category: 'Agenda & Horários',
      icon: <Calendar className="w-4 h-4 text-purple-600" />,
      items: [
        { label: 'Novo Agendamento', example: 'Agendar Maria hoje às 14h com corte feminino' },
        { label: 'Agendar para Amanhã', example: 'Agendar Carla amanhã às 15h30 para hidratação' },
        { label: 'Agendamento com Profissional', example: 'Marcar Fernanda sábado 10h manicure com Paula' },
        { label: 'Bloquear Horário', example: 'Bloquear agenda hoje das 12h às 13h para almoço' },
        { label: 'Bloqueio Médico', example: 'Bloquear amanhã das 08h às 10h para consulta médica' }
      ]
    },
    {
      category: 'Financeiro & Lançamentos',
      icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
      items: [
        { label: 'Lançar Despesa', example: 'Gastei 85 reais com esmaltes e produtos' },
        { label: 'Conta de Energia/Água', example: 'Paguei 140 de energia hoje' },
        { label: 'Receita / Entrada Avulsa', example: 'Recebi 180 reais de venda de pacotes' },
        { label: 'Entrada PIX', example: 'Entrada de 250 reais no pix de consultoria' }
      ]
    },
    {
      category: 'Crediário & Fiado (Planos Pagos & VIP)',
      icon: <Tag className="w-4 h-4 text-amber-600" />,
      items: [
        { label: 'Novo Fiado com Vencimento', example: 'Anotar 150 de fiado para Camila com vencimento dia 15' },
        { label: 'Fiado Rápido', example: 'Anotar fiado de 80 reais para Juliana' }
      ]
    },
    {
      category: 'Ações Destrutivas (Exigem Senha de Acesso)',
      icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
      isDestructive: true,
      items: [
        { label: 'Cancelar Agendamento', example: 'Cancelar agendamento da Beatriz amanhã' },
        { label: 'Excluir Bloqueio', example: 'Desbloquear horário do almoço hoje' },
        { label: 'Excluir Despesa', example: 'Excluir despesa de 85 reais de produtos' },
        { label: 'Excluir Fiado', example: 'Excluir conta fiado da Camila' },
        { label: 'Excluir Produto', example: 'Excluir produto Shampoo Antiqueda' }
      ]
    }
  ];

  return (
    <div className="w-full bg-gradient-to-r from-purple-50/60 via-white to-violet-50/60 rounded-3xl p-3 sm:p-4 border border-purple-100/90 shadow-xs transition-all">
      {/* Barra de Entrada de Comando */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Identificador Copiloto IA + Botão de Ajuda */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 border border-purple-200/80 rounded-2xl shadow-xs">
            <span className="text-xs font-bold tracking-tight text-purple-800">
              Copiloto IA
            </span>
            {!hasAiAssistant && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                Planos Pagos / VIP
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-100/60 hover:bg-purple-100 px-2.5 py-2 rounded-2xl transition-colors cursor-pointer border border-purple-200/60 shadow-2xs"
            title="Ver o que o Copiloto IA pode fazer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">O que posso fazer?</span>
            <span className="sm:hidden">Ajuda</span>
          </button>
        </div>

        {/* Campo de Comando por Voz e Digitação */}
        <div className="relative flex-1 flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-2xs focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            disabled={!hasAiAssistant}
            readOnly={!hasAiAssistant}
            placeholder={
              !hasAiAssistant
                ? 'Copiloto IA exclusivo dos planos pagos e VIP. Faça upgrade para desbloquear comandos por voz e texto.'
                : 'Fale ou digite: "Agendar Maria hoje às 14h com corte" ou "Gastei 50 reais de produtos"'
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isParsing && hasAiAssistant) {
                handleInterpret();
              }
            }}
            className="w-full bg-transparent px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none pr-36 sm:pr-40 disabled:cursor-not-allowed disabled:text-slate-400"
          />

          {!hasAiAssistant ? (
            <div className="absolute right-1.5 flex items-center">
              <Link
                href="/dashboard/planos"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desbloquear Copiloto IA</span>
                <span className="sm:hidden">Liberar</span>
              </Link>
            </div>
          ) : (
            /* Botões do Input (Microfone + Enviar) */
            <div className="absolute right-1.5 flex items-center gap-1">
              {/* Botão Microfone */}
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? 'Parar gravação' : 'Falar comando'}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-200 animate-pulse'
                    : 'bg-slate-100 hover:bg-violet-50 text-slate-700 hover:text-violet-700'
                }`}
              >
                {isListening ? (
                  <>
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                    </span>
                    <Mic className="w-4 h-4 animate-bounce" />
                  </>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Botão Enviar / Interpretar */}
              <button
                type="button"
                onClick={() => handleInterpret()}
                disabled={!commandText.trim() || isParsing}
                title="Processar comando"
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white transition-all shadow-xs cursor-pointer active:scale-95"
              >
                {isParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Indicador quando está ouvindo */}
      {isListening && (
        <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-rose-50/90 border border-rose-200/80 rounded-xl text-xs font-semibold text-rose-700 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>Ouvindo... pode falar normalmente seu gasto ou agendamento!</span>
        </div>
      )}

      {/* Mensagem de Erro com Link amigável de Suporte */}
      {errorMessage && (
        <div className="mt-2.5 flex items-center justify-between gap-2 px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {errorMessage.toLowerCase().includes('suporte') && (
            <Link
              href="/dashboard/suporte"
              className="text-2xs font-bold text-red-800 underline hover:text-red-950 shrink-0 ml-2"
            >
              Falar com Suporte
            </Link>
          )}
        </div>
      )}

      {/* Mensagem de Sucesso */}
      {successMessage && (
        <div className="mt-2.5 flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Notificação e Ação Rápida WhatsApp após Agendamento Criado */}
      {lastScheduleCreated && (
        <div className="mt-3 p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Agendamento de {lastScheduleCreated.clientName} registrado!
              </p>
              <p className="text-2xs text-emerald-700 font-medium">
                {lastScheduleCreated.serviceName || 'Serviço'} • {lastScheduleCreated.dateStr} às {lastScheduleCreated.startTime}
                {lastScheduleCreated.clientPhone ? ` • WhatsApp: ${lastScheduleCreated.clientPhone}` : ' • Cliente sincronizado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastScheduleCreated.clientPhone ? (
              <a
                href={`https://wa.me/55${lastScheduleCreated.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Olá ${lastScheduleCreated.clientName}! Seu horário para ${lastScheduleCreated.serviceName || 'atendimento'} no dia ${lastScheduleCreated.dateStr.slice(8, 10)}/${lastScheduleCreated.dateStr.slice(5, 7)} às ${lastScheduleCreated.startTime} foi agendado com sucesso!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp</span>
              </a>
            ) : (
              <a
                href="/dashboard/clientes"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>Completar no CRM</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setLastScheduleCreated(null)}
              className="p-1.5 text-emerald-700 hover:text-emerald-950 transition-colors"
              title="Fechar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CARD DE PRÉVIA INTELIGENTE (1 CLIQUE PARA CONFIRMAR) */}
      {preview && !successMessage && (
        <div className="mt-3 bg-white border border-purple-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {(() => {
                const badge = getActionBadge(preview.action);
                return (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${badge.color}`}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </div>
                );
              })()}
              <span className="text-2xs text-slate-400 font-medium">
                {preview.requiresPassword
                  ? 'Exclusão definitiva: Requer autorização por senha'
                  : 'Confirme os dados antes de salvar'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelPreview}
                disabled={isExecuting}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExecution}
                disabled={isExecuting || preview.action === 'UNKNOWN'}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  preview.requiresPassword
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : preview.requiresPassword ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão com Senha</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar Lançamento</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resumo Interpretado */}
          <div className="mt-3 text-xs text-slate-700 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            <p className="font-bold text-slate-800 text-sm mb-1">{preview.summary}</p>

            {/* Alerta de Segurança e Input de Senha para Ações Destrutivas */}
            {preview.requiresPassword && (
              <div className="mt-3 p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-900">
                      Confirmação de Segurança Obrigatória
                    </p>
                    <p className="text-[11px] text-rose-700">
                      Para prevenir exclusões acidentais, digite sua senha de acesso ao MarqueSuaHora para autorizar esta exclusão.
                    </p>
                  </div>
                </div>

                <div className="relative max-w-sm">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Sua senha de login..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && passwordInput.trim() && !isExecuting) {
                        handleConfirmExecution();
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Detalhes específicos de acordo com o tipo */}
            {preview.action === 'CREATE_EXPENSE' && (
              <div className="flex flex-wrap items-center gap-3 text-2xs font-semibold text-slate-600 mt-2">
                <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                  <DollarSign className="w-3 h-3" />
                  Valor: R$ {preview.payload.amount?.toFixed(2).replace('.', ',')}
                </span>
                <span>Categoria: {preview.payload.category}</span>
                <span>Data: {preview.payload.date}</span>
              </div>
            )}

            {preview.action === 'CREATE_CREDIT' && (
              <div className="flex flex-wrap items-center gap-3 text-2xs font-semibold text-slate-600 mt-2">
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                  <User className="w-3 h-3" />
                  Cliente: {preview.payload.creditClientName}
                </span>
                <span>Valor: R$ {preview.payload.creditAmount?.toFixed(2).replace('.', ',')}</span>
                <span>Vencimento: {preview.payload.creditDueDate || 'Hoje'}</span>
              </div>
            )}

            {preview.action === 'CREATE_SCHEDULE' && (
              <div className="space-y-3 mt-2">
                <div className="flex flex-wrap items-center gap-3 text-2xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                    <Calendar className="w-3 h-3" />
                    Data: {preview.payload.dateStr} às {preview.payload.startTime}
                  </span>
                  <span>Serviço: {preview.payload.serviceName}</span>
                  <span>Profissional: {preview.payload.professionalName}</span>
                </div>

                {/* Edição Rápida do Cliente e Telefone WhatsApp */}
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nome da Cliente:
                    </label>
                    <input
                      type="text"
                      value={preview.payload.clientName || ''}
                      onChange={(e) => {
                        setPreview({
                          ...preview,
                          payload: { ...preview.payload, clientName: e.target.value }
                        });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      WhatsApp:
                    </label>
                    <input
                      type="tel"
                      value={preview.payload.clientPhone || ''}
                      onChange={(e) => {
                        setPreview({
                          ...preview,
                          payload: { ...preview.payload, clientPhone: e.target.value }
                        });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-purple-500 focus:outline-none"
                    />
                    {!preview.payload.clientPhone && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Opcional. Se não preenchido, a cliente é cadastrada automaticamente e pode ser editada depois.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {preview.action === 'BLOCK_SCHEDULE' && (
              <div className="flex flex-wrap items-center gap-3 text-2xs font-semibold text-slate-600 mt-2">
                <span className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  <Clock className="w-3 h-3" />
                  Das {preview.payload.blockStartTime} às {preview.payload.blockEndTime}
                </span>
                <span>Motivo: {preview.payload.blockReason}</span>
              </div>
            )}

            {/* Aviso de Informações Pendentes */}
            {preview.missingInfo && preview.missingInfo.length > 0 && (
              <div className="mt-2 text-2xs text-amber-700 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Atenção:</strong> {preview.missingInfo.join('. ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: O QUE O COPILOTO IA PODE FAZER */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            {/* Cabeçalho do Modal */}
            <div className="px-5 py-4 bg-gradient-to-r from-purple-50 via-white to-violet-50 border-b border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  IA
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    O que o Copiloto IA pode fazer?
                  </h3>
                  <p className="text-2xs text-slate-500">
                    Comandos em linguagem natural por voz ou texto para agilizar sua rotina
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Categorias e Exemplos */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Card de Segurança de Senha */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-800 mb-0.5">
                    Segurança e Controle Total do Estabelecimento
                  </p>
                  <p className="leading-relaxed">
                    O Copiloto IA pode criar agendamentos, registrar finanças e consultar dados. Porém, para <strong>exclusões definitivas</strong> (cancelar horários, apagar despesas ou excluir clientes), é <strong>obrigatório digitar sua senha de acesso</strong> para confirmação.
                  </p>
                </div>
              </div>

              {/* Categorias de Comandos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {commandCategories.map((cat, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      cat.isDestructive
                        ? 'bg-rose-50/40 border-rose-200/80 md:col-span-2'
                        : 'bg-white border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-slate-100">
                      {cat.icon}
                      <span className="text-xs font-bold text-slate-800">
                        {cat.category}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cat.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          onClick={() => {
                            setCommandText(item.example);
                            setIsHelpModalOpen(false);
                            inputRef.current?.focus();
                          }}
                          className="group p-2 rounded-xl bg-slate-50/70 hover:bg-purple-50/60 border border-slate-100 hover:border-purple-200 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-2xs mb-0.5">
                            <span className="font-semibold text-slate-700">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-purple-600 opacity-0 group-hover:opacity-100 font-bold transition-opacity">
                              Testar comando
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 italic group-hover:text-purple-900 font-mono">
                            &ldquo;{item.example}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-2xs text-slate-500">
                Dica: Clique em qualquer exemplo acima para pré-preencher na barra.
              </span>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
