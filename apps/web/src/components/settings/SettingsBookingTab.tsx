'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  CalendarDays,
  Check,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  Ban,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { TenantSettings } from './types';
import { api } from '@/lib/api';

interface SettingsBookingTabProps {
  settings: TenantSettings;
  onChange: (field: keyof TenantSettings, value: any) => void;
}

interface WeekdayConfig {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  name: string;
  shortName: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
}

interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'NATIONAL_FIXED' | 'NATIONAL_MOVABLE';
  formattedDate: string;
  dayOfWeek: number;
  isBlocked: boolean;
  isException: boolean;
}

interface CustomBlock {
  id: string;
  date: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  reason: string;
  isPaused: boolean;
}

const DEFAULT_WEEKDAYS: WeekdayConfig[] = [
  { dayOfWeek: 1, name: 'Segunda-feira', shortName: 'SEG', isOpen: true, startTime: '09:00', endTime: '19:00', slotIntervalMinutes: 30 },
  { dayOfWeek: 2, name: 'Terça-feira', shortName: 'TER', isOpen: true, startTime: '09:00', endTime: '19:00', slotIntervalMinutes: 30 },
  { dayOfWeek: 3, name: 'Quarta-feira', shortName: 'QUA', isOpen: true, startTime: '09:00', endTime: '19:00', slotIntervalMinutes: 30 },
  { dayOfWeek: 4, name: 'Quinta-feira', shortName: 'QUI', isOpen: true, startTime: '09:00', endTime: '19:00', slotIntervalMinutes: 30 },
  { dayOfWeek: 5, name: 'Sexta-feira', shortName: 'SEX', isOpen: true, startTime: '09:00', endTime: '19:00', slotIntervalMinutes: 30 },
  { dayOfWeek: 6, name: 'Sábado', shortName: 'SÁB', isOpen: true, startTime: '09:00', endTime: '18:00', slotIntervalMinutes: 30 },
  { dayOfWeek: 0, name: 'Domingo', shortName: 'DOM', isOpen: false, startTime: '09:00', endTime: '18:00', slotIntervalMinutes: 30 }
];

