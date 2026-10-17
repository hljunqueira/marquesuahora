'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Juliana Ferreira',
      role: 'Nail Designer',
      city: 'São Paulo - SP',
      text: 'Antes eu chegava em casa cansada às 20h e ainda passava duas horas no WhatsApp mandando fotos dos horários livres. Hoje coloco o link na bio e as clientes agendam sozinhas até no domingo.'
    },
    {
      name: 'Carlos Eduardo',
      role: 'Proprietário de Barbearia',
      city: 'Curitiba - PR',
      text: 'O que mais fez diferença para nós foi o lembrete automático. Sábado era comum ter 3 ou 4 clientes que não apareciam. Agora eles confirmam direto pela mensagem e as faltas caíram bastante.'
    },
    {
      name: 'Renata Vasconcelos',
      role: 'Esteticista & Micropigmentadora',
      city: 'Belo Horizonte - MG',
      text: 'Comecei a vender meu workshop de lash lifting pela própria plataforma. As alunas compram pelo WhatsApp direto comigo e eu libero os vídeos sem precisar pagar comissão para plataformas caras de curso.'
    }
  ];

  return (
    <section className="py-24 md:py-36 bg-white border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl text-left mb-14">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Experiência real
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-3">
            Quem atende com hora marcada recomenda
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 mt-3 leading-relaxed">
            Veja como a rotina mudou para profissionais que automatizaram seus agendamentos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
              className="p-8 sm:p-9 rounded-3xl bg-zinc-50/60 border border-zinc-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-amber-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <p className="text-base sm:text-lg text-zinc-700 leading-relaxed italic font-normal">
                  "{t.text}"
                </p>
              </div>

              <div className="pt-5 border-t border-zinc-200/70 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="font-extrabold text-zinc-950 text-base sm:text-lg">{t.name}</div>
                  <div className="text-xs sm:text-sm text-zinc-500 font-medium">
                    {t.role} • {t.city}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
