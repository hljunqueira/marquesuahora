'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatLocalDateToYMD } from '@/lib/dateUtils';
import { ScheduleAppointment, ProfessionalItem, BlockItem } from './types';
import { StatusColors, getDefaultStatusColors } from './AgendaStatusColorPicker';

interface AgendaWeeklyGridProps {
  dates: Date[];
  viewMode?: 'week' | 'day';
  professionals?: ProfessionalItem[];
  selectedProfessionalId?: string;
  appointments: ScheduleAppointment[];
  blocks?: BlockItem[];
  statusColors?: StatusColors;
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

// Configuração da Grade de Horários (Idêntico ao GuruAgenda: 07:00 às 21:00)
const START_HOUR = 7; // 07:00
const END_HOUR = 21; // 21:00
const DAY_START_MINUTES = START_HOUR * 60; // 420
const DAY_END_MINUTES = END_HOUR * 60; // 1260

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00'
];

const WEEKDAY_NAMES_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// Converte string "HH:mm" para minutos desde 00:00
function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Formata minutos em string "HH:mm"
function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface LayoutItem {
  id: string;
  type: 'appointment' | 'block';
  rawAppointment?: ScheduleAppointment;
  rawBlock?: BlockItem;
  startMinutes: number;
  endMinutes: number;
  colIndex: number;
  totalCols: number;
}

