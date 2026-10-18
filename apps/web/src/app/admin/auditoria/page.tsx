'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';

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
  const [logs, setLogs] = useState<AuditItem[]>([
    {
      id: 'aud-1',
      action: 'TENANT_GRATUITY_GRANTED',
      entityType: 'Tenant',
      entityId: 'ten-4',
      userName: 'Super Admin',
      tenantName: 'Studio Beleza Pura',
      ipAddress: '187.54.120.44',
      createdAt: 'Hoje às 11:42',
      details: {
        reason: 'Cortesia VIP concedida para embaixadora da marca',
        previousStatus: 'ACTIVE',
        newStatus: 'GRATUITY'
      }
    }
  ]);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setLogs(
            res.data.map((l: any) => ({
              id: l.id,
              action: l.action,
              entityType: l.entityType,
              entityId: l.entityId,
              userName: l.user?.name || 'Super Admin',
              tenantName: l.tenant?.name,
              ipAddress: l.ipAddress || '127.0.0.1',
              createdAt: new Date(l.createdAt).toLocaleString('pt-BR'),
              details: l.details || {}
            }))
          );
        }
      } catch (err) {
        console.warn('Fallback para logs locais:', err);
      }
    };
    fetchAuditLogs();
  }, []);

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
        <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
          Trilha de Auditoria do SaaS
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Registro imutável de eventos sensíveis, alterações de planos, bloqueios e acessos assistidos.
        </p>
      </div>

      {/* Busca */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900 placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-5 hover:bg-slate-50/60 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                    {log.action}
                  </span>
                  <span className="text-xs font-semibold text-slate-900">
                    {log.entityType} ({log.tenantName || log.entityId})
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                  <span>IP: {log.ipAddress}</span>
                  <span>•</span>
                  <span>{log.createdAt}</span>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 font-mono text-[11px] text-slate-700 overflow-x-auto">
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
