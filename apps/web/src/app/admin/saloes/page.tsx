'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ExternalLink,
  Lock,
  Unlock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  X,
  Loader2,
  Plus,
  Building2,
  User,
  Mail,
  Phone,
  ShieldCheck
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InputMask } from '@/components/ui/InputMask';
import { api } from '@/lib/api';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  niche: string;
  phone: string;
  billingStatus: 'ACTIVE' | 'TRIAL' | 'GRATUITY' | 'BLOCKED' | 'CANCELLED';
  blockedReason?: string | null;
  plan?: {
    id: string;
    code: string;
    name: string;
    monthlyPrice: number;
    maxProfessionals: number;
    isUnlimitedBookings: boolean;
    monthlyFreeBookings: number;
  } | null;
  users?: Array<{ id: string; name: string; email: string }>;
  _count?: {
    professionals: number;
    services: number;
    schedules: number;
    tickets: number;
  };
  isGratuity?: boolean;
  currentMonthBookings?: number;
  monthlyLimit?: number;
  isUnlimitedBookings?: boolean;
  isQuotaExceeded?: boolean;
}

export default function AdminSaloesPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal de Bloqueio
  const [targetBlock, setTargetBlock] = useState<TenantItem | null>(null);
  const [blockReason, setBlockReason] = useState('Suspensão administrativa por análise interna.');

  // Modal de Gestão de Plano & Gratuidade
  const [targetPlanModal, setTargetPlanModal] = useState<TenantItem | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('SOLO');
  const [isGratuity, setIsGratuity] = useState<boolean>(false);
  const [gratuityReason, setGratuityReason] = useState<string>('Parceria / Degustação autorizada pelo Super Admin');
  const [savingPlan, setSavingPlan] = useState(false);

  // Impersonação
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  // Modal de Cadastro Direto de Assinante (Zero Ferramentas Externas)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [savingNewSubscriber, setSavingNewSubscriber] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    slug: '',
    niche: 'OTHER',
    phone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    planId: 'SOLO',
    billingStatus: 'ACTIVE' as 'ACTIVE' | 'TRIAL' | 'GRATUITY'
  });

  const handleNewNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setNewForm((prev) => ({ ...prev, name: val, slug }));
  };

  const handleCreateSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNewSubscriber(true);
    try {
      await api.post('/admin/tenants', newForm);
      showToast(`Assinante "${newForm.name}" cadastrado com sucesso!`);
      setIsNewModalOpen(false);
      setNewForm({
        name: '',
        slug: '',
        niche: 'BARBERSHOP',
        phone: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        planId: 'SOLO',
        billingStatus: 'ACTIVE'
      });
      fetchTenants();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao cadastrar assinante.', 'error');
    } finally {
      setSavingNewSubscriber(false);
    }
  };

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tenants');
      setTenants(res.data);
    } catch (err: any) {
      console.error('Erro ao listar estabelecimentos:', err);
      showToast('Erro ao carregar lista de estabelecimentos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleOpenPlanModal = (tenant: TenantItem) => {
    setTargetPlanModal(tenant);
    setSelectedPlanCode(tenant.plan?.code || 'SOLO');
    setIsGratuity(tenant.billingStatus === 'GRATUITY');
    setGratuityReason(tenant.blockedReason || 'Parceria / Cortesia autorizada');
  };

  const handleSavePlan = async () => {
    if (!targetPlanModal) return;
    setSavingPlan(true);
    try {
      await api.patch(`/admin/tenants/${targetPlanModal.id}/plan`, {
        planId: selectedPlanCode,
        isGratuity,
        reason: isGratuity ? gratuityReason : undefined
      });

      showToast(`Plano de "${targetPlanModal.name}" atualizado com sucesso!`);
      setTargetPlanModal(null);
      fetchTenants();
    } catch (err: any) {
      console.error('Erro ao atualizar plano:', err);
      showToast(err?.response?.data?.message || 'Erro ao atualizar plano.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!targetBlock) return;
    const isCurrentlyBlocked = targetBlock.billingStatus === 'BLOCKED';
    const newStatus = isCurrentlyBlocked ? 'ACTIVE' : 'BLOCKED';

    try {
      await api.patch(`/admin/tenants/${targetBlock.id}/status`, {
        status: newStatus,
        reason: isCurrentlyBlocked ? 'Reativação pelo Super Admin' : blockReason
      });

      showToast(`Estabelecimento ${isCurrentlyBlocked ? 'desbloqueado' : 'bloqueado'} com sucesso!`);
      setTargetBlock(null);
      fetchTenants();
    } catch (err: any) {
      console.error('Erro ao alterar status:', err);
      showToast(err?.response?.data?.message || 'Erro ao alterar status.', 'error');
    }
  };

  const handleImpersonate = async (tenant: TenantItem) => {
    setImpersonatingId(tenant.id);
    try {
      const res = await api.post(`/admin/tenants/${tenant.id}/impersonate`);
      const data = res.data;

      if (data.token) {
        const currentAdminToken = localStorage.getItem('auth_token');
        if (currentAdminToken) {
          localStorage.setItem('admin_token_backup', currentAdminToken);
        }
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('@marcatuahora:token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.owner));
        localStorage.setItem('tenant_data', JSON.stringify(data.tenant));
        localStorage.setItem(
          '@marcatuahora:tenant',
          JSON.stringify({ id: data.tenant.id, name: data.tenant.name, slug: data.tenant.slug })
        );
        localStorage.setItem('is_impersonating', 'true');
        showToast(`Acessando painel de ${tenant.name}...`);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 400);
      }
    } catch (err: any) {
      console.error('Erro na impersonação:', err);
      showToast(err?.response?.data?.message || 'Não foi possível acessar como este salão.', 'error');
      setImpersonatingId(null);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const ownerName = t.users?.[0]?.name || '';
    const ownerEmail = t.users?.[0]?.email || '';

    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm);

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'GRATUITY') return t.billingStatus === 'GRATUITY';
      if (statusFilter === 'ACTIVE') return t.billingStatus === 'ACTIVE';
      if (statusFilter === 'TRIAL') return t.billingStatus === 'TRIAL';
      if (statusFilter === 'BLOCKED') return t.billingStatus === 'BLOCKED';
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 text-xs font-bold rounded-2xl shadow-2xl border flex items-center gap-2 ${
              toastMessage.type === 'error'
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-emerald-600 text-white border-emerald-500'
            }`}
          >
            {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Gestão Global de Estabelecimentos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie planos contratados, cortesias, limites de agenda e acesso assistido de suporte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Assinante</span>
          </button>
          <button
            type="button"
            onClick={fetchTenants}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900 placeholder-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'ACTIVE', label: 'Assinantes Ativos' },
            { id: 'GRATUITY', label: 'Cortesias / VIP' },
            { id: 'TRIAL', label: 'Plano Gratuito' },
            { id: 'BLOCKED', label: 'Bloqueados' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === item.id
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Estabelecimentos */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
            <span className="text-xs">Carregando estabelecimentos e cotas de uso...</span>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            Nenhum estabelecimento localizado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/80">
                  <th className="p-4">Estabelecimento & Vitrine</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Plano & Franquia</th>
                  <th className="p-4">Consumo no Mês</th>
                  <th className="p-4">Status Financeiro</th>
                  <th className="p-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((t) => {
                  const owner = t.users?.[0];
                  const planName = t.plan?.name || 'Gratuito';
                  const isSoloOrPro = t.plan?.code === 'SOLO' || t.plan?.code === 'EQUIPE_PRO';
                  const isGratuity = t.billingStatus === 'GRATUITY';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 font-bold block">{t.name}</strong>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <a
                              href={`/${t.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-purple-700 hover:text-purple-900 hover:underline font-semibold"
                            >
                              /{t.slug}
                            </a>
                            <span className="text-slate-300">·</span>
                            <a
                              href={`/${t.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-purple-700 underline text-[10px]"
                            >
                              Acessar Loja
                            </a>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div>
                          <span className="text-slate-800 font-medium block">
                            {owner?.name || 'Administrador'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{t.phone}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {planName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Até {t.plan?.maxProfessionals ?? 1} profissional(is)
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div>
                          {t.isUnlimitedBookings ? (
                            <span className="text-[11px] text-emerald-600 font-semibold">
                              Agendamentos Ilimitados
                            </span>
                          ) : (
                            <div className="space-y-1 max-w-[130px]">
                              <div className="flex justify-between text-[11px]">
                                <span className={t.isQuotaExceeded ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium'}>
                                  {t.currentMonthBookings ?? 0} / {t.monthlyLimit ?? 30}
                                </span>
                                {t.isQuotaExceeded && (
                                  <span className="text-[9px] font-bold text-rose-600 uppercase">Esgotado</span>
                                )}
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    t.isQuotaExceeded ? 'bg-rose-500' : 'bg-purple-600'
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round(((t.currentMonthBookings ?? 0) / (t.monthlyLimit ?? 30)) * 100)
                                    )}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        {isGratuity ? (
                          <div className="inline-flex flex-col">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300">
                              Cortesia VIP
                            </span>
                            {t.blockedReason && (
                              <span className="text-[9px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={t.blockedReason}>
                                {t.blockedReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              t.billingStatus === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.billingStatus === 'TRIAL'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {t.billingStatus === 'TRIAL' ? 'Plano Gratuito' : t.billingStatus === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Gestão de Plano e Gratuidade */}
                          <button
                            type="button"
                            onClick={() => handleOpenPlanModal(t)}
                            title="Alterar Plano ou Conceder Cortesia"
                            className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>

                          {/* Impersonate 1-clique */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(t)}
                            disabled={impersonatingId === t.id}
                            title="Acessar painel como Dono (Suporte Assistido)"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
                          >
                            {impersonatingId === t.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                            )}
                          </button>

                          {/* Abrir vitrine pública */}
                          <a
                            href={`/${t.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir Vitrine Pública"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Bloqueio / Desbloqueio */}
                          <button
                            type="button"
                            onClick={() => setTargetBlock(t)}
                            title={t.billingStatus === 'BLOCKED' ? 'Desbloquear loja' : 'Bloquear loja'}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            {t.billingStatus === 'BLOCKED' ? (
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Gestão de Plano & Gratuidade */}
      <AnimatePresence>
        {targetPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Gerenciar Plano & Gratuidade
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estabelecimento: <strong>{targetPlanModal.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setTargetPlanModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Escolha do Plano */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Plano Atribuído
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'FREE', name: 'Gratuito', price: 'R$ 0' },
                    { code: 'SOLO', name: 'Solo', price: 'R$ 39/mês' },
                    { code: 'EQUIPE_PRO', name: 'Equipe Pro', price: 'R$ 79/mês' }
                  ].map((p) => {
                    const isSelected = selectedPlanCode === p.code;
                    return (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setSelectedPlanCode(p.code)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-600/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] text-slate-500">{p.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle de Gratuidade / Isenção */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Conceder Gratuidade / Cortesia VIP
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5">
                      O cliente terá todos os recursos do plano selecionado liberados sem cobrança financeira.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isGratuity}
                    onChange={(e) => setIsGratuity(e.target.checked)}
                    className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                  />
                </label>

                {isGratuity && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <label className="text-[11px] font-bold text-amber-900 uppercase block mb-1">
                      Justificativa da Cortesia (Auditoria)
                    </label>
                    <input
                      type="text"
                      value={gratuityReason}
                      onChange={(e) => setGratuityReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl outline-none focus:border-amber-600 text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetPlanModal(null)}
                  disabled={savingPlan}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={savingPlan}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Cadastro Direto de Novo Assinante (Super Admin) */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cadastrar Novo Assinante
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crie o estabelecimento e o acesso do proprietário diretamente na plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubscriber} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Estabelecimento *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.name}
                      onChange={(e) => handleNewNameChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link da Vitrine (Slug) *
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 overflow-hidden focus-within:border-purple-600">
                      <span className="pl-3 text-[11px] font-mono text-slate-400 select-none">
                        /
                      </span>
                      <input
                        type="text"
                        required
                        value={newForm.slug}
                        onChange={(e) =>
                          setNewForm((prev) => ({
                            ...prev,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          }))
                        }
                        className="w-full py-2.5 pr-3 bg-transparent text-xs text-slate-900 outline-none font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nicho de Atuação *
                    </label>
                    <select
                      value={newForm.niche}
                      onChange={(e) => setNewForm((prev) => ({ ...prev, niche: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900 font-medium"
                    >
                      <option value="OTHER">Sem nicho definido (Geral / Multisserviços)</option>
                      <option value="BARBERSHOP">Barbearia</option>
                      <option value="BEAUTY_SALON">Salão de Beleza</option>
                      <option value="NAIL_LASH_STUDIO">Unhas & Cílios</option>
                      <option value="AESTHETICS_CLINIC">Clínica de Estética</option>
                      <option value="PERSONAL_TRAINER">Personal Trainer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp do Estabelecimento *
                    </label>
                    <InputMask
                      mask="phone"
                      value={newForm.phone}
                      onChangeValue={(_formatted, raw) => setNewForm((prev) => ({ ...prev, phone: raw }))}
                      required
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Proprietário *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.ownerName}
                      onChange={(e) => setNewForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail do Administrador *
                    </label>
                    <input
                      type="email"
                      required
                      value={newForm.ownerEmail}
                      onChange={(e) => setNewForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Senha Inicial *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newForm.ownerPassword}
                      onChange={(e) => setNewForm((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Plano Contratado *
                    </label>
                    <select
                      value={newForm.planId}
                      onChange={(e) => setNewForm((prev) => ({ ...prev, planId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900 font-medium"
                    >
                      <option value="FREE">Gratuito (Franquia de 50 agendamentos)</option>
                      <option value="SOLO">Profissional Solo (R$ 29,90/mês)</option>
                      <option value="EQUIPE_PRO">Equipe Pro (R$ 59,90/mês)</option>
                      <option value="VIP_AI">Império VIP & IA (R$ 89,90/mês)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status Inicial da Assinatura *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'ACTIVE', label: 'Ativo (Pago Direto)', desc: 'Acesso liberado' },
                        { id: 'TRIAL', label: 'Demonstração (Trial)', desc: '14 dias de teste' },
                        { id: 'GRATUITY', label: 'Cortesia VIP', desc: 'Isento de cobrança' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNewForm((prev) => ({ ...prev, billingStatus: item.id as any }))}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            newForm.billingStatus === item.id
                              ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                          <span className="text-[10px] text-slate-500">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    disabled={savingNewSubscriber}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingNewSubscriber}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingNewSubscriber ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Cadastrar Assinante</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Bloqueio */}
      <ConfirmModal
        isOpen={Boolean(targetBlock)}
        title={targetBlock?.billingStatus === 'BLOCKED' ? 'Desbloquear Loja?' : 'Bloquear Loja?'}
        description={
          targetBlock?.billingStatus === 'BLOCKED'
            ? `Tem certeza que deseja reativar o acesso de "${targetBlock?.name}"? A vitrine voltará a receber agendamentos imediatamente.`
            : `Tem certeza que deseja suspender o acesso de "${targetBlock?.name}"? A vitrine pública ficará bloqueada.`
        }
        confirmLabel={targetBlock?.billingStatus === 'BLOCKED' ? 'Sim, Desbloquear' : 'Sim, Bloquear'}
        isDestructive={targetBlock?.billingStatus !== 'BLOCKED'}
        onConfirm={handleToggleBlock}
        onClose={() => setTargetBlock(null)}
      />
    </div>
  );
}
