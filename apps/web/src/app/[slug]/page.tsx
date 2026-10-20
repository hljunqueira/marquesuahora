'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2,
  AlertCircle,
  MessageCircle,
  CalendarDays,
  ShoppingBag,
  GraduationCap,
  Store,
  Camera
} from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryInvalidation } from '@/lib/queryEvents';
import { TenantShowcase } from '@/components/showcase/types';
import { ShowcaseHeader } from '@/components/showcase/ShowcaseHeader';
import { ShowcaseGallery } from '@/components/showcase/ShowcaseGallery';
import { ShowcaseInfoCards } from '@/components/showcase/ShowcaseInfoCards';
import { ShowcaseCourses } from '@/components/showcase/ShowcaseCourses';
import { ShowcaseProducts } from '@/components/showcase/ShowcaseProducts';
import { BookingWizard } from '@/components/showcase/BookingWizard';
import { ClientPortalModal } from '@/components/showcase/ClientPortalModal';
import { SlugClaim404Page } from '@/components/showcase/SlugClaim404Page';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

type ShowcaseTab = 'BOOKING' | 'GALLERY' | 'PRODUCTS' | 'COURSES' | 'ABOUT';

export default function PublicShowcasePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [tenant, setTenant] = useState<TenantShowcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('BOOKING');

  const fetchShowcaseData = useCallback(
    async (silent = false) => {
      if (!slug) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await api.get(`/public/showcase/${slug}`);
        setTenant(res.data);
      } catch (err: any) {
        if (!silent) {
          setError(
            err?.response?.data?.message ||
              'Estabelecimento não localizado. Verifique o link digitado.'
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    fetchShowcaseData(false);
  }, [fetchShowcaseData]);

  // Sincronização em tempo real quando houver alterações de categorias/serviços/configurações
  useQueryInvalidation(['showcase', 'categories', 'services', 'tenant'], () => {
    fetchShowcaseData(true);
  });

  const scrollToBooking = () => {
    setActiveTab('BOOKING');
    const el = document.getElementById('vitrine-conteudo');
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
    return <SlugClaim404Page slug={slug} />;
  }

  const brandColor = tenant.primaryColor || '#5c0701';
  const hasProducts = Boolean(tenant.products && tenant.products.length > 0);
  const hasCourses = Boolean(tenant.courses && tenant.courses.length > 0);
  const hasGallery = Boolean(tenant.galleryPhotos && tenant.galleryPhotos.length > 0);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      {/* 1. Topo da Marca (Header Panorâmico + Avatar + Bio + Redes) */}
      <ShowcaseHeader
        tenant={tenant}
        onBookClick={scrollToBooking}
        onPortalClick={() => setIsPortalOpen(true)}
      />

      {/* 2. Barra de Navegação por Abas (Exibida quando há Galeria, Produtos ou Cursos) */}
      {(hasProducts || hasCourses || hasGallery) && (
        <div id="vitrine-conteudo" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Tab 1: Agenda & Serviços (Principal/Padrão) */}
              <button
                type="button"
                onClick={() => setActiveTab('BOOKING')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'BOOKING'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                style={{
                  backgroundColor: activeTab === 'BOOKING' ? brandColor : undefined
                }}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Agenda & Serviços</span>
              </button>

              {/* Tab 2: Galeria & Inspirações (se houver fotos cadastradas) */}
              {hasGallery && (
                <button
                  type="button"
                  onClick={() => setActiveTab('GALLERY')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'GALLERY'
                      ? 'text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'GALLERY' ? brandColor : undefined
                  }}
                >
                  <Camera className="w-4 h-4" />
                  <span>Galeria de Fotos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === 'GALLERY'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tenant.galleryPhotos?.length}
                  </span>
                </button>
              )}

              {/* Tab 3: Produtos (se houver) */}
              {hasProducts && (
                <button
                  type="button"
                  onClick={() => setActiveTab('PRODUCTS')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'PRODUCTS'
                      ? 'text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'PRODUCTS' ? brandColor : undefined
                  }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Produtos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === 'PRODUCTS'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tenant.products?.length}
                  </span>
                </button>
              )}

              {/* Tab 4: Cursos (se houver) */}
              {hasCourses && (
                <button
                  type="button"
                  onClick={() => setActiveTab('COURSES')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'COURSES'
                      ? 'text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'COURSES' ? brandColor : undefined
                  }}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Cursos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === 'COURSES'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tenant.courses?.length}
                  </span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* 3. Conteúdo da Aba Ativa */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1">
        {/* ABA 1: AGENDA & SERVIÇOS (LAYOUT PRINCIPAL) */}
        {activeTab === 'BOOKING' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna Esquerda no Desktop: Informações Essenciais e Diferenciais */}
            <div className="hidden lg:block lg:col-span-5 space-y-5 sticky top-20">
              <ShowcaseInfoCards tenant={tenant} />
              {hasGallery && (
                <ShowcaseGallery photos={tenant.galleryPhotos} tenantName={tenant.name} />
              )}
            </div>

            {/* Coluna Direita: O Widget de Agendamento em 4 Passos */}
            <div className="lg:col-span-7 space-y-6">
              {/* No mobile, exibir a galeria de trabalhos e unhas antes do agendamento para inspirar as clientes */}
              {hasGallery && (
                <div className="block lg:hidden">
                  <ShowcaseGallery photos={tenant.galleryPhotos} tenantName={tenant.name} />
                </div>
              )}
              <BookingWizard tenant={tenant} brandColor={brandColor} />
            </div>
          </div>
        )}

        {/* ABA 2: GALERIA DE FOTOS COMPLETA (INSPIRAÇÕES) */}
        {activeTab === 'GALLERY' && hasGallery && (
          <div className="max-w-4xl mx-auto space-y-6">
            <ShowcaseGallery photos={tenant.galleryPhotos} tenantName={tenant.name} />
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={scrollToBooking}
                style={{ backgroundColor: brandColor }}
                className="px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-md hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Gostou? Agende seu Horário Agora</span>
              </button>
            </div>
          </div>
        )}

        {/* ABA 3: PRODUTOS & HOME CARE */}
        {activeTab === 'PRODUCTS' && hasProducts && (
          <div className="max-w-4xl mx-auto">
            <ShowcaseProducts tenant={tenant} />
          </div>
        )}

        {/* ABA 4: CURSOS & TREINAMENTOS */}
        {activeTab === 'COURSES' && hasCourses && (
          <div className="max-w-4xl mx-auto">
            <ShowcaseCourses tenant={tenant} />
          </div>
        )}
      </main>

      {/* Botão Flutuante Oficial de WhatsApp para Dúvidas Rápidas */}
      {tenant.phone && (
        <a
          href={`https://wa.me/55${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Olá! Gostaria de tirar uma dúvida sobre os serviços do ${tenant.name}.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-40 drop-shadow-xl hover:scale-108 active:scale-95 transition-all duration-200"
          title="Falar no WhatsApp"
          aria-label="Falar no WhatsApp"
        >
          <WhatsAppIcon variant="official" size={52} className="block filter drop-shadow-md" />
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
          brandColor={brandColor}
          onClose={() => setIsPortalOpen(false)}
        />
      )}
    </div>
  );
}
