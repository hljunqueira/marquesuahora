'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scissors,
  Plus,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  Sparkles,
  Check,
  X,
  Layers
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  processingMinutes?: number;
  finishingMinutes?: number;
  allowOnlineBooking: boolean;
}

export default function DashboardServicosPage() {
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'srv-1',
      name: 'Corte Degradê & Social',
      category: 'Cabelo',
      durationMinutes: 45,
      price: 50.0,
      allowOnlineBooking: true
    },
    {
      id: 'srv-2',
      name: 'Barba Terapia com Toalha Quente',
      category: 'Barba',
      durationMinutes: 30,
      price: 40.0,
      allowOnlineBooking: true
    },
    {
      id: 'srv-3',
      name: 'Coloração & Mechas Iluminadas',
      category: 'Química & Cor',
      durationMinutes: 180,
      price: 280.0,
      processingMinutes: 45,
      finishingMinutes: 45,
      allowOnlineBooking: true
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Geral');
  const [duration, setDuration] = useState('45');
  const [price, setPrice] = useState('50.00');
  const [processingMinutes, setProcessingMinutes] = useState('0');
  const [finishingMinutes, setFinishingMinutes] = useState('0');

  const handleOpenCreate = () => {
    setEditingService(null);
    setName('');
    setCategory('Cabelo');
    setDuration('45');
    setPrice('50.00');
    setProcessingMinutes('0');
    setFinishingMinutes('0');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (svc: ServiceItem) => {
    setEditingService(svc);
    setName(svc.name);
    setCategory(svc.category);
    setDuration(String(svc.durationMinutes));
    setPrice(String(svc.price));
    setProcessingMinutes(String(svc.processingMinutes || 0));
    setFinishingMinutes(String(svc.finishingMinutes || 0));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingService.id
            ? {
                ...s,
                name,
                category,
                durationMinutes: Number(duration),
                price: Number(price),
                processingMinutes: Number(processingMinutes),
                finishingMinutes: Number(finishingMinutes)
              }
            : s
        )
      );
    } else {
      setServices((prev) => [
        ...prev,
        {
          id: `srv-${Date.now()}`,
          name,
          category,
          durationMinutes: Number(duration),
          price: Number(price),
          processingMinutes: Number(processingMinutes),
          finishingMinutes: Number(finishingMinutes),
          allowOnlineBooking: true
        }
      ]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Serviços & Catálogo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre seus serviços, combos e tempos de pausa química para o agendamento contínuo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Serviço</span>
        </button>
      </div>

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {svc.category}
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  R$ {svc.price.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">
                {svc.name}
              </h3>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{svc.durationMinutes} min</span>
                </div>

                {Boolean(svc.processingMinutes && svc.processingMinutes > 0) && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold">
                    🧪 Pausa: {svc.processingMinutes}m
                  </span>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(svc)}
                className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                title="Editar serviço"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(svc)}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Excluir serviço"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação / Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-slate-900">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Corte Degradê, Mechas, Escova..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ex: Cabelo, Barba"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Duração (min) *
                    </label>
                    <input
                      type="number"
                      required
                      min={5}
                      step={5}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                {/* Blocos de Pausa Química (Gap Booking) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tempo de Pausa Química / Encaixes (Opcional)</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Pausa Química Ativa (min)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={processingMinutes}
                        onChange={(e) => setProcessingMinutes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Finalização / Escova (min)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={finishingMinutes}
                        onChange={(e) => setFinishingMinutes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20"
                  >
                    Salvar Serviço
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Exclusão Segura */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Excluir Serviço?"
        description={`Tem certeza que deseja remover "${deleteTarget?.name}"? Agendamentos futuros já marcados serão preservados historicamente.`}
        confirmLabel="Sim, Excluir"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
