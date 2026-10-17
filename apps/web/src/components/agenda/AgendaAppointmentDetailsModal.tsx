'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ScheduleAppointment, ProfessionalItem } from './types';

interface AgendaAppointmentDetailsModalProps {
  appointment: ScheduleAppointment;
  professionals: ProfessionalItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AgendaAppointmentDetailsModal({
  appointment,
  professionals,
  onClose,
  onSuccess
}: AgendaAppointmentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de edição inline
  const [editDate, setEditDate] = useState(
    typeof appointment.date === 'string'
      ? appointment.date.slice(0, 10)
      : new Date(appointment.date).toISOString().slice(0, 10)
  );
  const [editStartTime, setEditStartTime] = useState(appointment.startTime || '09:00');
  const [editProfessionalId, setEditProfessionalId] = useState(
    appointment.professionalId || (professionals[0]?.id || '')
  );
  const [editNotes, setEditNotes] = useState(appointment.notes || '');

  // Status dropdown
  const [selectedStatus, setSelectedStatus] = useState(appointment.status);

  // Extrai iniciais do cliente
  const getInitials = (name: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Formata duração em horas e minutos
  const formatDuration = (minutes: number) => {
    if (!minutes) return '30 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  // Formatação de data brasileira
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const clean = dateStr.slice(0, 10);
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  };

  // Disparo de mensagem no WhatsApp
  const handleOpenWhatsApp = () => {
    const rawPhone = appointment.client?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithDdd =
      cleanPhone.length === 11 || cleanPhone.length === 10
        ? `55${cleanPhone}`
        : cleanPhone;

    const formattedDate = formatDateBR(appointment.date);
    const serviceName = appointment.service?.name || 'seu atendimento';

    const msg = encodeURIComponent(
      `Olá, ${appointment.client?.name}! Passando para confirmar seu horário para ${serviceName} no dia ${formattedDate} às ${appointment.startTime}. Qualquer dúvida estamos à disposição!`
    );
    window.open(`https://wa.me/${phoneWithDdd}?text=${msg}`, '_blank');
  };

  // Atualização rápida de status
  const handleUpdateStatus = async (statusToSet: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/schedules/${appointment.id}/status`, {
        status: statusToSet
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao alterar status.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar edição de data/horário/profissional
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/schedules/${appointment.id}`, {
        dateStr: editDate,
        startTime: editStartTime,
        professionalId: editProfessionalId || undefined,
        notes: editNotes.trim() || null
      });
      onSuccess();
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  // Excluir agendamento
  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir este agendamento? O horário será liberado na agenda.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.delete(`/schedules/${appointment.id}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const statusBadges = {
    CONFIRMED: { label: 'Confirmado', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    IN_SERVICE: { label: 'Em Atendimento', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    COMPLETED: { label: 'Concluído', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    NO_SHOW: { label: 'Não Compareceu', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    CANCELLED: { label: 'Cancelado', bg: 'bg-red-50 text-red-700 border-red-200' },
    PENDING: { label: 'Pendente', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
  }[appointment.status] || { label: appointment.status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
      >
        {/* Topo do Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <h3 className="text-base font-bold text-slate-900">
            Detalhes do Agendamento
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Banner do Cliente (Iniciais, Nome, Contato, WhatsApp e Status) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-tenant-primary text-white font-extrabold text-base flex items-center justify-center shadow-xs select-none">
                {getInitials(appointment.client?.name)}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {appointment.client?.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono font-medium">{appointment.client?.phone}</span>
                  {appointment.client?.phone && (
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      WhatsApp
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadges.bg}`}
              >
                • {statusBadges.label}
              </span>
            </div>
          </div>

          {/* Visualização Normal: 4 Grids Compactos Lado a Lado */}
          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Grid 1: Informações do Serviço */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Informações do Serviço
                </span>
                <div>
                  <h5 className="text-sm font-bold text-slate-900 truncate">
                    {appointment.service?.name}
                  </h5>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Duração: {formatDuration(appointment.totalDurationMinutes || appointment.service?.durationMinutes)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <span className="text-sm font-extrabold text-tenant-primary font-mono">
                    R$ {Number(appointment.totalPrice || appointment.service?.price || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Grid 2: Data e Horário */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Data e Horário
                </span>
                <div>
                  <h5 className="text-sm font-bold text-slate-900">
                    {formatDateBR(appointment.date)}
                  </h5>
                  <p className="text-xs text-slate-600 mt-0.5 font-mono">
                    Início: <span className="font-bold">{appointment.startTime}</span>
                    {appointment.endTime && (
                      <span> • Fim: <span className="font-bold">{appointment.endTime}</span></span>
                    )}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Horário reservado
                  </span>
                </div>
              </div>

              {/* Grid 3: Profissional Responsável */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Profissional
                </span>
                <div>
                  <h5 className="text-sm font-bold text-slate-900 truncate">
                    {appointment.professional?.name || 'Profissional da Casa'}
                  </h5>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Responsável pelo atendimento
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-semibold text-emerald-600">
                    Disponível no sistema
                  </span>
                </div>
              </div>

              {/* Grid 4: Origem e Observações */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Observações / Notas
                </span>
                <p className="text-xs text-slate-600 italic line-clamp-3">
                  {appointment.notes || 'Sem observações cadastradas para este horário.'}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 block truncate">
                    ID: {appointment.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Modo de Edição Inline */
            <form onSubmit={handleSaveEdit} className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-3">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                Remarcar ou Editar Atendimento
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Nova Data
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-hidden focus:border-purple-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Novo Horário
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-hidden focus:border-purple-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Profissional
                  </label>
                  <select
                    value={editProfessionalId}
                    onChange={(e) => setEditProfessionalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-hidden focus:border-purple-600 cursor-pointer"
                  >
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Notas / Observações
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Observações do atendimento..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white outline-hidden focus:border-purple-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar Edição
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl btn-primary-tenant text-xs font-bold shadow-xs cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}

          {/* Seção Corrigir Status (dropdown + botão aplicar) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Corrigir Status
              </span>
              <p className="text-[11px] text-slate-400">
                Altere o status para manter o histórico e o financeiro atualizados.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-hidden focus:border-tenant-primary cursor-pointer"
              >
                <option value="CONFIRMED">Confirmado</option>
                <option value="IN_SERVICE">Em Atendimento</option>
                <option value="COMPLETED">Concluído</option>
                <option value="NO_SHOW">Não Compareceu</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="PENDING">Pendente</option>
              </select>

              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedStatus)}
                disabled={loading || selectedStatus === appointment.status}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações Completas */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70">
          {/* Lado Esquerdo: Ações Rápidas Secundárias */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateStatus('NO_SHOW')}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Não Compareceu
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-2 rounded-xl border border-tenant-primary/30 text-tenant-primary bg-tenant-light text-xs font-bold transition-colors cursor-pointer"
            >
              {isEditing ? 'Voltar' : 'Editar'}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Excluir
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

          {/* Lado Direito: Ações Principais de Atendimento */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateStatus('COMPLETED')}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Concluir
            </button>

            <button
              type="button"
              onClick={() => {
                alert('Agendamento direcionado para fechamento de comanda no financeiro.');
                onClose();
              }}
              className="px-4 py-2 rounded-xl btn-primary-tenant text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Cobrar / Comanda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
