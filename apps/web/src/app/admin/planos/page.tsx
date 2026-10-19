'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Power,
  X,
  Loader2,
  Users
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
  monthlyFreeBookings: number;
  extraBookingFee: number;
  hasAiAssistant: boolean;
  hasAutoWhatsapp: boolean;
  hasCourses: boolean;
  hasSupport: boolean;
  hasAnamnesis: boolean;
  hasCommissions: boolean;
  hasGoogleCalendar: boolean;
  features: string[];
  active: boolean;
  _count?: {
    tenants: number;
  };
}

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<PlanData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.get('/plans/admin');
      if (Array.isArray(res.data)) {
        setPlans(
          res.data.map((p: any) => ({
            ...p,
            monthlyPrice: Number(p.monthlyPrice) || 0,
            monthlyFreeBookings: Number(p.monthlyFreeBookings) || 0,
            extraBookingFee: Number(p.extraBookingFee) || 0,
            maxProfessionals: Number(p.maxProfessionals) || 1,
            features: Array.isArray(p.features) ? p.features : [],
            hasAiAssistant: Boolean(p.hasAiAssistant),
            hasAutoWhatsapp: Boolean(p.hasAutoWhatsapp),
            hasCourses: Boolean(p.hasCourses),
            hasSupport: Boolean(p.hasSupport ?? true),
            hasAnamnesis: Boolean(p.hasAnamnesis),
            hasCommissions: Boolean(p.hasCommissions),
            hasGoogleCalendar: Boolean(p.hasGoogleCalendar),
            active: Boolean(p.active)
          }))
        );
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar planos do banco:', err);
      setErrorMessage('Não foi possível carregar os planos comerciais do banco de dados.');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Form State — Zero hardcoded default values
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [maxProfessionals, setMaxProfessionals] = useState('1');
  const [isUnlimitedBookings, setIsUnlimitedBookings] = useState(true);
  const [monthlyFreeBookings, setMonthlyFreeBookings] = useState('0');
  const [extraBookingFee, setExtraBookingFee] = useState('0.00');
  const [hasAiAssistant, setHasAiAssistant] = useState(false);
  const [hasAutoWhatsapp, setHasAutoWhatsapp] = useState(false);
  const [hasCourses, setHasCourses] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const [hasAnamnesis, setHasAnamnesis] = useState(false);
  const [hasCommissions, setHasCommissions] = useState(false);
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  const [featuresText, setFeaturesText] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setCode('');
    setName('');
    setDescription('');
    setMonthlyPrice('0.00');
    setMaxProfessionals('1');
    setIsUnlimitedBookings(true);
    setMonthlyFreeBookings('0');
    setExtraBookingFee('0.00');
    setHasAiAssistant(false);
    setHasAutoWhatsapp(false);
    setHasCourses(false);
    setHasSupport(true);
    setHasAnamnesis(false);
    setHasCommissions(false);
    setHasGoogleCalendar(false);
    setFeaturesText('');
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
    setMonthlyFreeBookings(String(plan.monthlyFreeBookings || 0));
    setExtraBookingFee(String(plan.extraBookingFee || 0));
    setHasAiAssistant(plan.hasAiAssistant);
    setHasAutoWhatsapp(Boolean(plan.hasAutoWhatsapp));
    setHasCourses(Boolean(plan.hasCourses));
    setHasSupport(Boolean(plan.hasSupport ?? true));
    setHasAnamnesis(plan.hasAnamnesis);
    setHasCommissions(plan.hasCommissions);
    setHasGoogleCalendar(plan.hasGoogleCalendar);
    setFeaturesText(plan.features?.join('\n') || '');
    setActive(plan.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const parsedFeatures = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const planPayload = {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description.trim() || name.trim(),
      monthlyPrice: Number(monthlyPrice) || 0,
      maxProfessionals: parseInt(maxProfessionals, 10) || 1,
      isUnlimitedBookings,
      monthlyFreeBookings: isUnlimitedBookings ? 0 : (parseInt(monthlyFreeBookings, 10) || 0),
      extraBookingFee: isUnlimitedBookings ? 0 : (Number(extraBookingFee) || 0),
      hasAiAssistant,
      hasAutoWhatsapp,
      hasCourses,
      hasSupport,
      hasAnamnesis,
      hasCommissions,
      hasGoogleCalendar,
      features: parsedFeatures.length > 0 ? parsedFeatures : ['Acesso às ferramentas do sistema'],
      active
    };

    try {
      if (editingPlan) {
        await api.put(`/plans/admin/${editingPlan.id}`, planPayload);
      } else {
        await api.post('/plans/admin', planPayload);
      }
      await loadPlans();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar plano no banco:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Erro ao persistir plano comercial no banco de dados.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: PlanData) => {
    try {
      setActionLoading(true);
      await api.patch(`/plans/admin/${plan.id}/toggle-active`);
      await loadPlans();
    } catch (err: any) {
      console.error('Erro ao alternar status do plano:', err);
      alert(err.response?.data?.message || 'Erro ao alternar ativação do plano.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    try {
      setActionLoading(true);
      await api.delete(`/plans/admin/${planToDelete.id}`);
      setDeleteModalOpen(false);
      setPlanToDelete(null);
      await loadPlans();
    } catch (err: any) {
      console.error('Erro ao excluir plano:', err);
      alert(err.response?.data?.message || 'Não foi possível excluir o plano.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Planos Comerciais
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento direto no banco de dados. Crie, precifique e configure os planos disponíveis para contratação.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Plano</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Grid de Planos */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
          <p className="text-xs font-semibold text-slate-600">Carregando planos comerciais do banco de dados...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <CreditCard className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">Nenhum plano cadastrado no banco de dados</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Crie os planos comerciais que ficarão disponíveis para contratação e vinculação aos estabelecimentos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md shadow-purple-600/20"
          >
            Criar Primeiro Plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => {
            const subscribers = p._count?.tenants || 0;
            return (
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
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {p.active ? 'Ativo para Venda' : 'Inativo'}
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
                      <span className="text-slate-500">Limite de Profissionais:</span>
                      <span className="font-mono font-bold text-slate-900">{p.maxProfessionals}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Agendamentos:</span>
                      <span className="font-semibold text-slate-900">
                        {p.isUnlimitedBookings
                          ? 'Ilimitados'
                          : `${p.monthlyFreeBookings}/mês (Extra R$ ${p.extraBookingFee.toFixed(2).replace('.', ',')})`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Estabelecimentos:
                      </span>
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                        {subscribers}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
                    {p.hasAiAssistant && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 font-medium">
                        Copiloto IA
                      </span>
                    )}
                    {p.hasAutoWhatsapp && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                        WhatsApp Automático
                      </span>
                    )}
                    {p.hasCourses && (
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-medium">
                        Cursos Online
                      </span>
                    )}
                    {p.hasSupport && (
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60 font-medium">
                        Suporte Oficial com IA
                      </span>
                    )}
                    {p.hasAnamnesis && (
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/60 font-medium">
                        Anamnese Digital
                      </span>
                    )}
                    {p.hasCommissions && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                        Comissões
                      </span>
                    )}
                    {p.hasGoogleCalendar && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                        Google Calendar
                      </span>
                    )}
                  </div>

                  {p.features && p.features.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Benefícios Vitrine:
                      </span>
                      <ul className="text-[11px] text-slate-600 space-y-0.5">
                        {p.features.slice(0, 3).map((feat, idx) => (
                          <li key={idx} className="truncate">• {feat}</li>
                        ))}
                        {p.features.length > 3 && (
                          <li className="text-[10px] text-slate-400 font-medium">
                            +{p.features.length - 3} outros itens
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleToggleActive(p)}
                    title={p.active ? 'Inativar plano para novas assinaturas' : 'Ativar plano'}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      p.active
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{p.active ? 'Pausar' : 'Ativar'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      disabled={subscribers > 0}
                      onClick={() => {
                        setPlanToDelete(p);
                        setDeleteModalOpen(true);
                      }}
                      title={subscribers > 0 ? 'Não é possível excluir: existem salões vinculados' : 'Excluir plano'}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center transition-colors ${
                        subscribers > 0
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-slate-900">
                {editingPlan ? 'Editar Plano Comercial' : 'Criar Novo Plano Comercial'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure os parâmetros que serão persistidos diretamente no banco de dados.
              </p>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Código Identificador (Caixa Alta) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="EX: SOLO_PRO"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
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
                      placeholder="Ex: Profissional Solo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Descrição Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Para profissionais autônomas que vivem de hora marcada"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                      placeholder="0.00"
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
                      placeholder="1"
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
                      Agendamentos Ilimitados (Sem Trava de Franquia Mensal)
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
                          min={0}
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
                          min={0}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasAiAssistant}
                        onChange={(e) => setHasAiAssistant(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Copiloto IA (Voz & Texto na Agenda)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasAutoWhatsapp}
                        onChange={(e) => setHasAutoWhatsapp(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Automações WhatsApp (Lembretes)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasCourses}
                        onChange={(e) => setHasCourses(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Cursos Online para Alunas</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasSupport}
                        onChange={(e) => setHasSupport(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Central de Suporte Oficial IA</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasAnamnesis}
                        onChange={(e) => setHasAnamnesis(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Ficha de Anamnese & Fotos</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasCommissions}
                        onChange={(e) => setHasCommissions(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Cálculo de Comissões da Equipe</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasGoogleCalendar}
                        onChange={(e) => setHasGoogleCalendar(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Google Calendar Sync</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-semibold text-slate-900">Ativo para Novas Contratações</span>
                    </label>
                  </div>
                </div>

                {/* Benefícios e Diferenciais (features) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Benefícios na Vitrine (1 por linha) *
                  </label>
                  <textarea
                    rows={4}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder={'Agendamentos ilimitados\nLembretes no WhatsApp\nLink na bio personalizável'}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-purple-600 leading-relaxed font-sans"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cada linha será exibida como um item da lista de vantagens na página de contratação.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingPlan ? 'Atualizar no Banco' : 'Cadastrar no Banco'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPlanToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir Plano Comercial"
        description={`Tem certeza que deseja excluir permanentemente o plano "${planToDelete?.name}" (${planToDelete?.code}) do banco de dados? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Permanentemente"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </div>
  );
}
