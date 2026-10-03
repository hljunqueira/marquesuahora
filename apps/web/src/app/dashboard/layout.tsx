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
  CreditCard,
  Settings,
  HelpCircle,
  LayoutDashboard,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/dashboard/agenda', label: 'Agenda', icon: Calendar },
  { href: '/dashboard/clientes', label: 'Clientes & CRM', icon: Users },
  { href: '/dashboard/reputacao', label: 'Reputação & Google', icon: Star },
  { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/equipe', label: 'Equipe', icon: UserCheck },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/dashboard/planos', label: 'Planos & Franquia', icon: CreditCard },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/dashboard/suporte', label: 'Suporte & Ajuda', icon: HelpCircle }
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Visão Geral', subtitle: 'Acompanhe o desempenho do seu negócio em tempo real' },
  '/dashboard/agenda': { title: 'Agenda do Espaço', subtitle: 'Grade de horários da equipe e agendamentos' },
  '/dashboard/clientes': { title: 'Clientes & CRM', subtitle: 'Histórico completo, aniversariantes e retenção' },
  '/dashboard/reputacao': { title: 'Reputação & Google', subtitle: 'Pesquisa NPS automática e avaliações no Google Maps' },
  '/dashboard/servicos': { title: 'Serviços & Catálogo', subtitle: 'Procedimentos, valores e pausas químicas' },
  '/dashboard/equipe': { title: 'Equipe & Profissionais', subtitle: 'Colaboradores, comissões e cores da agenda' },
  '/dashboard/financeiro': { title: 'Financeiro & Caixa', subtitle: 'Faturamento bruto, repasse de comissões e sinais PIX' },
  '/dashboard/planos': { title: 'Planos & Assinatura', subtitle: 'Consulte os recursos contratados e detalhes da assinatura' },
  '/dashboard/configuracoes': { title: 'Configurações do Espaço', subtitle: 'Ajuste os dados da sua empresa, vitrine e regras da agenda' },
  '/dashboard/suporte': { title: 'Suporte & Ajuda', subtitle: 'Atendimento técnico ao proprietário via chat e áudio' }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Determina título e subtítulo dinâmicos da rota atual para exibir no nav
  const pageInfo =
    PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(
      ([key]) => key !== '/dashboard' && pathname?.startsWith(key)
    )?.[1] || { title: 'Painel', subtitle: '' };

  useEffect(() => {
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    router.push('/login');
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col md:flex-row">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-white text-slate-600 border-r border-slate-200/80 p-4 shrink-0 justify-between select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Logo & Nome do Salão */}
          <div className="px-2 pt-2 pb-5 mb-5 border-b border-slate-100 flex flex-col items-center text-center">
            <Link href="/dashboard" className="block relative w-48 h-16">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                fill
                className="object-contain object-center"
                priority
              />
            </Link>
            <span className="text-[10px] text-purple-700 font-bold uppercase tracking-widest block mt-2">
              Painel do Assinante
            </span>
          </div>

          {/* Links de Navegação com espaçamento harmonioso */}
          <nav className="space-y-1.5">
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-600'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="pt-4 border-t border-slate-100 space-y-1.5 mt-6">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-purple-700 hover:bg-purple-50/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Vitrine Pública</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
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
                    ? pathname === '/dashboard'
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Encerrar Sessão</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Barra Superior Interna com Título Dinâmico no Nav */}
        <header className="min-h-[72px] px-6 sm:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sticky top-0 z-20">
          <div className="flex items-center gap-5 sm:gap-6 min-w-0">
            {/* Boas-vindas / Data */}
            <div className="hidden sm:block shrink-0">
              <span className="text-[11px] font-medium text-slate-400 block capitalize">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
              <h2 className="text-xs font-semibold text-slate-700 leading-none mt-0.5">
                {user?.name ? user.name : 'Bem-vindo de volta'}
              </h2>
            </div>

            {/* Separador vertical elegante */}
            <div className="hidden sm:block h-8 w-[1px] bg-slate-200 shrink-0" />

            {/* Título da Página no Nav (onde o usuário apontou na marcação vermelha!) */}
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
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/suporte"
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/70 transition-colors text-xs flex items-center gap-2 font-semibold shadow-2xs"
            >
              <HelpCircle className="w-4 h-4 text-purple-600" />
              <span>Ajuda</span>
            </Link>
          </div>
        </header>

        {/* View renderizada dentro do container com espaçamento aprimorado */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
