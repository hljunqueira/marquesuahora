'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, DollarSign, UserCheck } from 'lucide-react';
import { TenantSettings } from './types';
import { api } from '@/lib/api';

interface ServiceSummaryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  requiresDeposit: boolean;
  depositType?: 'PERCENTAGE' | 'FIXED';
  depositAmount?: number;
}

interface SettingsShieldTabProps {
  settings: TenantSettings;
  onChange: (field: keyof TenantSettings, value: any) => void;
}

export const SettingsShieldTab: React.FC<SettingsShieldTabProps> = ({
  settings,
  onChange
}) => {
  const isFirstBookingActive = settings.depositOnFirstBooking ?? false;
  const isGeneralDepositActive = settings.depositRequired ?? false;
  const firstBookingType = settings.depositFirstBookingType || 'PERCENTAGE';
  const firstBookingValue = settings.depositFirstBookingValue ?? settings.depositFirstBookingPercent ?? 50;

  const anyDepositActive = isFirstBookingActive || isGeneralDepositActive;

  // Estados dos Serviços para Sinal Específico
  const [servicesList, setServicesList] = useState<ServiceSummaryItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [savingServices, setSavingServices] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoadingServices(true);
    api.get('/services')
      .then((res) => {
        if (!isMounted) return;
        const list: ServiceSummaryItem[] = (res.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'Geral',
          price: Number(s.price || 0),
          durationMinutes: s.durationMinutes || 30,
          requiresDeposit: Boolean(s.requiresDeposit),
          depositType: s.depositType || 'PERCENTAGE',
          depositAmount: Number(s.depositAmount || 50)
        }));
        setServicesList(list);
        setSelectedServiceIds(list.filter((s) => s.requiresDeposit).map((s) => s.id));
      })
      .catch((err) => {
        console.error('Erro ao carregar serviços em SettingsShieldTab:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingServices(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllServices = () => {
    setSelectedServiceIds(servicesList.map((s) => s.id));
  };

  const handleDeselectAllServices = () => {
    setSelectedServiceIds([]);
  };

  const handleSaveServicesDeposit = async () => {
    setSavingServices(true);
    setSaveMessage(null);
    try {
      await api.post('/services/bulk-deposit-settings', {
        serviceIds: selectedServiceIds,
        applyToAll: false,
        depositType: firstBookingType,
        depositAmount: Number(firstBookingValue) || 50
      });

      // Atualiza o estado local
      setServicesList((prev) =>
        prev.map((s) => ({
          ...s,
          requiresDeposit: selectedServiceIds.includes(s.id),
          depositType: firstBookingType,
          depositAmount: Number(firstBookingValue) || 50
        }))
      );

      setSaveMessage('Procedimentos atualizados com sucesso!');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar procedimentos com sinal:', err);
      setSaveMessage(err?.response?.data?.message || 'Erro ao salvar procedimentos.');
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setSavingServices(false);
    }
  };

  const filteredServicesList = servicesList.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Banner Explicativo Sóbrio */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-slate-100 text-slate-800 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-slate-900 font-bold text-base mb-1">
              Políticas de Sinal, Adiantamento e Prevenção de Faltas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Configure as regras de cobrança de sinal para proteger sua agenda contra clientes faltosas (No-Show). O valor do sinal é pago diretamente na sua chave PIX e abatido automaticamente do total no dia do atendimento.
            </p>
          </div>
        </div>
      </div>

      {/* 1. REGRA: SINAL FLEXÍVEL PARA CLIENTES NOVAS (1º AGENDAMENTO) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Adiantamento para Clientes Novas (1º Agendamento)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-purple-100 text-purple-900">
                  Flexível
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exige sinal via PIX apenas no primeiro horário de quem nunca foi atendida. Clientes com histórico de presença continuam agendando normalmente sem cobrança de sinal.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isFirstBookingActive}
              onChange={(e) => onChange('depositOnFirstBooking', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
          </label>
        </div>

        {isFirstBookingActive && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Modalidade do Adiantamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChange('depositFirstBookingType', 'PERCENTAGE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      firstBookingType === 'PERCENTAGE'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Porcentagem (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('depositFirstBookingType', 'FIXED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      firstBookingType === 'FIXED'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Valor Fixo (R$)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {firstBookingType === 'PERCENTAGE'
                    ? 'Percentual do Serviço para 1ª Vez'
                    : 'Valor Fixo do Sinal para 1ª Vez'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={firstBookingType === 'PERCENTAGE' ? 5 : 1}
                    max={firstBookingType === 'PERCENTAGE' ? 100 : 1000}
                    step={firstBookingType === 'PERCENTAGE' ? 5 : 5}
                    value={firstBookingValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onChange('depositFirstBookingValue', val);
                      onChange('depositFirstBookingPercent', val);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 font-bold outline-hidden focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    {firstBookingType === 'PERCENTAGE' ? '%' : 'BRL'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {firstBookingType === 'PERCENTAGE'
                    ? `Se o serviço custar R$ 100, a cliente nova pagará R$ ${((100 * firstBookingValue) / 100).toFixed(2)} de sinal.`
                    : `A cliente nova pagará R$ ${firstBookingValue.toFixed(2)} de sinal independentemente do valor do serviço.`}
                </p>
              </div>
            </div>

            {/* SELETOR DE PROCEDIMENTOS COM SINAL */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Serviços com Exigência de Sinal ({firstBookingType === 'PERCENTAGE' ? `${firstBookingValue}%` : `R$ ${firstBookingValue}`})
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Defina em quais procedimentos do catálogo esse sinal antecipado será cobrado.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllServices}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllServices}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {/* Busca Rápida de Serviços */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar procedimento no catálogo..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-900 outline-none"
                />
              </div>

              {/* Lista de Procedimentos */}
              {loadingServices ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
                  Carregando procedimentos cadastrados...
                </div>
              ) : servicesList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
                  Nenhum procedimento cadastrado no seu catálogo ainda.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {filteredServicesList.map((svc) => {
                    const isSelected = selectedServiceIds.includes(svc.id);
                    const calculatedDeposit =
                      firstBookingType === 'PERCENTAGE'
                        ? (svc.price * firstBookingValue) / 100
                        : Math.min(firstBookingValue, svc.price);

                    return (
                      <label
                        key={svc.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50/70 border-purple-300 text-purple-950 font-semibold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleService(svc.id)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 truncate block">
                              {svc.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {svc.category} • {svc.durationMinutes} min
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <span className="block font-bold text-slate-900">
                            R$ {svc.price.toFixed(2).replace('.', ',')}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isSelected ? 'text-purple-700' : 'text-slate-400'
                            }`}
                          >
                            {isSelected
                              ? `Sinal: R$ ${calculatedDeposit.toFixed(2).replace('.', ',')}`
                              : 'Sem sinal'}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Botão de Salvar Serviços Selecionados */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600">
                  {selectedServiceIds.length} de {servicesList.length} procedimento(s) com sinal ativo
                </span>

                <button
                  type="button"
                  disabled={savingServices || loadingServices}
                  onClick={handleSaveServicesDeposit}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  {savingServices ? 'Salvando...' : 'Salvar Procedimentos com Sinal'}
                </button>
              </div>

              {saveMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center">
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. REGRA: SINAL GERAL DE RESERVA (TODOS OS AGENDAMENTOS) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Sinal Geral de Reserva (Todos os Clientes)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exige sinal via PIX para absolutamente qualquer agendamento online no seu estabelecimento.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isGeneralDepositActive}
              onChange={(e) => onChange('depositRequired', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
          </label>
        </div>

        {isGeneralDepositActive && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Modalidade do Sinal Geral
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange('depositType', 'FIXED')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    settings.depositType === 'FIXED'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Valor Fixo (R$)
                </button>
                <button
                  type="button"
                  onClick={() => onChange('depositType', 'PERCENTAGE')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    settings.depositType === 'PERCENTAGE'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Porcentagem (%)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {settings.depositType === 'PERCENTAGE'
                  ? 'Percentual Geral do Serviço (%)'
                  : 'Valor Geral do Sinal (R$)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={settings.depositType === 'PERCENTAGE' ? 5 : 5}
                  value={settings.depositAmount ?? 30}
                  onChange={(e) => onChange('depositAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 font-bold outline-hidden focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  {settings.depositType === 'PERCENTAGE' ? '%' : 'BRL'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. DADOS DO PIX DO ESTABELECIMENTO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Dados do PIX do seu Estabelecimento
            </h4>
            {anyDepositActive ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Sinais Ativos
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                Opcional / Pré-configuração
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Os sinais de reserva agendados pelo site são enviados diretamente para a sua conta bancária sem intermediação nem taxas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tipo da Chave
            </label>
            <select
              value={settings.pixKeyType || 'CPF'}
              onChange={(e) => onChange('pixKeyType', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 outline-hidden focus:border-slate-900"
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="PHONE">Telefone / WhatsApp</option>
              <option value="EMAIL">E-mail</option>
              <option value="RANDOM">Chave Aleatória</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Chave PIX
            </label>
            <input
              type="text"
              value={settings.pixKey || ''}
              onChange={(e) => onChange('pixKey', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-hidden focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nome do Titular / Favorecido
            </label>
            <input
              type="text"
              value={settings.pixKeyHolder || ''}
              onChange={(e) => onChange('pixKeyHolder', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-hidden focus:border-slate-900"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
          <p className="leading-relaxed">
            <strong>Sinal Específico por Serviço:</strong> Além das regras de 1ª vez e geral, você também pode exigir sinal em serviços selecionados (ex: <em>Alongamento de Unhas</em>, <em>Spa dos Pés</em>). Para configurar, acesse o menu <strong>Serviços</strong> e edite o serviço desejado.
          </p>
        </div>
      </div>

      {/* 4. TOLERÂNCIA DE FALTAS (NO-SHOW) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-3 shadow-xs">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Tolerância de Faltas sem Aviso Prévio (No-Show Shield)
        </label>
        <p className="text-xs text-slate-500 leading-relaxed">
          Número de faltas registradas na ficha da cliente antes de o sistema bloquear o agendamento online automático.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <select
            value={settings.maxNoShowsAllowed || 2}
            onChange={(e) => onChange('maxNoShowsAllowed', parseInt(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 outline-hidden focus:border-slate-900"
          >
            <option value={1}>1 falta (Rigoroso — Bloqueio na primeira falta sem aviso)</option>
            <option value={2}>2 faltas (Recomendado — Bloqueio na 2ª falta)</option>
            <option value={3}>3 faltas (Tolerante — Bloqueio na 3ª falta)</option>
            <option value={5}>5 faltas (Muito tolerante)</option>
          </select>
          <span className="text-xs text-slate-500">
            Ao atingir a tolerância, a cliente é direcionada para confirmação manual no WhatsApp.
          </span>
        </div>
      </div>
    </div>
  );
};
