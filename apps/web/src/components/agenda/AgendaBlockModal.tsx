'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatLocalDateToYMD } from '@/lib/dateUtils';
import { ProfessionalItem } from './types';

interface AgendaBlockModalProps {
  initialDate?: string;
  initialTime?: string;
  initialProfessionalId?: string;
  professionals: ProfessionalItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_REASONS = ['Almoço', 'Intervalo', 'Folga', 'Reunião', 'Treinamento', 'Consulta'];

function computeNextHour(timeStr: string): string {
  const [h, m] = (timeStr || '12:00').split(':').map(Number);
  const nextH = Math.min(23, (h || 0) + 1);
  return `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

export function AgendaBlockModal({
  initialDate,
  initialTime,
  initialProfessionalId,
  professionals,
  onClose,
  onSuccess
}: AgendaBlockModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [professionalId, setProfessionalId] = useState<string>(
    initialProfessionalId || ''
  );
  const [dateStr, setDateStr] = useState<string>(
    initialDate || formatLocalDateToYMD(new Date())
  );
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // 1 = Segunda
  const [startTime, setStartTime] = useState<string>(initialTime || '12:00');
  const [endTime, setEndTime] = useState<string>(
    initialTime ? computeNextHour(initialTime) : '13:00'
  );
  const [reason, setReason] = useState<string>('Almoço');

  useEffect(() => {
    if (initialDate) setDateStr(initialDate);
    if (initialTime) {
      setStartTime(initialTime);
      setEndTime(computeNextHour(initialTime));
    }
    if (initialProfessionalId !== undefined) {
      setProfessionalId(initialProfessionalId || '');
    }
  }, [initialDate, initialTime, initialProfessionalId]);

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (val >= endTime) {
      setEndTime(computeNextHour(val));
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Informe o motivo do bloqueio.');
      return;
    }

    if (startTime >= endTime) {
      setError('O horário inicial deve ser anterior ao horário final.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/blocks', {
        professionalId: professionalId || undefined,
        date: isRecurrent ? undefined : dateStr,
        dayOfWeek: isRecurrent ? dayOfWeek : undefined,
        startTime,
        endTime,
        reason: reason.trim(),
        isPaused: false
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Falha ao salvar bloqueio na agenda.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bloquear Horário
            </h3>
            <p className="text-xs text-slate-500">
              Impeça novos agendamentos neste intervalo
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Profissional Afetado
            </label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600 cursor-pointer"
            >
              <option value="">Todo o Estabelecimento</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Motivo do Bloqueio *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
            />

            {/* Presets rápidos */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    reason === preset
                      ? 'bg-purple-100 text-purple-800 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle de Recorrência */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="recurrent"
              checked={isRecurrent}
              onChange={(e) => setIsRecurrent(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label
              htmlFor="recurrent"
              className="text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Repetir semanalmente neste dia
            </label>
          </div>

          {isRecurrent ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Dia da Semana
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600 cursor-pointer"
              >
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
                <option value={0}>Domingo</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data do Bloqueio
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold outline-hidden focus:border-purple-600 cursor-pointer"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Início
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold outline-hidden focus:border-purple-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Fim
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold outline-hidden focus:border-purple-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Confirmar Bloqueio</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
