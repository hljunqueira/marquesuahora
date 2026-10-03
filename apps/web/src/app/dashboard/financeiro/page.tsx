'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Percent,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function DashboardFinanceiroPage() {
  const [period, setPeriod] = useState('HOJE');

  const summary = {
    grossTotal: 1250.0,
    pixTotal: 720.0,
    cardTotal: 380.0,
    cashTotal: 150.0,
    depositsDeducted: 160.0,
    commissionsTotal: 580.0,
    netProfit: 670.0
  };

  const commissions = [
    {
      professional: 'Carlos Barbeiro',
      percentage: '50%',
      salesTotal: 650.0,
      payout: 325.0
    },
    {
      professional: 'Juliana Silva',
      percentage: '60%',
      salesTotal: 420.0,
      payout: 252.0
    },
    {
      professional: 'Lucas Hair',
      percentage: '45%',
      salesTotal: 180.0,
      payout: 81.0
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Financeiro & Fechamento de Caixa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Entradas separadas por método de pagamento, abatimento de sinal PIX e cálculo de comissões.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm text-xs font-semibold">
          {['HOJE', 'ESTA SEMANA', 'ESTE MÊS'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cards de Receita */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Faturamento Bruto
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 mt-2 block">
            R$ {summary.grossTotal.toFixed(2).replace('.', ',')}
          </span>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sinais PIX abatidos:</span>
            <span className="font-mono font-semibold text-emerald-600">
              - R$ {summary.depositsDeducted.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Comissões da Equipe
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 mt-2 block">
            R$ {summary.commissionsTotal.toFixed(2).replace('.', ',')}
          </span>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Repasse calculado:</span>
            <span className="font-mono font-semibold text-purple-600">3 colaboradores</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Lucro Líquido do Salão
          </span>
          <span className="text-2xl font-mono font-bold text-brand-gold mt-2 block">
            R$ {summary.netProfit.toFixed(2).replace('.', ',')}
          </span>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Margem da casa:</span>
            <span className="font-semibold text-white">53.6%</span>
          </div>
        </div>
      </div>

      {/* Repasse de Comissões por Colaborador */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-base font-display font-bold text-slate-900">
          Repasse Automático de Comissões
        </h3>

        <div className="divide-y divide-slate-100">
          {commissions.map((comm) => (
            <div key={comm.professional} className="py-3.5 flex items-center justify-between text-xs">
              <div>
                <strong className="text-sm font-semibold text-slate-900 block">
                  {comm.professional}
                </strong>
                <span className="text-slate-500">
                  Taxa de {comm.percentage} sobre R$ {comm.salesTotal.toFixed(2).replace('.', ',')} faturados
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-slate-900 block">
                  R$ {comm.payout.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Pronto para repasse</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
