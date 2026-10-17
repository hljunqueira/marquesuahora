'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { ClientItem } from './types';

interface ClientHistoryModalProps {
  clientId: string | null;
  onClose: () => void;
}

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  clientId,
  onClose
}) => {
  const [client, setClient] = useState<ClientItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    setLoading(true);
    setError(null);

    api
      .get(`/clients/${clientId}`)
      .then((res) => {
        setClient(res.data);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Erro ao carregar histórico do cliente.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clientId]);

  if (!clientId) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const schedules = client?.schedules || [];
  const totalSpent = schedules
    .filter((s) => s.status === 'COMPLETED' || s.status === 'CONFIRMED')
    .reduce((acc, curr) => acc + Number(curr.totalPrice || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tenant-primary flex items-center justify-center text-white font-bold text-sm shadow-2xs">
              {client ? client.name.slice(0, 2).toUpperCase() : '..'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {client?.name || 'Ficha do Cliente'}
              </h3>
              <p className="text-xs text-slate-500">
                Histórico completo de atendimentos e ficha cadastral
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="space-y-4 py-8 animate-pulse">
              <div className="h-20 bg-slate-100 rounded-2xl" />
              <div className="h-40 bg-slate-100 rounded-2xl" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : client ? (
            <>
              {/* Quick Info & KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Visitas Totais</div>
                  <div className="text-xl font-bold text-slate-900">
                    {schedules.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Faturado</div>
                  <div className="text-xl font-bold text-emerald-700">
                    {formatCurrency(totalSpent)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Faltas (No-Show)</div>
                  <div className={`text-xl font-bold ${client.noShowCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {client.noShowCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status Shield</div>
                  <div className="text-xs font-bold mt-1">
                    {client.isBlockedOnline ? (
                      <span className="text-rose-600">Bloqueado</span>
                    ) : client.noShowCount > 0 ? (
                      <span className="text-amber-600">Exige Sinal</span>
                    ) : (
                      <span className="text-emerald-700">Regular</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Observações & Preferências</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {client.notes}
                  </p>
                </div>
              )}

              {/* Appointments Timeline */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  Histórico de Agendamentos ({schedules.length})
                </h4>

                {schedules.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-500 text-xs">
                    Nenhum agendamento registrado até o momento para este cliente.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {schedules.map((schedule) => {
                      const serviceName = schedule.service?.name || 'Serviço Personalizado';
                      const profName = schedule.professional?.name || 'Não atribuído';

                      const statusLabels: Record<string, { label: string; color: string }> = {
                        PENDING: { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        CONFIRMED: { label: 'Confirmado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        IN_SERVICE: { label: 'Em Atendimento', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                        COMPLETED: { label: 'Concluído', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        NO_SHOW: { label: 'Faltou (No-Show)', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                        CANCELLED: { label: 'Cancelado', color: 'bg-slate-100 text-slate-600 border-slate-200' }
                      };

                      const currentStatus = statusLabels[schedule.status] || statusLabels.PENDING;

                      return (
                        <div
                          key={schedule.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">
                                {serviceName}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${currentStatus.color}`}
                              >
                                {currentStatus.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatDate(schedule.date)}
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {schedule.startTime} - {schedule.endTime}
                              </span>
                              <span className="flex items-center gap-1 text-slate-700 font-medium">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {profName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-emerald-700 text-sm">
                              {formatCurrency(Number(schedule.totalPrice || 0))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
