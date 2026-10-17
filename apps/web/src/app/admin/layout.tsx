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
  Radio,
  LogOut,
  ChevronRight,
  Loader2
} from 'lucide-react';

const ADMIN_NAV = [
  { href: '/admin', label: 'Visão Global & MRR', icon: LayoutDashboard },
  { href: '/admin/saloes', label: 'Lojas & Assinantes', icon: Building2 },
  { href: '/admin/planos', label: 'Editor de Planos', icon: CreditCard },
  { href: '/admin/integracoes', label: 'Integrações & Webhooks', icon: Radio },
  { href: '/admin/suporte', label: 'Central de Chamados', icon: Headphones },
  { href: '/admin/auditoria', label: 'Trilha de Auditoria', icon: ScrollText }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('@marcatuahora:token');
      const userDataStr = localStorage.getItem('user_data');

      if (!token || !userDataStr) {
        router.push('/login?expired=true');
        return;
      }

      try {
        const user = JSON.parse(userDataStr);
        if (user.role !== 'SUPER_ADMIN') {
          router.push('/dashboard');
          return;
        }
        setIsAuthorized(true);
      } catch {
        router.push('/login?expired=true');
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('@marcatuahora:token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    router.push('/login');
  };

  if (isAuthorized === null) {
    return (
      <div className="w-full min-h-screen bg-[#FAF9F7] flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="text-xs font-semibold">Verificando credenciais do Super Admin...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#FAF9F7] text-slate-800 flex flex-col md:flex-row">
      {/* Sidebar Super Admin */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 p-4 flex flex-col justify-between shrink-0 select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Logo & Badge Super Admin */}
          <div className="px-2 py-3 mb-6 border-b border-slate-100">
            <div className="relative w-44 h-12 mb-1">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] font-display font-bold text-slate-900">
                Super Admin
              </span>
              <span className="text-[9px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
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
                      ? 'bg-purple-50 text-purple-700 font-bold border border-purple-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left"
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
