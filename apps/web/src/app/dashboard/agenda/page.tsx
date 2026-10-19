'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { AgendaHeader } from '@/components/agenda/AgendaHeader';
import { AgendaWeeklyGrid } from '@/components/agenda/AgendaWeeklyGrid';
import { AgendaMonthGrid } from '@/components/agenda/AgendaMonthGrid';
import { formatLocalDateToYMD, getWeekDays, getMonthGridDays } from '@/lib/dateUtils';
import { AgendaAppointmentModal } from '@/components/agenda/AgendaAppointmentModal';
import { AgendaAppointmentDetailsModal } from '@/components/agenda/AgendaAppointmentDetailsModal';
import { AgendaBlockModal } from '@/components/agenda/AgendaBlockModal';
import { AgendaUnblockModal } from '@/components/agenda/AgendaUnblockModal';
import { AppointmentCheckoutModal } from '@/components/agenda/AppointmentCheckoutModal';
import {
  ScheduleAppointment,
  ProfessionalItem,
  ServiceOption,
  BlockItem
} from '@/components/agenda/types';
import { StatusColors, getDefaultStatusColors } from '@/components/agenda/AgendaStatusColorPicker';

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

export default function AgendaCompletaPage() {
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

  // Cores personalizadas por status (Pendente, Confirmado, Em Atendimento, Concluído, No-Show, Cancelado)
  const [statusColors, setStatusColors] = useState<StatusColors>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('marquesuahora_agenda_status_colors');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return getDefaultStatusColors(tenantPrimaryColor);
  });

  const handleUpdateStatusColors = (newColors: StatusColors) => {
    setStatusColors(newColors);
    if (typeof window !== 'undefined') {
      localStorage.setItem('marquesuahora_agenda_status_colors', JSON.stringify(newColors));
      window.dispatchEvent(new CustomEvent('marquesuahora_status_colors_sync', { detail: newColors }));
    }
  };

  useEffect(() => {
    const handleStatusSync = (e: any) => {
      if (e?.detail) setStatusColors(e.detail);
    };
    window.addEventListener('marquesuahora_status_colors_sync', handleStatusSync);
    return () => window.removeEventListener('marquesuahora_status_colors_sync', handleStatusSync);
  }, []);

  // ==========================================
  // ESTADOS DA GRADE DA AGENDA
  // ==========================================
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');

  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [errorAgenda, setErrorAgenda] = useState<string | null>(null);

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

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
  const [checkoutAppointment, setCheckoutAppointment] =
    useState<ScheduleAppointment | null>(null);

  // Calcula lista de dias visíveis (mês, semana ou dia)
  const visibleDates = useMemo(() => {
    if (viewMode === 'day') {
      const d = new Date(currentDate);
      d.setHours(12, 0, 0, 0);
      return [d];
    }

    if (viewMode === 'month') {
      const grid = getMonthGridDays(currentDate.getFullYear(), currentDate.getMonth());
      return grid.map((c) => c.date);
    }

    return getWeekDays(currentDate);
  }, [currentDate, viewMode]);

  const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);

  // Carrega opções de profissionais, serviços e regras semanais da agenda
  useEffect(() => {
    Promise.all([
      api.get('/professionals').catch(() => ({ data: [] })),
      api.get('/services').catch(() => ({ data: [] })),
      api.get('/availability-rules').catch(() => ({ data: [] }))
    ]).then(([profRes, servRes, rulesRes]) => {
      const pList = Array.isArray(profRes.data) ? profRes.data : (profRes.data?.data || []);
      const sList = Array.isArray(servRes.data) ? servRes.data : (servRes.data?.data || []);
      const rList = Array.isArray(rulesRes.data) ? rulesRes.data : (rulesRes.data?.data || rulesRes.data?.rules || []);
      setProfessionals(Array.isArray(pList) ? pList : []);
      setServices(Array.isArray(sList) ? sList : []);
      setAvailabilityRules(Array.isArray(rList) ? rList : []);
    });
  }, []);

  // Busca agendamentos e bloqueios para o intervalo visível
  const fetchAgendaData = useCallback(async (silent = false) => {
    if (visibleDates.length === 0) return;
    if (!silent) setLoadingAgenda(true);

    const startDate = formatLocalDateToYMD(visibleDates[0]);
    const endDate = formatLocalDateToYMD(visibleDates[visibleDates.length - 1]);

    try {
      const [schedulesRes, blocksRes] = await Promise.all([
        api.get('/schedules/calendar', {
          params: {
            startDate,
            endDate,
            professionalId: selectedProfessionalId || undefined
          }
        }),
        api.get('/blocks', {
          params: {
            startDate,
            endDate,
            professionalId: selectedProfessionalId || undefined
          }
        })
      ]);

      const rawAppointments = Array.isArray(schedulesRes.data)
        ? schedulesRes.data
        : (schedulesRes.data?.data || schedulesRes.data?.schedules || []);
      const rawBlocks = Array.isArray(blocksRes.data)
        ? blocksRes.data
        : (blocksRes.data?.blocks || blocksRes.data?.data || []);

      setAppointments(Array.isArray(rawAppointments) ? rawAppointments : []);
      setBlocks(Array.isArray(rawBlocks) ? rawBlocks : []);
      setErrorAgenda(null);
    } catch (err: any) {
      if (!silent) {
        setErrorAgenda(err?.response?.data?.message || 'Erro ao carregar grade da agenda.');
      }
    } finally {
      if (!silent) setLoadingAgenda(false);
    }
  }, [visibleDates, selectedProfessionalId]);

  useEffect(() => {
    fetchAgendaData();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAgendaData(true);
      }
    }, 20000);

    const handleRevalidate = () => fetchAgendaData(true);
    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleRevalidate);
    window.addEventListener('marquesuahora_agenda_sync', handleRevalidate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleRevalidate);
      window.removeEventListener('marquesuahora_agenda_sync', handleRevalidate);
    };
  }, [fetchAgendaData]);

  const handleCalendarRefresh = () => {
    fetchAgendaData(false);
    window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
  };

  const handleNavigatePrev = () => {
    if (viewMode === 'month') {
      const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1, 12, 0, 0);
      setCurrentDate(prev);
    } else {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - (viewMode === 'week' ? 7 : 1));
      setCurrentDate(prev);
    }
  };

  const handleNavigateNext = () => {
    if (viewMode === 'month') {
      const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 12, 0, 0);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + (viewMode === 'week' ? 7 : 1));
      setCurrentDate(next);
    }
  };

  const handleNavigateToday = () => {
    setCurrentDate(new Date());
  };

  // Previsão Financeira e Total de Agendamentos do Período Visível (Mês, Semana ou Dia)
  const stats = useMemo(() => {
    const targetDates = visibleDates.map((d) => formatLocalDateToYMD(d));
    const targetSet = new Set(targetDates);

    const valid = appointments.filter((a) => {
      if (a.status === 'CANCELLED') return false;
      const aDateStr = formatLocalDateToYMD(a.date);

      if (viewMode === 'day') {
        const selectedDayStr = formatLocalDateToYMD(currentDate);
        return aDateStr === selectedDayStr;
      }

      if (viewMode === 'month') {
        const d = new Date(a.date);
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
      }

      // Semana: apenas agendamentos da semana ativa
      return targetSet.has(aDateStr);
    });

    const totalAppointments = valid.length;
    const totalRevenue = valid.reduce((acc, a) => acc + (Number(a.totalPrice) || 0), 0);

    return {
      totalAppointments,
      totalRevenue,
      periodLabel:
        viewMode === 'day'
          ? 'Previsão do dia'
          : viewMode === 'month'
          ? 'Previsão do mês'
          : 'Previsão da semana'
    };
  }, [appointments, viewMode, currentDate, visibleDates]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 1. Grade Semanal da Agenda */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <AgendaHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onNavigatePrev={handleNavigatePrev}
          onNavigateNext={handleNavigateNext}
          onNavigateToday={handleNavigateToday}
          professionals={professionals}
          selectedProfessionalId={selectedProfessionalId}
          setSelectedProfessionalId={setSelectedProfessionalId}
          stats={stats}
          statusColors={statusColors}
          onUpdateStatusColors={handleUpdateStatusColors}
          tenantPrimaryColor={tenantPrimaryColor}
          onNewBookingClick={() => {
            setActiveSlot(null);
            setIsNewBookingModalOpen(true);
          }}
          onNewBlockClick={() => {
            setActiveSlot(null);
            setIsBlockModalOpen(true);
          }}
        />

        {errorAgenda && (
          <div className="mx-6 my-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
            <span>{errorAgenda}</span>
            <button
              onClick={() => handleCalendarRefresh()}
              className="underline font-bold hover:text-rose-900 cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loadingAgenda && (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">Carregando horários e equipe...</span>
          </div>
        )}

        {!loadingAgenda && viewMode === 'month' && (
          <AgendaMonthGrid
            currentDate={currentDate}
            selectedProfessionalId={selectedProfessionalId}
            appointments={appointments}
            blocks={blocks}
            statusColors={statusColors}
            onDayClick={(day) => {
              setCurrentDate(day);
              setViewMode('day');
            }}
            onSlotClick={(date, time, profId) => {
              setActiveSlot({ date, time, professionalId: profId });
              setIsNewBookingModalOpen(true);
            }}
            onAppointmentClick={(appt) => {
              setSelectedAppointmentForDetails(appt);
            }}
          />
        )}

        {!loadingAgenda && (viewMode === 'week' || viewMode === 'day') && (
          <AgendaWeeklyGrid
            dates={visibleDates}
            viewMode={viewMode}
            appointments={appointments}
            blocks={blocks}
            statusColors={statusColors}
            availabilityRules={availabilityRules}
            professionals={professionals}
            selectedProfessionalId={selectedProfessionalId}
            onDayClick={(day) => {
              setCurrentDate(day);
              setViewMode('day');
            }}
            onSlotClick={(date, time, profId) => {
              setActiveSlot({ date, time, professionalId: profId });
              setIsNewBookingModalOpen(true);
            }}
            onAppointmentClick={(appt) => {
              setSelectedAppointmentForDetails(appt);
            }}
            onBlockClick={(block) => {
              setSelectedBlockForUnblock(block);
            }}
          />
        )}
      </section>

      {/* 2. Legenda de Status Sóbria (Padrão GuruAgenda com todas as cores dinâmicas) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-1 font-bold text-slate-700 tracking-wide uppercase text-[10px]">
          <span>STATUS:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: statusColors.PENDING }} />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: statusColors.CONFIRMED }} />
            <span>Confirmado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: statusColors.IN_SERVICE }} />
            <span>Em Atendimento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: statusColors.COMPLETED }} />
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: statusColors.NO_SHOW }} />
            <span>Não Compareceu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: statusColors.CANCELLED }} />
            <span>Cancelado</span>
          </div>
        </div>
      </div>

      {/* 3. Botão Flutuante Circular FAB (+) no Mobile (Idêntico ao GuruAgenda) */}
      <button
        type="button"
        onClick={() => {
          setActiveSlot(null);
          setIsNewBookingModalOpen(true);
        }}
        aria-label="Novo Agendamento Rápido"
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full btn-primary-tenant text-white shadow-xl flex items-center justify-center cursor-pointer transition-all border-2 border-white active:scale-90"
        style={{ backgroundColor: tenantPrimaryColor, color: getContrastColor(tenantPrimaryColor) }}
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* 4. Modais da Agenda */}
      {isNewBookingModalOpen && (
        <AgendaAppointmentModal
          initialDate={activeSlot?.date}
          initialTime={activeSlot?.time}
          initialProfessionalId={activeSlot?.professionalId}
          existingAppointments={appointments}
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
