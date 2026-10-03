'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Headphones,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  CheckSquare,
  Square,
  Lock,
  MessageSquare,
  Plus
} from 'lucide-react';

interface TicketItem {
  id: string;
  protocol: string;
  tenantName: string;
  tenantNiche: string;
  tenantPlan: string;
  ownerName: string;
  ownerPhone: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function AdminSuportePage() {
  const [tickets, setTickets] = useState<TicketItem[]>([
    {
      id: 'tk-1',
      protocol: '#TK-2026-0842',
      tenantName: 'Salão Imperial & Spa',
      tenantNiche: 'BEAUTY_SALON',
      tenantPlan: 'EQUIPE_PRO',
      ownerName: 'Mariana Esteves',
      ownerPhone: '11987654321',
      subject: 'Configuração de Sinal PIX para Sábados',
      category: 'TECHNICAL_ISSUE',
      status: 'OPEN',
      priority: 'HIGH'
    },
    {
      id: 'tk-2',
      protocol: '#TK-2026-0790',
      tenantName: 'Barbearia Rota 66',
      tenantNiche: 'BARBERSHOP',
      tenantPlan: 'SOLO',
      ownerName: 'Ricardo Duarte',
      ownerPhone: '11977778888',
      subject: 'Dúvida sobre cobrança de agendamento extra',
      category: 'BILLING',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM'
    }
  ]);

  const [selectedTicket, setSelectedTicket] = useState<TicketItem>(tickets[0]);
  const [internalNotes, setInternalNotes] = useState('Cliente solicitou apoio para ativar o sinal de R$ 30 aos sábados.');
  const [replyMessage, setReplyMessage] = useState('');

  // Checklist Operacional Dinâmica (TicketTask)
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: 't1', title: 'Verificar status da instância WhatsApp na Evolution API', completed: true },
    { id: 't2', title: 'Validar credenciais do gateway Asaas do estabelecimento', completed: true },
    { id: 't3', title: 'Ajustar regra de sinal em configurações do salão', completed: false },
    { id: 't4', title: 'Confirmar funcionamento com o cliente via WhatsApp', completed: false }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, title: newTaskTitle.trim(), completed: false }
    ]);
    setNewTaskTitle('');
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100) || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Central de Atendimento & Chamados
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Suporte às lojas com checklist operacional e notas internas privadas.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Coluna 1: Lista de Chamados */}
        <div className="bg-[#0F172A] rounded-3xl border border-white/5 p-4 flex flex-col overflow-y-auto space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 px-2">
            Chamados Abertos ({tickets.length})
          </span>

          {tickets.map((t) => {
            const isSelected = selectedTicket.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTicket(t)}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-amber-400">
                    {t.protocol}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {t.priority}
                  </span>
                </div>

                <strong className="text-sm font-bold text-white block mb-0.5">
                  {t.subject}
                </strong>
                <span className="text-xs text-slate-400 block">{t.tenantName}</span>
              </button>
            );
          })}
        </div>

        {/* Coluna 2: Chat & Detalhes da Loja */}
        <div className="bg-[#0F172A] rounded-3xl border border-white/5 p-4 flex flex-col justify-between overflow-hidden">
          {/* Topo da Loja */}
          <div className="pb-3 border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {selectedTicket.tenantName}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Dono: {selectedTicket.ownerName} ({selectedTicket.ownerPhone}) • Plano: {selectedTicket.tenantPlan}
              </span>
            </div>

            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-slate-800 text-slate-300">
              {selectedTicket.status}
            </span>
          </div>

          {/* Histórico Simulado */}
          <div className="flex-1 py-4 overflow-y-auto space-y-3 text-xs">
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-white/5 text-slate-300">
              <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                {selectedTicket.ownerName} • 10:05
              </span>
              <p>Olá! Gostaria de tirar uma dúvida sobre como configurar a cobrança de sinal via PIX para sábados.</p>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-slate-200">
              <span className="text-[10px] text-amber-400 font-semibold block mb-1">
                Equipe Super Admin • 10:08
              </span>
              <p>Você pode ativar o sinal em Configurações &rarr; Sinal &amp; No-Show, definindo o valor fixo ou percentual.</p>
            </div>
          </div>

          {/* Campo de Resposta */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setReplyMessage('');
            }}
            className="pt-3 border-t border-white/10 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Responder ao salão..."
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-900 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-white"
            />
            <button
              type="submit"
              className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Coluna 3: Checklist Operacional (TicketTask) & Notas Privadas */}
        <div className="bg-[#0F172A] rounded-3xl border border-white/5 p-5 flex flex-col justify-between overflow-y-auto space-y-5">
          {/* Checklist Operacional Dinâmica */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                <span>Checklist Operacional</span>
              </h3>
              <span className="text-xs font-mono font-bold text-white">
                {progressPercent}%
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left text-xs hover:bg-slate-900/60 transition-colors"
                >
                  {task.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`${
                      task.completed ? 'line-through text-slate-500' : 'text-slate-300'
                    }`}
                  >
                    {task.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Adicionar Nova Tarefa */}
            <form onSubmit={handleAddTask} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="+ Nova tarefa no checklist..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-lg outline-none text-white placeholder-slate-500"
              />
              <button
                type="submit"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Notas Privadas Internas */}
          <div className="pt-4 border-t border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Notas Privadas (Invisíveis ao Cliente)</span>
            </span>

            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full p-3 text-xs bg-slate-900 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-slate-300 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
