'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  return (
    <aside
      aria-label="Aviso de novidades"
      className="bg-purple-50 border-b border-purple-100 text-purple-950 py-2.5 px-4 text-xs sm:text-sm font-medium"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 text-center flex-wrap">
        <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold shadow-2xs">
          Novidade
        </span>
        <span className="text-zinc-800 font-medium">
          Você já pode cadastrar e vender suas aulas e vídeos direto pelo link da bio, com 0% de taxas sobre seu faturamento.
        </span>
        <Link
          href="/cadastro?plan=free"
          className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-bold underline underline-offset-4 ml-1"
        >
          <span>Criar conta gratuita</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
};
