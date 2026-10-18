'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Phone,
  DollarSign,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  BarChart2,
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import { AiVoiceCommandBar } from '@/components/dashboard/AiVoiceCommandBar';
import { AgendaHeader } from '@/components/agenda/AgendaHeader';
import { AgendaWeeklyGrid } from '@/components/agenda/AgendaWeeklyGrid';
import { AgendaAppointmentModal } from '@/components/agenda/AgendaAppointmentModal';
import { AgendaAppointmentDetailsModal } from '@/components/agenda/AgendaAppointmentDetailsModal';
import { AgendaBlockModal } from '@/components/agenda/AgendaBlockModal';
import { AgendaUnblockModal } from '@/components/agenda/AgendaUnblockModal';
import {
  ScheduleAppointment,
  ProfessionalItem,
  ServiceOption,
  BlockItem
} from '@/components/agenda/types';

interface DashboardSummary {
  todayBookings: number;
  monthRevenue: number;
  noShowRatePercent: number;
  activeClientsCount: number;
  nextAppointments: Array<{
    id: string;
    date: string;
    time: string;
    endTime: string;
    client: string;
    clientPhone: string;
    service: string;
    additionalServices: string[];
    professional: string;
    professionalColor?: string | null;
    totalPrice: number;
    totalDurationMinutes: number;
    status: string;
  }>;
}

