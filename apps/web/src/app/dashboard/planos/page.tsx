'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  CheckCircle2,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { PlanCheckoutModal } from '@/components/checkout/PlanCheckoutModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface PlanItem {
  code: string;
  name: string;
  price: number;
  pros: string;
  bookings: string;
  features: string[];
  ai: boolean;
  badge?: string;
  current?: boolean;
}

export default function DashboardPlanosPage() {
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activePlanCode, setActivePlanCode] = useState<string>('FREE');
  const [tenantData, setTenantData] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<PlanItem[]>([]);
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [confirmDowngradePlan, setConfirmDowngradePlan] = useState<{ code: string; name: string } | null>(null);

  // Carrega plano e métricas reais do tenant direto da API
  const loadTenantPlan = useCallback(async () => {
    try {
      const [tenantRes, plansRes] = await Promise.all([
        api.get('/tenants/me').catch(() => null),
        api.get('/plans').catch(() => null)
      ]);

      if (tenantRes?.data) {
        const t = tenantRes.data;
        setTenantData(t);
        const code = t.plan?.code || t.planCode || 'FREE';
        setActivePlanCode(code);
        localStorage.setItem('marquesuahora_tenant_plan_code', code);
      }

      if (plansRes?.data && Array.isArray(plansRes.data)) {
        const currentCode = tenantRes?.data?.plan?.code || activePlanCode;
        const mapped = plansRes.data.map((p: any) => {
          const isCurrent = p.code === currentCode;
          const features = Array.isArray(p.features) && p.features.length > 0
            ? p.features
            : [
                `Até ${p.maxProfessionals} profissional${p.maxProfessionals > 1 ? 'is' : ''}`,
                p.isUnlimitedBookings ? 'Agendamentos Ilimitados' : `Até ${p.monthlyFreeBookings || 30} agendamentos/mês`,
                p.hasAutoWhatsapp ? 'Automações de WhatsApp (Lembretes & Confirmações)' : 'WhatsApp manual',
                p.hasAiAssistant ? 'Copiloto IA na agenda' : 'Painel de agendamentos'
              ];

          return {
            code: p.code,
            name: p.name,
            price: Number(p.monthlyPrice) || 0,
            pros: `Até ${p.maxProfessionals} profissional${(p.maxProfessionals || 1) > 1 ? 'is' : ''}`,
            bookings: p.isUnlimitedBookings
              ? 'Agendamentos Ilimitados'
              : `Até ${p.monthlyFreeBookings || 30} agendamentos/mês`,
            features,
            ai: Boolean(p.hasAiAssistant),
            badge: isCurrent ? 'Seu Plano Atual' : (p.code === 'SOLO' ? 'Mais Popular' : (p.code === 'EQUIPE_PRO' ? 'Para Salões & Equipes' : undefined)),
            current: isCurrent
          };
        });
        setAvailablePlans(mapped);
      } else {
        setAvailablePlans([]);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do plano:', err);
      setAvailablePlans([]);
    } finally {
      setLoading(false);
    }
  }, [activePlanCode]);

  useEffect(() => {
    loadTenantPlan();
  }, [loadTenantPlan]);

  // Dados computados do plano ativo do tenant
  const currentPlan = React.useMemo(() => {
    const plan = tenantData?.plan;
    const usage = tenantData?.usage;

    const currentBookings = usage?.currentMonthBookings ?? 0;
    const monthlyFree = usage?.monthlyFreeBookings ?? (plan?.monthlyFreeBookings || 50);

    const isVip = Boolean(
      plan?.code === 'VIP_PRO' ||
      plan?.code === 'VIP_AI' ||
      activePlanCode === 'VIP_PRO' ||
      activePlanCode === 'VIP_AI' ||
      (plan?.name && plan.name.toUpperCase().includes('VIP')) ||
      (Boolean(plan?.isUnlimitedBookings) && Number(plan?.monthlyPrice || 0) === 0 && (plan?.maxProfessionals || 1) > 5)
    );

    const isUnlimited = isVip || (usage?.isUnlimitedBookings ?? (plan?.isUnlimitedBookings || activePlanCode !== 'FREE'));
    const maxPros = usage?.maxProfessionals ?? (plan?.maxProfessionals || (activePlanCode === 'FREE' ? 1 : 3));

    const price = isVip ? 0 : (plan ? Number(plan.monthlyPrice) : (
      activePlanCode === 'FREE' ? 0 :
      activePlanCode === 'SOLO' ? 49.99 :
      activePlanCode === 'EQUIPE_PRO' ? 99.99 : 99.99
    ));

    const displayName = plan?.name || (
      isVip ? 'Plano VIP' :
      activePlanCode === 'FREE' ? 'Plano Gratuito' :
      activePlanCode === 'SOLO' ? 'Profissional Solo' :
      activePlanCode === 'EQUIPE_PRO' ? 'Equipe Pro' : 'Plano VIP'
    );

    const billingDesc = isVip
      ? 'Plano VIP'
      : activePlanCode === 'FREE'
      ? 'Sem mensalidade fixa • Franquia mensal de agendamentos'
      : 'Assinatura Ativa na Plataforma';

    const statusBadge = isVip ? 'Plano VIP' : (activePlanCode === 'FREE' ? 'Plano Gratuito' : 'Assinatura Ativa');

    return {
      code: activePlanCode,
      displayName,
      monthlyPrice: price,
      maxProfessionals: maxPros,
      isUnlimitedBookings: isUnlimited,
      monthlyFreeBookings: monthlyFree,
      bookingsUsedThisMonth: currentBookings,
      hasAiAssistant: Boolean(isVip || plan?.hasAiAssistant || activePlanCode === 'VIP_AI'),
      hasCommissions: Boolean(isVip || plan?.hasCommissions || activePlanCode === 'EQUIPE_PRO' || activePlanCode === 'VIP_AI'),
      hasProducts: Boolean(activePlanCode !== 'FREE' || isVip),
      statusBadge,
      billingDesc,
      isVip
    };
  }, [tenantData, activePlanCode]);

  const handlePlanChange = async (planCode: string, planName: string) => {
    if (currentPlan.isVip) {
      setSuccessMessage('Seu estabelecimento possui Plano VIP Vitalício completo com acesso total a todas as funcionalidades.');
      setTimeout(() => setSuccessMessage(null), 5000);
      return;
    }

    if (activePlanCode === planCode) return;
    const targetPlan = availablePlans.find((p) => p.code === planCode);
    if (!targetPlan) return;

    if (targetPlan.price > 0) {
      setCheckoutPlan({
        code: targetPlan.code,
        name: targetPlan.name,
        price: targetPlan.price,
        monthlyPrice: targetPlan.price,
        features: targetPlan.features
      });
      return;
    }

    // Downgrade para o Plano Gratuito via Modal Clean
    setConfirmDowngradePlan({ code: planCode, name: planName });
  };

  const executeDowngrade = async () => {
    if (!confirmDowngradePlan) return;
    try {
      await api.post('/tenants/me/plan', { planCode: confirmDowngradePlan.code });
      setActivePlanCode(confirmDowngradePlan.code);
      localStorage.setItem('marquesuahora_tenant_plan_code', confirmDowngradePlan.code);
      setSuccessMessage(`Plano alterado para ${confirmDowngradePlan.name} com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setConfirmDowngradePlan(null);
      loadTenantPlan();
    } catch (err: any) {
      setSuccessMessage(err?.response?.data?.message || `Não foi possível alterar o plano.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setConfirmDowngradePlan(null);
    }
  };

  const usagePercent = !currentPlan.isUnlimitedBookings && currentPlan.monthlyFreeBookings > 0
    ? Math.round((currentPlan.bookingsUsedThisMonth / currentPlan.monthlyFreeBookings) * 100)
    : 0;

  const extraBookings = !currentPlan.isUnlimitedBookings
    ? Math.max(0, currentPlan.bookingsUsedThisMonth - currentPlan.monthlyFreeBookings)
    : 0;
  const extraFee = extraBookings * 1.5;

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200/80">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="text-xs font-semibold">Carregando detalhes do seu plano...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="cursor-pointer">
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </motion.div>
      )}

      {/* Card do Plano Ativo */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white text-slate-900 shadow-2xs border border-slate-200/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                currentPlan.isVip
                  ? 'text-amber-800 bg-amber-50 border-amber-200/80'
                  : currentPlan.code === 'FREE'
                  ? 'text-purple-700 bg-purple-50 border-purple-200/80'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200/80'
                }`}>
                {currentPlan.statusBadge}
              </span>
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900 mt-2">
              {currentPlan.displayName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentPlan.billingDesc}
            </p>
          </div>

          <div className="text-left sm:text-right bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-100">
            <span className="text-3xl font-mono font-bold text-slate-900">
              R$ {currentPlan.monthlyPrice.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-xs text-slate-500 block">
              {currentPlan.isVip ? 'Sem mensalidade' : '/mês'}
            </span>
          </div>
        </div>

        {/* Recursos Inclusos no Plano Atual */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5 text-xs text-slate-700">
          <div className="flex items-center gap-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              Limite de <strong>{currentPlan.maxProfessionals} profissional{currentPlan.maxProfessionals > 1 ? 'is' : ''}</strong>
            </span>
          </div>

          {!currentPlan.isUnlimitedBookings ? (
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Franquia Mensal:</span>
                <span className="font-mono font-bold text-purple-700">
                  {currentPlan.bookingsUsedThisMonth} / {currentPlan.monthlyFreeBookings} ({usagePercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block">
                {extraFee > 0
                  ? `R$ ${extraFee.toFixed(2).replace('.', ',')} de taxa extra acumulada (+ R$ 1,50/agendamento)`
                  : 'R$ 0,00 de taxa extra este mês (dentro da cota gratuita)'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 block">Agendamentos Ilimitados</span>
                <span className="text-[11px] text-slate-500 block">
                  {currentPlan.bookingsUsedThisMonth} agendamento{currentPlan.bookingsUsedThisMonth === 1 ? '' : 's'} este mês
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              {currentPlan.isVip
                ? 'Todos os recursos liberados (IA, WhatsApp e Cursos)'
                : currentPlan.code === 'FREE'
                ? 'Vitrine básica sem produtos & WhatsApp manual'
                : (currentPlan.hasCommissions ? 'Comissões & Rateio Automático' : 'Vitrine Online Completa')}
            </span>
          </div>
        </div>
      </div>

      {/* Comparativo dos Planos */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-display font-bold text-slate-800">
            Planos Disponíveis para Mudança
          </h3>
          <span className="text-xs text-purple-700 font-medium bg-purple-50 px-3 py-1 rounded-full border border-purple-100 w-fit">
            WhatsApp no Solo e Equipe Pro • Copiloto IA e Cursos no Equipe Pro
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availablePlans.map((plan) => {
            const isCurrent = plan.code === currentPlan.code;

            return (
              <div
                key={plan.code}
                className={`p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between ${isCurrent
                    ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-600/10 shadow-2xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 min-h-[24px]">
                    {isCurrent ? (
                      <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full inline-block">
                        Seu Plano Atual
                      </span>
                    ) : plan.badge ? (
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full inline-block ${plan.ai
                          ? 'text-purple-700 bg-purple-100 border border-purple-200'
                          : 'text-slate-600 bg-slate-100'
                        }`}>
                        {plan.badge}
                      </span>
                    ) : (
                      <div />
                    )}
                  </div>

                  <h4 className="text-base font-bold text-slate-800">{plan.name}</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-mono font-extrabold text-slate-900">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-slate-500">/mês</span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    {plan.features.map((feat) => {
                      const isInherited = feat.startsWith('Tudo d');
                      const isVipSpecial = feat.includes('IA') || feat.includes('Lembretes automáticos');
                      return (
                        <li key={feat} className="flex items-center gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${
                            isInherited ? 'text-purple-600' : isVipSpecial ? 'text-purple-700 font-bold' : 'text-emerald-600'
                          }`} />
                          <span className={
                            isInherited
                              ? 'font-bold text-purple-900 bg-purple-50/90 px-1.5 py-0.5 rounded-md border border-purple-200/60'
                              : isVipSpecial ? 'font-semibold text-slate-900' : ''
                          }>
                            {feat}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  {currentPlan.isVip ? (
                    <span className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-purple-700 py-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                      Incluso no seu VIP Vitalício
                    </span>
                  ) : isCurrent ? (
                    <span className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-emerald-700 py-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Plano Ativo</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePlanChange(plan.code, plan.name)}
                      className="w-full py-2.5 px-4 btn-primary-tenant rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      {plan.price > 0 ? `Fazer Upgrade (R$ ${plan.price.toFixed(2).replace('.', ',')})` : 'Mudar para Gratuito'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Checkout Oficial com Pagamento Real */}
      {checkoutPlan && (
        <PlanCheckoutModal
          isOpen={!!checkoutPlan}
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={() => {
            loadTenantPlan();
            setSuccessMessage(`Plano atualizado com sucesso para ${checkoutPlan.name}!`);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Modal de Confirmação de Downgrade (Zero window.confirm) */}
      <ConfirmModal
        isOpen={Boolean(confirmDowngradePlan)}
        title="Mudar para o Plano Gratuito?"
        description="As automações de WhatsApp e recursos avançados serão ajustados para os limites da franquia gratuita."
        confirmLabel="Sim, Mudar para Gratuito"
        cancelLabel="Continuar no Plano Atual"
        isDestructive={false}
        onConfirm={executeDowngrade}
        onClose={() => setConfirmDowngradePlan(null)}
      />
    </div>
  );
}
