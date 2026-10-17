'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function SuperAdminOverviewPage() {
  const [metrics, setMetrics] = useState({
    estimatedMRR: 0,
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    gratuityTenants: 0,
    blockedTenants: 0,
    totalSchedules: 0,
    openTickets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await api.get('/admin/overview');
        const data = res.data;
        setMetrics({
          estimatedMRR: data.financial?.estimatedMRR ?? 0,
          totalTenants: data.tenants?.total ?? 0,
          activeTenants: data.tenants?.active ?? 0,
          trialTenants: data.tenants?.trial ?? 0,
          gratuityTenants: data.tenants?.gratuity ?? 0,
          blockedTenants: data.tenants?.blocked ?? 0,
          totalSchedules: data.schedules?.total ?? 0,
          openTickets: data.support?.openTickets ?? 0
        });
      } catch (err) {
        console.error('Erro ao carregar métricas do admin:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
          Painel Global do SaaS
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Métricas consolidadas de faturamento recorrente, planos contratados e estabelecimentos ativos.
        </p>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="text-xs font-medium">Carregando métricas globais do SaaS...</span>
        </div>
      ) : (
        <>
          {/* Grid de Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: MRR */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                MRR Global (Assinaturas)
              </span>
              <span className="text-3xl font-mono font-bold text-slate-900 mt-3 block">
                R$ {metrics.estimatedMRR.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[11px] text-slate-500 mt-2 block">
                Faturamento recorrente mensal ativo
              </span>
            </div>

            {/* KPI 2: Lojas & Cortesias */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Lojas & Espaços
              </span>
              <span className="text-3xl font-mono font-bold text-slate-900 mt-3 block">
                {metrics.activeTenants + metrics.gratuityTenants}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {metrics.totalTenants} total</span>
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-emerald-600 font-semibold">{metrics.activeTenants} pagantes</span>
                <span className="text-amber-600 font-semibold">• {metrics.gratuityTenants} cortesias VIP</span>
                <span className="text-slate-500">• {metrics.trialTenants} plano free</span>
              </div>
            </div>

            {/* KPI 3: Agendamentos na Plataforma */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Agendamentos Criados
              </span>
              <span className="text-3xl font-mono font-bold text-slate-900 mt-3 block">
                {metrics.totalSchedules.toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] text-slate-500 mt-2 block">
                Processados com travas de cota e anti-overbooking
              </span>
            </div>

            {/* KPI 4: Chamados Abertos */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Suporte Pendente
              </span>
              <span className="text-3xl font-mono font-bold text-slate-900 mt-3 block">
                {metrics.openTickets}
              </span>
              <span className="text-[11px] text-rose-600 font-medium mt-2 block">
                {metrics.openTickets === 0 ? 'Nenhum chamado pendente' : 'Requerem atenção operacional'}
              </span>
            </div>
          </div>

          {/* Cards Informativos de Operação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">
                  Programa de Gratuidade & Embaixadores VIP
                </span>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {metrics.gratuityTenants} ATIVAS
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você pode liberar o plano <strong>Profissional Solo</strong> ou <strong>Equipe Pro</strong> com isenção total para parceiros na tela de{' '}
                <Link href="/admin/saloes" className="text-purple-600 font-semibold underline">
                  Gestão de Lojas
                </Link>
                . Essas lojas aproveitam todos os recursos sem cobrança financeira.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">
                  Regras & Travas de Planos Ativas
                </span>
                <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  MOTOR ATIVO
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                O motor valida automaticamente o limite de 30 agendamentos/mês no plano Gratuito e os limites de profissionais da equipe (1 para Solo, 5 para Equipe Pro), protegendo o SaaS contra abusos.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
