'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface BarChartItem {
  label: string;
  sublabel?: string;
  value: number;
  secondaryValue?: number;
  color?: string;
  formattedValue?: string;
}

interface ReportBarChartProps {
  items?: BarChartItem[];
  data?: BarChartItem[];
  height?: number;
  isCurrency?: boolean;
  emptyMessage?: string;
  primaryColor?: string;
  orientation?: 'vertical' | 'horizontal';
  showRank?: boolean;
}

export function ReportBarChart({
  items,
  data,
  height = 220,
  isCurrency = false,
  emptyMessage = 'Nenhum dado registrado para o período.',
  primaryColor = '#5c0701',
  orientation = 'vertical',
  showRank = false,
}: ReportBarChartProps) {
  const chartItems = items || data || [];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatValue = (val: number, item?: BarChartItem) => {
    if (item?.formattedValue) {
      return item.formattedValue;
    }
    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  // Abrevia rótulos de forma inteligente para que não colidam no eixo X vertical
  const formatShortLabel = (label: string) => {
    const l = label.trim().toLowerCase();
    if (l.startsWith('segunda')) return 'Seg';
    if (l.startsWith('terça') || l.startsWith('terca')) return 'Ter';
    if (l.startsWith('quarta')) return 'Qua';
    if (l.startsWith('quinta')) return 'Qui';
    if (l.startsWith('sexta')) return 'Sex';
    if (l.startsWith('sábado') || l.startsWith('sabado')) return 'Sáb';
    if (l.startsWith('domingo')) return 'Dom';
    // Se for formato de horário "08:00" ou "08:00 - 10:00"
    if (/^\d{2}:\d{2}/.test(label)) {
      const match = label.match(/^(\d{2})/);
      return match ? `${match[1]}h` : label;
    }
    if (label.length > 8) {
      return label.slice(0, 6) + '..';
    }
    return label;
  };

  const maxValue = Math.max(...chartItems.map((i) => Number(i.value) || 0), 1);

  if (chartItems.length === 0 || chartItems.every((i) => Number(i.value) === 0)) {
    return (
      <div
        style={{ minHeight: `${height}px` }}
        className="w-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-medium p-6"
      >
        {emptyMessage}
      </div>
    );
  }

  // 1. MODO HORIZONTAL (Listas de Ranking / Barras Deitadas)
  if (orientation === 'horizontal') {
    return (
      <div className="space-y-3 w-full">
        {chartItems.map((item, idx) => {
          const numVal = Number(item.value) || 0;
          const pct = Math.max(3, Math.min(100, Math.round((numVal / maxValue) * 100)));
          const barColor = item.color || primaryColor;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group space-y-1.5 cursor-default transition-all"
            >
              <div className="flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {showRank && (
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center font-mono shrink-0">
                      #{idx + 1}
                    </span>
                  )}
                  <span
                    className="font-bold text-slate-800 truncate"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </div>
                <span className="font-extrabold font-mono text-slate-900 shrink-0">
                  {formatValue(numVal, item)}
                </span>
              </div>

              {/* Trilho de Fundo e Barra */}
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.03 }}
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: barColor,
                    filter: isHovered ? 'brightness(1.15)' : 'none',
                  }}
                />
              </div>

              {item.sublabel && (
                <span className="text-[10px] text-slate-400 font-medium block">
                  {item.sublabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 2. MODO VERTICAL (Dias da Semana / Horários / Histogramas)
  return (
    <div className="w-full relative pt-6" style={{ height: `${height}px` }}>
      {/* Linhas de grade de fundo pontilhadas */}
      <div className="absolute inset-x-0 bottom-8 top-6 flex flex-col justify-between pointer-events-none opacity-30">
        <div className="w-full border-b border-dashed border-slate-300" />
        <div className="w-full border-b border-dashed border-slate-300" />
        <div className="w-full border-b border-dashed border-slate-300" />
      </div>

      {/* Container das Barras Verticais */}
      <div className="absolute inset-x-0 bottom-8 top-6 flex items-end justify-between gap-1.5 sm:gap-3 px-2">
        {chartItems.map((item, idx) => {
          const numVal = Number(item.value) || 0;
          const heightPct = Math.max(4, Math.round((numVal / maxValue) * 100));
          const barColor = item.color || primaryColor;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex-1 h-full flex flex-col items-center justify-end relative group cursor-pointer"
            >
              {/* Tooltip com contenção para não vazar o card */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 2, scale: 0.95 }}
                    className="absolute -top-7 z-30 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-lg whitespace-nowrap pointer-events-none font-mono tracking-tight"
                  >
                    <span>{item.label}: </span>
                    <span className="font-extrabold">{formatValue(numVal, item)}</span>
                    {item.secondaryValue !== undefined && (
                      <span className="block text-[9px] font-normal text-slate-300">
                        {item.secondaryValue} atendimentos
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trilho de fundo sutil para a barra */}
              <div className="w-full max-w-[34px] h-full rounded-t-lg bg-slate-100/60 flex items-end overflow-hidden">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.03 }}
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    backgroundColor: barColor,
                    filter: isHovered ? 'brightness(1.2)' : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Eixo X com Rótulos Formatados (Sem corte nem sobreposição) */}
      <div className="absolute inset-x-0 bottom-0 h-7 flex items-center justify-between gap-1.5 sm:gap-3 px-2 border-t border-slate-200/90">
        {chartItems.map((item, idx) => (
          <div key={idx} className="flex-1 text-center truncate" title={item.label}>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 block truncate">
              {formatShortLabel(item.label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
