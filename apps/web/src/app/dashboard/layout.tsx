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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

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
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 p-4 shrink-0 justify-between select-none">
        <div>
          {/* Logo & Nome do Salão */}
          <div className="px-2 py-3 mb-6 border-b border-slate-800/80">
            <div className="relative w-44 h-12 mb-1">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                fill
                className="object-contain object-left brightness-0 invert"
                priority
              />
            </div>
            <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block">
              Painel do Assinante
            </span>
          </div>

          {/* Links de Navegação */}
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          {/* Link para vitrine pública */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-brand-gold hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Vitrine Pública</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </a>

          {/* Botão de Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* CABEÇALHO MOBILE */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="relative w-36 h-9">
          <Image
            src="/brand/logooficial-semfundo.png"
            alt="Marque Sua Hora"
            fill
            className="object-contain object-left brightness-0 invert"
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white"
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
            className="md:hidden fixed inset-x-0 top-14 bg-slate-900 text-slate-300 border-b border-slate-800 z-30 p-4 shadow-2xl"
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
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-rose-400"
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
        {/* Barra Superior Interna com Boas-vindas */}
        <div className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </span>
            <h2 className="text-sm font-bold text-slate-900 leading-none mt-0.5">
              {user?.name ? `Olá, ${user.name}` : 'Bem-vindo de volta'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/suporte"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors text-xs flex items-center gap-1.5 font-medium"
            >
              <HelpCircle className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">Ajuda</span>
            </Link>
          </div>
        </div>

        {/* View renderizada */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
