'use client';

import React from 'react';
import { Users, DollarSign, Award, Percent } from 'lucide-react';
import { ReportBarChart } from '../charts/ReportBarChart';

interface TeamMemberItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  totalAppointments: number;
  grossRevenue: number;
  commissionRate: number;
  commissionEarned: number;
  salonNetRevenue: number;
}

interface ReportTeamTabProps {
  data: {
    summary: {
      activeProfessionals: number;
      totalTeamRevenue: number;
      totalCommissionsDue: number;
      salonRetainedRevenue: number;
    };
    professionals: TeamMemberItem[];
  };
  tenantColor?: string;
}

export function ReportTeamTab({ data, tenantColor = '#5c0701' }: ReportTeamTabProps) {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const teamRevenueChart = (data?.professionals || []).map((p) => ({
    label: formatName(p.name),
    value: p.grossRevenue,
    formattedValue: formatBRL(p.grossRevenue),
  }));

  const hasProfessionals = (data?.professionals || []).length > 0;

  return (
    <div className="space-y-8">
      {/* Cards de Resumo da Equipe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: tenantColor }} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Profissionais Ativos</span>
            <Users className="w-4 h-4" style={{ color: tenantColor }} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {data?.summary?.activeProfessionals || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Com atendimentos no período</span>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Produção da Equipe</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {formatBRL(data?.summary?.totalTeamRevenue || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Receita bruta gerada</span>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Comissões a Repassar</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
            {formatBRL(data?.summary?.totalCommissionsDue || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total devido aos parceiros</span>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[112px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Saldo Retido pelo Salão</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
            {formatBRL(data?.summary?.salonRetainedRevenue || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Lucro operacional do espaço</span>
        </div>
      </div>

      {/* Gráfico de Produção da Equipe */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Faturamento Bruto por Profissional
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranking de produção individual gerada no período
            </p>
          </div>
          <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/80">
            {data?.professionals?.length || 0} profissionais
          </span>
        </div>
        <ReportBarChart
          data={teamRevenueChart}
          height={240}
          orientation="horizontal"
          primaryColor={tenantColor}
          showRank={true}
        />
      </div>

      {/* Tabela de Fechamento de Comissões */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Relatório de Fechamento de Repasses & Comissões
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Demonstrativo individual de atendimentos, faturamento, % comissão e saldo do salão
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 uppercase text-[10px] text-slate-500 font-bold border-b border-slate-200/90">
              <tr>
                <th className="py-3 px-4">Profissional</th>
                <th className="py-3 px-4 text-center">Atendimentos</th>
                <th className="py-3 px-4 text-right">Faturamento Bruto</th>
                <th className="py-3 px-4 text-center">% Comissão</th>
                <th className="py-3 px-4 text-right">Comissão Devida</th>
                <th className="py-3 px-4 text-right">Retenção do Salão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!hasProfessionals ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum profissional com atendimentos no período selecionado.
                  </td>
                </tr>
              ) : (
                data.professionals.map((prof, idx) => (
                  <tr key={prof.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {prof.name}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                      {prof.totalAppointments}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 font-mono">
                      {formatBRL(prof.grossRevenue)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
                        {prof.commissionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700 font-mono">
                      {formatBRL(prof.commissionEarned)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 font-mono">
                      {formatBRL(prof.salonNetRevenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
