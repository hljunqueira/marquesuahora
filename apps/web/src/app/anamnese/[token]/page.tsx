'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';

interface AnamnesisData {
  hasAllergies: boolean;
  allergies: string;
  isDiabetic: boolean;
  hasNailMycosis: boolean;
  isPregnant: boolean;
  bitesNails: boolean;
  chemicalHandling: boolean;
  preferredShape: string;
  notes: string;
}

const NAIL_SHAPES = ['Quadrada', 'Redonda', 'Almond', 'Bailarina', 'Stiletto'];

export default function AnamnesisPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientInfo, setClientInfo] = useState<{ name: string; phone: string } | null>(null);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; phone: string; logoUrl?: string } | null>(null);

  const [formData, setFormData] = useState<AnamnesisData>({
    hasAllergies: false,
    allergies: '',
    isDiabetic: false,
    hasNailMycosis: false,
    isPregnant: false,
    bitesNails: false,
    chemicalHandling: false,
    preferredShape: 'Quadrada',
    notes: ''
  });

  useEffect(() => {
    if (!token) return;

    api
      .get(`/public/anamnesis/${token}`)
      .then((res) => {
        const { client, tenant } = res.data;
        setClientInfo({ name: client.name, phone: client.phone });
        setTenantInfo(tenant);

        if (client.anamnesis) {
          setFormData({
            hasAllergies: Boolean(client.anamnesis.hasAllergies),
            allergies: client.anamnesis.allergies || '',
            isDiabetic: Boolean(client.anamnesis.isDiabetic),
            hasNailMycosis: Boolean(client.anamnesis.hasNailMycosis),
            isPregnant: Boolean(client.anamnesis.isPregnant),
            bitesNails: Boolean(client.anamnesis.bitesNails),
            chemicalHandling: Boolean(client.anamnesis.chemicalHandling),
            preferredShape: client.anamnesis.preferredShape || 'Quadrada',
            notes: client.anamnesis.notes || ''
          });
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Ficha de anamnese não localizada ou link expirado.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post(`/public/anamnesis/${token}`, formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao salvar suas respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Carregando sua ficha...</p>
        </div>
      </div>
    );
  }

  if (error && !clientInfo) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-3">
          <h2 className="text-base font-bold text-slate-900">Acesso Indisponível</h2>
          <p className="text-xs text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Ficha Salva com Sucesso
          </span>
          <h2 className="text-xl font-extrabold text-slate-900">
            Obrigado, {clientInfo?.name}!
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Suas informações de saúde e preferências foram registradas de forma segura. A equipe de{' '}
            <strong>{tenantInfo?.name}</strong> terá acesso a estes dados para garantir o melhor atendimento para você.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.close()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Fechar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-8 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Cabeçalho Institucional Sóbrio */}
        <div className="text-center space-y-2">
          {tenantInfo?.logoUrl && (
            <img
              src={resolveImageUrl(tenantInfo.logoUrl)}
              alt={tenantInfo.name}
              className="w-14 h-14 rounded-2xl mx-auto object-cover border border-slate-200 mb-2 shadow-xs"
            />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {tenantInfo?.name || 'Marque Sua Hora'}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Ficha de Anamnese Técnica
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Olá, <strong>{clientInfo?.name}</strong>! Responda às perguntas abaixo em menos de 1 minuto para personalizarmos seus atendimentos com segurança.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          {/* Pergunta 1: Alergias */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              1. Você possui alergia a algum esmalte, gel UV, álcool ou componente químico?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasAllergies: false, allergies: '' })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${!formData.hasAllergies
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasAllergies: true })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${formData.hasAllergies
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Sim
              </button>
            </div>
            {formData.hasAllergies && (
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600 mt-2"
              />
            )}
          </div>

          {/* Pergunta 2: Diabetes */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              2. Possui diabetes?
            </label>
            <p className="text-[11px] text-slate-400">
              Essa informação é fundamental para o cuidado com a cutilagem e cicatrização.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isDiabetic: false })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${!formData.isDiabetic
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isDiabetic: true })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${formData.isDiabetic
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Sim
              </button>
            </div>
          </div>

          {/* Pergunta 3: Micoses ou Fungos */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              3. Apresenta histórico recente de micose, fungo ou descolamento de unha?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasNailMycosis: false })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${!formData.hasNailMycosis
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasNailMycosis: true })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${formData.hasNailMycosis
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Sim
              </button>
            </div>
          </div>

          {/* Pergunta 4: Gestante / Amamentando */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              4. Está gestante ou amamentando?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPregnant: false })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${!formData.isPregnant
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPregnant: true })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${formData.isPregnant
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Sim
              </button>
            </div>
          </div>

          {/* Pergunta 5: Hábito de roer unhas (Onicofagia) */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              5. Tem o hábito de roer unhas ou morder cantinhos de pele?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bitesNails: false })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${!formData.bitesNails
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bitesNails: true })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${formData.bitesNails
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Sim
              </button>
            </div>
          </div>

          {/* Pergunta 6: Produtos químicos sem luva */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              6. Tem contato frequente com produtos de limpeza sem luvas?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, chemicalHandling: false })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${!formData.chemicalHandling
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, chemicalHandling: true })}
                className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${formData.chemicalHandling
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Sim
              </button>
            </div>
          </div>

          {/* Pergunta 7: Formato predileto */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              7. Qual formato de unha você mais gosta?
            </label>
            <div className="flex flex-wrap gap-2">
              {NAIL_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredShape: shape })}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${formData.preferredShape === shape
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          {/* Pergunta 8: Observações extras */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              8. Observações ou detalhes adicionais (opcional)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600 resize-none"
            />
          </div>

          {/* Botão de Envio com Touch Target >= 44px */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Salvando Ficha...' : 'Concluir e Salvar Ficha de Anamnese'}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Seus dados são protegidos e visualizados exclusivamente pela profissional durante o seu atendimento.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
