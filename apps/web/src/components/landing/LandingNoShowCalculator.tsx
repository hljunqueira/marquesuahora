'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingNoShowCalculator: React.FC = () => {
  const [appointmentsPerDay, setAppointmentsPerDay] = useState(8);
  const [averagePrice, setAveragePrice] = useState(85);
  const [noShowRate, setNoShowRate] = useState(15);
  const [workDays, setWorkDays] = useState(24);

  // Math
  const totalAppointmentsMonth = appointmentsPerDay * workDays;
  const missedAppointmentsMonth = Math.round(totalAppointmentsMonth * (noShowRate / 100));
  const monthlyLoss = missedAppointmentsMonth * averagePrice;
  const yearlyLoss = monthlyLoss * 12;
  // Estimated 80% recovery with automatic WhatsApp reminders
  const recoveredMonthly = Math.round(monthlyLoss * 0.8);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <section id="calculadora" className="py-24 md:py-36 bg-white border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl text-left mb-14">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Calculadora de retorno
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-3">
            Quanto o seu negócio perde com faltas de clientes?
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 mt-3 leading-relaxed">
            Ajuste os valores para simular o impacto financeiro de clientes que marcam horário e não comparecem.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Sliders Area com fontes ampliadas */}
          <div className="lg:col-span-7 bg-zinc-50 border border-zinc-200/90 rounded-3xl p-8 sm:p-10 space-y-7">
            {/* Slider 1: Atendimentos por dia */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-zinc-800 font-bold">Atendimentos por dia:</span>
                <span className="text-purple-700 font-extrabold bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200/60 text-xs sm:text-sm">
                  {appointmentsPerDay} clientes
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={25}
                step={1}
                value={appointmentsPerDay}
                onChange={(e) => setAppointmentsPerDay(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer h-2.5 bg-zinc-200 rounded-lg appearance-none"
              />
            </div>

            {/* Slider 2: Preço médio */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-zinc-800 font-bold">Valor médio por procedimento:</span>
                <span className="text-purple-700 font-extrabold bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200/60 text-xs sm:text-sm">
                  {formatCurrency(averagePrice)}
                </span>
              </div>
              <input
                type="range"
                min={25}
                max={350}
                step={5}
                value={averagePrice}
                onChange={(e) => setAveragePrice(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer h-2.5 bg-zinc-200 rounded-lg appearance-none"
              />
            </div>

            {/* Slider 3: Taxa de faltas */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-zinc-800 font-bold">Taxa estimada de faltas/desistências:</span>
                <span className="text-rose-700 font-extrabold bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200/60 text-xs sm:text-sm">
                  {noShowRate}% dos horários
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                step={1}
                value={noShowRate}
                onChange={(e) => setNoShowRate(parseInt(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer h-2.5 bg-zinc-200 rounded-lg appearance-none"
              />
              <span className="text-xs text-zinc-500 block">
                A média brasileira em salões sem lembretes automáticos é de 15% a 22%.
              </span>
            </div>

            {/* Slider 4: Dias trabalhados */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-zinc-800 font-bold">Dias trabalhados por mês:</span>
                <span className="text-purple-700 font-extrabold bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200/60 text-xs sm:text-sm">
                  {workDays} dias
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={workDays}
                onChange={(e) => setWorkDays(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer h-2.5 bg-zinc-200 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Results Card com fontes ampliadas */}
          <div className="lg:col-span-5 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/40 border border-purple-200/80 rounded-3xl p-8 sm:p-10 space-y-7 shadow-xl shadow-purple-900/5">
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-200/60 inline-block">
                Prejuízo Atual Estimado
              </span>
              <div className="text-4xl sm:text-5xl font-extrabold text-rose-600 tracking-tight mt-4">
                {formatCurrency(monthlyLoss)}
                <span className="text-sm sm:text-base font-semibold text-zinc-500 block mt-1">
                  por mês jogados fora
                </span>
              </div>
              <div className="text-sm text-zinc-600 mt-2">
                Equivalente a cerca de <strong>{formatCurrency(yearlyLoss)}</strong> por ano em cadeiras vazias.
              </div>
            </div>

            {/* Recovery Projection com fontes ampliadas */}
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-2">
              <div className="text-xs sm:text-sm font-bold text-emerald-800">
                Com lembretes automáticos no WhatsApp:
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700">
                +{formatCurrency(recoveredMonthly)}
                <span className="text-xs sm:text-sm font-semibold text-emerald-800 block mt-0.5">
                  recuperados todo mês
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-medium">
                Profissionais reduzem em média 80% das faltas logo na primeira semana de ativação dos lembretes.
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            >
              <Link
                href="/cadastro?plan=free"
                className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>Blindar minha agenda agora</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
