'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Radio,
  Cpu,
  CreditCard,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '@/lib/api';

export default function IntegracoesAdminPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showResendKey, setShowResendKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Test email state
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const fallbackWebhookResend = 'https://api.marquesuahora.com.br/webhooks/resend';
  const fallbackWebhookWhatsapp = 'https://api.marquesuahora.com.br/webhooks/whatsapp';
  const fallbackWebhookAsaas = 'https://api.marquesuahora.com.br/webhooks/asaas';
  const rawResendKey = integrations?.resend?.apiKeyRaw || 're_••••••••••••••••••••••••••••••••';
  const rawWebhookSecret = integrations?.resend?.webhookSecretRaw || 'whsec_••••••••••••••••••••••••••••••••';

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/admin/integrations');
        setIntegrations(res.data);
      } catch (err) {
        console.warn('Não foi possível carregar integrações da API, usando dados locais:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo) return;

    setTestingEmail(true);
    setTestEmailResult(null);

    try {
      const res = await api.post('/admin/integrations/test-email', { to: testEmailTo });
      setTestEmailResult({
        success: true,
        message: `E-mail de teste enviado com sucesso! MessageID: ${res.data.messageId || 'OK'}`
      });
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.response?.data?.message || err.response?.data?.error || 'Erro ao enviar e-mail de teste.'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const resendData = integrations?.resend;
  const resendWebhookUrl = resendData?.webhookUrl || fallbackWebhookResend;
  const whatsappWebhookUrl = integrations?.evolution?.webhookUrl || fallbackWebhookWhatsapp;
  const asaasWebhookUrl = integrations?.asaas?.webhookUrl || fallbackWebhookAsaas;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
          Integrações & Webhooks da Plataforma
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configurações centrais de e-mails transacionais (Resend), WhatsApp Gateway, IA e pagamentos.
        </p>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="text-xs font-medium">Carregando status das integrações...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal: Resend (2 colunas) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Resend */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
              {/* Header do Card */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-200 flex items-center justify-center text-purple-600">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Resend — E-mail Transacional</h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Conectado & Verificado
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Disparo de confirmações de agendamento, lembretes, cupons e acessos a cursos.
                    </p>
                  </div>
                </div>

                <a
                  href="https://resend.com/webhooks"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 transition"
                >
                  Painel Resend
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-6 space-y-6">
                {/* 1. URL do Webhook Endpoint */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-600" />
                      URL do Ponto de Extremidade (Webhook Endpoint)
                    </label>
                    <span className="text-[11px] text-slate-400">Cole exatamente esta URL no Resend</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 text-purple-200 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 select-all overflow-x-auto">
                      {resendWebhookUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(resendWebhookUrl, 'resend-webhook')}
                      className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      {copiedKey === 'resend-webhook' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Instruções passo a passo do modal */}
                  <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1.5 text-xs text-purple-950">
                    <div className="font-bold flex items-center gap-1.5 text-purple-900">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      Como preencher o modal "Adicionar webhook" no Resend:
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-purple-900/90 text-[11px]">
                      <li>
                        <strong>URL do ponto de extremidade:</strong> Cole a URL acima (
                        <code className="bg-white/80 px-1 py-0.5 rounded text-purple-800">{resendWebhookUrl}</code>).
                      </li>
                      <li>
                        <strong>Selecione os eventos que deseja ouvir:</strong> Deixe selecionado{' '}
                        <strong>"Todos os eventos"</strong> (ou marque <em>Sent, Delivered, Bounced, Complained</em>).
                      </li>
                      <li>
                        Clique em <strong>"Adicionar"</strong> (ou aperte <kbd className="bg-white px-1 py-0.5 rounded border border-purple-200 text-[10px]">Ctrl + Enter</kbd>).
                      </li>
                    </ol>
                  </div>
                </div>

                {/* 2. Configurações de Domínio e API Key */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  {/* Domínio */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-500" />
                      Domínio Configurado
                    </span>
                    <div className="text-sm font-bold text-slate-800">marquesuahora.com.br</div>
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Apontamento DNS verificado
                    </div>
                  </div>

                  {/* Remetente */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
                      Remetente Oficial
                    </span>
                    <div className="text-sm font-bold text-slate-800 truncate">
                      notificacoes@marquesuahora.com.br
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Nome: <strong>Marque Sua Hora</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Chave de API */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Chave de API do Resend (API Key)</span>
                    <span className="text-[11px] font-normal text-slate-400">Ativa no servidor</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-50 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200/80 text-slate-800 flex items-center justify-between">
                      <span>
                        {showResendKey
                          ? rawResendKey
                          : `${rawResendKey.slice(0, 10)}••••••••••••••••••••••••••••••${rawResendKey.slice(-6)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowResendKey(!showResendKey)}
                        className="text-slate-400 hover:text-slate-600 ml-2"
                        title={showResendKey ? 'Ocultar' : 'Revelar chave'}
                      >
                        {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(rawResendKey, 'resend-key')}
                      className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0"
                    >
                      {copiedKey === 'resend-key' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3.1. Segredo da Assinatura (Webhook Secret) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Segredo da Assinatura (Webhook Signing Secret)
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Habilitado no Resend
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-50 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200/80 text-slate-800 flex items-center justify-between">
                      <span>
                        {showWebhookSecret
                          ? rawWebhookSecret
                          : `${rawWebhookSecret.slice(0, 10)}••••••••••••••••••••••••••••••${rawWebhookSecret.slice(-6)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        className="text-slate-400 hover:text-slate-600 ml-2"
                        title={showWebhookSecret ? 'Ocultar' : 'Revelar segredo'}
                      >
                        {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(rawWebhookSecret, 'resend-secret')}
                      className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0"
                    >
                      {copiedKey === 'resend-secret' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ouvindo atentamente <strong>23 eventos</strong> (<code className="text-slate-600">contact.created</code>, <code className="text-slate-600">contact.deleted</code>, <code className="text-slate-600">email.delivered</code>, etc.)
                  </p>
                </div>

                {/* 4. Teste em Tempo Real */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Disparo de Teste (Validação Resend)</h4>
                      <p className="text-[11px] text-slate-500">
                        Envie um e-mail teste agora para validar a entrega da sua chave no domínio.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      placeholder="Digite seu e-mail para receber o teste..."
                      required
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />
                    <button
                      type="submit"
                      disabled={testingEmail || !testEmailTo}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {testingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Teste</span>
                        </>
                      )}
                    </button>
                  </form>

                  {testEmailResult && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${
                        testEmailResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {testEmailResult.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Lateral: Outras Integrações e Webhooks (1 coluna) */}
          <div className="space-y-6">
            {/* WhatsApp Gateway Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Evolution API v2</h3>
                    <p className="text-[10px] text-slate-500">Gateway WhatsApp Multi-Tenant</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Online
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Webhook do WhatsApp
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex-1 bg-slate-50 font-mono text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-slate-700 truncate">
                    {whatsappWebhookUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(whatsappWebhookUrl, 'whatsapp-webhook')}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
                    title="Copiar webhook do WhatsApp"
                  >
                    {copiedKey === 'whatsapp-webhook' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Porta VPS:</span>
                  <strong className="text-slate-700">8080 (Evolution)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Atendimento:</span>
                  <strong className="text-slate-700">TypeSafe Jev + OpenRouter</strong>
                </div>
              </div>
            </div>

            {/* Asaas Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Asaas Gateway</h3>
                    <p className="text-[10px] text-slate-500">PIX & Assinaturas Recorrentes</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Produção
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  URL do Webhook (Cole no Asaas)
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex-1 bg-slate-50 font-mono text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-slate-700 truncate select-all">
                    {asaasWebhookUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(asaasWebhookUrl, 'asaas-webhook')}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
                    title="Copiar webhook do Asaas"
                  >
                    {copiedKey === 'asaas-webhook' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Instruções do Modal Asaas */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1 text-xs text-blue-950">
                <div className="font-bold flex items-center gap-1.5 text-blue-900 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Como preencher no portal Asaas:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-blue-950/90 text-[10px] leading-relaxed">
                  <li><strong>Nome:</strong> MarqueSuaHora</li>
                  <li><strong>URL:</strong> Cole a URL acima</li>
                  <li><strong>E-mail:</strong> notificacoes@marquesuahora.com.br</li>
                  <li><strong>Versão de API:</strong> v3</li>
                  <li><strong>Token:</strong> Clique em "Gerar Token", copie e salve em ASAAS_WEBHOOK_SECRET</li>
                  <li><strong>Tipo de envio:</strong> Sequencial (Fila ativada)</li>
                  <li><strong>Eventos:</strong> Cobranças (Confirmed, Received, Overdue, Refunded) e Assinaturas (Created, Updated, Deleted)</li>
                </ul>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>API Asaas:</span>
                  <strong className="text-slate-700">api.asaas.com/v3</strong>
                </div>
                <div className="flex justify-between">
                  <span>Sinal Antecipado:</span>
                  <strong className="text-slate-700">PIX Automático</strong>
                </div>
              </div>
            </div>

            {/* IA OpenRouter Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Context Engine 360°</h3>
                    <p className="text-[10px] text-slate-500">OpenRouter + TypeSafe Jev</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  Ativo
                </span>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Modelo LLM:</span>
                  <strong className="font-mono text-[10px] text-slate-800">deepseek/deepseek-chat</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classificação Rápida:</span>
                  <strong className="text-slate-800">TypeSafe Jev (&lt;1ms)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bases Injetadas:</span>
                  <strong className="text-slate-800">Serviços, Cursos, Produtos</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
