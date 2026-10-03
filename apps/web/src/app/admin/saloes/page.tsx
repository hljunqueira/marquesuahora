'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Search,
  Filter,
  ExternalLink,
  ShieldAlert,
  Lock,
  Unlock,
  UserCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  niche: string;
  ownerName: string;
  phone: string;
  planName: string;
  billingStatus: 'ACTIVE' | 'TRIAL' | 'BLOCKED';
  totalSchedules: number;
}

export default function AdminSaloesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [tenants, setTenants] = useState<TenantItem[]>([
    {
      id: 'ten-1',
      name: 'Salão Imperial & Spa',
      slug: 'salao-imperial',
      niche: 'BEAUTY_SALON',
      ownerName: 'Mariana Esteves',
      phone: '11987654321',
      planName: 'EQUIPE_PRO',
      billingStatus: 'ACTIVE',
      totalSchedules: 420
    },
    {
      id: 'ten-2',
      name: 'Barbearia Rota 66',
      slug: 'rota66',
      niche: 'BARBERSHOP',
      ownerName: 'Ricardo Duarte',
      phone: '11977778888',
      planName: 'SOLO',
      billingStatus: 'ACTIVE',
      totalSchedules: 180
    },
    {
      id: 'ten-3',
      name: 'Clínica Dermato Prime',
      slug: 'dermato-prime',
      niche: 'AESTHETICS_CLINIC',
      ownerName: 'Dra. Vanessa Luz',
      phone: '11966669999',
      planName: 'VIP_AI',
      billingStatus: 'TRIAL',
      totalSchedules: 64
    },
    {
      id: 'ten-4',
      name: 'Lash & Beauty Studio',
      slug: 'lash-studio',
      niche: 'NAIL_LASH_STUDIO',
      ownerName: 'Carla Gomes',
      phone: '11955551111',
      planName: 'SOLO',
      billingStatus: 'BLOCKED',
      totalSchedules: 95
    }
  ]);

  const [targetBlock, setTargetBlock] = useState<TenantItem | null>(null);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && t.billingStatus !== statusFilter) return false;
    return true;
  });

  const handleToggleBlock = () => {
    if (!targetBlock) return;
    setTenants((prev) =>
      prev.map((t) =>
        t.id === targetBlock.id
          ? {
              ...t,
              billingStatus: t.billingStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED'
            }
          : t
      )
    );
    setTargetBlock(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">
          Gestão Global de Lojas & Assinantes
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Controle central de clientes, faturamento, acesso assistido (impersonate) e bloqueio.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, slug ou proprietário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-white placeholder-slate-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'TRIAL', 'BLOCKED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {status === 'ALL'
                ? 'Todas'
                : status === 'ACTIVE'
                ? 'Ativas'
                : status === 'TRIAL'
                ? 'Trial'
                : 'Bloqueadas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Estabelecimentos */}
      <div className="bg-[#0F172A] rounded-3xl border border-white/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-900/50">
                <th className="p-4">Estabelecimento</th>
                <th className="p-4">Nicho</th>
                <th className="p-4">Proprietário</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div>
                      <strong className="text-white font-bold block">{t.name}</strong>
                      <span className="text-[11px] font-mono text-slate-400">/{t.slug}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {t.niche}
                    </span>
                  </td>

                  <td className="p-4">
                    <div>
                      <span className="text-slate-200 font-medium block">{t.ownerName}</span>
                      <span className="text-[11px] font-mono text-slate-500">{t.phone}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {t.planName}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        t.billingStatus === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : t.billingStatus === 'TRIAL'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {t.billingStatus}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Impersonate 1-clique */}
                      <a
                        href="/dashboard"
                        title="Acessar painel como Dono (Impersonate)"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      </a>

                      {/* Abrir vitrine pública */}
                      <a
                        href={`/${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir Vitrine Pública"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Bloqueio / Desbloqueio */}
                      <button
                        type="button"
                        onClick={() => setTargetBlock(t)}
                        title={t.billingStatus === 'BLOCKED' ? 'Desbloquear loja' : 'Bloquear loja'}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {t.billingStatus === 'BLOCKED' ? (
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(targetBlock)}
        title={targetBlock?.billingStatus === 'BLOCKED' ? 'Desbloquear Loja?' : 'Bloquear Loja?'}
        description={
          targetBlock?.billingStatus === 'BLOCKED'
            ? `Tem certeza que deseja reativar o acesso de "${targetBlock?.name}"? A vitrine pública voltará a receber novos agendamentos imediatamente.`
            : `Tem certeza que deseja suspender o acesso de "${targetBlock?.name}"? A vitrine pública ficará bloqueada com aviso de renovação pendente.`
        }
        confirmLabel={targetBlock?.billingStatus === 'BLOCKED' ? 'Sim, Desbloquear' : 'Sim, Bloquear'}
        isDestructive={targetBlock?.billingStatus !== 'BLOCKED'}
        onConfirm={handleToggleBlock}
        onClose={() => setTargetBlock(null)}
      />
    </div>
  );
}
