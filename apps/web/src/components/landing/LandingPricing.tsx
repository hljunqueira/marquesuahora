'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingPricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const plans = [
    {
      name: 'Plano Gratuito',
      description: 'Ideal para testar e para quem está começando o próprio negócio.',
      priceMonthly: 'R$ 0,00',
      priceAnnual: 'R$ 0,00',
      period: '/mês',
      ctaText: 'Começar grátis',
      ctaHref: '/cadastro?plan=free',
      highlighted: false,
      features: [
        'Até 30 agendamentos por mês',
        '1 profissional cadastrado',
        'Link na bio personalizável',
        'Catálogo de serviços e preços',
        'Central de Suporte Oficial com IA'
      ]
    },
    {
      name: 'Profissional Solo',
      badge: 'MAIS POPULAR',
      description: 'Para profissionais autônomas que vivem de hora marcada e não podem perder tempo.',
      priceMonthly: 'R$ 49,99',
      priceAnnual: 'R$ 39,99',
      period: '/mês',
      ctaText: 'Começar agora',
      ctaHref: '/cadastro?plan=solo',
      highlighted: true,
      features: [
        'Agendamentos ilimitados',
        '1 profissional cadastrado',
        'Automações de WhatsApp (Lembretes & Confirmações)',
        'Proteção Anti-Falta (Sinal PIX Direto)',
        'Central de Suporte Oficial com IA',
        'Galeria de fotos de procedimentos',
        'Sem fidelidade (cancele quando quiser)'
      ]
    },
    {
      name: 'Equipe Pro',
      badge: 'PARA SALÕES & EQUIPES',
      description: 'Para salões, barbearias e estúdios com múltiplos atendentes e cadeiras.',
      priceMonthly: 'R$ 99,99',
      priceAnnual: 'R$ 79,99',
      period: '/mês',
      ctaText: 'Começar agora',
      ctaHref: '/cadastro?plan=equipe',
      highlighted: false,
      features: [
        'Agendamentos ilimitados',
        'Até 5 profissionais na equipe',
        'Copiloto IA (Comandos de Voz & Texto)',
        'Lembretes automáticos no WhatsApp',
        'Módulo de Cursos Online para alunas',
        'Central de Suporte Oficial com IA',
        'Cálculo de Comissões e Relatórios'
      ]
    }
  ];

  return (
    <section id="planos" className="py-24 md:py-36 bg-white border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Planos e Valores
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight leading-tight">
            Transparência total, sem surpresas
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 font-normal">
            Comece no plano gratuito e faça o upgrade apenas quando sua agenda crescer.
          </p>

          {/* Billing Cycle Toggle com fontes ampliadas */}
          <div className="pt-4 flex items-center justify-center gap-4">
            <span
              className={`text-sm sm:text-base font-bold cursor-pointer transition-colors ${
                billingCycle === 'MONTHLY' ? 'text-zinc-950' : 'text-zinc-400'
              }`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Cobrança Mensal
            </span>

            <div
              onClick={() => setBillingCycle(billingCycle === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY')}
              className="w-14 h-7 bg-zinc-200 rounded-full p-1 cursor-pointer transition-colors relative"
            >
              <motion.div
                layout
                transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
                className={`w-5 h-5 bg-purple-600 rounded-full transition-transform ${
                  billingCycle === 'ANNUAL' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-sm sm:text-base font-bold cursor-pointer transition-colors ${
                  billingCycle === 'ANNUAL' ? 'text-zinc-950' : 'text-zinc-400'
                }`}
                onClick={() => setBillingCycle('ANNUAL')}
              >
                Cobrança Anual
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                Economize 20%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards com fontes ampliadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => (
            <motion.div
              key={p.name}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
              className={`rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all relative ${
                p.highlighted
                  ? 'bg-white border-2 border-purple-600 shadow-2xl shadow-purple-900/10'
                  : 'bg-zinc-50/70 border border-zinc-200/90 shadow-sm'
              }`}
            >
              {p.badge && (
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase shadow-2xs border ${
                    p.name === 'Equipe Pro'
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {p.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">{p.name}</h3>
                  <p className="text-sm sm:text-base text-zinc-600 mt-2 min-h-[44px]">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1.5 pb-6 border-b border-zinc-200">
                  <span className="text-5xl sm:text-6xl font-extrabold text-zinc-950">
                    {billingCycle === 'MONTHLY' ? p.priceMonthly : p.priceAnnual}
                  </span>
                  <span className="text-sm sm:text-base font-medium text-zinc-500">{p.period}</span>
                </div>

                <div className="space-y-3.5">
                  <div className="text-xs sm:text-sm font-bold text-zinc-900 uppercase tracking-wider">
                    O que está incluso:
                  </div>
                  <ul className="space-y-3">
                    {p.features.map((f) => {
                      const isHighlighted =
                        f.includes('Central de Suporte') ||
                        f.includes('Copiloto IA') ||
                        (p.name === 'Equipe Pro' && f.includes('Lembretes'));
                      return (
                        <li
                          key={f}
                          className={`flex items-start gap-3 text-sm sm:text-base ${
                            isHighlighted ? 'text-purple-950 font-bold' : 'text-zinc-700 font-medium'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-5 h-5 shrink-0 mt-0.5 ${
                              isHighlighted ? 'text-purple-600' : 'text-emerald-600'
                            }`}
                          />
                          <span>{f}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
                >
                  <Link
                    href={p.ctaHref}
                    className={`w-full py-4 rounded-2xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all shadow-xs ${
                      p.highlighted
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25'
                        : 'bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900'
                    }`}
                  >
                    <span>{p.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
