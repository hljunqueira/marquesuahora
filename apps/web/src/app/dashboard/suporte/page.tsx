'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  HelpCircle,
  Send,
  Mic,
  Square,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'TENANT' | 'SUPPORT';
  content?: string;
  attachmentUrl?: string;
  audioDurationSeconds?: number;
  timestamp: string;
}

export default function DashboardSuportePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'SUPPORT',
      content:
        'Olá! Bem-vindo à Central de Suporte Marque Sua Hora. Como podemos ajudar seu espaço hoje?',
      timestamp: 'Hoje às 10:00'
    },
    {
      id: 'msg-2',
      sender: 'TENANT',
      content:
        'Olá! Gostaria de tirar uma dúvida sobre como configurar a cobrança de sinal via PIX para sábados.',
      timestamp: 'Hoje às 10:05'
    },
    {
      id: 'msg-3',
      sender: 'SUPPORT',
      content:
        'Você pode ativar o sinal em Configurações > Sinal & No-Show, definindo o valor fixo ou percentual. O sistema gera automaticamente o QR Code PIX com trava de 15 minutos!',
      timestamp: 'Hoje às 10:08'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

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

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'TENANT',
      content: inputMessage.trim() || undefined,
      attachmentUrl: audioUrl || undefined,
      audioDurationSeconds: audioUrl ? recordingSeconds : undefined,
      timestamp: 'Agora'
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setAudioUrl(null);
    setRecordingSeconds(0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header com Protocolo */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900">
                Atendimento Técnico ao Dono
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                #TK-2026-0842
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              SLA Médio de Resposta: menos de 15 minutos
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Suporte Online</span>
        </span>
      </div>

      {/* Caixa de Mensagens */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender === 'TENANT';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? 'bg-purple-600 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                }`}
              >
                {msg.content && <p>{msg.content}</p>}

                {msg.attachmentUrl && (
                  <div className="mt-2 p-2 bg-black/10 rounded-xl flex items-center gap-2">
                    <audio src={msg.attachmentUrl} controls className="h-8 w-48" />
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}
      </div>

      {/* Barra de Entrada de Mensagem e Gravação de Áudio */}
      <form
        onSubmit={handleSendMessage}
        className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={
            isRecording
              ? `Gravando áudio de voz... (${recordingSeconds}s)`
              : 'Digite sua mensagem ou dúvida...'
          }
          disabled={isRecording}
          className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
        />

        {/* Botão de Gravação de Voz MediaRecorder */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs flex items-center gap-1.5 animate-pulse transition-all"
            title="Parar Gravação"
          >
            <Square className="w-4 h-4 fill-white" />
            <span className="font-mono text-xs">{recordingSeconds}s</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="p-2.5 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-xl transition-colors"
            title="Gravar mensagem de voz"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {/* Botão de Envio */}
        <button
          type="submit"
          disabled={!inputMessage.trim() && !audioUrl}
          className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-purple-600/20 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
