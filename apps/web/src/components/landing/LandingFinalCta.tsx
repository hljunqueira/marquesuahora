'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingFinalCta: React.FC = () => {
  return (
    <section className="py-24 md:py-36 bg-white border-t border-zinc-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.6 }}
          className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-9 sm:p-16 text-center space-y-8 shadow-2xl shadow-purple-900/20 relative overflow-hidden text-white"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto space-y-4 relative z-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/15 text-white text-xs sm:text-sm font-bold backdrop-blur-xs">
              Comece agora sem burocracia
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12]">
              Pronto para colocar sua agenda no piloto automático?
            </h2>
            <p className="text-base sm:text-xl text-purple-100 leading-relaxed max-w-2xl mx-auto">
              Crie seu catálogo de serviços e receba seu link exclusivo hoje mesmo. Sem fidelidade, sem taxa de adesão e sem exigir cartão de crédito.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/cadastro?plan=free"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-5 rounded-2xl bg-white hover:bg-zinc-100 text-purple-700 font-extrabold text-base sm:text-lg shadow-xl transition-all"
              >
                <span>Criar minha conta gratuita</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm sm:text-base text-purple-100 pt-3 relative z-10 font-semibold">
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-300" />
              Configuração em 3 minutos
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-300" />
              30 agendamentos gratuitos/mês
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-300" />
              Sem fidelidade contratual
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
