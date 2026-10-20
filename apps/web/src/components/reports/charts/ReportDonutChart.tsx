'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';

export interface DonutItem {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

interface ReportDonutChartProps {
  items?: DonutItem[];
  data?: DonutItem[];
  centerLabel?: string;
  centerSublabel?: string;
  isCurrency?: boolean;
  size?: number;
  height?: number;
}

export function ReportDonutChart({
  items,
  data,
  centerLabel,
  centerSublabel = 'Total',
  isCurrency = false,
  size = 180,
  height,
}: ReportDonutChartProps) {
  const chartItems = items || data || [];
  const chartSize = height || size;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatValue = (val: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  const total = chartItems.reduce((acc, i) => acc + i.value, 0);

  if (total === 0 || chartItems.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        Nenhum dado registrado para exibição no gráfico.
      </div>
    );
  }

  // Raio e perímetro do círculo SVG
  const strokeWidth = 24;
  const radius = (chartSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
      {/* Círculo SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: chartSize, height: chartSize }}>
        <svg width={chartSize} height={chartSize} className="transform -rotate-90">
          {/* Fundo do anel */}
          <circle
            cx={chartSize / 2}
            cy={chartSize / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Arcos de cada categoria */}
          {chartItems.map((item, idx) => {
            const itemPercent = item.value / total;
            const strokeDasharray = `${itemPercent * circumference} ${circumference}`;
            const strokeDashoffset = -(accumulatedPercent * circumference);
            accumulatedPercent += itemPercent;
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx={chartSize / 2}
                cy={chartSize / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none'
                }}
              />
            );
          })}
        </svg>

        {/* Centro do Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {hoveredIdx !== null ? chartItems[hoveredIdx].label : centerSublabel}
          </span>
          <span className="text-base font-extrabold text-slate-900 font-mono mt-0.5 leading-tight">
            {hoveredIdx !== null ? formatValue(chartItems[hoveredIdx].value) : centerLabel || formatValue(total)}
          </span>
          {hoveredIdx !== null && (
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {Math.round((chartItems[hoveredIdx].value / total) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Legenda Lateral */}
      <div className="flex-1 space-y-2 w-full max-w-xs">
        {chartItems.map((item, idx) => {
          const pct = Math.round((item.value / total) * 100);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                isHovered ? 'bg-slate-50 border-slate-300 shadow-2xs' : 'border-transparent hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {item.label}
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-slate-900 font-mono block">
                  {formatValue(item.value)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
