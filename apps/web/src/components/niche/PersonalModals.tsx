'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, MapPin, Check, X, ShieldAlert, Car } from 'lucide-react';

interface TrainingLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: { type: 'STUDIO' | 'HOME_CONDO' | 'OUTDOOR'; address?: string }) => void;
}

export const TrainingLocationModal: React.FC<TrainingLocationModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation
}) => {
  const [selectedType, setSelectedType] = useState<'STUDIO' | 'HOME_CONDO' | 'OUTDOOR'>('STUDIO');
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectLocation({
      type: selectedType,
      address: selectedType === 'STUDIO' ? undefined : address
    });
    onClose();
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

          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 shadow-inner">
            <Dumbbell className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-display font-bold text-slate-900">
            Local do Treino
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Onde faremos o seu atendimento presencial?
          </p>

          <div className="mt-6 space-y-3 text-left">
            <button
              type="button"
              onClick={() => setSelectedType('STUDIO')}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                selectedType === 'STUDIO'
                  ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <strong className="text-sm block">🏢 Studio do Treinador</strong>
                <span className="text-xs text-slate-500 font-normal">Estrutura completa com aparelhos e vestiário</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('HOME_CONDO')}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                selectedType === 'HOME_CONDO'
                  ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <strong className="text-sm block">🏡 Condomínio / Sua Residência</strong>
                <span className="text-xs text-slate-500 font-normal flex items-center gap-1 mt-0.5">
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span>Inclui janela de deslocamento de 30 min</span>
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('OUTDOOR')}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                selectedType === 'OUTDOOR'
                  ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <strong className="text-sm block">🌳 Parque / Ao Ar Livre</strong>
                <span className="text-xs text-slate-500 font-normal">Pista de corrida ou espaço público combinado</span>
              </div>
            </button>

            {selectedType !== 'STUDIO' && (
              <div className="mt-3">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Endereço do Local / Ponto de Encontro
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Rua, número, condomínio e bloco"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Local</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
