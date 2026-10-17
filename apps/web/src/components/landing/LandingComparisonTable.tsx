'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

export const LandingComparisonTable: React.FC = () => {
  const comparisons = [
    {
      feature: 'Lembretes automáticos no WhatsApp',
      msh: 'Inclusos nos planos com automação',
      mshCheck: true,
      others: 'Cobrados à parte por pacote de mensagens',
      othersCheck: false
    },
    {
      feature: 'Experiência para a sua cliente',
      msh: 'Agenda direto no navegador sem baixar app',
      mshCheck: true,
      others: 'Exige download de app de 80MB e cadastro',
      othersCheck: false
    },
    {
      feature: 'Cursos e vídeos para suas alunas',
      msh: 'Incluso, com 0% de comissão sobre vendas',
      mshCheck: true,
      others: 'Não possui ou exige plataformas externas',
      othersCheck: false
    },
    {
      feature: 'Vitrine de fotos dos seus trabalhos',
      msh: 'Galeria visual integrada ao link na bio',
      mshCheck: true,
      others: 'Apenas lista de texto simples',
      othersCheck: false
    },
    {
      feature: 'Proteção contra faltas (No-Show)',
      msh: 'Histórico de faltas e confirmação automática',
      mshCheck: true,
      others: 'Sem controle preventivo de ausências',
      othersCheck: false
    },
    {
      feature: 'Avisos automáticos no WhatsApp',
      msh: 'Disparos automáticos de lembrete com 24h e 2h de antecedência',
      mshCheck: true,
      others: 'Cobram taxas extras por mensagens ou exigem envio manual',
      othersCheck: false
    }
  ];

  return (
    <section className="py-24 md:py-36 bg-zinc-50/50 border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl text-left mb-14">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
            Comparativo direto
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-3">
            Por que profissionais escolhem o Marque Sua Hora
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 mt-3 leading-relaxed">
            Veja a diferença de usar uma ferramenta feita especialmente para a realidade brasileira.
          </p>
        </div>

        {/* Comparison Table com fontes ampliadas */}
        <div className="overflow-x-auto rounded-3xl border border-zinc-200/90 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-sm sm:text-base">
                <th className="p-5 sm:p-6 font-extrabold text-zinc-950 w-2/5">Recurso / Diferencial</th>
                <th className="p-5 sm:p-6 font-extrabold text-purple-700 bg-purple-50/70 border-x border-purple-200/60 w-3/10">
                  Marque Sua Hora
                </th>
                <th className="p-5 sm:p-6 font-bold text-zinc-500 w-3/10">
                  Outras plataformas / Caderno
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm sm:text-base">
              {comparisons.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="p-5 sm:p-6 font-bold text-zinc-900">
                    {row.feature}
                  </td>
                  <td className="p-5 sm:p-6 bg-purple-50/40 border-x border-purple-200/50 text-zinc-900 font-semibold">
                    <div className="flex items-start gap-2.5">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{row.msh}</span>
                    </div>
                  </td>
                  <td className="p-5 sm:p-6 text-zinc-500 font-medium">
                    <div className="flex items-start gap-2.5">
                      <X className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{row.others}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
