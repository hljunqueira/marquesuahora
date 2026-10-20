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
    <div className="flex flex-col gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
      {/* TIER 1: Navegação Temporal & Modos de Visualização */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Esquerda: Controles de Navegação Anterior / Hoje / Próximo + Título da Data + Date Picker */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
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

          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 capitalize tracking-tight whitespace-nowrap">
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
        </div>

        {/* Direita: Modos (Mês, Semana, Dia) + Seletor de Equipe */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap sm:flex-nowrap">
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

          {professionals.length > 0 && (
            <div className="flex items-center bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-2xl text-xs font-semibold text-slate-700">
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
        </div>
      </div>

      {/* TIER 2: Métricas Financeiras & Ações de Operação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        {/* Esquerda: Previsão Financeira e Total de Atendimentos */}
        <div className="flex items-center gap-2 text-xs">
          {stats && (
            <>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70 text-[11px] shadow-2xs">
                {stats.periodLabel || (viewMode === 'day' ? 'Previsão do dia' : viewMode === 'month' ? 'Previsão do mês' : 'Previsão da semana')}: R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-semibold text-[11px]">
                {stats.totalAppointments} {stats.totalAppointments === 1 ? 'atendimento' : 'atendimentos'}
              </span>
            </>
          )}
        </div>

        {/* Direita: Cores dos Status + Bloquear Horário + Novo Agendamento */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {statusColors && onUpdateStatusColors && (
            <AgendaStatusColorPicker
              tenantPrimaryColor={tenantPrimaryColor || '#5c0701'}
              statusColors={statusColors}
              onUpdateColors={onUpdateStatusColors}
            />
          )}

          <button
            onClick={onNewBlockClick}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Bloquear Horário
          </button>

          <button
            onClick={onNewBookingClick}
            className="px-4 py-2 rounded-xl btn-primary-tenant text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
          >
            Novo Agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
