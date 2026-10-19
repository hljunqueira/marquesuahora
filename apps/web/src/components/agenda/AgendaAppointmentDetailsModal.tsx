'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { formatLocalDateToYMD } from '@/lib/dateUtils';
import { ScheduleAppointment, ProfessionalItem } from './types';

interface AgendaAppointmentDetailsModalProps {
  appointment: ScheduleAppointment;
  professionals: ProfessionalItem[];
  onClose: () => void;
  onSuccess: () => void;
  onOpenCheckout?: (appointment: ScheduleAppointment) => void;
}

export function AgendaAppointmentDetailsModal({
  appointment,
  professionals,
  onClose,
  onSuccess,
  onOpenCheckout
}: AgendaAppointmentDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de confirmação do sinal
  const [depositPaid, setDepositPaid] = useState<boolean>(Boolean(appointment.depositPaid));
  const [confirmingDeposit, setConfirmingDeposit] = useState<boolean>(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const depositAmountNum = Number(appointment.depositAmount || 0);

  // Estados de edição inline
  const [editDate, setEditDate] = useState(
    formatLocalDateToYMD(appointment.date)
  );
  const [editStartTime, setEditStartTime] = useState(appointment.startTime || '09:00');
  const [editProfessionalId, setEditProfessionalId] = useState(
    appointment.professionalId || (professionals[0]?.id || '')
  );
  const [editNotes, setEditNotes] = useState(appointment.notes || '');
  const [editTotalPrice, setEditTotalPrice] = useState<string>(
    String(Number(appointment.totalPrice || appointment.service?.price || 0).toFixed(2))
  );

  // Horários disponíveis para a data e profissional selecionados
  const [availableSlots, setAvailableSlots] = useState<{ morning: any[]; afternoon: any[]; night: any[] }>({
    morning: [],
    afternoon: [],
    night: []
  });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Busca horários livres sempre que editDate ou editProfessionalId mudar
  useEffect(() => {
    if (!isEditing || !editDate) return;

    let isMounted = true;
    setLoadingSlots(true);
    setSlotsError(null);

    const serviceId =
      appointment.serviceId ||
      appointment.service?.id ||
      appointment.items?.[0]?.service?.id;
    api.get('/schedules/availability', {
      params: {
        date: editDate,
        serviceIds: serviceId || undefined,
        professionalId: editProfessionalId || undefined
      }
    })
      .then((res) => {
        if (!isMounted) return;
        const slots = res.data?.slots || { morning: [], afternoon: [], night: [] };
        setAvailableSlots(slots);
        if (!res.data?.isOpen) {
          setSlotsError(res.data?.reason || 'Estabelecimento ou profissional fechado nesta data.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSlotsError('Não foi possível carregar os horários livres.');
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isEditing, editDate, editProfessionalId, appointment.serviceId]);

  // Estados do Registro Fotográfico (Entrada e Saída)
  const [arrivalPhotoUrl, setArrivalPhotoUrl] = useState<string | null>(appointment.arrivalPhotoUrl || null);
  const [resultPhotoUrl, setResultPhotoUrl] = useState<string | null>(appointment.resultPhotoUrl || null);
  const [uploadingArrival, setUploadingArrival] = useState(false);
  const [uploadingResult, setUploadingResult] = useState(false);
  const [photoPreviewModal, setPhotoPreviewModal] = useState<{ url: string; title: string } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState<'arrival' | 'result' | null>(null);

  // Upload direto de foto com suporte à câmera mobile
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'arrival' | 'result') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'arrival') setUploadingArrival(true);
    else setUploadingResult(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res.data?.url;
      if (!uploadedUrl) throw new Error('Não foi possível obter o endereço da foto.');

      // Persiste imediatamente no agendamento
      await api.patch(`/schedules/${appointment.id}`, {
        [type === 'arrival' ? 'arrivalPhotoUrl' : 'resultPhotoUrl']: uploadedUrl
      });

      if (type === 'arrival') {
        setArrivalPhotoUrl(uploadedUrl);
      } else {
        setResultPhotoUrl(uploadedUrl);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao enviar foto.');
    } finally {
      if (type === 'arrival') setUploadingArrival(false);
      else setUploadingResult(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (type: 'arrival' | 'result') => {
    setPhotoToRemove(type);
  };

  const executeRemovePhoto = async () => {
    if (!photoToRemove) return;
    const type = photoToRemove;
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/schedules/${appointment.id}`, {
        [type === 'arrival' ? 'arrivalPhotoUrl' : 'resultPhotoUrl']: null
      });
      if (type === 'arrival') setArrivalPhotoUrl(null);
      else setResultPhotoUrl(null);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao remover foto.');
    } finally {
      setLoading(false);
      setPhotoToRemove(null);
    }
  };

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

  // Confirmação de sinal em 1 clique
  const handleConfirmDeposit = async () => {
    setConfirmingDeposit(true);
    setError(null);
    setDepositSuccessMsg(null);
    try {
      await api.post(`/schedules/${appointment.id}/confirm-deposit`);
      setDepositPaid(true);
      setSelectedStatus('CONFIRMED');
      setDepositSuccessMsg(`Sinal de R$ ${depositAmountNum.toFixed(2)} confirmado com sucesso! Lançamento registrado no Financeiro.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
        window.dispatchEvent(new CustomEvent('marquesuahora_financial_sync'));
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao confirmar sinal.');
    } finally {
      setConfirmingDeposit(false);
    }
  };

  // Envio de mensagem de cobrança do sinal no WhatsApp
  const handleOpenDepositWhatsApp = () => {
    const rawPhone = appointment.client?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithDdd =
      cleanPhone.length === 11 || cleanPhone.length === 10
        ? `55${cleanPhone}`
        : cleanPhone;

    const formattedDate = formatDateBR(appointment.date);
    const serviceName = appointment.service?.name || 'seu atendimento';

    const msg = encodeURIComponent(
      `Olá, ${appointment.client?.name}! Tudo bem?\n\nPassando para lembrar que para confirmar seu horário para *${serviceName}* no dia *${formattedDate}* às *${appointment.startTime}*, é necessário o envio do comprovante do sinal de reserva no valor de *R$ ${depositAmountNum.toFixed(2)}* (PIX).\n\nAssim que você enviar o comprovante por aqui, seu horário fica 100% confirmado na nossa agenda! ✨`
    );
    window.open(`https://wa.me/${phoneWithDdd}?text=${msg}`, '_blank');
  };

  // Salvar edição de data/horário/profissional
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const parsedPrice = parseFloat(editTotalPrice);
      await api.patch(`/schedules/${appointment.id}`, {
        dateStr: editDate,
        startTime: editStartTime,
        professionalId: editProfessionalId || undefined,
        notes: editNotes.trim() || null,
        totalPrice: !isNaN(parsedPrice) ? parsedPrice : undefined
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
  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/schedules/${appointment.id}`);
      setIsDeleteConfirmOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const [statusColors, setStatusColors] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('marquesuahora_agenda_status_colors');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    const handleStatusSync = (e: any) => {
      if (e?.detail) setStatusColors(e.detail);
    };
    window.addEventListener('marquesuahora_status_colors_sync', handleStatusSync);
    return () => window.removeEventListener('marquesuahora_status_colors_sync', handleStatusSync);
  }, []);

  const statusBadges = {
    CONFIRMED: { label: 'Confirmado', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    IN_SERVICE: { label: 'Em Atendimento', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    COMPLETED: { label: 'Concluído', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    NO_SHOW: { label: 'Não Compareceu', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    CANCELLED: { label: 'Cancelado', bg: 'bg-red-50 text-red-700 border-red-200' },
    PENDING: {
      label: depositAmountNum > 0 && !depositPaid ? 'Aguardando Sinal' : 'Pendente',
      bg: depositAmountNum > 0 && !depositPaid ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' : 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }[selectedStatus] || { label: selectedStatus, bg: 'bg-slate-100 text-slate-700 border-slate-200' };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col h-[94dvh] sm:h-auto sm:max-h-[92vh]"
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

          {depositSuccessMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{depositSuccessMsg}</span>
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
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
                  statusColors?.[selectedStatus] ? '' : statusBadges.bg
                }`}
                style={statusColors?.[selectedStatus] ? {
                  backgroundColor: `${statusColors[selectedStatus]}15`,
                  color: statusColors[selectedStatus],
                  borderColor: `${statusColors[selectedStatus]}40`
                } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: statusColors?.[selectedStatus] || '#64748b' }}
                />
                <span>{statusBadges.label}</span>
              </span>
            </div>
          </div>

          {/* Alerta de Anamnese Técnica da Cliente */}
          {Boolean((appointment.client as any)?.anamnesis) ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900">
                  Ficha de Anamnese Técnica da Cliente
                </span>
                <span className="font-mono text-[10px] text-amber-700 font-semibold">
                  Preenchida
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                {(appointment.client as any).anamnesis.allergies && (
                  <span>
                    <strong>Alergias:</strong> {(appointment.client as any).anamnesis.allergies}
                  </span>
                )}
                {(appointment.client as any).anamnesis.hasAllergies && !(appointment.client as any).anamnesis.allergies && (
                  <span>
                    <strong>Alergias:</strong> Histórico assinalado pela cliente
                  </span>
                )}
                {(appointment.client as any).anamnesis.isDiabetic && (
                  <span className="text-red-700 font-bold">
                    Atenção: Cliente Diabética (cuidado redobrado com cutilagem)
                  </span>
                )}
                {(appointment.client as any).anamnesis.preferredShape && (
                  <span>
                    <strong>Formato Predileto:</strong> {(appointment.client as any).anamnesis.preferredShape}
                  </span>
                )}
              </div>
            </div>
          ) : (
            (appointment.client as any)?.anamnesisToken && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    Ficha de Anamnese Pendente
                  </span>
                  <span className="text-[11px] text-slate-500">
                    A cliente ainda não preencheu suas preferências e dados de saúde.
                  </span>
                </div>
                <a
                  href={`https://wa.me/55${(appointment.client?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá, ${(appointment.client?.name || '').split(' ')[0]}! Por gentileza, preencha sua ficha rápida de atendimento antes do seu horário no salão: ${typeof window !== 'undefined' ? window.location.origin : ''}/anamnese/${(appointment.client as any).anamnesisToken}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition-colors inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar no WhatsApp
                </a>
              </div>
            )
          )}

          {/* Card de Gestão de Sinal de Reserva (Quando o serviço ou regra exige sinal) */}
          {depositAmountNum > 0 && (
            <div>
              {!depositPaid ? (
                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          Aguardando Sinal de Reserva
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-mono text-xs font-extrabold">
                          R$ {depositAmountNum.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 mt-1">
                        Solicite o comprovante PIX à cliente ou confirme o recebimento assim que for creditado.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    {appointment.client?.phone && (
                      <button
                        type="button"
                        onClick={handleOpenDepositWhatsApp}
                        className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        Cobrar no WhatsApp
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleConfirmDeposit}
                      disabled={confirmingDeposit}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {confirmingDeposit ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Confirmar Sinal (PIX)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          Sinal de Reserva Confirmado
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900 font-mono text-xs font-extrabold">
                          R$ {depositAmountNum.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Lançamento automático gerado no Financeiro. Restante no dia:{' '}
                        <strong className="font-mono">
                          R$ {Math.max(0, Number(appointment.totalPrice || appointment.service?.price || 0) - depositAmountNum).toFixed(2)}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-auto">
                    ✓ Pago via PIX
                  </span>
                </div>
              )}
            </div>
          )}

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
                <div className="mt-3 pt-2 border-t border-slate-200/60 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Valor Cobrado:</span>
                    <span className="text-sm font-extrabold text-tenant-primary font-mono">
                      R$ {Number(appointment.totalPrice || appointment.service?.price || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {depositAmountNum > 0 && (
                    <div className="flex items-baseline justify-between text-[11px] text-slate-600 font-mono">
                      <span>{depositPaid ? 'Sinal abatido:' : 'Sinal pendente:'}</span>
                      <span className={depositPaid ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                        - R$ {depositAmountNum.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}
                  {depositAmountNum > 0 && (
                    <div className="flex items-baseline justify-between text-[11px] font-bold text-slate-900 pt-1 border-t border-dashed border-slate-200 font-mono">
                      <span>Saldo a pagar:</span>
                      <span>
                        R$ {Math.max(0, Number(appointment.totalPrice || appointment.service?.price || 0) - (depositPaid ? depositAmountNum : 0)).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}
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
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Canal
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-200/80 text-slate-800">
                      {appointment.source === 'WHATSAPP'
                        ? 'WhatsApp'
                        : appointment.source === 'MANUAL_RECEPTION' || appointment.source === 'MANUAL'
                        ? 'Balcão / Recepção'
                        : 'Site / Vitrine'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-1 mb-0.5">
                    Observações
                  </span>
                  <p className="text-xs text-slate-600 italic line-clamp-2">
                    {appointment.notes || 'Sem observações cadastradas.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 block truncate font-mono">
                    ID: {appointment.id.slice(0, 8)}
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

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Valor Cobrado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editTotalPrice}
                    onChange={(e) => setEditTotalPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono bg-white outline-hidden focus:border-purple-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Altere livremente o valor da manutenção (ex: reposição de unha quebrada).
                  </p>
                </div>
              </div>

              {/* Chips de Horários Disponíveis no Dia Escolhido */}
              <div className="pt-2 pb-1 border-t border-purple-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Horários Livres no Dia:</span>
                    {loadingSlots && (
                      <span className="text-[10px] text-slate-400 font-normal italic">
                        Buscando disponibilidade...
                      </span>
                    )}
                  </span>
                  {editStartTime && (
                    <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      Selecionado: {editStartTime}
                    </span>
                  )}
                </div>

                {slotsError ? (
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-medium text-amber-800">
                    {slotsError}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {['morning', 'afternoon', 'night'].map((period) => {
                      const periodSlots = availableSlots[period as keyof typeof availableSlots] || [];
                      if (periodSlots.length === 0) return null;
                      const periodTitle = period === 'morning' ? 'Manhã' : period === 'afternoon' ? 'Tarde' : 'Noite';

                      return (
                        <div key={period} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">
                            {periodTitle}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {periodSlots.map((slot: any) => {
                              const isSelected = editStartTime === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  onClick={() => setEditStartTime(slot.time)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-400 hover:bg-purple-50'
                                  }`}
                                >
                                  {slot.time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {!loadingSlots &&
                      availableSlots.morning.length === 0 &&
                      availableSlots.afternoon.length === 0 &&
                      availableSlots.night.length === 0 &&
                      !slotsError && (
                        <p className="text-[11px] text-slate-500 italic">
                          Nenhum horário livre encontrado para esta data ou profissional.
                        </p>
                      )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Notas / Observações
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
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

          {/* Seção Registro Fotográfico do Atendimento (Como Chegou vs. Como Ficou) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Prova Visual do Atendimento
                </span>
                <p className="text-[11px] text-slate-400">
                  Anexe até 2 fotos para resguardo técnico e histórico de manutenção.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Foto 1: Entrada (Como Chegou) */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">1. Entrada (Como Chegou)</span>
                  {arrivalPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto('arrival')}
                      className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {arrivalPhotoUrl ? (
                  <div
                    onClick={() => setPhotoPreviewModal({ url: resolveImageUrl(arrivalPhotoUrl), title: 'Foto de Entrada — Como a cliente chegou' })}
                    className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group cursor-pointer"
                  >
                    <img
                      src={resolveImageUrl(arrivalPhotoUrl)}
                      alt="Como chegou"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2 py-1 rounded bg-black/60 text-white text-[10px] font-semibold">
                        Ampliar
                      </span>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-lg p-4 text-center flex flex-col items-center justify-center gap-1 hover:border-slate-400 transition-colors cursor-pointer bg-slate-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, 'arrival')}
                      disabled={uploadingArrival}
                      className="hidden"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {uploadingArrival ? 'Enviando...' : 'Fotografar / Anexar'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Unhas quebradas ou estado inicial
                    </span>
                  </label>
                )}
              </div>

              {/* Foto 2: Saída (Como Ficou) */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">2. Saída (Como Ficou)</span>
                  {resultPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto('result')}
                      className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {resultPhotoUrl ? (
                  <div
                    onClick={() => setPhotoPreviewModal({ url: resolveImageUrl(resultPhotoUrl), title: 'Foto de Saída — Resultado final' })}
                    className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group cursor-pointer"
                  >
                    <img
                      src={resolveImageUrl(resultPhotoUrl)}
                      alt="Como ficou"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2 py-1 rounded bg-black/60 text-white text-[10px] font-semibold">
                        Ampliar
                      </span>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-lg p-4 text-center flex flex-col items-center justify-center gap-1 hover:border-slate-400 transition-colors cursor-pointer bg-slate-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, 'result')}
                      disabled={uploadingResult}
                      className="hidden"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {uploadingResult ? 'Enviando...' : 'Fotografar / Anexar'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Resultado final entregue
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>

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
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Concluir
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenCheckout) {
                  onOpenCheckout(appointment);
                }
                onClose();
              }}
              className="px-4 py-2 rounded-xl btn-primary-tenant text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Cobrar / Comanda
            </button>
          </div>
        </div>
      </div>

      {/* Visualizador de Foto Ampliada (Prova Visual) */}
      {photoPreviewModal && (
        <div
          onClick={() => setPhotoPreviewModal(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-bold font-mono text-slate-200">
                {photoPreviewModal.title}
              </span>
              <button
                type="button"
                onClick={() => setPhotoPreviewModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto bg-black/95">
              <img
                src={resolveImageUrl(photoPreviewModal.url)}
                alt={photoPreviewModal.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão de Agendamento */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Excluir este Agendamento?"
        description="Deseja realmente excluir este agendamento? O horário será liberado imediatamente na agenda."
        confirmLabel="Sim, Excluir"
        isDestructive={true}
        isLoading={loading}
        onConfirm={executeDelete}
        onClose={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Confirmação de Remoção de Foto */}
      <ConfirmModal
        isOpen={Boolean(photoToRemove)}
        title="Remover Foto do Agendamento?"
        description={`Deseja remover a foto de ${photoToRemove === 'arrival' ? 'Entrada (Como Chegou)' : 'Resultado (Como Ficou)'}? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, Remover"
        isDestructive={true}
        isLoading={loading}
        onConfirm={executeRemovePhoto}
        onClose={() => setPhotoToRemove(null)}
      />
    </div>,
    document.body
  );
}
