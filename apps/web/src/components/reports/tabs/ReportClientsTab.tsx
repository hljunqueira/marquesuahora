'use client';

import React, { useState } from 'react';
import { Users, DollarSign, Repeat, AlertCircle, MessageCircle, Search, X } from 'lucide-react';
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

  const formatClientName = (fullName: string) => {
    if (!fullName) return 'Cliente';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

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
      c.phone.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
  );

  // Top 5 bar chart data com nomes legíveis
  const topChartData = (data?.rankingByBookings || []).slice(0, 5).map((c: any) => {
    const bookings = c.totalBookings ?? c.bookingsCount ?? 0;
    return {
      label: formatClientName(c.name),
      value: bookings,
      formattedValue: `${bookings} agendamento${bookings === 1 ? '' : 's'}`,
    };
  });

  const topSpenderData = (data?.rankingBySpent || []).slice(0, 5).map((c: any) => ({
    label: formatClientName(c.name),
    value: Number(c.totalSpent || 0),
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: tenantColor }} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total de Clientes</span>
            <Users className="w-4 h-4" style={{ color: tenantColor }} />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalClients ?? (data as any)?.totalActiveClientsInPeriod ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {data?.summary?.activeInPeriod ?? (data as any)?.totalActiveClientsInPeriod ?? 0} ativos no período
          </span>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Clientes Frequentes</span>
            <Repeat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.frequentCount ?? (data as any)?.metrics?.vipCount ?? 0}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Alta fidelização & retenção
          </span>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Ticket Médio por Cliente</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatBRL(data?.summary?.averageLtv ?? (data as any)?.metrics?.averageTicket ?? 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">Valor vitalício médio</span>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[115px]">
          <div className="absolute top-0 inset-x-0 h-1 bg-rose-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Clientes em Risco</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.atRiskCount ?? (data as any)?.metrics?.atRiskCount ?? 0}
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
          <ReportBarChart
            data={topChartData}
            height={200}
            orientation="horizontal"
            primaryColor={tenantColor}
            showRank={true}
          />
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Top 5 Clientes com Maior Faturamento (LTV)
            </h3>
          </div>
          <ReportBarChart
            data={topSpenderData}
            height={200}
            orientation="horizontal"
            primaryColor={tenantColor}
            showRank={true}
          />
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
              ({filteredList.length} clientes encontrados)
            </span>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou celular..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Listagem Tabular */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 uppercase text-[10px] text-slate-500 font-bold border-b border-slate-200/90">
              <tr>
                <th className="py-3 px-4">Posição & Cliente</th>
                <th className="py-3 px-4">Celular</th>
                <th className="py-3 px-4 text-center">Agendamentos</th>
                <th className="py-3 px-4 text-center">Concluídos</th>
                <th className="py-3 px-4 text-right">Total Investido (LTV)</th>
                <th className="py-3 px-4 text-right">Ticket Médio</th>
                <th className="py-3 px-4 text-center">Classificação</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum cliente encontrado com os critérios de filtro.
                  </td>
                </tr>
              ) : (
                filteredList.map((client, idx) => {
                  const badge = statusBadges[client.fidelityStatus] || statusBadges.NEW;
                  return (
                    <tr key={client.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center font-mono shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]" title={client.name}>
                            {client.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500">
                        {client.phone}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                        {client.totalBookings}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-emerald-600 font-mono">
                        {client.completedBookings}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                        {formatBRL(client.totalSpent)}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-600 font-mono">
                        {formatBRL(client.averageTicket)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openWhatsApp(client.phone, client.name)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
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
