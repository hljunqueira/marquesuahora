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
  availabilityRules?: any[];
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

// Constantes de fallback padrão quando não houver regras salvas
const DEFAULT_FALLBACK_START_HOUR = 8;
const DEFAULT_FALLBACK_END_HOUR = 20;

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
  dayBlocks: BlockItem[],
  dayStartMinutes: number,
  dayEndMinutes: number
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
    const parsedEnd = a.endTime ? parseTimeToMinutes(a.endTime) : 0;
    const diffFromEnd = parsedEnd > start ? parsedEnd - start : 0;

    const itemsDuration =
      a.items && a.items.length > 0
        ? a.items.reduce((acc: number, it: any) => acc + (it.service?.durationMinutes || it.durationMinutes || 0), 0)
        : 0;

    const effectiveDuration =
      diffFromEnd > 0
        ? diffFromEnd
        : (itemsDuration > 0
            ? itemsDuration
            : (a.totalDurationMinutes || a.service?.durationMinutes || 45));

    let end = parsedEnd > start ? parsedEnd : start + effectiveDuration;
    if (end <= start) end = start + effectiveDuration;

    // Ajusta limites para a escala
    start = Math.max(dayStartMinutes, Math.min(start, dayEndMinutes - 15));
    end = Math.max(start + 15, Math.min(end, dayEndMinutes));

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

    start = Math.max(dayStartMinutes, Math.min(start, dayEndMinutes - 15));
    end = Math.max(start + 15, Math.min(end, dayEndMinutes));

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

interface FreeGap {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  startTimeStr: string;
  endTimeStr: string;
  isFirstGapOfDay: boolean;
  isLastGapOfDay: boolean;
  label: string;
  durText: string;
  detailLabel: string;
}

