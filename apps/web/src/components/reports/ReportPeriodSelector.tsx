'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type ReportPeriodPreset = 'today' | 'week' | 'month' | 'last30' | 'year' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface ReportPeriodSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  tenantColor?: string;
}

export function ReportPeriodSelector({
  value,
  onChange,
  className = '',
  tenantColor = '#5c0701',
}: ReportPeriodSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<ReportPeriodPreset>('month');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate.slice(0, 10));
  const [customEnd, setCustomEnd] = useState(value.endDate.slice(0, 10));

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePresetSelect = (preset: ReportPeriodPreset) => {
    setSelectedPreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = formatLocalDate(now);
      setShowCustomPicker(false);
      onChange({
        startDate: todayStr,
        endDate: todayStr,
        label: 'Hoje',
      });
    } else if (preset === 'week') {
      const dayOfWeek = now.getDay(); // 0 is Sunday
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      setShowCustomPicker(false);
      onChange({
        startDate: formatLocalDate(monday),
        endDate: formatLocalDate(sunday),
        label: 'Esta Semana',
      });
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setShowCustomPicker(false);
      const monthName = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      onChange({
        startDate: formatLocalDate(firstDay),
        endDate: formatLocalDate(lastDay),
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      });
    } else if (preset === 'last30') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 29);

      setShowCustomPicker(false);
      onChange({
        startDate: formatLocalDate(past30),
        endDate: formatLocalDate(now),
        label: 'Últimos 30 Dias',
      });
    } else if (preset === 'year') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      const lastDayOfYear = new Date(now.getFullYear(), 11, 31);

      setShowCustomPicker(false);
      onChange({
        startDate: formatLocalDate(firstDayOfYear),
        endDate: formatLocalDate(lastDayOfYear),
        label: `Ano de ${now.getFullYear()}`,
      });
    } else if (preset === 'custom') {
      setShowCustomPicker(true);
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    onChange({
      startDate: customStart,
      endDate: customEnd,
      label: `${customStart.split('-').reverse().join('/')} até ${customEnd.split('-').reverse().join('/')}`,
    });
  };

  const presets: { id: ReportPeriodPreset; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Este Mês' },
    { id: 'last30', label: '30 Dias' },
    { id: 'year', label: 'Ano Atual' },
    { id: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Segmented Preset Selector */}
      <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200/90 rounded-xl overflow-x-auto max-w-full shadow-2xs">
        {presets.map((preset) => {
          const isActive = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              style={isActive ? { backgroundColor: tenantColor, color: '#ffffff' } : undefined}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'shadow-xs font-bold text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Popover/Inputs */}
      {showCustomPicker && (
        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-transparent border-none text-slate-800 focus:outline-none text-xs"
            />
          </div>
          <span className="text-slate-300 font-light">—</span>
          <div className="flex items-center gap-1.5 px-2">
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-transparent border-none text-slate-800 focus:outline-none text-xs"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustom}
            style={{ backgroundColor: tenantColor }}
            className="px-3 py-1 text-white rounded-lg font-bold transition hover:opacity-90 cursor-pointer shadow-2xs"
          >
            Filtrar
          </button>
        </div>
      )}
    </div>
  );
}
