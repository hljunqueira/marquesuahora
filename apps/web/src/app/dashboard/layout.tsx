'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Agenda', icon: Calendar },
  { href: '/dashboard/agendamentos', label: 'Agendamentos', icon: ClipboardList },
  { href: '/dashboard/clientes', label: 'Clientes & CRM', icon: Users },
  { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/equipe', label: 'Equipe', icon: UserCheck },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/dashboard/produtos', label: 'Produtos', icon: ShoppingBag },
  { href: '/dashboard/cursos', label: 'Cursos & Aulas', icon: GraduationCap },
  { href: '/dashboard/assinantes', label: 'Assinantes & Alunas', icon: Award },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/dashboard/suporte', label: 'Suporte & Ajuda', icon: HelpCircle }
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Agenda do Espaço', subtitle: 'Grade de horários da equipe e atendimentos em tempo real' },
  '/dashboard/agenda': { title: 'Agenda do Espaço', subtitle: 'Grade de horários da equipe e atendimentos em tempo real' },
  '/dashboard/agendamentos': { title: 'Agendamentos', subtitle: 'Listagem completa, confirmações e histórico de atendimentos' },
  '/dashboard/clientes': { title: 'Clientes & CRM', subtitle: 'Histórico completo, aniversariantes e retenção' },
  '/dashboard/reputacao': { title: 'Reputação & Google', subtitle: 'Pesquisa NPS automática e avaliações no Google Maps' },
  '/dashboard/servicos': { title: 'Serviços & Catálogo', subtitle: 'Procedimentos, valores, durações e encaixes simultâneos' },
  '/dashboard/produtos': { title: 'Produtos & Estoque', subtitle: 'Cosméticos, produtos de bancada e itens em destaque na vitrine' },
  '/dashboard/cursos': { title: 'Cursos & Treinamentos', subtitle: 'Gestão de cursos, videoaulas e materiais de apoio' },
  '/dashboard/assinantes': { title: 'Assinantes & Alunas', subtitle: 'Controle de acessos, alunas matriculadas e suporte' },
  '/dashboard/equipe': { title: 'Equipe & Profissionais', subtitle: 'Colaboradores, comissões e cores da agenda' },
  '/dashboard/financeiro': { title: 'Financeiro & Caixa', subtitle: 'Faturamento bruto, repasse de comissões e sinais PIX' },
  '/dashboard/planos': { title: 'Planos & Assinatura', subtitle: 'Consulte os recursos contratados e detalhes da assinatura' },
  '/dashboard/configuracoes': { title: 'Configurações do Espaço', subtitle: 'Ajuste os dados da sua empresa, vitrine e regras da agenda' },
  '/dashboard/suporte': { title: 'Suporte & Ajuda', subtitle: 'Atendimento técnico via chat e áudio' }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [subscriberLogo, setSubscriberLogo] = useState<string | null>(null);
  const [subscriberName, setSubscriberName] = useState<string>('');
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [subscriberPrimaryColor, setSubscriberPrimaryColor] = useState<string>('#7C3AED');
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

  const handleDirectLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSubscriberLogo(dataUrl);
        localStorage.setItem('tenant_logo', dataUrl);

        try {
          const td = localStorage.getItem('tenant_data');
          if (td) {
            const p = JSON.parse(td);
            p.logoUrl = dataUrl;
            localStorage.setItem('tenant_data', JSON.stringify(p));
          }
          const mt = localStorage.getItem('@marcatuahora:tenant');
          if (mt) {
            const p = JSON.parse(mt);
            p.logoUrl = dataUrl;
            localStorage.setItem('@marcatuahora:tenant', JSON.stringify(p));
          }
        } catch {
          // ignore
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('marquesuahora_tenant_sync'));
      };
      reader.readAsDataURL(file);
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
      {/* SIDEBAR DESKTOP - Largura reduzida para abraçar os títulos */}
      <aside className="hidden md:flex flex-col w-[214px] bg-white text-slate-600 border-r border-slate-200/80 px-2.5 py-3.5 shrink-0 justify-between select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Logo do Assinante (Configurável no Onboarding ou por upload direto) */}
          <div className="px-1 pt-1 pb-4 mb-3 border-b border-slate-100 flex flex-col items-center text-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleDirectLogoUpload}
            />
            {subscriberLogo ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer flex flex-col items-center"
                title="Clique para alterar a logo do estabelecimento"
              >
                <div className="relative w-36 h-12 flex items-center justify-center">
                  <img
                    src={subscriberLogo}
                    alt={subscriberName}
                    className="max-h-12 max-w-full object-contain object-center"
                  />
                  <div className="absolute inset-0 bg-slate-900/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                    Trocar Logo
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-800 mt-1.5 block truncate max-w-[190px]">
                  {subscriberName}
                </span>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer flex flex-col items-center w-full py-1"
                title="Clique para enviar a logo do seu espaço"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-2xs transition-all"
                  style={{
                    backgroundColor: `${subscriberPrimaryColor}15`,
                    color: subscriberPrimaryColor,
                    border: `1px solid ${subscriberPrimaryColor}30`
                  }}
                >
                  {subscriberName ? subscriberName.slice(0, 2).toUpperCase() : 'MH'}
                </div>
                <span className="text-xs font-bold text-slate-800 mt-1.5 block truncate max-w-[190px]">
                  {subscriberName}
                </span>
                <span
                  className="text-[10px] font-medium group-hover:underline mt-0.5"
                  style={{ color: subscriberPrimaryColor }}
                >
                  + Adicionar logo
                </span>
              </div>
            )}
          </div>

          {/* Links de Navegação com Fonte Aumentada e Largura Ajustada */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard' || pathname === '/dashboard/agenda'
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={isActive ? { backgroundColor: subscriberPrimaryColor } : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all relative ${isActive
                      ? 'text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                    }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="whitespace-nowrap tracking-tight">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
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
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-purple-700 hover:bg-purple-50/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>Ver Vitrine</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* CABEÇALHO MOBILE */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white text-slate-800 border-b border-slate-200/80 sticky top-0 z-40">
        <div className="relative w-36 h-10">
          <Image
            src="/brand/logooficial-semfundo.png"
            alt="Marque Sua Hora"
            fill
            className="object-contain object-left"
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-purple-600"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* DRAWER MENU MOBILE */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-14 bg-white text-slate-700 border-b border-slate-200 z-30 p-4 shadow-2xl"
          >
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard' || pathname === '/dashboard/agenda'
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={isActive ? { backgroundColor: subscriberPrimaryColor } : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isActive
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0" />
                <span>Encerrar Sessão</span>
              </button>
            </nav>
          </motion.div>
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

        {/* Barra Superior Interna com Título Dinâmico no Nav (Data removida a pedido) */}
        <header className="min-h-[64px] px-6 sm:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sticky top-0 z-20">
          <div className="min-w-0 flex flex-col md:flex-row md:items-center md:gap-3">
            <h1 className="text-sm sm:text-base font-display font-bold text-slate-800 tracking-tight shrink-0">
              {pageInfo.title}
            </h1>
            {pageInfo.subtitle && (
              <span className="text-xs text-slate-500 hidden md:inline-block truncate md:border-l md:border-slate-200 md:pl-3">
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

            {/* Modal Completo de Notificações com Categorias e Filtro de Lidas */}
            <NotificationsModal
              isOpen={notificationsModalOpen}
              onClose={() => setNotificationsModalOpen(false)}
              primaryColor={subscriberPrimaryColor}
              onSummaryUpdate={(s) => setUnreadCount(s.unreadTotal)}
            />
          </div>
        </header>

        {/* View renderizada dentro do container com espaçamento aprimorado e expansivo */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 w-full max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
