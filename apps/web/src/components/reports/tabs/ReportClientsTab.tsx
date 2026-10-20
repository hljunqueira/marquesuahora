'use client';

import React, { useState } from 'react';
import { Users, DollarSign, Repeat, AlertCircle, MessageCircle } from 'lucide-react';
import { ReportBarChart } from '../charts/ReportBarChart';

interface ClientItem {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string | null;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  averageTicket: number;
  lastBookingDate?: string | null;
  fidelityStatus: 'VIP' | 'FREQUENT' | 'NEW' | 'AT_RISK';
}

interface ReportClientsTabProps {
  data: {
    summary: {
      totalClients: number;
      activeInPeriod: number;
      frequentCount: number;
      atRiskCount: number;
      averageLtv: number;
    };
    rankingByBookings: ClientItem[];
    rankingBySpent: ClientItem[];
    allClients: ClientItem[];
  };
  tenantColor?: string;
}

export function ReportClientsTab({ data, tenantColor = '#5c0701' }: ReportClientsTabProps) {
  const [viewMode, setViewMode] = useState<'bookings' | 'spent'>('bookings');
  const [search, setSearch] = useState('');

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const statusBadges = {
    VIP: {
      label: 'VIP Diamante',
      badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    },
    FREQUENT: {
      label: 'Frequente',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    },
    NEW: {
      label: 'Novo Cliente',
      badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    },
    AT_RISK: {
      label: 'Em Risco (>45d)',
      badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    },
  };

  const currentList = viewMode === 'bookings' ? data?.rankingByBookings || [] : data?.rankingBySpent || [];

  const filteredList = currentList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  // Top 5 bar chart data
  const topChartData = (data?.rankingByBookings || []).slice(0, 5).map((c) => ({
    label: c.name.split(' ')[0],
    value: c.totalBookings,
    formattedValue: `${c.totalBookings} agendamentos`,
  }));

  const topSpenderData = (data?.rankingBySpent || []).slice(0, 5).map((c) => ({
    label: c.name.split(' ')[0],
    value: c.totalSpent,
    formattedValue: formatBRL(c.totalSpent),
  }));

  const openWhatsApp = (phone: string, clientName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(`Olá ${clientName}! Passando para agradecer por confiar no nosso espaço. Como está seu dia?`);
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Superiores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total de Clientes</span>
            <Users className="w-4 h-4" style={{ color: tenantColor }} />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalClients || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {data?.summary?.activeInPeriod || 0} ativos no período
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Clientes Frequentes</span>
            <Repeat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.frequentCount || 0}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Alta fidelização & retenção
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Ticket Médio por Cliente</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatBRL(data?.summary?.averageLtv || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">Valor vitalício médio</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Clientes em Risco</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.atRiskCount || 0}
          </div>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
            Sem retorno há &gt; 45 dias
          </span>
        </div>
      </div>

      {/* Gráficos Comparativos: Mais Agendaram vs Maiores Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: tenantColor }} />
            <h3 className="text-sm font-bold text-slate-900">
              Top 5 Clientes que Mais Agendaram
            </h3>
          </div>
          <ReportBarChart data={topChartData} height={200} orientation="horizontal" primaryColor={tenantColor} />
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Top 5 Clientes com Maior Faturamento (LTV)
            </h3>
          </div>
          <ReportBarChart data={topSpenderData} height={200} orientation="horizontal" primaryColor={tenantColor} />
        </div>
      </div>

      {/* Tabela Interativa de Ranking com Abas Internas */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header da Tabela */}
        <div className="p-4 border-b border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200/90 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('bookings')}
                style={viewMode === 'bookings' ? { backgroundColor: tenantColor, color: '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  viewMode === 'bookings'
                    ? 'shadow-xs text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Agendamentos
              </button>
              <button
                type="button"
                onClick={() => setViewMode('spent')}
                style={viewMode === 'spent' ? { backgroundColor: tenantColor, color: '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  viewMode === 'spent'
                    ? 'shadow-xs text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Valor Gasto (LTV)
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              ({filteredList.length} clientes listados)
            </span>
          </div>

          <input
            type="text"
            placeholder="Buscar por nome ou WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-slate-300"
          />
        </div>

        {/* Listagem */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 uppercase text-[10px] text-slate-500 font-bold border-b border-slate-200/90">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-center">Fidelidade</th>
                <th className="py-3 px-4 text-center">Agendamentos</th>
                <th className="py-3 px-4 text-right">Total Investido</th>
                <th className="py-3 px-4 text-right">Ticket Médio</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum cliente encontrado para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredList.map((client, idx) => {
                  const badge = statusBadges[client.fidelityStatus] || statusBadges.NEW;
                  return (
                    <tr
                      key={client.id || idx}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                        {idx === 0 && <span className="text-amber-600 font-black">#1</span>}
                        {idx === 1 && <span className="text-slate-500 font-bold">#2</span>}
                        {idx === 2 && <span className="text-amber-800 font-bold">#3</span>}
                        {idx > 2 && <span>#{idx + 1}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {client.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{client.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-900 font-mono">
                          {client.totalBookings}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">
                          ({client.completedBookings} concl.)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                        {formatBRL(client.totalSpent)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 font-mono">
                        {formatBRL(client.averageTicket)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {client.phone && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(client.phone, client.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200/60"
                            title="Conversar via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
