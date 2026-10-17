'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Phone,
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Filter,
  DollarSign,
  Loader2,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import { InputMask } from '@/components/ui/InputMask';

interface Subscriber {
  id: string;
  courseId: string;
  clientId?: string | null;
  phone: string;
  grantedAt: string;
  revokedAt?: string | null;
  isActive: boolean;
  course?: {
    id: string;
    title: string;
    price?: number | null;
    coverUrl?: string | null;
  };
  client?: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

interface CourseOption {
  id: string;
  title: string;
  price?: number | null;
}

export default function AssinantesPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');

  // Modal Novo Acesso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetCourseId, setTargetCourseId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 1. Carrega cursos para filtros e seleção
  useEffect(() => {
    api
      .get('/courses')
      .then((res) => {
        const list = res.data || [];
        setCourses(list);
        if (list.length > 0 && !targetCourseId) {
          setTargetCourseId(list[0].id);
        }
      })
      .catch(() => setCourses([]));
  }, []);

  // 2. Busca lista de alunas/assinantes
  const fetchSubscribers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCourseFilter !== 'ALL') params.set('courseId', selectedCourseFilter);
    if (search.trim()) params.set('search', search.trim());

    api
      .get(`/courses/subscribers?${params.toString()}`)
      .then((res) => {
        setSubscribers(res.data || []);
      })
      .catch(() => {
        setSubscribers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSubscribers();
  }, [selectedCourseFilter]);

  // Debounce para busca
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSubscribers();
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // 3. Conceder novo acesso
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCourseId || !studentName.trim() || !studentPhone.trim()) {
      setModalError('Preencha todos os campos obrigatórios.');
      return;
    }

    setSavingAccess(true);
    setModalError(null);

    try {
      await api.post(`/courses/${targetCourseId}/access`, {
        clientName: studentName.trim(),
        phone: studentPhone.trim()
      });

      setIsModalOpen(false);
      setStudentName('');
      setStudentPhone('');
      fetchSubscribers();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Erro ao liberar acesso.');
    } finally {
      setSavingAccess(false);
    }
  };

  // 4. Alternar status (Ativar / Revogar)
  const handleToggleStatus = async (accessId: string) => {
    try {
      await api.patch(`/courses/access/${accessId}/toggle`, {});
      fetchSubscribers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao alterar status.');
    }
  };

  // 5. Excluir acesso
  const handleDeleteAccess = async (accessId: string) => {
    if (!confirm('Deseja realmente revogar e remover o acesso desta aluna?')) return;
    try {
      await api.delete(`/courses/access/${accessId}`);
      fetchSubscribers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao excluir acesso.');
    }
  };

  // 6. Abrir WhatsApp com mensagem de boas-vindas / suporte
  const handleOpenWhatsApp = (name: string, phone: string, courseTitle?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithDdd = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Olá, ${name}! Seu acesso ao treinamento *${courseTitle || 'do curso'}* está liberado com sucesso! Se precisar de qualquer dúvida ou suporte com as aulas, estou à disposição aqui! ✨`
    );
    window.open(`https://wa.me/${phoneWithDdd}?text=${msg}`, '_blank');
  };

  // Filtra por status ativo/revogado
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      if (statusFilter === 'ACTIVE') return sub.isActive;
      if (statusFilter === 'REVOKED') return !sub.isActive;
      return true;
    });
  }, [subscribers, statusFilter]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter((s) => s.isActive).length;
    const revenue = subscribers.reduce((acc, s) => acc + (Number(s.course?.price) || 0), 0);
    return { total, active, revenue };
  }, [subscribers]);

  const formatDateDisplay = (dateVal?: string) => {
    if (!dateVal) return '-';
    const clean = dateVal.slice(0, 10);
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Assinantes & Alunas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              {stats.active} ativas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de acessos, alunas matriculadas nos cursos e envio de suporte direto pelo WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/cursos"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span>Gerenciar Cursos</span>
          </Link>

          <button
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Liberar Novo Acesso</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total de Alunas
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Acessos Ativos
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.active}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Faturamento em Cursos
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5 font-mono">
              R$ {stats.revenue.toFixed(2).replace('.', ',')}
            </h3>
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da aluna ou WhatsApp..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-hidden focus:bg-white focus:border-purple-600 transition-colors"
            />
          </div>

          {/* Filtro por Curso */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Curso:
            </span>
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-hidden focus:border-purple-600"
            >
              <option value="ALL">Todos os cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ACTIVE', label: 'Ativos' },
              { id: 'REVOKED', label: 'Pausados' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st.id
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Tabela de Alunas */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
            <p className="text-xs font-semibold">Carregando alunas e acessos...</p>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Nenhuma aluna encontrada
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Libere o acesso de uma aluna pelo botão acima para ela assistir às videoaulas dos seus cursos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Aluna</th>
                  <th className="py-3.5 px-4">WhatsApp</th>
                  <th className="py-3.5 px-4">Curso Inscrito</th>
                  <th className="py-3.5 px-4">Data de Liberação</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSubscribers.map((sub) => {
                  const studentDisplayName = sub.client?.name || 'Aluna';
                  const phoneFormatted = sub.phone;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* Aluna */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {studentDisplayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 truncate">
                              {studentDisplayName}
                            </p>
                            <span className="text-[10px] text-purple-600 font-semibold">
                              Aluna Verificada
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        {phoneFormatted}
                      </td>

                      {/* Curso */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span className="font-bold text-slate-800 truncate max-w-[220px]">
                            {sub.course?.title}
                          </span>
                        </div>
                      </td>

                      {/* Data de Liberação */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono">
                        {formatDateDisplay(sub.grantedAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            sub.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              sub.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {sub.isActive ? 'Ativo' : 'Revogado'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão WhatsApp */}
                          <button
                            onClick={() =>
                              handleOpenWhatsApp(studentDisplayName, sub.phone, sub.course?.title)
                            }
                            className="p-2 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(sub.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title={sub.isActive ? 'Pausar/Revogar acesso' : 'Reativar acesso'}
                          >
                            {sub.isActive ? (
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleDeleteAccess(sub.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remover acesso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* 5. Modal Liberar Novo Acesso */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-900">
                Liberar Acesso de Aluna
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantAccess} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Curso *
                </label>
                <select
                  required
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome da Aluna *
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nome completo da aluna"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  WhatsApp com DDD *
                </label>
                <InputMask
                  mask="phone"
                  required
                  value={studentPhone}
                  onChangeValue={(val) => setStudentPhone(val)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAccess}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingAccess ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Liberando...</span>
                    </>
                  ) : (
                    <span>Liberar Acesso</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
