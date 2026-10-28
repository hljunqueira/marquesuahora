'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette, RotateCcw, ChevronDown, Check, X } from 'lucide-react';

export interface StatusColors {
  PENDING: string;
  CONFIRMED: string;
  IN_SERVICE: string;
  COMPLETED: string;
  NO_SHOW: string;
  CANCELLED: string;
}

export const getDefaultStatusColors = (tenantColor?: string): StatusColors => ({
  PENDING: '#d97706',   // Âmbar / Laranja
  CONFIRMED: tenantColor || '#5c0701', // Cor primária do estabelecimento (ex: vinho da Emanuelle)
  IN_SERVICE: '#7c3aed', // Roxo / Violeta
  COMPLETED: '#059669',  // Verde esmeralda
  NO_SHOW: '#e11d48',    // Vermelho alerta / Rose forte
  CANCELLED: '#64748b'   // Cinza ardósia / Slate
});

export function normalizeHex(hex?: string, fallback: string = '#5c0701'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return fallback;
}

interface AgendaStatusColorPickerProps {
  tenantPrimaryColor: string;
  statusColors: StatusColors;
  onUpdateColors: (colors: StatusColors) => void;
}

const PRESET_PALETTES: { name: string; colors: StatusColors }[] = [
  {
    name: 'Padrão Harmonioso',
    colors: {
      PENDING: '#d97706',
      CONFIRMED: '#5c0701',
      IN_SERVICE: '#7c3aed',
      COMPLETED: '#059669',
      NO_SHOW: '#e11d48',
      CANCELLED: '#64748b'
    }
  },
  {
    name: 'Tons Vibrantes',
    colors: {
      PENDING: '#f59e0b',
      CONFIRMED: '#2563eb',
      IN_SERVICE: '#9333ea',
      COMPLETED: '#10b981',
      NO_SHOW: '#ef4444',
      CANCELLED: '#94a3b8'
    }
  },
  {
    name: 'Tons Pastel Suaves',
    colors: {
      PENDING: '#b45309',
      CONFIRMED: '#7c2d12',
      IN_SERVICE: '#6b21a8',
      COMPLETED: '#047857',
      NO_SHOW: '#be123c',
      CANCELLED: '#475569'
    }
  }
];

const STATUS_CONFIGS: {
  key: keyof StatusColors;
  label: string;
  description: string;
  quickSwatches: string[];
}[] = [
  {
    key: 'PENDING',
    label: 'Pendente',
    description: 'Aguardando confirmação ou pagamento de sinal',
    quickSwatches: ['#d97706', '#f59e0b', '#ea580c', '#eab308']
  },
  {
    key: 'CONFIRMED',
    label: 'Confirmado',
    description: 'Horário garantido e confirmado pelo cliente',
    quickSwatches: ['#5c0701', '#2563eb', '#4f46e5', '#0891b2']
  },
  {
    key: 'IN_SERVICE',
    label: 'Em Atendimento',
    description: 'Cliente na cadeira ou cabine em execução',
    quickSwatches: ['#7c3aed', '#9333ea', '#db2777', '#1d4ed8']
  },
  {
    key: 'COMPLETED',
    label: 'Concluído',
    description: 'Atendimento finalizado com sucesso',
    quickSwatches: ['#059669', '#16a34a', '#10b981', '#15803d']
  },
  {
    key: 'NO_SHOW',
    label: 'Não Compareceu (No-Show)',
    description: 'Cliente faltou sem avisar previamente',
    quickSwatches: ['#e11d48', '#dc2626', '#b91c1c', '#f43f5e']
  },
  {
    key: 'CANCELLED',
    label: 'Cancelado',
    description: 'Horário desmarcado ou cancelado',
    quickSwatches: ['#64748b', '#94a3b8', '#475569', '#334155']
  }
];

