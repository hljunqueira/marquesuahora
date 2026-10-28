'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
        weekday: 'short',
        day: '2-digit',
        month: 'long'
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

    const mDay = monday.getDate();
    const sDay = sunday.getDate();
    const mMonth = monday.toLocaleDateString('pt-BR', { month: 'long' });
    const sMonth = sunday.toLocaleDateString('pt-BR', { month: 'long' });

    if (mMonth === sMonth) {
      return `${mDay} a ${sDay} de ${sMonth}`;
    }
    return `${mDay} de ${mMonth} a ${sDay} de ${sMonth}`;
  };

  const currentDateValue = formatLocalDateToYMD(currentDate);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const handleTriggerDatepicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className="flex flex-col gap-2.5 bg-white p-3 sm:p-4 border-b border-slate-200/80">
      {/* TIER 1: Modos de Visualização + Equipe + Navegação de Período Integrada */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Modos (Mês, Semana, Dia) + Seletor de Equipe / Profissional Único */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-2xl text-xs font-bold text-slate-600">
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
            <div className="flex items-center bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-2xl text-xs font-semibold text-slate-700 shrink-0">
              {professionals.length === 1 ? (
                <span className="font-bold text-slate-800 text-xs truncate max-w-[150px] sm:max-w-none">
                  {professionals[0].name}
                </span>
              ) : (
                <select
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                  className="bg-transparent border-0 outline-hidden font-bold text-slate-800 cursor-pointer text-xs"
                >
                  <option value="">Toda a Equipe</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Navegação Anterior / Hoje / Próximo + Intervalo de Datas + Campo de Data Ajustado */}
        <div className="flex items-center gap-2 justify-between sm:justify-end overflow-hidden">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-2xl shrink-0">
            <button
              onClick={onNavigatePrev}
              className="w-7 h-7 rounded-xl bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateToday}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={onNavigateNext}
              className="w-7 h-7 rounded-xl bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              title="Próximo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 capitalize tracking-tight truncate">
              {formatRangeText()}
            </span>

            {/* Campo Ajustado para Colocar a Data (com ícone, formato legível DD/MM/AAAA e abertura de picker sem corte) */}
            <div
              onClick={handleTriggerDatepicker}
              className="relative flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Ir para data específica"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                {currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={currentDateValue}
                onChange={(e) => {
                  if (e.target.value) {
                    onDateChange(new Date(e.target.value + 'T12:00:00'));
                  }
                }}
                aria-label="Ir para data específica"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: Ações Rápidas (ACIMA da Previsão no Mobile) e Previsão Financeira */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
        {/* Ações da Agenda: Cores dos Status + Bloquear Horário + Novo Agendamento (ACIMA NO MOBILE) */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end order-1 sm:order-2 shrink-0">
          {statusColors && onUpdateStatusColors && (
            <AgendaStatusColorPicker
              tenantPrimaryColor={tenantPrimaryColor || '#5c0701'}
              statusColors={statusColors}
              onUpdateColors={onUpdateStatusColors}
            />
          )}

          <button
            onClick={onNewBlockClick}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Bloquear
          </button>

          <button
            onClick={onNewBookingClick}
            className="px-3 sm:px-4 py-1.5 rounded-xl btn-primary-tenant text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
            style={tenantPrimaryColor ? { backgroundColor: tenantPrimaryColor, borderColor: tenantPrimaryColor } : undefined}
          >
            + Novo
          </button>
        </div>

        {/* Previsão Financeira e Total de Atendimentos: ABAIXO dos botões no Mobile */}
        <div className="flex items-center gap-2 text-xs order-2 sm:order-1">
          {stats && (
            <>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/70 text-[10.5px] sm:text-[11px] shadow-2xs whitespace-nowrap">
                {stats.periodLabel || (viewMode === 'day' ? 'Previsão do dia' : viewMode === 'month' ? 'Previsão do mês' : 'Previsão da semana')}: R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300 hidden xs:inline">•</span>
              <span className="text-slate-500 font-semibold text-[10.5px] sm:text-[11px] whitespace-nowrap hidden xs:inline">
                {stats.totalAppointments} {stats.totalAppointments === 1 ? 'atendimento' : 'atendimentos'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
