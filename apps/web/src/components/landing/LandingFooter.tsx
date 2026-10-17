'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-50 border-t border-zinc-200/90 text-zinc-600 text-sm py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 pb-12 border-b border-zinc-200/80">
          {/* Brand com Logo Aumentada 3x */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <div className="relative h-16 sm:h-20 w-56 sm:w-72 flex items-center">
                <Image
                  src="/brand/logooficial-semfundo.png"
                  alt="Marque Sua Hora"
                  width={288}
                  height={80}
                  className="h-16 sm:h-20 w-auto object-contain"
                />
              </div>
            </Link>
            <p className="text-zinc-600 max-w-md text-sm sm:text-base leading-relaxed font-normal">
              Plataforma de gestão, agenda online e cursos para profissionais e estúdios que atendem com hora marcada.
            </p>
          </div>

          {/* Nav links com fontes ampliadas */}
          <div className="flex flex-wrap items-center gap-7 text-zinc-700 font-bold text-sm sm:text-base">
            <a href="#recursos" className="hover:text-purple-700 transition-colors">Como funciona</a>
            <a href="#demonstracao" className="hover:text-purple-700 transition-colors">Simulador</a>
            <a href="#nichos" className="hover:text-purple-700 transition-colors">Nichos</a>
            <a href="#calculadora" className="hover:text-purple-700 transition-colors">Calculadora</a>
            <a href="#seguranca" className="hover:text-purple-700 transition-colors">Segurança</a>
            <a href="#planos" className="hover:text-purple-700 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-purple-700 transition-colors">Dúvidas</a>
            <Link href="/login" className="text-purple-700 hover:text-purple-800 transition-colors">Área do cliente</Link>
          </div>
        </div>

        {/* Bottom row: Privacy, Terms & LGPD */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-zinc-500 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dados tratados com segurança em conformidade com a LGPD (Lei nº 13.709/2018).</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/termos" className="hover:text-zinc-900 transition-colors">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-zinc-900 transition-colors">Privacidade</Link>
            <span>© {currentYear} Marque Sua Hora. Todos os direitos reservados.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
