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
}

export function ReportBarChart({
  items,
  data,
  height = 200,
  isCurrency = false,
  emptyMessage = 'Nenhum dado registrado para o período.',
  primaryColor = '#5c0701',
  orientation = 'vertical'
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

  const maxValue = Math.max(...chartItems.map((i) => i.value), 1);

  if (chartItems.length === 0 || chartItems.every((i) => i.value === 0)) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-medium"
      >
        {emptyMessage}
      </div>
    );
  }

  if (orientation === 'horizontal') {
    return (
      <div className="space-y-2.5 w-full">
        {chartItems.map((item, idx) => {
          const pct = Math.max(4, Math.round((item.value / maxValue) * 100));
          const barColor = item.color || primaryColor;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group space-y-1 cursor-default"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                  {item.label}
                </span>
                <span className="font-extrabold font-mono text-slate-900">
                  {formatValue(item.value, item)}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.05 }}
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: barColor,
                    filter: isHovered ? 'brightness(1.1)' : 'none'
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

  // Modo Vertical (Default)
  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      {/* Grade de fundo tracejada */}
      <div className="absolute inset-x-0 bottom-6 top-2 flex flex-col justify-between pointer-events-none opacity-40">
        <div className="w-full border-b border-dashed border-slate-200" />
        <div className="w-full border-b border-dashed border-slate-200" />
        <div className="w-full border-b border-dashed border-slate-200" />
      </div>

      {/* Barras Verticais */}
      <div className="absolute inset-x-0 bottom-6 top-2 flex items-end justify-between gap-1 sm:gap-2 px-1">
        {chartItems.map((item, idx) => {
          const heightPct = Math.max(3, Math.round((item.value / maxValue) * 100));
          const barColor = item.color || primaryColor;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex-1 h-full flex flex-col items-center justify-end relative group cursor-pointer"
            >
              {/* Tooltip flutuante suave */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 2, scale: 0.95 }}
                    className="absolute -top-10 z-20 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-lg whitespace-nowrap pointer-events-none font-mono"
                  >
                    {formatValue(item.value, item)}
                    {item.secondaryValue !== undefined && (
                      <span className="block text-[9px] font-normal text-slate-300">
                        {item.secondaryValue} atendimentos
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Barra Animada */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.04 }}
                className="w-full max-w-[36px] rounded-t-lg transition-all"
                style={{
                  backgroundColor: barColor,
                  filter: isHovered ? 'brightness(1.15)' : 'none'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Rótulos no eixo X */}
      <div className="absolute inset-x-0 bottom-0 h-6 flex items-center justify-between gap-1 sm:gap-2 px-1 border-t border-slate-200">
        {chartItems.map((item, idx) => (
          <div key={idx} className="flex-1 text-center truncate">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 block truncate">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
