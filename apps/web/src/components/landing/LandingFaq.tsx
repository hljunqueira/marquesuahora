'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LandingFaq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Preciso cadastrar cartão de crédito para testar?',
      a: 'Não. Você pode criar sua conta e começar no plano gratuito imediatamente com até 30 agendamentos por mês, sem digitar nenhum dado financeiro ou de cartão.'
    },
    {
      q: 'Minhas clientes precisam baixar algum aplicativo para agendar?',
      a: 'Não. A cliente clica no seu link pelo celular e a vitrine abre direto no navegador (Safari, Chrome, etc.). Isso evita que as clientes desistam de agendar por falta de espaço ou memória no celular.'
    },
    {
      q: 'Como funciona o envio de lembretes pelo WhatsApp?',
      a: 'O sistema dispara mensagens automáticas no número informado pela cliente. Ela recebe a confirmação na hora da reserva e um lembrete com antecedência para confirmar a presença, reduzindo o no-show drasticamente.'
    },
    {
      q: 'Posso cadastrar mais profissionais que atendem comigo?',
      a: 'Sim. No plano Equipe Pro você pode cadastrar até 5 profissionais no mesmo estúdio, cada um com sua própria grade de horários, comissões e serviços específicos.'
    },
    {
      q: 'Como funciona o módulo de cursos online?',
      a: 'Se você ensina suas técnicas em workshops ou cursos, pode subir os links dos seus vídeos (links não listados do YouTube, Vimeo ou Google Drive). Suas alunas acessam as aulas e você recebe o pagamento integral via PIX direto, sem nenhuma comissão da plataforma.'
    },
    {
      q: 'Posso cancelar a qualquer momento?',
      a: 'Sim. Não há contratos de fidelidade ou multas de cancelamento. Se você assinar um plano pago mensal, pode cancelar direto no painel com apenas um clique.'
    }
  ];

  return (
    <section id="faq" className="py-24 md:py-36 bg-zinc-50/50 border-t border-zinc-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-left mb-14">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Tire suas dúvidas
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-3">
            Perguntas comuns antes de começar
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 mt-3 leading-relaxed">
            Respostas diretas e transparentes sobre como o sistema funciona.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={faq.q}
                className="rounded-3xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 sm:p-7 text-left flex items-center justify-between gap-5 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <span className="font-extrabold text-zinc-950 text-base sm:text-lg">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-zinc-400"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 sm:px-7 sm:pb-7 text-sm sm:text-base text-zinc-600 leading-relaxed border-t border-zinc-100 pt-4 font-normal">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
