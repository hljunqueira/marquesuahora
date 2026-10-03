'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  LayoutDashboard,
  Building2,
  CreditCard,
  Headphones,
  ScrollText,
  LogOut,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const ADMIN_NAV = [
  { href: '/admin', label: 'Visão Global & MRR', icon: LayoutDashboard },
  { href: '/admin/saloes', label: 'Lojas & Assinantes', icon: Building2 },
  { href: '/admin/planos', label: 'Editor de Planos', icon: CreditCard },
  { href: '/admin/suporte', label: 'Central de Chamados', icon: Headphones },
  { href: '/admin/auditoria', label: 'Trilha de Auditoria', icon: ScrollText }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    router.push('/login');
  };

  return (
    <div className="w-full min-h-screen bg-[#080B11] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Super Admin */}
      <aside className="w-full md:w-64 bg-[#0B0F19] border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Logo & Badge Super Admin */}
          <div className="px-2 py-3 mb-6 border-b border-slate-800">
            <div className="relative w-44 h-12 mb-1">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                fill
                className="object-contain object-left brightness-0 invert"
                priority
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] font-display font-bold text-white">
                Super Admin
              </span>
              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                CONTROLE GLOBAL
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition-colors"
          >
            <span>Ver Painel Assinante</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do Super Admin</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Super Admin */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
