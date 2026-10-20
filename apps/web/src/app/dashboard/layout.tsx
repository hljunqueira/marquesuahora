'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Users,
  Star,
  Scissors,
  UserCheck,
  DollarSign,
  Settings,
  HelpCircle,
  LayoutDashboard,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  ShoppingBag,
  ClipboardList,
  GraduationCap,
  Award,
  CheckCheck,
  CreditCard,
  Camera,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown
} from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';

export interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export interface NavGroupDef {
  id: string;
  label: string;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'atendimento',
    label: 'Atendimento',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/agenda', label: 'Agenda', icon: Calendar },
      { href: '/dashboard/agendamentos', label: 'Agendamentos', icon: ClipboardList },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão & Clientes',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes & CRM', icon: Users },
      { href: '/dashboard/galeria', label: 'Galeria & Fotos', icon: Camera },
      { href: '/dashboard/produtos', label: 'Produtos & Estoque', icon: ShoppingBag },
    ],
  },
  {
    id: 'negocio',
    label: 'Negócio & Equipe',
    items: [
      { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
      { href: '/dashboard/equipe', label: 'Equipe', icon: UserCheck },
      { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
      { href: '/dashboard/cursos', label: 'Cursos & Alunas', icon: GraduationCap },
      { href: '/dashboard/relatorios', label: 'Relatórios & BI', icon: BarChart3 },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { href: '/dashboard/planos', label: 'Planos & Assinatura', icon: CreditCard },
      { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
      { href: '/dashboard/suporte', label: 'Suporte & Ajuda', icon: HelpCircle },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Painel operacional e agenda compacta' },
  '/dashboard/agenda': { title: 'Agenda', subtitle: 'Grade de horários da equipe e atendimentos' },
  '/dashboard/agendamentos': { title: 'Agendamentos', subtitle: 'Listagem completa, confirmações e histórico de atendimentos' },
  '/dashboard/clientes': { title: 'Clientes & CRM', subtitle: 'Histórico completo, aniversariantes e retenção' },
  '/dashboard/reputacao': { title: 'Reputação & Google', subtitle: 'Pesquisa NPS automática e avaliações no Google Maps' },
  '/dashboard/servicos': { title: 'Serviços & Catálogo', subtitle: 'Procedimentos, valores, durações e encaixes simultâneos' },
  '/dashboard/galeria': { title: 'Galeria', subtitle: 'Fotos de trabalhos, unhas e procedimentos exibidos na vitrine online' },
  '/dashboard/produtos': { title: 'Produtos & Estoque', subtitle: 'Cosméticos, produtos de bancada e itens em destaque na vitrine' },
  '/dashboard/cursos': { title: 'Cursos & Alunas', subtitle: 'Gestão de cursos, videoaulas, alunas e certificação profissional' },
  '/dashboard/assinantes': { title: 'Cursos & Alunas', subtitle: 'Gestão de cursos, videoaulas, alunas e certificação profissional' },
  '/dashboard/equipe': { title: 'Equipe & Profissionais', subtitle: 'Colaboradores, comissões e cores da agenda' },
  '/dashboard/financeiro': { title: 'Financeiro & Caixa', subtitle: 'Faturamento bruto, repasse de comissões e sinais PIX' },
  '/dashboard/planos': { title: 'Planos & Assinatura', subtitle: 'Consulte os recursos contratados e detalhes da assinatura' },
  '/dashboard/relatorios': { title: 'Relatórios & BI', subtitle: 'Business intelligence, faturamento, clientes mais frequentes e equipe' },
  '/dashboard/configuracoes': { title: 'Configurações do Espaço', subtitle: 'Ajuste os dados da sua empresa, vitrine e regras da agenda' },
  '/dashboard/suporte': { title: 'Suporte & Ajuda', subtitle: 'Atendimento técnico via chat e áudio' }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Estado da barra lateral recolhida (persiste no localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('marquesuahora_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('marquesuahora_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('marquesuahora_collapsed_groups');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('marquesuahora_collapsed_groups', JSON.stringify(next));
      }
      return next;
    });
  };

  const [subscriberLogo, setSubscriberLogo] = useState<string | null>(null);
  const [subscriberName, setSubscriberName] = useState<string>('');
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [subscriberPrimaryColor, setSubscriberPrimaryColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_primary_color') || '#5c0701';
    }
    return '#5c0701';
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Carrega resumo de notificações não lidas
  const loadNotificationSummary = React.useCallback(() => {
    api.get('/notifications/summary')
      .then((res) => {
        if (res.data?.unreadTotal !== undefined) {
          setUnreadCount(res.data.unreadTotal);
        }
      })
      .catch(() => {
        // Silencioso se offline ou deslogado
      });
  }, []);

  useEffect(() => {
    loadNotificationSummary();
    const interval = setInterval(loadNotificationSummary, 30000); // Polling a cada 30 segundos
    const handleSync = () => loadNotificationSummary();
    window.addEventListener('marquesuahora_notification_sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('marquesuahora_notification_sync', handleSync);
    };
  }, [loadNotificationSummary]);

  // Determina título e subtítulo dinâmicos da rota atual para exibir no nav
  const pageInfo =
    PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(
      ([key]) => key !== '/dashboard' && pathname?.startsWith(key)
    )?.[1] || { title: 'Painel', subtitle: '' };

  const displayTitle = useMemo(() => {
    if (pathname === '/dashboard') {
      return 'Dashboard';
    }
    if (pathname === '/dashboard/agenda') {
      return 'Agenda';
    }
    return pageInfo.title;
  }, [pathname, pageInfo.title]);

  useEffect(() => {
    const loadTenantData = () => {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('@marcatuahora:token');
      if (!token) {
        router.push('/login?expired=true');
        return;
      }

      // 1. Dados do usuário
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          if (parsed.tenantName && !subscriberName) {
            setSubscriberName(parsed.tenantName);
          }
        } catch {
          // ignore
        }
      }

      // 2. Busca dados 100% atualizados direto do banco via API
      api.get('/tenants/me')
        .then((res) => {
          if (res.data) {
            const t = res.data;
            setSubscriberName(t.name);
            setTenantSlug(t.slug);
            if (t.logoUrl) setSubscriberLogo(t.logoUrl);
            if (t.primaryColor) {
              setSubscriberPrimaryColor(t.primaryColor);
              localStorage.setItem('tenant_primary_color', t.primaryColor);
            }
            localStorage.setItem('tenant_name', t.name);
            localStorage.setItem('tenant_slug', t.slug);
            localStorage.setItem('tenant_niche', t.niche);
            if (t.logoUrl) localStorage.setItem('tenant_logo', t.logoUrl);
            if (t.plan?.code) localStorage.setItem('marquesuahora_tenant_plan_code', t.plan.code);
            if (t.plan?.name) localStorage.setItem('marquesuahora_tenant_plan_name', t.plan.name);
            if (t.plan?.maxProfessionals) localStorage.setItem('marquesuahora_tenant_max_prof', String(t.plan.maxProfessionals));
            localStorage.setItem('tenant_data', JSON.stringify(t));
          }
        })
        .catch(() => {
          // Fallback seguro se offline ou aguardando resposta
          const savedTenant = localStorage.getItem('tenant_data') || localStorage.getItem('@marcatuahora:tenant');
          if (savedTenant) {
            try {
              const parsed = JSON.parse(savedTenant);
              if (parsed.name) setSubscriberName(parsed.name);
              if (parsed.slug) setTenantSlug(parsed.slug);
              if (parsed.logoUrl) setSubscriberLogo(parsed.logoUrl);
              if (parsed.primaryColor) setSubscriberPrimaryColor(parsed.primaryColor);
            } catch {
              // ignore
            }
          }
          const savedColor = localStorage.getItem('tenant_primary_color');
          if (savedColor) setSubscriberPrimaryColor(savedColor);
        });
    };

    const handleTenantSync = (e: any) => {
      loadTenantData();
      if (e?.detail?.primaryColor) {
        setSubscriberPrimaryColor(e.detail.primaryColor);
      }
    };

    loadTenantData();
    window.addEventListener('storage', loadTenantData);
    window.addEventListener('marquesuahora_tenant_sync', handleTenantSync);
    return () => {
      window.removeEventListener('storage', loadTenantData);
      window.removeEventListener('marquesuahora_tenant_sync', handleTenantSync);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined' && subscriberPrimaryColor) {
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', subscriberPrimaryColor);
      root.style.setProperty('--brand-primary-light', `${subscriberPrimaryColor}18`);
      root.style.setProperty('--brand-primary-ring', `${subscriberPrimaryColor}35`);
    }
  }, [subscriberPrimaryColor]);

  const handleDirectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      console.warn('A imagem do logotipo deve ter no máximo 5MB.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.relativeUrl;
      if (!url) throw new Error('URL não retornada pelo servidor');

      // Salva no banco de dados imediatamente
      await api.put('/tenants/me/settings', { logoUrl: url });

      setSubscriberLogo(url);
      localStorage.setItem('tenant_logo', url);

      try {
        const td = localStorage.getItem('tenant_data');
        if (td) {
          const p = JSON.parse(td);
          p.logoUrl = url;
          localStorage.setItem('tenant_data', JSON.stringify(p));
        }
        const mt = localStorage.getItem('@marcatuahora:tenant');
        if (mt) {
          const p = JSON.parse(mt);
          p.logoUrl = url;
          localStorage.setItem('@marcatuahora:tenant', JSON.stringify(p));
        }
      } catch {
        // ignore
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('marquesuahora_tenant_sync'));
    } catch (err) {
      console.error('Erro ao atualizar logotipo:', err);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsImpersonating(localStorage.getItem('is_impersonating') === 'true');
    }
  }, []);

  const handleReturnToAdmin = () => {
    const adminBackup = localStorage.getItem('admin_token_backup');
    if (adminBackup) {
      localStorage.setItem('auth_token', adminBackup);
      localStorage.removeItem('admin_token_backup');
    }
    localStorage.removeItem('is_impersonating');
    router.push('/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('is_impersonating');
    router.push('/login');
  };

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col md:flex-row"
      style={{ ['--tenant-primary' as any]: subscriberPrimaryColor }}
    >
      {/* SIDEBAR DESKTOP - Largura ajustável com grupos e botão de recolher sutil */}
      <aside
        className={`hidden md:flex flex-col ${
          isSidebarCollapsed ? 'w-[68px] px-2' : 'w-[214px] px-2.5'
        } bg-white text-slate-600 border-r border-slate-200/80 py-3.5 shrink-0 justify-between select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] min-h-screen sticky top-0 h-screen overflow-y-auto transition-[width] duration-200 ease-in-out`}
      >
        <div>
          {/* Topo da Sidebar: Logo Maior e Centralizada + Botão Sutil de Recolher */}
          <div className="relative px-1 pt-1 pb-3 mb-3 border-b border-slate-100 flex flex-col items-center justify-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleDirectLogoUpload}
            />

            {/* Botão Sutil de Recolher / Expandir Sidebar posicionado no canto */}
            <button
              type="button"
              onClick={toggleSidebar}
              className={`${
                isSidebarCollapsed
                  ? 'p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg'
              } transition-colors cursor-pointer shrink-0 z-10`}
              title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
              aria-label={isSidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {!isSidebarCollapsed ? (
              <div className="w-full flex flex-col items-center justify-center text-center pt-1">
                {subscriberLogo ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer flex flex-col items-center"
                    title="Clique para alterar a logo do estabelecimento"
                  >
                    <div className="relative w-28 h-28 rounded-2xl bg-white p-1.5 flex items-center justify-center border border-slate-200/90 shadow-2xs group-hover:border-slate-300 transition-all group-hover:scale-[1.02]">
                      <img
                        src={resolveImageUrl(subscriberLogo)}
                        alt={subscriberName}
                        className="max-h-full max-w-full object-contain rounded-xl"
                      />
                      <div className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1">
                        <Camera className="w-4 h-4" />
                        <span>Trocar Logo</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 mt-2 text-center block break-words max-w-[185px] leading-tight select-none">
                      {subscriberName}
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer flex flex-col items-center"
                    title="Clique para enviar a logo do seu espaço"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-2xs group-hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: `${subscriberPrimaryColor}15`,
                        color: subscriberPrimaryColor,
                        border: `1px solid ${subscriberPrimaryColor}30`,
                      }}
                    >
                      {subscriberName ? subscriberName.slice(0, 2).toUpperCase() : 'MH'}
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 mt-2 text-center block break-words max-w-[185px] leading-tight select-none">
                      {subscriberName}
                    </span>
                    <span
                      className="text-[10px] font-semibold mt-0.5 hover:underline"
                      style={{ color: subscriberPrimaryColor }}
                    >
                      + Adicionar Logo
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer group relative mt-1"
                title={`${subscriberName} (Clique para trocar logo)`}
              >
                {subscriberLogo ? (
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <img
                      src={resolveImageUrl(subscriberLogo)}
                      alt={subscriberName}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${subscriberPrimaryColor}15`,
                      color: subscriberPrimaryColor,
                      border: `1px solid ${subscriberPrimaryColor}30`,
                    }}
                  >
                    {subscriberName ? subscriberName.slice(0, 2).toUpperCase() : 'MH'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grupos de Navegação Reorganizados e Colapsáveis */}
          <nav className="space-y-2">
            {NAV_GROUPS.map((group, groupIdx) => {
              const isGroupCollapsed = Boolean(collapsedGroups[group.id]);
              const hasActiveItemInGroup = group.items.some((item) =>
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname?.startsWith(item.href)
              );
              // Se o grupo contém a rota ativa, mantém visível
              const isEffectiveCollapsed = isGroupCollapsed && !hasActiveItemInGroup;

              return (
                <div key={group.id} className="space-y-0.5">
                  {!isSidebarCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 hover:text-slate-700 hover:bg-slate-50/80 rounded-lg transition-colors cursor-pointer uppercase select-none group/hdr"
                      title={isEffectiveCollapsed ? `Expandir ${group.label}` : `Recolher ${group.label}`}
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-400 group-hover/hdr:text-slate-600 transition-transform duration-200 ${
                          isEffectiveCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  ) : (
                    groupIdx > 0 && <div className="my-1.5 mx-1 border-t border-slate-100" />
                  )}

                  {/* Itens do Grupo */}
                  {(!isSidebarCollapsed && isEffectiveCollapsed) ? null : (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          item.href === '/dashboard'
                            ? pathname === '/dashboard'
                            : pathname?.startsWith(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            title={isSidebarCollapsed ? item.label : undefined}
                            style={isActive ? { backgroundColor: subscriberPrimaryColor } : undefined}
                            className={`flex items-center ${
                              isSidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2'
                            } rounded-xl text-sm font-semibold transition-all relative group ${
                              isActive
                                ? 'text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                            }`}
                          >
                            <Icon
                              className={`w-4.5 h-4.5 shrink-0 ${
                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                              }`}
                            />
                            {!isSidebarCollapsed && (
                              <>
                                <span className="whitespace-nowrap tracking-tight">{item.label}</span>
                                {item.badge && (
                                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
                                    {item.badge}
                                  </span>
                                )}
                                {isActive && !item.badge && (
                                  <motion.div
                                    layoutId="activeSidebarIndicator"
                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0"
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                  />
                                )}
                              </>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="pt-3 border-t border-slate-100 space-y-1 mt-4">
          <a
            href={`/${tenantSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            title={isSidebarCollapsed ? 'Ver Minha Vitrine' : undefined}
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
            } rounded-xl text-xs font-semibold text-slate-500 hover:text-purple-700 hover:bg-purple-50/60 transition-colors`}
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              {!isSidebarCollapsed && <span>Ver Vitrine</span>}
            </div>
            {!isSidebarCollapsed && <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />}
          </a>

          <button
            type="button"
            onClick={handleLogout}
            title={isSidebarCollapsed ? 'Encerrar Sessão' : undefined}
            className={`w-full flex items-center ${
              isSidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'
            } rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isSidebarCollapsed && <span>Encerrar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* CABEÇALHO MOBILE EXCLUSIVO: LOGO OFICIAL + NOME DO ESPAÇO + NOTIFICAÇÕES (Sem botão de menu no topo) */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white text-slate-800 border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-28 h-8 shrink-0">
            <Image
              src="/brand/logooficial-semfundo.png"
              alt="Marque Sua Hora"
              fill
              priority
              className="object-contain object-left"
            />
          </div>
          {subscriberName && (
            <div className="border-l border-slate-200 pl-2.5 min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate block max-w-[150px] tracking-tight">
                {subscriberName}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setNotificationsModalOpen(true)}
            aria-label="Notificações"
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs animate-pulse"
                style={{ backgroundColor: subscriberPrimaryColor }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* BOTTOM SHEET MENU MOBILE (Menu exclusivo embaixo, sem sobressair nem invadir o topo) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop escuro com blur suave */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Painel Inferior que desliza da base */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 z-10 flex flex-col max-h-[82vh] overflow-hidden"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 24px))' }}
            >
              {/* Barra de arraste sutil */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 rounded-full bg-slate-200" />
              </div>

              {/* Cabeçalho do Bottom Sheet */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: subscriberPrimaryColor }}
                  />
                  <span className="font-extrabold text-sm text-slate-800 tracking-tight">
                    Navegação & Gestão
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista dos Itens de Menu */}
              <div className="p-4 overflow-y-auto space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      style={isActive ? { backgroundColor: subscriberPrimaryColor } : undefined}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100/80 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-white/80' : 'text-slate-300'}`} />
                    </Link>
                  );
                })}

                <div className="pt-2 border-t border-slate-100 space-y-1.5 mt-2">
                  <a
                    href={`/${tenantSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <ExternalLink className="w-5 h-5 text-slate-500" />
                      <span>Ver Minha Vitrine Pública</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span>Encerrar Sessão</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Banner de Modo Suporte Super Admin */}
        {isImpersonating && (
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-4 sm:px-8 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md border-b border-purple-700/50">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>
                Modo Suporte Super Admin — Visualizando painel de <strong>{subscriberName}</strong>
              </span>
            </div>
            <button
              onClick={handleReturnToAdmin}
              className="px-3.5 py-1 bg-white text-purple-950 font-bold rounded-lg hover:bg-purple-50 transition-colors text-xs shadow-sm cursor-pointer"
            >
              Voltar para o Painel Super Admin
            </button>
          </div>
        )}

        {/* Barra Superior Interna com Título Dinâmico no Nav (Desktop exclusivo) */}
        <header className="hidden md:flex min-h-[64px] px-6 sm:px-8 bg-white border-b border-slate-200/80 items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sticky top-0 z-20">
          <div className="min-w-0 flex items-center gap-3">
            <h1 className="text-base font-display font-bold text-slate-800 tracking-tight shrink-0">
              {displayTitle}
            </h1>
            {subscriberName && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                style={{
                  backgroundColor: `${subscriberPrimaryColor}15`,
                  color: subscriberPrimaryColor,
                  border: `1px solid ${subscriberPrimaryColor}30`,
                }}
              >
                {subscriberName}
              </span>
            )}
            {pageInfo.subtitle && (
              <span className="text-xs text-slate-500 truncate border-l border-slate-200 pl-3">
                {pageInfo.subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setNotificationsModalOpen(true)}
              aria-label="Abrir Central de Notificações"
              className="relative p-2.5 rounded-xl border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-2xs group"
            >
              <Bell className="w-4 h-4 transition-transform group-hover:scale-110" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs animate-pulse"
                  style={{ backgroundColor: subscriberPrimaryColor }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Modal Completo de Notificações com Categorias e Filtro de Lidas (fora do stacking context do header) */}
        <NotificationsModal
          isOpen={notificationsModalOpen}
          onClose={() => setNotificationsModalOpen(false)}
          primaryColor={subscriberPrimaryColor}
          onSummaryUpdate={(s) => setUnreadCount(s.unreadTotal)}
        />

        {/* View renderizada dentro do container com espaçamento aprimorado e expansivo (pb-32 no mobile para garantir folga contra a barra inferior no iPhone) */}
        <div className={`${pathname?.startsWith('/dashboard/agenda') ? 'p-2 sm:p-4' : 'p-4 sm:p-6 lg:p-8'} flex-1 w-full max-w-[1920px] mx-auto pb-32 md:pb-8`}>{children}</div>

        {/* BARRA DE NAVEGAÇÃO INFERIOR MOBILE FIXA (Menu exclusivo na parte inferior, sem conflito de drawer) */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 h-16 flex items-center justify-around px-2 shadow-lg select-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${pathname === '/dashboard' ? 'text-tenant-primary font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            style={pathname === '/dashboard' ? { color: subscriberPrimaryColor } : undefined}
          >
            <LayoutDashboard className={`w-5 h-5 mb-0.5 ${pathname === '/dashboard' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight">Início</span>
          </Link>

          <Link
            href="/dashboard/agenda"
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${pathname?.startsWith('/dashboard/agenda') ? 'text-tenant-primary font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            style={pathname?.startsWith('/dashboard/agenda') ? { color: subscriberPrimaryColor } : undefined}
          >
            <Calendar className={`w-5 h-5 mb-0.5 ${pathname?.startsWith('/dashboard/agenda') ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight">Agenda</span>
          </Link>

          <Link
            href="/dashboard/clientes"
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${pathname?.startsWith('/dashboard/clientes') ? 'text-tenant-primary font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            style={pathname?.startsWith('/dashboard/clientes') ? { color: subscriberPrimaryColor } : undefined}
          >
            <Users className={`w-5 h-5 mb-0.5 ${pathname?.startsWith('/dashboard/clientes') ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight">Clientes</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${mobileMenuOpen ? 'text-tenant-primary font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            style={mobileMenuOpen ? { color: subscriberPrimaryColor } : undefined}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Menu</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
