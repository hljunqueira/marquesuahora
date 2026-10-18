'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  Phone,
  User,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  PlayCircle,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Scissors,
  Check,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { AgendaAppointmentModal } from '@/components/agenda/AgendaAppointmentModal';
import { ScheduleAppointment, ProfessionalItem, ServiceOption } from '@/components/agenda/types';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PENDING: {
    label: 'Pendente',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock3
  },
  CONFIRMED: {
    label: 'Confirmado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2
  },
  IN_SERVICE: {
    label: 'Em Atendimento',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: PlayCircle
  },
  COMPLETED: {
    label: 'Concluído',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Check
  },
  NO_SHOW: {
    label: 'Não Compareceu',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertTriangle
  },
  CANCELLED: {
    label: 'Cancelado',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: XCircle
  }
};

export default function AgendamentosPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'tomorrow' | 'week' | 'month' | 'all'>('week');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('ALL');

  // Metadados
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);

  // Status Action Menu
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // 1. Carrega opções de serviços e profissionais
  useEffect(() => {
    Promise.all([
      api.get('/professionals').catch(() => ({ data: [] })),
      api.get('/services').catch(() => ({ data: [] }))
    ]).then(([profRes, servRes]) => {
      setProfessionals(profRes.data || []);
      setServices(servRes.data || []);
    });
  }, []);

  // 2. Calcula intervalo de datas baseado no filtro de período
  const dateRange = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (periodFilter === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }

    if (periodFilter === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      return { startDate: tomorrowStr, endDate: tomorrowStr };
    }

    if (periodFilter === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: monday.toISOString().slice(0, 10),
        endDate: sunday.toISOString().slice(0, 10)
      };
    }

    if (periodFilter === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: startOfMonth.toISOString().slice(0, 10),
        endDate: endOfMonth.toISOString().slice(0, 10)
      };
    }

    return { startDate: undefined, endDate: undefined };
  }, [periodFilter]);

  // 3. Busca lista paginada de agendamentos (com suporte a refetch silencioso de fundo)
  const fetchSchedules = (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));

    if (dateRange.startDate) params.set('startDate', dateRange.startDate);
    if (dateRange.endDate) params.set('endDate', dateRange.endDate);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (selectedProfessionalId !== 'ALL') params.set('professionalId', selectedProfessionalId);
    if (search.trim()) params.set('search', search.trim());

    api
      .get(`/schedules?${params.toString()}`)
      .then((res) => {
        setSchedules(res.data?.data || []);
        setTotalCount(res.data?.total || 0);
      })
      .catch(() => {
        setSchedules([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (!silent) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchSchedules();
  }, [page, statusFilter, periodFilter, selectedProfessionalId, dateRange]);

  // Revalidação Automática Inteligente em Segundo Plano (30s e foco na janela)
  useEffect(() => {
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible') {
        fetchSchedules(true);
      }
    };

    const interval = setInterval(handleRevalidate, 30000);
    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleRevalidate);
    window.addEventListener('marquesuahora_agenda_sync', handleRevalidate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleRevalidate);
      window.removeEventListener('marquesuahora_agenda_sync', handleRevalidate);
    };
  }, [page, statusFilter, periodFilter, selectedProfessionalId, dateRange, search]);

  // Busca após digitação com debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchSchedules();
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Alterar Status Rápido
  const handleQuickStatusChange = async (scheduleId: string, newStatus: string) => {
    setUpdatingStatusId(scheduleId);
    setOpenStatusMenuId(null);
    try {
      await api.post(`/schedules/${scheduleId}/status`, { status: newStatus });
      fetchSchedules();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao alterar status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Abrir WhatsApp da cliente
  const handleOpenWhatsApp = (clientName: string, clientPhone: string, dateStr: string, time: string, serviceName: string) => {
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const phoneWithDdd = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
    const formattedDate = dateStr.slice(8, 10) + '/' + dateStr.slice(5, 7);
    const msg = encodeURIComponent(
      `Olá, ${clientName}! Passando para confirmar seu horário de *${serviceName}* agendado para o dia *${formattedDate} às ${time}*. Nos vemos em breve! ✨`
    );
    window.open(`https://wa.me/${phoneWithDdd}?text=${msg}`, '_blank');
  };

  // Formata data brasileira
  const formatDateDisplay = (dateVal: string) => {
    if (!dateVal) return '';
    const clean = dateVal.slice(0, 10);
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Cabeçalho de Boas-vindas e Ação Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Agendamentos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Histórico completo, controle de presenças e contato imediato com suas clientes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchSchedules()}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          <button
            onClick={() => {
              setSelectedAppointment(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 btn-primary-tenant text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros Inteligentes */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Linha 1: Períodos Rápidos e Busca */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Abas de Período */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'tomorrow', label: 'Amanhã' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mês' },
              { id: 'all', label: 'Todos' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriodFilter(p.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  periodFilter === p.id
                    ? 'bg-white text-tenant-primary shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Campo de Busca */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-hidden focus:bg-white focus:border-purple-600 transition-colors"
            />
          </div>
        </div>

        {/* Linha 2: Filtro por Status e Profissional */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-3 border-t border-slate-100">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Todos os Status' },
              { id: 'CONFIRMED', label: 'Confirmados' },
              { id: 'PENDING', label: 'Pendentes' },
              { id: 'IN_SERVICE', label: 'Em Atendimento' },
              { id: 'COMPLETED', label: 'Concluídos' },
              { id: 'NO_SHOW', label: 'Faltas (No-Show)' },
              { id: 'CANCELLED', label: 'Cancelados' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setStatusFilter(st.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  statusFilter === st.id
                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Dropdown de Profissional */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Profissional:
            </span>
            <select
              value={selectedProfessionalId}
              onChange={(e) => {
                setSelectedProfessionalId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-hidden focus:border-purple-600"
            >
              <option value="ALL">Todos os profissionais</option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Tabela de Agendamentos */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
            <p className="text-xs font-semibold">Carregando agendamentos...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Não há agendamentos para os filtros selecionados. Tente alterar o período ou crie um novo agendamento.
            </p>
            <button
              onClick={() => {
                setSelectedAppointment(null);
                setIsModalOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
            >
              Novo Agendamento Manual
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Data & Horário</th>
                  <th className="py-3.5 px-4">Serviço / Combo</th>
                  <th className="py-3.5 px-4">Profissional</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {schedules.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusInfo.icon;
                  const dateDisplay = formatDateDisplay(item.date);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {item.client?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {item.client?.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {item.client?.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Data & Horário */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <span>{dateDisplay}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {item.startTime} - {item.endTime} ({item.totalDurationMinutes} min)
                          </span>
                        </div>
                      </td>

                      {/* Serviço */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[200px]">
                          {item.service?.name}
                        </p>
                        {item.items && item.items.length > 1 && (
                          <p className="text-[10px] text-purple-600 font-bold mt-0.5">
                            + {item.items.length - 1} serviço(s) no combo
                          </p>
                        )}
                      </td>

                      {/* Profissional */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.professional?.color || '#7C3AED' }}
                          />
                          {item.professional?.name}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono whitespace-nowrap">
                        R$ {Number(item.totalPrice).toFixed(2).replace('.', ',')}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setOpenStatusMenuId(openStatusMenuId === item.id ? null : item.id)
                            }
                            disabled={updatingStatusId === item.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} hover:opacity-80`}
                          >
                            {updatingStatusId === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <StatusIcon className="w-3 h-3" />
                            )}
                            <span>{statusInfo.label}</span>
                          </button>

                          {/* Dropdown de Troca Rápida de Status */}
                          {openStatusMenuId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20 cursor-default"
                                onClick={() => setOpenStatusMenuId(null)}
                              />
                              <div className="absolute left-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Mudar Status
                                </p>
                                {[
                                  { key: 'CONFIRMED', label: 'Confirmado' },
                                  { key: 'IN_SERVICE', label: 'Em Atendimento' },
                                  { key: 'COMPLETED', label: 'Concluído' },
                                  { key: 'NO_SHOW', label: 'Não Compareceu' },
                                  { key: 'CANCELLED', label: 'Cancelar' }
                                ].map((opt) => (
                                  <button
                                    key={opt.key}
                                    onClick={() => handleQuickStatusChange(item.id, opt.key)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão WhatsApp */}
                          {item.client?.phone && (
                            <button
                              onClick={() =>
                                handleOpenWhatsApp(
                                  item.client.name,
                                  item.client.phone,
                                  item.date,
                                  item.startTime,
                                  item.service?.name
                                )
                              }
                              className="p-2 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              title="Enviar lembrete / confirmação via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Detalhes / Edição */}
                          <button
                            onClick={() => {
                              setSelectedAppointment({
                                id: item.id,
                                clientId: item.clientId || item.client?.id || '',
                                serviceId: item.serviceId,
                                professionalId: item.professionalId,
                                date: item.date ? (typeof item.date === 'string' ? item.date.slice(0, 10) : new Date(item.date).toISOString().slice(0, 10)) : '',
                                startTime: item.startTime,
                                endTime: item.endTime,
                                status: item.status,
                                totalPrice: Number(item.totalPrice),
                                totalDurationMinutes: item.totalDurationMinutes,
                                notes: item.notes,
                                client: item.client,
                                service: item.service,
                                professional: item.professional
                              });
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalCount > limit && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span>
              Página {page} de {Math.ceil(totalCount / limit)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold"
              >
                Anterior
              </button>
              <button
                disabled={page >= Math.ceil(totalCount / limit)}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal de Agendamento (Novo / Edição) */}
      {isModalOpen && (
        <AgendaAppointmentModal
          existingAppointment={selectedAppointment}
          professionals={professionals}
          services={services}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAppointment(null);
          }}
          onSuccess={() => {
            fetchSchedules();
            window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
          }}
        />
      )}
    </div>
  );
}
