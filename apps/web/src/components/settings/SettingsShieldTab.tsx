'use client';

import React from 'react';
import { ShieldCheck, DollarSign, UserCheck } from 'lucide-react';
import { TenantSettings } from './types';

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90 animate-in fade-in">
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
                  placeholder={firstBookingType === 'PERCENTAGE' ? 'Ex: 50%' : 'Ex: R$ 30,00'}
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
                  placeholder={settings.depositType === 'PERCENTAGE' ? '30%' : 'R$ 30,00'}
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
              placeholder="Digite a chave PIX"
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
              placeholder="Ex: Maria Silva ME"
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