// Algoritmo de Janelas Livres Inteligentes (Smart Free Time Gaps)
function computeDayFreeGaps(
  layoutItems: LayoutItem[],
  dayStartMinutes: number,
  dayEndMinutes: number
): FreeGap[] {
  const formatDurationShort = (minsTotal: number): string => {
    const h = Math.floor(minsTotal / 60);
    const m = minsTotal % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h${m > 0 ? `${m}m` : ''}`;
  };

  if (layoutItems.length === 0) {
    const duration = dayEndMinutes - dayStartMinutes;
    const durText = formatDurationShort(duration);
    return [
      {
        startMinutes: dayStartMinutes,
        endMinutes: dayEndMinutes,
        durationMinutes: duration,
        startTimeStr: formatMinutesToTime(dayStartMinutes),
        endTimeStr: formatMinutesToTime(dayEndMinutes),
        isFirstGapOfDay: true,
        isLastGapOfDay: true,
        label: 'Dia todo livre',
        durText,
        detailLabel: `${formatMinutesToTime(dayStartMinutes)} às ${formatMinutesToTime(dayEndMinutes)} · Dia todo disponível (${durText})`
      }
    ];
  }

  // 1. Mapeia e mescla todos os intervalos ocupados
  const busyRanges = layoutItems
    .map((item) => ({ start: item.startMinutes, end: item.endMinutes }))
    .sort((a, b) => a.start - b.start);

  const mergedBusy: { start: number; end: number }[] = [];
  for (const r of busyRanges) {
    if (mergedBusy.length === 0) {
      mergedBusy.push({ ...r });
    } else {
      const last = mergedBusy[mergedBusy.length - 1];
      if (r.start <= last.end) {
        last.end = Math.max(last.end, r.end);
      } else {
        mergedBusy.push({ ...r });
      }
    }
  }

  const gaps: FreeGap[] = [];
  let currentPointer = dayStartMinutes;

  for (let i = 0; i < mergedBusy.length; i++) {
    const busy = mergedBusy[i];
    if (busy.start > currentPointer) {
      const duration = busy.start - currentPointer;
      if (duration >= 20) {
        const durText = formatDurationShort(duration);
        const isFirst = i === 0 && currentPointer === dayStartMinutes;
        const startStr = formatMinutesToTime(currentPointer);
        const endStr = formatMinutesToTime(busy.start);

        gaps.push({
          startMinutes: currentPointer,
          endMinutes: busy.start,
          durationMinutes: duration,
          startTimeStr: startStr,
          endTimeStr: endStr,
          isFirstGapOfDay: isFirst,
          isLastGapOfDay: false,
          label: 'Livre',
          durText,
          detailLabel: `${startStr} às ${endStr} (${durText})`
        });
      }
    }
    currentPointer = Math.max(currentPointer, busy.end);
  }

  // Gap final após o último atendimento
  if (currentPointer < dayEndMinutes) {
    const duration = dayEndMinutes - currentPointer;
    if (duration >= 20) {
      const durText = formatDurationShort(duration);
      const startStr = formatMinutesToTime(currentPointer);
      const endStr = formatMinutesToTime(dayEndMinutes);

      gaps.push({
        startMinutes: currentPointer,
        endMinutes: dayEndMinutes,
        durationMinutes: duration,
        startTimeStr: startStr,
        endTimeStr: endStr,
        isFirstGapOfDay: mergedBusy.length === 0,
        isLastGapOfDay: true,
        label: 'Livre',
        durText,
        detailLabel: `${startStr} às ${endStr} (${durText})`
      });
    }
  }

  return gaps;
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

// Estilo visual dos cards de agendamento (Cor do Procedimento + Bolinha do Status)
function getAppointmentColor(
  appt: ScheduleAppointment,
  tenantColor?: string,
  statusColors?: StatusColors
) {
  const primary = tenantColor || (typeof window !== 'undefined' ? localStorage.getItem('tenant_primary_color') : null) || '#5c0701';

  // 1. Cor Primária de Identificação do Procedimento
  const serviceColor = appt.service?.color
    || (appt.items?.[0]?.service?.color)
    || primary;

  // 2. Cor do Status para a bolinha/indicador
  const statusColor = (statusColors && statusColors[appt.status as keyof StatusColors])
    || (getDefaultStatusColors(primary)[appt.status as keyof StatusColors])
    || '#64748b';

  return {
    bg: serviceColor,
    text: getContrastColor(serviceColor),
    border: 'rgba(0,0,0,0.18)',
    serviceColor,
    statusColor
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
  availabilityRules = [],
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

  // Altura de 1 hora em pixels (52px desktop / 46px mobile para eliminar vazios)
  const [hourHeight, setHourHeight] = useState(52);
  const [now, setNow] = useState<Date>(new Date());
  const [draggedApptId, setDraggedApptId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Ajusta altura da hora por responsividade
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) {
        setHourHeight(46); // Mobile compacto
      } else {
        setHourHeight(52); // Desktop otimizado
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
      const bDateStr = b.date ? formatLocalDateToYMD(b.date) : null;
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

  // Verifica se o dia está configurado como fechado nas regras semanais do salão
  const isDayClosedByAvailabilityRule = (colDate: Date, profId?: string) => {
    if (!availabilityRules || availabilityRules.length === 0) return false;
    const dayOfWeek = colDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    // Se houver regras vinculadas ao profissional
    if (profId) {
      const profRules = availabilityRules.filter(
        (r: any) => r.professionalId === profId && r.dayOfWeek === dayOfWeek
      );
      if (profRules.length > 0) {
        return profRules.every((r: any) => r.isActive === false || r.isOpen === false);
      }
    }

    // Regra geral do estabelecimento (sem profissional vinculado)
    const generalRules = availabilityRules.filter(
      (r: any) => !r.professionalId && r.dayOfWeek === dayOfWeek
    );
    if (generalRules.length > 0) {
      return generalRules.every((r: any) => r.isActive === false || r.isOpen === false);
    }

    return false;
  };

  // ==========================================
  // CÁLCULO DINÂMICO DA ESCALA DE HORAS DA GRADE
  // (Alinhado dinamicamente com as regras da agenda e encaixes reais)
  // ==========================================
  const { gridStartMinutes, gridEndMinutes, startHour, endHour, gridHours } = useMemo(() => {
    // 1. Dias da semana visíveis na grade
    const targetDaysOfWeek = new Set(activeColumns.map((col) => col.date.getDay()));

    // 2. Horários de funcionamento configurados para os dias ativos
    const openRules = (availabilityRules || []).filter((r: any) => {
      if (r.isActive === false || r.isOpen === false) return false;
      if (selectedProfessionalId && r.professionalId && r.professionalId !== selectedProfessionalId) {
        return false;
      }
      return targetDaysOfWeek.has(r.dayOfWeek);
    });

    const ruleStarts = openRules
      .map((r: any) => parseTimeToMinutes(r.startTime))
      .filter((m: number) => m > 0);
    const ruleEnds = openRules
      .map((r: any) => parseTimeToMinutes(r.endTime))
      .filter((m: number) => m > 0);

    // 3. Horários de agendamentos reais e bloqueios com horário definidos
    // (Garante que encaixes e atendimentos especiais nunca sejam cortados)
    const activeDateStrings = new Set(activeColumns.map((col) => formatLocalDateToYMD(col.date)));

    const visibleAppts = appointments.filter((a) => {
      if (a.status === 'CANCELLED') return false;
      const dStr = formatLocalDateToYMD(a.date);
      if (!activeDateStrings.has(dStr)) return false;
      if (selectedProfessionalId && a.professionalId !== selectedProfessionalId) return false;
      return true;
    });

    const apptStarts = visibleAppts
      .map((a) => parseTimeToMinutes(a.startTime))
      .filter((m) => m > 0);
    const apptEnds = visibleAppts
      .map((a) => {
        const start = parseTimeToMinutes(a.startTime);
        const parsedEnd = a.endTime ? parseTimeToMinutes(a.endTime) : 0;
        const diffFromEnd = parsedEnd > start ? parsedEnd - start : 0;
        const itemsDuration =
          a.items && a.items.length > 0
            ? a.items.reduce((acc: number, it: any) => acc + (it.service?.durationMinutes || it.durationMinutes || 0), 0)
            : 0;
        const effectiveDuration =
          diffFromEnd > 0
            ? diffFromEnd
            : (itemsDuration > 0
                ? itemsDuration
                : (a.totalDurationMinutes || a.service?.durationMinutes || 45));
        return parsedEnd > start ? parsedEnd : start + effectiveDuration;
      })
      .filter((m) => m > 0);

    const visibleBlocks = blocks.filter((b) => {
      if (b.isPaused) return false;
      if (!b.startTime || b.startTime === '00:00') return false;
      const bDateStr = b.date ? formatLocalDateToYMD(b.date) : null;
      const dayOfWeek = b.date ? new Date(b.date).getDay() : b.dayOfWeek;
      const matchesDate = bDateStr
        ? activeDateStrings.has(bDateStr)
        : (dayOfWeek !== undefined && dayOfWeek !== null && targetDaysOfWeek.has(dayOfWeek));
      if (!matchesDate) return false;
      if (selectedProfessionalId && b.professionalId && b.professionalId !== selectedProfessionalId) return false;
      return true;
    });

    const blockStarts = visibleBlocks
      .map((b) => parseTimeToMinutes(b.startTime))
      .filter((m) => m > 0);
    const blockEnds = visibleBlocks
      .map((b) => parseTimeToMinutes(b.endTime))
      .filter((m) => m > 0);

    // 4. Determina menor início e maior término
    const allStarts = [...ruleStarts, ...apptStarts, ...blockStarts];
    const allEnds = [...ruleEnds, ...apptEnds, ...blockEnds];

    let minMinutes = allStarts.length > 0 ? Math.min(...allStarts) : DEFAULT_FALLBACK_START_HOUR * 60;
    let maxMinutes = allEnds.length > 0 ? Math.max(...allEnds) : DEFAULT_FALLBACK_END_HOUR * 60;

    // Arredonda para horas cheias (floor no início, ceil no fim)
    let sHour = Math.floor(minMinutes / 60);
    let eHour = Math.ceil(maxMinutes / 60);

    // Limites de segurança razoáveis: nunca menor que 06:00, nunca maior que 23:00
    sHour = Math.max(6, Math.min(sHour, 20));
    eHour = Math.min(23, Math.max(eHour, sHour + 4)); // Mínimo de 4 horas visíveis

    const sMin = sHour * 60;
    const eMin = eHour * 60;

    // Gera lista de horas para a régua vertical
    const hoursArr: string[] = [];
    for (let h = sHour; h <= eHour; h++) {
      hoursArr.push(`${String(h).padStart(2, '0')}:00`);
    }

    return {
      gridStartMinutes: sMin,
      gridEndMinutes: eMin,
      startHour: sHour,
      endHour: eHour,
      gridHours: hoursArr
    };
  }, [activeColumns, availabilityRules, selectedProfessionalId, appointments, blocks]);

  // Retorna o horário real de abertura e fechamento para a coluna respeitando as regras do salão
  const getDayWorkingHours = (colDate: Date, profId?: string) => {
    if (!availabilityRules || availabilityRules.length === 0) {
      return { startMinutes: gridStartMinutes, endMinutes: gridEndMinutes, isOpen: true };
    }
    const dayOfWeek = colDate.getDay();

    let matchingRules = profId
      ? availabilityRules.filter(
          (r: any) => r.professionalId === profId && r.dayOfWeek === dayOfWeek && r.isActive !== false && r.isOpen !== false
        )
      : [];

    if (matchingRules.length === 0) {
      matchingRules = availabilityRules.filter(
        (r: any) => !r.professionalId && r.dayOfWeek === dayOfWeek && r.isActive !== false && r.isOpen !== false
      );
    }

    if (matchingRules.length === 0) {
      return { startMinutes: gridStartMinutes, endMinutes: gridEndMinutes, isOpen: false };
    }

    const starts = matchingRules.map((r: any) => parseTimeToMinutes(r.startTime || '08:00')).filter((n: number) => n > 0);
    const ends = matchingRules.map((r: any) => parseTimeToMinutes(r.endTime || '18:00')).filter((n: number) => n > 0);

    const minStart = starts.length > 0 ? Math.min(...starts) : gridStartMinutes;
    const maxEnd = ends.length > 0 ? Math.max(...ends) : gridEndMinutes;

    return {
      startMinutes: minStart,
      endMinutes: maxEnd,
      isOpen: true
    };
  };

  const allDayBlocks = useMemo(() => {
    return blocks.filter((b) => !b.startTime || b.startTime === '00:00');
  }, [blocks]);

  // Total de minutos da escala e altura total do grid
  const totalScaleMinutes = gridEndMinutes - gridStartMinutes;
  const totalGridHeight = (totalScaleMinutes / 60) * hourHeight;

  // Minuto atual para a linha "Agora"
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMinutes >= gridStartMinutes && nowMinutes <= gridEndMinutes;
  const nowTopPosition = ((nowMinutes - gridStartMinutes) / 60) * hourHeight;

  // Auto-scroll para a hora atual ou início da escala na primeira montagem
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollY = Math.max(0, (((Math.min(Math.max(now.getHours(), startHour), endHour) - startHour) * hourHeight) - 80));
      scrollContainerRef.current.scrollTo({ top: scrollY, behavior: 'smooth' });
    }
  }, [hourHeight, startHour, endHour]);

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

            // Contagem de agendamentos válidos deste dia
            const colApptsCount = appointments.filter((a) => {
              const aDateStr = formatLocalDateToYMD(a.date);
              const matchesDate = aDateStr === dateStr;
              const matchesProf = col.professionalId ? a.professionalId === col.professionalId : true;
              return matchesDate && matchesProf && a.status !== 'CANCELLED';
            }).length;

            const isBlockedByBlock = isColumnDayBlocked(col.date, col.professionalId);
            const isRuleClosed = isDayClosedByAvailabilityRule(col.date, col.professionalId);
            // Dia sem expediente ou bloqueado
            const isDayWithoutSchedule = isRuleClosed || isBlockedByBlock;

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
                  isDayWithoutSchedule && colApptsCount === 0
                    ? 'bg-slate-100/90 hover:bg-slate-200/80'
                    : isDayWithoutSchedule && colApptsCount > 0
                      ? 'bg-amber-50/50 hover:bg-amber-100/60'
                      : isCurrentDay
                        ? 'bg-tenant-light'
                        : 'hover:bg-slate-50'
                }`}
                style={isCurrentDay && !isDayWithoutSchedule ? { backgroundColor: `${tenantPrimaryColor}14` } : undefined}
                title={
                  isBlockedByBlock
                    ? 'Dia bloqueado para agendamentos'
                    : isRuleClosed
                      ? colApptsCount > 0
                        ? `Fechado nas regras da agenda (${colApptsCount} encaixe${colApptsCount === 1 ? '' : 's'} agendado${colApptsCount === 1 ? '' : 's'})`
                        : 'Fechado nas regras de funcionamento'
                      : isWeekMode
                        ? 'Toque para abrir a visão deste dia'
                        : undefined
                }
              >
                {/* Sigla do Dia da Semana (SEG, TER, QUA...) */}
                <span
                  className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block ${
                    isDayWithoutSchedule && colApptsCount === 0
                      ? 'text-slate-400'
                      : isDayWithoutSchedule && colApptsCount > 0
                        ? 'text-amber-800 font-extrabold'
                        : isCurrentDay
                          ? 'text-tenant-primary font-extrabold'
                          : 'text-slate-500'
                  }`}
                  style={isCurrentDay && !isDayWithoutSchedule ? { color: tenantPrimaryColor } : undefined}
                >
                  {col.weekdayShort}
                </span>

                {/* Número do Dia com Círculo Sólido Dinâmico se Hoje/Ativo */}
                <div
                  className={`mt-0.5 sm:mt-1 flex items-center justify-center font-extrabold text-xs sm:text-sm ${
                    isDayWithoutSchedule && colApptsCount === 0
                      ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 text-slate-500 font-bold'
                      : isDayWithoutSchedule && colApptsCount > 0
                        ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-200/80 text-amber-900 font-bold border border-amber-300 shadow-2xs'
                        : isCurrentDay
                          ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-xs'
                          : 'text-slate-800'
                  }`}
                  style={
                    isCurrentDay && !isDayWithoutSchedule
                      ? {
                          backgroundColor: tenantPrimaryColor,
                          color: getContrastColor(tenantPrimaryColor)
                        }
                      : undefined
                  }
                >
                  {col.dayNumber}
                </div>

                {/* Quantidade de Agendamentos Embaixo do Dia (ou badge Bloqueado/Fechado) */}
                <div className="mt-1 flex items-center justify-center">
                  {isBlockedByBlock ? (
                    <span className="text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600 uppercase tracking-tight">
                      Bloqueado
                    </span>
                  ) : isRuleClosed ? (
                    colApptsCount > 0 ? (
                      <span className="text-[8.5px] sm:text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap">
                        Fechado ({colApptsCount})
                      </span>
                    ) : (
                      <span className="text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-500 uppercase tracking-tight">
                        Fechado
                      </span>
                    )
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
              const bDateStr = b.date ? formatLocalDateToYMD(b.date) : null;
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
      {/* 3. TIMELINE VERTICAL CONTÍNUA DE HORÁRIOS CONFIGURADOS DINAMICAMENTE       */}
      {/* ========================================================================= */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto max-h-[calc(100dvh-230px)] sm:max-h-[76vh] scrollbar-thin relative flex bg-white overscroll-contain touch-pan-y"
      >
        {/* Coluna Lateral Esquerda: Horas (Sticky ou fixa na lateral) */}
        <div
          style={{ height: `${totalGridHeight}px` }}
          className="w-10 sm:w-14 shrink-0 border-r border-slate-200 relative bg-white select-none z-10"
        >
          {gridHours.map((hour, hIdx) => {
            const topPos = hIdx * hourHeight;
            const isFirst = hIdx === 0;
            return (
              <div
                key={hour}
                style={{ top: isFirst ? '2px' : `${topPos}px` }}
                className={`absolute left-0 right-0 flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 ${
                  isFirst ? 'translate-y-0' : '-translate-y-1/2'
                }`}
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
            {gridHours.map((hour, hIdx) => {
              if (hIdx === gridHours.length - 1) return null;
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
              const bDateStr = b.date ? formatLocalDateToYMD(b.date) : null;
              const matchesDate = bDateStr === dateStr || b.dayOfWeek === dayOfWeek;
              const matchesProf = col.professionalId ? !b.professionalId || b.professionalId === col.professionalId : true;
              return matchesDate && matchesProf;
            });

            const isBlockedByBlock = isColumnDayBlocked(col.date, col.professionalId);
            const isRuleClosed = isDayClosedByAvailabilityRule(col.date, col.professionalId);
            const isDayWithoutSchedule = isRuleClosed || isBlockedByBlock;

            // Calcula o layout com detecção de concorrência e sobreposição respeitando a escala da grade
            const layoutItems = computeEventsLayout(dayAppts, dayTimedBlocks, gridStartMinutes, gridEndMinutes);

            // Horários reais de abertura e fechamento do salão no dia
            const { startMinutes: workingStartMinutes, endMinutes: workingEndMinutes, isOpen: isDayOpen } = getDayWorkingHours(col.date, col.professionalId);

            // Regra anti-falha: Janelas de tempo livre SÓ são calculadas se o dia for aberto nas regras do salão
            const isDayEffectivelyOpen = isDayOpen && !isRuleClosed && !isBlockedByBlock;
            const freeGaps = isDayEffectivelyOpen
              ? computeDayFreeGaps(layoutItems, workingStartMinutes, workingEndMinutes)
              : [];

            return (
              <div
                key={col.id || cIdx}
                onClick={(e) => {
                  // Ao clicar no espaço livre, detecta o horário do clique (mesmo em dias fechados para permitir encaixes da dona)
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const clickedMinutes = gridStartMinutes + (clickY / hourHeight) * 60;
                  const roundedMin = Math.max(
                    gridStartMinutes,
                    Math.min(gridEndMinutes - 30, Math.floor(clickedMinutes / 30) * 30)
                  );
                  const timeStr = formatMinutesToTime(roundedMin);
                  onSlotClick(dateStr, timeStr, col.professionalId);
                }}
                className={`flex-1 min-w-0 border-r last:border-r-0 border-slate-200 relative transition-colors cursor-pointer ${
                  isDayWithoutSchedule
                    ? 'hover:bg-slate-100/60'
                    : isCurrentDay
                      ? 'hover:bg-slate-50/50'
                      : 'hover:bg-slate-50/40'
                }`}
                title={isDayWithoutSchedule ? 'Dia fechado na vitrine — Clique para agendar um encaixe manual' : undefined}
                style={
                  isDayWithoutSchedule
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
                {isCurrentDay && showNowLine && !isDayWithoutSchedule && (
                  <div
                    style={{ top: `${nowTopPosition}px` }}
                    className="absolute left-0 right-0 z-20 border-t-2 border-red-500 pointer-events-none flex items-center"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 shadow-xs" />
                  </div>
                )}

                {/* Faixa sombreada de Horário Antes do Expediente em dias abertos */}
                {isDayEffectivelyOpen && workingStartMinutes > gridStartMinutes && (
                  <div
                    style={{
                      top: 0,
                      height: `${((workingStartMinutes - gridStartMinutes) / 60) * hourHeight}px`,
                      background: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 8px, #f1f5f9 8px, #f1f5f9 16px)'
                    }}
                    className="absolute inset-x-0 z-1 pointer-events-none border-b border-slate-200/80"
                  />
                )}

                {/* Faixa sombreada de Horário Após o Expediente em dias abertos */}
                {isDayEffectivelyOpen && workingEndMinutes < gridEndMinutes && (
                  <div
                    style={{
                      top: `${((workingEndMinutes - gridStartMinutes) / 60) * hourHeight}px`,
                      height: `${((gridEndMinutes - workingEndMinutes) / 60) * hourHeight}px`,
                      background: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 8px, #f1f5f9 8px, #f1f5f9 16px)'
                    }}
                    className="absolute inset-x-0 z-1 pointer-events-none border-t border-slate-200/80"
                  />
                )}

                {/* Badge de Dia Fechado ou Bloqueado apenas na visão diária (na visão semanal o topo da coluna já informa) */}
                {isDayWithoutSchedule && viewMode === 'day' && (
                  <div className="absolute inset-x-1 top-2 z-10 flex justify-center pointer-events-none">
                    {dayAppts.length > 0 ? (
                      <span className="text-[8.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-800 border border-amber-300/80 shadow-2xs">
                        {isBlockedByBlock ? 'Bloqueio' : 'Fechado'} ({dayAppts.length} encaixe{dayAppts.length > 1 ? 's' : ''})
                      </span>
                    ) : (
                      <span className="text-[8.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200/90 text-slate-500 border border-slate-300/70 shadow-2xs">
                        {isBlockedByBlock ? 'Dia Bloqueado' : 'Fechado'}
                      </span>
                    )}
                  </div>
                )}

                {/* Banner de Aviso de Dia Fechado na Visão Dia */}
                {isDayWithoutSchedule && viewMode === 'day' && dayAppts.length === 0 && (
                  <div className="absolute inset-x-4 top-16 z-20 flex flex-col items-center justify-center p-6 bg-slate-100/95 border border-slate-300/80 rounded-2xl text-center shadow-xs">
                    <span className="text-sm font-extrabold text-slate-700">
                      {isBlockedByBlock ? 'Dia com Bloqueio de Horário' : 'Estabelecimento / Profissional Fechado'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1 max-w-md">
                      Não há expediente configurado para esta data conforme as regras de funcionamento semanais. Clique na grade para adicionar um encaixe manual se desejar.
                    </span>
                  </div>
                )}

                {/* Janelas Livres Inteligentes Consolidadas (Verde bem clarinho e suave, sem poluição de texto) */}
                {!isDayWithoutSchedule &&
                  freeGaps.map((gap) => {
                    const gapTop = ((gap.startMinutes - gridStartMinutes) / 60) * hourHeight;
                    const gapHeight = Math.max(20, ((gap.durationMinutes) / 60) * hourHeight - 2);
                    const isCompact = gap.durationMinutes <= 45;

                    return (
                      <div
                        key={`gap-${gap.startTimeStr}-${gap.endTimeStr}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickY = e.clientY - rect.top;
                          const clickedMin = gap.startMinutes + (clickY / hourHeight) * 60;
                          const roundedMin = Math.max(
                            gap.startMinutes,
                            Math.min(gap.endMinutes - 30, Math.floor(clickedMin / 30) * 30)
                          );
                          const targetTime = formatMinutesToTime(roundedMin);
                          onSlotClick(dateStr, targetTime, col.professionalId);
                        }}
                        style={{
                          top: `${gapTop + 1}px`,
                          height: `${gapHeight}px`,
                          left: '2px',
                          right: '2px'
                        }}
                        className={`absolute z-5 rounded-xl border border-dashed border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-100/60 transition-all flex flex-col items-center justify-center cursor-pointer group/gap overflow-hidden p-1 text-center select-none shadow-2xs ${
                          isCompact ? 'py-0.5' : 'py-1'
                        }`}
                        title={`Horário livre: ${gap.startTimeStr} às ${gap.endTimeStr} (${gap.durText}). Clique para agendar neste intervalo.`}
                      >
                        {isCompact ? (
                          <div className="flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold text-emerald-800">
                            <span className="font-mono">{gap.startTimeStr} - {gap.endTimeStr}</span>
                            <span>·</span>
                            <span>Livre</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-0.5 max-w-full">
                            <span className="font-mono text-[9px] sm:text-[9.5px] font-bold text-emerald-900 bg-white/90 px-1.5 py-0.2 rounded border border-emerald-200/70 shadow-2xs">
                              {gap.startTimeStr} - {gap.endTimeStr}
                            </span>
                            <span className="text-[9.5px] sm:text-[10px] font-extrabold text-emerald-800 leading-tight">
                              Livre ({gap.durText})
                            </span>
                            <span className="opacity-0 group-hover/gap:opacity-100 transition-opacity text-[8px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded-full mt-0.5">
                              + Agendar
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Eventos Posicionados de Forma Absoluta */}
                {layoutItems.map((evt) => {
                  const durationMinutes = evt.endMinutes - evt.startMinutes;
                  const top = ((evt.startMinutes - gridStartMinutes) / 60) * hourHeight;
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
                  // 2. AGENDAMENTO NORMAL (Formato Horário | Nome do Cliente e dados ricos)
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
                        {/* Linha 1: Bolinha de Status | Horário | Nome da Cliente */}
                        <div className="flex items-center gap-1.5 min-w-0 leading-tight">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/90 shadow-2xs"
                            style={{ backgroundColor: colorStyle.statusColor }}
                            title={`Status: ${appt.status}`}
                          />
                          <span className="text-[9px] sm:text-[9.5px] font-mono font-extrabold shrink-0">
                            {appt.startTime}
                          </span>
                          <span className="text-[8.5px] sm:text-[9px] font-bold opacity-60 shrink-0">|</span>
                          <span className="text-[9.5px] sm:text-[10.5px] font-extrabold truncate">
                            {appt.client?.name || 'Cliente'}
                          </span>
                        </div>

                        {/* Linha 2: Procedimento / Serviço */}
                        {!isUltraCompact && (
                          <div className="mt-0.5 min-w-0">
                            <span className="text-[8px] sm:text-[8.5px] uppercase font-bold tracking-tight block truncate opacity-90">
                              {serviceName}
                            </span>
                          </div>
                        )}

                        {/* Linha 3: Profissional e Preço (para preencher espaço em cards maiores) */}
                        {height >= 48 && (
                          <div className="mt-auto pt-1 flex items-center justify-between text-[8px] sm:text-[8.5px] opacity-90 border-t border-current/15 leading-none">
                            <span className="font-semibold truncate">
                              {appt.professional?.name ? appt.professional.name.split(' ')[0] : ''}
                            </span>
                            {appt.totalPrice ? (
                              <span className="font-bold shrink-0">
                                R$ {Number(appt.totalPrice).toFixed(0)}
                              </span>
                            ) : null}
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
