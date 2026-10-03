'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Ban,
  Phone,
  CheckCircle2,
  XCircle,
  Play,
  X,
  CalendarDays,
  Columns3,
  MessageCircle,
  Scissors,
  Filter,
  ArrowRight
} from 'lucide-react';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  isBirthday?: boolean;
  notes?: string;
  professionalId: string;
  professionalName: string;
  professionalColor: string;
}

export interface Professional {
  id: string;
  name: string;
  color: string;
}

const INITIAL_PROFESSIONALS: Professional[] = [
  { id: 'prof-1', name: 'Carlos Barbeiro', color: '#7C3AED' },
  { id: 'prof-2', name: 'Juliana Silva', color: '#059669' },
  { id: 'prof-3', name: 'Lucas Hair', color: '#D97706' }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  // 03/10/2026 (Sábado - 5 agendamentos para demonstrar múltiplos clientes no mesmo dia)
  {
    id: 'app-1',
    clientName: 'Rodrigo Medeiros',
    clientPhone: '11987654321',
    serviceName: 'Corte Degradê + Barba',
    date: '2026-10-03',
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 60,
    totalPrice: 85.0,
    depositAmount: 30.0,
    depositPaid: true,
    status: 'IN_SERVICE',
    isBirthday: true,
    notes: 'Prefere degradê na zero alta e toalha bem quente.',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },
  {
    id: 'app-2',
    clientName: 'Beatriz Costa',
    clientPhone: '11966665555',
    serviceName: 'Mechas + Tratamento',
    date: '2026-10-03',
    startTime: '09:30',
    endTime: '12:30',
    durationMinutes: 180,
    totalPrice: 320.0,
    depositAmount: 100.0,
    depositPaid: true,
    status: 'CONFIRMED',
    notes: 'Teste de mecha realizado com sucesso.',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },
  {
    id: 'app-3',
    clientName: 'Guilherme Santos',
    clientPhone: '11977778888',
    serviceName: 'Corte Clássico',
    date: '2026-10-03',
    startTime: '10:30',
    endTime: '11:15',
    durationMinutes: 45,
    totalPrice: 50.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'CONFIRMED',
    notes: 'Indicação de amigos.',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },
  {
    id: 'app-4',
    clientName: 'Mariana Duarte',
    clientPhone: '11955554444',
    serviceName: 'Escova Modelada',
    date: '2026-10-03',
    startTime: '11:00',
    endTime: '11:45',
    durationMinutes: 45,
    totalPrice: 65.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'PENDING',
    notes: 'Agendamento pela vitrine pública.',
    professionalId: 'prof-3',
    professionalName: 'Lucas Hair',
    professionalColor: '#D97706'
  },
  {
    id: 'app-5',
    clientName: 'André Valente',
    clientPhone: '11944449999',
    serviceName: 'Barba & Acabamento VIP',
    date: '2026-10-03',
    startTime: '14:00',
    endTime: '14:45',
    durationMinutes: 45,
    totalPrice: 55.0,
    depositAmount: 20.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },

  // 05/10/2026 (Segunda - 3 agendamentos)
  {
    id: 'app-6',
    clientName: 'Camila Ferreira',
    clientPhone: '11944443333',
    serviceName: 'Corte Feminino + Hidratação',
    date: '2026-10-05',
    startTime: '14:00',
    endTime: '15:30',
    durationMinutes: 90,
    totalPrice: 160.0,
    depositAmount: 50.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },
  {
    id: 'app-7',
    clientName: 'Fernando Alves',
    clientPhone: '11933332222',
    serviceName: 'Barboterapia Premium',
    date: '2026-10-05',
    startTime: '16:00',
    endTime: '16:45',
    durationMinutes: 45,
    totalPrice: 60.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'CONFIRMED',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },
  {
    id: 'app-8',
    clientName: 'Renata Castro',
    clientPhone: '11922228888',
    serviceName: 'Tratamento Reconstrutor',
    date: '2026-10-05',
    startTime: '17:00',
    endTime: '18:15',
    durationMinutes: 75,
    totalPrice: 130.0,
    depositAmount: 40.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-3',
    professionalName: 'Lucas Hair',
    professionalColor: '#D97706'
  },

  // 08/10/2026 (Quinta - 3 agendamentos)
  {
    id: 'app-9',
    clientName: 'Rafael Lima',
    clientPhone: '11922221111',
    serviceName: 'Corte Degradê Navalhado',
    date: '2026-10-08',
    startTime: '10:00',
    endTime: '11:00',
    durationMinutes: 60,
    totalPrice: 55.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'CONFIRMED',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },
  {
    id: 'app-10',
    clientName: 'Larissa Mendes',
    clientPhone: '11911110000',
    serviceName: 'Coloração Global & Escova',
    date: '2026-10-08',
    startTime: '15:00',
    endTime: '17:00',
    durationMinutes: 120,
    totalPrice: 220.0,
    depositAmount: 70.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },
  {
    id: 'app-11',
    clientName: 'Felipe Dias',
    clientPhone: '11988882222',
    serviceName: 'Corte Masculino Fade',
    date: '2026-10-08',
    startTime: '17:30',
    endTime: '18:15',
    durationMinutes: 45,
    totalPrice: 50.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'PENDING',
    professionalId: 'prof-3',
    professionalName: 'Lucas Hair',
    professionalColor: '#D97706'
  },

  // 10/10/2026 (Sábado - 4 agendamentos)
  {
    id: 'app-12',
    clientName: 'Marcos Silveira',
    clientPhone: '11977771111',
    serviceName: 'Cabelo + Barboterapia',
    date: '2026-10-10',
    startTime: '09:00',
    endTime: '10:15',
    durationMinutes: 75,
    totalPrice: 85.0,
    depositAmount: 30.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },
  {
    id: 'app-13',
    clientName: 'Carolina Paiva',
    clientPhone: '11966662222',
    serviceName: 'Mechas Californianas',
    date: '2026-10-10',
    startTime: '10:30',
    endTime: '13:30',
    durationMinutes: 180,
    totalPrice: 340.0,
    depositAmount: 110.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },
  {
    id: 'app-14',
    clientName: 'Leandro Borges',
    clientPhone: '11955551111',
    serviceName: 'Corte Infantil + Desenho',
    date: '2026-10-10',
    startTime: '14:00',
    endTime: '14:45',
    durationMinutes: 45,
    totalPrice: 45.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'CONFIRMED',
    professionalId: 'prof-3',
    professionalName: 'Lucas Hair',
    professionalColor: '#D97706'
  },
  {
    id: 'app-15',
    clientName: 'Vanessa Prado',
    clientPhone: '11944441111',
    serviceName: 'Escova & Tratamento Nutritivo',
    date: '2026-10-10',
    startTime: '15:30',
    endTime: '16:30',
    durationMinutes: 60,
    totalPrice: 95.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'PENDING',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },

  // 15/10/2026 (Quinta - 4 agendamentos)
  {
    id: 'app-16',
    clientName: 'Lucas Ramos',
    clientPhone: '11966664444',
    serviceName: 'Barboterapia & Toalha Quente',
    date: '2026-10-15',
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 60,
    totalPrice: 50.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'CONFIRMED',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },
  {
    id: 'app-17',
    clientName: 'Ana Paula Ribeiro',
    clientPhone: '11955553333',
    serviceName: 'Mechas Loiras VIP',
    date: '2026-10-15',
    startTime: '15:00',
    endTime: '18:00',
    durationMinutes: 180,
    totalPrice: 380.0,
    depositAmount: 120.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },
  {
    id: 'app-18',
    clientName: 'Danilo Vieira',
    clientPhone: '11933334444',
    serviceName: 'Corte Degradê Militar',
    date: '2026-10-15',
    startTime: '16:00',
    endTime: '16:45',
    durationMinutes: 45,
    totalPrice: 50.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'CONFIRMED',
    professionalId: 'prof-3',
    professionalName: 'Lucas Hair',
    professionalColor: '#D97706'
  },
  {
    id: 'app-19',
    clientName: 'Letícia Andrade',
    clientPhone: '11922223333',
    serviceName: 'Finalização & Penteado',
    date: '2026-10-15',
    startTime: '18:15',
    endTime: '19:15',
    durationMinutes: 60,
    totalPrice: 120.0,
    depositAmount: 40.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },

  // 24/10/2026 (Sábado - 5 agendamentos)
  {
    id: 'app-20',
    clientName: 'Tiago Moreira',
    clientPhone: '11922220000',
    serviceName: 'Combo Cabelo + Barba + Sobrancelha',
    date: '2026-10-24',
    startTime: '10:00',
    endTime: '11:30',
    durationMinutes: 90,
    totalPrice: 110.0,
    depositAmount: 35.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  },
  {
    id: 'app-21',
    clientName: 'Fernanda Lima',
    clientPhone: '11911119999',
    serviceName: 'Corte Feminino & Escova',
    date: '2026-10-24',
    startTime: '11:30',
    endTime: '13:00',
    durationMinutes: 90,
    totalPrice: 140.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'CONFIRMED',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },
  {
    id: 'app-22',
    clientName: 'Alexandre Costa',
    clientPhone: '11988880000',
    serviceName: 'Corte Fade & Barba Alinhada',
    date: '2026-10-24',
    startTime: '14:00',
    endTime: '15:15',
    durationMinutes: 75,
    totalPrice: 80.0,
    depositAmount: 25.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-3',
    professionalName: 'Lucas Hair',
    professionalColor: '#D97706'
  },
  {
    id: 'app-23',
    clientName: 'Bianca Ramos',
    clientPhone: '11977770000',
    serviceName: 'Hidratação Intensiva + Escova',
    date: '2026-10-24',
    startTime: '15:30',
    endTime: '16:45',
    durationMinutes: 75,
    totalPrice: 125.0,
    depositAmount: 40.0,
    depositPaid: true,
    status: 'CONFIRMED',
    professionalId: 'prof-2',
    professionalName: 'Juliana Silva',
    professionalColor: '#059669'
  },
  {
    id: 'app-24',
    clientName: 'Samuel Farias',
    clientPhone: '11966660000',
    serviceName: 'Barboterapia com Argila',
    date: '2026-10-24',
    startTime: '17:00',
    endTime: '17:45',
    durationMinutes: 45,
    totalPrice: 65.0,
    depositAmount: 0,
    depositPaid: false,
    status: 'PENDING',
    professionalId: 'prof-1',
    professionalName: 'Carlos Barbeiro',
    professionalColor: '#7C3AED'
  }
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function DashboardAgendaPage() {
  // Modo de visualização: Grade Mensal (MONTH) ou Colunas Diárias por Profissional (DAY)
  const [viewMode, setViewMode] = useState<'MONTH' | 'DAY'>('MONTH');

  // Mês selecionado para a grade (Padrão: Outubro de 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = Outubro

  // Data selecionada (padrão: 2026-10-03)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-03');

  // Lista de Agendamentos e Profissionais
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [professionals] = useState<Professional[]>(INITIAL_PROFESSIONALS);

  // Modal de Detalhes Individuais do Agendamento
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Modal da Agenda do Dia (Exibe todos os agendamentos do dia quando há múltiplos)
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [dayModalProfFilter, setDayModalProfFilter] = useState<string>('ALL');

  // Modal de Bloqueio Rápido (ScheduleBlock)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockProfId, setBlockProfId] = useState(INITIAL_PROFESSIONALS[0]?.id || '');
  const [blockStartTime, setBlockStartTime] = useState('12:00');
  const [blockEndTime, setBlockEndTime] = useState('13:00');
  const [blockReason, setBlockReason] = useState('Almoço / Descanso');

  // Seletor de Status da Agenda (Abrir / Fechar Agenda Online)
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);
  const [scheduleStatusMessage, setScheduleStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('agenda_online_status');
    if (saved !== null) {
      setIsScheduleOpen(saved === 'true');
    }
  }, []);

  const toggleScheduleStatus = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextStatus = !isScheduleOpen;
    setIsScheduleOpen(nextStatus);
    localStorage.setItem('agenda_online_status', String(nextStatus));
    setScheduleStatusMessage(
      nextStatus
        ? 'Agenda aberta com sucesso! Clientes podem agendar horários online.'
        : 'Agenda fechada. Novos agendamentos online pausados temporariamente.'
    );
    setTimeout(() => setScheduleStatusMessage(null), 3500);
  };

  const handleUpdateStatus = (appId: string, newStatus: Appointment['status']) => {
    setAppointments((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
    );
    if (selectedAppointment && selectedAppointment.id === appId) {
      setSelectedAppointment((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBlockModalOpen(false);
  };

  // Funções de Navegação do Mês
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(9);
    setSelectedDate('2026-10-03');
  };

  // Construção dos dias do calendário mensal
  const getMonthDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString,
        isCurrentMonth: false,
        isToday: dateString === '2026-10-03'
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString,
        isCurrentMonth: true,
        isToday: dateString === '2026-10-03'
      });
    }

    // Dias do próximo mês para fechar a grade (múltiplo de 7)
    const remainingDays = 42 - days.length;
    for (let d = 1; d <= remainingDays; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateString = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString,
        isCurrentMonth: false,
        isToday: dateString === '2026-10-03'
      });
    }

    return days;
  };

  const monthDays = getMonthDays();

  // Nome formatado do mês e ano
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  // Agendamentos filtrados para o dia selecionado (para o modo DAY)
  const dayAppointments = appointments.filter((app) => app.date === selectedDate);

  // Agendamentos do dia aberto no DayModal
  const modalDayAppointments = dayModalDate
    ? appointments.filter((app) => {
        const matchesDate = app.date === dayModalDate;
        const matchesProf =
          dayModalProfFilter === 'ALL' || app.professionalId === dayModalProfFilter;
        return matchesDate && matchesProf;
      })
    : [];

  // Total de agendamentos do mês visível
  const monthAppointmentsCount = appointments.filter((app) => {
    const [y, m] = app.date.split('-').map(Number);
    return y === currentYear && m === currentMonth + 1;
  }).length;

  const getStatusBadgeClass = (status: Appointment['status']) => {
    switch (status) {
      case 'IN_SERVICE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'CONFIRMED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'NO_SHOW':
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'IN_SERVICE':
        return 'Em Atendimento';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'COMPLETED':
        return 'Atendido';
      case 'PENDING':
        return 'Pendente';
      case 'NO_SHOW':
        return 'Faltou (No-Show)';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* 1. BARRA SUPERIOR: SELETOR DE MODO, NAVEGAÇÃO E STATUS DA AGENDA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Lado Esquerdo: Alternador de Visualização (Mês vs. Dia) & Navegação */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Alternador de Modo de Visualização */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'MONTH'
                  ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/25'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Agenda do Mês</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('DAY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/25'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Visão Diária por Profissional</span>
            </button>
          </div>

          {/* Navegador de Data/Mês */}
          {viewMode === 'MONTH' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Mês Anterior"
                className="p-2 rounded-xl bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3.5 py-1.5 bg-white border border-purple-200/80 rounded-xl shadow-2xs flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 capitalize">
                  {monthName}
                </span>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80">
                  {monthAppointmentsCount} agendados
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                title="Próximo Mês"
                className="p-2 rounded-xl bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleGoToToday}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 transition-all shadow-2xs cursor-pointer"
              >
                Hoje
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-purple-200/80 rounded-xl shadow-2xs">
                <CalendarIcon className="w-4 h-4 text-purple-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate('2026-10-03')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 transition-all shadow-2xs cursor-pointer"
              >
                Hoje
              </button>
            </div>
          )}
        </div>

        {/* Lado Direito: Seletor de Abrir/Fechar Agenda + Bloqueio */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Botão Seletor para Abrir / Fechar a Agenda Online */}
          <button
            type="button"
            onClick={toggleScheduleStatus}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition-all cursor-pointer select-none relative z-10 active:scale-95 ${
              isScheduleOpen
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 hover:bg-emerald-100 shadow-2xs'
                : 'bg-rose-50/90 border-rose-300 text-rose-900 hover:bg-rose-100 shadow-2xs'
            }`}
            title={isScheduleOpen ? 'Clique para pausar agendamentos online' : 'Clique para abrir agendamentos online'}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {isScheduleOpen && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isScheduleOpen ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </span>
              <span className="text-xs font-bold">
                {isScheduleOpen ? 'Agenda Aberta' : 'Agenda Fechada'}
              </span>
            </div>

            {/* Toggle Switch Pill */}
            <div
              className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors ${
                isScheduleOpen ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform" />
            </div>
          </button>

          {/* Botão de Bloqueio Rápido de Horário */}
          <button
            type="button"
            onClick={() => setIsBlockModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Ban className="w-4 h-4 text-purple-200" />
            <span>Bloquear Horário / Pausa</span>
          </button>
        </div>
      </div>

      {/* Alerta quando a Agenda Online estiver Fechada */}
      {!isScheduleOpen && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <Ban className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">
                A agenda online está fechada no momento
              </h4>
              <p className="text-[11px] text-amber-800">
                Novos agendamentos pela vitrine pública estão pausados. A equipe continua podendo gerenciar horários internos normalmente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleScheduleStatus}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shrink-0 shadow-xs cursor-pointer transition-all"
          >
            Abrir Agenda Agora
          </button>
        </div>
      )}

      {/* Notificação Toast Flutuante de Status */}
      {scheduleStatusMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-3 text-xs border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className={`w-2 h-2 rounded-full ${isScheduleOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span>{scheduleStatusMessage}</span>
        </div>
      )}

      {/* 2. VISUALIZAÇÃO DA AGENDA: MÊS vs. DIA */}
      {viewMode === 'MONTH' ? (
        /* GRADE MENSAL DA AGENDA (AGENDA DO MÊS OTIMIZADA PARA MÚLTIPLOS AGENDAMENTOS) */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-6 overflow-hidden">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {WEEKDAY_NAMES.map((name, i) => (
              <div
                key={name}
                className={`py-2 text-xs font-bold uppercase tracking-wider ${
                  i === 0 || i === 6 ? 'text-purple-600' : 'text-slate-500'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Grid de Dias do Calendário Mensal */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((dayItem, index) => {
              const dayApps = appointments.filter((app) => app.date === dayItem.dateString);
              const hasApps = dayApps.length > 0;
              const isSelected = selectedDate === dayItem.dateString;
              const maxVisibleChips = 3;
              const overflowCount = dayApps.length - maxVisibleChips;

              return (
                <div
                  key={`${dayItem.dateString}-${index}`}
                  onClick={() => {
                    setSelectedDate(dayItem.dateString);
                    if (hasApps) {
                      setDayModalDate(dayItem.dateString);
                    }
                  }}
                  className={`min-h-[120px] sm:min-h-[135px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                    dayItem.isCurrentMonth
                      ? dayItem.isToday
                        ? 'bg-purple-50/40 border-purple-400 ring-2 ring-purple-600/15'
                        : isSelected
                        ? 'bg-slate-50 border-purple-300 ring-1 ring-purple-300'
                        : 'bg-white border-slate-200/80 hover:border-purple-300 hover:bg-slate-50/60'
                      : 'bg-slate-50/40 border-slate-100 opacity-40'
                  }`}
                >
                  {/* Topo da Célula: Dia do Mês + Badge Total */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold rounded-lg px-2 py-0.5 ${
                        dayItem.isToday
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : dayItem.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {String(dayItem.dayNumber).padStart(2, '0')}
                    </span>

                    {hasApps && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          dayApps.length >= 4
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-purple-50 text-purple-700 border-purple-200/80'
                        }`}
                        title={`${dayApps.length} agendamentos neste dia`}
                      >
                        {dayApps.length} {dayApps.length === 1 ? 'cliente' : 'clientes'}
                      </span>
                    )}
                  </div>

                  {/* Chips Compactos de Agendamentos (Otimizados para Múltiplos no mesmo dia) */}
                  <div className="space-y-1 flex-1">
                    {dayApps.slice(0, maxVisibleChips).map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(app);
                        }}
                        className="w-full text-left px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 group cursor-pointer hover:shadow-2xs text-[11px]"
                        style={{
                          backgroundColor: `${app.professionalColor}12`,
                          borderColor: `${app.professionalColor}35`,
                          borderLeftWidth: '3px',
                          borderLeftColor: app.professionalColor
                        }}
                        title={`Clique para ver detalhes de ${app.clientName}`}
                      >
                        <span className="font-mono text-[10px] font-bold text-slate-700 shrink-0">
                          {app.startTime}
                        </span>
                        <span className="font-semibold text-slate-800 truncate group-hover:text-purple-700">
                          {app.clientName.split(' ')[0]}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate hidden xl:inline">
                          • {app.serviceName}
                        </span>
                      </button>
                    ))}

                    {/* Botão Indicador de Agendamentos Adicionais (+X mais) */}
                    {overflowCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDayModalDate(dayItem.dateString);
                        }}
                        className="w-full py-1 px-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200/70 text-purple-700 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Ver todos os agendamentos deste dia"
                      >
                        <span>+ {overflowCount} mais agendamentos</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de Rodapé com Legenda de Profissionais & Atalhos */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                Profissionais:
              </span>
              {professionals.map((prof) => (
                <div key={prof.id} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: prof.color }}
                  />
                  <span className="text-xs font-semibold text-slate-700">{prof.name}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-600" />
              <span>Clique no dia ou no cliente para abrir a ficha completa</span>
            </div>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO DIÁRIA EM COLUNAS POR PROFISSIONAL */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto pb-6">
          {professionals.map((prof) => {
            const profApps = dayAppointments.filter(
              (app) => app.professionalId === prof.id
            );

            return (
              <div
                key={prof.id}
                className="bg-slate-50/70 rounded-3xl border border-slate-200/80 p-4 flex flex-col min-w-[280px]"
              >
                {/* Header da Coluna do Profissional */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: prof.color }}
                    />
                    <h3 className="text-sm font-semibold text-slate-800">{prof.name}</h3>
                  </div>
                  <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/70">
                    {profApps.length}
                  </span>
                </div>

                {/* Cards de Agendamentos */}
                <div className="space-y-3 flex-1">
                  {profApps.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Nenhum agendamento para este profissional nesta data.
                    </div>
                  ) : (
                    profApps.map((app) => {
                      const isDepositRemaining =
                        app.depositPaid && app.totalPrice > app.depositAmount;

                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedAppointment(app)}
                          className={`p-4 rounded-2xl bg-white border transition-all shadow-xs cursor-pointer hover:border-purple-300 ${
                            app.status === 'IN_SERVICE'
                              ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                              : app.status === 'COMPLETED'
                              ? 'border-slate-200 opacity-70'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Horário & Status */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {app.startTime} - {app.endTime}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                app.status
                              )}`}
                            >
                              {getStatusLabel(app.status)}
                            </span>
                          </div>

                          {/* Nome do Cliente & Aniversário */}
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-sm font-semibold text-slate-800 truncate">
                              {app.clientName}
                            </strong>
                            {app.isBirthday && (
                              <span
                                title="Aniversariante do dia!"
                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200/80"
                              >
                                🎂
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 mb-3">{app.serviceName}</p>

                          {/* Badges de Sinal PIX */}
                          <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] font-mono">
                            {app.depositPaid ? (
                              <>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/80">
                                  Sinal: R$ {app.depositAmount.toFixed(2)}
                                </span>
                                {isDepositRemaining && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200/80">
                                    Restante: R${' '}
                                    {(app.totalPrice - app.depositAmount).toFixed(2)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50/60 text-purple-800 font-medium border border-purple-200/60">
                                Total: R$ {app.totalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Ações Rápidas */}
                          <div
                            className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5">
                              {app.status !== 'IN_SERVICE' && app.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(app.id, 'IN_SERVICE')}
                                  title="Iniciar Atendimento"
                                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span className="text-[11px]">Iniciar</span>
                                </button>
                              )}

                              {app.status === 'IN_SERVICE' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                                  title="Concluir Atendimento"
                                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-purple-600/20 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Concluir</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(app.id, 'NO_SHOW')}
                                title="Registrar Falta"
                                className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* WhatsApp do cliente */}
                            <a
                              href={`https://wa.me/55${app.clientPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 transition-colors"
                              title="Chamar no WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MODAL DA AGENDA DO DIA (QUANDO CLICA NO DIA OU EM "+X MAIS AGENDAMENTOS") */}
      <AnimatePresence>
        {dayModalDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDayModalDate(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-10 border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header do Modal da Agenda do Dia */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {dayModalDate.split('-')[2]}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Agenda de {new Date(`${dayModalDate}T12:00:00`).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {modalDayAppointments.length} agendamento(s) programado(s) para este dia
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(dayModalDate);
                      setViewMode('DAY');
                      setDayModalDate(null);
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    <span>Ver em Colunas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDayModalDate(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filtro por Profissional */}
              <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                  <Filter className="w-3 h-3" /> Filtrar:
                </span>
                <button
                  type="button"
                  onClick={() => setDayModalProfFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    dayModalProfFilter === 'ALL'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({appointments.filter((a) => a.date === dayModalDate).length})
                </button>
                {professionals.map((prof) => {
                  const count = appointments.filter(
                    (a) => a.date === dayModalDate && a.professionalId === prof.id
                  ).length;
                  if (count === 0) return null;

                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setDayModalProfFilter(prof.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                        dayModalProfFilter === prof.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: prof.color }}
                      />
                      <span>{prof.name}</span>
                      <span className="opacity-75 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Lista Completa de Todos os Clientes do Dia */}
              <div className="p-6 space-y-3 overflow-y-auto flex-1">
                {modalDayAppointments.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Nenhum agendamento encontrado para este filtro.
                  </div>
                ) : (
                  modalDayAppointments.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setSelectedAppointment(app)}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5"
                          style={{
                            backgroundColor: `${app.professionalColor}18`,
                            color: app.professionalColor
                          }}
                        >
                          {app.startTime}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                              {app.clientName}
                            </h4>
                            {app.isBirthday && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                🎂
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                app.status
                              )}`}
                            >
                              {getStatusLabel(app.status)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-0.5">{app.serviceName}</p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: app.professionalColor }}
                              />
                              {app.professionalName}
                            </span>
                            <span>•</span>
                            <span>R$ {app.totalPrice.toFixed(2)}</span>
                            {app.depositPaid && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-medium">
                                  Sinal R$ {app.depositAmount.toFixed(2)} pago
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação na Linha */}
                      <div
                        className="flex items-center gap-2 self-end sm:self-center shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`https://wa.me/55${app.clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => setSelectedAppointment(app)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400">
                  Total faturado no dia: R${' '}
                  {modalDayAppointments
                    .reduce((acc, curr) => acc + curr.totalPrice, 0)
                    .toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => setDayModalDate(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MODAL DE INFORMAÇÕES DO AGENDAMENTO (DETALHES COMPLETOS) */}
      <AnimatePresence>
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppointment(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 border border-slate-100 overflow-hidden"
            >
              {/* Header do Modal */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-sm">
                    {selectedAppointment.clientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Informações do Agendamento
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Código: #{selectedAppointment.id.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo com Informações do Agendamento */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Cartão do Cliente com Contato Direto */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">
                        {selectedAppointment.clientName}
                      </h4>
                      {selectedAppointment.isBirthday && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                          🎂 Aniversariante do Mês
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                      {selectedAppointment.clientPhone}
                    </span>
                  </div>

                  <a
                    href={`https://wa.me/55${selectedAppointment.clientPhone.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(
                      selectedAppointment.clientName
                    )}%2C%20confirmamos%20seu%20agendamento%20de%20${encodeURIComponent(
                      selectedAppointment.serviceName
                    )}%20para%20as%20${selectedAppointment.startTime}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {/* Grade de Detalhes: Procedimento, Profissional, Data e Horário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Procedimento
                    </span>
                    <strong className="text-xs font-bold text-slate-800 block">
                      {selectedAppointment.serviceName}
                    </strong>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {selectedAppointment.durationMinutes} minutos de duração
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Profissional
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: selectedAppointment.professionalColor }}
                      />
                      <strong className="text-xs font-bold text-slate-800 truncate">
                        {selectedAppointment.professionalName}
                      </strong>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Bancada reservada
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Data Marcada
                    </span>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedAppointment.date.split('-').reverse().join('/')}
                    </div>
                    <span className="text-xs font-mono text-purple-700 font-semibold block mt-0.5">
                      {selectedAppointment.startTime} às {selectedAppointment.endTime}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Status Atual
                    </span>
                    <span
                      className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border mt-0.5 ${getStatusBadgeClass(
                        selectedAppointment.status
                      )}`}
                    >
                      {getStatusLabel(selectedAppointment.status)}
                    </span>
                  </div>
                </div>

                {/* Bloco Financeiro e Valores */}
                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Valor Total do Serviço:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      R$ {selectedAppointment.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Sinal PIX Antecipado:</span>
                    <span
                      className={`font-semibold font-mono ${
                        selectedAppointment.depositPaid
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {selectedAppointment.depositPaid
                        ? `R$ ${selectedAppointment.depositAmount.toFixed(2)} (Pago)`
                        : 'Sem sinal'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs font-bold">
                    <span className="text-purple-900">Restante no Balcão:</span>
                    <span className="text-purple-700 font-mono text-sm">
                      R${' '}
                      {(
                        selectedAppointment.totalPrice -
                        (selectedAppointment.depositPaid
                          ? selectedAppointment.depositAmount
                          : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Observações do Agendamento */}
                {selectedAppointment.notes && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Observações / Preferências
                    </span>
                    <p className="text-slate-600 italic">
                      "{selectedAppointment.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Rodapé com Ações Rápidas de Atendimento */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedAppointment.status !== 'IN_SERVICE' &&
                    selectedAppointment.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedAppointment.id, 'IN_SERVICE')}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Iniciar Atendimento</span>
                      </button>
                    )}

                  {selectedAppointment.status === 'IN_SERVICE' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'COMPLETED')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluir Atendimento</span>
                    </button>
                  )}

                  {selectedAppointment.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'CANCELLED')}
                      className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL DE BLOQUEIO RÁPIDO (ScheduleBlock) */}
      <AnimatePresence>
        {isBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBlockModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100"
            >
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-semibold text-slate-800">
                Bloquear Horário na Agenda
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Impede novos agendamentos neste intervalo.
              </p>

              <form onSubmit={handleCreateBlock} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Profissional
                  </label>
                  <select
                    value={blockProfId}
                    onChange={(e) => setBlockProfId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Início
                    </label>
                    <input
                      type="time"
                      value={blockStartTime}
                      onChange={(e) => setBlockStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Fim
                    </label>
                    <input
                      type="time"
                      value={blockEndTime}
                      onChange={(e) => setBlockEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Motivo da Pausa
                  </label>
                  <input
                    type="text"
                    required
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ex: Almoço, Dentista, Reunião"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all mt-4 cursor-pointer"
                >
                  Confirmar Bloqueio
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
