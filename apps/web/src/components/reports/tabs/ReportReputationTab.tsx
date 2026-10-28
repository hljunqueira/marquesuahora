'use client';

import React from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { ReportDonutChart } from '../charts/ReportDonutChart';

interface FeedbackItem {
  id: string;
  clientName: string;
  score: number;
  feedback?: string | null;
  date: string;
  serviceName?: string | null;
}

interface ReportReputationTabProps {
  data: {
    summary: {
      npsScore: number;
      averageRating: number;
      totalEvaluations: number;
      promotersCount: number;
      passivesCount: number;
      detractorsCount: number;
      promoterPercentage: number;
      passivePercentage: number;
      detractorPercentage: number;
    };
    recentFeedbacks: FeedbackItem[];
  };
  tenantColor?: string;
}

export function ReportReputationTab({ data, tenantColor = '#5c0701' }: ReportReputationTabProps) {
  const totalEvaluations = data?.summary?.totalEvaluations ?? 0;
  const npsScore = totalEvaluations > 0 ? (data?.summary?.npsScore ?? 0) : 0;
  const averageRating = totalEvaluations > 0 ? (data?.summary?.averageRating ?? 0) : 0;

  // Cor e zona do NPS de acordo com os dados reais
  let npsColor = 'text-slate-400';
  let npsZone = 'Sem avaliações no período';

  if (totalEvaluations > 0) {
    if (npsScore >= 75) {
      npsColor = 'text-emerald-600';
      npsZone = 'Zona de Excelência (75 a 100)';
    } else if (npsScore >= 50) {
      npsColor = 'text-blue-600';
      npsZone = 'Zona de Qualidade (50 a 74)';
    } else if (npsScore >= 0) {
      npsColor = 'text-amber-600';
      npsZone = 'Zona de Aperfeiçoamento (0 a 49)';
    } else {
      npsColor = 'text-rose-600';
      npsZone = 'Zona Crítica (< 0)';
    }
  }

  const donutData = totalEvaluations > 0 ? [
    { label: 'Promotores (4-5 estrelas)', value: data?.summary?.promotersCount || 0, color: '#10b981' },
    { label: 'Neutros (3 estrelas)', value: data?.summary?.passivesCount || 0, color: '#f59e0b' },
    { label: 'Detratores (1-2 estrelas)', value: data?.summary?.detractorsCount || 0, color: '#ef4444' },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Resumo do NPS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: totalEvaluations > 0 ? tenantColor : '#94a3b8' }} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Net Promoter Score</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${npsColor}`}>
            {totalEvaluations > 0 ? (npsScore > 0 ? `+${npsScore}` : npsScore) : '0'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">{npsZone}</span>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Média Geral de Avaliações</span>
            <ThumbsUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalEvaluations > 0 ? averageRating.toFixed(1) : '0.0'}
            <span className="text-sm font-normal text-slate-400">/5.0</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            {totalEvaluations} avaliações coletadas
          </span>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Promotores</span>
            <ThumbsUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {totalEvaluations > 0 ? (data?.summary?.promoterPercentage?.toFixed(0) || 0) : 0}%
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            {totalEvaluations > 0 ? (data?.summary?.promotersCount || 0) : 0} clientes recomendam
          </span>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-rose-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Detratores</span>
            <ThumbsDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
            {totalEvaluations > 0 ? (data?.summary?.detractorPercentage?.toFixed(0) || 0) : 0}%
          </div>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
            {totalEvaluations > 0 ? (data?.summary?.detractorsCount || 0) : 0} clientes insatisfeitos
          </span>
        </div>
      </div>

      {/* Gráfico Donut de Proporção NPS e Feedbacks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Composição do NPS
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Proporção de promotores (4-5 estrelas), neutros e detratores
          </p>
          <ReportDonutChart data={donutData} centerLabel="NPS" height={220} />
        </div>

        {/* Depoimentos e Avaliações Recentes */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" style={{ color: tenantColor }} />
                  Feedbacks e Comentários Recentes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Opiniões reais avaliadas pelas clientes no portal ou WhatsApp
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">Pós-atendimento</span>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {(data?.recentFeedbacks || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Nenhuma avaliação registrada no período selecionado.
                </div>
              ) : (
                data.recentFeedbacks.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:bg-white hover:shadow-2xs transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {item.clientName}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= item.score
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono">
                        Nota {item.score}/5
                      </span>
                    </div>
                    {item.feedback && (
                      <p className="text-xs text-slate-600 italic mt-1 leading-relaxed">
                        "{item.feedback}"
                      </p>
                    )}
                    <div className="text-[10px] text-slate-400 mt-2.5 flex items-center justify-between">
                      <span className="font-medium text-slate-500">{item.serviceName || 'Atendimento Geral'}</span>
                      <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}