'use client';

import React from 'react';
import { motion } from 'motion/react';

export const LandingNiches: React.FC = () => {
  const niches = [
    {
      title: 'Nail Designers & Manicures',
      description: 'Tempo de secagem e manutenção de fibra configurados para você não emendar atendimentos sem respirar.',
      detail: 'Alongamento, esmaltação e spa dos pés'
    },
    {
      title: 'Cabeleireiras & Salões',
      description: 'Controle de serviços demorados como mechas e progressivas, além de combos de corte com escova modelada.',
      detail: 'Mechas, corte, hidratação e química'
    },
    {
      title: 'Barbearias',
      description: 'Atendimento ágil aos sábados com divisão automática de comissões por cadeira para cada barbeiro parceiro.',
      detail: 'Corte fade, barba terapia e acabamento'
    },
    {
      title: 'Estética & Sobrancelhas',
      description: 'Lash lifting, micropigmentação e limpeza de pele com fichas de preferências e alerta de retoques.',
      detail: 'Design de sobrancelha, cílios e facial'
    },
    {
      title: 'Tatuagem & Body Piercing',
      description: 'Controle de projetos longos com bloqueio de sessões inteiras e orientações pré-atendimento.',
      detail: 'Sessões por hora ou diária'
    },
    {
      title: 'Aulas, Treinos & Terapeutas',
      description: 'Atendimentos individuais ou em pequenos grupos com confirmação de presença com antecedência.',
      detail: 'Personal, massoterapia e consultas'
    }
  ];

  return (
    <section id="nichos" className="py-24 md:py-36 bg-zinc-50/50 border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
        <div className="max-w-3xl text-left">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Nichos atendidos
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-3">
            Feito sob medida para quem vive de hora marcada
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 mt-3 leading-relaxed">
            Ajuste a duração dos procedimentos e termos usados conforme o seu segmento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {niches.map((n) => (
            <motion.div
              key={n.title}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
              className="p-8 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <h3 className="font-extrabold text-zinc-950 text-xl sm:text-2xl">
                  {n.title}
                </h3>
                <p className="text-base sm:text-lg text-zinc-600 leading-relaxed font-normal">
                  {n.description}
                </p>
              </div>

              <div className="pt-5 border-t border-zinc-100 text-sm font-semibold text-purple-700">
                {n.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
