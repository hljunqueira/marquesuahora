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
      {/* Mensagem de Boas-Vindas no WhatsApp */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Mensagem de Boas-Vindas no WhatsApp
              </h3>
              <p className="text-xs text-slate-500">
                Disparada automaticamente quando um cliente entra em contato pela primeira vez ou inicia uma nova conversa
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.welcomeMessageEnabled ?? true}
              onChange={(e) => onChange('welcomeMessageEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>

        {(settings.welcomeMessageEnabled ?? true) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Texto Customizado de Boas-Vindas
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Variáveis: {'{cliente}'}, {'{salão}'}, {'{link}'}
                </span>
                <span className={`text-[11px] font-mono transition-colors ${
                  (settings.welcomeMessageCustom || '').length > 1800
                    ? 'text-amber-600 font-bold'
                    : 'text-slate-400'
                }`}>
                  {(settings.welcomeMessageCustom || '').length} / 2000
                </span>
              </div>
            </div>
            <textarea
              rows={4}
              maxLength={2000}
              value={settings.welcomeMessageCustom ?? ''}
              onChange={(e) => onChange('welcomeMessageCustom', e.target.value)}
              placeholder="Olá{cliente}! Seja muito bem-vinda ao estúdio *{salão}*!&#10;&#10;Como posso te ajudar hoje? Me conte qual procedimento você gostaria de agendar."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-sans resize-y"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Inserir variável:</span>
              <button
                type="button"
                onClick={() => {
                  const current = settings.welcomeMessageCustom ?? '';
                  onChange('welcomeMessageCustom', current + ' {cliente}');
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors cursor-pointer"
              >
                {'{cliente}'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = settings.welcomeMessageCustom ?? '';
                  onChange('welcomeMessageCustom', current + ' {salão}');
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors cursor-pointer"
              >
                {'{salão}'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = settings.welcomeMessageCustom ?? '';
                  onChange('welcomeMessageCustom', current + ' {link}');
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors cursor-pointer"
              >
                {'{link}'}
              </button>
            </div>
          </div>
        )}
      </div>

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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Texto Customizado da Mensagem de Aniversário
              </label>
              <span className={`text-[11px] font-mono transition-colors ${
                (settings.birthdayMessageCustom || '').length > 900
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-400'
              }`}>
                {(settings.birthdayMessageCustom || '').length} / 1000
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={settings.birthdayMessageCustom || ''}
              onChange={(e) => onChange('birthdayMessageCustom', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all resize-y"
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
            <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed">
              Dica: Acesse seu painel do Google Meu Negócio &gt; &ldquo;Pedir Avaliações&rdquo; &gt; Copiar link curto.
              Este link é integrado com a sua Vitrine Pública (Selo 5 Estrelas) e utilizado nos disparos pós-atendimento.
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
