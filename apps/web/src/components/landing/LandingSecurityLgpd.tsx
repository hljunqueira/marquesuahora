'use client';

import React from 'react';
import { motion } from 'motion/react';

export const LandingSecurityLgpd: React.FC = () => {
  const pillars = [
    {
      num: '01',
      title: 'Criptografia e senhas seguras',
      desc: 'Todas as senhas são armazenadas utilizando o padrão Argon2, garantindo proteção contra invasões e vazamentos.'
    },
    {
      num: '02',
      title: 'Backups automáticos diários',
      desc: 'Sua base de clientes e histórico de agendamentos passam por rotinas de backup diárias em infraestrutura dedicada.'
    },
    {
      num: '03',
      title: 'Conformidade com a LGPD',
      desc: 'Tratamento de dados estritamente voltado ao agendamento, com consentimento claro e sem repasse de informações a terceiros.'
    },
    {
      num: '04',
      title: 'Permissões por perfil de equipe',
      desc: 'Você define o que cada profissional parceiro ou recepcionista pode visualizar na agenda, mantendo dados sensíveis sob controle.'
    }
  ];

  return (
    <section id="seguranca" className="py-24 md:py-36 bg-zinc-50/50 border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
        <div className="max-w-3xl text-left">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Segurança & Privacidade
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-3">
            Seus dados e os das suas clientes protegidos de verdade
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 mt-3 leading-relaxed">
            A segurança da informação é tratada com seriedade desde a primeira linha de código, seguindo os requisitos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {pillars.map((p) => (
            <motion.div
              key={p.title}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
              className="p-8 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <span className="text-xs sm:text-sm font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 inline-block">
                {p.num}
              </span>
              <h3 className="font-extrabold text-zinc-950 text-lg sm:text-xl">
                {p.title}
              </h3>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
