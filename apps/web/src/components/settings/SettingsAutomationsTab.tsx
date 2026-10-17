'use client';

import React from 'react';
import { Cake, UserCheck, Star, MessageSquare } from 'lucide-react';
import { TenantSettings } from './types';

interface SettingsAutomationsTabProps {
  settings: TenantSettings;
  onChange: (field: keyof TenantSettings, value: any) => void;
}

export const SettingsAutomationsTab: React.FC<SettingsAutomationsTabProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-6">
      {/* Mensagem de Aniversário */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-50 text-pink-700">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Felicitações de Aniversário
              </h3>
              <p className="text-xs text-slate-500">
                Notificação automática com votos de parabéns e cupom para clientes aniversariantes
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.birthdayMessageEnabled ?? true}
              onChange={(e) => onChange('birthdayMessageEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>

        {settings.birthdayMessageEnabled && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Texto Customizado da Mensagem de Aniversário
            </label>
            <textarea
              rows={3}
              value={settings.birthdayMessageCustom || ''}
              onChange={(e) => onChange('birthdayMessageCustom', e.target.value)}
              placeholder="Ex: Parabéns pelo seu dia especial! Como presente, preparamos um desconto exclusivo para você agendar seu cuidado conosco esta semana."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>
        )}
      </div>

      {/* Alerta de Churn / Clientes Sumidos */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Recuperação de Clientes Sumidos (Anti-Churn)
              </h3>
              <p className="text-xs text-slate-500">
                Identifica e alerta quando um cliente habitual passa do tempo médio de retorno
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.churnRecoveryEnabled ?? true}
              onChange={(e) => onChange('churnRecoveryEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>

        {settings.churnRecoveryEnabled && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Considerar cliente em risco após ausência de:
            </label>
            <select
              value={settings.churnAlertDays || 45}
              onChange={(e) => onChange('churnAlertDays', parseInt(e.target.value))}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium"
            >
              <option value={30}>30 dias sem visita</option>
              <option value={45}>45 dias sem visita (Recomendado)</option>
              <option value={60}>60 dias sem visita</option>
              <option value={90}>90 dias sem visita</option>
            </select>
          </div>
        )}
      </div>

      {/* Avaliações do Google Meu Negócio */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Avaliações Google Meu Negócio & NPS
            </h3>
            <p className="text-xs text-slate-500">
              Aumente sua reputação local pedindo avaliação no Google pós-atendimento
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Link de Avaliação Direta no Google Maps
            </label>
            <input
              type="url"
              value={settings.googleReviewUrl || ''}
              onChange={(e) => onChange('googleReviewUrl', e.target.value)}
              placeholder="https://g.page/r/suapagina/review"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Dica: Acesse seu painel do Google Meu Negócio &gt; Pedir Avaliações &gt; Copiar link curto.
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <div className="text-xs font-semibold text-slate-800">Pesquisa de Satisfação NPS Automática</div>
              <div className="text-[11px] text-slate-500">Envia pergunta de 0 a 10 após conclusão do atendimento</div>
            </div>
            <input
              type="checkbox"
              checked={settings.npsFeedbackEnabled ?? true}
              onChange={(e) => onChange('npsFeedbackEnabled', e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 bg-white border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
