'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';

export const LandingHero: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB'>('TER');

  const scheduleData = {
    SEG: [
      { time: '09:00 - 10:00', client: 'Camila Rocha', service: 'Alongamento em Gel', value: 'R$ 130', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '10:30 - 11:30', client: 'Fernanda Lima', service: 'Corte & Escova', value: 'R$ 95', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '14:00 - 15:30', client: 'Beatriz Santos', service: 'Manutenção Fibra', value: 'R$ 110', status: 'Lembrete Enviado', color: 'purple' }
    ],
    TER: [
      { time: '09:30 - 10:30', client: 'Mariana Costa', service: 'Design de Sobrancelha & Lash', value: 'R$ 140', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '11:00 - 12:00', client: 'Juliana Pires', service: 'Alongamento em Gel', value: 'R$ 130', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '14:30 - 15:30', client: 'Carla Silveira', service: 'Banho de Gel & Cuticulagem', value: 'R$ 90', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '16:00 - 17:00', client: 'Patricia Mendes', service: 'Spa dos Pés & Esmaltação', value: 'R$ 85', status: 'Horário Reservado', color: 'purple' }
    ],
    QUA: [
      { time: '10:00 - 11:30', client: 'Aline Souza', service: 'Mechas & Matização', value: 'R$ 280', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '14:00 - 15:00', client: 'Renata Albuquerque', service: 'Corte Feminino', value: 'R$ 95', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '16:30 - 17:30', client: 'Sofia Carvalho', service: 'Hidratação Profunda', value: 'R$ 120', status: 'Lembrete Enviado', color: 'purple' }
    ],
    QUI: [
      { time: '09:00 - 10:00', client: 'Larissa Moura', service: 'Manutenção em Gel', value: 'R$ 110', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '11:00 - 12:00', client: 'Gabriela Duarte', service: 'Lash Lifting', value: 'R$ 120', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '15:00 - 16:30', client: 'Vanessa Ribeiro', service: 'Alongamento Fibra', value: 'R$ 150', status: 'Confirmado WhatsApp', color: 'emerald' }
    ],
    SEX: [
      { time: '09:00 - 10:00', client: 'Isabela Fontes', service: 'Alongamento em Gel', value: 'R$ 130', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '10:30 - 11:30', client: 'Luana Fagundes', service: 'Esmaltação & Spa', value: 'R$ 90', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '13:30 - 15:00', client: 'Daniela Prado', service: 'Combo Cabelo + Make', value: 'R$ 220', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '16:00 - 17:30', client: 'Tatiane Ramos', service: 'Manutenção Fibra', value: 'R$ 110', status: 'Confirmado WhatsApp', color: 'emerald' }
    ],
    SAB: [
      { time: '08:30 - 10:00', client: 'Roberta Dias', service: 'Alongamento Completo', value: 'R$ 160', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '10:30 - 11:30', client: 'Mirella Castro', service: 'Corte & Escova', value: 'R$ 95', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '13:00 - 14:30', client: 'Ana Paula Reis', service: 'Design & Cílios', value: 'R$ 150', status: 'Confirmado WhatsApp', color: 'emerald' },
      { time: '15:00 - 16:30', client: 'Helena Martins', service: 'Manutenção em Gel', value: 'R$ 110', status: 'Confirmado WhatsApp', color: 'emerald' }
    ]
  };

  const currentAppointments = scheduleData[selectedDay];
  const dayTotal = currentAppointments.reduce((acc, curr) => {
    const num = parseInt(curr.value.replace(/\D/g, ''), 10);
    return acc + num;
  }, 0);

  return (
    <section className="relative pt-12 pb-24 md:pt-20 md:pb-36 overflow-hidden bg-gradient-to-b from-white via-zinc-50/40 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-9">
        {/* Pill de Categoria Limpa e Legível */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.4 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs sm:text-sm font-semibold"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Gestão e agendamento online para negócios com hora marcada</span>
        </motion.div>

        {/* Headline com Tipografia Imponente */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-zinc-950 tracking-tight leading-[1.08] max-w-5xl mx-auto"
        >
          Sua agenda organizada e suas clientes{' '}
          <span className="text-purple-600">agendando sozinhas.</span>
        </motion.h1>

        {/* Subtitle com Fonte Confortável e Escalonada */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.5, delay: 0.1 }}
          className="text-lg sm:text-xl md:text-2xl text-zinc-600 max-w-3xl mx-auto leading-relaxed font-normal"
        >
          Pare de passar o dia respondendo mensagens no WhatsApp para negociar horários. Suas clientes agendam pelo seu link em 30 segundos e recebem confirmação e lembretes automáticos.
        </motion.p>

        {/* CTAs Grandes de Alta Conversão */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            className="w-full sm:w-auto"
          >
            <Link
              href="/cadastro?plan=free"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-base sm:text-lg shadow-md hover:shadow-purple-500/25 transition-all"
            >
              <span>Começar no plano gratuito</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            className="w-full sm:w-auto"
          >
            <a
              href="#demonstracao"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-base sm:text-lg shadow-2xs transition-all"
            >
              <span>Testar agendamento no celular</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Trust points com fontes aumentadas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:text-base font-medium text-zinc-600 pt-2"
        >
          <span className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            30 agendamentos mensais gratuitos
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            Sem exigir cartão de crédito
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            Cliente agenda sem baixar aplicativo
          </span>
        </motion.div>

        {/* Interface Real e Vetorial da Plataforma Marque Sua Hora */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.6, delay: 0.25 }}
          className="pt-8 max-w-5xl mx-auto"
        >
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-4 sm:p-7 shadow-2xl shadow-zinc-900/5 text-left">
            {/* Top Browser Bar */}
            <div className="bg-zinc-50 rounded-2xl px-5 py-3.5 flex items-center justify-between border border-zinc-200/80 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-zinc-300 inline-block" />
                <span className="w-3 h-3 rounded-full bg-zinc-300 inline-block" />
                <span className="w-3 h-3 rounded-full bg-zinc-300 inline-block" />
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 font-mono bg-white px-4 py-1.5 rounded-full border border-zinc-200 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>marquesuahora.com.br/dashboard/agenda</span>
              </div>
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full hidden sm:block">
                Sincronizado em tempo real
              </div>
            </div>

            {/* Dashboard Agenda Header com fontes ampliadas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
              <div>
                <div className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
                  Visão Geral da Agenda
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 mt-1">
                  Semana de 19 a 24 de Outubro
                </h2>
              </div>

              {/* Status Metrics Bar */}
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2">
                  <span className="text-zinc-500 block text-xs font-medium">Atendimentos Hoje</span>
                  <span className="font-extrabold text-zinc-900 text-sm sm:text-base">{currentAppointments.length} agendados</span>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-2">
                  <span className="text-purple-700 block text-xs font-semibold">Previsão do Dia</span>
                  <span className="font-extrabold text-purple-900 text-sm sm:text-base">R$ {dayTotal},00</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2 hidden md:block">
                  <span className="text-emerald-700 block text-xs font-semibold">Status WhatsApp</span>
                  <span className="font-extrabold text-emerald-900 text-sm sm:text-base">100% Confirmados</span>
                </div>
              </div>
            </div>

            {/* Day Selector Tabs com fontes ampliadas */}
            <div className="flex items-center gap-2.5 py-4 overflow-x-auto">
              {(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    selectedDay === day
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950'
                  }`}
                >
                  {day} ({scheduleData[day].length})
                </button>
              ))}
            </div>

            {/* Appointments List com tipografia e contraste aumentados */}
            <div className="space-y-3 pt-1">
              {currentAppointments.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 hover:border-purple-300 hover:bg-purple-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shrink-0 text-xs sm:text-sm">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>{item.time}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-950 block text-base">{item.client}</span>
                      <span className="text-zinc-600 text-sm">{item.service}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <span className="font-extrabold text-zinc-950 text-base">{item.value}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        item.color === 'emerald'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Card Footer com fontes ampliadas */}
            <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-zinc-600 font-medium">
              <span>Lembretes automáticos enviados via WhatsApp sem custo adicional</span>
              <Link
                href="/cadastro?plan=free"
                className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1.5"
              >
                <span>Configurar minha agenda agora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
