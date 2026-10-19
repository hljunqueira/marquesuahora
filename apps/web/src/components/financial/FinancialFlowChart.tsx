'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { TransactionItem } from '@/app/dashboard/financeiro/page';

interface FinancialFlowChartProps {
  transactions: TransactionItem[];
  tenantPrimaryColor?: string;
}

type GroupMode = 'MONTHLY' | 'WEEKLY' | 'DAILY';

interface ChartBucket {
  key: string;
  label: string;
  sublabel?: string;
  income: number;
  expense: number;
  net: number;
}

export function FinancialFlowChart({
  transactions = [],
  tenantPrimaryColor = '#5c0701'
}: FinancialFlowChartProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>('MONTHLY');
  const [hoveredBucket, setHoveredBucket] = useState<ChartBucket | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  // Agrupa as transações reais conforme o modo selecionado
  const buckets = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];

    if (groupMode === 'MONTHLY') {
      // Últimos 6 meses
      const result: ChartBucket[] = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;

        const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${String(y).slice(2)}`;

        result.push({
          key,
          label,
          sublabel: `${y}`,
          income: 0,
          expense: 0,
          net: 0
        });
      }

      const map = new Map(result.map((b) => [b.key, b]));

      for (const t of list) {
        if (!t.date) continue;
        const monthKey = t.date.slice(0, 7);
        const bucket = map.get(monthKey);
        if (bucket) {
          const amt = Number(t.amount) || 0;
          if (t.type === 'INCOME') bucket.income += amt;
          else if (t.type === 'EXPENSE') bucket.expense += amt;
          bucket.net = bucket.income - bucket.expense;
        }
      }

      return result;
    }

    if (groupMode === 'WEEKLY') {
      // Últimas 5 semanas
      const result: ChartBucket[] = [];
      const now = new Date();
      now.setHours(12, 0, 0, 0);

      for (let i = 4; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - (i * 7 + 6));
        const end = new Date(now);
        end.setDate(now.getDate() - i * 7);

        const startStr = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
        const endStr = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`;
        const key = `W-${i}`;

        result.push({
          key,
          label: i === 0 ? 'Esta Semana' : `Semana -${i}`,
          sublabel: `${startStr} a ${endStr}`,
          income: 0,
          expense: 0,
          net: 0
        });
      }

      // Atribui transações às semanas
      for (const t of list) {
        if (!t.date) continue;
        const tDate = new Date(`${t.date}T12:00:00`);
        const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays < 35) {
          const weekIdx = Math.floor(diffDays / 7);
          const targetBucket = result[4 - weekIdx];
          if (targetBucket) {
            const amt = Number(t.amount) || 0;
            if (t.type === 'INCOME') targetBucket.income += amt;
            else if (t.type === 'EXPENSE') targetBucket.expense += amt;
            targetBucket.net = targetBucket.income - targetBucket.expense;
          }
        }
      }

      return result;
    }

    // Modo DAILY: últimos 10 dias
    const result: ChartBucket[] = [];
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;

      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
      const label = `${day}/${m}`;

      result.push({
        key,
        label,
        sublabel: weekday,
        income: 0,
        expense: 0,
        net: 0
      });
    }

    const map = new Map(result.map((b) => [b.key, b]));

    for (const t of list) {
      if (!t.date) continue;
      const dayKey = t.date.slice(0, 10);
      const bucket = map.get(dayKey);
      if (bucket) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'INCOME') bucket.income += amt;
        else if (t.type === 'EXPENSE') bucket.expense += amt;
        bucket.net = bucket.income - bucket.expense;
      }
    }

    return result;
  }, [transactions, groupMode]);

  // Encontra o valor máximo para dimensionamento proporcional das barras
  const maxVal = useMemo(() => {
    let max = 0;
    for (const b of buckets) {
      if (b.income > max) max = b.income;
      if (b.expense > max) max = b.expense;
    }
    return max > 0 ? max : 1000;
  }, [buckets]);

  // Totais agregados do gráfico
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const b of buckets) {
      income += b.income;
      expense += b.expense;
    }
    return {
      income,
      expense,
      net: income - expense
    };
  }, [buckets]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
      {/* Cabeçalho do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Comparativo de Entradas & Saídas
              </h3>
              <p className="text-[11px] text-slate-500">
                Visualização do fluxo real de caixa e saldo líquido por período
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Modo (Mensal / Semanal / Diário) & Legenda */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGroupMode('MONTHLY')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                groupMode === 'MONTHLY'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setGroupMode('WEEKLY')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                groupMode === 'WEEKLY'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setGroupMode('DAILY')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                groupMode === 'DAILY'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Diário
            </button>
          </div>

          {/* Legenda das Barras */}
          <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-200 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span className="font-medium text-slate-600">Entradas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span className="font-medium text-slate-600">Saídas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Sumário Rápido do Período no Gráfico */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/50 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Entrado
          </span>
          <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600">
            {formatBRL(totals.income)}
          </span>
        </div>
        <div className="border-x border-slate-200/70">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Saído
          </span>
          <span className="text-xs sm:text-sm font-mono font-bold text-rose-600">
            {formatBRL(totals.expense)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Resultado do Período
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold ${
              totals.net >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
          >
            {formatBRL(totals.net)}
          </span>
        </div>
      </div>

      {/* Área das Barras do Gráfico */}
      <div className="relative pt-6 pb-2">
        {/* Linhas de Grade de Fundo */}
        <div className="absolute inset-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="w-full border-b border-dashed border-slate-200" />
          <div className="w-full border-b border-dashed border-slate-200" />
          <div className="w-full border-b border-dashed border-slate-200" />
        </div>

        {/* Colunas do Gráfico */}
        <div className="relative grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 items-end h-52 sm:h-56 z-10 px-1">
          {buckets.map((b) => {
            const incomeHeight = Math.max((b.income / maxVal) * 100, b.income > 0 ? 6 : 0);
            const expenseHeight = Math.max((b.expense / maxVal) * 100, b.expense > 0 ? 6 : 0);
            const isHovered = hoveredBucket?.key === b.key;

            return (
              <div
                key={b.key}
                onMouseEnter={() => setHoveredBucket(b)}
                onMouseLeave={() => setHoveredBucket(null)}
                className="h-full flex flex-col justify-end items-center group cursor-pointer relative"
              >
                {/* Par de Barras Verticais */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full pb-2">
                  {/* Barra de Entradas (Esmeralda) */}
                  <div className="w-1/2 max-w-[28px] h-full flex items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${incomeHeight}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className={`w-full rounded-t-md sm:rounded-t-lg transition-all ${
                        isHovered ? 'bg-emerald-600 shadow-sm brightness-105' : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                      style={{ minHeight: b.income > 0 ? '6px' : '0' }}
                    />
                  </div>

                  {/* Barra de Saídas (Rosa/Vermelho) */}
                  <div className="w-1/2 max-w-[28px] h-full flex items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${expenseHeight}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className={`w-full rounded-t-md sm:rounded-t-lg transition-all ${
                        isHovered ? 'bg-rose-600 shadow-sm brightness-105' : 'bg-rose-500 hover:bg-rose-600'
                      }`}
                      style={{ minHeight: b.expense > 0 ? '6px' : '0' }}
                    />
                  </div>
                </div>

                {/* Rótulo Inferior da Coluna */}
                <div className="pt-2 border-t border-slate-200 w-full text-center select-none">
                  <span
                    className={`text-[10px] sm:text-xs block font-bold truncate ${
                      isHovered ? 'text-slate-900 font-extrabold' : 'text-slate-600'
                    }`}
                  >
                    {b.label}
                  </span>
                  {b.sublabel && (
                    <span className="text-[9px] text-slate-400 block truncate">
                      {b.sublabel}
                    </span>
                  )}
                </div>

                {/* Tooltip Flutuante */}
                {isHovered && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white rounded-xl py-1.5 px-3 shadow-xl pointer-events-none whitespace-nowrap text-left border border-slate-700 animate-in fade-in duration-150">
                    <p className="text-[10px] font-semibold text-slate-300 pb-1 border-b border-slate-700 mb-1">
                      {b.label} {b.sublabel ? `(${b.sublabel})` : ''}
                    </p>
                    <div className="space-y-0.5 text-[10px] font-mono">
                      <div className="flex items-center justify-between gap-3 text-emerald-400">
                        <span>Entradas:</span>
                        <span className="font-bold">{formatBRL(b.income)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-rose-400">
                        <span>Saídas:</span>
                        <span className="font-bold">{formatBRL(b.expense)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-white pt-1 border-t border-slate-800">
                        <span>Saldo:</span>
                        <span className={`font-bold ${b.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {formatBRL(b.net)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
