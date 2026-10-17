'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { TenantShowcase } from '@/components/showcase/types';
import { ShowcaseHeader } from '@/components/showcase/ShowcaseHeader';
import { ShowcaseGallery } from '@/components/showcase/ShowcaseGallery';
import { ShowcaseInfoCards } from '@/components/showcase/ShowcaseInfoCards';
import { ShowcaseCourses } from '@/components/showcase/ShowcaseCourses';
import { ShowcaseProducts } from '@/components/showcase/ShowcaseProducts';
import { BookingWizard } from '@/components/showcase/BookingWizard';
import { ClientPortalModal } from '@/components/showcase/ClientPortalModal';

export default function PublicShowcasePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [tenant, setTenant] = useState<TenantShowcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPortalOpen, setIsPortalOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Busca dados reais diretamente da API do estabelecimento (sem dados fictícios/hardcoded)
    api
      .get(`/public/showcase/${slug}`)
      .then((res) => {
        if (!isMounted) return;
        setTenant(res.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err?.response?.data?.message ||
            'Estabelecimento não localizado. Verifique o link digitado.'
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const scrollToBooking = () => {
    const el = document.getElementById('agendamento');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-purple mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          Carregando vitrine de agendamento...
        </p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          Estabelecimento não encontrado
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          {error || 'Verifique o link digitado ou entre em contato com o profissional responsável.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      {/* 1. Topo da Marca (Header Panorâmico + Avatar + Bio + Redes) */}
      <ShowcaseHeader
        tenant={tenant}
        onBookClick={scrollToBooking}
        onPortalClick={() => setIsPortalOpen(true)}
      />

      {/* 2. Conteúdo em 2 Colunas no Desktop (Empilhado no Mobile) */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Vitrine, Galeria, Cursos e Confiança (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-6 order-2 lg:order-1">
            <ShowcaseGallery photos={tenant.galleryPhotos} tenantName={tenant.name} />
            <ShowcaseProducts tenant={tenant} />
            <ShowcaseCourses tenant={tenant} />
            <ShowcaseInfoCards tenant={tenant} />
          </div>

          {/* Coluna Direita: O Widget de Agendamento em 4 Passos (lg:col-span-6) */}
          <div className="lg:col-span-6 order-1 lg:order-2 sticky top-6">
            <BookingWizard tenant={tenant} brandColor={tenant.primaryColor || '#7C3AED'} />
          </div>
        </div>
      </main>

      {/* Botão Flutuante de WhatsApp para Dúvidas */}
      {tenant.phone && (
        <a
          href={`https://wa.me/55${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Olá! Gostaria de tirar uma dúvida sobre os serviços do ${tenant.name}.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-emerald-500 text-white shadow-floating flex items-center justify-center hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all"
          title="Falar no WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}

      {/* Rodapé Institucional Minimalista */}
      <footer className="py-6 border-t border-slate-200/60 bg-white/50 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} {tenant.name} · Plataforma{' '}
          <span className="font-bold text-slate-600">Marque Sua Hora</span>
        </p>
      </footer>

      {/* Modal do Portal da Cliente */}
      {isPortalOpen && (
        <ClientPortalModal
          slug={slug}
          tenantName={tenant.name}
          tenantPhone={tenant.phone}
          brandColor={tenant.primaryColor || '#7C3AED'}
          onClose={() => setIsPortalOpen(false)}
        />
      )}
    </div>
  );
}
