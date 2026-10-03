'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Shield,
  Cake,
  Ban,
  Phone,
  CheckCircle2,
  XCircle,
  Play,
  X
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface AppointmentCard {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  isBirthday?: boolean;
}

interface ProfessionalColumn {
  id: string;
  name: string;
  color: string;
  appointments: AppointmentCard[];
}

export default function DashboardAgendaPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [professionals, setProfessionals] = useState<ProfessionalColumn[]>([
    {
      id: 'prof-1',
      name: 'Carlos Barbeiro',
      color: '#7C3AED',
      appointments: [
        {
          id: 'app-1',
          clientName: 'Rodrigo Medeiros',
          clientPhone: '11987654321',
          serviceName: 'Corte Degradê + Barba',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          totalPrice: 85.0,
          depositAmount: 30.0,
          depositPaid: true,
          status: 'IN_SERVICE',
          isBirthday: true
        },
        {
          id: 'app-2',
          clientName: 'Guilherme Santos',
          clientPhone: '11977778888',
          serviceName: 'Corte Clássico',
          startTime: '10:30',
          endTime: '11:15',
          durationMinutes: 45,
          totalPrice: 50.0,
          depositAmount: 0,
          depositPaid: false,
          status: 'CONFIRMED'
        }
      ]
    },
    {
      id: 'prof-2',
      name: 'Juliana Silva',
      color: '#059669',
      appointments: [
        {
          id: 'app-3',
          clientName: 'Beatriz Costa',
          clientPhone: '11966665555',
          serviceName: 'Mechas + Tratamento',
          startTime: '09:30',
          endTime: '12:30',
          durationMinutes: 180,
          totalPrice: 320.0,
          depositAmount: 100.0,
          depositPaid: true,
          status: 'CONFIRMED'
        }
      ]
    },
    {
      id: 'prof-3',
      name: 'Lucas Hair',
      color: '#D97706',
      appointments: [
        {
          id: 'app-4',
          clientName: 'Mariana Duarte',
          clientPhone: '11955554444',
          serviceName: 'Escova Modelada',
          startTime: '11:00',
          endTime: '11:45',
          durationMinutes: 45,
          totalPrice: 65.0,
          depositAmount: 0,
          depositPaid: false,
          status: 'PENDING'
        }
      ]
    }
  ]);

  // Modal de Bloqueio Rápido (ScheduleBlock)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockProfId, setBlockProfId] = useState(professionals[0]?.id || '');
  const [blockStartTime, setBlockStartTime] = useState('12:00');
  const [blockEndTime, setBlockEndTime] = useState('13:00');
  const [blockReason, setBlockReason] = useState('Almoço / Descanso');

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBlockModalOpen(false);
  };

  const handleUpdateStatus = (
    profId: string,
    appId: string,
    newStatus: AppointmentCard['status']
  ) => {
    setProfessionals((prev) =>
      prev.map((prof) => {
        if (prof.id !== profId) return prof;
        return {
          ...prof,
          appointments: prof.appointments.map((app) =>
            app.id === appId ? { ...app, status: newStatus } : app
          )
        };
      })
    );
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* 1. Barra de Ações da Agenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Navegador de Data */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="p-2 rounded-xl bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 transition-colors"
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
            className="p-2 rounded-xl bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 transition-all shadow-2xs"
          >
            Hoje
          </button>
        </div>

        {/* Botão de Bloqueio Rápido de Horário */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBlockModalOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-purple-600/20"
          >
            <Ban className="w-4 h-4 text-purple-200" />
            <span>Bloquear Horário / Pausa</span>
          </button>
        </div>
      </div>

      {/* 2. Visualização Multi-Profissional em Colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto pb-6">
        {professionals.map((prof) => (
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
                <h3 className="text-sm font-semibold text-slate-800">
                  {prof.name}
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/70">
                {prof.appointments.length}
              </span>
            </div>

            {/* Cards de Agendamentos */}
            <div className="space-y-3 flex-1">
              {prof.appointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Nenhum agendamento para este profissional nesta data.
                </div>
              ) : (
                prof.appointments.map((app) => {
                  const isDepositRemaining =
                    app.depositPaid && app.totalPrice > app.depositAmount;

                  return (
                    <motion.div
                      key={app.id}
                      layout
                      className={`p-4 rounded-2xl bg-white border transition-all shadow-xs ${
                        app.status === 'IN_SERVICE'
                          ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                          : app.status === 'COMPLETED'
                          ? 'border-slate-200 opacity-70'
                          : 'border-slate-200 hover:border-slate-300'
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
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            app.status === 'IN_SERVICE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : app.status === 'CONFIRMED'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : app.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {app.status === 'IN_SERVICE'
                            ? 'Em Atendimento'
                            : app.status === 'CONFIRMED'
                            ? 'Confirmado'
                            : app.status === 'COMPLETED'
                            ? 'Atendido'
                            : 'Pendente'}
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

                      {/* Ações da Bancada (1 toque) */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          {app.status !== 'IN_SERVICE' && app.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(prof.id, app.id, 'IN_SERVICE')
                              }
                              title="Sentou na Cadeira"
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[11px]">Iniciar</span>
                            </button>
                          )}

                          {app.status === 'IN_SERVICE' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(prof.id, app.id, 'COMPLETED')
                              }
                              title="Concluir Atendimento"
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-purple-600/20"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Concluir</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(prof.id, app.id, 'NO_SHOW')
                            }
                            title="Registrar Falta (No-show)"
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs transition-colors"
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
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE BLOQUEIO RÁPIDO (ScheduleBlock) */}
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
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
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
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all mt-4"
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
