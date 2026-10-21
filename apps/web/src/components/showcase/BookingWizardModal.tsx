'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { TenantShowcase } from './types';
import { BookingWizard } from './BookingWizard';

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantShowcase;
  brandColor?: string;
  initialServiceId?: string | null;
}

export function BookingWizardModal({
  isOpen,
  onClose,
  tenant,
  brandColor = '#5c0701',
  initialServiceId
}: BookingWizardModalProps) {
  // Trava a rolagem do body quando o modal/sheet estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          {/* Backdrop Escurecido com Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Container do Modal / Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col border border-slate-200/90"
          >
            {/* Barra de Fechamento e Alça de Toque no Mobile */}
            <div className="pt-3 px-4 pb-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="lg:hidden flex-1 flex justify-center pl-8">
                <div className="w-10 h-1 bg-slate-300 rounded-full" />
              </div>
              <div className="hidden lg:block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Agendamento Online · {tenant.name}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                title="Fechar agendamento"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do BookingWizard */}
            <div className="overflow-y-auto flex-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
              <BookingWizard
                tenant={tenant}
                brandColor={brandColor}
                initialServiceId={initialServiceId || undefined}
                onClose={onClose}
                isModal={true}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
