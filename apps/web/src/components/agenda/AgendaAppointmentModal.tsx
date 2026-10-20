'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Loader2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { api } from '@/lib/api';
import { formatLocalDateToYMD } from '@/lib/dateUtils';
import { InputMask } from '@/components/ui/InputMask';
import { ScheduleAppointment, ProfessionalItem, ServiceOption } from './types';

interface AgendaAppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  initialProfessionalId?: string;
  existingAppointment?: ScheduleAppointment | null;
  existingAppointments?: ScheduleAppointment[];
  professionals: ProfessionalItem[];
  services: ServiceOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AgendaAppointmentModal({
  initialDate,
  initialTime,
  initialProfessionalId,
  existingAppointment,
  existingAppointments = [],
  professionals,
  services,
  onClose,
  onSuccess
}: AgendaAppointmentModalProps) {
  const isEditing = !!existingAppointment;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Estados de criação
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    existingAppointment?.serviceId || (services[0]?.id || '')
  );
  const [extraServiceIds, setExtraServiceIds] = useState<string[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(
    existingAppointment?.professionalId ||
      initialProfessionalId ||
      (professionals[0]?.id || '')
  );
  const [dateStr, setDateStr] = useState<string>(
    existingAppointment?.date
      ? formatLocalDateToYMD(existingAppointment.date)
      : initialDate || formatLocalDateToYMD(new Date())
  );
  const [startTime, setStartTime] = useState<string>(
    existingAppointment?.startTime || initialTime || '09:00'
  );
  const [clientName, setClientName] = useState<string>(
    existingAppointment?.client?.name || ''
  );
  const [clientPhone, setClientPhone] = useState<string>(
    existingAppointment?.client?.phone || ''
  );
  const [notes, setNotes] = useState<string>(existingAppointment?.notes || '');
  const [customPrice, setCustomPrice] = useState<string>(
    existingAppointment?.totalPrice ? String(existingAppointment.totalPrice) : ''
  );
  const [isCustomPriceEdited, setIsCustomPriceEdited] = useState(false);

  // Autocomplete de clientes do CRM
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingClients, setSearchingClients] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Horários disponíveis para a data e profissional selecionados
  const [availableSlots, setAvailableSlots] = useState<{ morning: any[]; afternoon: any[]; night: any[] }>({
    morning: [],
    afternoon: [],
    night: []
  });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateStr) return;

    let isMounted = true;
    setLoadingSlots(true);
    setSlotsError(null);

    const sIds = [selectedServiceId, ...extraServiceIds].filter(Boolean);

    const storedTenant = typeof window !== 'undefined'
      ? (JSON.parse(localStorage.getItem('tenant_data') || '{}')?.id || JSON.parse(localStorage.getItem('user_data') || '{}')?.tenantId)
      : undefined;

    api.get('/schedules/availability', {
      params: {
        date: dateStr,
        serviceIds: sIds.length > 0 ? sIds.join(',') : undefined,
        professionalId: selectedProfessionalId || undefined,
        tenantId: storedTenant || undefined,
        excludeScheduleId: existingAppointment?.id || undefined
      }
    })
      .then((res) => {
        if (!isMounted) return;
        const slots = res.data?.slots || { morning: [], afternoon: [], night: [] };
        setAvailableSlots(slots);
        if (!res.data?.isOpen) {
          setSlotsError(res.data?.reason || 'Estabelecimento fechado neste dia.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setSlotsError(err?.response?.data?.message || 'Estabelecimento fechado neste dia.');
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateStr, selectedProfessionalId, selectedServiceId, extraServiceIds]);

  // Garante seleção padrão quando a lista carregar
  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  useEffect(() => {
    if (!selectedProfessionalId && professionals.length > 0) {
      setSelectedProfessionalId(initialProfessionalId || professionals[0].id);
    }
  }, [professionals, selectedProfessionalId, initialProfessionalId]);

  useEffect(() => {
    if (initialDate) setDateStr(initialDate);
    if (initialTime) setStartTime(initialTime);
    if (initialProfessionalId) setSelectedProfessionalId(initialProfessionalId);
  }, [initialDate, initialTime, initialProfessionalId]);

  // Busca rápida de clientes existentes ao digitar nome
  useEffect(() => {
    if (isEditing || !clientName || clientName.length < 2) {
      setClientSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(() => {
      setSearchingClients(true);
      api
        .get(`/clients?search=${encodeURIComponent(clientName.trim())}&limit=5`)
        .then((res) => {
          const list = res.data?.data || res.data || [];
          setClientSuggestions(list);
          setShowSuggestions(list.length > 0);
        })
        .catch(() => {
          setClientSuggestions([]);
        })
        .finally(() => {
          setSearchingClients(false);
        });
    }, 300);

    return () => clearTimeout(handler);
  }, [clientName, isEditing]);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    existingAppointment?.client?.id || null
  );
  const [savingClientToCrm, setSavingClientToCrm] = useState(false);

  const handleSelectClient = (c: any) => {
    setClientName(c.name);
    setClientPhone(c.phone);
    setSelectedClientId(c.id);
    setShowSuggestions(false);
  };

  const handleQuickAddClient = async () => {
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (!clientName.trim() || cleanPhone.length < 10) {
      setError('Informe nome e telefone completo com DDD para cadastrar a cliente.');
      return;
    }
    setSavingClientToCrm(true);
    setError(null);
    try {
      const res = await api.post('/clients', {
        name: clientName.trim(),
        phone: cleanPhone
      });
      const newClient = res.data?.data || res.data;
      if (newClient?.id) {
        setSelectedClientId(newClient.id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao cadastrar cliente no CRM.');
    } finally {
      setSavingClientToCrm(false);
    }
  };

  // Cálculo de Preço e Duração Totais (Combo de serviços)
  const allSelectedServiceIds = useMemo(() => {
    const list = [selectedServiceId, ...extraServiceIds].filter(Boolean);
    return Array.from(new Set(list));
  }, [selectedServiceId, extraServiceIds]);

  const summary = useMemo(() => {
    const active = services.filter((s) => allSelectedServiceIds.includes(s.id));
    const totalPrice = active.reduce((acc, s) => acc + Number(s.price), 0);
    const totalDuration = active.reduce((acc, s) => acc + (s.durationMinutes || 30), 0);

    // Calcula horário previsto de término
    let calculatedEndTime = '';
    if (startTime) {
      const [hh, mm] = startTime.split(':').map(Number);
      const startMinutes = (hh || 0) * 60 + (mm || 0);
      const endMinutes = startMinutes + totalDuration;
      const endH = Math.floor(endMinutes / 60) % 24;
      const endM = endMinutes % 60;
      calculatedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    return { totalPrice, totalDuration, calculatedEndTime };
  }, [services, allSelectedServiceIds, startTime]);

  // Detecção em tempo real de colisão com horários já ocupados
  const conflictSchedule = useMemo(() => {
    if (!existingAppointments || existingAppointments.length === 0 || !startTime || !dateStr) {
      return null;
    }

    const selectedProf = selectedProfessionalId;
    const targetDuration = summary.totalDuration || 30;

    // Converte startTime para minutos do dia
    const [sh, sm] = startTime.split(':').map(Number);
    const newStartMin = (sh || 0) * 60 + (sm || 0);
    const newEndMin = newStartMin + targetDuration;

    for (const appt of existingAppointments) {
      if (isEditing && appt.id === existingAppointment?.id) continue;
      if (appt.status === 'CANCELLED') continue;

      // Mesma data YYYY-MM-DD
      const apptDateStr =
        typeof appt.date === 'string'
          ? appt.date.slice(0, 10)
          : formatLocalDateToYMD(appt.date);
      if (apptDateStr !== dateStr) continue;

      // Mesmo profissional
      if (selectedProf && appt.professionalId && appt.professionalId !== selectedProf) continue;

      // Converte horários de início e fim existentes
      const [ash, asm] = (appt.startTime || '00:00').split(':').map(Number);
      const [aeh, aem] = (appt.endTime || '00:00').split(':').map(Number);
      const apptStartMin = (ash || 0) * 60 + (asm || 0);
      const apptEndMin = (aeh || 0) * 60 + (aem || 0);

      // Sobreposição: newStart < apptEnd && newEnd > apptStart
      if (newStartMin < apptEndMin && newEndMin > apptStartMin) {
        return appt;
      }
    }
    return null;
  }, [
    existingAppointments,
    startTime,
    dateStr,
    selectedProfessionalId,
    summary.totalDuration,
    isEditing,
    existingAppointment
  ]);

  // Submissão de novo agendamento manual ou edição
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      setError('Nome e telefone do cliente são obrigatórios.');
      return;
    }

    if (!selectedServiceId) {
      setError('Selecione um serviço.');
      return;
    }

    if (conflictSchedule) {
      setError(
        `Horário Indisponível: O período selecionado (${startTime} às ${summary.calculatedEndTime}) colide com o agendamento de ${conflictSchedule.client?.name || 'outra cliente'} (${conflictSchedule.startTime} às ${conflictSchedule.endTime}). Por favor, escolha outro horário livre.`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalPriceToSend: number | undefined = undefined;
      if (customPrice !== '') {
        const cleanPrice = String(customPrice).replace(/[^\d.,]/g, '').replace(',', '.');
        const num = parseFloat(cleanPrice);
        if (!isNaN(num)) {
          finalPriceToSend = num;
        }
      } else if (summary.totalPrice > 0) {
        finalPriceToSend = summary.totalPrice;
      }

      if (isEditing) {
        await api.patch(`/schedules/${existingAppointment.id}`, {
          dateStr,
          startTime,
          professionalId: selectedProfessionalId || undefined,
          notes: notes.trim() || null,
          totalPrice: finalPriceToSend
        });
      } else {
        await api.post('/schedules', {
          serviceIds: allSelectedServiceIds,
          professionalId: selectedProfessionalId || undefined,
          dateStr,
          startTime,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          notes: notes.trim() || undefined,
          customTotalPrice: finalPriceToSend
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      setError(
        apiMsg ||
          'Não foi possível salvar o agendamento. Verifique se o horário está disponível.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Alteração de status
  const handleUpdateStatus = async (newStatus: string) => {
    if (!existingAppointment) return;
    setLoading(true);
    try {
      await api.post(`/schedules/${existingAppointment.id}/status`, {
        status: newStatus
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao alterar status.');
    } finally {
      setLoading(false);
    }
  };

  // Abertura de WhatsApp com mensagem limpa e pronta
  const handleOpenWhatsApp = () => {
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const phoneWithDdd =
      cleanPhone.length === 11 || cleanPhone.length === 10
        ? `55${cleanPhone}`
        : cleanPhone;
    const [y, m, d] = dateStr.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const mainService =
      services.find((s) => s.id === selectedServiceId)?.name || 'seu atendimento';

    const msg = encodeURIComponent(
      `Olá, ${clientName}! Passando para confirmar seu horário para ${mainService} no dia ${formattedDate} às ${startTime}. Estamos te esperando!`
    );
    window.open(`https://wa.me/${phoneWithDdd}?text=${msg}`, '_blank');
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShowSuggestions(false);
        }}
        className="relative max-w-lg w-full bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col h-[94dvh] sm:h-auto sm:max-h-[92vh]"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? 'Detalhes do Agendamento' : 'Novo Agendamento'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing
                ? 'Atualize horários ou marque o status do atendimento'
                : 'Cadastro manual de balcão ou WhatsApp'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {clientPhone && (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                title="Conversar no WhatsApp"
              >
                WhatsApp
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Dados do Cliente com Autocomplete */}
          <div className="space-y-3">
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome do Cliente *
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isEditing}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-50"
                />
                {searchingClients && (
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Sugestões do CRM */}
              {showSuggestions && clientSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 py-1.5 overflow-hidden">
                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Clientes Cadastrados
                  </p>
                  {clientSuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {c.phone}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Telefone / WhatsApp *
              </label>
              <InputMask
                mask="phone"
                disabled={isEditing}
                value={clientPhone}
                onChangeValue={(formatted) => {
                  setClientPhone(formatted);
                  setSelectedClientId(null);
                }}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-50"
              />
            </div>

            {/* Status do Cliente: Cadastrado no CRM vs Nova Cliente com Atalho Rápido */}
            {!isEditing && clientName.trim().length >= 2 && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                {selectedClientId ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11.5px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Cliente cadastrada no CRM</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11.5px]">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Nova cliente (salva automaticamente ao agendar)</span>
                  </div>
                )}

                {!selectedClientId && clientPhone.replace(/\D/g, '').length >= 10 && (
                  <button
                    type="button"
                    onClick={handleQuickAddClient}
                    disabled={savingClientToCrm}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-purple-600 text-purple-700 font-bold text-[11px] shadow-2xs hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
                  >
                    {savingClientToCrm ? 'Salvando...' : '+ Cadastrar no CRM'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Seleção de Serviços e Profissional */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Serviço Principal *
                </label>
                <select
                  disabled={isEditing}
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600 disabled:bg-slate-50 cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (R$ {Number(s.price).toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Profissional
                </label>
                <select
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600 cursor-pointer"
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Suporte a Combo de Múltiplos Serviços */}
            {!isEditing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Serviços Adicionais (Combo)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const available = services.find(
                        (s) => !allSelectedServiceIds.includes(s.id)
                      );
                      if (available) {
                        setExtraServiceIds((prev) => [...prev, available.id]);
                      }
                    }}
                    className="text-[11px] font-bold text-tenant-primary hover:opacity-80 cursor-pointer"
                  >
                    + Adicionar Serviço ao Combo
                  </button>
                </div>

                {extraServiceIds.map((extraId, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={extraId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExtraServiceIds((prev) => {
                          const copy = [...prev];
                          copy[idx] = val;
                          return copy;
                        });
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (R$ {Number(s.price).toFixed(0)})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setExtraServiceIds((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Remover serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Resumo Dinâmico do Atendimento */}
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between text-xs font-bold text-purple-950">
                  <div>
                    Duração: {summary.totalDuration} min
                    {summary.calculatedEndTime && (
                      <span className="text-purple-700 font-normal ml-1">
                        (término às {summary.calculatedEndTime})
                      </span>
                    )}
                  </div>
                  <div className="font-mono">
                    Total: R$ {summary.totalPrice.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Valor do Atendimento / Manutenção Flexível */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Valor Cobrado (R$)
              </label>
              {isCustomPriceEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomPrice(summary.totalPrice.toFixed(2));
                    setIsCustomPriceEdited(false);
                  }}
                  className="text-[11px] font-semibold text-tenant-primary hover:underline cursor-pointer"
                >
                  Restaurar tabela (R$ {summary.totalPrice.toFixed(2).replace('.', ',')})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={
                  customPrice !== ''
                    ? customPrice
                    : summary.totalPrice > 0
                    ? summary.totalPrice.toFixed(2)
                    : ''
                }
                onChange={(e) => {
                  setCustomPrice(e.target.value);
                  setIsCustomPriceEdited(true);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono outline-hidden focus:border-purple-600 bg-white"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Valor flexível para a manutenção (ex: reposição de unhas quebradas ou valor especial).
            </p>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold outline-hidden focus:border-purple-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Horário
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold outline-hidden focus:border-purple-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Chips de Horários Disponíveis no Dia Selecionado */}
          <div className="pt-2 pb-1 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Horários Livres no Dia:</span>
                {loadingSlots && (
                  <span className="text-[10px] text-slate-400 font-normal italic">
                    Buscando disponibilidade...
                  </span>
                )}
              </span>
              {startTime && (
                <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  Selecionado: {startTime}
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
                          const isSelected = startTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setStartTime(slot.time)}
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

          {/* Alerta Educativo de Conflito de Horário */}
          {conflictSchedule && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex flex-col gap-1 shadow-2xs">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                Horário Ocupado neste Período
              </span>
              <span className="text-slate-700">
                O intervalo das <strong>{startTime}</strong> às <strong>{summary.calculatedEndTime}</strong> colide com o atendimento de{' '}
                <strong className="text-amber-950">{conflictSchedule.client?.name || 'outra cliente'}</strong>{' '}
                ({conflictSchedule.startTime} às {conflictSchedule.endTime}).
              </span>
              <span className="text-[11px] text-amber-700">
                Selecione outro horário livre ou adeque os minutos de atendimento para confirmar.
              </span>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600 resize-none"
            />
          </div>

          {/* Ações de Status (se for edição) */}
          {isEditing && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Alterar Status do Atendimento
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('IN_SERVICE')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-tenant-light text-tenant-primary border border-tenant-primary/20 transition-colors cursor-pointer"
                >
                  Em Atendimento
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                >
                  Concluído
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('NO_SHOW')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                >
                  Não Compareceu
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Rodapé com Safe Area no mobile */}
          <div className="pt-4 pb-[max(1rem,env(safe-area-inset-bottom,16px))] border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{isEditing ? 'Atualizar Agendamento' : 'Criar Agendamento'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmação de Cancelamento de Agendamento */}
      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        title="Cancelar este Agendamento?"
        description="Tem certeza que deseja cancelar este agendamento? O status será alterado para cancelado e o cliente será notificado."
        confirmLabel="Sim, Cancelar"
        isDestructive={true}
        isLoading={loading}
        onConfirm={() => {
          setIsCancelConfirmOpen(false);
          handleUpdateStatus('CANCELLED');
        }}
        onClose={() => setIsCancelConfirmOpen(false)}
      />
    </div>,
    document.body
  );
}
