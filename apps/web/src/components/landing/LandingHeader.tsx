'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Como funciona', href: '#recursos' },
    { label: 'Simulador', href: '#demonstracao' },
    { label: 'Nichos', href: '#nichos' },
    { label: 'Calculadora', href: '#calculadora' },
    { label: 'Segurança', href: '#seguranca' },
    { label: 'Planos', href: '#planos' },
    { label: 'Dúvidas', href: '#faq' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-24 sm:h-28 flex items-center justify-between gap-6">
        {/* Logo Oficial Sem Fundo (Aumentada 3x) */}
        <Link href="/" className="flex items-center group py-2">
          <div className="relative h-16 sm:h-20 w-56 sm:w-72 flex items-center">
            <Image
              src="/brand/logooficial-semfundo.png"
              alt="Marque Sua Hora"
              width={288}
              height={80}
              className="h-16 sm:h-20 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              priority
            />
          </div>
        </Link>

        {/* Desktop Nav com fontes maiores */}
        <nav className="hidden xl:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-zinc-700 hover:text-zinc-950 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action CTAs com fontes maiores */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          >
            Acessar conta
          </Link>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
          >
            <Link
              href="/cadastro?plan=free"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-sm hover:shadow-purple-500/25 transition-all"
            >
              <span>Cadastrar grátis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden p-3 rounded-2xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          aria-label="Abrir menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="xl:hidden bg-white border-b border-zinc-200 p-6 space-y-4 shadow-xl"
        >
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-base font-semibold text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-4 border-t border-zinc-200 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full py-3.5 text-center rounded-xl text-sm font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 transition-colors"
            >
              Acessar conta
            </Link>
            <Link
              href="/cadastro?plan=free"
              className="w-full py-3.5 text-center rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
            >
              Cadastrar grátis
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
};
