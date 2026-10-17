'use client';

import React from 'react';
import { motion } from 'motion/react';

export const LandingBentoGrid: React.FC = () => {
  return (
    <section id="recursos" className="py-24 md:py-36 bg-zinc-50/50 border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
        <div className="max-w-3xl text-left">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Recursos inclusos
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-3">
            Ferramentas práticas para o dia a dia do seu negócio
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 mt-3 leading-relaxed">
            Cada função foi desenhada para resolver um problema real de quem atende com hora marcada.
          </p>
        </div>

        {/* Bento Grid com fontes ampliadas e sem ícones decorativos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {/* Card 1: Agendamento 24/7 (Grande - 2 colunas) */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            className="md:col-span-2 p-8 sm:p-10 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <span className="text-xs sm:text-sm font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200/60 inline-block">
                01
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">
                Link na bio com agendamento direto
              </h3>
              <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl">
                Coloque o link no seu Instagram ou envie pelo WhatsApp. A cliente visualiza seus serviços, os preços, as fotos do seu espaço e os horários que você tem livre, sem precisar te mandar mensagem para perguntar "tem vaga hoje?".
              </p>
            </div>

            <div className="pt-5 mt-8 border-t border-zinc-100 text-sm sm:text-base font-semibold text-purple-700">
              A agenda é atualizada na hora para evitar horários duplicados.
            </div>
          </motion.div>

          {/* Card 2: Lembretes WhatsApp */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            className="p-8 sm:p-10 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60 inline-block">
                02
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950">
                Lembretes no WhatsApp
              </h3>
              <p className="text-base text-zinc-600 leading-relaxed">
                O sistema envia a confirmação no momento do agendamento e um lembrete antes do horário marcado, pedindo confirmação. Isso diminui esquecimentos e clientes que somem de última hora.
              </p>
            </div>

            <div className="pt-5 mt-8 border-t border-zinc-100 text-sm font-semibold text-emerald-700">
              Lembretes disparados diretamente pelo WhatsApp.
            </div>
          </motion.div>

          {/* Card 3: Cursos e Aulas Próprias */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            className="p-8 sm:p-10 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xs sm:text-sm font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60 inline-block">
                  03
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-bold">
                  Diferencial
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950">
                Cursos para alunas
              </h3>
              <p className="text-base text-zinc-600 leading-relaxed">
                Se você dá cursos presenciais ou online de aperfeiçoamento, pode cadastrar suas aulas em vídeo e disponibilizar para suas alunas. O pagamento cai direto na sua conta, sem taxas de infoproduto.
              </p>
            </div>

            <div className="pt-5 mt-8 border-t border-zinc-100 text-sm font-semibold text-amber-700">
              Zero comissão sobre as suas vendas de cursos.
            </div>
          </motion.div>

          {/* Card 4: Ficha das Clientes */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            className="p-8 sm:p-10 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <span className="text-xs sm:text-sm font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60 inline-block">
                04
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950">
                Histórico das clientes
              </h3>
              <p className="text-base text-zinc-600 leading-relaxed">
                Saiba a cor de esmalte favorita, o intervalo habitual de retorno e anotações importantes para cada cliente. Atendimento personalizado que gera fidelização imediata.
              </p>
            </div>

            <div className="pt-5 mt-8 border-t border-zinc-100 text-sm font-semibold text-blue-700">
              Ficha digital prática com histórico de atendimentos.
            </div>
          </motion.div>

          {/* Card 5: Gestão Financeira Simples */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            className="p-8 sm:p-10 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <span className="text-xs sm:text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200/60 inline-block">
                05
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950">
                Faturamento e comissões
              </h3>
              <p className="text-base text-zinc-600 leading-relaxed">
                Acompanhe o faturamento do mês, o ticket médio e a divisão de comissões por profissional parceiro sem precisar gastar horas fechando cadernos de anotações no final do mês.
              </p>
            </div>

            <div className="pt-5 mt-8 border-t border-zinc-100 text-sm font-semibold text-indigo-700">
              Relatórios claros e objetivos para tomada de decisão.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
