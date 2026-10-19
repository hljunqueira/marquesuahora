'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  User,
  Loader2,
  CheckCircle2,
  Clock3,
  PlayCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { formatLocalDateToYMD, getWeekDays, isSameDay } from '@/lib/dateUtils';
import { AiVoiceCommandBar } from '@/components/dashboard/AiVoiceCommandBar';
import { AgendaAppointmentModal } from '@/components/agenda/AgendaAppointmentModal';
import { AgendaAppointmentDetailsModal } from '@/components/agenda/AgendaAppointmentDetailsModal';
import { AppointmentCheckoutModal } from '@/components/agenda/AppointmentCheckoutModal';
import {
  ScheduleAppointment,
  ProfessionalItem,
  ServiceOption
} from '@/components/agenda/types';

const STATUS_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: 'Pendente',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  CONFIRMED: {
    label: 'Confirmado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  IN_SERVICE: {
    label: 'Em Atendimento',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  COMPLETED: {
    label: 'Concluído',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  NO_SHOW: {
    label: 'Não Compareceu',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200'
  },
  CANCELLED: {
    label: 'Cancelado',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200'
  }
};

const WEEKDAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function getContrastColor(hexColor: string) {
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#0F172A' : '#FFFFFF';
}

export default function DashboardPage() {
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_primary_color') || '#5c0701';
    }
    return '#5c0701';
  });

  useEffect(() => {
    const syncColor = () => {
      const saved = localStorage.getItem('tenant_primary_color');
      if (saved) setTenantPrimaryColor(saved);
    };
    syncColor();

    api.get('/tenants/me').then((res) => {
      if (res.data?.primaryColor) {
        setTenantPrimaryColor(res.data.primaryColor);
        localStorage.setItem('tenant_primary_color', res.data.primaryColor);
      }
    }).catch(() => {});
    const handleTenantSync = (e: any) => {
      if (e?.detail?.primaryColor) {
        setTenantPrimaryColor(e.detail.primaryColor);
      } else {
        syncColor();
      }
    };
    window.addEventListener('storage', syncColor);
    window.addEventListener('marquesuahora_tenant_sync', handleTenantSync);
    return () => {
      window.removeEventListener('storage', syncColor);
      window.removeEventListener('marquesuahora_tenant_sync', handleTenantSync);
    };
  }, []);

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() =>
    formatLocalDateToYMD(new Date())
  );

  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] =
    useState<ScheduleAppointment | null>(null);
  const [checkoutAppointment, setCheckoutAppointment] =
    useState<ScheduleAppointment | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Estados do Resumo Executivo Mensal (Entradas, Saídas, No-Show e Cancelamento)
  const [monthFinancial, setMonthFinancial] = useState<{
    income: number;
    expense: number;
    net: number;
    loading: boolean;
  }>({ income: 0, expense: 0, net: 0, loading: true });

  const [monthOperational, setMonthOperational] = useState<{
    total: number;
    completed: number;
    noShow: number;
    noShowRate: number;
    cancelled: number;
    cancelledRate: number;
    loading: boolean;
  }>({
    total: 0,
    completed: 0,
    noShow: 0,
    noShowRate: 0,
    cancelled: 0,
    cancelledRate: 0,
    loading: true
  });

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  // Calcula os 7 dias da semana atual usando o utilitário seguro
  const weekDays = useMemo(() => {
    return getWeekDays(currentDate);
  }, [currentDate]);

  // Carrega opções
  useEffect(() => {
    Promise.all([
      api.get('/professionals').catch(() => ({ data: [] })),
      api.get('/services').catch(() => ({ data: [] }))
    ]).then(([profRes, servRes]) => {
      const pList = Array.isArray(profRes.data) ? profRes.data : (profRes.data?.data || []);
      const sList = Array.isArray(servRes.data) ? servRes.data : (servRes.data?.data || []);
      setProfessionals(Array.isArray(pList) ? pList : []);
      setServices(Array.isArray(sList) ? sList : []);
    });
  }, []);

  // Busca agendamentos da semana usando o endpoint otimizado /schedules/calendar
  const fetchWeekAppointments = useCallback(async (silent = false) => {
    if (weekDays.length === 0) return;
    if (!silent) setLoading(true);

    const startDate = formatLocalDateToYMD(weekDays[0]);
    const endDate = formatLocalDateToYMD(weekDays[weekDays.length - 1]);

    try {
      const res = await api.get('/schedules/calendar', {
        params: { startDate, endDate }
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.schedules || []);
      setAppointments(Array.isArray(list) ? list : []);
    } catch {
      setAppointments([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [weekDays]);

  // Busca indicadores consolidados do mês (Entradas, Saídas, No-Show e Cancelamento)
  const fetchMonthSummary = useCallback(async () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const currentYearMonth = `${y}-${String(m).padStart(2, '0')}`;
    const startOfMonth = `${currentYearMonth}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endOfMonth = `${currentYearMonth}-${String(lastDay).padStart(2, '0')}`;

    try {
      const [finRes, schedRes] = await Promise.all([
        api.get('/financial').catch(() => ({ data: { transactions: [] } })),
        api.get('/schedules/calendar', {
          params: { startDate: startOfMonth, endDate: endOfMonth }
        }).catch(() => ({ data: [] }))
      ]);

      // 1. Financeiro do Mês (Entradas e Saídas)
      const txs = finRes.data?.transactions || [];
      let inc = 0;
      let exp = 0;
      for (const t of txs) {
        if (t.date && t.date.startsWith(currentYearMonth)) {
          const amt = Number(t.amount) || 0;
          if (t.type === 'INCOME') inc += amt;
          else if (t.type === 'EXPENSE') exp += amt;
        }
      }
      setMonthFinancial({
        income: inc,
        expense: exp,
        net: inc - exp,
        loading: false
      });

      // 2. Operacional do Mês (No-Show, Cancelamentos, Atendimentos)
      const list = Array.isArray(schedRes.data)
        ? schedRes.data
        : (schedRes.data?.data || schedRes.data?.schedules || []);
      const total = list.length;
      const noShow = list.filter((a: any) => a.status === 'NO_SHOW').length;
      const cancelled = list.filter((a: any) => a.status === 'CANCELLED').length;
      const completed = list.filter((a: any) => a.status === 'COMPLETED').length;
      const activeOrAttended = total - cancelled;
      const noShowRate = activeOrAttended > 0 ? (noShow / activeOrAttended) * 100 : 0;
      const cancelledRate = total > 0 ? (cancelled / total) * 100 : 0;

      setMonthOperational({
        total,
        completed,
        noShow,
        noShowRate: Math.round(noShowRate * 10) / 10,
        cancelled,
        cancelledRate: Math.round(cancelledRate * 10) / 10,
        loading: false
      });
    } catch {
      setMonthFinancial((prev) => ({ ...prev, loading: false }));
      setMonthOperational((prev) => ({ ...prev, loading: false }));
    }
  }, [currentDate]);

  useEffect(() => {
    fetchWeekAppointments();
    fetchMonthSummary();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWeekAppointments(true);
        fetchMonthSummary();
      }
    }, 20000);

    const handleSync = () => {
      fetchWeekAppointments(true);
      fetchMonthSummary();
    };
    window.addEventListener('marquesuahora_agenda_sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('marquesuahora_agenda_sync', handleSync);
    };
  }, [fetchWeekAppointments, fetchMonthSummary]);

  // Agendamentos filtrados para o dia selecionado
  const dayAppointments = useMemo(() => {
    const list = Array.isArray(appointments) ? appointments : [];
    return list
      .filter((appt) => {
        const apptDate = formatLocalDateToYMD(appt.date);
        return apptDate === selectedDateStr;
      })
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [appointments, selectedDateStr]);

  // Contagem de atendimentos por dia da semana
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    const list = Array.isArray(appointments) ? appointments : [];
    for (const appt of list) {
      if (appt.status === 'CANCELLED') continue;
      const d = formatLocalDateToYMD(appt.date);
      map[d] = (map[d] || 0) + 1;
    }
    return map;
  }, [appointments]);

  // Extrai apenas o primeiro nome da cliente para visualização rápida no celular
  const getFirstName = (fullName: string) => {
    if (!fullName) return 'Cliente';
    const parts = fullName.trim().split(' ');
    return parts[0];
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
    setSelectedDateStr(formatLocalDateToYMD(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
    setSelectedDateStr(formatLocalDateToYMD(next));
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    setCurrentDate(today);
    setSelectedDateStr(formatLocalDateToYMD(today));
  };

  const handleCalendarRefresh = () => {
    fetchWeekAppointments(false);
    window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200 pb-12">
      {/* 1. COPILOTO IA NO TOPO */}
      <section>
        <AiVoiceCommandBar />
      </section>

      {/* 2. BARRA DE ATALHOS RÁPIDOS */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsNewBookingModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl btn-primary-tenant text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          style={{ backgroundColor: tenantPrimaryColor, color: getContrastColor(tenantPrimaryColor) }}
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>

        <Link
          href="/dashboard/agenda"
          className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          Grade Completa
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {/* 3. AGENDA COMPACTA DA SEMANA (MOBILE-FIRST) */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Cabeçalho da Semana com Navegação */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Agenda Resumida</h2>
            <p className="text-[11px] text-slate-500">
              Selecione o dia para ver os atendimentos programados
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Próxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Seletor Compacto dos 7 Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 p-2 sm:p-3 bg-slate-50/30 border-b border-slate-100">
          {weekDays.map((d) => {
            const dateStr = formatLocalDateToYMD(d);
            const isSelected = dateStr === selectedDateStr;
            const isToday = isSameDay(d, new Date());
            const count = countByDate[dateStr] || 0;
            const weekday = WEEKDAY_NAMES[d.getDay()];
            const dayNum = d.getDate();

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDateStr(dateStr)}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-xs font-bold scale-[1.02]'
                    : isToday
                    ? 'border font-semibold'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: tenantPrimaryColor, color: getContrastColor(tenantPrimaryColor) }
                    : isToday
                    ? { backgroundColor: `${tenantPrimaryColor}14`, color: tenantPrimaryColor, borderColor: `${tenantPrimaryColor}40` }
                    : undefined
                }
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                  {weekday}
                </span>
                <span className="text-sm font-extrabold my-0.5">{dayNum}</span>
                {count > 0 ? (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="text-[9px] opacity-40">-</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista Compacta de Atendimentos do Dia Selecionado */}
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Carregando atendimentos...</span>
            </div>
          ) : dayAppointments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Nenhum atendimento agendado para este dia
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Clique abaixo para criar um novo agendamento rápido
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBookingModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" style={{ color: tenantPrimaryColor }} />
                Agendar Horário
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayAppointments.map((appt) => {
                const badge =
                  STATUS_BADGES[appt.status] || STATUS_BADGES.CONFIRMED;
                const SYSTEM_DEFAULTS = ['#3B82F6', '#7C3AED', '#8B5CF6', '#6D28D9', '#9333EA', '#A855F7', '#C084FC'];
                const svcColor = appt.service?.color?.trim();
                const hasCustomSvcColor = svcColor && !SYSTEM_DEFAULTS.includes(svcColor.toUpperCase());
                const profColor = appt.professional?.color?.trim();
                const hasCustomProfColor = profColor && !SYSTEM_DEFAULTS.includes(profColor.toUpperCase());

                const procColor = hasCustomSvcColor
                  ? svcColor
                  : hasCustomProfColor
                  ? profColor
                  : tenantPrimaryColor;
                const clientFirstName = getFirstName(appt.client?.name);

                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelectedAppointmentForDetails(appt)}
                    className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/70 transition-all flex items-center justify-between cursor-pointer shadow-2xs gap-3"
                    style={{ borderLeftWidth: '5px', borderLeftColor: procColor }}
                  >
                    {/* Horário & Primeiro Nome da Cliente */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-left shrink-0">
                        <span className="text-sm font-extrabold text-slate-900 block font-mono">
                          {appt.startTime}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          até {appt.endTime}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {clientFirstName}
                          </p>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: procColor }}
                            title={`Procedimento: ${appt.service?.name}`}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <span className="font-medium text-slate-600 truncate">{appt.service?.name}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400 truncate">{appt.professional?.name}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status e Ação */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>

                      {appt.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCheckoutAppointment(appt);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border hover:opacity-85"
                          style={{
                            backgroundColor: `${tenantPrimaryColor}14`,
                            color: tenantPrimaryColor,
                            borderColor: `${tenantPrimaryColor}35`
                          }}
                        >
                          Cobrar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé com link para Agenda Completa */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Total do dia: <strong>{dayAppointments.length} atendimentos</strong>
            </span>
            <Link
              href="/dashboard/agenda"
              className="font-bold inline-flex items-center gap-1 transition-colors hover:opacity-80"
              style={{ color: tenantPrimaryColor }}
            >
              Abrir Grade Completa da Agenda
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. RESUMO EXECUTIVO DO MÊS: ENTRADAS, SAÍDAS, NO-SHOW E CANCELAMENTOS */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Resumo Executivo do Mês
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Métricas financeiras consolidadas, faltas (no-show) e cancelamentos do mês
            </p>
          </div>

          <Link
            href="/dashboard/financeiro"
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>Ver Financeiro & Gráfico</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>

        {/* Grid de 5 Cards Métricos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Entradas & Faturamento */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Entradas Realizadas
              </span>
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="text-xl font-mono font-bold text-slate-900 block">
              {formatBRL(monthFinancial.income)}
            </span>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/50">
              <span>Receitas do mês</span>
              <span className="text-emerald-700 font-semibold">Conciliado</span>
            </div>
          </div>

          {/* Card 2: Saídas & Despesas */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Saídas & Despesas
              </span>
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <TrendingDown className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="text-xl font-mono font-bold text-slate-900 block">
              {formatBRL(monthFinancial.expense)}
            </span>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/50">
              <span>Custos operacionais</span>
              <span className="text-rose-700 font-semibold">Pagas</span>
            </div>
          </div>

          {/* Card 3: Saldo Líquido em Caixa */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Saldo Líquido
              </span>
              <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
            </div>
            <span
              className={`text-xl font-mono font-bold block ${
                monthFinancial.net >= 0 ? 'text-slate-900' : 'text-rose-700'
              }`}
            >
              {formatBRL(monthFinancial.net)}
            </span>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/50">
              <span>Resultado líquido</span>
              <span className={monthFinancial.net >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                {monthFinancial.net >= 0 ? 'Positivo' : 'Déficit'}
              </span>
            </div>
          </div>

          {/* Card 4: Faltas / No-Show */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Faltas (No-Show)
              </span>
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-mono font-bold text-slate-900">
                {monthOperational.noShow}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                faltas
              </span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/50">
              <span>Taxa no mês:</span>
              <span className={`font-bold ${monthOperational.noShowRate > 5 ? 'text-amber-700' : 'text-slate-600'}`}>
                {monthOperational.noShowRate}%
              </span>
            </div>
          </div>

          {/* Card 5: Cancelamentos */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cancelamentos
              </span>
              <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                <XCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-mono font-bold text-slate-900">
                {monthOperational.cancelled}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                cancelados
              </span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/50">
              <span>Taxa sobre total:</span>
              <span className="font-bold text-slate-600">
                {monthOperational.cancelledRate}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MODAIS DO DASHBOARD */}
      {isNewBookingModalOpen && (
        <AgendaAppointmentModal
          initialDate={selectedDateStr}
          professionals={professionals}
          services={services}
          onClose={() => setIsNewBookingModalOpen(false)}
          onSuccess={handleCalendarRefresh}
        />
      )}

      {selectedAppointmentForDetails && (
        <AgendaAppointmentDetailsModal
          appointment={selectedAppointmentForDetails}
          professionals={professionals}
          onClose={() => setSelectedAppointmentForDetails(null)}
          onSuccess={handleCalendarRefresh}
          onOpenCheckout={(appt) => setCheckoutAppointment(appt)}
        />
      )}

      {checkoutAppointment && (
        <AppointmentCheckoutModal
          appointment={checkoutAppointment}
          onClose={() => setCheckoutAppointment(null)}
          onSuccess={() => {
            setCheckoutAppointment(null);
            handleCalendarRefresh();
            showToast('Comanda finalizada com sucesso!');
          }}
        />
      )}

      {/* Notificador Toast Flutuante */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-60 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
