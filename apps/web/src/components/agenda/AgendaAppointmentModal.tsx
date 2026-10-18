'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { InputMask } from '@/components/ui/InputMask';
import { ScheduleAppointment, ProfessionalItem, ServiceOption } from './types';

interface AgendaAppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  initialProfessionalId?: string;
  existingAppointment?: ScheduleAppointment | null;
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
  professionals,
  services,
  onClose,
  onSuccess
}: AgendaAppointmentModalProps) {
  const isEditing = !!existingAppointment;

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
      ? typeof existingAppointment.date === 'string'
        ? existingAppointment.date.slice(0, 10)
        : new Date(existingAppointment.date).toISOString().slice(0, 10)
      : initialDate || new Date().toISOString().slice(0, 10)
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

  const handleSelectClient = (c: any) => {
    setClientName(c.name);
    setClientPhone(c.phone);
    setShowSuggestions(false);
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

    setLoading(true);
    setError(null);

    try {
      const parsedCustomPrice = customPrice !== '' ? parseFloat(customPrice) : summary.totalPrice;
      const finalPriceToSend = !isNaN(parsedCustomPrice) ? parsedCustomPrice : undefined;

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
      setError(
        err?.response?.data?.message ||
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
      alert(err?.response?.data?.message || 'Erro ao alterar status.');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShowSuggestions(false);
        }}
        className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
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
                onChangeValue={(formatted) => setClientPhone(formatted)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-50"
              />
            </div>
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
                  onClick={() => {
                    if (confirm('Deseja realmente cancelar este agendamento?')) {
                      handleUpdateStatus('CANCELLED');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
    </div>
  );
}
