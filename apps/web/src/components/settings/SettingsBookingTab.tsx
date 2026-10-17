'use client';

import React from 'react';
import { Clock, Calendar, Sparkles } from 'lucide-react';
import { TenantSettings } from './types';

interface SettingsBookingTabProps {
  settings: TenantSettings;
  onChange: (field: keyof TenantSettings, value: any) => void;
}

export const SettingsBookingTab: React.FC<SettingsBookingTabProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Regras de Grade & Agendamentos
            </h3>
            <p className="text-xs text-slate-500">
              Controle os limites de horários para clientes na vitrine online
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Intervalo de Slots */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Intervalo entre Horários na Grade
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Define a granularidade dos horários exibidos para escolha do cliente (ex: 09:00, 09:30, 10:00).
            </p>
            <select
              value={settings.slotIntervalMinutes || 30}
              onChange={(e) => onChange('slotIntervalMinutes', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={15}>A cada 15 minutos</option>
              <option value={20}>A cada 20 minutos</option>
              <option value={30}>A cada 30 minutos (Padrão)</option>
              <option value={45}>A cada 45 minutos</option>
              <option value={60}>A cada 1 hora</option>
            </select>
          </div>

          {/* Buffer Minutes */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Intervalo de Higienização / Folga (Buffer)
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tempo automático adicionado após cada serviço para limpeza de bancada, descanso ou atrasos.
            </p>
            <select
              value={settings.bufferMinutes ?? 15}
              onChange={(e) => onChange('bufferMinutes', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={0}>Sem folga (0 minutos)</option>
              <option value={5}>5 minutos</option>
              <option value={10}>10 minutos</option>
              <option value={15}>15 minutos (Recomendado)</option>
              <option value={20}>20 minutos</option>
              <option value={30}>30 minutos</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Antecedência Mínima */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Antecedência Mínima para Agendar
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Evita que clientes agendem horários de última hora sem tempo para você se preparar.
            </p>
            <select
              value={settings.minAdvanceBookingMinutes ?? 60}
              onChange={(e) => onChange('minAdvanceBookingMinutes', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={0}>Imediato (Sem antecedência mínima)</option>
              <option value={30}>30 minutos antes</option>
              <option value={60}>1 hora antes (Recomendado)</option>
              <option value={120}>2 horas antes</option>
              <option value={240}>4 horas antes</option>
              <option value={1440}>1 dia antes (24 horas)</option>
            </select>
          </div>

          {/* Antecedência Máxima */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Antecedência Máxima da Agenda
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Até quantos dias para frente os clientes podem visualizar e marcar horários futuros.
            </p>
            <select
              value={settings.maxAdvanceBookingDays ?? 30}
              onChange={(e) => onChange('maxAdvanceBookingDays', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={7}>Até 7 dias à frente</option>
              <option value={15}>Até 15 dias à frente</option>
              <option value={30}>Até 30 dias à frente (Padrão)</option>
              <option value={60}>Até 60 dias à frente</option>
              <option value={90}>Até 90 dias à frente</option>
            </select>
          </div>
        </div>

        {/* Horários Padrão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Horário Geral de Abertura
            </label>
            <input
              type="time"
              value={settings.openingTime || '09:00'}
              onChange={(e) => onChange('openingTime', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Horário Geral de Fechamento
            </label>
            <input
              type="time"
              value={settings.closingTime || '20:00'}
              onChange={(e) => onChange('closingTime', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
