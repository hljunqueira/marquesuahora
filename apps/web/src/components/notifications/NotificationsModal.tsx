'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Calendar,
  Package,
  GraduationCap,
  Info,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '@/lib/api';

export type NotificationCategory = 'SCHEDULE' | 'PRODUCT' | 'COURSE' | 'SYSTEM' | 'ALL';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface NotificationItem {
  id: string;
  tenantId: string;
  category: 'SCHEDULE' | 'PRODUCT' | 'COURSE' | 'SYSTEM';
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  readAt?: string | null;
  metadata?: any;
  createdAt: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
  onSummaryUpdate?: (summary: { unreadTotal: number; byCategory: Record<string, number> }) => void;
}

export function NotificationsModal({
  isOpen,
  onClose,
  primaryColor = '#7C3AED',
  onSummaryUpdate
}: NotificationsModalProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    unreadTotal: 0,
    byCategory: {
      SCHEDULE: 0,
      PRODUCT: 0,
      COURSE: 0,
      SYSTEM: 0
    }
  });

  // Carrega resumo de contagens não lidas
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/notifications/summary');
      if (res.data) {
        setSummary(res.data);
        if (onSummaryUpdate) {
          onSummaryUpdate(res.data);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar resumo de notificações:', err);
    }
  }, [onSummaryUpdate]);

  // Carrega listagem de notificações com filtros ativos
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: any = { limit: 50 };
      if (activeCategory !== 'ALL') {
        params.category = activeCategory;
      }
      if (onlyUnread) {
        params.read = false;
      }

      const res = await api.get('/notifications', { params });
      if (res.data && Array.isArray(res.data.items)) {
        setNotifications(res.data.items);
      }
    } catch (err) {
      console.error('Erro ao carregar lista de notificações:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, onlyUnread]);

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
      fetchNotifications();
    }
  }, [isOpen, fetchSummary, fetchNotifications]);

  // Marcar notificação individual como lida
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      fetchSummary();
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  // Marcar todas da categoria ou geral como lidas
  const handleMarkAllAsRead = async () => {
    try {
      const body = activeCategory !== 'ALL' ? { category: activeCategory } : {};
      await api.post('/notifications/read-all', body);
      setNotifications((prev) =>
        prev.map((n) => {
          if (activeCategory === 'ALL' || n.category === activeCategory) {
            return { ...n, read: true, readAt: new Date().toISOString() };
          }
          return n;
        })
      );
      fetchSummary();
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  // Excluir notificação individual
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchSummary();
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
    }
  };

  // Limpar todas as notificações já lidas
  const handleClearAllRead = async () => {
    try {
      await api.delete('/notifications/read');
      setNotifications((prev) => prev.filter((n) => !n.read));
      fetchSummary();
    } catch (err) {
      console.error('Erro ao limpar notificações lidas:', err);
    }
  };

  // Navegar pelo link da notificação
  const handleNavigate = (link?: string | null, id?: string) => {
    if (id) {
      handleMarkAsRead(id);
    }
    if (link) {
      onClose();
      router.push(link);
    }
  };

  // Formatação de data/hora amigável
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      if (diffDays === 1) {
        return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Ícone e cores contextuais por categoria
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'SCHEDULE':
        return {
          label: 'Agendamento',
          icon: Calendar,
          badgeBg: 'bg-blue-50',
          badgeText: 'text-blue-700',
          border: 'border-blue-200'
        };
      case 'PRODUCT':
        return {
          label: 'Produto & Estoque',
          icon: Package,
          badgeBg: 'bg-amber-50',
          badgeText: 'text-amber-700',
          border: 'border-amber-200'
        };
      case 'COURSE':
        return {
          label: 'Curso & Aluna',
          icon: GraduationCap,
          badgeBg: 'bg-emerald-50',
          badgeText: 'text-emerald-700',
          border: 'border-emerald-200'
        };
      case 'SYSTEM':
      default:
        return {
          label: 'Sistema',
          icon: Info,
          badgeBg: 'bg-slate-100',
          badgeText: 'text-slate-700',
          border: 'border-slate-200'
        };
    }
  };

  const categories = [
    { id: 'ALL' as NotificationCategory, label: 'Todas', count: summary.unreadTotal },
    { id: 'SCHEDULE' as NotificationCategory, label: 'Agendamentos', count: summary.byCategory.SCHEDULE, icon: Calendar },
    { id: 'PRODUCT' as NotificationCategory, label: 'Produtos', count: summary.byCategory.PRODUCT, icon: Package },
    { id: 'COURSE' as NotificationCategory, label: 'Cursos', count: summary.byCategory.COURSE, icon: GraduationCap },
    { id: 'SYSTEM' as NotificationCategory, label: 'Sistema', count: summary.byCategory.SYSTEM, icon: Info }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
        {/* Backdrop para fechar ao clicar fora */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-10"
        >
          {/* Header Principal */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Central de Notificações</h2>
                  {summary.unreadTotal > 0 && (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {summary.unreadTotal} não {summary.unreadTotal === 1 ? 'lida' : 'lidas'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Acompanhe agendamentos, estoque de produtos e alunas dos cursos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
                title="Atualizar notificações"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Abas de Categorias */}
          <div className="flex items-center px-4 border-b border-slate-200 bg-slate-50/70 overflow-x-auto gap-1 shrink-0 scrollbar-none">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`py-3 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'border-tenant-primary text-slate-900 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  style={isActive ? { borderColor: primaryColor, color: primaryColor } : {}}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                      style={isActive ? { backgroundColor: primaryColor } : {}}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Barra de Filtro e Ações Rápidas */}
          <div className="px-5 py-2.5 bg-slate-50/40 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Toggle Lidas vs Não Lidas */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setOnlyUnread(false)}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  !onlyUnread ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setOnlyUnread(true)}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  onlyUnread ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Apenas Não Lidas</span>
                {summary.unreadTotal > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </button>
            </div>

            {/* Ações em lote */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar lidas
              </button>
              <button
                type="button"
                onClick={handleClearAllRead}
                className="text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                title="Excluir notificações já lidas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar lidas
              </button>
            </div>
          </div>

          {/* Lista de Notificações com Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3 space-y-1.5">
            {loading ? (
              <div className="py-16 text-center">
                <RefreshCw
                  className="w-7 h-7 mx-auto animate-spin mb-2"
                  style={{ color: primaryColor }}
                />
                <p className="text-xs text-slate-500">Buscando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {onlyUnread ? 'Nenhuma notificação não lida' : 'Nenhuma notificação encontrada'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {onlyUnread
                    ? 'Você leu todas as notificações recentes desta categoria.'
                    : 'Novas notificações de agendamentos, estoque de produtos e cursos aparecerão aqui.'}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const cfg = getCategoryConfig(item.category);
                const Icon = cfg.icon;
                const isUrgent = item.priority === 'HIGH' || item.priority === 'URGENT';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.read) handleMarkAsRead(item.id);
                    }}
                    className={`group relative p-3.5 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      item.read
                        ? 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                        : 'bg-slate-50/70 border-slate-200/90 shadow-2xs hover:bg-white'
                    }`}
                  >
                    {/* Indicador de não lida na borda */}
                    {!item.read && (
                      <span
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}

                    {/* Ícone da Categoria */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.border}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Conteúdo da Notificação */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${cfg.badgeBg} ${cfg.badgeText}`}
                          >
                            {cfg.label}
                          </span>
                          {isUrgent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Atenção
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>

                        {/* Botões rápidos ao passar o mouse */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {!item.read && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              title="Marcar como lida"
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(item.id, e)}
                            title="Excluir notificação"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4
                        className={`text-xs ${
                          item.read ? 'font-medium text-slate-800' : 'font-bold text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Botão de Navegação / Ação */}
                      {item.link && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(item.link, item.id);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white shadow-2xs transition-all hover:opacity-90 cursor-pointer"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <span>Acessar</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer do Modal */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>
              {notifications.length} {notifications.length === 1 ? 'notificação' : 'notificações'}{' '}
              {onlyUnread ? 'não lidas' : 'nesta lista'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
