'use client';

import React from 'react';
import { Scissors, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { ReportBarChart } from '../charts/ReportBarChart';

interface ServiceItem {
  id: string;
  name: string;
  category?: string | null;
  count: number;
  totalRevenue: number;
  averagePrice: number;
  totalDurationMinutes: number;
}

interface ReportServicesTabProps {
  data: {
    summary: {
      totalServicesSold: number;
      totalRevenue: number;
      averageTicket: number;
      totalHoursDelivered: number;
    };
    rankingByVolume: ServiceItem[];
    rankingByRevenue: ServiceItem[];
  };
  tenantColor?: string;
}

export function ReportServicesTab({ data, tenantColor = '#5c0701' }: ReportServicesTabProps) {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const topVolumeChart = (data?.rankingByVolume || []).slice(0, 6).map((s) => ({
    label: s.name.length > 18 ? s.name.slice(0, 16) + '...' : s.name,
    value: s.count,
    formattedValue: `${s.count} vezes`,
  }));

  const topRevenueChart = (data?.rankingByRevenue || []).slice(0, 6).map((s) => ({
    label: s.name.length > 18 ? s.name.slice(0, 16) + '...' : s.name,
    value: s.totalRevenue,
    formattedValue: formatBRL(s.totalRevenue),
  }));

  return (
    <div className="space-y-6">
      {/* KPIs de Serviços */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Serviços Executados</span>
            <Scissors className="w-4 h-4" style={{ color: tenantColor }} />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalServicesSold || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Quantidade total de procedimentos</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Faturamento Serviços</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatBRL(data?.summary?.totalRevenue || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Receita bruta de atendimentos</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Preço Médio</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatBRL(data?.summary?.averageTicket || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">Ticket por procedimento</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tempo em Atendimento</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalHoursDelivered?.toFixed(1) || '0'}h
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Horas de bancada/cadeira</span>
        </div>
      </div>

      {/* Gráficos de Serviços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Mais Realizados (Volume)
          </h3>
          <ReportBarChart data={topVolumeChart} height={200} orientation="horizontal" primaryColor={tenantColor} />
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Mais Rentáveis (Faturamento)
          </h3>
          <ReportBarChart data={topRevenueChart} height={200} orientation="horizontal" primaryColor={tenantColor} />
        </div>
      </div>

      {/* Tabela de Serviços */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/90">
          <h3 className="text-sm font-bold text-slate-900">
            Matriz de Desempenho de Serviços
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 uppercase text-[10px] text-slate-500 font-bold border-b border-slate-200/90">
              <tr>
                <th className="py-3 px-4">Procedimento</th>
                <th className="py-3 px-4 text-center">Atendimentos</th>
                <th className="py-3 px-4 text-right">Preço Médio</th>
                <th className="py-3 px-4 text-right">Faturamento Total</th>
                <th className="py-3 px-4 text-right">Horas Totais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.rankingByRevenue || []).map((serv, idx) => (
                <tr key={serv.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {serv.name}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                    {serv.count}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700 font-mono">
                    {formatBRL(serv.averagePrice)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-600 font-mono">
                    {formatBRL(serv.totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">
                    {(serv.totalDurationMinutes / 60).toFixed(1)}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
