'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  onDayClick?: (date: Date) => void;
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
  onDayClick,
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
  const activeColumns = useMemo(() => {
    return isDayModeWithMultiplePros
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
  }, [isDayModeWithMultiplePros, professionals, dates, selectedProfessionalId]);

  // Converte "HH:mm" para minutos desde o início do dia
  const parseTimeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Formata minutos em string sóbria (ex: 120 -> "2h livres", 90 -> "1h30 livres")
  const formatFreeDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h${m} livres`;
    if (h > 0) return `${h}h livres`;
    return `${m}min livres`;
  };

  // Mapa com o resumo de cada coluna: { firstApptTime: string | null, freeGapsByHour: Record<string, string> }
  const columnsMetadata = useMemo(() => {
    const meta: Record<string, { firstApptTime: string | null; freeGapsByHour: Record<string, string> }> = {};

    activeColumns.forEach((col) => {
      const colKey = col.id;
      const dateStr = col.date.toISOString().slice(0, 10);

      // Todos os agendamentos ativos desta coluna
      const colAppts = appointments
        .filter((a) => {
          const aDateStr =
            typeof a.date === 'string'
              ? a.date.slice(0, 10)
              : new Date(a.date).toISOString().slice(0, 10);
          const matchesDate = aDateStr === dateStr;
          const matchesProf = col.professionalId ? a.professionalId === col.professionalId : true;
          return matchesDate && matchesProf && a.status !== 'CANCELLED';
        })
        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      const firstApptTime = colAppts.length > 0 ? colAppts[0].startTime : null;
      const freeGapsByHour: Record<string, string> = {};

      if (colAppts.length === 0) {
        // Dia todo livre: exibe no primeiro slot (08:00)
        freeGapsByHour['08:00'] = 'Dia livre';
      } else {
        // Brecha antes do primeiro agendamento
        const startDayMinutes = parseTimeToMinutes('08:00');
        const firstStart = parseTimeToMinutes(colAppts[0].startTime);
        if (firstStart - startDayMinutes >= 45) {
          freeGapsByHour['08:00'] = formatFreeDuration(firstStart - startDayMinutes);
        }

        // Brechas entre agendamentos consecutivos
        for (let i = 0; i < colAppts.length - 1; i++) {
          const currentEnd = parseTimeToMinutes(colAppts[i].endTime || colAppts[i].startTime);
          const nextStart = parseTimeToMinutes(colAppts[i + 1].startTime);
          const gapMinutes = nextStart - currentEnd;
          if (gapMinutes >= 45) {
            const slotHourNum = Math.floor(currentEnd / 60);
            const slotHourStr = `${String(slotHourNum).padStart(2, '0')}:00`;
            if (HOURS.includes(slotHourStr)) {
              freeGapsByHour[slotHourStr] = formatFreeDuration(gapMinutes);
            }
          }
        }

        // Brecha após o último agendamento até 20:00
        const lastEnd = parseTimeToMinutes(colAppts[colAppts.length - 1].endTime || colAppts[colAppts.length - 1].startTime);
        const endDayMinutes = parseTimeToMinutes('20:00');
        if (endDayMinutes - lastEnd >= 45) {
          const slotHourNum = Math.floor(lastEnd / 60);
          const slotHourStr = `${String(slotHourNum).padStart(2, '0')}:00`;
          if (HOURS.includes(slotHourStr)) {
            freeGapsByHour[slotHourStr] = formatFreeDuration(endDayMinutes - lastEnd);
          }
        }
      }

      meta[colKey] = { firstApptTime, freeGapsByHour };
    });

    return meta;
  }, [activeColumns, appointments]);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Seletor Mobile de Dias (Touch-friendly para Android e iPhone) */}
      {viewMode === 'week' && (
        <div className="sm:hidden flex items-center gap-1.5 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {activeColumns.map((col) => {
            const isCurrentDay = isToday(col.date);
            const colMeta = columnsMetadata[col.id];
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => onDayClick?.(col.date)}
                className={`shrink-0 min-w-[58px] min-h-[46px] rounded-xl flex flex-col items-center justify-center p-1.5 text-center transition-all cursor-pointer ${
                  isCurrentDay
                    ? 'bg-tenant-primary text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                  {col.title}
                </span>
                <span className="text-xs font-extrabold mt-0.5">
                  {col.subtitle}
                </span>
                {colMeta?.firstApptTime && (
                  <span className="text-[9px] font-mono opacity-80 truncate">
                    {colMeta.firstApptTime}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Cabeçalho de Colunas Desktop */}
      <div className="hidden sm:grid grid-cols-[64px_repeat(auto-fit,minmax(0,1fr))] border-b border-slate-200/80 bg-slate-50/70">
        <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200/60 text-center flex items-center justify-center">
          Hora
        </div>

        {activeColumns.map((col, idx) => {
          const isCurrentDay = isToday(col.date);
          const colMeta = columnsMetadata[col.id];
          const isClickable = viewMode === 'week' && Boolean(onDayClick);

          return (
            <div
              key={col.id || idx}
              onClick={() => {
                if (isClickable) {
                  onDayClick?.(col.date);
                }
              }}
              className={`p-2.5 text-center border-r last:border-r-0 border-slate-200/60 transition-colors ${
                isClickable ? 'cursor-pointer hover:bg-slate-100/90 active:bg-slate-200/60' : ''
              } ${isCurrentDay ? 'bg-tenant-light' : ''}`}
              title={isClickable ? 'Clique para abrir o dia detalhado' : undefined}
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
              {viewMode === 'week' && (
                <div className="mt-1">
                  {colMeta?.firstApptTime ? (
                    <span className="text-[10px] font-mono text-slate-500 font-semibold block truncate">
                      1º às {colMeta.firstApptTime}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold block truncate">
                      Dia livre
                    </span>
                  )}
                </div>
              )}
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
              className={`grid grid-cols-[64px_repeat(auto-fit,minmax(0,1fr))] ${
                viewMode === 'week' ? 'min-h-[44px]' : 'min-h-[74px]'
              } relative`}
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
                const colMeta = columnsMetadata[col.id];
                const freeGapLabel = colMeta?.freeGapsByHour?.[hour];

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

                    {/* Destaque Sóbrio de Brecha de Horário Livre (Sem ícone decorativo) */}
                    {freeGapLabel && apptsInSlot.length === 0 && !blockInSlot && (
                      <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-mono text-[10px] font-semibold tracking-tight shadow-2xs">
                          {freeGapLabel}
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
                      const hasDeposit = Boolean(appt.depositAmount && Number(appt.depositAmount) > 0);
                      const isWaitingDeposit = hasDeposit && !appt.depositPaid && appt.status === 'PENDING';

                      const statusStyles = isWaitingDeposit
                        ? 'border-amber-500 bg-amber-50/95 text-amber-950 ring-1 ring-amber-400/50 font-medium'
                        : {
                            CONFIRMED: 'border-emerald-500 bg-emerald-50/80 text-emerald-950',
                            IN_SERVICE: 'border-purple-600 bg-purple-50/90 text-purple-950 ring-1 ring-purple-600/20',
                            COMPLETED: 'border-slate-300 bg-slate-100/80 text-slate-600',
                            NO_SHOW: 'border-amber-500 bg-amber-50/80 text-amber-950',
                            CANCELLED: 'border-red-300 bg-red-50/50 text-slate-400 line-through',
                            PENDING: 'border-blue-500 bg-blue-50/80 text-blue-950'
                          }[appt.status] || 'border-slate-400 bg-slate-50 text-slate-800';

                      const statusLabels = isWaitingDeposit
                        ? 'Aguardando Sinal'
                        : {
                            CONFIRMED: hasDeposit && appt.depositPaid ? 'Confirmado (Sinal)' : 'Confirmado',
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
                          className={`rounded-xl border-l-4 shadow-xs cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:scale-[1.01] mb-1.5 last:mb-0 ${
                            viewMode === 'week' ? 'p-1.5 text-[11px]' : 'p-2.5 text-xs'
                          } ${isBeingDragged ? 'opacity-40 scale-95' : ''} ${statusStyles}`}
                          title="Clique para ver detalhes ou arraste para remarcar"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="truncate">{appt.client?.name}</span>
                            <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1">
                              {appt.startTime}
                            </span>
                          </div>

                          {viewMode !== 'week' && (
                            <p className="text-[11px] opacity-75 truncate mt-0.5 font-medium">
                              {appt.service?.name}
                            </p>
                          )}

                          <div className={`flex items-center justify-between pt-1 border-t border-black/5 ${
                            viewMode === 'week' ? 'text-[9px] mt-1' : 'text-[10px] mt-1.5'
                          }`}>
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
