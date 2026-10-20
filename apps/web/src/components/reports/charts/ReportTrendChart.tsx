'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface TrendPoint {
  label: string;
  value: number;
  sublabel?: string;
}

interface ReportTrendChartProps {
  points: TrendPoint[];
  height?: number;
  color?: string;
  isCurrency?: boolean;
}

export function ReportTrendChart({
  points = [],
  height = 180,
  color = '#5c0701',
  isCurrency = true
}: ReportTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatValue = (val: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  if (points.length < 2) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-medium"
      >
        Pontos de dados insuficientes para traçar a curva de tendência.
      </div>
    );
  }

  const width = 600;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 35;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const minVal = 0;

  // Calcula coordenadas dos pontos (x, y)
  const stepX = (width - paddingX * 2) / (points.length - 1);
  const coords = points.map((p, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingTop + chartHeight - ((p.value - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, point: p };
  });

  // Gera o caminho suave em curva Bezier (Curved path)
  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i];
    const next = coords[i + 1];
    const controlX = (current.x + next.x) / 2;
    linePath += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  // Gera o caminho de preenchimento da área
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Linhas de grade sutis */}
        <line
          x1={paddingX}
          y1={paddingTop}
          x2={width - paddingX}
          y2={paddingTop}
          stroke="#e2e8f0"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingTop + chartHeight / 2}
          stroke="#e2e8f0"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={paddingTop + chartHeight}
          x2={width - paddingX}
          y2={paddingTop + chartHeight}
          stroke="#cbd5e1"
        />

        {/* Área preenchida com gradiente */}
        <path d={areaPath} fill="url(#trendGradient)" />

        {/* Linha principal da curva */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Pontos interativos */}
        {coords.map((c, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g key={idx}>
              <circle
                cx={c.x}
                cy={c.y}
                r={isHovered ? 6 : 4}
                fill="#ffffff"
                stroke={color}
                strokeWidth={isHovered ? 3 : 2}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* Rótulo no eixo X */}
              <text
                x={c.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="#64748b"
                className="select-none"
              >
                {c.point.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip HTML absoluto */}
      <AnimatePresence>
        {hoveredIdx !== null && coords[hoveredIdx] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 2 }}
            style={{
              left: `${(coords[hoveredIdx].x / width) * 100}%`,
              top: `${(coords[hoveredIdx].y / height) * 100}%`
            }}
            className="absolute -translate-x-1/2 -translate-y-12 z-20 px-2.5 py-1 bg-slate-900 text-white rounded-lg shadow-xl text-center pointer-events-none whitespace-nowrap"
          >
            <span className="text-[10px] text-slate-300 block font-medium">
              {coords[hoveredIdx].point.label}
            </span>
            <span className="text-xs font-extrabold font-mono text-white">
              {formatValue(coords[hoveredIdx].point.value)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
