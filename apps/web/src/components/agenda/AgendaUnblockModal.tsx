'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { BlockItem, ProfessionalItem } from './types';

interface AgendaUnblockModalProps {
  block: BlockItem;
  professionals?: ProfessionalItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export function AgendaUnblockModal({
  block,
  professionals = [],
  onClose,
  onSuccess
}: AgendaUnblockModalProps) {
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const professionalName =
    block.professional?.name ||
    professionals.find((p) => p.id === block.professionalId)?.name ||
    'Toda a Equipe / Geral';

  const formatRecurrence = () => {
    if (block.dayOfWeek !== null && block.dayOfWeek !== undefined) {
      return `Toda ${DAY_NAMES[block.dayOfWeek]} (Recorrente semanal)`;
    }
    if (block.date) {
      const dStr = typeof block.date === 'string' ? block.date.slice(0, 10) : '';
      const [year, month, day] = dStr.split('-');
      return `${day}/${month}/${year}`;
    }
    return 'Data pontual';
  };

  const handleUnblock = async () => {
    setLoadingDelete(true);
    setError(null);
    try {
      await api.delete(`/blocks/${block.id}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao desbloquear horário na agenda.');
      setLoadingDelete(false);
    }
  };

  const handleTogglePause = async () => {
    setLoadingToggle(true);
    setError(null);
    try {
      await api.patch(`/blocks/${block.id}/toggle`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao alterar status do bloqueio.');
      setLoadingToggle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Desbloquear Horário
            </h3>
            <p className="text-xs text-slate-500">
              Gerencie ou libere este horário para agendamentos
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Cartão de Detalhes do Bloqueio */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Motivo do Bloqueio
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  block.isPaused
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {block.isPaused ? 'Pausado' : 'Bloqueio Ativo'}
              </span>
            </div>

            <p className="text-base font-bold text-slate-800">{block.reason}</p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Horário
                </span>
                <span className="font-mono font-bold text-slate-700">
                  {block.startTime} às {block.endTime}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Data / Dia
                </span>
                <span className="font-semibold text-slate-700">
                  {formatRecurrence()}
                </span>
              </div>

              <div className="col-span-2 pt-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Profissional
                </span>
                <span className="font-semibold text-slate-700">
                  {professionalName}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Ao desbloquear, o intervalo será liberado imediatamente para que clientes possam agendar novos horários.
          </p>

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              disabled={loadingDelete || loadingToggle}
              onClick={handleUnblock}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 text-center"
            >
              {loadingDelete ? 'Desbloqueando horário...' : 'Desbloquear Horário (Excluir)'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loadingDelete || loadingToggle}
                onClick={handleTogglePause}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 text-center"
              >
                {loadingToggle
                  ? 'Aguarde...'
                  : block.isPaused
                  ? 'Reativar Bloqueio'
                  : 'Pausar Bloqueio'}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={loadingDelete || loadingToggle}
                className="py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
