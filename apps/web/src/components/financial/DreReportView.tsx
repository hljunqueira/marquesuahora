'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
  Percent,
  Download,
  Printer
} from 'lucide-react';
import { api } from '@/lib/api';

interface DreData {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    serviceRevenue: number;
    productRevenue: number;
    courseRevenue: number;
    otherRevenue: number;
    grossRevenue: number;
  };
  deductions: {
    cmv: number;
    contributionMargin: number;
  };
  expenses: {
    commissionExpenses: number;
    fixedExpenses: number;
    variableExpenses: number;
    totalExpenses: number;
  };
  result: {
    netProfit: number;
    netMarginPercentage: number;
    isPositive: boolean;
  };
}

export function DreReportView() {
  const [periodFilter, setPeriodFilter] = useState<'CURRENT_MONTH' | 'LAST_30_DAYS' | 'CURRENT_YEAR' | 'ALL_TIME'>('CURRENT_MONTH');
  const [data, setData] = useState<DreData | null>(null);
  const [loading, setLoading] = useState(true);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  const fetchDre = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = '';
      let endDate = '';

      if (periodFilter === 'CURRENT_MONTH') {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        startDate = `${y}-${m}-01`;
        endDate = `${y}-${m}-${new Date(y, now.getMonth() + 1, 0).getDate()}`;
      } else if (periodFilter === 'LAST_30_DAYS') {
        const past = new Date();
        past.setDate(past.getDate() - 30);
        startDate = past.toISOString().slice(0, 10);
        endDate = now.toISOString().slice(0, 10);
      } else if (periodFilter === 'CURRENT_YEAR') {
        const y = now.getFullYear();
        startDate = `${y}-01-01`;
        endDate = `${y}-12-31`;
      }

      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/financial/reports/dre', { params });
      setData(res.data);
    } catch (err) {
      console.error('Erro ao carregar DRE:', err);
    } finally {
      setLoading(false);
    }
  }, [periodFilter]);

  useEffect(() => {
    fetchDre();
  }, [fetchDre]);

  return (
    <div className="space-y-6">
      {/* Topo do DRE: Título e Filtro Temporal */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-900">Demonstrativo de Resultado do Exercício (DRE)</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
              Gerencial
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Apuração contábil e executiva: Receita Bruta &rarr; CMV &rarr; Comissões &rarr; Custos Fixos &rarr; Lucro Líquido Real.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPeriodFilter('CURRENT_MONTH')}
              type="button"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodFilter === 'CURRENT_MONTH' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setPeriodFilter('LAST_30_DAYS')}
              type="button"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodFilter === 'LAST_30_DAYS' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriodFilter('CURRENT_YEAR')}
              type="button"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodFilter === 'CURRENT_YEAR' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Ano Atual
            </button>
            <button
              onClick={() => setPeriodFilter('ALL_TIME')}
              type="button"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodFilter === 'ALL_TIME' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Geral
            </button>
          </div>

          <button
            onClick={() => window.print()}
            type="button"
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors border border-zinc-200"
            title="Imprimir relatório DRE"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 bg-white rounded-2xl border border-zinc-200/80 text-center text-zinc-400">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-zinc-900" />
          <p className="text-xs font-semibold">Consolidando demonstrativo financeiro...</p>
        </div>
      ) : !data ? (
        <div className="py-16 bg-white rounded-2xl border border-zinc-200/80 text-center text-zinc-500 text-xs">
          Nenhum dado financeiro apurado para o período selecionado.
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4 Cards de Síntese Executiva */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                1. Receita Operacional Bruta
              </span>
              <div className="text-xl font-bold text-zinc-900">{formatBRL(data.revenue.grossRevenue)}</div>
              <span className="text-[10px] text-zinc-400">Serviços, produtos e cursos</span>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                2. Deduções / CMV
              </span>
              <div className="text-xl font-bold text-zinc-700">{formatBRL(data.deductions.cmv)}</div>
              <span className="text-[10px] text-zinc-400">Custo direto das mercadorias</span>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                3. Despesas Operacionais
              </span>
              <div className="text-xl font-bold text-zinc-700">{formatBRL(data.expenses.totalExpenses)}</div>
              <span className="text-[10px] text-zinc-400">Comissões, aluguel e custos fixos</span>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  4. Lucro Líquido Real
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    data.result.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  Margem {data.result.netMarginPercentage}%
                </span>
              </div>
              <div
                className={`text-xl font-bold ${
                  data.result.isPositive ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatBRL(data.result.netProfit)}
              </div>
              <span className="text-[10px] text-zinc-400">Caixa livre após deduções</span>
            </div>
          </div>

          {/* Tabela Estruturada do DRE Linha a Linha */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/70">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Estrutura Analítica de Resultados (DRE)
              </h4>
            </div>

            <div className="divide-y divide-zinc-100 text-xs">
              {/* Seção 1: Receitas */}
              <div className="bg-zinc-50/40 p-3 font-bold text-zinc-800 flex justify-between">
                <span>1. RECEITA OPERACIONAL BRUTA</span>
                <span className="font-mono text-zinc-900">{formatBRL(data.revenue.grossRevenue)}</span>
              </div>
              <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                <span className="pl-4">(&plus;) Receita de Procedimentos &amp; Atendimentos</span>
                <span className="font-mono">{formatBRL(data.revenue.serviceRevenue)}</span>
              </div>
              <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                <span className="pl-4">(&plus;) Venda de Produtos e Cosméticos (PDV / Balcão)</span>
                <span className="font-mono">{formatBRL(data.revenue.productRevenue)}</span>
              </div>
              <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                <span className="pl-4">(&plus;) Cursos Online, Treinamentos &amp; Alunas</span>
                <span className="font-mono">{formatBRL(data.revenue.courseRevenue)}</span>
              </div>
              {data.revenue.otherRevenue > 0 && (
                <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                  <span className="pl-4">(&plus;) Outras Entradas do Caixa</span>
                  <span className="font-mono">{formatBRL(data.revenue.otherRevenue)}</span>
                </div>
              )}

              {/* Seção 2: Deduções e CMV */}
              <div className="bg-zinc-50/40 p-3 font-bold text-zinc-800 flex justify-between">
                <span>2. DEDUÇÕES DA RECEITA &amp; CUSTO DE MERCADORIAS (CMV)</span>
                <span className="font-mono text-zinc-700">- {formatBRL(data.deductions.cmv)}</span>
              </div>
              <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                <span className="pl-4">(&minus;) Custo das Mercadorias Vendidas (CMV)</span>
                <span className="font-mono text-rose-600">- {formatBRL(data.deductions.cmv)}</span>
              </div>

              {/* Seção 3: Margem de Contribuição */}
              <div className="bg-zinc-100/60 p-3 font-bold text-zinc-900 flex justify-between border-y border-zinc-200">
                <span>3. (=) MARGEM DE CONTRIBUIÇÃO BRUTA</span>
                <span className="font-mono text-zinc-900">{formatBRL(data.deductions.contributionMargin)}</span>
              </div>

              {/* Seção 4: Despesas Operacionais */}
              <div className="bg-zinc-50/40 p-3 font-bold text-zinc-800 flex justify-between">
                <span>4. DESPESAS OPERACIONAIS</span>
                <span className="font-mono text-zinc-700">- {formatBRL(data.expenses.totalExpenses)}</span>
              </div>
              <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                <span className="pl-4">(&minus;) Repasses de Comissões dos Profissionais</span>
                <span className="font-mono text-rose-600">- {formatBRL(data.expenses.commissionExpenses)}</span>
              </div>
              <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                <span className="pl-4">(&minus;) Despesas Fixas (Aluguel, Luz, Água, Internet)</span>
                <span className="font-mono text-rose-600">- {formatBRL(data.expenses.fixedExpenses)}</span>
              </div>
              <div className="px-6 py-2.5 flex justify-between text-zinc-600">
                <span className="pl-4">(&minus;) Despesas Variáveis e Operacionais</span>
                <span className="font-mono text-rose-600">- {formatBRL(data.expenses.variableExpenses)}</span>
              </div>

              {/* Seção 5: Resultado Operacional Líquido */}
              <div
                className={`p-4 font-bold flex justify-between text-sm ${
                  data.result.isPositive ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
                }`}
              >
                <div>
                  <span>5. (=) RESULTADO OPERACIONAL LÍQUIDO (LUCRO REAL)</span>
                  <span className="block text-[11px] font-medium text-zinc-500 mt-0.5">
                    Margem Líquida Efetiva: {data.result.netMarginPercentage}% sobre a receita bruta
                  </span>
                </div>
                <span className="font-mono text-base">
                  {formatBRL(data.result.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
