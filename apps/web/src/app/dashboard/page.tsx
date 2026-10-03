'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Cake,
  ChevronRight,
  Scissors,
  Sparkles,
  Smartphone
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const [stats] = useState({
    todayBookings: 12,
    todayBookingsGrowth: '+20% vs. ontem',
    activeClients: 86,
    activeClientsGrowth: '+12% vs. mês anterior',
    todayRevenue: 2480.0,
    todayRevenueGrowth: '+18% vs. ontem',
    attendanceRate: 96,
    attendanceRateGrowth: '+4% vs. mês anterior',
    birthdayCount: 2
  });

  const weeklyData = [
    { day: 'Seg', date: '21/04', count: 18, height: '45%' },
    { day: 'Ter', date: '22/04', count: 22, height: '55%' },
    { day: 'Qua', date: '23/04', count: 26, height: '65%' },
    { day: 'Qui', date: '24/04', count: 25, height: '62%' },
    { day: 'Sex', date: '25/04', count: 28, height: '70%' },
    { day: 'Dom', date: '27/04', count: 38, height: '95%', isPeak: true }
  ];

  const topServices = [
    { name: 'Corte de Cabelo', count: 42, percentage: 35 },
    { name: 'Coloração', count: 28, percentage: 23 },
    { name: 'Manicure', count: 18, percentage: 15 },
    { name: 'Limpeza de Pele', count: 12, percentage: 10 },
    { name: 'Hidratação Capilar', count: 10, percentage: 8 }
  ];

  const nextAppointments = [
    {
      id: '1',
      time: '09:00',
      client: 'Juliana Costa',
      service: 'Corte de Cabelo',
      status: 'CONFIRMED',
      avatarColor: 'bg-purple-100 text-purple-700',
      isBirthday: true
    },
    {
      id: '2',
      time: '10:30',
      client: 'Mariana Lima',
      service: 'Coloração',
      status: 'CONFIRMED',
      avatarColor: 'bg-emerald-100 text-emerald-700',
      isBirthday: false
    },
    {
      id: '3',
      time: '14:00',
      client: 'Fernanda Alves',
      service: 'Manicure',
      status: 'PENDING',
      avatarColor: 'bg-amber-100 text-amber-700',
      isBirthday: false
    },
    {
      id: '4',
      time: '16:30',
      client: 'Camila Rodrigues',
      service: 'Limpeza de Pele',
      status: 'CONFIRMED',
      avatarColor: 'bg-indigo-100 text-indigo-700',
      isBirthday: false
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Barra de Ações Rápidas do Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Resumo Operacional
          </h2>
          <p className="text-xs text-slate-500">
            Métricas de agendamentos e faturamento em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>Hoje, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
          <Link
            href="/dashboard/agenda"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span>Ver Agenda</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 2. Banner de Aniversariantes */}
      {stats.birthdayCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Cake className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">
                🎂 {stats.birthdayCount} clientes comemoram aniversário hoje!
              </h4>
              <p className="text-[11px] text-amber-700">
                Mensagens cordiais automáticas programadas pelo padrão Humanizer via WhatsApp.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/clientes?tab=birthdays"
            className="text-xs font-semibold text-amber-900 hover:underline flex items-center gap-1"
          >
            <span>Ver aniversariantes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 3. 4 KPIs com Sparklines Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Agendamentos Hoje */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Agendamentos hoje</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-slate-800">
              {stats.todayBookings}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {stats.todayBookingsGrowth}
            </span>
            {/* Sparkline SVG */}
            <svg className="w-16 h-6 text-purple-500 overflow-visible" viewBox="0 0 64 24" fill="none">
              <path
                d="M2 18 C 15 16, 25 22, 35 12 C 45 4, 55 10, 62 2"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 2: Clientes Ativos */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Clientes ativos</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-slate-800">
              {stats.activeClients}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {stats.activeClientsGrowth}
            </span>
            <svg className="w-16 h-6 text-purple-500 overflow-visible" viewBox="0 0 64 24" fill="none">
              <path
                d="M2 20 C 18 18, 30 14, 42 12 C 50 10, 58 6, 62 3"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 3: Faturamento Hoje */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Faturamento hoje</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              $
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-800">
              R$ {stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {stats.todayRevenueGrowth}
            </span>
            <svg className="w-16 h-6 text-purple-500 overflow-visible" viewBox="0 0 64 24" fill="none">
              <path
                d="M2 22 C 16 20, 26 12, 38 14 C 48 16, 56 6, 62 2"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 4: Taxa de Comparecimento */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Taxa de comparecimento</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-slate-800">
              {stats.attendanceRate}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {stats.attendanceRateGrowth}
            </span>
            <svg className="w-16 h-6 text-purple-500 overflow-visible" viewBox="0 0 64 24" fill="none">
              <path
                d="M2 18 C 14 18, 28 14, 40 10 C 50 8, 58 4, 62 2"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Gráficos em Duas Colunas (Agendamentos Semanal + Serviços Mais Agendados) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras: Agendamentos Últimos 7 dias */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-display font-bold text-slate-900">
                Agendamentos
              </h3>
              <p className="text-xs text-slate-500">
                Volume diário atendido pela equipe
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
              Últimos 7 dias
            </span>
          </div>

          {/* Gráfico de barras estilizado */}
          <div className="h-52 flex items-end justify-between gap-3 pt-6 pb-2 px-4">
            {weeklyData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                {/* Tooltip no pico */}
                {item.isPeak && (
                  <div className="px-2 py-0.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold shadow-md -mb-1 animate-bounce">
                    {item.count} agendamentos
                  </div>
                )}
                <div
                  style={{ height: item.height }}
                  className={`w-full max-w-[42px] rounded-xl transition-all duration-300 ${
                    item.isPeak
                      ? 'bg-purple-700 shadow-md shadow-purple-600/30'
                      : 'bg-purple-200/70 group-hover:bg-purple-300'
                  }`}
                />
                <div className="text-center">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {item.day}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {item.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Serviços Mais Agendados */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-display font-bold text-slate-800">
                Serviços mais agendados
              </h3>
              <Link href="/dashboard/servicos" className="text-xs text-purple-600 font-semibold hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="space-y-4">
              {topServices.map((service, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{service.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {service.count} agendamentos ({service.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${service.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Ticket Médio Estimado
            </span>
            <span className="font-mono font-bold text-slate-800">R$ 135,00</span>
          </div>
        </div>
      </div>

      {/* 5. Tabela de Próximos Agendamentos */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-display font-bold text-slate-800">
              Próximos agendamentos
            </h3>
            <p className="text-xs text-slate-500">
              Horários confirmados para hoje
            </p>
          </div>
          <Link
            href="/dashboard/agenda"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {nextAppointments.map((appt) => (
            <div
              key={appt.id}
              className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 px-3 rounded-2xl transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono font-bold text-slate-700 w-12">
                  {appt.time}
                </span>
                <div className={`w-8 h-8 rounded-full ${appt.avatarColor} font-bold text-xs flex items-center justify-center shrink-0`}>
                  {appt.client.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-slate-800">
                      {appt.client}
                    </strong>
                    {appt.isBirthday && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                        🎂
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {appt.service}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    appt.status === 'CONFIRMED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {appt.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
