'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Search,
  Cake,
  AlertTriangle,
  ShieldAlert,
  Phone,
  Calendar,
  Sparkles,
  History,
  CheckCircle2,
  Lock,
  Unlock
} from 'lucide-react';

interface ClientItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  lastVisitAt?: string;
  totalVisits: number;
  noShowCount: number;
  avgVisitDays?: number;
  isBlockedOnline: boolean;
}

export default function DashboardClientesPage() {
  const [filterTab, setFilterTab] = useState<'ALL' | 'BIRTHDAYS' | 'CHURN' | 'NO_SHOWS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [clients, setClients] = useState<ClientItem[]>([
    {
      id: 'cli-1',
      name: 'Fernanda Lima',
      phone: '11987654321',
      email: 'fernanda@gmail.com',
      birthday: '1995-10-03',
      lastVisitAt: 'Hoje',
      totalVisits: 14,
      noShowCount: 0,
      avgVisitDays: 21,
      isBlockedOnline: false
    },
    {
      id: 'cli-2',
      name: 'Roberto Camargo',
      phone: '11977771111',
      email: 'roberto@empresa.com.br',
      birthday: '1988-06-12',
      lastVisitAt: 'Há 52 dias',
      totalVisits: 8,
      noShowCount: 0,
      avgVisitDays: 25,
      isBlockedOnline: false
    },
    {
      id: 'cli-3',
      name: 'Juliana Pires',
      phone: '11966662222',
      email: 'juliana@uol.com.br',
      birthday: '1992-04-18',
      lastVisitAt: 'Há 3 meses',
      totalVisits: 3,
      noShowCount: 2,
      avgVisitDays: 30,
      isBlockedOnline: true
    }
  ]);

  const filteredClients = clients.filter((cli) => {
    const matchesSearch =
      cli.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cli.phone.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterTab === 'BIRTHDAYS') {
      return Boolean(cli.birthday);
    }
    if (filterTab === 'CHURN') {
      return cli.lastVisitAt?.includes('dias') || cli.lastVisitAt?.includes('meses');
    }
    if (filterTab === 'NO_SHOWS') {
      return cli.noShowCount >= 2 || cli.isBlockedOnline;
    }
    return true;
  });

  const toggleBlockOnline = (id: string) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isBlockedOnline: !c.isBlockedOnline } : c))
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Abas e Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Abas */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'Todos os Clientes', icon: Users },
              { id: 'BIRTHDAYS', label: '🎂 Aniversariantes', icon: Cake },
              { id: 'CHURN', label: '⚠️ Clientes Sumidos (Churn)', icon: AlertTriangle },
              { id: 'NO_SHOWS', label: '🛡️ No-Show Shield', icon: ShieldAlert }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = filterTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                      : 'bg-slate-50 text-slate-600 hover:text-purple-700 hover:bg-purple-50/60 border border-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Busca */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-4">Cliente</th>
                <th className="p-4">Última Visita</th>
                <th className="p-4">Total Visitas</th>
                <th className="p-4">Faltas (No-Show)</th>
                <th className="p-4">Status Online</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum cliente encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const cleanPhone = client.phone.replace(/\D/g, '');
                  const whatsappMessage =
                    filterTab === 'BIRTHDAYS'
                      ? `Olá ${client.name}! Toda a nossa equipe deseja a você um aniversário maravilhoso, repleto de paz, saúde e realizações!`
                      : `Olá ${client.name}, tudo bem? Sentimos sua falta aqui no salão! Que tal renovar seu visual esta semana?`;

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-slate-900 font-bold">
                                {client.name}
                              </strong>
                              {client.birthday && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                  🎂 Aniversariante
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {client.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-medium text-slate-700">
                        {client.lastVisitAt || 'Nunca'}
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-900">
                        {client.totalVisits}
                      </td>

                      <td className="p-4">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                            client.noShowCount >= 2
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {client.noShowCount}
                        </span>
                      </td>

                      <td className="p-4">
                        {client.isBlockedOnline ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <Lock className="w-3 h-3" />
                            <span>Encaminhado ao WhatsApp</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Unlock className="w-3 h-3" />
                            <span>Livre na Vitrine</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleBlockOnline(client.id)}
                            title={
                              client.isBlockedOnline
                                ? 'Liberar agendamento online'
                                : 'Bloquear agendamento online autônomo'
                            }
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            {client.isBlockedOnline ? (
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                            )}
                          </button>

                          <a
                            href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                              whatsappMessage
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
