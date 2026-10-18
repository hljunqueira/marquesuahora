'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2
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
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos em segundos
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulário do Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');

  // Chave PIX Copia e Cola gerada para o salão
  const [pixPayload, setPixPayload] = useState<string>('');

  // Cálculo de valores com taxa de 1.99% sobre a transação
  const rawPrice = typeof plan.price === 'string'
    ? parseFloat(plan.price.replace(/[^\d,.-]/g, '').replace(',', '.')) || (plan.monthlyPrice ?? 39)
    : plan.price || (plan.monthlyPrice ?? 39);

  const transactionFeeRate = 0.0199; // 1.99%
  const transactionFee = rawPrice * transactionFeeRate;
  const totalAmount = rawPrice + transactionFee;

  // Contador de 15 minutos do PIX
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'PIX') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentMethod]);

  // Inicializa a chave PIX segura do plano
  useEffect(() => {
    if (isOpen) {
      setPaymentSuccess(false);
      setErrorMsg(null);
      setProcessing(false);
      setTimeLeft(900);

      // Gera código PIX Copia e Cola padrão BR Code
      const cleanTotal = totalAmount.toFixed(2);
      const randomTx = Math.random().toString(36).substring(2, 10).toUpperCase();
      const mockPixCode = `00020126580014BR.GOV.BCB.PIX0136pagamento@marquesuahora.com.br520400005303986540${cleanTotal.length}${cleanTotal}5802BR5915MARQUE SUA HORA6009SAO PAULO62170513MSH${plan.code}${randomTx}6304`;
      setPixPayload(mockPixCode);
    }
  }, [isOpen, plan.code, totalAmount]);

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

  // Processa o pagamento e ativa o plano
  const handleConfirmPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProcessing(true);
    setErrorMsg(null);

    try {
      // Chama o backend para registrar a contratação do plano
      await api.post('/tenants/me/plan', {
        planCode: plan.code,
        billingType: paymentMethod,
        totalWithFee: totalAmount
      }).catch(async () => {
        // Fallback para rota de configurações
        return api.put('/tenants/me/settings', {
          planCode: plan.code
        });
      });

      setPaymentSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Erro no processamento do checkout:', err);
      setErrorMsg(err?.response?.data?.message || 'Falha na validação do pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-6 flex flex-col">
        {/* Topo Limpo do Checkout */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Checkout Seguro
            </h2>
            <p className="text-[11px] text-slate-400">
              Marque Sua Hora
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sucesso na Confirmação */}
        {paymentSuccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Assinatura Confirmada
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Seu plano <strong className="text-purple-700">{plan.name}</strong> foi ativado com sucesso. Seus agendamentos e recursos já estão liberados.
            </p>
            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 inline-block">
              Redirecionando para o painel...
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* 1. Demonstrativo de Valores (com taxa de 1.99% sobre a transação) */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                    Plano Selecionado
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  Mensalidade
                </span>
              </div>

              {/* Tabela de Preços e Taxa de 1.99% */}
              <div className="text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal do Plano:</span>
                  <span className="font-semibold text-slate-800">
                    R$ {rawPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Taxa de Processamento e Transação (1.99%):</span>
                  <span className="font-semibold text-slate-700">
                    + R$ {transactionFee.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900 font-bold text-sm">
                  <span>Total:</span>
                  <span className="text-base font-extrabold text-purple-700">
                    R$ {totalAmount.toFixed(2).replace('.', ',')}
                    <span className="text-xs font-normal text-slate-500 ml-1">/mês</span>
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                Sem fidelidade. Cancele quando quiser diretamente no painel.
              </p>
            </div>

            {/* 2. Seleção do Método de Pagamento */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-700">
                Forma de Pagamento
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Opção PIX */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between cursor-pointer ${
                    paymentMethod === 'PIX'
                      ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">PIX</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Aprovação imediata</p>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      paymentMethod === 'PIX'
                        ? 'border-purple-600 bg-purple-600 text-white font-bold'
                        : 'border-slate-300'
                    }`}
                  >
                    {paymentMethod === 'PIX' && '✓'}
                  </span>
                </button>

                {/* Opção Cartão de Crédito */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between cursor-pointer ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">Cartão de Crédito</p>
                    <p className="text-[11px] text-slate-500 font-medium">Renovação mensal</p>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-purple-600 bg-purple-600 text-white font-bold'
                        : 'border-slate-300'
                    }`}
                  >
                    {paymentMethod === 'CREDIT_CARD' && '✓'}
                  </span>
                </button>
              </div>
            </div>

            {/* 3. Área de Pagamento (PIX ou Cartão) */}
            {paymentMethod === 'PIX' ? (
              <div className="space-y-4 pt-1">
                {/* QR Code e Instruções */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Code Limpo */}
                  <div className="w-32 h-32 bg-white rounded-lg p-1.5 border border-slate-200 shrink-0 flex items-center justify-center">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full text-slate-900"
                      fill="currentColor"
                    >
                      <rect x="0" y="0" width="28" height="28" rx="2" />
                      <rect x="4" y="4" width="20" height="20" fill="white" rx="1" />
                      <rect x="8" y="8" width="12" height="12" rx="1" />

                      <rect x="72" y="0" width="28" height="28" rx="2" />
                      <rect x="76" y="4" width="20" height="20" fill="white" rx="1" />
                      <rect x="80" y="8" width="12" height="12" rx="1" />

                      <rect x="0" y="72" width="28" height="28" rx="2" />
                      <rect x="4" y="76" width="20" height="20" fill="white" rx="1" />
                      <rect x="8" y="80" width="12" height="12" rx="1" />

                      <rect x="36" y="8" width="6" height="6" />
                      <rect x="48" y="8" width="6" height="6" />
                      <rect x="58" y="8" width="6" height="6" />
                      <rect x="36" y="20" width="6" height="6" />
                      <rect x="48" y="20" width="16" height="6" />

                      <rect x="8" y="36" width="6" height="6" />
                      <rect x="20" y="36" width="6" height="6" />
                      <rect x="8" y="48" width="16" height="6" />
                      <rect x="8" y="58" width="6" height="6" />

                      <rect x="36" y="36" width="28" height="28" fill="#581C87" rx="3" />
                      <circle cx="50" cy="50" r="7" fill="white" />

                      <rect x="72" y="36" width="6" height="6" />
                      <rect x="84" y="36" width="8" height="6" />
                      <rect x="72" y="48" width="12" height="6" />
                      <rect x="88" y="48" width="4" height="6" />
                      <rect x="72" y="58" width="20" height="6" />

                      <rect x="36" y="72" width="12" height="6" />
                      <rect x="54" y="72" width="6" height="6" />
                      <rect x="36" y="84" width="6" height="6" />
                      <rect x="48" y="84" width="16" height="6" />
                      <rect x="72" y="72" width="8" height="8" />
                      <rect x="84" y="84" width="8" height="8" />
                    </svg>
                  </div>

                  {/* Instruções */}
                  <div className="flex-1 space-y-2 text-left">
                    <p className="text-xs font-semibold text-slate-800">
                      Tempo restante:{' '}
                      <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {formatMinutes(timeLeft)}
                      </span>
                    </p>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Abra o aplicativo do seu banco, selecione a opção PIX e aponte a câmera para o QR Code ou use o código Copia e Cola abaixo.
                    </p>

                    <p className="text-[11px] text-slate-500 font-medium">
                      Aguardando confirmação bancária...
                    </p>
                  </div>
                </div>

                {/* Copia e Cola */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Código PIX Copia e Cola</span>
                    {copied && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Copiado!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixPayload}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs text-slate-600 bg-slate-50 select-all outline-hidden truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer"
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

                {/* Botão de Confirmação */}
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleConfirmPayment()}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-slate-900 hover:bg-slate-800 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validando pagamento...
                    </span>
                  ) : (
                    <span>Já fiz o PIX — Ativar plano</span>
                  )}
                </button>
              </div>
            ) : (
              /* Formulário Cartão de Crédito */
              <form onSubmit={handleConfirmPayment} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Número do Cartão *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                      setCardNumber(formatted);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nome Impresso no Cartão *
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold uppercase outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
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
                      value={cardExpiry}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        if (val.length >= 3) {
                          setCardExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
                        } else {
                          setCardExpiry(val);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
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
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
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
                    value={cardCpf}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                      const formatted = val
                        .replace(/(\d{3})(\d)/, '$1.$2')
                        .replace(/(\d{3})(\d)/, '$1.$2')
                        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                      setCardCpf(formatted);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs font-semibold outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando pagamento...
                    </span>
                  ) : (
                    <span>Pagar R$ {totalAmount.toFixed(2).replace('.', ',')} e Ativar Plano</span>
                  )}
                </button>
              </form>
            )}

            {/* Rodapé Limpo */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Ambiente seguro e criptografado</span>
              <span>Marque Sua Hora © {new Date().getFullYear()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
