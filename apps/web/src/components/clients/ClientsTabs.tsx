'use client';

import React from 'react';
import { Users, Cake, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ClientTab, ClientMetrics } from './types';

interface ClientsTabsProps {
  activeTab: ClientTab;
  onTabChange: (tab: ClientTab) => void;
  metrics: ClientMetrics;
}

export const ClientsTabs: React.FC<ClientsTabsProps> = ({
  activeTab,
  onTabChange,
  metrics
}) => {
  const tabs = [
    {
      id: 'ALL' as ClientTab,
      label: 'Todos os Clientes',
      icon: Users,
      count: metrics.totalClients,
      color: 'purple'
    },
    {
      id: 'BIRTHDAYS' as ClientTab,
      label: 'Aniversariantes do Mês',
      icon: Cake,
      count: metrics.birthdaysThisMonth,
      color: 'pink'
    },
    {
      id: 'CHURN' as ClientTab,
      label: 'Risco de Churn (+45 dias)',
      icon: AlertTriangle,
      count: metrics.churnRisk,
      color: 'amber'
    },
    {
      id: 'SHIELD' as ClientTab,
      label: 'No-Show Shield',
      icon: ShieldAlert,
      count: metrics.shieldAlerts,
      color: 'red'
    }
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-white text-tenant-primary shadow-xs border border-slate-200/90 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Icon
              className={`w-4 h-4 ${
                isActive
                  ? tab.color === 'pink'
                    ? 'text-pink-600'
                    : tab.color === 'amber'
                    ? 'text-amber-600'
                    : tab.color === 'red'
                    ? 'text-rose-600'
                    : 'text-tenant-primary'
                  : 'text-slate-400'
              }`}
            />
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-tenant-light text-tenant-primary border border-tenant-primary'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
