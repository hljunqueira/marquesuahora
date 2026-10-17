'use client';

import React, { useState } from 'react';
import {
  Check,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { TenantSettings } from './types';
import { api } from '@/lib/api';
import { PlanCheckoutModal } from '../checkout/PlanCheckoutModal';

interface SettingsPlanTabProps {
  settings: TenantSettings;
  onRefresh: () => void;
}

export const SettingsPlanTab: React.FC<SettingsPlanTabProps> = ({ settings, onRefresh }) => {
  const [upgradingCode, setUpgradingCode] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);

  const plan = settings.plan;
  const usage = settings.usage;

  const currentBookings = usage?.currentMonthBookings ?? 0;
  const monthlyLimit = usage?.monthlyFreeBookings ?? 30;
  const isUnlimited = usage?.isUnlimitedBookings ?? (plan?.code !== 'FREE');
  const percentUsed = isUnlimited ? 0 : Math.min(100, Math.round((currentBookings / monthlyLimit) * 100));

  const currentProfessionals = usage?.currentProfessionals ?? 1;
  const maxProfessionals = usage?.maxProfessionals ?? 1;

  const availablePlans = [
    {
      code: 'FREE',
      name: 'Gratuito',
      price: 'R$ 0',
      period: 'para sempre',
      description: 'Ideal para quem está começando o próprio negócio.',
      maxProf: 1,
      isUnlimited: false,
      monthlyLimit: 30,
      features: [
        'Até 30 agendamentos por mês',
        '1 profissional cadastrado',
        'Link na bio personalizável',
        'Catálogo de serviços e preços'
      ]
    },
    {
      code: 'SOLO',
      name: 'Profissional Solo',
      price: 'R$ 39',
      period: '/mês',
      badge: '1ª Fatura no Próximo Mês',
      description: 'Para profissionais autônomas que vivem de hora marcada. 30 dias de carência para pagar.',
      maxProf: 1,
      isUnlimited: true,
      monthlyLimit: 0,
      features: [
        'Agendamentos ilimitados (sem travas)',
        'Primeira fatura só no próximo mês (30 dias para começar)',
        '1 profissional cadastrado',
        'Lembretes automáticos no WhatsApp',
        'Módulo de Cursos Online para alunas',
        'Proteção No-Show Shield (anti-faltas)',
        'Galeria de fotos de trabalhos'
      ]
    },
    {
      code: 'EQUIPE_PRO',
      name: 'Equipe Pro',
      price: 'R$ 79',
      period: '/mês',
      description: 'Para salões, barbearias e estúdios com múltiplos atendentes.',
      maxProf: 5,
      isUnlimited: true,
      monthlyLimit: 0,
      features: [
        'Agendamentos ilimitados',
        'Até 5 profissionais na equipe',
        'Grades individuais de horários',
        'Lembretes no WhatsApp para todos',
        'Cursos e vídeos para alunas',
        'Relatórios de atendimentos por profissional'
      ]
    }
  ];

  const handleSelectPlan = async (targetCode: string) => {
    if (plan?.code === targetCode) return;
    const targetPlan = availablePlans.find((p) => p.code === targetCode);
    if (!targetPlan) return;

    // Se for plano pago (Solo ou Equipe Pro), abre o checkout elegante com a taxa de 1.99%
    if (targetCode !== 'FREE') {
      setCheckoutPlan(targetPlan);
      return;
    }

    // Se for downgrade para o plano gratuito, executa diretamente
    setUpgradingCode(targetCode);
    setStatusMsg(null);
    try {
      const res = await api.post('/tenants/me/plan', {
        planCode: targetCode
      }).catch(async () => {
        return api.put('/tenants/me/settings', { planCode: targetCode });
      });
      setStatusMsg({
        text: res.data?.message || `Plano atualizado com sucesso para ${targetCode}! As novas regras já estão ativas.`,
        type: 'success'
      });
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao trocar plano:', err);
      setStatusMsg({
        text: err?.response?.data?.message || 'Não foi possível alterar o plano no momento.',
        type: 'error'
      });
    } finally {
      setUpgradingCode(null);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline ml-4 cursor-pointer font-semibold">
            Fechar
          </button>
        </div>
      )}

      {/* Cartão de Resumo do Plano Atual */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-purple-700">
                Seu Plano Contratado
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                {settings.billingStatus === 'TRIAL' ? 'Período de Teste (7 dias)' : 'Assinatura Ativa'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {plan?.name || 'Plano Gratuito'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {plan?.description || 'Plano inicial para testar e organizar a agenda sem custos fixos.'}
            </p>
          </div>

          <div className="text-left sm:text-right sm:self-center">
            <span className="text-3xl font-extrabold text-slate-900">
              {plan?.monthlyPrice ? `R$ ${Number(plan.monthlyPrice).toFixed(0)}` : 'R$ 0'}
            </span>
            <span className="text-xs text-slate-500 block">/mês</span>
          </div>
        </div>

        {/* Métricas de Uso e Limites Reais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cota de Agendamentos Mensais */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-slate-800 text-sm font-semibold">
                Agendamentos no mês
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {isUnlimited ? 'Ilimitados' : `${currentBookings} de ${monthlyLimit}`}
              </span>
            </div>

            {isUnlimited ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium pt-1">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Sem limite de agendamentos no seu plano</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentUsed >= 90
                        ? 'bg-rose-500'
                        : percentUsed >= 70
                        ? 'bg-amber-500'
                        : 'bg-tenant-primary'
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{percentUsed}% utilizado</span>
                  <span>{Math.max(0, monthlyLimit - currentBookings)} restantes</span>
                </div>
              </div>
            )}

            {!isUnlimited && percentUsed >= 80 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Você está próximo do limite mensal de 30 agendamentos. Faça upgrade para o plano Solo para não travar novos clientes.</span>
              </div>
            )}
          </div>

          {/* Limite de Profissionais na Equipe */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-slate-800 text-sm font-semibold">
                Profissionais cadastrados
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {currentProfessionals} de {maxProfessionals}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tenant-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (currentProfessionals / maxProfessionals) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{currentProfessionals >= maxProfessionals ? 'Limite da equipe atingido' : 'Vagas disponíveis'}</span>
                <span>Máx: {maxProfessionals}</span>
              </div>
            </div>

            {currentProfessionals >= maxProfessionals && maxProfessionals === 1 && (
              <div className="text-[11px] text-slate-500">
                Para adicionar mais colaboradores, assine o plano <strong>Equipe Pro</strong>.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Planos Disponíveis para Upgrade */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Comparativo de Planos & Upgrades
          </h3>
          <p className="text-xs text-slate-500">
            Mude de plano a qualquer momento. Ao assinar o plano Solo, sua primeira mensalidade é faturada no próximo mês (30 dias de carência para pagar), permitindo que você atenda e fature primeiro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availablePlans.map((p) => {
            const isCurrent = plan?.code === p.code || (!plan && p.code === 'FREE');

            return (
              <div
                key={p.code}
                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-purple-50/50 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                    : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-base">{p.name}</h4>
                    {p.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        {p.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 min-h-[32px]">{p.description}</p>

                  <div className="pt-2 pb-2">
                    <span className="text-2xl font-black text-slate-900">{p.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{p.period}</span>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-slate-100">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-xs font-semibold rounded-xl bg-purple-100 text-purple-800 border border-purple-200">
                      Plano Atual
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={upgradingCode !== null}
                      onClick={() => handleSelectPlan(p.code)}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold btn-primary-tenant transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {upgradingCode === p.code ? (
                        <span>Processando...</span>
                      ) : (
                        <>
                          <span>Mudar para {p.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Checkout Elegante com Taxa de 1.99% e 100% White-Label (Sem menção ao Asaas) */}
      {checkoutPlan && (
        <PlanCheckoutModal
          isOpen={!!checkoutPlan}
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={() => {
            onRefresh();
            setStatusMsg({
              text: `Plano atualizado com sucesso para ${checkoutPlan.name}! Suas vantagens já estão liberadas.`,
              type: 'success'
            });
          }}
        />
      )}
    </div>
  );
};
