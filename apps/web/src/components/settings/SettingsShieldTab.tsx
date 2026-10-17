'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, DollarSign, AlertTriangle } from 'lucide-react';
import { TenantSettings } from './types';

interface SettingsShieldTabProps {
  settings: TenantSettings;
  onChange: (field: keyof TenantSettings, value: any) => void;
}

export const SettingsShieldTab: React.FC<SettingsShieldTabProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-6">
      {/* Banner Explicativo */}
      <div className="bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/70 border border-purple-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-purple-100 text-purple-700 flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-slate-900 font-semibold text-base mb-1">
              Como funciona o No-Show Shield?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              O No-Show Shield monitora o comportamento de cada cliente. Se um cliente faltar sem avisar com antecedência, o sistema pode exigir um sinal antecipado via PIX ou até bloquear agendamentos automáticos, liberando você para faturar sem horários vagos.
            </p>
          </div>
        </div>
      </div>

      {/* Configuração de Sinal PIX */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Exigência de Sinal Antecipado (PIX)
              </h3>
              <p className="text-xs text-slate-500">
                Garante o compromisso do cliente cobrando uma taxa de reserva
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.depositRequired || false}
              onChange={(e) => onChange('depositRequired', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>

        {settings.depositRequired && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 animate-in fade-in">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Modalidade do Sinal
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange('depositType', 'FIXED')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settings.depositType === 'FIXED'
                      ? 'btn-primary-tenant shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Valor Fixo (R$)
                </button>
                <button
                  type="button"
                  onClick={() => onChange('depositType', 'PERCENTAGE')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settings.depositType === 'PERCENTAGE'
                      ? 'btn-primary-tenant shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Porcentagem (%)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                {settings.depositType === 'PERCENTAGE'
                  ? 'Percentual do Serviço (%)'
                  : 'Valor do Sinal (R$)'}
              </label>
              <input
                type="number"
                min={0}
                step={settings.depositType === 'PERCENTAGE' ? 1 : 5}
                value={settings.depositAmount ?? 30}
                onChange={(e) => onChange('depositAmount', parseFloat(e.target.value) || 0)}
                placeholder={settings.depositType === 'PERCENTAGE' ? '30%' : 'R$ 30,00'}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>

            {/* Chave PIX Direta do Salão */}
            <div className="sm:col-span-2 pt-3 border-t border-slate-200 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Dados do PIX do seu Estabelecimento
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  O valor do sinal é pago diretamente na sua conta bancária via PIX. Não há retenção nem taxas de intermediação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tipo da Chave *
                  </label>
                  <select
                    value={settings.pixKeyType || 'CPF'}
                    onChange={(e) => onChange('pixKeyType', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="PHONE">Telefone / WhatsApp</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="RANDOM">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Chave PIX *
                  </label>
                  <input
                    type="text"
                    value={settings.pixKey || ''}
                    onChange={(e) => onChange('pixKey', e.target.value)}
                    placeholder="Sua chave PIX"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nome do Titular / Favorecido *
                  </label>
                  <input
                    type="text"
                    value={settings.pixKeyHolder || ''}
                    onChange={(e) => onChange('pixKeyHolder', e.target.value)}
                    placeholder="Ex: Maria Silva ME"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tolerância de Faltas */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Tolerância de Faltas sem Aviso Prévio
          </label>
          <p className="text-xs text-slate-500 leading-relaxed">
            Número de faltas (No-Show) registradas na ficha do cliente antes do sistema bloquear o agendamento online automático.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <select
              value={settings.maxNoShowsAllowed || 2}
              onChange={(e) => onChange('maxNoShowsAllowed', parseInt(e.target.value))}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              <option value={1}>1 falta (Rigoroso - Exige atenção imediata)</option>
              <option value={2}>2 faltas (Padrão Recomendado)</option>
              <option value={3}>3 faltas (Tolerante)</option>
              <option value={5}>5 faltas (Muito tolerante)</option>
            </select>
            <span className="text-xs text-slate-500">
              Após atingir o limite, o cliente é direcionado para confirmação manual no WhatsApp.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
