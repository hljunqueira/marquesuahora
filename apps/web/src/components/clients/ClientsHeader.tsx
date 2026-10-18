'use client';

import React from 'react';
import { Search, Plus, X, Users } from 'lucide-react';

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface ClientsHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNewClient: () => void;
  onSendCoupon?: () => void;
  totalCount: number;
}

export const ClientsHeader: React.FC<ClientsHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onNewClient,
  onSendCoupon,
  totalCount
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-2xl bg-tenant-light text-tenant-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              Base de Clientes
            </h1>
            <p className="text-sm text-slate-500">
              {totalCount} {totalCount === 1 ? 'cliente cadastrado' : 'clientes cadastrados'} com proteção No-Show Shield
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="relative flex-1 md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all shadow-2xs font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {onSendCoupon && (
          <button
            type="button"
            onClick={onSendCoupon}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-all whitespace-nowrap cursor-pointer shadow-2xs"
          >
            <WhatsAppIcon size={15} color="#059669" />
            <span>Enviar Cupom</span>
          </button>
        )}

        <button
          onClick={onNewClient}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary-tenant font-semibold text-sm shadow-md active:scale-95 transition-all whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>
    </div>
  );
};
