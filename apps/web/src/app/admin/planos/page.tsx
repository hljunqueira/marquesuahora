'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { api } from '@/lib/api';

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
  hasProducts: boolean;
  hasAiAssistant: boolean;
  hasAutoWhatsapp: boolean;
  hasAnamnesis: boolean;
  hasCommissions: boolean;
  hasFinancialReports: boolean;
  hasLoyalty: boolean;
  hasMultiUnits: boolean;
  hasVipSupport: boolean;
  active: boolean;
}

const DEFAULT_PLANS: PlanData[] = [
  {
    id: 'pl-free',
    code: 'FREE',
    name: 'Plano Gratuito',
    description: 'Plano gratuito permanente, vitrine básica sem produtos e mensagem manual no WhatsApp.',
    monthlyPrice: 0,
    maxProfessionals: 1,
    isUnlimitedBookings: false,
    monthlyFreeBookings: 50,
    extraBookingFee: 1.5,
    hasProducts: false,
    hasAiAssistant: false,
    hasAutoWhatsapp: false,
    hasAnamnesis: false,
    hasCommissions: false,
    hasFinancialReports: false,
    hasLoyalty: false,
    hasMultiUnits: false,
    hasVipSupport: false,
    active: true
  },
  {
    id: 'pl-solo',
    code: 'SOLO',
    name: 'Profissional Solo',
    description: 'Ideal para profissionais autônomos e pequenos estúdios com até 3 profissionais e WhatsApp manual.',
    monthlyPrice: 29.9,
    maxProfessionals: 3,
    isUnlimitedBookings: true,
    hasProducts: false,
    hasAiAssistant: false,
    hasAutoWhatsapp: false,
    hasAnamnesis: true,
    hasCommissions: false,
    hasFinancialReports: true,
    hasLoyalty: false,
    hasMultiUnits: false,
    hasVipSupport: false,
    active: true
  },
  {
    id: 'pl-equipe',
    code: 'EQUIPE_PRO',
    name: 'Equipe Pro',
    description: 'Para salões e estúdios consolidados com até 5 colaboradores, comissões, gestão de estoque e WhatsApp manual.',
    monthlyPrice: 59.9,
    maxProfessionals: 5,
    isUnlimitedBookings: true,
    hasProducts: true,
    hasAiAssistant: false,
    hasAutoWhatsapp: false,
    hasAnamnesis: true,
    hasCommissions: true,
    hasFinancialReports: true,
    hasLoyalty: false,
    hasMultiUnits: false,
    hasVipSupport: false,
    active: true
  },
  {
    id: 'pl-vip',
    code: 'VIP_AI',
    name: 'Império VIP & IA',
    description: 'Até 10 profissionais com Atendente IA 24/7 e Lembretes automáticos no WhatsApp, fidelidade e multi-unidades.',
    monthlyPrice: 89.9,
    maxProfessionals: 10,
    isUnlimitedBookings: true,
    hasProducts: true,
    hasAiAssistant: true,
    hasAutoWhatsapp: true,
    hasAnamnesis: true,
    hasCommissions: true,
    hasFinancialReports: true,
    hasLoyalty: true,
    hasMultiUnits: true,
    hasVipSupport: true,
    active: true
  }
];

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<PlanData[]>(DEFAULT_PLANS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);

  const loadPlans = async () => {
    try {
      const res = await api.get('/plans/admin');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setPlans(
          res.data.map((p: any) => ({
            ...p,
            monthlyPrice: Number(p.monthlyPrice),
            extraBookingFee: p.extraBookingFee ? Number(p.extraBookingFee) : undefined,
            hasAutoWhatsapp: p.hasAutoWhatsapp ?? false,
            hasProducts: p.hasProducts ?? false,
            hasFinancialReports: p.hasFinancialReports ?? true,
            hasLoyalty: p.hasLoyalty ?? false,
            hasMultiUnits: p.hasMultiUnits ?? false,
            hasVipSupport: p.hasVipSupport ?? false
          }))
        );
        return;
      }
    } catch {
      // fallback gracioso se offline ou mock
    }

    try {
      const saved = localStorage.getItem('marquesuahora_system_plans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlans(parsed);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('89.90');
  const [maxProfessionals, setMaxProfessionals] = useState('3');
  const [isUnlimitedBookings, setIsUnlimitedBookings] = useState(true);
  const [monthlyFreeBookings, setMonthlyFreeBookings] = useState('50');
  const [extraBookingFee, setExtraBookingFee] = useState('1.50');
  const [hasProducts, setHasProducts] = useState(false);
  const [hasAiAssistant, setHasAiAssistant] = useState(false);
  const [hasAutoWhatsapp, setHasAutoWhatsapp] = useState(false);
  const [hasAnamnesis, setHasAnamnesis] = useState(true);
  const [hasCommissions, setHasCommissions] = useState(true);
  const [hasFinancialReports, setHasFinancialReports] = useState(true);
  const [hasLoyalty, setHasLoyalty] = useState(false);
  const [hasMultiUnits, setHasMultiUnits] = useState(false);
  const [hasVipSupport, setHasVipSupport] = useState(false);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setCode('');
    setName('');
    setDescription('');
    setMonthlyPrice('59.90');
    setMaxProfessionals('5');
    setIsUnlimitedBookings(true);
    setMonthlyFreeBookings('50');
    setExtraBookingFee('1.50');
    setHasProducts(true);
    setHasAiAssistant(false);
    setHasAutoWhatsapp(false);
    setHasAnamnesis(true);
    setHasCommissions(true);
    setHasFinancialReports(true);
    setHasLoyalty(false);
    setHasMultiUnits(false);
    setHasVipSupport(false);
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
    setMonthlyFreeBookings(String(plan.monthlyFreeBookings || 50));
    setExtraBookingFee(String(plan.extraBookingFee || 1.5));
    setHasProducts(Boolean(plan.hasProducts));
    setHasAiAssistant(plan.hasAiAssistant);
    setHasAutoWhatsapp(Boolean(plan.hasAutoWhatsapp || plan.code === 'VIP_AI'));
    setHasAnamnesis(plan.hasAnamnesis);
    setHasCommissions(plan.hasCommissions);
    setHasFinancialReports(Boolean(plan.hasFinancialReports));
    setHasLoyalty(Boolean(plan.hasLoyalty));
    setHasMultiUnits(Boolean(plan.hasMultiUnits));
    setHasVipSupport(Boolean(plan.hasVipSupport));
    setActive(plan.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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
      hasProducts,
      hasAiAssistant,
      hasAutoWhatsapp,
      hasAnamnesis,
      hasCommissions,
      hasFinancialReports,
      hasLoyalty,
      hasMultiUnits,
      hasVipSupport,
      active
    };

    try {
      if (editingPlan && !editingPlan.id.startsWith('pl-')) {
        await api.put(`/plans/admin/${editingPlan.id}`, planPayload);
      } else {
        await api.post('/plans/admin', planPayload);
      }
      await loadPlans();
    } catch (err) {
      console.warn('API de planos não disponível, atualizando localmente:', err);
      let updated: PlanData[];
      if (editingPlan) {
        updated = plans.map((p) => (p.id === editingPlan.id ? planPayload : p));
      } else {
        updated = [...plans, planPayload];
      }
      setPlans(updated);
      try {
        localStorage.setItem('marquesuahora_system_plans', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('marquesuahora_plans_sync'));
      } catch {
        // ignore
      }
    } finally {
      setSaving(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Editor Global de Planos Comerciais
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomia total: zero defaults rígidos no banco de dados. Crie, precifique e configure franquias.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Plano</span>
        </button>
      </div>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
                  {p.code}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {p.active ? 'Ativo na Vitrine' : 'Inativo'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.description}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-mono font-bold text-slate-900">
                  R$ {p.monthlyPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-slate-500">/mês</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Limite de Colaboradores:</span>
                  <span className="font-mono font-bold text-slate-900">{p.maxProfessionals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Agendamentos:</span>
                  <span className="font-semibold text-slate-900">
                    {p.isUnlimitedBookings
                      ? 'Ilimitados'
                      : `${p.monthlyFreeBookings}/mês (Trava com upgrade)`}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
                {p.hasAutoWhatsapp ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                    Lembretes Automáticos WhatsApp
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60 font-medium">
                    WhatsApp Manual
                  </span>
                )}
                {p.hasAiAssistant && (
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 font-medium">
                    Atendente IA 24/7
                  </span>
                )}
                {p.hasProducts && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                    Produtos & Estoque
                  </span>
                )}
                {p.hasCommissions && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                    Comissões
                  </span>
                )}
                {p.hasFinancialReports && (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                    Relatório Financeiro
                  </span>
                )}
                {p.hasLoyalty && (
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/60 font-medium">
                    Fidelidade
                  </span>
                )}
                {p.hasMultiUnits && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-medium">
                    Multi-unidades
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleOpenEdit(p)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-200 max-h-[90vh] overflow-y-auto text-slate-800"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-slate-900">
                {editingPlan ? 'Editar Plano Comercial' : 'Criar Novo Plano Comercial'}
              </h3>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Código Identificador (Caixa Alta) *
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="EX: EQUIPE_PRO"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-purple-700 font-bold focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome Comercial na Vitrine *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Equipe Pro"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Descrição Comercial
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Para salões de médio porte com múltiplos profissionais"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Mensalidade (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min={0}
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-900 focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Limite Máximo de Profissionais *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={maxProfessionals}
                      onChange={(e) => setMaxProfessionals(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-900 focus:border-purple-600"
                    />
                  </div>
                </div>

                {/* Franquia de Agendamentos */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimitedBookings}
                      onChange={(e) => setIsUnlimitedBookings(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Agendamentos Ilimitados (Sem Franquia Mensal)
                    </span>
                  </label>

                  {!isUnlimitedBookings && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">
                          Franquia Mensal Gratuita
                        </label>
                        <input
                          type="number"
                          value={monthlyFreeBookings}
                          onChange={(e) => setMonthlyFreeBookings(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">
                          Taxa por Agendamento Extra (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={extraBookingFee}
                          onChange={(e) => setExtraBookingFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggles de Recursos do Sistema */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    Recursos Habilitados no Plano:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasAutoWhatsapp}
                        onChange={(e) => setHasAutoWhatsapp(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Lembretes Automáticos WhatsApp (VIP)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasAiAssistant}
                        onChange={(e) => setHasAiAssistant(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Atendente Virtual IA (WhatsApp)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasProducts}
                        onChange={(e) => setHasProducts(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Gestão de Produtos & Estoque</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasCommissions}
                        onChange={(e) => setHasCommissions(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Comissões & Rateio Automático</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasFinancialReports}
                        onChange={(e) => setHasFinancialReports(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Relatório Financeiro</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasLoyalty}
                        onChange={(e) => setHasLoyalty(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Fidelidade & Crédito</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasMultiUnits}
                        onChange={(e) => setHasMultiUnits(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Multi-unidades & Franquias</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasVipSupport}
                        onChange={(e) => setHasVipSupport(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Destaque VIP Exclusivo</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Ativo para Venda</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/20"
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
