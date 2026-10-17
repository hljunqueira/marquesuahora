'use client';

import React, { useState, useEffect } from 'react';
import { ScheduleAppointment, ProfessionalItem, BlockItem } from './types';

interface AgendaWeeklyGridProps {
  dates: Date[];
  viewMode?: 'week' | 'day';
  professionals?: ProfessionalItem[];
  selectedProfessionalId?: string;
  appointments: ScheduleAppointment[];
  blocks?: BlockItem[];
  onSlotClick: (dateStr: string, timeStr: string, professionalId?: string) => void;
  onAppointmentClick: (appt: ScheduleAppointment) => void;
  onBlockClick?: (block: BlockItem) => void;
  onReschedule?: (
    appointmentId: string,
    targetDateStr: string,
    targetTimeStr: string,
    targetProfessionalId?: string
  ) => Promise<void>;
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00'
];

export function AgendaWeeklyGrid({
  dates,
  viewMode = 'week',
  professionals = [],
  selectedProfessionalId = '',
  appointments,
  blocks = [],
  onSlotClick,
  onAppointmentClick,
  onBlockClick,
  onReschedule
}: AgendaWeeklyGridProps) {
  // Relógio em tempo real para a Linha "Agora"
  const [now, setNow] = useState<Date>(new Date());
  const [draggedApptId, setDraggedApptId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isDayModeWithMultiplePros =
    viewMode === 'day' && !selectedProfessionalId && professionals.length > 1;

  // Em modo dia com toda a equipe, as colunas são os profissionais
  // Em modo semana ou dia filtrado, as colunas são as datas
  const activeColumns = isDayModeWithMultiplePros
    ? professionals.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: 'Profissional',
        professionalId: p.id,
        date: dates[0]
      }))
    : dates.map((d) => ({
        id: d.toISOString().slice(0, 10),
        title: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        subtitle: String(d.getDate()),
        professionalId: selectedProfessionalId || undefined,
        date: d
      }));

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Cabeçalho de Colunas */}
      <div className="grid grid-cols-[64px_repeat(auto-fit,minmax(0,1fr))] border-b border-slate-200/80 bg-slate-50/70">
        <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200/60 text-center">
          Hora
        </div>

        {activeColumns.map((col, idx) => {
          const isCurrentDay = isToday(col.date);

          return (
            <div
              key={col.id || idx}
              className={`p-3 text-center border-r last:border-r-0 border-slate-200/60 ${
                isCurrentDay ? 'bg-tenant-light' : ''
              }`}
            >
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block truncate ${
                  isCurrentDay ? 'text-tenant-primary' : 'text-slate-400'
                }`}
              >
                {col.title}
              </span>
              <span
                className={`text-base font-extrabold block mt-0.5 truncate ${
                  isDayModeWithMultiplePros
                    ? 'text-xs text-slate-500 font-semibold'
                    : isCurrentDay
                    ? 'w-7 h-7 mx-auto rounded-full bg-tenant-primary text-white flex items-center justify-center font-bold'
                    : 'text-slate-800'
                }`}
              >
                {col.subtitle}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grade de Horários */}
      <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
        {HOURS.map((hour) => {
          const hourNum = parseInt(hour.slice(0, 2), 10);
          const isThisHour = currentHour === hourNum;
          const minuteOffsetPercent = (currentMinute / 60) * 100;

          return (
            <div
              key={hour}
              className="grid grid-cols-[64px_repeat(auto-fit,minmax(0,1fr))] min-h-[76px] relative"
            >
              {/* Rótulo da Hora */}
              <div className="p-2 border-r border-slate-200/60 text-[11px] font-mono font-bold text-slate-400 text-center flex items-start justify-center pt-2 select-none">
                {hour}
              </div>

              {/* Colunas Ativas */}
              {activeColumns.map((col, cIdx) => {
                const dateStr = col.date.toISOString().slice(0, 10);
                const dayOfWeek = col.date.getDay();
                const isCurrentDayCol = isToday(col.date);

                // Busca agendamentos neste slot
                const apptsInSlot = appointments.filter((a) => {
                  const aDateStr =
                    typeof a.date === 'string'
                      ? a.date.slice(0, 10)
                      : new Date(a.date).toISOString().slice(0, 10);
                  const matchesDate = aDateStr === dateStr;
                  const matchesHour = a.startTime.startsWith(hour.slice(0, 2));
                  const matchesProf = col.professionalId
                    ? a.professionalId === col.professionalId
                    : true;
                  return matchesDate && matchesHour && matchesProf;
                });

                // Busca bloqueios neste slot
                const blockInSlot = blocks.find((b) => {
                  const bDateStr = b.date
                    ? typeof b.date === 'string'
                      ? b.date.slice(0, 10)
                      : new Date(b.date).toISOString().slice(0, 10)
                    : null;
                  const matchDate = bDateStr === dateStr || b.dayOfWeek === dayOfWeek;
                  const matchHour = b.startTime <= hour && b.endTime > hour;
                  const matchProf = col.professionalId
                    ? !b.professionalId || b.professionalId === col.professionalId
                    : true;
                  return matchDate && matchHour && matchProf;
                });

                return (
                  <div
                    key={cIdx}
                    onDragOver={(e) => {
                      if (!blockInSlot && apptsInSlot.length === 0) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      try {
                        const raw = e.dataTransfer.getData('text/plain');
                        if (!raw) return;
                        const data = JSON.parse(raw);
                        if (data?.id && onReschedule) {
                          await onReschedule(data.id, dateStr, hour, col.professionalId);
                        }
                      } catch (err) {
                        console.error('Falha ao processar drop de agendamento:', err);
                      } finally {
                        setDraggedApptId(null);
                      }
                    }}
                    onClick={() => {
                      if (blockInSlot) {
                        onBlockClick?.(blockInSlot);
                      } else if (apptsInSlot.length === 0) {
                        onSlotClick(dateStr, hour, col.professionalId);
                      }
                    }}
                    className={`border-r last:border-r-0 border-slate-100 p-1.5 transition-colors relative group ${
                      blockInSlot
                        ? 'bg-slate-50/70 cursor-pointer'
                        : apptsInSlot.length === 0
                        ? 'hover:bg-purple-50/30 cursor-pointer'
                        : ''
                    }`}
                  >
                    {/* Linha do Tempo AGORA */}
                    {isCurrentDayCol && isThisHour && (
                      <div
                        style={{ top: `${minuteOffsetPercent}%` }}
                        className="absolute left-0 right-0 z-20 border-t-2 border-tenant-primary pointer-events-none flex items-center"
                      >
                        <span className="bg-tenant-primary text-white text-[9px] font-mono font-bold px-1 py-0.5 rounded-xs -mt-2 ml-1 shadow-xs">
                          {String(currentHour).padStart(2, '0')}:
                          {String(currentMinute).padStart(2, '0')}
                        </span>
                      </div>
                    )}

                    {/* Bloqueio de Horário */}
                    {blockInSlot && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlockClick?.(blockInSlot);
                        }}
                        className="w-full h-full rounded-xl bg-slate-200/80 hover:bg-slate-300/80 p-2 text-slate-700 flex flex-col justify-center text-[11px] font-semibold cursor-pointer border border-slate-300/70 transition-all shadow-2xs group/block"
                        title="Clique para desbloquear ou gerenciar este horário"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Bloqueado
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover/block:text-red-600 font-bold transition-colors">
                            Desbloquear
                          </span>
                        </div>
                        <span className="truncate font-medium text-slate-800">{blockInSlot.reason}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {blockInSlot.startTime} - {blockInSlot.endTime}
                        </span>
                      </div>
                    )}

                    {/* Agendamentos com Suporte a Drag and Drop */}
                    {apptsInSlot.map((appt) => {
                      const statusStyles = {
                        CONFIRMED: 'border-emerald-500 bg-emerald-50/80 text-emerald-950',
                        IN_SERVICE: 'border-purple-600 bg-purple-50/90 text-purple-950 ring-1 ring-purple-600/20',
                        COMPLETED: 'border-slate-300 bg-slate-100/80 text-slate-600',
                        NO_SHOW: 'border-amber-500 bg-amber-50/80 text-amber-950',
                        CANCELLED: 'border-red-300 bg-red-50/50 text-slate-400 line-through',
                        PENDING: 'border-blue-500 bg-blue-50/80 text-blue-950'
                      }[appt.status] || 'border-slate-400 bg-slate-50 text-slate-800';

                      const statusLabels = {
                        CONFIRMED: 'Confirmado',
                        IN_SERVICE: 'Em atendimento',
                        COMPLETED: 'Concluído',
                        NO_SHOW: 'No-Show',
                        CANCELLED: 'Cancelado',
                        PENDING: 'Pendente'
                      }[appt.status] || appt.status;

                      const isBeingDragged = draggedApptId === appt.id;

                      return (
                        <div
                          key={appt.id}
                          draggable={true}
                          onDragStart={(e) => {
                            setDraggedApptId(appt.id);
                            e.dataTransfer.setData(
                              'text/plain',
                              JSON.stringify({
                                id: appt.id,
                                date: dateStr,
                                time: hour,
                                professionalId: appt.professionalId
                              })
                            );
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setDraggedApptId(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(appt);
                          }}
                          className={`p-2.5 rounded-xl border-l-4 shadow-xs text-xs cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:scale-[1.01] mb-1.5 last:mb-0 ${
                            isBeingDragged ? 'opacity-40 scale-95' : ''
                          } ${statusStyles}`}
                          title="Clique para ver detalhes ou arraste para remarcar"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="truncate">{appt.client?.name}</span>
                            <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1">
                              {appt.startTime} - {appt.endTime || ''}
                            </span>
                          </div>

                          <p className="text-[11px] opacity-75 truncate mt-0.5 font-medium">
                            {appt.service?.name}
                          </p>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] pt-1 border-t border-black/5">
                            <span className="truncate font-medium opacity-90">
                              {statusLabels}
                            </span>
                            <span className="font-mono font-bold shrink-0 ml-1">
                              R$ {Number(appt.totalPrice).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
