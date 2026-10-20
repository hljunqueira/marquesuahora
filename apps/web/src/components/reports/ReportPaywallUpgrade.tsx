'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  Award,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface ReportPaywallUpgradeProps {
  currentPlanName?: string;
  currentPlan?: string;
  tenantPrimaryColor?: string;
}

export function ReportPaywallUpgrade({
  currentPlanName,
  currentPlan,
  tenantPrimaryColor = '#5c0701'
}: ReportPaywallUpgradeProps) {
  const planName = currentPlanName || currentPlan || 'Plano Atual';
  const benefits = [
    {
      title: 'Ranking de Clientes VIP & LTV',
      description: 'Descubra com exatidão quem são as clientes que mais agendam, quem mais gasta no ano e recupere clientes sumidas com WhatsApp em 1 clique.'
    },
    {
      title: 'Exportação Exclusiva em PDF Executivo',
      description: 'Gere relatórios institucionais com a sua logo, métricas consolidadas e gráficos limpos para impressão ou arquivo contábil.'
    },
    {
      title: 'Performance e Comissões da Equipe',
      description: 'Acompanhe o faturamento gerado por cada colaboradora, taxa de ocupação individual e cálculo automático de comissões.'
    },
    {
      title: 'Procedimentos Mais Rentáveis',
      description: 'Entenda quais procedimentos trazem maior margem de lucro líquido e otimize sua tabela de preços com dados reais.'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden">
        {/* Banner Superior com Identidade Executiva */}
        <div
          className="p-8 sm:p-10 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${tenantPrimaryColor} 0%, #1e1b4b 100%)`
          }}
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-amber-300 border border-white/20">
              <Lock className="w-3.5 h-3.5" />
              Recurso Exclusivo para Assinantes
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Inteligência 360° & Central de Relatórios do Salão
            </h1>

            <p className="text-sm text-slate-200 leading-relaxed">
              Tome decisões baseadas em dados concretos: saiba quais clientes mais agendam, monitore o faturamento de cada profissional, antecipe faltas e exporte relatórios executivos em PDF com a sua marca.
            </p>
          </div>
        </div>

        {/* Grade de Recursos Inclusos */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((b, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                </div>
                <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                  {b.description}
                </p>
              </div>
            ))}
          </div>

          {/* Chamada para Ação de Upgrade */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                Seu plano atual: <strong className="text-slate-700">{planName}</strong>
              </span>
              <p className="text-xs text-slate-500">
                O upgrade libera instantaneamente todos os 8 módulos de relatórios e BI.
              </p>
            </div>

            <Link
              href="/dashboard/planos"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: tenantPrimaryColor }}
            >
              Fazer Upgrade de Plano
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
