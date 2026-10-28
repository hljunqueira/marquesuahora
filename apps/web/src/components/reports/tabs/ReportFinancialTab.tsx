'use client';

import React from 'react';
import { DollarSign, CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import { ReportDonutChart } from '../charts/ReportDonutChart';
import { ReportBarChart } from '../charts/ReportBarChart';

interface ReportFinancialTabProps {
  data: {
    summary: {
      grossRevenue: number;
      netEstimatedRevenue: number;
      totalTransactions: number;
      averageTicket: number;
    };
    byMethod: { method: string; label: string; amount: number; percentage: number }[];
    antiNoShowStats: {
      depositCollected: number;
      depositCount: number;
      noShowsAvoidedEstimatedValue: number;
    };
    creditAccounts: {
      totalDebtOpen: number;
      totalPaidInPeriod: number;
      activeDebtorsCount: number;
    };
  };
  tenantColor?: string;
}

export function ReportFinancialTab({ data, tenantColor = '#5c0701' }: ReportFinancialTabProps) {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const colors = [tenantColor, '#10b981', '#f59e0b', '#06b6d4', '#6366f1', '#ec4899'];
  const methodDonutData = (data?.byMethod || []).map((m, idx) => ({
    label: m.label || m.method,
    value: m.amount,
    color: colors[idx % colors.length],
  }));

  const methodBarData = (data?.byMethod || []).map((m) => ({
    label: m.label || m.method,
    value: m.amount,
    formattedValue: formatBRL(m.amount),
  }));

  return (
    <div className="space-y-6">
      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatBRL(data?.summary?.grossRevenue || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            {data?.summary?.totalTransactions || 0} transações
          </span>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Ticket Médio</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatBRL(data?.summary?.averageTicket || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">Média por atendimento</span>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Sinal Anti-Falta (PIX)</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {formatBRL(data?.antiNoShowStats?.depositCollected || 0)}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            {data?.antiNoShowStats?.depositCount || 0} sinais diretos na sua conta
          </span>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-rose-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Crédito / Fiado em Aberto</span>
            <CreditCard className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {formatBRL(data?.creditAccounts?.totalDebtOpen || 0)}
          </div>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
            {data?.creditAccounts?.activeDebtorsCount || 0} contas devedoras ativas
          </span>
        </div>
      </div>

      {/* Distribuição por Meio de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Mix de Formas de Pagamento
          </h3>
          <ReportDonutChart data={methodDonutData} centerLabel="Receita" isCurrency={true} size={150} />
        </div>

        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Valores por Método (R$)
          </h3>
          <ReportBarChart
            data={methodBarData}
            height={220}
            orientation="horizontal"
            primaryColor={tenantColor}
            showRank={false}
          />
        </div>
      </div>

      {/* Destaque Sinal PIX Anti-Falta */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-700 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Blindagem Financeira com Sinal PIX Antecipado
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              O MarqueSuaHora transfere 100% dos depósitos de sinal diretamente para a chave PIX do seu negócio, sem retenção de gateway. No período selecionado, você arrecadou{' '}
              <strong className="text-slate-900 font-mono font-bold">
                {formatBRL(data?.antiNoShowStats?.depositCollected || 0)}
              </strong>{' '}
              em sinais, garantindo faturamento mesmo em caso de cancelamentos tardios ou no-shows.
            </p>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-amber-800 bg-amber-500/20 px-3 py-1 rounded-lg">
              <span>Zero taxa de intermediação retida pela plataforma</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
