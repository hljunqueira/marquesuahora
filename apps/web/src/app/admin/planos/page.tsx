'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bot,
  Calendar,
  DollarSign,
  Percent,
  X
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface PlanData {
  id: string;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  maxProfessionals: number;
  isUnlimitedBookings: boolean;
  monthlyFreeBookings?: number;
  extraBookingFee?: number;
  hasAiAssistant: boolean;
  hasAnamnesis: boolean;
  hasCommissions: boolean;
  hasGoogleCalendar: boolean;
  active: boolean;
}

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<PlanData[]>([
    {
      id: 'pl-1',
      code: 'SOLO',
      name: 'Profissional Solo',
      description: 'Ideal para barbeiros, lash designers e manicures autônomos.',
      monthlyPrice: 59.9,
      maxProfessionals: 1,
      isUnlimitedBookings: false,
      monthlyFreeBookings: 100,
      extraBookingFee: 0.5,
      hasAiAssistant: false,
      hasAnamnesis: true,
      hasCommissions: false,
      hasGoogleCalendar: false,
      active: true
    },
    {
      id: 'pl-2',
      code: 'EQUIPE_PRO',
      name: 'Equipe Pro',
      description: 'Para salões e estúdios consolidados com até 5 colaboradores.',
      monthlyPrice: 129.9,
      maxProfessionals: 5,
      isUnlimitedBookings: true,
      hasAiAssistant: true,
      hasAnamnesis: true,
      hasCommissions: true,
      hasGoogleCalendar: true,
      active: true
    },
    {
      id: 'pl-3',
      code: 'VIP_AI',
      name: 'Império VIP & IA',
      description: 'Sem limites de profissionais com Atendente IA 24/7 no WhatsApp.',
      monthlyPrice: 249.9,
      maxProfessionals: 20,
      isUnlimitedBookings: true,
      hasAiAssistant: true,
      hasAnamnesis: true,
      hasCommissions: true,
      hasGoogleCalendar: true,
      active: true
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('89.90');
  const [maxProfessionals, setMaxProfessionals] = useState('3');
  const [isUnlimitedBookings, setIsUnlimitedBookings] = useState(true);
  const [monthlyFreeBookings, setMonthlyFreeBookings] = useState('150');
  const [extraBookingFee, setExtraBookingFee] = useState('0.40');
  const [hasAiAssistant, setHasAiAssistant] = useState(false);
  const [hasAnamnesis, setHasAnamnesis] = useState(true);
  const [hasCommissions, setHasCommissions] = useState(true);
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  const [active, setActive] = useState(true);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setCode('');
    setName('');
    setDescription('');
    setMonthlyPrice('89.90');
    setMaxProfessionals('3');
    setIsUnlimitedBookings(true);
    setMonthlyFreeBookings('150');
    setExtraBookingFee('0.40');
    setHasAiAssistant(false);
    setHasAnamnesis(true);
    setHasCommissions(true);
    setHasGoogleCalendar(false);
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanData) => {
    setEditingPlan(plan);
    setCode(plan.code);
    setName(plan.name);
    setDescription(plan.description);
    setMonthlyPrice(String(plan.monthlyPrice));
    setMaxProfessionals(String(plan.maxProfessionals));
    setIsUnlimitedBookings(plan.isUnlimitedBookings);
    setMonthlyFreeBookings(String(plan.monthlyFreeBookings || 100));
    setExtraBookingFee(String(plan.extraBookingFee || 0.5));
    setHasAiAssistant(plan.hasAiAssistant);
    setHasAnamnesis(plan.hasAnamnesis);
    setHasCommissions(plan.hasCommissions);
    setHasGoogleCalendar(plan.hasGoogleCalendar);
    setActive(plan.active);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const planPayload: PlanData = {
      id: editingPlan?.id || `pl-${Date.now()}`,
      code: code.toUpperCase().trim(),
      name,
      description,
      monthlyPrice: Number(monthlyPrice),
      maxProfessionals: Number(maxProfessionals),
      isUnlimitedBookings,
      monthlyFreeBookings: isUnlimitedBookings ? undefined : Number(monthlyFreeBookings),
      extraBookingFee: isUnlimitedBookings ? undefined : Number(extraBookingFee),
      hasAiAssistant,
      hasAnamnesis,
      hasCommissions,
      hasGoogleCalendar,
      active
    };

    if (editingPlan) {
      setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? planPayload : p)));
    } else {
      setPlans((prev) => [...prev, planPayload]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Editor Global de Planos Comerciais
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Autonomia total: zero defaults rígidos no banco de dados. Crie, precifique e configure franquias.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Plano</span>
        </button>
      </div>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {p.code}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {p.active ? 'Ativo na Vitrine' : 'Inativo'}
                </span>
              </div>

              <h3 className="text-base font-bold text-white">{p.name}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-mono font-bold text-white">
                  R$ {p.monthlyPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-slate-500">/mês</span>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Limite de Colaboradores:</span>
                  <span className="font-mono font-bold text-white">{p.maxProfessionals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Agendamentos:</span>
                  <span className="font-semibold text-white">
                    {p.isUnlimitedBookings
                      ? 'Ilimitados'
                      : `${p.monthlyFreeBookings}/mês (+ R$ ${p.extraBookingFee?.toFixed(2)} extra)`}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1.5 text-[11px]">
                {p.hasAiAssistant && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Atendente IA
                  </span>
                )}
                {p.hasAnamnesis && (
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Anamnese Digital
                  </span>
                )}
                {p.hasCommissions && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Comissões
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleOpenEdit(p)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Configuração</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação / Edição de Plano */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-white/10 max-h-[90vh] overflow-y-auto text-slate-100"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-white">
                {editingPlan ? 'Editar Plano Comercial' : 'Criar Novo Plano Comercial'}
              </h3>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Código Identificador (Caixa Alta) *
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="EX: EQUIPE_PRO"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-white/10 rounded-xl outline-none font-mono text-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Nome Comercial na Vitrine *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Equipe Pro"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-white/10 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Descrição Comercial
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Para salões de médio porte com múltiplos profissionais"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-white/10 rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Mensalidade (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min={0}
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-white/10 rounded-xl outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Limite Máximo de Profissionais *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={maxProfessionals}
                      onChange={(e) => setMaxProfessionals(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-white/10 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Franquia de Agendamentos */}
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-white/5 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimitedBookings}
                      onChange={(e) => setIsUnlimitedBookings(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span className="text-xs font-semibold text-white">
                      Agendamentos Ilimitados (Sem Franquia Mensal)
                    </span>
                  </label>

                  {!isUnlimitedBookings && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Franquia Mensal Gratuita
                        </label>
                        <input
                          type="number"
                          value={monthlyFreeBookings}
                          onChange={(e) => setMonthlyFreeBookings(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Taxa por Agendamento Extra (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={extraBookingFee}
                          onChange={(e) => setExtraBookingFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggles de Recursos do Sistema */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-300 block mb-2">
                    Recursos Habilitados no Plano:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={hasAiAssistant}
                        onChange={(e) => setHasAiAssistant(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span>Atendente Virtual IA</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={hasAnamnesis}
                        onChange={(e) => setHasAnamnesis(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span>Ficha de Anamnese</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={hasCommissions}
                        onChange={(e) => setHasCommissions(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span>Cálculo de Comissões</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span>Ativo para Venda</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
                  >
                    Salvar Plano
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
