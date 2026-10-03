'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  isLoading = false
}) => {
  // Fecha ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Bloqueia scroll do body enquanto aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={!isLoading ? onClose : undefined}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-10 overflow-hidden"
          >
            {/* Botão de Fechar */}
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Fechar modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl flex-shrink-0 ${
                  isDestructive ? 'bg-red-50 text-red-600' : 'bg-brand-purple/10 text-brand-purple'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="flex-1 pr-4">
                <h3 className="text-lg font-display font-semibold text-slate-900 leading-snug">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
              </div>
            </div>

            {/* Ações */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 ${
                  isDestructive
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                    : 'bg-brand-purple hover:bg-brand-purple/90 shadow-brand-purple/20'
                }`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{confirmLabel}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
