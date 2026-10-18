'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertCircle, CheckCircle2, ShieldCheck, Ticket } from 'lucide-react';
import { api } from '@/lib/api';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface CouponItem {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number | string;
  validUntil?: string | null;
  isActive: boolean;
}

interface ClientOption {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

interface CouponBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CouponBroadcastModal: React.FC<CouponBroadcastModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');
  const [isCreatingNewCoupon, setIsCreatingNewCoupon] = useState<boolean>(false);

  // Formulário de novo cupom
  const [newCode, setNewCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newDiscountValue, setNewDiscountValue] = useState('');
  const [newValidUntil, setNewValidUntil] = useState('');

  // Filtro de Audiência
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'INACTIVE_30D' | 'BIRTHDAY_MONTH' | 'CUSTOM'>('ALL');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!isOpen) return;

    // Busca cupons ativos
    api.get('/coupons')
      .then((res) => {
        const list = res.data || [];
        setCoupons(list);
        if (list.length > 0) {
          setSelectedCouponId(list[0].id);
        } else {
          setIsCreatingNewCoupon(true);
        }
      })
      .catch((err) => console.error('Erro ao carregar cupons:', err));

    // Busca lista de clientes para seleção manual
    api.get('/clients', { params: { limit: 200 } })
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setClients(list);
      })
      .catch((err) => console.error('Erro ao carregar clientes:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateCoupon = async () => {
    if (!newCode.trim() || !newDiscountValue) {
      showToast('Preencha o código e valor do desconto.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/coupons', {
        code: newCode.trim(),
        discountType: newDiscountType,
        discountValue: Number(newDiscountValue),
        validUntil: newValidUntil ? newValidUntil : undefined
      });

      const created = res.data;
      setCoupons((prev) => [created, ...prev]);
      setSelectedCouponId(created.id);
      setIsCreatingNewCoupon(false);
      setNewCode('');
      setNewDiscountValue('');
      setNewValidUntil('');
      showToast('Cupom criado com sucesso.');
    } catch (err: any) {
      console.error('Erro ao criar cupom:', err);
      showToast(err?.response?.data?.message || 'Erro ao criar cupom.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClientSelection = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllClients = () => {
    const allFilteredIds = filteredClients.map((c) => c.id);
    if (selectedClientIds.length === allFilteredIds.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(allFilteredIds);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!clientSearch) return true;
    const s = clientSearch.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.phone.includes(s);
  });

  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId);

  const handleDispatch = async () => {
    if (!selectedCouponId) {
      showToast('Selecione ou crie um cupom.', 'error');
      return;
    }

    if (audienceFilter === 'CUSTOM' && selectedClientIds.length === 0) {
      showToast('Selecione pelo menos um cliente na lista.', 'error');
      return;
    }

    setDispatching(true);
    try {
      const res = await api.post(`/coupons/${selectedCouponId}/broadcast`, {
        audienceFilter,
        clientIds: audienceFilter === 'CUSTOM' ? selectedClientIds : []
      });

      showToast(res.data?.message || 'Disparo iniciado com sucesso.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao disparar cupom:', err);
      showToast(err?.response?.data?.message || 'Erro ao iniciar disparo.', 'error');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Toast */}
        {toastMessage && (
          <div
            className={`absolute top-4 right-4 z-60 px-4 py-2.5 rounded-xl font-medium text-xs shadow-lg flex items-center gap-2 ${
              toastMessage.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Header do Modal sem ícones decorativos */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <WhatsAppIcon size={18} color="#059669" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Disparar Cupom no WhatsApp
              </h3>
              <p className="text-xs text-slate-500">
                Selecione as clientes-alvo e envie um benefício exclusivo com intervalo anti-ban.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Escolha ou Criação do Cupom */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Cupom de Desconto
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewCoupon(!isCreatingNewCoupon)}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
              >
                {isCreatingNewCoupon ? 'Selecionar existente' : '+ Criar novo cupom'}
              </button>
            </div>

            {isCreatingNewCoupon ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código do Cupom
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      className="w-full text-xs font-mono font-bold uppercase p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo & Valor
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={newDiscountType}
                        onChange={(e: any) => setNewDiscountType(e.target.value)}
                        className="text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      >
                        <option value="PERCENTAGE">%</option>
                        <option value="FIXED">R$</option>
                      </select>
                      <input
                        type="number"
                        value={newDiscountValue}
                        onChange={(e) => setNewDiscountValue(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Válido até (Opcional)
                    </label>
                    <input
                      type="date"
                      value={newValidUntil}
                      onChange={(e) => setNewValidUntil(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateCoupon}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {loading ? 'Salvando...' : 'Salvar e Usar Cupom'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <select
                  value={selectedCouponId}
                  onChange={(e) => setSelectedCouponId(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                >
                  {coupons.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `R$ ${Number(c.discountValue).toFixed(2)} OFF`}
                      {c.validUntil ? ` (Válido até ${new Date(c.validUntil).toLocaleDateString('pt-BR')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Seleção de Audiência */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Seleção de Clientes
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setAudienceFilter('ALL')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  audienceFilter === 'ALL'
                    ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-semibold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Todas as Clientes</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Toda a base cadastrada</div>
              </button>

              <button
                type="button"
                onClick={() => setAudienceFilter('INACTIVE_30D')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  audienceFilter === 'INACTIVE_30D'
                    ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-semibold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Inativas (+30 dias)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Sem retorno recente</div>
              </button>

              <button
                type="button"
                onClick={() => setAudienceFilter('BIRTHDAY_MONTH')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  audienceFilter === 'BIRTHDAY_MONTH'
                    ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-semibold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Aniversariantes</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Do mês atual</div>
              </button>

              <button
                type="button"
                onClick={() => setAudienceFilter('CUSTOM')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  audienceFilter === 'CUSTOM'
                    ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-semibold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Seleção Manual</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Escolher clientes</div>
              </button>
            </div>

            {/* Lista com checkboxes se seleção manual estiver ativa */}
            {audienceFilter === 'CUSTOM' && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllClients}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer whitespace-nowrap"
                  >
                    {selectedClientIds.length === filteredClients.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Nenhuma cliente localizada.
                    </div>
                  ) : (
                    filteredClients.map((client) => {
                      const isSelected = selectedClientIds.includes(client.id);
                      return (
                        <label
                          key={client.id}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleClientSelection(client.id)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <span className="font-medium text-slate-900">{client.name}</span>
                          </div>
                          <span className="text-slate-400 font-mono">{client.phone}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  {selectedClientIds.length} cliente(s) selecionada(s).
                </div>
              </div>
            )}
          </div>

          {/* 3. Aviso Anti-Ban */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong>Cadência de Envio Anti-Ban:</strong> As mensagens serão disparadas sequencialmente com intervalo de 8 a 10 segundos entre cada cliente para preservar a segurança da sua conta comercial no WhatsApp.
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDispatch}
            disabled={dispatching || !selectedCouponId}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <WhatsAppIcon size={16} color="#ffffff" />
            <span>{dispatching ? 'Iniciando Disparo...' : 'Disparar Cupom no WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