export function AgendaStatusColorPicker({
  tenantPrimaryColor,
  statusColors,
  onUpdateColors
}: AgendaStatusColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorChange = (statusKey: keyof StatusColors, newColor: string) => {
    const updated = {
      ...statusColors,
      [statusKey]: newColor
    };
    onUpdateColors(updated);
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultStatusColors(tenantPrimaryColor);
    onUpdateColors(defaults);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Botão de Disparo no Header da Agenda */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs hover:border-slate-300 transition-all cursor-pointer shrink-0"
        title="Personalizar as cores dos status na grade da agenda"
      >
        <div className="flex items-center -space-x-1">
          <span
            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
            style={{ backgroundColor: statusColors.PENDING }}
            title="Pendente"
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
            style={{ backgroundColor: statusColors.CONFIRMED }}
            title="Confirmado"
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
            style={{ backgroundColor: statusColors.IN_SERVICE }}
            title="Em Atendimento"
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
            style={{ backgroundColor: statusColors.COMPLETED }}
            title="Concluído"
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
            style={{ backgroundColor: statusColors.NO_SHOW }}
            title="Não Compareceu"
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
            style={{ backgroundColor: statusColors.CANCELLED }}
            title="Cancelado"
          />
        </div>
        <span className="text-slate-800 font-bold hidden md:inline text-[11px]">Cores</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover de Personalização de Todos os Status */}
      {isOpen && (
        <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 z-50 w-80 sm:w-96 max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
          {/* Topo do Popover */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Cores de Todos os Status
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Personalize a cor de exibição de cada status na grade da agenda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lista Completa dos 6 Status */}
          <div className="py-3.5 space-y-3">
            {STATUS_CONFIGS.map((cfg) => {
              const currentColor = statusColors[cfg.key] || '#5c0701';

              return (
                <div
                  key={cfg.key}
                  className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col gap-2 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar redondo indicador de cor */}
                      <div
                        className="w-7 h-7 rounded-full shadow-xs border-2 border-white ring-1 ring-slate-200 shrink-0 transition-transform hover:scale-105"
                        style={{ backgroundColor: currentColor }}
                      />

                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block leading-tight truncate">
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block leading-tight truncate">
                          {cfg.description}
                        </span>
                      </div>
                    </div>

                    {/* Caixinha Seletora de Cor Personalizada (Input de Cor + Código HEX) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="color"
                        value={normalizeHex(currentColor, '#5c0701')}
                        onChange={(e) => handleColorChange(cfg.key, e.target.value)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 cursor-pointer p-0.5 hover:scale-105 transition-transform shadow-2xs"
                        title="Clique para escolher qualquer cor personalizada na paleta completa"
                      />
                      <input
                        type="text"
                        value={currentColor.toUpperCase()}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val.startsWith('#') && val.length <= 7) {
                            handleColorChange(cfg.key, val);
                          } else if (!val.startsWith('#') && val.length <= 6) {
                            handleColorChange(cfg.key, `#${val}`);
                          }
                        }}
                        placeholder="#000000"
                        maxLength={7}
                        className="w-20 px-2 py-1 rounded-lg bg-white border border-slate-200 focus:border-slate-800 font-mono text-[11px] font-bold text-slate-800 text-center outline-none shadow-2xs hover:border-slate-300 transition-colors"
                        title="Digite ou cole um código HEX de cor personalizada"
                      />
                    </div>
                  </div>

                  {/* Amostras Rápidas Sugeridas */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/50">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mr-1">
                      Sugestões:
                    </span>
                    {cfg.quickSwatches.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => handleColorChange(cfg.key, swatch)}
                        className={`w-4 h-4 rounded-full border border-white ring-1 transition-transform cursor-pointer ${
                          currentColor.toLowerCase() === swatch.toLowerCase()
                            ? 'ring-slate-900 scale-125'
                            : 'ring-slate-200 hover:scale-110'
                        }`}
                        style={{ backgroundColor: swatch }}
                        title={`Usar tom ${swatch}`}
                      />
                    ))}
                    {cfg.key === 'CONFIRMED' && tenantPrimaryColor && (
                      <button
                        type="button"
                        onClick={() => handleColorChange(cfg.key, tenantPrimaryColor)}
                        className={`w-4 h-4 rounded-full border border-white ring-1 transition-transform cursor-pointer ${
                          currentColor.toLowerCase() === tenantPrimaryColor.toLowerCase()
                            ? 'ring-slate-900 scale-125'
                            : 'ring-slate-200 hover:scale-110'
                        }`}
                        style={{ backgroundColor: tenantPrimaryColor }}
                        title="Usar Cor Oficial do Estabelecimento"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paletas Rápidas Prontas */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block w-full mb-1">
              Combinações Prontas:
            </span>
            {PRESET_PALETTES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => onUpdateColors(preset.colors)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Rodapé com Restaurar Padrões */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
