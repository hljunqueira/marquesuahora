'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Mapa com o resumo de cada coluna (contagem de agendamentos e primeiro horário)
  const columnsMetadata = useMemo(() => {
    const meta: Record<string, { firstApptTime: string | null; apptsCount: number }> = {};

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
      meta[colKey] = { firstApptTime, apptsCount: colAppts.length };
    });

    return meta;
  }, [activeColumns, appointments]);

  // Auto-scroll suave no mobile para posicionar no dia de hoje
  useEffect(() => {
    if (scrollContainerRef.current && viewMode === 'week') {
      const todayIndex = activeColumns.findIndex((c) => isToday(c.date));
      if (todayIndex > 0) {
        const targetScroll = Math.max(0, 60 + (todayIndex - 1) * 140);
        scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [dates, viewMode, activeColumns]);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Definição de largura das colunas
  // No desktop se expande (1fr), no celular garante mínimo de 140px por dia para ler o nome da cliente perfeitamente
  const columnMinWidth = viewMode === 'day' && !isDayModeWithMultiplePros ? 280 : 140;
  const gridTemplateCols = `60px repeat(${activeColumns.length}, minmax(${columnMinWidth}px, 1fr))`;
  const gridTotalMinWidth = `${60 + activeColumns.length * columnMinWidth}px`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Indicador Mobile Sóbrio de Navegação por Rolagem */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200/80 text-[11px] text-slate-500 font-medium">
        <span>Deslize para ver os dias da semana</span>
        <span className="font-bold text-slate-800">
          {viewMode === 'week' ? 'Semana Completa' : 'Visualização Diária'}
        </span>
      </div>

      {/* Container Unificado com Scroll Horizontal Sincronizado */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto max-h-[72vh] scrollbar-thin relative w-full"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplateCols,
            minWidth: gridTotalMinWidth
          }}
          className="w-full bg-white"
        >
          {/* ========================================================= */}
          {/* 1. CABEÇALHO UNIFICADO (100% ALINHADO COM A PLANILHA)     */}
          {/* ========================================================= */}
          {/* Célula Superior Esquerda (Sticky em X e Y) */}
          <div className="sticky left-0 top-0 z-40 bg-slate-100 border-r border-b border-slate-200/90 p-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center flex items-center justify-center select-none shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
            Hora
          </div>

          {/* Colunas dos Dias (Sticky no topo, exatamente sobre cada dia) */}
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
                className={`sticky top-0 z-20 p-2.5 text-center border-r border-b border-slate-200/90 transition-colors select-none ${
                  isClickable ? 'cursor-pointer hover:bg-slate-100/90 active:bg-slate-200/60' : ''
                } ${isCurrentDay ? 'bg-purple-50/70 border-b-purple-300' : 'bg-slate-50'}`}
                title={isClickable ? 'Clique para abrir o dia detalhado' : undefined}
              >
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider block truncate ${
                    isCurrentDay ? 'text-purple-900 font-extrabold' : 'text-slate-500'
                  }`}
                >
                  {col.title}
                </span>

                <span
                  className={`text-base font-extrabold block mt-0.5 truncate ${
                    isDayModeWithMultiplePros
                      ? 'text-xs text-slate-600 font-semibold'
                      : isCurrentDay
                      ? 'w-7 h-7 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs'
                      : 'text-slate-800'
                  }`}
                >
                  {col.subtitle}
                </span>

                {viewMode === 'week' && (
                  <div className="mt-1">
                    {colMeta?.apptsCount && colMeta.apptsCount > 0 ? (
                      <span className="text-[10px] font-semibold text-slate-600 block truncate">
                        {colMeta.apptsCount} {colMeta.apptsCount === 1 ? 'atendimento' : 'atendimentos'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium block truncate">
                        Livre
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ========================================================= */}
          {/* 2. LINHAS DE HORÁRIOS E CÉLULAS DE ATENDIMENTO            */}
          {/* ========================================================= */}
          {HOURS.map((hour) => {
            const hourNum = parseInt(hour.slice(0, 2), 10);
            const isThisHour = currentHour === hourNum;
            const minuteOffsetPercent = (currentMinute / 60) * 100;

            return (
              <React.Fragment key={hour}>
                {/* Coluna da Hora (Sticky na lateral esquerda) */}
                <div className="sticky left-0 z-30 bg-white border-r border-b border-slate-200/80 p-2 text-[11px] font-mono font-bold text-slate-500 text-center flex items-start justify-center pt-2.5 select-none shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                  {hour}
                </div>

                {/* Células de cada dia para este horário */}
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
                      className={`border-r border-b border-slate-200/70 p-1.5 transition-colors relative group min-h-[66px] flex flex-col justify-start ${
                        blockInSlot
                          ? 'bg-slate-50/80 cursor-pointer'
                          : apptsInSlot.length === 0
                          ? `cursor-pointer ${isCurrentDayCol ? 'bg-purple-50/15 hover:bg-purple-50/40' : 'hover:bg-slate-50'}`
                          : isCurrentDayCol
                          ? 'bg-purple-50/15'
                          : 'bg-white'
                      }`}
                    >
                      {/* Linha do Tempo AGORA */}
                      {isCurrentDayCol && isThisHour && (
                        <div
                          style={{ top: `${minuteOffsetPercent}%` }}
                          className="absolute left-0 right-0 z-20 border-t-2 border-purple-600 pointer-events-none flex items-center"
                        >
                          <span className="bg-purple-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-xs -mt-2 ml-1 shadow-xs">
                            {String(currentHour).padStart(2, '0')}:
                            {String(currentMinute).padStart(2, '0')}
                          </span>
                        </div>
                      )}

                      {/* Indicador sutil e limpo de Horário Livre no hover (SEM faixa verde corrida) */}
                      {apptsInSlot.length === 0 && !blockInSlot && (
                        <div className="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 pointer-events-none">
                          <span className="text-[10px] font-semibold text-slate-400">
                            + Agendar
                          </span>
                        </div>
                      )}

                      {/* Bloqueio de Horário (Almoço, Folga, etc.) */}
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
                            <span className="text-[10px] text-slate-500 group-hover/block:text-rose-600 font-bold transition-colors">
                              Desbloquear
                            </span>
                          </div>
                          <span className="truncate font-medium text-slate-800">
                            {blockInSlot.reason || 'Horário Indisponível'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {blockInSlot.startTime} - {blockInSlot.endTime}
                          </span>
                        </div>
                      )}

                      {/* Agendamentos */}
                      {apptsInSlot.map((appt) => {
                        const hasDeposit = Boolean(appt.depositAmount && Number(appt.depositAmount) > 0);
                        const isWaitingDeposit = hasDeposit && !appt.depositPaid && appt.status === 'PENDING';

                        const statusStyles = isWaitingDeposit
                          ? 'border-l-amber-500 bg-amber-50/95 text-amber-950 border border-amber-300/60'
                          : {
                              CONFIRMED: 'border-l-emerald-600 bg-emerald-50/80 text-emerald-950 border border-emerald-200/70',
                              IN_SERVICE: 'border-l-purple-600 bg-purple-50/90 text-purple-950 border border-purple-200/80',
                              COMPLETED: 'border-l-slate-400 bg-slate-100/80 text-slate-700 border border-slate-200/70',
                              NO_SHOW: 'border-l-amber-500 bg-amber-50/80 text-amber-950 border border-amber-200/70',
                              CANCELLED: 'border-l-rose-400 bg-rose-50/50 text-slate-400 line-through border border-rose-200/50',
                              PENDING: 'border-l-blue-500 bg-blue-50/80 text-blue-950 border border-blue-200/70'
                            }[appt.status] || 'border-l-slate-400 bg-slate-50 text-slate-800 border border-slate-200/70';

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
                            className={`rounded-xl border-l-4 shadow-xs cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] mb-1.5 last:mb-0 p-2 text-xs select-none ${
                              isBeingDragged ? 'opacity-40 scale-95' : ''
                            } ${statusStyles}`}
                            title="Clique para ver detalhes do agendamento ou arraste para remarcar"
                          >
                            {/* Nome da Cliente em Destaque Legível */}
                            <div className="font-bold text-slate-900 truncate text-[11px] sm:text-xs">
                              {appt.client?.name || 'Cliente'}
                            </div>

                            {/* Procedimento / Serviço */}
                            <div className="text-[10px] sm:text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                              {appt.service?.name || 'Procedimento'}
                            </div>

                            {/* Horário e Preço */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-black/5">
                              <span>
                                {appt.startTime}
                                {appt.endTime ? ` - ${appt.endTime}` : ''}
                              </span>
                              <span className="font-bold text-slate-900">
                                R$ {Number(appt.totalPrice || 0).toFixed(0)}
                              </span>
                            </div>

                            {/* Badge de Sinal */}
                            {isWaitingDeposit ? (
                              <div className="mt-1">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                                  Aguardando Sinal
                                </span>
                              </div>
                            ) : hasDeposit && appt.depositPaid ? (
                              <div className="mt-1">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900">
                                  Sinal Pago
                                </span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
