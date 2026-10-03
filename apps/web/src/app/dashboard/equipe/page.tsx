'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  Plus,
  Phone,
  Percent,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ProfessionalMember {
  id: string;
  name: string;
  phone: string;
  color: string;
  commissionPercentage: number;
  isActive: boolean;
}

export default function DashboardEquipePage() {
  const [team, setTeam] = useState<ProfessionalMember[]>([
    {
      id: 'prof-1',
      name: 'Carlos Barbeiro',
      phone: '11988887777',
      color: '#7C3AED',
      commissionPercentage: 50,
      isActive: true
    },
    {
      id: 'prof-2',
      name: 'Juliana Silva',
      phone: '11977776666',
      color: '#059669',
      commissionPercentage: 60,
      isActive: true
    },
    {
      id: 'prof-3',
      name: 'Lucas Hair',
      phone: '11966665555',
      color: '#D97706',
      commissionPercentage: 45,
      isActive: true
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProfessionalMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalMember | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState('#7C3AED');
  const [commission, setCommission] = useState('50');

  const handleOpenCreate = () => {
    setEditingMember(null);
    setName('');
    setPhone('');
    setColor('#7C3AED');
    setCommission('50');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: ProfessionalMember) => {
    setEditingMember(m);
    setName(m.name);
    setPhone(m.phone);
    setColor(m.color);
    setCommission(String(m.commissionPercentage));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      setTeam((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                name,
                phone,
                color,
                commissionPercentage: Number(commission)
              }
            : m
        )
      );
    } else {
      setTeam((prev) => [
        ...prev,
        {
          id: `prof-${Date.now()}`,
          name,
          phone,
          color,
          commissionPercentage: Number(commission),
          isActive: true
        }
      ]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setTeam((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Profissional</span>
        </button>
      </div>

      {/* Grid de Membros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member) => (
          <div
            key={member.id}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-sm shadow-sm"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0)}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono block">
                    {member.phone}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-purple-600" />
                  <span>Comissão:</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {member.commissionPercentage}%
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(member)}
                className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(member)}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Remover"
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
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-100"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-slate-900">
                {editingMember ? 'Editar Profissional' : 'Novo Profissional'}
              </h3>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    WhatsApp do Colaborador *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Comissão (%)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cor na Agenda
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-10 h-9 p-0.5 border border-slate-200 rounded-xl cursor-pointer bg-white"
                      />
                      <span className="text-xs font-mono text-slate-600">{color}</span>
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
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remover Colaborador?"
        description={`Tem certeza que deseja inativar ${deleteTarget?.name}? O histórico financeiro e de atendimentos será preservado.`}
        confirmLabel="Sim, Remover"
        isDestructive={true}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
