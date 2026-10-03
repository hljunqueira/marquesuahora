'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, HeartHandshake, X } from 'lucide-react';

interface NoShowShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  salonPhone: string;
  clientName?: string;
}

export const NoShowShieldModal: React.FC<NoShowShieldModalProps> = ({
  isOpen,
  onClose,
  salonName,
  salonPhone,
  clientName
}) => {
  if (!isOpen) return null;

  // Formata número de WhatsApp limpo
  const cleanPhone = salonPhone.replace(/\D/g, '');
  const greeting = clientName ? `Olá! Me chamo ${clientName}.` : 'Olá!';
  const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
    `${greeting} Gostaria de verificar a disponibilidade para agendar um horário em ${salonName}.`
  )}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
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

          {/* Ícone Acolhedor */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-inner">
            <HeartHandshake className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-display font-bold text-slate-900">
            Atendimento Personalizado
          </h3>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Para garantir o melhor atendimento e organizar seu horário com dedicação exclusiva,
            nossa equipe preparou uma recepção assistida para você.
          </p>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Recepção {salonName} pronta para te ouvir</span>
            </div>
            <p>
              Clique no botão abaixo para conversar diretamente conosco pelo WhatsApp e escolher seu melhor horário com toda comodidade.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Falar com a Recepção no WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all"
            >
              Voltar ao Catálogo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
