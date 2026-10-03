'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ScrollText,
  Search,
  Shield,
  Clock,
  Terminal,
  User,
  Filter
} from 'lucide-react';

interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  tenantName?: string;
  ipAddress: string;
  createdAt: string;
  details: Record<string, any>;
}

export default function AdminAuditoriaPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const [logs] = useState<AuditItem[]>([
    {
      id: 'aud-1',
      action: 'UPDATE_BILLING_STATUS',
      entityType: 'Tenant',
      entityId: 'ten-4',
      userName: 'Super Admin',
      tenantName: 'Lash & Beauty Studio',
      ipAddress: '187.54.120.44',
      createdAt: 'Hoje às 11:42',
      details: {
        reason: 'Inadimplência de fatura após 5 dias de carência',
        previousStatus: 'ACTIVE',
        newStatus: 'BLOCKED'
      }
    },
    {
      id: 'aud-2',
      action: 'CREATE_PLAN',
      entityType: 'Plan',
      entityId: 'pl-3',
      userName: 'Super Admin',
      ipAddress: '187.54.120.44',
      createdAt: 'Ontem às 16:15',
      details: {
        code: 'VIP_AI',
        monthlyPrice: 249.9,
        isUnlimitedBookings: true
      }
    },
    {
      id: 'aud-3',
      action: 'IMPERSONATE_SESSION',
      entityType: 'Tenant',
      entityId: 'ten-1',
      userName: 'Super Admin',
      tenantName: 'Salão Imperial & Spa',
      ipAddress: '187.54.120.44',
      createdAt: '01/10/2026 às 14:02',
      details: {
        targetUser: 'mariana@salaoimperial.com.br',
        reason: 'Apoio técnico na configuração de catálogo'
      }
    }
  ]);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.tenantName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">
          Trilha de Auditoria do SaaS
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Registro imutável de eventos sensíveis, alterações de planos, bloqueios e acessos assistidos.
        </p>
      </div>

      {/* Busca */}
      <div className="p-4 rounded-3xl bg-[#0F172A] border border-white/5 shadow-xl">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por ação, entidade ou loja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-white placeholder-slate-500 transition-all"
          />
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-[#0F172A] rounded-3xl border border-white/5 shadow-xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-5 hover:bg-slate-800/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {log.action}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {log.entityType} ({log.tenantName || log.entityId})
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                  <span>IP: {log.ipAddress}</span>
                  <span>•</span>
                  <span>{log.createdAt}</span>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-900/80 rounded-2xl border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
