'use client';

import React from 'react';
import { Package, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { ReportBarChart } from '../charts/ReportBarChart';

interface ProductItem {
  id: string;
  name: string;
  category?: string | null;
  salePrice: number;
  stock: number;
  minStock: number;
  totalSoldInPeriod: number;
  revenueInPeriod: number;
  isLowStock: boolean;
}

interface ReportProductsTabProps {
  data: {
    summary: {
      totalProducts: number;
      totalStockValuation: number;
      totalItemsSold: number;
      totalProductRevenue: number;
      lowStockAlertCount: number;
    };
    topSold: ProductItem[];
    lowStockList: ProductItem[];
  };
  tenantColor?: string;
}

export function ReportProductsTab({ data, tenantColor = '#5c0701' }: ReportProductsTabProps) {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const topSoldChart = (data?.topSold || []).slice(0, 5).map((p) => ({
    label: p.name.length > 18 ? p.name.slice(0, 16) + '...' : p.name,
    value: p.totalSoldInPeriod,
    formattedValue: `${p.totalSoldInPeriod} un.`,
  }));

  return (
    <div className="space-y-6">
      {/* Resumo de Estoque e Vendas de Produtos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Unidades Vendidas</span>
            <Package className="w-4 h-4" style={{ color: tenantColor }} />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalItemsSold || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Venda no balcão e home care</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Faturamento Produtos</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatBRL(data?.summary?.totalProductRevenue || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">Receita de revenda</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Patrimônio em Estoque</span>
            <CheckCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatBRL(data?.summary?.totalStockValuation || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            {data?.summary?.totalProducts || 0} itens cadastrados
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Alerta de Reposição</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {data?.summary?.lowStockAlertCount || 0}
          </div>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
            Estoque crítico &lt; mínimo
          </span>
        </div>
      </div>

      {/* Gráfico de Mais Vendidos */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Produtos com Maior Saída
        </h3>
        <ReportBarChart data={topSoldChart} height={200} orientation="horizontal" primaryColor={tenantColor} />
      </div>

      {/* Tabela de Produtos com Estoque Crítico */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/90 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Itens que Demandam Reposição
          </h3>
          <span className="text-xs text-rose-600 font-bold">
            {data?.lowStockList?.length || 0} produtos abaixo do mínimo
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 uppercase text-[10px] text-slate-500 font-bold border-b border-slate-200/90">
              <tr>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4 text-center">Estoque Atual</th>
                <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                <th className="py-3 px-4 text-right">Preço Venda</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.lowStockList || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                    Nenhum produto em nível crítico de estoque no momento.
                  </td>
                </tr>
              ) : (
                data.lowStockList.map((prod, idx) => (
                  <tr key={prod.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {prod.name}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-rose-600 font-mono">
                      {prod.stock} un.
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      {prod.minStock} un.
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 font-mono">
                      {formatBRL(prod.salePrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {prod.stock <= 0 ? 'Esgotado' : 'Estoque Baixo'}
                      </span>
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
