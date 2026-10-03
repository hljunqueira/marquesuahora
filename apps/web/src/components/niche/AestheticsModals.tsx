'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertTriangle, Check, X, FileText } from 'lucide-react';

interface ClinicalIntakeScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPass: (answers: { pregnantOrLactating: boolean; allergies: boolean; recentAestheticProcedures: boolean }) => void;
}

export const ClinicalIntakeScreeningModal: React.FC<ClinicalIntakeScreeningModalProps> = ({
  isOpen,
  onClose,
  onPass
}) => {
  const [pregnantOrLactating, setPregnantOrLactating] = useState<boolean | null>(null);
  const [allergies, setAllergies] = useState<boolean | null>(null);
  const [recentAestheticProcedures, setRecentAestheticProcedures] = useState<boolean | null>(null);
  const [hasIncompatibility, setHasIncompatibility] = useState(false);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (pregnantOrLactating === true) {
      setHasIncompatibility(true);
      return;
    }

    onPass({
      pregnantOrLactating: pregnantOrLactating || false,
      allergies: allergies || false,
      recentAestheticProcedures: recentAestheticProcedures || false
    });
    onClose();
  };

  const isFormComplete =
    pregnantOrLactating !== null &&
    allergies !== null &&
    recentAestheticProcedures !== null;

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
          className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl z-10 border border-slate-100 overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-display font-bold text-slate-900">
            Triagem Clínica Prévia
          </h3>

          <p className="mt-1 text-xs text-slate-600">
            Para sua total segurança, confirme três perguntas simples antes de reservar:
          </p>

          <div className="mt-6 space-y-4 text-left">
            {/* Questão 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-800 block mb-2">
                1. Você está gestante ou em período de lactação?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPregnantOrLactating(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    pregnantOrLactating === true
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPregnantOrLactating(false);
                    setHasIncompatibility(false);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    pregnantOrLactating === false
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            {/* Questão 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-800 block mb-2">
                2. Possui histórico de alergia a anestésicos tópicos ou ácidos?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllergies(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    allergies === true
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setAllergies(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    allergies === false
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            {/* Questão 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-800 block mb-2">
                3. Realizou algum peeling ou procedimento injetável nos últimos 30 dias?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecentAestheticProcedures(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    recentAestheticProcedures === true
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setRecentAestheticProcedures(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    recentAestheticProcedures === false
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          {hasIncompatibility && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>
                Para sua segurança e do bebê, alguns procedimentos estéticos possuem contraindicação absoluta na gestação e lactação. Entre em contato direto com a clínica para orientação médica especializada.
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!isFormComplete || hasIncompatibility}
              onClick={handleContinue}
              className="w-full py-3.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar e Continuar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface PreCareGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreCareGuidelinesModal: React.FC<PreCareGuidelinesModalProps> = ({
  isOpen,
  onClose
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

          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 shadow-inner">
            <FileText className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-display font-bold text-slate-900">
            Recomendações Pré-Procedimento
          </h3>

          <div className="mt-5 space-y-2.5 text-left text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <strong className="text-slate-800 block">☀️ Proteção Solar:</strong>
              Evite exposição solar intensa 48h antes e use protetor com FPS 50+.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <strong className="text-slate-800 block">🧴 Ácidos e Esfoliantes:</strong>
              Suspenda o uso de ácidos fortes (retinoico, glicólico) 3 dias antes.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <strong className="text-slate-800 block">💧 Hidratação:</strong>
              Mantenha boa ingestão de água para otimizar o viço e a regeneração cutânea.
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
