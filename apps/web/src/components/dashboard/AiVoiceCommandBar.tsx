'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
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
  ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api';

interface QuickCommandPreview {
  action: 'CREATE_EXPENSE' | 'CREATE_INCOME' | 'CREATE_SCHEDULE' | 'BLOCK_SCHEDULE' | 'CREATE_CREDIT' | 'UNKNOWN';
  confidence: number;
  summary: string;
  spokenFeedback: string;
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

  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const response = await api.post('/ai/quick-command', {
        transcript: commandText,
        executeImmediately: true,
        preview
      });

      if (response.data?.success) {
        const msg = response.data.message || 'Lançamento realizado com sucesso!';
        setSuccessMessage(msg);

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

        // Emite eventos de sincronização para a agenda e finanças atualizarem em tempo real
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
          window.dispatchEvent(new CustomEvent('marquesuahora_financial_sync'));
        }

        onCommandExecuted?.();

        // Limpa estado da prévia após 2.5 segundos
        setTimeout(() => {
          setPreview(null);
          setCommandText('');
          setSuccessMessage(null);
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
      default:
        return {
          label: 'Comando Não Reconhecido',
          color: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
        };
    }
  };

  return (
    <div className="w-full bg-linear-to-r from-violet-50/70 via-white to-pink-50/70 rounded-3xl p-3 sm:p-4 border border-violet-100/80 shadow-xs transition-all">
      {/* Barra de Entrada de Comando */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Identificador com Ícone IA */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 border border-violet-200/60 rounded-2xl shadow-2xs shrink-0 self-start sm:self-auto">
          <div className="w-6 h-6 rounded-lg bg-linear-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-xs font-black tracking-tight bg-linear-to-r from-violet-700 to-pink-600 bg-clip-text text-transparent">
            Copiloto IA
          </span>
        </div>

        {/* Campo de Comando por Voz e Digitação */}
        <div className="relative flex-1 flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-2xs focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isParsing) {
                handleInterpret();
              }
            }}
            placeholder="Fale ou digite: 'Anotar 150 em produtos loja Fraceto hoje' ou 'Agendar cliente dia 22 às 17h'..."
            className="w-full bg-transparent px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden pr-20"
          />

          {/* Botões do Input (Microfone + Enviar) */}
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
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Indicador quando está ouvindo */}
      {isListening && (
        <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-rose-50/90 border border-rose-200/80 rounded-xl text-xs font-semibold text-rose-700 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>Ouvindo... pode falar normalmente seu gasto ou agendamento!</span>
        </div>
      )}

      {/* Mensagem de Erro */}
      {errorMessage && (
        <div className="mt-2.5 flex items-center gap-2 px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mensagem de Sucesso */}
      {successMessage && (
        <div className="mt-2.5 flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* CARD DE PRÉVIA INTELIGENTE (1 CLIQUE PARA CONFIRMAR) */}
      {preview && !successMessage && (
        <div className="mt-3 bg-white border border-violet-200 rounded-2xl p-3.5 sm:p-4 shadow-sm animate-fadeIn">
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
              <span className="text-2xs text-slate-400 font-medium">Confirme os dados antes de salvar</span>
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
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
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
              <div className="flex flex-wrap items-center gap-3 text-2xs font-semibold text-slate-600 mt-2">
                <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                  <Calendar className="w-3 h-3" />
                  Data: {preview.payload.dateStr} às {preview.payload.startTime}
                </span>
                <span>Cliente: {preview.payload.clientName}</span>
                <span>Serviço: {preview.payload.serviceName}</span>
                <span>Profissional: {preview.payload.professionalName}</span>
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
    </div>
  );
}
