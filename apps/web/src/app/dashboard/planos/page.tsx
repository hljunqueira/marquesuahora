'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Bot
} from 'lucide-react';

export default function DashboardPlanosPage() {
  const currentPlan = {
    name: 'EQUIPE_PRO',
    displayName: 'Equipe Pro',
    monthlyPrice: 129.9,
    maxProfessionals: 5,
    isUnlimitedBookings: true,
    bookingsUsedThisMonth: 142,
    hasAiAssistant: true,
    hasAnamnesis: true,
    hasCommissions: true,
    nextBillingDate: '15/10/2026'
  };

  const availablePlans = [
    {
      code: 'SOLO',
      name: 'Profissional Solo',
      price: 59.9,
      pros: '1 profissional',
      bookings: 'Até 100 agendamentos/mês',
      ai: false
    },
    {
      code: 'EQUIPE_PRO',
      name: 'Equipe Pro',
      price: 129.9,
      pros: 'Até 5 profissionais',
      bookings: 'Agendamentos Ilimitados',
      ai: true,
      current: true
    },
    {
      code: 'VIP_AI',
      name: 'Império VIP & IA',
      price: 249.9,
      pros: 'Ilimitado',
      bookings: 'Agendamentos Ilimitados',
      ai: true
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Card do Plano Atual */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-gold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Plano Ativo
            </span>
            <h2 className="text-2xl font-display font-bold text-white mt-2">
              {currentPlan.displayName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Próxima renovação em {currentPlan.nextBillingDate} via Asaas
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-3xl font-mono font-bold text-white">
              R$ {currentPlan.monthlyPrice.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-xs text-slate-400 block">/mês</span>
          </div>
        </div>

        {/* Recursos Inclusos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Até {currentPlan.maxProfessionals} colaboradores</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Agendamentos Ilimitados</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Atendente Virtual IA no WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Comparativo de Planos */}
      <div className="space-y-4">
        <h3 className="text-base font-display font-bold text-slate-800">
          Planos Disponíveis para Mudança
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availablePlans.map((plan) => (
            <div
              key={plan.code}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                plan.current
                  ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-600/10'
                  : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              <div>
                {plan.current && (
                  <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full inline-block mb-3">
                    Seu Plano Atual
                  </span>
                )}
                <h4 className="text-base font-bold text-slate-800">{plan.name}</h4>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold text-slate-800">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-slate-500">/mês</span>
                </div>

                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{plan.pros}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{plan.bookings}</span>
                  </li>
                  {plan.ai && (
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Atendente IA 24/7</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                {plan.current ? (
                  <span className="block text-center text-xs font-semibold text-purple-700 py-2">
                    Plano Ativo
                  </span>
                ) : (
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    Mudar para este Plano
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