export default function DashboardPage() {
  // ==========================================
  // ESTADOS DA AGENDA (TOPO DA PÁGINA)
  // ==========================================
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');

  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [errorAgenda, setErrorAgenda] = useState<string | null>(null);

  // Estados dos modais da Agenda
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedBlockForUnblock, setSelectedBlockForUnblock] = useState<BlockItem | null>(null);
  const [activeSlot, setActiveSlot] = useState<{
    date: string;
    time: string;
    professionalId?: string;
  } | null>(null);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] =
    useState<ScheduleAppointment | null>(null);

  // ==========================================
  // ESTADOS DO RESUMO OPERACIONAL (ABAIXO DA AGENDA)
  // ==========================================
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Faixa discreta informativa do Plano Gratuito (Não-Invasiva)
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('marquesuahora_free_banner_dismissed') === 'true';
    setBannerDismissed(dismissed);

    const cachedCode = localStorage.getItem('marquesuahora_tenant_plan_code');
    if (cachedCode) {
      setIsFreePlan(cachedCode === 'FREE');
    }

    api
      .get('/tenants/me')
      .then((res) => {
        if (res.data) {
          const code = res.data.plan?.code || res.data.planCode || 'FREE';
          setIsFreePlan(code === 'FREE');
          localStorage.setItem('marquesuahora_tenant_plan_code', code);
        }
      })
      .catch(() => {});
  }, []);

  // Calcula lista de dias visíveis (7 dias para semana ou 1 dia para dia)
  const visibleDates = useMemo(() => {
    if (viewMode === 'day') {
      return [new Date(currentDate)];
    }

    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const nextD = new Date(monday);
      nextD.setDate(monday.getDate() + i);
      weekDays.push(nextD);
    }
    return weekDays;
  }, [currentDate, viewMode]);

  // Carrega opções de profissionais e serviços (uma única vez)
  useEffect(() => {
    Promise.all([
      api.get('/professionals').catch(() => ({ data: [] })),
      api.get('/services').catch(() => ({ data: [] }))
    ]).then(([profRes, servRes]) => {
      setProfessionals(profRes.data || []);
      setServices(servRes.data || []);
    });
  }, []);

  // Carrega agendamentos e bloqueios reais para a grade (com suporte a refetch silencioso de fundo)
  const fetchCalendarData = useCallback((silent = false) => {
    if (visibleDates.length === 0) return;

    if (!silent) {
      setLoadingAgenda(true);
      setErrorAgenda(null);
    }

    const startDate = visibleDates[0].toISOString().slice(0, 10);
    const endDate = visibleDates[visibleDates.length - 1].toISOString().slice(0, 10);

    const params = new URLSearchParams({ startDate, endDate });
    if (selectedProfessionalId) {
      params.set('professionalId', selectedProfessionalId);
    }

    Promise.all([
      api.get(`/schedules/calendar?${params.toString()}`),
      api.get(`/blocks?${params.toString()}`).catch(() => ({ data: [] }))
    ])
      .then(([schedRes, blocksRes]) => {
        setAppointments(schedRes.data || []);
        setBlocks(blocksRes.data || []);
      })
      .catch((err) => {
        if (!silent) {
          setErrorAgenda(
            err?.response?.data?.message || 'Não foi possível carregar os dados da agenda.'
          );
        }
      })
      .finally(() => {
        if (!silent) {
          setLoadingAgenda(false);
        }
      });
  }, [visibleDates, selectedProfessionalId]);

  // Carrega resumo de métricas do negócio (com suporte a refetch silencioso)
  const fetchDashboardSummary = useCallback((silent = false) => {
    if (!silent) {
      setLoadingSummary(true);
    }
    api
      .get('/schedules/dashboard-summary')
      .then((res) => {
        setSummaryData(res.data);
      })
      .catch(() => {
        // silencioso
      })
      .finally(() => {
        if (!silent) {
          setLoadingSummary(false);
        }
      });
  }, []);

  // Dispara buscas principais
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  // Atualização unificada após qualquer operação na agenda
  const handleCalendarRefresh = () => {
    fetchCalendarData();
    fetchDashboardSummary();
  };

  // Revalidação Automática Inteligente em Segundo Plano:
  // 1. Polling silencioso a cada 30 segundos (sem piscar a tela)
  // 2. Foco na janela / Alternância de aba (quando a recepcionista volta do WhatsApp ou de outra aba)
  // 3. Sincronização global via evento 'marquesuahora_agenda_sync'
  useEffect(() => {
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible') {
        fetchCalendarData(true);
        fetchDashboardSummary(true);
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
  }, [fetchCalendarData, fetchDashboardSummary]);

  // Navegação de datas
  const navigatePrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const handleSlotClick = (dateStr: string, timeStr: string, professionalId?: string) => {
    setActiveSlot({ date: dateStr, time: timeStr, professionalId });
    setIsNewBookingModalOpen(true);
  };

  const handleAppointmentClick = (appt: ScheduleAppointment) => {
    setSelectedAppointmentForDetails(appt);
  };

  const handleReschedule = async (
    appointmentId: string,
    targetDateStr: string,
    targetTimeStr: string,
    targetProfessionalId?: string
  ) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              date: targetDateStr,
              startTime: targetTimeStr,
              professionalId: targetProfessionalId || a.professionalId
            }
          : a
      )
    );

    try {
      await api.patch(`/schedules/${appointmentId}`, {
        dateStr: targetDateStr,
        startTime: targetTimeStr,
        professionalId: targetProfessionalId || undefined
      });
      handleCalendarRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Não foi possível mover o agendamento.');
      handleCalendarRefresh();
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.post(`/schedules/${id}/status`, { status: newStatus });
      handleCalendarRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Falha ao atualizar status.');
    }
  };

  // Estatísticas do período visível para o cabeçalho da agenda
  const stats = useMemo(() => {
    const nonCancelled = appointments.filter((a) => a.status !== 'CANCELLED');
    const totalAppointments = nonCancelled.length;
    const totalRevenue = nonCancelled.reduce(
      (acc, a) => acc + Number(a.totalPrice || 0),
      0
    );
    return { totalAppointments, totalRevenue };
  }, [appointments]);

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Faixa Sóbria Informativa do Plano Gratuito (Não-Invasiva) */}
      {isFreePlan && !bannerDismissed && (
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-xs text-slate-700">
          <div className="leading-relaxed">
            <span>Você está usando o plano <strong>Gratuito</strong> (até 30 agendamentos por mês). Se precisar de agendamentos ilimitados ou lembretes automáticos no WhatsApp, </span>
            <Link
              href="/dashboard/planos"
              className="font-bold text-purple-700 hover:text-purple-800 underline underline-offset-2 transition-colors cursor-pointer"
            >
              conheça nossos outros planos
            </Link>
            <span>.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBannerDismissed(true);
              localStorage.setItem('marquesuahora_free_banner_dismissed', 'true');
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
            title="Fechar aviso"
            aria-label="Fechar aviso de plano gratuito"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. SEÇÃO PRINCIPAL (HERO): AGENDA INTERATIVA COMPLETA     */}
      {/* ========================================================= */}
      <section className="space-y-4">
        {/* Copiloto IA de Voz e Comandos Rápidos */}
        <AiVoiceCommandBar
          onCommandExecuted={() => {
            handleCalendarRefresh();
            fetchDashboardSummary();
          }}
        />

        {/* Cabeçalho da Agenda */}
        <AgendaHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onNavigatePrev={navigatePrev}
          onNavigateNext={navigateNext}
          onNavigateToday={navigateToday}
          professionals={professionals}
          selectedProfessionalId={selectedProfessionalId}
          setSelectedProfessionalId={setSelectedProfessionalId}
          onNewBookingClick={() => {
            setActiveSlot(null);
            setIsNewBookingModalOpen(true);
          }}
          onNewBlockClick={() => {
            setIsBlockModalOpen(true);
          }}
          stats={stats}
        />

        {/* Grade Semanal / Diária */}
        {loadingAgenda ? (
          <div className="w-full py-24 bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-tenant-primary mb-2" />
            <p className="text-xs font-semibold">Atualizando grade de horários da equipe...</p>
          </div>
        ) : errorAgenda ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-red-800 text-center">
            <p className="text-xs font-bold">{errorAgenda}</p>
            <button
              onClick={handleCalendarRefresh}
              className="mt-3 px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 cursor-pointer"
            >
              Recarregar grade
            </button>
          </div>
        ) : (
          <AgendaWeeklyGrid
            dates={visibleDates}
            viewMode={viewMode}
            professionals={professionals}
            selectedProfessionalId={selectedProfessionalId}
            appointments={appointments}
            blocks={blocks}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            onBlockClick={(block) => setSelectedBlockForUnblock(block)}
            onDayClick={(clickedDate) => {
              setCurrentDate(clickedDate);
              setViewMode('day');
            }}
            onReschedule={handleReschedule}
          />
        )}
      </section>

      {/* ========================================================= */}
      {/* 2. SEÇÃO INFERIOR: RESUMO OPERACIONAL & INDICADORES       */}
      {/* ========================================================= */}
      <section className="space-y-5 pt-4 border-t border-slate-200/80">
        {/* Barra de Título do Resumo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-tenant-light text-tenant-primary flex items-center justify-center font-bold">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Resumo Operacional & Desempenho
              </h2>
              <p className="text-xs text-slate-500">
                Faturamento acumulado, taxa de no-show e próximos atendimentos do espaço
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-tenant-primary" />
              <span>
                {new Date().toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <Link
              href="/dashboard/agendamentos"
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Cards de Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Agendamentos Hoje */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Agendamentos Hoje
              </span>
              <div className="w-8 h-8 rounded-xl bg-tenant-light text-tenant-primary flex items-center justify-center font-bold">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-900">
                {summaryData ? summaryData.todayBookings : 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                atendimentos marcados para hoje
              </p>
            </div>
          </div>

          {/* KPI 2: Faturamento do Mês */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Receita do Mês
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-900">
                R${' '}
                {summaryData
                  ? summaryData.monthRevenue.toFixed(2).replace('.', ',')
                  : '0,00'}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                acumulado no mês corrente
              </p>
            </div>
          </div>

          {/* KPI 3: Taxa de No-Show */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Taxa de No-Show
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-900">
                {summaryData ? summaryData.noShowRatePercent : 0}%
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                índice de não comparecimento
              </p>
            </div>
          </div>

          {/* KPI 4: Base de Clientes */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Base de Clientes
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-900">
                {summaryData ? summaryData.activeClientsCount : 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                clientes cadastrados no sistema
              </p>
            </div>
          </div>
        </div>

        {/* Fila de Próximos Atendimentos */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Próximos Atendimentos
              </h3>
              <p className="text-xs text-slate-500">
                Fila cronológica de atendimentos a partir de hoje
              </p>
            </div>
            <Link
              href="/dashboard/agendamentos"
              className="text-xs font-bold text-tenant-primary hover:opacity-80 flex items-center gap-1 transition-opacity"
            >
              <span>Ver lista completa</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {!summaryData || summaryData.nextAppointments.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                Nenhum agendamento futuro na fila
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Novos agendamentos marcados na grade acima ou através do seu link público aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {summaryData.nextAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center sm:text-left w-14 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        {appt.time}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {appt.date.split('-').reverse().slice(0, 2).join('/')}
                      </span>
                    </div>

                    <div
                      className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: appt.professionalColor || '#7C3AED'
                      }}
                    >
                      {appt.client.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">
                          {appt.client}
                        </strong>
                        {appt.clientPhone && (
                          <a
                            href={`https://wa.me/55${appt.clientPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Falar no WhatsApp"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {appt.service} · {appt.totalDurationMinutes} min ·{' '}
                        <span className="font-semibold text-slate-700">
                          R$ {Number(appt.totalPrice || 0).toFixed(2).replace('.', ',')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        appt.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : appt.status === 'IN_SERVICE'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : appt.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {appt.status === 'CONFIRMED'
                        ? 'Confirmado'
                        : appt.status === 'IN_SERVICE'
                        ? 'Em Atendimento'
                        : appt.status === 'COMPLETED'
                        ? 'Concluído'
                        : 'Pendente'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {appt.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'COMPLETED')}
                          className="p-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Marcar como Concluído"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {appt.status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            if (confirm('Deseja realmente cancelar este agendamento?')) {
                              handleUpdateStatus(appt.id, 'CANCELLED');
                            }
                          }}
                          className="p-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar Agendamento"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. MODAIS DA AGENDA (CRIAÇÃO, DETALHES, BLOQUEIOS)        */}
      {/* ========================================================= */}
      {isNewBookingModalOpen && (
        <AgendaAppointmentModal
          initialDate={activeSlot?.date}
          initialTime={activeSlot?.time}
          initialProfessionalId={activeSlot?.professionalId}
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
        />
      )}

      {isBlockModalOpen && (
        <AgendaBlockModal
          initialDate={activeSlot?.date}
          initialTime={activeSlot?.time}
          professionals={professionals}
          onClose={() => setIsBlockModalOpen(false)}
          onSuccess={handleCalendarRefresh}
        />
      )}

      {selectedBlockForUnblock && (
        <AgendaUnblockModal
          block={selectedBlockForUnblock}
          professionals={professionals}
          onClose={() => setSelectedBlockForUnblock(null)}
          onSuccess={handleCalendarRefresh}
        />
      )}
    </div>
  );
}
