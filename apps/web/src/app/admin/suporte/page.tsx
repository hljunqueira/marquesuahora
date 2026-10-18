'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface TicketItem {
  id: string;
  protocol: string;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    phone?: string;
    niche?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  updatedAt: string;
  messages?: Array<{
    id: string;
    senderType: 'TENANT' | 'SUPER_ADMIN';
    content?: string;
    attachmentUrl?: string;
    createdAt: string;
    isInternalNote?: boolean;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    completed: boolean;
    position: number;
  }>;
}

export default function AdminSuportePage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/support/tickets');
      if (Array.isArray(res.data)) {
        setTickets(res.data);
        if (res.data.length > 0 && !selectedTicket) {
          loadTicketDetails(res.data[0].id);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar tickets do admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const res = await api.get(`/support/tickets/${ticketId}`);
      setSelectedTicket(res.data);
    } catch (err) {
      console.warn('Erro ao carregar detalhes do ticket:', err);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSelectTicket = (t: TicketItem) => {
    loadTicketDetails(t.id);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setIsSendingReply(true);
      await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        content: replyMessage.trim()
      });
      setReplyMessage('');
      loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (err) {
      alert('Não foi possível enviar a resposta.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED') => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/support/tickets/${selectedTicket.id}/status`, {
        status: newStatus
      });
      loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (err) {
      alert('Erro ao atualizar status do ticket.');
    }
  };

  const toggleTask = async (taskId: string, currentCompleted: boolean) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/support/tickets/${selectedTicket.id}/tasks/${taskId}`, {
        completed: !currentCompleted
      });
      loadTicketDetails(selectedTicket.id);
    } catch (err) {
      console.warn('Erro ao alternar checklist:', err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedTicket) return;

    try {
      await api.post(`/support/tickets/${selectedTicket.id}/tasks`, {
        title: newTaskTitle.trim()
      });
      setNewTaskTitle('');
      loadTicketDetails(selectedTicket.id);
    } catch (err) {
      alert('Erro ao adicionar tarefa.');
    }
  };

  const completedCount = selectedTicket?.tasks?.filter((t) => t.completed).length || 0;
  const totalTasks = selectedTicket?.tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header Tipográfico Limpo */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Central de Atendimento & Chamados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suporte às lojas com checklist operacional e resposta em até 24h para erros técnicos.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Coluna 1: Lista de Chamados */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 flex flex-col overflow-y-auto space-y-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Chamados ({tickets.length})
            </span>
            <button
              type="button"
              onClick={loadTickets}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Atualizar
            </button>
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Carregando chamados...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhum chamado aberto no momento.
            </div>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const isTechError = t.category === 'TECHNICAL_ISSUE';

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTicket(t)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isSelected ? 'text-slate-200' : 'text-slate-700'
                      }`}
                    >
                      {t.protocol}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isTechError
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isTechError ? 'SLA 24h' : t.priority}
                    </span>
                  </div>

                  <strong className="text-sm font-bold block mb-0.5 truncate">
                    {t.subject}
                  </strong>
                  <span
                    className={`text-xs block truncate ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {t.tenant?.name || 'Estabelecimento'}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Coluna 2: Chat & Histórico do Chamado */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Topo do Chamado */}
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {selectedTicket.tenant?.name || 'Estabelecimento'}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {selectedTicket.protocol}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
                    Responsável: {selectedTicket.user?.name || 'Cliente'} • {selectedTicket.tenant?.phone || 'Sem telefone'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as any)}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 cursor-pointer outline-none"
                  >
                    <option value="OPEN">Aberto</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="WAITING_CLIENT">Aguardando Cliente</option>
                    <option value="RESOLVED">Resolvido</option>
                  </select>
                </div>
              </div>

              {/* Histórico Real de Mensagens */}
              <div className="flex-1 py-4 overflow-y-auto space-y-3 text-xs">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((m) => {
                    const isAdmin = m.senderType === 'SUPER_ADMIN';
                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border ${
                          isAdmin
                            ? 'bg-slate-900 text-white border-slate-900 ml-4'
                            : 'bg-slate-50 text-slate-800 border-slate-200/80 mr-4'
                        }`}
                      >
                        <span
                          className={`text-[10px] font-semibold block mb-1 ${
                            isAdmin ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {isAdmin ? 'Equipe Admin MarqueSuaHora' : selectedTicket.user?.name || 'Cliente'} •{' '}
                          {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    Nenhuma mensagem registrada neste chamado.
                  </div>
                )}
              </div>

              {/* Formulário de Resposta */}
              <form
                onSubmit={handleSendReply}
                className="pt-3 border-t border-slate-100 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={isSendingReply}
                  className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-500 text-slate-900 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!replyMessage.trim() || isSendingReply}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40"
                >
                  Responder
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Selecione um chamado ao lado para ver detalhes.
            </div>
          )}
        </div>

        {/* Coluna 3: Checklist Operacional (TicketTask) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between overflow-y-auto space-y-5">
          {selectedTicket ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Checklist de Resolução
                </h3>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {progressPercent}%
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-slate-900 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-2">
                {selectedTicket.tasks && selectedTicket.tasks.length > 0 ? (
                  selectedTicket.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id, task.completed)}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        readOnly
                        className="rounded text-slate-900 focus:ring-0 cursor-pointer mt-0.5"
                      />
                      <span
                        className={`${
                          task.completed ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        {task.title}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Nenhuma tarefa pendente no momento.</p>
                )}
              </div>

              {/* Adicionar Nova Tarefa */}
              <form onSubmit={handleAddTask} className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900 placeholder-slate-400 focus:border-slate-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Adicionar
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Nenhum chamado selecionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