// Algoritmo de posicionamento de colunas simultâneas (Overlap Layout)
function computeEventsLayout(
  appts: ScheduleAppointment[],
  dayBlocks: BlockItem[]
): LayoutItem[] {
  const items: {
    id: string;
    type: 'appointment' | 'block';
    rawAppointment?: ScheduleAppointment;
    rawBlock?: BlockItem;
    startMinutes: number;
    endMinutes: number;
  }[] = [];

  // 1. Agendamentos
  for (const a of appts) {
    if (a.status === 'CANCELLED') continue;
    let start = parseTimeToMinutes(a.startTime);
    let end = a.endTime ? parseTimeToMinutes(a.endTime) : start + (a.totalDurationMinutes || 45);
    if (end <= start) end = start + 45;

    // Ajusta limites para a janela 07:00 - 21:00
    start = Math.max(DAY_START_MINUTES, Math.min(start, DAY_END_MINUTES - 15));
    end = Math.max(start + 15, Math.min(end, DAY_END_MINUTES));

    items.push({
      id: a.id,
      type: 'appointment',
      rawAppointment: a,
      startMinutes: start,
      endMinutes: end
    });
  }

  // 2. Bloqueios com horário definido
  for (const b of dayBlocks) {
    let start = parseTimeToMinutes(b.startTime);
    let end = parseTimeToMinutes(b.endTime);
    if (end <= start) end = start + 60;

    start = Math.max(DAY_START_MINUTES, Math.min(start, DAY_END_MINUTES - 15));
    end = Math.max(start + 15, Math.min(end, DAY_END_MINUTES));

    items.push({
      id: `block-${b.id}`,
      type: 'block',
      rawBlock: b,
      startMinutes: start,
      endMinutes: end
    });
  }

  // Ordena por horário de início crescente; desempate por maior duração
  items.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // Agrupa em clusters de colisão
  const clusters: typeof items[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.startMinutes < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Para cada cluster, calcula as pistas (lanes) paralelas
  const result: LayoutItem[] = [];

  for (const cluster of clusters) {
    const lanesEnd: number[] = [];
    const clusterEvents: { item: typeof items[0]; colIndex: number }[] = [];

    for (const item of cluster) {
      let placedLane = -1;
      for (let l = 0; l < lanesEnd.length; l++) {
        if (lanesEnd[l] <= item.startMinutes) {
          placedLane = l;
          lanesEnd[l] = item.endMinutes;
          break;
        }
      }
      if (placedLane === -1) {
        placedLane = lanesEnd.length;
        lanesEnd.push(item.endMinutes);
      }
      clusterEvents.push({ item, colIndex: placedLane });
    }

    const totalCols = Math.max(1, lanesEnd.length);
    for (const ce of clusterEvents) {
      result.push({
        id: ce.item.id,
        type: ce.item.type,
        rawAppointment: ce.item.rawAppointment,
        rawBlock: ce.item.rawBlock,
        startMinutes: ce.item.startMinutes,
        endMinutes: ce.item.endMinutes,
        colIndex: ce.colIndex,
        totalCols
      });
    }
  }

  return result;
}

// Contraste acessível dinâmico (calcula se texto deve ser claro ou escuro)
function getContrastColor(hexColor: string) {
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#0F172A' : '#FFFFFF';
}

// Estilo visual dos cards de agendamento (100% dinâmico por status e tema do estabelecimento)
function getAppointmentColor(
  appt: ScheduleAppointment,
  tenantColor?: string,
  statusColors?: StatusColors
) {
  const primary = tenantColor || (typeof window !== 'undefined' ? localStorage.getItem('tenant_primary_color') : null) || '#5c0701';

  // 1. Prioridade Absoluta: Cores por Status (Pendente, Confirmado, Em Atendimento, Concluído, No-Show, Cancelado)
  if (statusColors && statusColors[appt.status as keyof StatusColors]) {
    const sColor = statusColors[appt.status as keyof StatusColors];
    return {
      bg: sColor,
      text: getContrastColor(sColor),
      border: 'rgba(0,0,0,0.18)'
    };
  }

  // 2. Fallbacks estruturados caso statusColors ainda não tenha sido carregado
  const defaults = getDefaultStatusColors(primary);
  if (defaults[appt.status as keyof StatusColors]) {
    const sColor = defaults[appt.status as keyof StatusColors];
    return {
      bg: sColor,
      text: getContrastColor(sColor),
      border: 'rgba(0,0,0,0.18)'
    };
  }

  // 3. Cor primária dinâmica do estabelecimento definida pelo usuário (ex: #5c0701)
  return {
    bg: primary,
    text: getContrastColor(primary),
    border: 'rgba(0,0,0,0.2)'
  };
}

export function AgendaWeeklyGrid({
  dates,
  viewMode = 'week',
  professionals = [],
  selectedProfessionalId = '',
  appointments,
  blocks = [],
  statusColors: statusColorsProp,
  onSlotClick,
  onAppointmentClick,
  onBlockClick,
  onDayClick,
  onReschedule
}: AgendaWeeklyGridProps) {
  // Cor primária do estabelecimento definida pelo usuário (dinâmica)
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_primary_color') || '#5c0701';
    }
    return '#5c0701';
  });

  // Cores dinâmicas por status configuradas pelo usuário
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

  // Altura de 1 hora em pixels
  const [hourHeight, setHourHeight] = useState(56);
  const [now, setNow] = useState<Date>(new Date());
  const [draggedApptId, setDraggedApptId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Ajusta altura da hora por responsividade
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) {
        setHourHeight(52); // Mobile compacto
      } else {
        setHourHeight(62); // Desktop espaçoso
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Relógio em tempo real da linha "Agora"
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

  // Definição das colunas ativas
  const activeColumns = useMemo(() => {
    return isDayModeWithMultiplePros
      ? professionals.map((p) => ({
          id: p.id,
          title: p.name,
          dayNumber: dates[0] ? String(dates[0].getDate()) : '',
          weekdayShort: dates[0] ? WEEKDAY_NAMES_SHORT[dates[0].getDay()] : '',
          professionalId: p.id,
          date: dates[0]
        }))
      : dates.map((d) => ({
          id: formatLocalDateToYMD(d),
          title: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
          dayNumber: String(d.getDate()),
          weekdayShort: WEEKDAY_NAMES_SHORT[d.getDay()],
          professionalId: selectedProfessionalId || undefined,
          date: d
        }));
  }, [isDayModeWithMultiplePros, professionals, dates, selectedProfessionalId]);

  // Bloqueios de dia todo (almoço/folga geral ou que cobrem todo o expediente)
  const isColumnDayBlocked = (colDate: Date, profId?: string) => {
    const dateStr = formatLocalDateToYMD(colDate);
    const dayOfWeek = colDate.getDay();

    return blocks.some((b) => {
      if (b.isPaused) return false;
      const bDateStr = b.date ? formatLocalDateToYMD(new Date(b.date)) : null;
      const matchesDate = bDateStr === dateStr || b.dayOfWeek === dayOfWeek;
      const matchesProf = profId ? !b.professionalId || b.professionalId === profId : true;
      if (!matchesDate || !matchesProf) return false;

      // Se não tem startTime ou é 00:00 com endTime >= 18:00 ou sem endTime, ou motivo Folga
      if (!b.startTime || b.startTime === '00:00') {
        if (!b.endTime || b.endTime === '23:59' || b.endTime >= '18:00' || /folga/i.test(b.reason)) {
          return true;
        }
      }
      if (b.startTime <= '08:00' && b.endTime >= '18:00') {
        return true;
      }
      if (/folga/i.test(b.reason) && (!b.startTime || b.startTime <= '08:00')) {
        return true;
      }
      return false;
    });
  };

  const allDayBlocks = useMemo(() => {
    return blocks.filter((b) => !b.startTime || b.startTime === '00:00');
  }, [blocks]);

  // Total de minutos da escala e altura total do grid
  const totalScaleMinutes = DAY_END_MINUTES - DAY_START_MINUTES; // 840 min (14h)
  const totalGridHeight = (totalScaleMinutes / 60) * hourHeight;

  // Minuto atual para a linha "Agora"
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES;
  const nowTopPosition = ((nowMinutes - DAY_START_MINUTES) / 60) * hourHeight;

  // Auto-scroll para a hora atual ou 08:00 na primeira montagem
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollY = Math.max(0, (((Math.min(Math.max(now.getHours(), 8), 18) - START_HOUR) * hourHeight) - 80));
      scrollContainerRef.current.scrollTo({ top: scrollY, behavior: 'smooth' });
    }
  }, [hourHeight]);

  // Largura de coluna
  // No mobile, no modo semana cabem os 7 dias confortavelmente divididos na tela
  // No modo dia, a coluna se expande na largura total
  const isWeekMode = viewMode === 'week';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col select-none">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO SUPERIOR DE DIAS (COM CONTAGEM DE AGENDAMENTOS E BLOQUEIOS)  */}
      {/* ========================================================================= */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-30 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
        {/* Espaço da Coluna de Horas */}
        <div className="w-10 sm:w-14 shrink-0 border-r border-slate-200 flex flex-col items-center justify-end pb-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
            Hora
          </span>
        </div>

        {/* Colunas dos Dias da Semana */}
        <div className="flex-1 flex min-w-0">
          {activeColumns.map((col, idx) => {
            const dateStr = formatLocalDateToYMD(col.date);
            const isCurrentDay = isToday(col.date);
            const isClickable = Boolean(onDayClick);
            const isBlocked = isColumnDayBlocked(col.date, col.professionalId);

            // Contagem de agendamentos válidos deste dia
            const colApptsCount = appointments.filter((a) => {
              const aDateStr = formatLocalDateToYMD(a.date);
              const matchesDate = aDateStr === dateStr;
              const matchesProf = col.professionalId ? a.professionalId === col.professionalId : true;
              return matchesDate && matchesProf && a.status !== 'CANCELLED';
            }).length;

            return (
              <button
                key={col.id || idx}
                type="button"
                onClick={() => {
                  if (isClickable) {
                    onDayClick?.(col.date);
                  }
                }}
                className={`flex-1 min-w-0 py-2 sm:py-2.5 px-1 flex flex-col items-center justify-center border-r last:border-r-0 border-slate-200 transition-colors cursor-pointer ${
                  isBlocked
                    ? 'bg-slate-100/90 hover:bg-slate-200/80'
                    : isCurrentDay
                      ? 'bg-tenant-light'
                      : 'hover:bg-slate-50'
                }`}
                style={isCurrentDay && !isBlocked ? { backgroundColor: `${tenantPrimaryColor}14` } : undefined}
                title={isBlocked ? 'Dia bloqueado para agendamentos' : isWeekMode ? 'Toque para abrir a visão deste dia' : undefined}
              >
                {/* Sigla do Dia da Semana (SEG, TER, QUA...) */}
                <span
                  className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block ${
                    isBlocked
                      ? 'text-slate-400'
                      : isCurrentDay
                        ? 'text-tenant-primary font-extrabold'
                        : 'text-slate-500'
                  }`}
                  style={isCurrentDay && !isBlocked ? { color: tenantPrimaryColor } : undefined}
                >
                  {col.weekdayShort}
                </span>

                {/* Número do Dia com Círculo Sólido Dinâmico se Hoje/Ativo */}
                <div
                  className={`mt-0.5 sm:mt-1 flex items-center justify-center font-extrabold text-xs sm:text-sm ${
                    isBlocked
                      ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 text-slate-500 font-bold'
                      : isCurrentDay
                        ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-xs'
                        : 'text-slate-800'
                  }`}
                  style={
                    isCurrentDay && !isBlocked
                      ? {
                          backgroundColor: tenantPrimaryColor,
                          color: getContrastColor(tenantPrimaryColor)
                        }
                      : undefined
                  }
                >
                  {col.dayNumber}
                </div>

                {/* Quantidade de Agendamentos Embaixo do Dia (ou badge Bloqueado) */}
                <div className="mt-1 flex items-center justify-center">
                  {isBlocked ? (
                    <span className="text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600 uppercase tracking-tight">
                      Bloqueado
                    </span>
                  ) : colApptsCount > 0 ? (
                    <span className="text-[9px] sm:text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs whitespace-nowrap">
                      {colApptsCount} {colApptsCount === 1 ? 'agend.' : 'agend.'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-300 font-medium">
                      0 agend.
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LINHA "DIA TODO" (ALL-DAY ROW) SE HOUVER BLOQUEIOS DE DIA INTEIRO      */}
      {/* ========================================================================= */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 min-h-[26px]">
        <div className="w-10 sm:w-14 shrink-0 border-r border-slate-200 flex items-center justify-center px-1">
          <span className="text-[9px] text-slate-400 font-semibold leading-tight text-center">
            dia todo
          </span>
        </div>
        <div className="flex-1 flex min-w-0">
          {activeColumns.map((col, idx) => {
            const dateStr = formatLocalDateToYMD(col.date);
            const dayOfWeek = col.date.getDay();

            const allDayForCol = allDayBlocks.filter((b) => {
              const bDateStr = b.date ? formatLocalDateToYMD(new Date(b.date)) : null;
              const matchesDate = bDateStr === dateStr || b.dayOfWeek === dayOfWeek;
              const matchesProf = col.professionalId ? b.professionalId === col.professionalId : true;
              return matchesDate && matchesProf;
            });

            return (
              <div
                key={idx}
                className="flex-1 min-w-0 border-r last:border-r-0 border-slate-200 p-0.5 flex flex-wrap gap-1 items-center justify-center"
              >
                {allDayForCol.map((b) => (
                  <span
                    key={b.id}
                    onClick={() => onBlockClick?.(b)}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 truncate cursor-pointer hover:bg-slate-300 transition-colors"
                    title={b.reason}
                  >
                    {b.reason ? `${b.reason.slice(0, 4)}...` : 'Bloq...'}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TIMELINE VERTICAL CONTÍNUA DE HORÁRIOS (07:00 ÀS 21:00)               */}
      {/* ========================================================================= */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto max-h-[70vh] sm:max-h-[75vh] scrollbar-thin relative flex bg-white"
      >
        {/* Coluna Lateral Esquerda: Horas (Sticky ou fixa na lateral) */}
        <div
          style={{ height: `${totalGridHeight}px` }}
          className="w-10 sm:w-14 shrink-0 border-r border-slate-200 relative bg-white select-none z-10"
        >
          {HOURS.map((hour, hIdx) => {
            const topPos = hIdx * hourHeight;
            return (
              <div
                key={hour}
                style={{ top: `${topPos}px` }}
                className="absolute left-0 right-0 -translate-y-1/2 flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-medium text-slate-400"
              >
                {hour}
              </div>
            );
          })}
        </div>

        {/* Grade de Colunas de Dias com Linhas Horizontais e Eventos Absolutos */}
        <div
          style={{ height: `${totalGridHeight}px` }}
          className="flex-1 flex min-w-0 relative bg-white"
        >
          {/* Linhas de Fundo das Horas (Dividem a grade inteira) */}
          <div className="absolute inset-0 pointer-events-none flex flex-col">
            {HOURS.map((hour, hIdx) => {
              if (hIdx === HOURS.length - 1) return null;
              return (
                <div
                  key={hour}
                  style={{ height: `${hourHeight}px` }}
                  className="w-full border-b border-slate-100 flex flex-col justify-end"
                >
                  {/* Linha tracejada suave de 30 minutos */}
                  <div className="w-full border-b border-dashed border-slate-100/70 h-1/2" />
                </div>
              );
            })}
          </div>

          {/* Renderização de Cada Coluna de Dia */}
          {activeColumns.map((col, cIdx) => {
            const dateStr = formatLocalDateToYMD(col.date);
            const dayOfWeek = col.date.getDay();
            const isCurrentDay = isToday(col.date);

            const isDayBlocked = isColumnDayBlocked(col.date, col.professionalId);

            // Filtra agendamentos deste dia
            const dayAppts = appointments.filter((a) => {
              const aDateStr = formatLocalDateToYMD(a.date);
              const matchesDate = aDateStr === dateStr;
              const matchesProf = col.professionalId ? a.professionalId === col.professionalId : true;
              return matchesDate && matchesProf && a.status !== 'CANCELLED';
            });

            // Filtra bloqueios deste dia com hora definida
            const dayTimedBlocks = blocks.filter((b) => {
              if (!b.startTime || b.startTime === '00:00') return false;
              const bDateStr = b.date ? formatLocalDateToYMD(new Date(b.date)) : null;
              const matchesDate = bDateStr === dateStr || b.dayOfWeek === dayOfWeek;
              const matchesProf = col.professionalId ? !b.professionalId || b.professionalId === col.professionalId : true;
              return matchesDate && matchesProf;
            });

            // Calcula o layout com detecção de concorrência e sobreposição
            const layoutItems = computeEventsLayout(dayAppts, dayTimedBlocks);

            return (
              <div
                key={col.id || cIdx}
                onClick={(e) => {
                  if (isDayBlocked) {
                    e.stopPropagation();
                    return;
                  }
                  // Ao clicar no espaço livre, detecta o horário do clique
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const clickedMinutes = DAY_START_MINUTES + (clickY / hourHeight) * 60;
                  const roundedMin = Math.max(
                    DAY_START_MINUTES,
                    Math.min(DAY_END_MINUTES - 30, Math.floor(clickedMinutes / 30) * 30)
                  );
                  const timeStr = formatMinutesToTime(roundedMin);
                  onSlotClick(dateStr, timeStr, col.professionalId);
                }}
                className={`flex-1 min-w-0 border-r last:border-r-0 border-slate-200 relative transition-colors ${
                  isDayBlocked
                    ? 'cursor-not-allowed'
                    : isCurrentDay
                      ? 'cursor-pointer hover:bg-slate-50/50'
                      : 'cursor-pointer hover:bg-slate-50/40'
                }`}
                style={
                  isDayBlocked
                    ? {
                        background:
                          'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 12px, #f1f5f9 12px, #f1f5f9 24px)'
                      }
                    : isCurrentDay
                      ? { backgroundColor: `${tenantPrimaryColor}08` }
                      : undefined
                }
              >
                {/* Linha "Agora" em Tempo Real (se for o dia de hoje) */}
                {isCurrentDay && showNowLine && !isDayBlocked && (
                  <div
                    style={{ top: `${nowTopPosition}px` }}
                    className="absolute left-0 right-0 z-20 border-t-2 border-red-500 pointer-events-none flex items-center"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 shadow-xs" />
                  </div>
                )}

                {/* Badge de Dia Inteiro Bloqueado */}
                {isDayBlocked && (
                  <div className="absolute inset-x-1 top-2 z-10 flex justify-center pointer-events-none">
                    <span className="text-[8.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200/90 text-slate-500 border border-slate-300/70 shadow-2xs">
                      Dia Bloqueado
                    </span>
                  </div>
                )}

                {/* Eventos Posicionados de Forma Absoluta */}
                {layoutItems.map((evt) => {
                  const durationMinutes = evt.endMinutes - evt.startMinutes;
                  const top = ((evt.startMinutes - DAY_START_MINUTES) / 60) * hourHeight;
                  const height = Math.max(22, (durationMinutes / 60) * hourHeight);

                  const widthPercent = 100 / evt.totalCols;
                  const leftPercent = evt.colIndex * widthPercent;

                  // ==========================================
                  // 1. BLOQUEIO DE HORÁRIO (Listras diagonais em cinza apagado)
                  // ==========================================
                  if (evt.type === 'block' && evt.rawBlock) {
                    const block = evt.rawBlock;
                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlockClick?.(block);
                        }}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          background:
                            'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 8px, #e2e8f0 8px, #e2e8f0 16px)'
                        }}
                        className="absolute z-10 rounded-md border border-slate-300/90 p-1 text-slate-700 overflow-hidden cursor-pointer shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-start bg-slate-100/90"
                        title={`Bloqueio: ${block.reason || 'Bloqueado'} (${block.startTime} - ${block.endTime})`}
                      >
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className="text-[9px] font-mono font-bold text-slate-500 block">
                            {block.startTime} - {block.endTime}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-1 py-0.2 rounded shrink-0">
                            Bloq
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 leading-tight block truncate mt-0.5">
                          {block.reason || 'Horário Indisponível'}
                        </span>
                      </div>
                    );
                  }

                  // ==========================================
                  // 2. AGENDAMENTO NORMAL
                  // ==========================================
                  if (evt.type === 'appointment' && evt.rawAppointment) {
                    const appt = evt.rawAppointment;
                    const colorStyle = getAppointmentColor(appt, tenantPrimaryColor, activeStatusColors);
                    const serviceName = appt.service?.name || (appt.items?.[0]?.service?.name) || 'Procedimento';
                    const isUltraCompact = height < 32;

                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(appt);
                        }}
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedApptId(appt.id);
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({
                              id: appt.id,
                              date: dateStr,
                              time: appt.startTime,
                              professionalId: appt.professionalId
                            })
                          );
                        }}
                        onDragEnd={() => setDraggedApptId(null)}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          backgroundColor: colorStyle.bg,
                          color: colorStyle.text,
                          borderColor: colorStyle.border
                        }}
                        className={`absolute z-10 rounded-md border p-1 sm:p-1.5 overflow-hidden cursor-pointer shadow-xs hover:shadow-md transition-all active:scale-[0.98] select-none flex flex-col justify-start ${
                          draggedApptId === appt.id ? 'opacity-40' : ''
                        }`}
                        title={`${appt.startTime} - ${appt.client?.name || 'Cliente'} (${serviceName})`}
                      >
                        {/* Linha 1: Horário e Nome da Cliente na Mesma Linha */}
                        <div className="flex items-baseline gap-1.5 min-w-0 leading-tight">
                          <span className="text-[9px] sm:text-[9.5px] font-mono font-bold shrink-0 opacity-95">
                            {appt.startTime}
                          </span>
                          <span className="text-[8px] opacity-40 shrink-0">•</span>
                          <span className="text-[9.5px] sm:text-[10.5px] font-extrabold truncate">
                            {appt.client?.name || 'Cliente'}
                          </span>
                        </div>

                        {/* Linha 2: Procedimento / Serviço Mais Embaixo com Espaço (Respiro) */}
                        {!isUltraCompact && (
                          <div className="mt-1 sm:mt-1.5 pt-0.5 border-t border-current/10 min-w-0">
                            <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-tight block truncate opacity-90">
                              {serviceName}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
