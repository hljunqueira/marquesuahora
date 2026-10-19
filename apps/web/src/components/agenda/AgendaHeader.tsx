'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLocalDateToYMD } from '@/lib/dateUtils';
import { ProfessionalItem } from './types';
import { AgendaStatusColorPicker, StatusColors } from './AgendaStatusColorPicker';

interface AgendaHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: 'week' | 'day' | 'month';
  setViewMode: (mode: 'week' | 'day' | 'month') => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  professionals: ProfessionalItem[];
  selectedProfessionalId: string;
  setSelectedProfessionalId: (id: string) => void;
  onNewBookingClick: () => void;
  onNewBlockClick: () => void;
  stats?: {
    totalAppointments: number;
    totalRevenue: number;
    periodLabel?: string;
  };
  statusColors?: StatusColors;
  onUpdateStatusColors?: (colors: StatusColors) => void;
  tenantPrimaryColor?: string;
}

export function AgendaHeader({
  currentDate,
  onDateChange,
  viewMode,
  setViewMode,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  professionals,
  selectedProfessionalId,
  setSelectedProfessionalId,
  onNewBookingClick,
  onNewBlockClick,
  stats,
  statusColors,
  onUpdateStatusColors,
  tenantPrimaryColor
}: AgendaHeaderProps) {
  // Formata o intervalo visível (mês, semana ou dia)
  const formatRangeText = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
      });
    }

    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }

    // Semana: Segunda a Domingo
    const d = new Date(currentDate);
    d.setHours(12, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mText = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const sText = sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${mText} - ${sText}`;
  };

  const currentDateValue = formatLocalDateToYMD(currentDate);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
      {/* Navegador de Datas e Seletor Direto */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={onNavigatePrev}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToday}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Hoje
          </button>
          <button
            onClick={onNavigateNext}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
            title="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Texto da Data + Seletor Direto + Previsão da Semana Embaixo da Data */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 capitalize tracking-tight">
              {formatRangeText()}
            </span>
            <input
              type="date"
              value={currentDateValue}
              onChange={(e) => {
                if (e.target.value) {
                  onDateChange(new Date(e.target.value + 'T12:00:00'));
                }
              }}
              title="Ir para data específica"
              className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2 py-0.5 bg-slate-50 cursor-pointer outline-hidden hover:border-slate-300 transition-colors"
            />
          </div>

          {/* Previsão do Período (Mês, Semana ou Dia) Embaixo da Data */}
          {stats && (
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/70 shadow-2xs">
                {stats.periodLabel || (viewMode === 'day' ? 'Previsão do dia' : viewMode === 'month' ? 'Previsão do mês' : 'Previsão da semana')}: R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-semibold text-[11.5px]">
                {stats.totalAppointments} {stats.totalAppointments === 1 ? 'atendimento' : 'atendimentos'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filtros e Ações (Sem ícones decorativos) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Seletor de Cores de Todos os Status (Pendente, Confirmado, Em Atendimento, Concluído, No-Show, Cancelado) */}
        {statusColors && onUpdateStatusColors && (
          <AgendaStatusColorPicker
            tenantPrimaryColor={tenantPrimaryColor || '#5c0701'}
            statusColors={statusColors}
            onUpdateColors={onUpdateStatusColors}
          />
        )}

        {/* Alternador de Modo (Mês, Semana vs Dia) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Dia
          </button>
        </div>

        {/* Filtro por Profissional */}
        {professionals.length > 0 && (
          <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-700">
            <select
              value={selectedProfessionalId}
              onChange={(e) => setSelectedProfessionalId(e.target.value)}
              className="bg-transparent border-0 outline-hidden font-bold text-slate-800 cursor-pointer"
            >
              <option value="">Toda a Equipe</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Botão Novo Bloqueio */}
        <button
          onClick={onNewBlockClick}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors active:scale-95 cursor-pointer"
        >
          Bloquear Horário
        </button>

        {/* Botão Novo Agendamento */}
        <button
          onClick={onNewBookingClick}
          className="px-4 py-2 rounded-xl btn-primary-tenant text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
        >
          Novo Agendamento
        </button>
      </div>
    </div>
  );
}