export const SettingsBookingTab: React.FC<SettingsBookingTabProps> = ({
  settings,
  onChange
}) => {
  // Estado da Grade Semanal
  const [weekdays, setWeekdays] = useState<WeekdayConfig[]>(DEFAULT_WEEKDAYS);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false);

  // Estado de Feriados Nacionais
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [showAllHolidays, setShowAllHolidays] = useState(false);

  // Estado de Feriados Municipais / Recessos Customizados
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  // Carrega regras semanais da API
  const loadScheduleRules = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const res = await api.get('/availability-rules');
      const rules = res.data;

      // Filtra apenas regras gerais do tenant (professionalId === null)
      const generalRules = Array.isArray(rules)
        ? rules.filter((r: any) => !r.professionalId)
        : [];

      if (generalRules.length > 0) {
        setWeekdays((prev) =>
          prev.map((item) => {
            const rule = generalRules.find((r: any) => r.dayOfWeek === item.dayOfWeek);
            if (rule) {
              return {
                ...item,
                isOpen: rule.isActive ?? true,
                startTime: rule.startTime || '09:00',
                endTime: rule.endTime || '19:00',
                slotIntervalMinutes: rule.slotIntervalMinutes || 30
              };
            }
            return {
              ...item,
              isOpen: false
            };
          })
        );
      } else {
        // Se ainda não salvou, inicializa com horários do tenant
        setWeekdays((prev) =>
          prev.map((item) => {
            if (item.dayOfWeek === 0) return { ...item, isOpen: false };
            return {
              ...item,
              startTime: settings.openingTime || '09:00',
              endTime: settings.closingTime || '19:00'
            };
          })
        );
      }
    } catch (err) {
      console.error('Erro ao carregar regras de disponibilidade:', err);
    } finally {
      setLoadingSchedule(false);
    }
  }, [settings.openingTime, settings.closingTime]);

  // Carrega feriados nacionais
  const loadHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const res = await api.get('/availability-rules/holidays');
      if (res.data?.holidays) {
        setHolidays(res.data.holidays);
      }
    } catch (err) {
      console.error('Erro ao carregar feriados nacionais:', err);
    } finally {
      setLoadingHolidays(false);
    }
  }, []);

  // Carrega bloqueios de feriados municipais e recessos da loja
  const loadBlocks = useCallback(async () => {
    setLoadingBlocks(true);
    try {
      const res = await api.get('/blocks');
      if (Array.isArray(res.data)) {
        // Filtra bloqueios gerais de data inteira da loja
        const storeBlocks = res.data.filter(
          (b: any) => !b.professionalId && b.date
        );
        setCustomBlocks(storeBlocks);
      }
    } catch (err) {
      console.error('Erro ao carregar bloqueios do estabelecimento:', err);
    } finally {
      setLoadingBlocks(false);
    }
  }, []);

  useEffect(() => {
    loadScheduleRules();
    loadHolidays();
    loadBlocks();
  }, [loadScheduleRules, loadHolidays, loadBlocks]);

  // Manipulação dos dias da semana
  const handleToggleDay = (dayOfWeek: number) => {
    setWeekdays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, isOpen: !d.isOpen } : d))
    );
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setWeekdays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  // Replicar horário do primeiro dia aberto para todos os outros dias abertos
  const handleCopyHoursToAllOpenDays = () => {
    const firstOpen = weekdays.find((d) => d.isOpen);
    if (!firstOpen) return;

    setWeekdays((prev) =>
      prev.map((d) =>
        d.isOpen
          ? {
              ...d,
              startTime: firstOpen.startTime,
              endTime: firstOpen.endTime
            }
          : d
      )
    );
  };

  // Salvar Grade Semanal na API via /availability-rules/batch
  const handleSaveWeekdays = async () => {
    setSavingSchedule(true);
    setScheduleSaveSuccess(false);

    try {
      await api.put('/availability-rules/batch', {
        professionalId: null,
        days: weekdays.map((w) => ({
          dayOfWeek: w.dayOfWeek,
          isOpen: w.isOpen,
          startTime: w.startTime,
          endTime: w.endTime,
          slotIntervalMinutes: settings.slotIntervalMinutes || 30
        }))
      });

      // Também sincroniza os horários gerais de abertura e fechamento
      const openDays = weekdays.filter((d) => d.isOpen);
      if (openDays.length > 0) {
        const sortedStarts = [...openDays].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const sortedEnds = [...openDays].sort((a, b) => b.endTime.localeCompare(a.endTime));
        const newOpen = sortedStarts[0].startTime;
        const newClose = sortedEnds[0].endTime;
        onChange('openingTime', newOpen);
        onChange('closingTime', newClose);
        try {
          await api.put('/tenants/me/settings', {
            openingTime: newOpen,
            closingTime: newClose
          });
        } catch (settingsSyncErr) {
          console.warn('Aviso: sincronização secundária de horários no tenant:', settingsSyncErr);
        }
      }

      setScheduleSaveSuccess(true);
      setTimeout(() => setScheduleSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar grade semanal:', err);
      alert(err?.response?.data?.message || 'Erro ao salvar grade semanal de atendimento.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Toggle de exceção em feriado individual (abrir no feriado)
  const handleToggleHolidayException = (dateStr: string) => {
    const currentExceptions: string[] = Array.isArray(settings.holidayExceptions)
      ? [...settings.holidayExceptions]
      : [];

    let updatedExceptions: string[];
    if (currentExceptions.includes(dateStr)) {
      // Remove exceção -> volta a ser bloqueado
      updatedExceptions = currentExceptions.filter((d) => d !== dateStr);
    } else {
      // Adiciona exceção -> salão opta por abrir neste feriado
      updatedExceptions = [...currentExceptions, dateStr];
    }

    onChange('holidayExceptions', updatedExceptions);

    // Atualiza estado local de feriados para refletir imediatamente
    setHolidays((prev) =>
      prev.map((h) => {
        if (h.date === dateStr) {
          const isException = updatedExceptions.includes(dateStr);
          const isBlocked = (settings.blockNationalHolidays ?? true) && !isException;
          return { ...h, isException, isBlocked };
        }
        return h;
      })
    );
  };

  // Adicionar feriado municipal / recesso
  const handleAddCustomBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockDate || !newBlockReason.trim()) return;

    setSavingBlock(true);
    try {
      const res = await api.post('/blocks', {
        professionalId: null,
        date: newBlockDate,
        startTime: '00:00',
        endTime: '23:59',
        reason: newBlockReason.trim()
      });

      setCustomBlocks((prev) => [...prev, res.data]);
      setNewBlockDate('');
      setNewBlockReason('');
      setIsAddingBlock(false);
    } catch (err: any) {
      console.error('Erro ao criar bloqueio:', err);
      alert(err?.response?.data?.message || 'Erro ao registrar feriado/recesso.');
    } finally {
      setSavingBlock(false);
    }
  };

  // Excluir feriado municipal / recesso
  const handleDeleteCustomBlock = async (id: string) => {
    try {
      await api.delete(`/blocks/${id}`);
      setCustomBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir bloqueio:', err);
      alert('Erro ao excluir feriado/recesso.');
    }
  };

  const blockNational = settings.blockNationalHolidays ?? true;
  const displayedHolidays = showAllHolidays ? holidays : holidays.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. GRADE SEMANAL DE ATENDIMENTO (DIAS E HORÁRIOS POR DIA) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Grade Semanal de Atendimento
              </h3>
              <p className="text-xs text-slate-500">
                Escolha os dias que seu estabelecimento abre e os horários de início e término de cada dia.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyHoursToAllOpenDays}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors self-start sm:self-auto cursor-pointer"
            title="Copia os horários do primeiro dia aberto para os demais dias ativos"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar para dias abertos</span>
          </button>
        </div>

        {loadingSchedule ? (
          <div className="py-8 flex items-center justify-center text-xs text-slate-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
            <span>Carregando grade semanal...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {weekdays.map((day) => (
              <div
                key={day.dayOfWeek}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all ${
                  day.isOpen
                    ? 'bg-white border-slate-200/90 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200/60 opacity-70'
                }`}
              >
                {/* Nome do Dia e Toggle de Status */}
                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-56 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold tracking-tight ${
                        day.isOpen
                          ? 'bg-purple-100/70 text-purple-800'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {day.shortName}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{day.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {day.isOpen ? 'Atendimento ativo' : 'Fechado o dia todo'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleDay(day.dayOfWeek)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      day.isOpen
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200/80 ring-1 ring-emerald-600/20'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {day.isOpen ? 'Aberto' : 'Fechado'}
                  </button>
                </div>

                {/* Horários de Início e Término */}
                {day.isOpen ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Abertura:</span>
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(e) =>
                          handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)
                        }
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      />
                    </div>

                    <span className="text-slate-300 font-bold">às</span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Fechamento:</span>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(e) =>
                          handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)
                        }
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 italic">
                    <Ban className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nenhum horário disponível para agendamento online neste dia</span>
                  </div>
                )}
              </div>
            ))}

            {/* Rodapé da Grade Semanal com Botão Salvar Grade */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                As alterações na grade semanal entram em vigor imediatamente na vitrine pública.
              </p>

              <button
                type="button"
                onClick={handleSaveWeekdays}
                disabled={savingSchedule}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-700 hover:bg-purple-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingSchedule ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando grade...</span>
                  </>
                ) : scheduleSaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Grade semanal salva!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Grade Semanal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. GESTÃO INTELIGENTE DE FERIADOS NACIONAIS & RECESSOS */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Gestão Inteligente de Feriados & Recessos
            </h3>
            <p className="text-xs text-slate-500">
              Proteja sua agenda contra no-shows em feriados oficiais ou configure férias coletivas.
            </p>
          </div>
        </div>

        {/* Toggle Mestre: Bloquear Feriados Nacionais */}
        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <label className="text-sm font-bold text-slate-900">
                Bloquear agendamentos automaticamente em Feriados Nacionais
              </label>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Quando ativado, os clientes não conseguem agendar horários em feriados oficiais brasileiros (Carnaval, Tiradentes, Paixão de Cristo, Independência, Natal, etc.), a menos que você marque uma exceção específica abaixo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onChange('blockNationalHolidays', !blockNational)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              blockNational
                ? 'bg-purple-700 text-white shadow-xs hover:bg-purple-800'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {blockNational ? 'Proteção Ativada' : 'Permitir Feriados'}
          </button>
        </div>

        {/* Lista de Feriados Nacionais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Próximos Feriados Oficiais do Brasil
            </p>
            {holidays.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllHolidays(!showAllHolidays)}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllHolidays ? 'Ver menos' : `Ver todos (${holidays.length})`}</span>
                {showAllHolidays ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {loadingHolidays ? (
            <div className="py-4 text-center text-xs text-slate-400">
              Carregando calendário de feriados...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedHolidays.map((holiday) => {
                const isException = (settings.holidayExceptions || []).includes(holiday.date);
                const isBlocked = blockNational && !isException;

                return (
                  <div
                    key={holiday.date}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isBlocked
                        ? 'bg-slate-50/80 border-slate-200 text-slate-800'
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {holiday.formattedDate}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            isBlocked
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-200 text-emerald-800'
                          }`}
                        >
                          {isBlocked ? 'Fechado' : 'Aberto'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5 line-clamp-1">
                        {holiday.name}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleHolidayException(holiday.date)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        isException
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title={
                        isException
                          ? 'Salão optou por abrir nesta data (exceção ativa)'
                          : 'Clique para permitir agendamentos neste feriado'
                      }
                    >
                      {isException ? 'Vou Abrir' : 'Abrir neste dia'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feriados Municipais / Recessos Customizados do Estabelecimento */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Feriados Municipais & Recessos da Loja
              </p>
              <p className="text-xs text-slate-500">
                Cadastre datas comemorativas da sua cidade ou períodos de recesso coletivo da equipe.
              </p>
            </div>

            {!isAddingBlock && (
              <button
                type="button"
                onClick={() => setIsAddingBlock(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Recesso / Feriado Local</span>
              </button>
            )}
          </div>

          {/* Formulário de Novo Bloqueio */}
          {isAddingBlock && (
            <form
              onSubmit={handleAddCustomBlock}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do Feriado / Recesso
                  </label>
                  <input
                    type="date"
                    required
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo (exibido como aviso)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aniversário da Cidade, Recesso de Fim de Ano"
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBlock(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBlock}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingBlock ? 'Salvando...' : 'Confirmar Bloqueio'}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Feriados Municipais / Recessos Cadastrados */}
          {loadingBlocks ? (
            <div className="py-2 text-xs text-slate-400">Carregando bloqueios...</div>
          ) : customBlocks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhum feriado municipal ou recesso cadastrado no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {customBlocks.map((block) => (
                <div
                  key={block.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-mono text-xs font-bold">
                      {block.date ? block.date.slice(8, 10) : '--'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{block.reason}</p>
                      <p className="text-[11px] text-slate-500">
                        {block.date
                          ? new Date(block.date).toLocaleDateString('pt-BR', {
                              timeZone: 'UTC'
                            })
                          : 'Data recorrente'}
                        {' · '}Dia inteiro fechado
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCustomBlock(block.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Excluir bloqueio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. REGRAS GERAIS DE GRADE & ANTECEDÊNCIA */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Regras de Grade & Agendamentos
            </h3>
            <p className="text-xs text-slate-500">
              Controle a granularidade dos horários e limites de antecedência na vitrine online
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Intervalo de Slots */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Intervalo entre Horários na Grade
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Define a granularidade dos horários exibidos para escolha do cliente (ex: 09:00, 09:30, 10:00).
            </p>
            <select
              value={settings.slotIntervalMinutes || 30}
              onChange={(e) => onChange('slotIntervalMinutes', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={15}>A cada 15 minutos</option>
              <option value={20}>A cada 20 minutos</option>
              <option value={30}>A cada 30 minutos (Padrão)</option>
              <option value={45}>A cada 45 minutos</option>
              <option value={60}>A cada 1 hora</option>
            </select>
          </div>

          {/* Buffer Minutes */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Intervalo de Higienização / Folga (Buffer)
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tempo automático adicionado após cada serviço para limpeza de bancada, descanso ou atrasos.
            </p>
            <select
              value={settings.bufferMinutes ?? 15}
              onChange={(e) => onChange('bufferMinutes', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={0}>Sem folga (0 minutos)</option>
              <option value={5}>5 minutos</option>
              <option value={10}>10 minutos</option>
              <option value={15}>15 minutos (Recomendado)</option>
              <option value={20}>20 minutos</option>
              <option value={30}>30 minutos</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Antecedência Mínima */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Antecedência Mínima para Agendar
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Evita que clientes agendem horários de última hora sem tempo para você se preparar.
            </p>
            <select
              value={settings.minAdvanceBookingMinutes ?? 60}
              onChange={(e) => onChange('minAdvanceBookingMinutes', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={0}>Imediato (Sem antecedência mínima)</option>
              <option value={30}>30 minutos antes</option>
              <option value={60}>1 hora antes (Recomendado)</option>
              <option value={120}>2 horas antes</option>
              <option value={240}>4 horas antes</option>
              <option value={1440}>1 dia antes (24 horas)</option>
            </select>
          </div>

          {/* Antecedência Máxima */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Antecedência Máxima da Agenda
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Até quantos dias para frente os clientes podem visualizar e marcar horários futuros.
            </p>
            <select
              value={settings.maxAdvanceBookingDays ?? 30}
              onChange={(e) => onChange('maxAdvanceBookingDays', parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 mt-2 font-medium"
            >
              <option value={7}>Até 7 dias à frente</option>
              <option value={15}>Até 15 dias à frente</option>
              <option value={30}>Até 30 dias à frente (Padrão)</option>
              <option value={60}>Até 60 dias à frente</option>
              <option value={90}>Até 90 dias à frente</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
