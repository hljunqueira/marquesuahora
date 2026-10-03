'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Scissors, Clock, Plus, X, UserCheck } from 'lucide-react';

interface BarberExpressUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (extraService: { name: string; price: number; durationMinutes: number }) => void;
}

export const BarberExpressUpsellModal: React.FC<BarberExpressUpsellModalProps> = ({
  isOpen,
  onClose,
  onAccept
}) => {
  if (!isOpen) return null;

  const upsellCombo = {
    name: 'Barba Terapia com Toalha Quente',
    price: 35.0,
    durationMinutes: 20
  };

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
            <Scissors className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-display font-semibold text-slate-800">
            Completar com a Barba?
          </h3>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Aproveite a sua cadeira para fazer a <strong>Barba Terapia com Toalha Quente</strong> em bloco contínuo sem esperar.
          </p>

          <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-left">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">{upsellCombo.name}</h4>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>+ {upsellCombo.durationMinutes} minutos contínuos</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-slate-900 font-mono">
                + R$ {upsellCombo.price.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onAccept(upsellCombo);
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar ao Agendamento</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all"
            >
              Continuar apenas com o Corte
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
