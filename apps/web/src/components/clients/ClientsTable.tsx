'use client';

import React from 'react';
import {
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  FileText,
  Edit2,
  Trash2,
  ExternalLink,
  Users,
  FileCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ClientItem } from './types';

interface ClientsTableProps {
  clients: ClientItem[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onViewHistory: (client: ClientItem) => void;
  onEdit: (client: ClientItem) => void;
  onToggleBlock: (client: ClientItem) => void;
  onDelete: (client: ClientItem) => void;
}

export const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  loading,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onViewHistory,
  onEdit,
  onToggleBlock,
  onDelete
}) => {
  const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const formatBirthday = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Nenhum cliente encontrado
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Não localizamos clientes para os filtros selecionados. Novos clientes que realizarem agendamentos na sua vitrine aparecerão automaticamente aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-4 px-5">Cliente</th>
              <th className="py-4 px-5">Contato / WhatsApp</th>
              <th className="py-4 px-5 text-center">Visitas</th>
              <th className="py-4 px-5 text-center">Anamnese</th>
              <th className="py-4 px-5">No-Show Shield</th>
              <th className="py-4 px-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {clients.map((client) => {
              const bday = formatBirthday(client.birthday);
              const cleanDigits = client.phone.replace(/\D/g, '');
              const waUrl = `https://wa.me/55${cleanDigits}`;
              const totalVisits = client._count?.schedules ?? 0;

              return (
                <tr
                  key={client.id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-tenant-primary flex items-center justify-center text-white font-bold text-sm shadow-2xs flex-shrink-0">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span className="truncate">{client.name}</span>
                          {bday && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                              <Calendar className="w-3 h-3" />
                              {bday}
                            </span>
                          )}
                        </div>
                        {client.email ? (
                          <div className="text-xs text-slate-500 truncate">
                            {client.email}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            Sem e-mail cadastrado
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-mono text-xs font-medium">
                        {formatPhone(client.phone)}
                      </span>
                      {cleanDigits && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Abrir WhatsApp"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {totalVisits} {totalVisits === 1 ? 'visita' : 'visitas'}
                    </span>
                  </td>

                  <td className="py-4 px-5 text-center">
                    {client.anamnesis ? (
                      <button
                        onClick={() => onViewHistory(client)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        title="Ver ficha de anamnese preenchida"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Preenchida
                      </button>
                    ) : (
                      <button
                        onClick={() => onViewHistory(client)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                        title="Ficha pendente — clique para copiar link ou enviar"
                      >
                        Pendente
                      </button>
                    )}
                  </td>

                  <td className="py-4 px-5">
                    {client.isBlockedOnline ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Bloqueado Online
                      </span>
                    ) : client.noShowCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {client.noShowCount} falta{client.noShowCount > 1 ? 's' : ''} (Exige Sinal)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Regular
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewHistory(client)}
                        className="p-2 rounded-xl text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Ver histórico de agendamentos"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onEdit(client)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar dados"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onToggleBlock(client)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          client.isBlockedOnline
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        title={
                          client.isBlockedOnline
                            ? 'Desbloquear agendamento online'
                            : 'Bloquear agendamento online'
                        }
                      >
                        {client.isBlockedOnline ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => onDelete(client)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remover cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginação Integrada */}
      {!loading && totalCount > 0 && (
        <div className="border-t border-slate-200/90 bg-slate-50/70 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Lado Esquerdo: Intervalo exibido */}
          <div className="text-slate-600 font-medium">
            Mostrando <span className="font-bold text-slate-900">{from}</span> a{' '}
            <span className="font-bold text-slate-900">{to}</span> de{' '}
            <span className="font-bold text-slate-900">{totalCount}</span> clientes
          </div>

          {/* Lado Direito: Seletor de Tamanho e Navegação */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium hidden sm:inline">Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:border-purple-600 cursor-pointer"
              >
                <option value={10}>10 por pág.</option>
                <option value={15}>15 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onPageChange(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                        num === currentPage
                          ? 'bg-tenant-primary text-white shadow-2xs font-bold'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Próxima Página"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
