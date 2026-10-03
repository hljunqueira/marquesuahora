'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Clock, Sparkles, Check, X, ShieldAlert } from 'lucide-react';

interface SalonPatchTestNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SalonPatchTestNoticeModal: React.FC<SalonPatchTestNoticeModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl z-10 border border-slate-100 overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center mb-4 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-display font-semibold text-slate-800">
            Aviso de Teste de Mecha
          </h3>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Procedimentos químicos intensos (coloração global, mechas ou alisamentos) exigem avaliação prévia da fibra capilar para garantir total integridade dos fios.
          </p>

          <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              <span>Recomendação do Profissional</span>
            </div>
            <p>
              Caso seja a sua primeira química conosco neste ano, recomendamos agendar ou comparecer 48 horas antes para um teste de mecha gratuito de 15 minutos.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-violet-700 hover:bg-violet-800 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-700/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Estou ciente e desejo prosseguir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all"
            >
              Voltar ao catálogo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface SalonTimelineSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  totalDurationMinutes: number;
}

export const SalonTimelineSummaryModal: React.FC<SalonTimelineSummaryModalProps> = ({
  isOpen,
  onClose,
  serviceName,
  totalDurationMinutes
}) => {
  if (!isOpen) return null;

  // Divisão estimada em 3 blocos
  const applicationMins = Math.round(totalDurationMinutes * 0.4);
  const processingMins = Math.round(totalDurationMinutes * 0.35);
  const finishingMins = totalDurationMinutes - applicationMins - processingMins;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl z-10 border border-slate-100 overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-display font-bold text-slate-900">
            Cronograma do Atendimento
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {serviceName} • {totalDurationMinutes} minutos no total
          </p>

          <div className="mt-6 space-y-3 text-left">
            <div className="p-3.5 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-violet-900 block">1. Aplicação & Diagnóstico</span>
                <span className="text-[11px] text-violet-600">Preparação e distribuição cuidadosa</span>
              </div>
              <span className="font-mono text-xs font-bold text-violet-800">{applicationMins} min</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-900 block">2. Pausa Química Ativa</span>
                <span className="text-[11px] text-amber-600">Tempo de ação dos pigmentos e ativos</span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-800">{processingMins} min</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">3. Lavatório & Finalização</span>
                <span className="text-[11px] text-emerald-600">Higienização profunda, escova e acabamento</span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-800">{finishingMins} min</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all"
          >
            Entendido
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
