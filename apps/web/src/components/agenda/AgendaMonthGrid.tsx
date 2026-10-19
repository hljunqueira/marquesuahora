'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { formatLocalDateToYMD, getMonthGridDays } from '@/lib/dateUtils';
import { ScheduleAppointment, ProfessionalItem, BlockItem } from './types';

interface AgendaMonthGridProps {
  currentDate: Date;
  professionals?: ProfessionalItem[];
  selectedProfessionalId?: string;
  appointments: ScheduleAppointment[];
  blocks?: BlockItem[];
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
  onDayClick,
  onSlotClick,
  onAppointmentClick
}: AgendaMonthGridProps) {
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_primary_color') || '#7C3AED';
    }
    return '#7C3AED';
  });

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
          const visibleChips = dayAppts.slice(0, 3);
          const hiddenCount = dayAppts.length - visibleChips.length;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onDayClick(cell.date)}
              className={`min-h-[115px] sm:min-h-[135px] p-2 flex flex-col justify-between transition-colors cursor-pointer group relative ${
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

              {/* Lista Compacta de Agendamentos (Chips) */}
              <div className="flex-1 my-1.5 space-y-1 overflow-hidden">
                {visibleChips.map((appt) => {
                  const clientFirstName = (appt.client?.name || 'Cliente').split(' ')[0];
                  const svcColor = appt.service?.color?.trim();
                  const hasCustomSvcColor = svcColor && svcColor.toUpperCase() !== '#3B82F6';
                  const profColor = appt.professional?.color?.trim();
                  const hasCustomProfColor = profColor && profColor.toUpperCase() !== '#7C3AED' && profColor.toUpperCase() !== '#3B82F6';

                  const procColor = hasCustomSvcColor
                    ? svcColor
                    : hasCustomProfColor
                    ? profColor
                    : tenantPrimaryColor;

                  return (
                    <div
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appt);
                      }}
                      style={{ borderLeftColor: procColor }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] text-slate-700 font-medium truncate border-l-2 border border-slate-200/60 shadow-2xs transition-all hover:scale-[1.02]"
                      title={`${appt.startTime} - ${appt.client?.name} (${appt.service?.name})`}
                    >
                      <span className="font-mono text-slate-500 shrink-0 text-[9px]">
                        {appt.startTime}
                      </span>
                      <span className="truncate font-semibold text-slate-800">
                        {clientFirstName}
                      </span>
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <div className="text-[9px] font-bold text-purple-700 hover:text-purple-900 pl-1">
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
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded-md hover:bg-purple-100"
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
