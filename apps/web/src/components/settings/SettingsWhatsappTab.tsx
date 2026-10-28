'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, QrCode, KeyRound, Copy, Check, Smartphone, Info, MessageSquare, RotateCcw } from 'lucide-react';
import { TenantSettings } from './types';
import { api } from '@/lib/api';
import { InputMask } from '@/components/ui/InputMask';

interface SettingsWhatsappTabProps {
  settings: TenantSettings;
  onChange?: (field: keyof TenantSettings, value: any) => void;
  onNavigateToPlan?: () => void;
}

export const SettingsWhatsappTab: React.FC<SettingsWhatsappTabProps> = ({
  settings,
  onChange,
  onNavigateToPlan
}) => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectMethod, setConnectMethod] = useState<'QR' | 'PAIRING_CODE'>('QR');
  const [phoneForPairing, setPhoneForPairing] = useState(settings.phone || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [status, setStatus] = useState<{
    configured: boolean;
    isConnected: boolean;
    instanceName: string | null;
    phoneNumber: string | null;
    qrCode: string | null;
    pairingCode?: string | null;
  }>({
    configured: false,
    isConnected: false,
    instanceName: null,
    phoneNumber: null,
    qrCode: null,
    pairingCode: null
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);
  const [welcomeEnabled, setWelcomeEnabled] = useState(settings.welcomeMessageEnabled ?? true);
  const [welcomeCustom, setWelcomeCustom] = useState(settings.welcomeMessageCustom ?? '');
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [saveWelcomeSuccess, setSaveWelcomeSuccess] = useState(false);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(settings.aiAssistantEnabled ?? true);
  const [savingAiToggle, setSavingAiToggle] = useState(false);
  const [saveAiToggleSuccess, setSaveAiToggleSuccess] = useState(false);

  useEffect(() => {
    if (settings.welcomeMessageEnabled !== undefined) {
      setWelcomeEnabled(settings.welcomeMessageEnabled);
    }
    if (settings.welcomeMessageCustom !== undefined) {
      setWelcomeCustom(settings.welcomeMessageCustom ?? '');
    }
    if (settings.aiAssistantEnabled !== undefined) {
      setAiAssistantEnabled(settings.aiAssistantEnabled);
    }
  }, [settings.welcomeMessageEnabled, settings.welcomeMessageCustom, settings.aiAssistantEnabled]);

  const handleToggleAiAssistant = async (enabled: boolean) => {
    setSavingAiToggle(true);
    setSaveAiToggleSuccess(false);
    setErrorMsg(null);
    try {
      await api.put('/tenants/me/settings', {
        aiAssistantEnabled: enabled
      });
      setAiAssistantEnabled(enabled);
      if (onChange) {
        onChange('aiAssistantEnabled', enabled);
      }
      setSaveAiToggleSuccess(true);
      setTimeout(() => setSaveAiToggleSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao atualizar modo da Atendente IA:', err);
      setErrorMsg('Falha ao atualizar modo da Atendente IA.');
      setAiAssistantEnabled(!enabled);
    } finally {
      setSavingAiToggle(false);
    }
  };

  const handleSaveWelcome = async () => {
    setSavingWelcome(true);
    setSaveWelcomeSuccess(false);
    setErrorMsg(null);
    try {
      await api.put('/tenants/me/settings', {
        welcomeMessageEnabled: welcomeEnabled,
        welcomeMessageCustom: welcomeCustom
      });
      if (onChange) {
        onChange('welcomeMessageEnabled', welcomeEnabled);
        onChange('welcomeMessageCustom', welcomeCustom);
      }
      setSaveWelcomeSuccess(true);
      setTimeout(() => setSaveWelcomeSuccess(false), 3500);
    } catch (err: any) {
      console.error('Erro ao salvar mensagem de boas-vindas:', err);
      setErrorMsg('Falha ao salvar mensagem de boas-vindas.');
    } finally {
      setSavingWelcome(false);
    }
  };

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
      setStatus((prev) => ({
        ...res.data,
        // Mantém o pairingCode estável na tela enquanto o aparelho não conectar
        pairingCode: res.data.isConnected ? null : (res.data.pairingCode || prev.pairingCode || null)
      }));
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

  // Polling automático enquanto o QR Code ou Pairing Code estiver na tela aguardando leitura/digitação
  useEffect(() => {
    if (!status.isConnected && (status.qrCode || status.pairingCode || status.phoneNumber)) {
      const interval = setInterval(() => {
        fetchStatus();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [status.isConnected, status.qrCode, status.pairingCode, status.phoneNumber, fetchStatus]);

  const handleConnect = async (customPhone?: string) => {
    setConnecting(true);
    setErrorMsg(null);
    try {
      const payload = customPhone ? { phoneNumber: customPhone } : {};
      const res = await api.post('/tenants/me/whatsapp/connect', payload);
      setStatus((prev) => ({
        ...prev,
        configured: true,
        isConnected: res.data.isConnected,
        instanceName: res.data.instanceName,
        phoneNumber: res.data.phoneNumber || customPhone || prev.phoneNumber,
        qrCode: res.data.qrCode,
        pairingCode: res.data.pairingCode || (customPhone ? null : prev.pairingCode)
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

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    setErrorMsg(null);
    setTestSuccessMsg(null);
    try {
      const res = await api.post('/tenants/me/whatsapp/test-message');
      setTestSuccessMsg(res.data?.message || 'Mensagem de teste enviada com sucesso!');
      setTimeout(() => setTestSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Erro ao enviar mensagem de teste:', err);
      setErrorMsg(err?.response?.data?.message || 'Não foi possível enviar a mensagem de teste.');
    } finally {
      setSendingTest(false);
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
                onClick={() => handleConnect(connectMethod === 'PAIRING_CODE' ? phoneForPairing : undefined)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-primary-tenant transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {connectMethod === 'PAIRING_CODE'
                    ? (status.pairingCode ? 'Gerar Novo Código' : 'Gerar Código de Pareamento')
                    : (status.qrCode ? 'Atualizar QR Code' : 'Conectar WhatsApp Agora')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Seletor de Modo de Conexão: Com Câmera (QR Code) vs Sem Câmera (Código 8 Dígitos) */}
        {!status.isConnected && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Como prefere conectar seu WhatsApp?
              </span>
              <span className="text-[11px] text-slate-500">
                Selecione o método ideal para o aparelho da sua recepção.
              </span>
            </div>

            <div className="inline-flex p-1 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setConnectMethod('QR')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  connectMethod === 'QR'
                    ? 'bg-purple-100 text-purple-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Escanear QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => setConnectMethod('PAIRING_CODE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  connectMethod === 'PAIRING_CODE'
                    ? 'bg-purple-100 text-purple-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sem Câmera (Código de 8 Dígitos)</span>
              </button>
            </div>
          </div>
        )}

        {/* Estado Conectado */}
        {status.isConnected && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 text-xs space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-900 text-sm">
                    Recepção Online e Sincronizada
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>Número conectado:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {status.phoneNumber || 'Número do Salão'}
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  disabled={sendingTest}
                  onClick={handleSendTestMessage}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  {sendingTest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{sendingTest ? 'Enviando...' : 'Enviar Mensagem de Teste no WhatsApp'}</span>
                </button>
              </div>
            </div>

            {testSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium text-xs">
                {testSuccessMsg}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed space-y-1.5">
              <span className="font-bold text-slate-800 block">
                Como testar a Atendente IA na prática:
              </span>
              <p>
                As confirmações e lembretes aos clientes saem diretamente deste número conectado. Para interagir com a sua Atendente IA e testar um agendamento real, <strong>envie uma mensagem a partir de outro celular</strong> para o número do seu salão (<strong>{status.phoneNumber || 'número conectado'}</strong>).
              </p>
            </div>
          </div>
        )}

        {/* MODO 1: QR CODE COM ALTO CONTRASTE PRETO (#000000) */}
        {!status.isConnected && connectMethod === 'QR' && (
          <>
            {status.qrCode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-6 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl w-fit mx-auto shadow-md border border-slate-200/80">
                  {/* Imagem do QR Code em alta definição com preto puro (#000000) e alto contraste */}
                  <img
                    src={
                      status.qrCode.startsWith('data:')
                        ? status.qrCode
                        : `data:image/png;base64,${status.qrCode}`
                    }
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 object-contain rounded-xl select-none"
                    style={{
                      filter: 'grayscale(100%) contrast(1000%)',
                      imageRendering: 'pixelated'
                    }}
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-2 font-medium">
                    Aponte a câmera do WhatsApp aqui
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Como conectar pelo celular (QR Code):
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Siga os 4 passos no aplicativo oficial do WhatsApp:
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
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Conexão com Câmera do Celular
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Gere o QR Code em preto puro para leitura imediata na tela do computador.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => handleConnect()}
                    className="px-4 py-2 rounded-xl text-xs font-bold btn-primary-tenant shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Gerar QR Code Agora</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-2 border-t border-slate-200/70">
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
          </>
        )}

        {/* MODO 2: CONEXÃO SEM CÂMERA (CÓDIGO DE PAREAMENTO DE 8 DÍGITOS) */}
        {!status.isConnected && connectMethod === 'PAIRING_CODE' && (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Conectar sem Câmera (Código de Pareamento de 8 Dígitos)
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ideal se o celular da sua recepção não possui câmera, está com a lente riscada ou com problema de foco. O próprio WhatsApp oficial permite conectar digitando um código alfanumérico seguro.
                </p>
              </div>
            </div>

            {/* Formulário para Informar o Número do WhatsApp da Recepção */}
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Número do WhatsApp do Estabelecimento (com DDD)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="flex-1">
                  <InputMask
                    mask="phone"
                    value={phoneForPairing}
                    onChangeValue={(val) => setPhoneForPairing(val)}
                    placeholder="(48) 99999-9999"
                    className="w-full text-sm font-mono"
                  />
                </div>
                <button
                  type="button"
                  disabled={connecting || phoneForPairing.replace(/\D/g, '').length < 10}
                  onClick={() => handleConnect(phoneForPairing)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold btn-primary-tenant shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{status.pairingCode ? 'Gerar Novo Código' : 'Gerar Código de Pareamento'}</span>
                </button>
              </div>
            </div>

            {/* Exibição do Código de 8 Dígitos Gerado (Design Claro com Texto Preto) */}
            {status.pairingCode && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="md:col-span-5 text-center space-y-2 border-b md:border-b-0 md:border-r border-slate-200/80 pb-5 md:pb-0 md:pr-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                    Código de Conexão WhatsApp
                  </span>
                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-slate-900 select-all bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
                      {status.pairingCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(status.pairingCode!);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer border border-slate-200/80 shadow-2xs"
                      title="Copiar código"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-medium block">
                    Válido para inserção imediata no WhatsApp
                  </span>
                </div>

                <div className="md:col-span-7 space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Como digitar no celular sem câmera:
                  </h5>
                  <ol className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                        1
                      </span>
                      <span>Abra o <strong>WhatsApp</strong> no celular da sua recepção.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                        2
                      </span>
                      <span>Toque nos <strong>três pontinhos</strong> (Android) ou <strong>Configurações</strong> (iPhone) ➔ <strong>Aparelhos conectados</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                        3
                      </span>
                      <span>Toque em <strong>Conectar um aparelho</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                        4
                      </span>
                      <span>Na parte inferior da tela, toque em <strong>"Conectar com número de telefone"</strong> e digite o código de 8 dígitos ao lado.</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Seção da Atendente IA Autônoma no WhatsApp */}
        <div className="pt-6 border-t border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-purple-700">
                  Inteligência Artificial Integrada
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    aiAssistantEnabled
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {aiAssistantEnabled ? 'Ativa no WhatsApp' : 'Desativada (Modo Apenas Notificações)'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Atendente IA Autônoma no WhatsApp
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                {aiAssistantEnabled
                  ? 'Responde dúvidas sobre procedimentos, escuta mensagens de áudio, analisa referências e consulta horários disponíveis em tempo real.'
                  : 'O robô está silenciado para conversas recebidas. As confirmações e lembretes automáticos aos clientes continuam ativos, e você pode responder os clientes manualmente pelo celular.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiAssistantEnabled}
                  disabled={savingAiToggle}
                  onChange={(e) => handleToggleAiAssistant(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>
          </div>

          {saveAiToggleSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Configuração da Atendente IA salva com sucesso.</span>
            </div>
          )}

          {!aiAssistantEnabled ? (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">
                    Modo Apenas Notificações Ativo
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Quando as clientes enviarem mensagens para o WhatsApp da sua recepção, o robô não responderá nem fará perguntas. Você e sua equipe têm total liberdade para conversar de forma manual pelo próprio aplicativo do WhatsApp no celular.
                  </p>
                  <p className="text-xs text-slate-500 pt-1">
                    Suas notificações automáticas continuam 100% ativas: confirmações imediatas de agendamento, lembretes de 24h e 2h antes do horário, e links de PIX direto.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Grid de Superpoderes Ativos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">Compreensão de Áudio</span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block">
                    Transcreve e interpreta mensagens de voz dos clientes de forma instantânea.
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
                  <span className="font-bold text-slate-900 block">Proteção Anti-Falta</span>
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
            </>
          )}
        </div>
      </div>

      {/* Card: Mensagem de Boas-Vindas no WhatsApp */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs uppercase tracking-wider font-semibold text-purple-700">
                  Primeiro Contato
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    welcomeEnabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {welcomeEnabled ? 'Ativa' : 'Desativada'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Mensagem de Boas-Vindas no WhatsApp
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Enviada automaticamente quando um cliente manda mensagem pela primeira vez ou inicia uma nova conversa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={welcomeEnabled}
                onChange={(e) => setWelcomeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
            </label>
          </div>
        </div>

        {welcomeEnabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label htmlFor="welcomeText" className="text-xs font-bold text-slate-900">
                  Texto da Mensagem de Boas-Vindas
                </label>
                <span className="text-[11px] text-slate-400">
                  Personalize com as variáveis do seu salão e do cliente
                </span>
              </div>

              <textarea
                id="welcomeText"
                rows={4}
                value={welcomeCustom}
                onChange={(e) => setWelcomeCustom(e.target.value)}
                placeholder={`Olá{cliente}! Seja muito bem-vinda ao estúdio *${settings.name || '{salão}'}*!\n\nComo posso te ajudar hoje? Me conte qual procedimento você gostaria de agendar.`}
                className="w-full p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-sans leading-relaxed"
              />

              {/* Inserir variáveis */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Inserir variável:</span>
                <button
                  type="button"
                  onClick={() => setWelcomeCustom((prev) => (prev ? prev + ' {cliente}' : '{cliente}'))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono transition-colors cursor-pointer border border-slate-200/80"
                >
                  {'{cliente}'}
                </button>
                <button
                  type="button"
                  onClick={() => setWelcomeCustom((prev) => (prev ? prev + ' {salão}' : '{salão}'))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono transition-colors cursor-pointer border border-slate-200/80"
                >
                  {'{salão}'}
                </button>
                <button
                  type="button"
                  onClick={() => setWelcomeCustom((prev) => (prev ? prev + ' {link}' : '{link}'))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono transition-colors cursor-pointer border border-slate-200/80"
                >
                  {'{link}'}
                </button>
              </div>
            </div>

            {/* Preview da Mensagem como balão do WhatsApp */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Pré-visualização (como o cliente recebe no WhatsApp):
              </span>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
                {(welcomeCustom && welcomeCustom.trim())
                  ? welcomeCustom
                      .replace(/{cliente}|{nome_cliente}/gi, ' Maria')
                      .replace(/{salão}|{salao}|{nome_salao}/gi, settings.name || 'Seu Salão')
                      .replace(/{link}|{link_agendamento}/gi, `https://marquesuahora.com.br/${settings.slug || 'seu-link'}`)
                  : `Olá Maria! Seja muito bem-vindo(a) ao *${settings.name || 'Seu Estabelecimento'}*! É um prazer ter você por aqui.\n\nPara consultar nossos serviços, valores e agendar seu horário com praticidade pelo celular, acesse nosso link oficial:\n👉 https://marquesuahora.com.br/${settings.slug || 'seu-link'}\n\nSe tiver qualquer dúvida, pode nos chamar por aqui!`}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div>
                {saveWelcomeSuccess ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Mensagem de boas-vindas salva com sucesso!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Se o texto ficar em branco, será utilizado o modelo padrão acolhedor do sistema.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {welcomeCustom && welcomeCustom.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setWelcomeCustom('')}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Padrão</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={savingWelcome}
                  onClick={handleSaveWelcome}
                  className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary-tenant transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  {savingWelcome && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{savingWelcome ? 'Salvando...' : 'Salvar Mensagem de Boas-Vindas'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
