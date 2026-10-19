'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { formatLocalDateToYMD, getMonthGridDays } from '@/lib/dateUtils';
import { ScheduleAppointment, ProfessionalItem, BlockItem } from './types';
import { StatusColors, getDefaultStatusColors } from './AgendaStatusColorPicker';

interface AgendaMonthGridProps {
  currentDate: Date;
  professionals?: ProfessionalItem[];
  selectedProfessionalId?: string;
  appointments: ScheduleAppointment[];
  blocks?: BlockItem[];
  statusColors?: StatusColors;
  onDayClick: (date: Date) => void;
  onSlotClick: (dateStr: string, timeStr: string, professionalId?: string) => void;
  onAppointmentClick: (appt: ScheduleAppointment) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function AgendaMonthGrid({
  currentDate,
  selectedProfessionalId = '',
  appointments,
  blocks = [],
  statusColors: statusColorsProp,
  onDayClick,
  onSlotClick,
  onAppointmentClick
}: AgendaMonthGridProps) {
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_primary_color') || '#5c0701';
    }
    return '#5c0701';
  });

  const [activeStatusColors, setActiveStatusColors] = useState<StatusColors>(() => {
    if (statusColorsProp) return statusColorsProp;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('marquesuahora_agenda_status_colors');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return getDefaultStatusColors(tenantPrimaryColor);
  });

  useEffect(() => {
    if (statusColorsProp) {
      setActiveStatusColors(statusColorsProp);
    }
  }, [statusColorsProp]);

  useEffect(() => {
    const handleStatusSync = (e: any) => {
      if (e?.detail) setActiveStatusColors(e.detail);
    };
    window.addEventListener('marquesuahora_status_colors_sync', handleStatusSync);
    return () => window.removeEventListener('marquesuahora_status_colors_sync', handleStatusSync);
  }, []);

  useEffect(() => {
    const syncColor = () => {
      const saved = localStorage.getItem('tenant_primary_color');
      if (saved) setTenantPrimaryColor(saved);
    };
    syncColor();
    const handleTenantSync = (e: any) => {
      if (e?.detail?.primaryColor) {
        setTenantPrimaryColor(e.detail.primaryColor);
      } else {
        syncColor();
      }
    };
    window.addEventListener('storage', syncColor);
    window.addEventListener('marquesuahora_tenant_sync', handleTenantSync);
    return () => {
      window.removeEventListener('storage', syncColor);
      window.removeEventListener('marquesuahora_tenant_sync', handleTenantSync);
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Matriz de 42 dias para o mês
  const gridCells = useMemo(() => {
    return getMonthGridDays(year, month);
  }, [year, month]);

  const todayStr = formatLocalDateToYMD(new Date());

  // Indexação rápida de agendamentos por data YYYY-MM-DD
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, ScheduleAppointment[]> = {};

    appointments.forEach((appt) => {
      if (appt.status === 'CANCELLED') return;
      if (selectedProfessionalId && appt.professionalId !== selectedProfessionalId) return;

      const dateStr = formatLocalDateToYMD(appt.date);
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(appt);
    });

    // Ordena por horário de início
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  }, [appointments, selectedProfessionalId]);

  // Indexação rápida de bloqueios por data ou dia da semana
  const blocksByDate = useMemo(() => {
    const map: Record<string, BlockItem[]> = {};

    blocks.forEach((block) => {
      if (selectedProfessionalId && block.professionalId && block.professionalId !== selectedProfessionalId) {
        return;
      }
      if (block.date) {
        const dateStr = formatLocalDateToYMD(block.date);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(block);
      }
    });

    return map;
  }, [blocks, selectedProfessionalId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Cabeçalho dos Dias da Semana */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200/80 text-center select-none">
        {WEEKDAYS.map((wd, idx) => (
          <div
            key={wd}
            className={`py-3 text-[11px] font-bold uppercase tracking-wider ${
              idx >= 5 ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Grade de 42 Células (6 semanas) */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200/70 bg-slate-200/40">
        {gridCells.map((cell) => {
          const isToday = cell.dateStr === todayStr;
          const dayAppts = appointmentsByDate[cell.dateStr] || [];
          const dayBlocks = blocksByDate[cell.dateStr] || [];
          const hasAppointments = dayAppts.length > 0;
          const visibleChips = dayAppts.length <= 4 ? dayAppts : dayAppts.slice(0, 3);
          const hiddenCount = dayAppts.length - visibleChips.length;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onDayClick(cell.date)}
              className={`min-h-[135px] sm:min-h-[155px] lg:min-h-[170px] p-2 flex flex-col justify-between transition-colors cursor-pointer group relative ${
                cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 opacity-60'
              } ${isToday ? 'bg-purple-50/20' : ''} hover:bg-slate-50/90`}
            >
              {/* Linha Superior da Célula: Número do Dia + Indicador */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? 'w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs'
                      : cell.isCurrentMonth
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.date.getDate()}
                </span>

                <div className="flex items-center gap-1">
                  {hasAppointments && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {dayAppts.length}
                    </span>
                  )}
                  {dayBlocks.length > 0 && (
                    <span
                      className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                      title="Possui bloqueios de horário neste dia"
                    />
                  )}
                </div>
              </div>

              {/* Lista Vertical de Agendamentos (Cards com Horário Menor, Nome da Cliente e Serviço) */}
              <div className="flex-1 my-1.5 space-y-1.5 overflow-y-auto max-h-[125px] sm:max-h-[145px] pr-0.5">
                {visibleChips.map((appt) => {
                  const clientFullName = appt.client?.name || 'Cliente';
                  const profName = appt.professional?.name ? appt.professional.name.split(' ')[0] : '';
                  const serviceName = appt.service?.name || (appt.items?.[0]?.service?.name) || 'Atendimento';

                  const procColor = (activeStatusColors && activeStatusColors[appt.status as keyof StatusColors])
                    || (getDefaultStatusColors(tenantPrimaryColor)[appt.status as keyof StatusColors])
                    || tenantPrimaryColor;

                  return (
                    <div
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appt);
                      }}
                      style={{ borderLeftWidth: '3.5px', borderLeftColor: procColor }}
                      className="p-1 sm:p-1.5 rounded-lg bg-white hover:bg-slate-50/90 text-left border border-slate-200/80 shadow-2xs transition-all hover:scale-[1.01] hover:shadow-xs cursor-pointer group/item relative overflow-hidden"
                      title={`${appt.startTime} - ${clientFullName} | ${serviceName}${profName ? ` (${profName})` : ''}`}
                    >
                      {/* Topo: Horário | Nome do Cliente */}
                      <div className="flex items-baseline gap-1 text-[9.5px] leading-tight min-w-0">
                        <span className="font-mono font-extrabold shrink-0 text-slate-800 text-[9px]">
                          {appt.startTime}
                        </span>
                        <span className="font-bold opacity-40 shrink-0 text-[8.5px]">|</span>
                        <span className="font-extrabold truncate text-slate-900 text-[10px] sm:text-[10.5px]">
                          {clientFullName}
                        </span>
                      </div>

                      {/* Base: Procedimento / Serviço e Profissional */}
                      <div className="flex items-center justify-between gap-1 text-[8.5px] text-slate-600 truncate leading-tight mt-0.5">
                        <span className="truncate font-semibold">{serviceName}</span>
                        {profName && (
                          <span className="truncate text-slate-400 font-medium text-[8px] shrink-0">
                            {profName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <div className="text-[9px] font-bold text-slate-600 hover:text-slate-900 pl-1 pt-0.5">
                    +{hiddenCount} {hiddenCount === 1 ? 'outro' : 'outros'}
                  </div>
                )}
              </div>

              {/* Ação Rápida de Agendamento no Rodapé da Célula */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 group-hover:text-slate-600 transition-colors">
                  {dayAppts.length === 0 ? 'Livre' : 'Ver dia'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotClick(cell.dateStr, '09:00', selectedProfessionalId || undefined);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded-md"
                  title="Novo agendamento neste dia"
                >
                  + Agendar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
