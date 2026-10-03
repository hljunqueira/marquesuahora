'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Building2,
  Calendar,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Bot,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminOverviewPage() {
  const [metrics, setMetrics] = useState({
    estimatedMRR: 18450.0,
    totalTenants: 142,
    activeTenants: 128,
    trialTenants: 11,
    blockedTenants: 3,
    totalSchedules: 18920,
    openTickets: 4,
    whatsappInstancesOnline: 124,
    aiTokensUsedToday: 42300
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">
          Painel Global do SaaS
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Métricas consolidadas de faturamento recorrente, estabilidade das instâncias e lojas ativas.
        </p>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MRR */}
        <div className="p-6 rounded-3xl bg-[#0F172A] border border-amber-500/20 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              MRR Global (Assinaturas)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-mono font-bold text-white mt-3 block">
            R$ {metrics.estimatedMRR.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Faturamento recorrente mensal ativo
          </span>
        </div>

        {/* KPI 2: Lojas Ativas */}
        <div className="p-6 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Lojas & Espaços
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-mono font-bold text-white mt-3 block">
            {metrics.activeTenants}{' '}
            <span className="text-xs text-slate-500 font-normal">/ {metrics.totalTenants} total</span>
          </span>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400 font-semibold">{metrics.activeTenants} ativas</span>
            <span className="text-amber-400 font-semibold">• {metrics.trialTenants} em teste</span>
          </div>
        </div>

        {/* KPI 3: Agendamentos na Plataforma */}
        <div className="p-6 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Agendamentos Concluídos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-mono font-bold text-white mt-3 block">
            {metrics.totalSchedules.toLocaleString('pt-BR')}
          </span>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Volume processado com travas anti-overbooking
          </span>
        </div>

        {/* KPI 4: Chamados Abertos */}
        <div className="p-6 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Suporte Pendente
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-mono font-bold text-white mt-3 block">
            {metrics.openTickets}
          </span>
          <span className="text-[11px] text-rose-400 mt-2 block">
            Requerem atenção operacional
          </span>
        </div>
      </div>

      {/* Monitor de Instâncias WhatsApp & Tokens IA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Instâncias WhatsApp (Evolution API)</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              98.2% ONLINE
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {metrics.whatsappInstancesOnline} de {metrics.activeTenants} estabelecimentos com QR Code pareado e webhooks de confirmação respondendo em menos de 100ms.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Consumo da Atendente Virtual IA</span>
            </div>
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
              JEV + GEMINI
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {metrics.aiTokensUsedToday.toLocaleString('pt-BR')} tokens consumidos hoje. Decisões estruturadas processadas via TypeSafe Jev com tempo médio de resposta de 64ms.
          </p>
        </div>
      </div>
    </div>
  );
}
