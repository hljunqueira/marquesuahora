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
  height = 200,
  color = '#5c0701',
  isCurrency = true,
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
        style={{ minHeight: `${height}px` }}
        className="w-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-medium p-6"
      >
        Dados insuficientes no período para gerar a curva de tendência.
      </div>
    );
  }

  const width = 600;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 40;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...points.map((p) => Number(p.value) || 0), 1);
  const minVal = 0;

  // Coordenadas calculadas
  const stepX = (width - paddingX * 2) / (points.length - 1);
  const coords = points.map((p, idx) => {
    const numVal = Number(p.value) || 0;
    const x = paddingX + idx * stepX;
    const y = paddingTop + chartHeight - ((numVal - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, point: p };
  });

  // Caminho suave Bezier
  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i];
    const next = coords[i + 1];
    const controlX = (current.x + next.x) / 2;
    linePath += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

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
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Linhas de grade horizontais sutis */}
        <line
          x1={paddingX}
          y1={paddingTop}
          x2={width - paddingX}
          y2={paddingTop}
          stroke="#f1f5f9"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingTop + chartHeight / 2}
          stroke="#f1f5f9"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={paddingTop + chartHeight}
          x2={width - paddingX}
          y2={paddingTop + chartHeight}
          stroke="#e2e8f0"
        />

        {/* Área sombreada */}
        <path d={areaPath} fill="url(#trendGradient)" />

        {/* Linha principal */}
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
                r={isHovered ? 5.5 : 3.5}
                fill="#ffffff"
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              <text
                x={c.x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#64748b"
                className="select-none"
              >
                {c.point.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip HTML centralizado */}
      <AnimatePresence>
        {hoveredIdx !== null && coords[hoveredIdx] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 2 }}
            style={{
              left: `${(coords[hoveredIdx].x / width) * 100}%`,
              top: `${(coords[hoveredIdx].y / height) * 100}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-11 z-30 px-2.5 py-1 bg-slate-900 text-white rounded-lg shadow-xl text-center pointer-events-none whitespace-nowrap"
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
