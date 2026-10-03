'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Sparkles, Check, X, Clock } from 'lucide-react';
import { InputMask } from '../ui/InputMask';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  selectedDate: string;
  onSubmit: (data: { clientName: string; clientPhone: string; preferredShift: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ANY' }) => Promise<void>;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  salonName,
  selectedDate,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState<'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ANY'>('ANY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.replace(/\D/g, '').length < 10) return;

    try {
      setIsSubmitting(true);
      await onSubmit({ clientName: name, clientPhone: phone, preferredShift: shift });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
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

          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4 shadow-inner">
            <UserPlus className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-display font-bold text-slate-900">
            Lista de Espera Inteligente
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Os horários estão preenchidos para esta data. Entre na fila de espera prioritária de {salonName}:
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 text-left">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Seu Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Seu WhatsApp</label>
              <InputMask
                mask="phone"
                required
                value={phone}
                onChangeValue={(formatted) => setPhone(formatted)}
                placeholder="(00) 00000-0000"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Turno de Preferência</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'ANY', label: 'Qualquer' },
                  { id: 'MORNING', label: '☀️ Manhã' },
                  { id: 'AFTERNOON', label: '🌤️ Tarde' },
                  { id: 'NIGHT', label: '🌙 Noite' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShift(s.id as any)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-medium border text-center transition-all ${
                      shift === s.id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Assim que um cliente desmarcar ou remarcar, você será avisado instantaneamente no seu WhatsApp com 10 minutos de preferência!
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name || phone.replace(/\D/g, '').length < 10}
              className="mt-4 w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Entrando na lista...' : 'Entrar na Lista de Espera'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
