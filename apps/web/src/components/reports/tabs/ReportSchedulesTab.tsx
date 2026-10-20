'use client';

import React from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, ShieldCheck, Share2 } from 'lucide-react';
import { ReportBarChart } from '../charts/ReportBarChart';
import { ReportDonutChart } from '../charts/ReportDonutChart';

interface ReportSchedulesTabProps {
  data: {
    summary: {
      totalSchedules: number;
      completed: number;
      cancelled: number;
      noShow: number;
      completionRate: number;
      cancellationRate: number;
    };
    byDayOfWeek: { day: string; count: number }[];
    byTimeBracket: { bracket: string; count: number }[];
    bySource: { source: string; label: string; count: number; percentage: number }[];
    antiNoShowStats: {
      protectedBookings: number;
      totalDepositHeld: number;
    };
  };
  tenantColor?: string;
}

export function ReportSchedulesTab({ data, tenantColor = '#5c0701' }: ReportSchedulesTabProps) {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const dayChartData = (data?.byDayOfWeek || []).map((d) => ({
    label: d.day,
    value: d.count,
    formattedValue: `${d.count} agendamentos`,
  }));

  const bracketChartData = (data?.byTimeBracket || []).map((b) => ({
    label: b.bracket,
    value: b.count,
    formattedValue: `${b.count} agendamentos`,
  }));

  const sourceChartData = (data?.bySource || []).map((s, idx) => {
    const colors = [tenantColor, '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];
    return {
      label: s.label || s.source,
      value: s.count,
      color: colors[idx % colors.length],
    };
  });

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Agendamentos</span>
            <Calendar className="w-4 h-4" style={{ color: tenantColor }} />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalSchedules || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Volume no período</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Taxa de Conclusão</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.completionRate?.toFixed(1) || '0.0'}%
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            {data?.summary?.completed || 0} atendimentos realizados
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Cancelamentos</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {data?.summary?.cancelled || 0}
          </div>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
            {data?.summary?.cancellationRate?.toFixed(1) || '0.0'}% de evasão
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Protegidos com Sinal PIX</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.antiNoShowStats?.protectedBookings || 0}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block font-mono">
            {formatBRL(data?.antiNoShowStats?.totalDepositHeld || 0)} garantidos antecipadamente
          </span>
        </div>
      </div>

      {/* Gráficos de Frequência Semanal e Horários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: tenantColor }} />
              Distribuição por Dia da Semana
            </h3>
            <span className="text-xs text-slate-400 font-medium">Pico de demanda</span>
          </div>
          <ReportBarChart data={dayChartData} height={220} orientation="vertical" primaryColor={tenantColor} />
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Horários de Maior Movimento
            </h3>
            <span className="text-xs text-slate-400 font-medium">Faixas de atendimento</span>
          </div>
          <ReportBarChart data={bracketChartData} height={220} orientation="vertical" primaryColor={tenantColor} />
        </div>
      </div>

      {/* Origem dos Agendamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              Canais de Origem
            </h3>
          </div>
          <ReportDonutChart data={sourceChartData} centerLabel="Total" height={220} />
        </div>

        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Auditoria de Eficiência Operacional
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              O rastreamento de origens permite mensurar a autonomia do seu negócio. Quanto maior a taxa de agendamentos pela Vitrine Pública (Link da Bio) e Copiloto de Voz, menor é o tempo da equipe gasto respondendo WhatsApp manualmente.
            </p>
          </div>

          <div className="space-y-2.5">
            {(data?.bySource || []).map((sourceItem) => (
              <div
                key={sourceItem.source}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {sourceItem.label || sourceItem.source}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {sourceItem.count} agendamentos registrados
                  </div>
                </div>
                <div className="text-sm font-extrabold text-slate-900 font-mono">
                  {sourceItem.percentage?.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
