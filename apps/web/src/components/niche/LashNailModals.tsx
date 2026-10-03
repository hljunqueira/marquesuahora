'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, Clock, Check, X, ShieldAlert } from 'lucide-react';

interface LashNailPhaseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhase: (phase: 'NEW_SET' | 'MAINTENANCE' | 'REMOVAL') => void;
}

export const LashNailPhaseSelectorModal: React.FC<LashNailPhaseSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectPhase
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

          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mb-4 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-display font-bold text-slate-900">
            Fase do Procedimento
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Selecione qual etapa você precisa realizar neste atendimento:
          </p>

          <div className="mt-6 space-y-3 text-left">
            <button
              type="button"
              onClick={() => {
                onSelectPhase('NEW_SET');
                onClose();
              }}
              className="w-full p-4 rounded-2xl bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/80 transition-all flex items-center justify-between group"
            >
              <div>
                <strong className="text-sm font-semibold text-rose-950 block">✨ Aplicação Nova Completa</strong>
                <span className="text-xs text-rose-700">Primeira vez ou sem extensão prévia</span>
              </div>
              <span className="text-xs font-mono font-bold text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-sm">
                2h - 2h30
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectPhase('MAINTENANCE');
                onClose();
              }}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-between group"
            >
              <div>
                <strong className="text-sm font-semibold text-slate-900 block">🌸 Manutenção Periódica</strong>
                <span className="text-xs text-slate-600">Para procedimentos feitos há 15-21 dias</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                1h15 - 1h30
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectPhase('REMOVAL');
                onClose();
              }}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-between group"
            >
              <div>
                <strong className="text-sm font-semibold text-slate-900 block">🫧 Remoção Segura</strong>
                <span className="text-xs text-slate-600">Retirada sem danificar os fios ou unhas</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                30 - 45 min
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface ForeignWorkAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmForeignWork: (addForeignRemoval: boolean) => void;
}

export const ForeignWorkAlertModal: React.FC<ForeignWorkAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirmForeignWork
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

          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-display font-bold text-slate-900">
            Trabalho de Outro Espaço?
          </h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Se você está com unhas ou extensões feitas por outro profissional, é necessário realizar a remoção prévia segura para aplicar nosso padrão com perfeição e durabilidade.
          </p>

          <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-700">
            <strong>Inclusão automática:</strong> Remoção de Terceiros (+30 min contínuos • R$ 30,00 adicionais).
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onConfirmForeignWork(true);
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Sim, tenho material de outro local</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirmForeignWork(false);
                onClose();
              }}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all"
            >
              Não, minhas unhas/cílios estão naturais
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
