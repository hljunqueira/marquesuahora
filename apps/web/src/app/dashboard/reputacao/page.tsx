'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Star,
  ExternalLink,
  Save,
  MessageSquare,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function DashboardReputacaoPage() {
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    'https://g.page/r/marquesuahora/review'
  );
  const [npsEnabled, setNpsEnabled] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const reviews = [
    {
      id: 'rev-1',
      clientName: 'Letícia Vasconcelos',
      rating: 5,
      comment: 'Atendimento impecável! O corte e a escova ficaram perfeitos. Já avaliei no Google!',
      date: 'Ontem às 18:30',
      wentToGoogle: true
    },
    {
      id: 'rev-2',
      clientName: 'Marcos Vinicius',
      rating: 5,
      comment: 'Pontualidade britânica e a melhor barba de SP.',
      date: 'Há 2 dias',
      wentToGoogle: true
    },
    {
      id: 'rev-3',
      clientName: 'Carla Silveira',
      rating: 3,
      comment: 'O atendimento foi bom, mas houve 15 minutos de atraso para o início da tintura.',
      date: 'Há 3 dias',
      wentToGoogle: false
    }
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Card de Configuração do Link Google */}
      <form
        onSubmit={handleSave}
        className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Link Oficial de Avaliação no Google
              </h3>
              <p className="text-xs text-slate-500">
                Os clientes que derem 5 estrelas no WhatsApp recebem este link de forma automática.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-semibold text-slate-600">Pesquisa Ativa</span>
            <input
              type="checkbox"
              checked={npsEnabled}
              onChange={(e) => setNpsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
            />
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            URL Curta do Perfil do Google Meu Negócio (GMB)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              required
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              placeholder="https://g.page/r/seusalão/review"
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-mono transition-all"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shrink-0 shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Salvo!' : 'Salvar Link'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Feed de Avaliações Recebidas */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-base font-display font-bold text-slate-900">
          Feed de Satisfação em Tempo Real
        </h3>

        <div className="space-y-3">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className={`p-4 rounded-2xl border transition-colors ${
                rev.rating === 5
                  ? 'bg-amber-50/30 border-amber-200/60'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <strong className="text-xs font-bold text-slate-900">
                    {rev.clientName}
                  </strong>
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                    ))}
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 font-medium">
                  {rev.date}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                "{rev.comment}"
              </p>

              {rev.wentToGoogle && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Convidado e direcionado para o Google Review</span>
                </span>
              )}

              {rev.rating <= 3 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  <span>Alerta interno da gerência: requer atenção</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
