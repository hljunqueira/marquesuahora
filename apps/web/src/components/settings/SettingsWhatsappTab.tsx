'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { TenantSettings } from './types';
import { api } from '@/lib/api';

interface SettingsWhatsappTabProps {
  settings: TenantSettings;
  onNavigateToPlan?: () => void;
}

export const SettingsWhatsappTab: React.FC<SettingsWhatsappTabProps> = ({
  settings,
  onNavigateToPlan
}) => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<{
    configured: boolean;
    isConnected: boolean;
    instanceName: string | null;
    phoneNumber: string | null;
    qrCode: string | null;
  }>({
    configured: false,
    isConnected: false,
    instanceName: null,
    phoneNumber: null,
    qrCode: null
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const plan = settings.plan;
  const isVipOrAllowed =
    !plan ||
    settings.billingStatus === 'GRATUITY' ||
    settings.billingStatus === 'TRIAL' ||
    plan.code !== 'FREE';

  const fetchAiSettings = useCallback(async () => {
    try {
      const res = await api.get('/tenants/me/ai-settings');
      if (res.data?.customInstructions) {
        setCustomInstructions(res.data.customInstructions);
      }
    } catch {
      // Ignora erro silencioso
    }
  }, []);

  const handleSaveAiSettings = async () => {
    setSavingInstructions(true);
    setSaveSuccess(false);
    try {
      await api.put('/tenants/me/ai-settings', {
        customInstructions
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('Erro ao salvar instruções da IA:', err);
      setErrorMsg('Falha ao salvar instruções da IA.');
    } finally {
      setSavingInstructions(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/tenants/me/whatsapp');
      setStatus(res.data);
      setErrorMsg(null);
    } catch (err: any) {
      console.warn('Erro ao carregar status do WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchAiSettings();
  }, [fetchStatus, fetchAiSettings]);

  // Polling automático enquanto o QR Code estiver na tela aguardando leitura
  useEffect(() => {
    if (!status.isConnected && status.qrCode) {
      const interval = setInterval(() => {
        fetchStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [status.isConnected, status.qrCode, fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/tenants/me/whatsapp/connect');
      setStatus((prev) => ({
        ...prev,
        configured: true,
        isConnected: res.data.isConnected,
        instanceName: res.data.instanceName,
        phoneNumber: res.data.phoneNumber,
        qrCode: res.data.qrCode
      }));
    } catch (err: any) {
      console.error('Erro ao conectar WhatsApp:', err);
      setErrorMsg(
        err?.response?.data?.message ||
          'Não foi possível gerar a conexão no momento. Verifique se o plano possui automação.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setErrorMsg(null);
    try {
      await api.post('/tenants/me/whatsapp/disconnect');
      setStatus({
        configured: true,
        isConnected: false,
        instanceName: status.instanceName,
        phoneNumber: null,
        qrCode: null
      });
    } catch (err: any) {
      console.error('Erro ao desconectar WhatsApp:', err);
      setErrorMsg('Falha ao desconectar o aparelho.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isVipOrAllowed) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 block mb-1">
            Recurso do Plano Profissional
          </span>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Automações de WhatsApp com o Número do seu Salão
          </h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-2xl">
            O envio automático de confirmação de horário, lembretes de 24h/12h antes e pesquisa de satisfação pós-atendimento está disponível a partir do plano <strong>Profissional Solo</strong>.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onNavigateToPlan}
            className="px-5 py-2.5 rounded-xl btn-primary-tenant font-semibold text-xs transition-all active:scale-95 cursor-pointer"
          >
            Conhecer Plano Solo & Fazer Upgrade
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/80">
        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
        <span className="text-xs font-medium">Consultando status da conexão WhatsApp...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Cartão de Status */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-purple-700">
                Canal Oficial de Atendimento
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${
                  status.isConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {status.isConnected ? 'Conectado e Ativo' : 'Desconectado'}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              WhatsApp da Recepção
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              As mensagens de confirmação de agendamento e lembretes aos clientes saem diretamente do número oficial do seu negócio.
            </p>
          </div>

          <div>
            {status.isConnected ? (
              <button
                type="button"
                disabled={disconnecting}
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {disconnecting ? 'Desconectando...' : 'Desconectar Aparelho'}
              </button>
            ) : (
              <button
                type="button"
                disabled={connecting}
                onClick={handleConnect}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-primary-tenant transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{status.qrCode ? 'Atualizar QR Code' : 'Conectar WhatsApp Agora'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Estado Conectado */}
        {status.isConnected && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Número conectado:</span>
              <span className="font-mono font-bold text-slate-900">
                {status.phoneNumber || 'Número do Salão'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Instância ativa:</span>
              <span className="font-mono text-slate-600">
                {status.instanceName || 'Instância padrão'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-emerald-700 font-medium">
              Todas as confirmações, lembretes de 24h/12h e pesquisa pós-atendimento estão sendo enviados normalmente.
            </div>
          </div>
        )}

        {/* Estado com QR Code para leitura */}
        {!status.isConnected && status.qrCode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-6 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl w-fit mx-auto shadow-md border border-slate-200/80">
              {/* Imagem do QR Code em alta definição */}
              <img
                src={
                  status.qrCode.startsWith('data:')
                    ? status.qrCode
                    : `data:image/png;base64,${status.qrCode}`
                }
                alt="QR Code WhatsApp"
                className="w-56 h-56 object-contain rounded-xl"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-2 font-medium">
                Aponte a câmera do WhatsApp aqui
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Como conectar pelo celular:
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Siga os 4 passos abaixo no aplicativo do seu WhatsApp:
                </p>
              </div>

              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                    1
                  </span>
                  <span>Abra o <strong>WhatsApp</strong> no celular da sua recepção ou atendimento.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                    2
                  </span>
                  <span>Toque nos <strong>três pontinhos</strong> (Android) ou em <strong>Configurações</strong> (iPhone).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                    3
                  </span>
                  <span>Selecione <strong>Aparelhos conectados</strong> e toque em <strong>Conectar um aparelho</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                    4
                  </span>
                  <span>Aponte a câmera para o QR Code ao lado. A tela atualizará automaticamente assim que ler.</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Estado Inicial sem QR Code gerado */}
        {!status.isConnected && !status.qrCode && (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">
              Vantagens do WhatsApp conectado na sua agenda:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="font-bold text-slate-900 block">Menos Faltas</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block">
                  Lembretes 24h e 12h antes com confirmação de presença em 1 clique.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="font-bold text-slate-900 block">Fila de Espera</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block">
                  Quando alguém desmarca, o robô oferece a vaga para quem está na espera.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="font-bold text-slate-900 block">Avaliações Google</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block">
                  Coleta notas de 1 a 5 estrelas e envia clientes satisfeitos para o Google.
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Seção da Atendente IA Autônoma no WhatsApp */}
        <div className="pt-6 border-t border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-purple-700">
                  Inteligência Artificial Integrada
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Whisper + Gemini Flash Ativos
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Atendente IA Autônoma no WhatsApp
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                Responde dúvidas sobre procedimentos, escuta áudios pelo Whisper, analisa referências e consulta horários vagos reais em tempo real.
              </p>
            </div>
          </div>

          {/* Grid de Superpoderes Ativos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Áudio (Whisper)</span>
              <span className="text-[11px] text-slate-500 leading-relaxed block">
                Transcreve mensagens de voz do cliente em linguagem natural instantânea.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Visão Multimodal</span>
              <span className="text-[11px] text-slate-500 leading-relaxed block">
                Identifica fotos de referências (unhas, cortes) e comprovantes de PIX.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Agenda ao Vivo</span>
              <span className="text-[11px] text-slate-500 leading-relaxed block">
                Sugere apenas horários livres reais do expediente dos profissionais.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Proteção Anti-No-Show</span>
              <span className="text-[11px] text-slate-500 leading-relaxed block">
                Informa o valor de sinal e a chave PIX (incluindo regra da 1ª cliente).
              </span>
            </div>
          </div>

          {/* Formulário de Instruções Customizadas */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="aiInstructions" className="text-xs font-bold text-slate-900">
                Instruções e Regras Específicas da Recepção
              </label>
              <span className="text-[11px] text-slate-400">
                A IA lerá estas orientações antes de responder aos clientes
              </span>
            </div>

            <textarea
              id="aiInstructions"
              rows={3}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {saveSuccess ? (
                  <span className="text-emerald-600 font-semibold">Instruções da IA salvas com sucesso!</span>
                ) : (
                  'Dica: Mencione pontos de referência, estacionamento ou regras de atraso.'
                )}
              </span>

              <button
                type="button"
                disabled={savingInstructions}
                onClick={handleSaveAiSettings}
                className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary-tenant transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {savingInstructions && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{savingInstructions ? 'Salvando...' : 'Salvar Instruções da IA'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
