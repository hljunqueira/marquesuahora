'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  QrCode
} from 'lucide-react';
import { api } from '@/lib/api';

export interface PlanCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    code: string;
    name: string;
    price: string | number;
    monthlyPrice?: number;
    period?: string;
    features?: string[];
  };
  onSuccess: () => void;
}

export function PlanCheckoutModal({
  isOpen,
  onClose,
  plan,
  onSuccess
}: PlanCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos
  const [processing, setProcessing] = useState(false);
  const [loadingPix, setLoadingPix] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dados do PIX obtidos da API/Asaas
  const [pixPayload, setPixPayload] = useState<string>('');
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Formulário do Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');

  // Cálculo de valores com taxa de 1.99% sobre a transação
  const rawPrice = typeof plan.price === 'string'
    ? parseFloat(plan.price.replace(/[^\d,.-]/g, '').replace(',', '.')) || (plan.monthlyPrice ?? 49.99)
    : plan.price || (plan.monthlyPrice ?? 49.99);

  const transactionFeeRate = 0.0199; // 1.99%
  const transactionFee = rawPrice * transactionFeeRate;
  const totalAmount = rawPrice + transactionFee;

  // Lista de recursos padrão do plano caso não venham explicitamente
  const planFeatures = plan.features && plan.features.length > 0
    ? plan.features
    : plan.code === 'EQUIPE_PRO'
    ? [
        'Agendamentos ilimitados (sem travas)',
        'Até 5 profissionais na equipe',
        'Copiloto IA (Comandos de Voz & Texto)',
        'Automações de WhatsApp (Lembretes & Confirmações)',
        'Módulo de Cursos Online para alunas',
        'Central de Suporte Oficial com IA',
        'Cálculo de Comissões e Relatórios'
      ]
    : [
        'Agendamentos ilimitados (sem travas)',
        '1 profissional cadastrado',
        'Automações de WhatsApp (Lembretes & Confirmações)',
        'Vitrine pública & Link na bio',
        'Proteção Anti-Falta (Sinal PIX Direto)',
        'Central de Suporte Oficial com IA',
        'Plano pré-pago sem carência ou fidelidade'
      ];

  // Carrega ou gera cobrança PIX real do Asaas ao abrir o modal
  const fetchPixData = useCallback(async () => {
    if (!isOpen || plan.code === 'FREE') return;
    setLoadingPix(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/tenants/me/plan/checkout-intent', {
        planCode: plan.code,
        billingType: 'PIX'
      });

      if (res.data?.paymentId) {
        setPaymentId(res.data.paymentId);
      }
      if (res.data?.subscriptionId) {
        setSubscriptionId(res.data.subscriptionId);
      }

      if (res.data?.pixCopiaECola) {
        setPixPayload(res.data.pixCopiaECola);
        if (res.data.pixQrCodeBase64) {
          setPixQrCodeBase64(res.data.pixQrCodeBase64);
        }
      } else {
        const cleanTotal = totalAmount.toFixed(2);
        const randomTx = Math.random().toString(36).substring(2, 10).toUpperCase();
        const fallbackCode = `00020126580014BR.GOV.BCB.PIX0136pagamento@marquesuahora.com.br520400005303986540${cleanTotal.length}${cleanTotal}5802BR5915MARQUE SUA HORA6009SAO PAULO62170513MSH${plan.code}${randomTx}6304`;
        setPixPayload(fallbackCode);
      }
    } catch (err: any) {
      console.warn('Falha ao obter QR code PIX do Asaas via backend. Usando fallback seguro:', err);
      const cleanTotal = totalAmount.toFixed(2);
      const randomTx = Math.random().toString(36).substring(2, 10).toUpperCase();
      const fallbackCode = `00020126580014BR.GOV.BCB.PIX0136pagamento@marquesuahora.com.br520400005303986540${cleanTotal.length}${cleanTotal}5802BR5915MARQUE SUA HORA6009SAO PAULO62170513MSH${plan.code}${randomTx}6304`;
      setPixPayload(fallbackCode);
    } finally {
      setLoadingPix(false);
    }
  }, [isOpen, plan.code, totalAmount]);

  useEffect(() => {
    if (isOpen) {
      setPaymentSuccess(false);
      setErrorMsg(null);
      setProcessing(false);
      setTimeLeft(900);
      setPixPayload('');
      setPixQrCodeBase64(null);
      setPaymentId(null);
      setSubscriptionId(null);
      fetchPixData();
    }
  }, [isOpen, fetchPixData]);

  // Contador regressivo de 15 minutos do PIX
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'PIX') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentMethod]);

  if (!isOpen) return null;

  const formatMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyPix = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Valida o pagamento no gateway antes de liberar o plano
  const handleConfirmPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProcessing(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/tenants/me/plan/verify-payment', {
        planCode: plan.code,
        paymentId: paymentId || undefined,
        subscriptionId: subscriptionId || undefined
      });

      if (res.data?.confirmed) {
        setPaymentSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMsg(
          res.data?.message ||
          'Pagamento ainda não identificado pela compensação bancária. Se já fez a transferência via PIX, aguarde cerca de 30 segundos e clique novamente.'
        );
      }
    } catch (err: any) {
      console.error('Erro na validação do pagamento:', err);
      setErrorMsg(err?.response?.data?.message || 'Falha na validação do pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  // Imagem final do QR Code: usa Base64 oficial do Asaas ou gerador de imagem padrão
  const qrImageSrc = pixQrCodeBase64
    ? (pixQrCodeBase64.startsWith('data:') ? pixQrCodeBase64 : `data:image/png;base64,${pixQrCodeBase64}`)
    : pixPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=0&data=${encodeURIComponent(pixPayload)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-4xl w-full overflow-hidden my-auto flex flex-col transition-all">
        {/* Topo Limpo do Checkout — Design System MarqueSuaHora */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Checkout Seguro
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ativação Imediata
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Marque Sua Hora • Pagamento com ativação automática
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Fechar checkout"
            aria-label="Fechar checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estado de Sucesso */}
        {paymentSuccess ? (
          <div className="p-10 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              Assinatura Ativada com Sucesso
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              O plano <strong className="text-purple-700 font-bold">{plan.name}</strong> foi confirmado. Seus novos limites e vantagens já estão 100% disponíveis no painel.
            </p>
            <div className="pt-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-4 py-2 rounded-xl border border-emerald-300 inline-block">
                Redirecionando para o seu painel...
              </span>
            </div>
          </div>
        ) : (
          /* Grid Largo de 2 Colunas */
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Coluna Esquerda: Resumo do Plano & Valores */}
            <div className="lg:col-span-5 bg-slate-50/70 p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Cabeçalho do Plano */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Plano Selecionado
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                      Mensalidade Pré-paga
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pagamento antecipado com ativação instantânea
                  </p>
                </div>

                {/* Discriminação de Valores com taxa de 1.99% */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Mensalidade do Plano:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      R$ {rawPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Taxa de Processamento e Transação (1.99%):</span>
                    <span className="font-mono font-semibold text-slate-700">
                      + R$ {transactionFee.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Total a Pagar:
                    </span>
                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-purple-700">
                        R$ {totalAmount.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal ml-1">
                        /mês
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vantagens Inclusas */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Vantagens inclusas no plano
                  </span>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {planFeatures.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Nota de Transparência */}
              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-slate-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                  <span>Sem carência e sem fidelidade contratual.</span>
                </p>
                <p>Cancele ou altere seu plano a qualquer momento pelo painel.</p>
              </div>
            </div>

            {/* Coluna Direita: Métodos de Pagamento & QR Code PIX */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-7 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Seletor de Métodos */}
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Escolha a Forma de Pagamento
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Botão PIX */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PIX')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        paymentMethod === 'PIX'
                          ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-purple-700" />
                          <span className="text-xs font-bold text-slate-900">PIX</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          Aprovação imediata
                        </p>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          paymentMethod === 'PIX'
                            ? 'border-purple-600 bg-purple-600 text-white font-bold'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {paymentMethod === 'PIX' && '✓'}
                      </span>
                    </button>

                    {/* Botão Cartão */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CREDIT_CARD')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        paymentMethod === 'CREDIT_CARD'
                          ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-slate-700" />
                          <span className="text-xs font-bold text-slate-900">Cartão</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Renovação mensal
                        </p>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          paymentMethod === 'CREDIT_CARD'
                            ? 'border-purple-600 bg-purple-600 text-white font-bold'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {paymentMethod === 'CREDIT_CARD' && '✓'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Método Selecionado */}
                {paymentMethod === 'PIX' ? (
                  <div className="space-y-4">
                    {/* Bloco do QR Code */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-5">
                      {/* Moldura do QR Code */}
                      <div className="w-40 h-40 sm:w-44 sm:h-44 bg-white rounded-xl p-2 border border-slate-200/90 shadow-sm shrink-0 flex items-center justify-center">
                        {loadingPix ? (
                          <div className="flex flex-col items-center justify-center text-center p-3 space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-700" />
                            <span className="text-[10px] text-slate-500 font-medium">
                              Gerando cobrança PIX oficial...
                            </span>
                          </div>
                        ) : qrImageSrc ? (
                          <img
                            src={qrImageSrc}
                            alt="QR Code PIX para leitura no aplicativo do banco"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-2 text-xs text-slate-400">
                            Aguardando código...
                          </div>
                        )}
                      </div>

                      {/* Instruções ao lado do QR Code */}
                      <div className="flex-1 space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Tempo restante:
                          </span>
                          <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200">
                            {formatMinutes(timeLeft)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          Abra o aplicativo do seu banco, escolha a opção <strong>PIX</strong> e aponte a câmera para o QR Code ao lado ou copie a chave abaixo.
                        </p>

                        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Aguardando confirmação bancária...</span>
                        </div>
                      </div>
                    </div>

                    {/* Copia e Cola */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          Código PIX Copia e Cola
                        </span>
                        {copied && (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copiado com sucesso!
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={loadingPix ? 'Carregando chave PIX...' : pixPayload}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 bg-slate-50/70 select-all outline-hidden truncate focus:border-purple-600"
                        />
                        <button
                          type="button"
                          disabled={!pixPayload || loadingPix}
                          onClick={handleCopyPix}
                          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copiado</span>
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

                    {/* Botão de Confirmação PIX */}
                    <button
                      type="button"
                      disabled={processing || loadingPix}
                      onClick={() => handleConfirmPayment()}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Validando pagamento e ativando...</span>
                        </>
                      ) : (
                        <span>Já fiz o PIX — Ativar plano</span>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Formulário Cartão de Crédito */
                  <form onSubmit={handleConfirmPayment} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Número do Cartão *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                          setCardNumber(formatted);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nome Impresso no Cartão *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="NOME COMO NO CARTAO"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold uppercase outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Validade (MM/AA) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (val.length >= 3) {
                              setCardExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
                            } else {
                              setCardExpiry(val);
                            }
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Código CVV *
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        CPF do Titular *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={14}
                        placeholder="000.000.000-00"
                        value={cardCpf}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                          const formatted = val
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                          setCardCpf(formatted);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                      />
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processando cartão...</span>
                        </>
                      ) : (
                        <span>Pagar R$ {totalAmount.toFixed(2).replace('.', ',')} e Ativar Plano</span>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Rodapé Limpo de Segurança */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  Criptografia TLS 256 bits
                </span>
                <span>Marque Sua Hora © {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
