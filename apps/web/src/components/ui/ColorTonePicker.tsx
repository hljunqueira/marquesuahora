'use client';

import React from 'react';

interface ColorTonePickerProps {
  color: string;
  onChangeColor: (newColor: string) => void;
  baseSwatches?: { hex: string; label: string }[];
  showPreview?: boolean;
}

export const DEFAULT_PROCEDURE_COLORS = [
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#8B5CF6', label: 'Violeta / Roxo' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#10B981', label: 'Esmeralda / Verde' },
  { hex: '#F59E0B', label: 'Âmbar / Laranja' },
  { hex: '#0EA5E9', label: 'Azul Céu' },
  { hex: '#14B8A6', label: 'Teal' },
  { hex: '#9F1239', label: 'Vinho Bordô' },
  { hex: '#6366F1', label: 'Índigo' },
  { hex: '#64748B', label: 'Ardósia / Grafite' }
];

function normalizeHex(hex?: string, fallback: string = '#3B82F6'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return fallback;
}

export function ColorTonePicker({
  color,
  onChangeColor,
  baseSwatches = DEFAULT_PROCEDURE_COLORS,
  showPreview = true
}: ColorTonePickerProps) {
  const currentHex = color || '#3B82F6';

  return (
    <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
      {/* 1. Seleção da Cor Base e Personalizada */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Cor do Procedimento
          </label>

          {/* Caixinha Seletora de Cor Personalizada (Input de Cor + Código HEX) */}
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={normalizeHex(currentHex, '#3B82F6')}
              onChange={(e) => onChangeColor(e.target.value)}
              className="w-6 h-6 rounded-md bg-white border border-slate-300 cursor-pointer p-0.5 hover:scale-105 transition-transform shadow-2xs"
              title="Clique para escolher qualquer cor personalizada na paleta completa"
            />
            <input
              type="text"
              value={currentHex.toUpperCase()}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val.startsWith('#') && val.length <= 7) {
                  onChangeColor(val);
                } else if (!val.startsWith('#') && val.length <= 6) {
                  onChangeColor(`#${val}`);
                }
              }}
              placeholder="#000000"
              maxLength={7}
              className="w-18 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 focus:border-slate-800 font-mono text-[10.5px] font-bold text-slate-800 text-center outline-none shadow-2xs hover:border-slate-300 transition-colors"
              title="Digite ou cole um código HEX de cor personalizada"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {baseSwatches.map((c) => {
            const isBaseSelected = currentHex.toLowerCase() === c.hex.toLowerCase();

            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => onChangeColor(c.hex)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                  isBaseSelected ? 'scale-115 ring-2 ring-slate-800 ring-offset-2' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              >
                {isBaseSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Preview de como vai aparecer na Agenda */}
      {showPreview && (
        <div className="pt-2 border-t border-slate-200/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Prévia na Grade da Agenda
          </span>
          <div
            className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-left"
            style={{ borderLeftWidth: '4px', borderLeftColor: currentHex }}
          >
            <div className="flex items-center justify-between text-[8.5px] font-mono text-slate-500">
              <span className="font-bold text-slate-700">09:30</span>
              <span className="text-[8px] text-slate-400">Profissional</span>
            </div>
            <div className="text-[10.5px] font-extrabold text-slate-900 leading-tight mt-0.5 truncate">
              Nome da Cliente
            </div>
            <div className="text-[9px] font-semibold text-slate-600 truncate mt-0.5">
              Procedimento / Serviço
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
