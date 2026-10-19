'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  DollarSign,
  Package,
  Scissors,
  User,
  CreditCard,
  QrCode,
  Banknote,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { ScheduleAppointment } from './types';

interface AppointmentCheckoutModalProps {
  appointment: ScheduleAppointment;
  onClose: () => void;
  onSuccess: () => void;
}

interface CheckoutItem {
  id: string; // id temporário local para react key
  type: 'SERVICE' | 'PRODUCT';
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  professionalId?: string | null;
}

interface PaymentRow {
  id: string;
  method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CREDIT_ACCOUNT';
  amount: number | string;
  dueDate?: string;
}

interface AvailableService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

interface AvailableProduct {
  id: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
}

export function AppointmentCheckoutModal({
  appointment,
  onClose,
  onSuccess
}: AppointmentCheckoutModalProps) {
  // 1. Dados do estabelecimento e catálogo
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([]);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // 2. Itens da comanda
  const initialBasePrice = Number(appointment.totalPrice || appointment.service?.price || 0);
  const [items, setItems] = useState<CheckoutItem[]>([
    {
      id: 'base-service',
      type: 'SERVICE',
      itemId: appointment.serviceId,
      name: appointment.service?.name || 'Serviço Principal',
      quantity: 1,
      unitPrice: initialBasePrice,
      professionalId: appointment.professionalId
    }
  ]);

  // Seletor de novos itens
  const [addingType, setAddingType] = useState<'NONE' | 'SERVICE' | 'PRODUCT'>('NONE');
  const [selectedAddId, setSelectedAddId] = useState('');

  // 3. Desconto e observações
  const [discountInput, setDiscountInput] = useState('');
  const [notes, setNotes] = useState(appointment.notes || '');

  // 4. Sinal antecipado
  const depositPaid = appointment.depositPaid ? Number(appointment.depositAmount || 0) : 0;

  // 5. Cálculos financeiros
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const clean = discountInput.replace(/[^\d.,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.min(val, subtotal);
  }, [discountInput, subtotal]);

  const balanceToPay = useMemo(() => {
    return Math.max(0, subtotal - discountAmount - depositPaid);
  }, [subtotal, discountAmount, depositPaid]);

  // 6. Pagamentos (Split Payment)
  const [payments, setPayments] = useState<PaymentRow[]>([
    {
      id: 'pay-1',
      method: 'PIX',
      amount: balanceToPay > 0 ? balanceToPay.toFixed(2) : '0.00'
    }
  ]);

  // Atualiza primeiro pagamento se o saldo mudar e houver só 1 pagamento
  useEffect(() => {
    if (payments.length === 1 && payments[0].amount !== balanceToPay.toFixed(2)) {
      setPayments([
        {
          ...payments[0],
          amount: balanceToPay.toFixed(2)
        }
      ]);
    }
  }, [balanceToPay]);

  // Total coberto pelos pagamentos
  const totalPaidInCheckout = useMemo(() => {
    return payments.reduce((acc, p) => {
      const val = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(',', '.'));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [payments]);

  const remainingBalance = useMemo(() => {
    return balanceToPay - totalPaidInCheckout;
  }, [balanceToPay, totalPaidInCheckout]);

  // Estados de envio e validação
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carrega catálogo de serviços e produtos
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        const [servicesRes, productsRes] = await Promise.all([
          api.get('/services').catch(() => ({ data: [] })),
          api.get('/products').catch(() => ({ data: [] }))
        ]);
        if (isMounted) {
          setAvailableServices(servicesRes.data || []);
          setAvailableProducts(
            (productsRes.data || []).filter((p: AvailableProduct) => p.stockQuantity > 0)
          );
        }
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Formatação em Real brasileiro
  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Manipulação de itens
  const handleAddItem = () => {
    if (!selectedAddId) return;

    if (addingType === 'SERVICE') {
      const s = availableServices.find((item) => item.id === selectedAddId);
      if (s) {
        setItems((prev) => [
          ...prev,
          {
            id: `srv-${Date.now()}`,
            type: 'SERVICE',
            itemId: s.id,
            name: s.name,
            quantity: 1,
            unitPrice: Number(s.price || 0),
            professionalId: appointment.professionalId
          }
        ]);
      }
    } else if (addingType === 'PRODUCT') {
      const p = availableProducts.find((item) => item.id === selectedAddId);
      if (p) {
        setItems((prev) => [
          ...prev,
          {
            id: `prd-${Date.now()}`,
            type: 'PRODUCT',
            itemId: p.id,
            name: p.name,
            quantity: 1,
            unitPrice: Number(p.salePrice || 0)
          }
        ]);
      }
    }

    setAddingType('NONE');
    setSelectedAddId('');
  };

  const handleUpdateItemQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const nextQty = it.quantity + delta;
            return nextQty > 0 ? { ...it, quantity: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CheckoutItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Manipulação de formas de pagamento
  const handleAddPaymentRow = () => {
    const leftToPay = Math.max(0, remainingBalance);
    setPayments((prev) => [
      ...prev,
      {
        id: `pay-${Date.now()}`,
        method: 'CREDIT_CARD',
        amount: leftToPay > 0 ? leftToPay.toFixed(2) : '0.00'
      }
    ]);
  };

  const handleUpdatePayment = (id: string, patch: Partial<PaymentRow>) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleRemovePaymentRow = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const handleFillRemaining = (id: string) => {
    const currentRow = payments.find((p) => p.id === id);
    const currentAmount = currentRow
      ? typeof currentRow.amount === 'number'
        ? currentRow.amount
        : parseFloat(String(currentRow.amount).replace(',', '.')) || 0
      : 0;

    const newTarget = Math.max(0, currentAmount + remainingBalance);
    handleUpdatePayment(id, { amount: newTarget.toFixed(2) });
  };

  // Envio final do fechamento
  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('A comanda deve conter pelo menos um item.');
      return;
    }

    // Se houver saldo a pagar, valida pagamentos
    if (balanceToPay > 0.05) {
      if (Math.abs(remainingBalance) > 0.05) {
        setErrorMessage(
          `O total dos pagamentos deve ser exatamente igual ao saldo a pagar (${formatMoney(
            balanceToPay
          )}). Faltam cobrir ${formatMoney(Math.abs(remainingBalance))}.`
        );
        return;
      }
    }

    // Valida crediário se houver
    const invalidCredit = payments.find(
      (p) => p.method === 'CREDIT_ACCOUNT' && (!p.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate))
    );
    if (invalidCredit) {
      setErrorMessage('Informe a data de vencimento válida (AAAA-MM-DD) para pagamento via Crediário.');
      return;
    }

    const payload = {
      items: items.map((it) => ({
        type: it.type,
        itemId: it.itemId,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        professionalId: it.professionalId || null
      })),
      payments:
        balanceToPay > 0.05
          ? payments.map((p) => ({
              method: p.method,
              amount:
                typeof p.amount === 'number'
                  ? p.amount
                  : parseFloat(String(p.amount).replace(',', '.')) || 0,
              dueDate: p.dueDate || undefined
            }))
          : [],
      discountAmount,
      notes: notes.trim() || null
    };

    try {
      setIsSubmitting(true);
      await api.post(`/schedules/${appointment.id}/checkout`, payload);
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Não foi possível finalizar o fechamento da comanda.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-tenant-light text-tenant-primary">
                Fechamento de Atendimento
              </span>
              <span className="text-xs text-slate-500">
                #{appointment.id.slice(0, 8)}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Comanda & Checkout Balcão
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Cliente e Profissional */}
        <div className="px-6 py-3 bg-slate-50/40 border-b border-slate-100 grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">{appointment.client?.name}</p>
              <p className="text-slate-500">{appointment.client?.phone || 'Sem telefone'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">{appointment.professional?.name}</p>
              <p className="text-slate-500">
                {appointment.date} às {appointment.startTime}
              </p>
            </div>
          </div>
        </div>

        {/* Banner de Sinal Antecipado Quitado (se houver) */}
        {depositPaid > 0 && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Sinal PIX Antecipado:</strong> Pago na confirmação do agendamento.
              </span>
            </div>
            <span className="font-bold text-emerald-700 bg-white px-2 py-1 rounded-md border border-emerald-200">
              - {formatMoney(depositPaid)}
            </span>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Alerta de Erro */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. SEÇÃO DE ITENS DA COMANDA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Itens Consumidos (Serviços & Produtos)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAddingType(addingType === 'SERVICE' ? 'NONE' : 'SERVICE')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-slate-500" />
                  + Serviço Extra
                </button>
                <button
                  type="button"
                  onClick={() => setAddingType(addingType === 'PRODUCT' ? 'NONE' : 'PRODUCT')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  + Produto / Home Care
                </button>
              </div>
            </div>

            {/* Sub-painel para Adicionar Item Extra */}
            {addingType !== 'NONE' && (
              <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 animate-in fade-in duration-150">
                <div className="flex-1">
                  <select
                    value={selectedAddId}
                    onChange={(e) => setSelectedAddId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {addingType === 'SERVICE'
                        ? '-- Selecione o serviço extra --'
                        : '-- Selecione o produto de balcão --'}
                    </option>
                    {addingType === 'SERVICE'
                      ? availableServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {formatMoney(Number(s.price || 0))} ({s.durationMinutes} min)
                          </option>
                        ))
                      : availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {formatMoney(Number(p.salePrice || 0))} (Estoque: {p.stockQuantity})
                          </option>
                        ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedAddId}
                  className="px-3 py-1.5 rounded-lg btn-primary-tenant disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingType('NONE');
                    setSelectedAddId('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Lista de Itens */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
              {items.map((it) => (
                <div key={it.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    {it.type === 'SERVICE' ? (
                      <span className="p-1.5 rounded-md bg-tenant-light text-tenant-primary">
                        <Scissors className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-md bg-purple-50 text-purple-700">
                        <Package className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">{it.name}</p>
                      <p className="text-slate-400">
                        {it.type === 'SERVICE' ? 'Serviço prestado' : 'Produto / Cosmético'} • {formatMoney(it.unitPrice)} un.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Controle de Quantidade */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(it.id, -1)}
                        className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer font-bold"
                      >
                        -
                      </button>
                      <span className="px-2 py-0.5 text-slate-800 font-semibold text-center min-w-[24px]">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(it.id, 1)}
                        className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <p className="font-bold text-slate-800">
                        {formatMoney(it.unitPrice * it.quantity)}
                      </p>
                    </div>

                    {/* Remover Item (não permite excluir o único item base) */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. DESCONTO & TOTAIS */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Desconto Aplicado (R$)
              </label>
              <input
                type="text"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="R$ 0,00"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Abatimento direto no total da comanda
              </p>
            </div>

            <div className="space-y-1.5 text-right flex flex-col justify-center">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal Itens:</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>(-) Desconto:</span>
                  <span>- {formatMoney(discountAmount)}</span>
                </div>
              )}
              {depositPaid > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>(-) Sinal PIX Pago:</span>
                  <span>- {formatMoney(depositPaid)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-1.5 border-t border-slate-200">
                <span>Saldo a Pagar:</span>
                <span className="text-tenant-primary">{formatMoney(balanceToPay)}</span>
              </div>
            </div>
          </div>

          {/* 3. FORMAS DE PAGAMENTO & SPLIT PAYMENT */}
          {balanceToPay > 0.05 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recebimento do Saldo (Split de Pagamento)
                </label>
                <button
                  type="button"
                  onClick={handleAddPaymentRow}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  Dividir Pagamento
                </button>
              </div>

              <div className="space-y-2.5">
                {payments.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {/* Método */}
                      <select
                        value={p.method}
                        onChange={(e) =>
                          handleUpdatePayment(p.id, {
                            method: e.target.value as any
                          })
                        }
                        className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="PIX">PIX Balcão</option>
                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                        <option value="DEBIT_CARD">Cartão de Débito</option>
                        <option value="CASH">Dinheiro em Espécie</option>
                        <option value="CREDIT_ACCOUNT">Crediário / Fiado</option>
                      </select>

                      {/* Valor do Split */}
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.amount}
                          onChange={(e) =>
                            handleUpdatePayment(p.id, { amount: e.target.value })
                          }
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Botão Preencher Restante */}
                      {payments.length > 1 && remainingBalance !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleFillRemaining(p.id)}
                          className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        >
                          Completar
                        </button>
                      )}

                      {/* Remover Linha de Split */}
                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentRow(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Vencimento para Crediário */}
                    {p.method === 'CREDIT_ACCOUNT' && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-slate-600 font-medium">Data de Vencimento:</span>
                        <input
                          type="date"
                          value={p.dueDate || ''}
                          onChange={(e) =>
                            handleUpdatePayment(p.id, { dueDate: e.target.value })
                          }
                          className="px-2 py-1 rounded-md border border-slate-200 text-slate-800 bg-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Status do Saldo */}
              <div className="mt-2.5 flex items-center justify-between text-xs px-2">
                <span className="text-slate-500">
                  Total Lançado: <strong>{formatMoney(totalPaidInCheckout)}</strong> de{' '}
                  <strong>{formatMoney(balanceToPay)}</strong>
                </span>

                {Math.abs(remainingBalance) <= 0.05 ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Saldo 100% Coberto
                  </span>
                ) : remainingBalance > 0 ? (
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Falta cobrir {formatMoney(remainingBalance)}
                  </span>
                ) : (
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Excede em {formatMoney(Math.abs(remainingBalance))}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                O valor total deste atendimento foi 100% quitado pelo sinal antecipado ou cortesia. Nenhuma cobrança extra é necessária.
              </span>
            </div>
          )}

          {/* 4. OBSERVAÇÕES INTERNAS */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações da Comanda (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Cliente elogiou o resultado; adquiriu sérum fortalecedor para retorno em 20 dias..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleSubmitCheckout}
            disabled={
              isSubmitting ||
              items.length === 0 ||
              (balanceToPay > 0.05 && Math.abs(remainingBalance) > 0.05)
            }
            className="px-5 py-2.5 rounded-xl btn-primary-tenant disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Finalizar Atendimento & Comanda
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
