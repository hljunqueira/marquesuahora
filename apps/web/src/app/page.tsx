import React from 'react';
import { Metadata } from 'next';
import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingBentoGrid } from '@/components/landing/LandingBentoGrid';
import { LandingPhoneSimulator } from '@/components/landing/LandingPhoneSimulator';
import { LandingNiches } from '@/components/landing/LandingNiches';
import { LandingNoShowCalculator } from '@/components/landing/LandingNoShowCalculator';
import { LandingSecurityLgpd } from '@/components/landing/LandingSecurityLgpd';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingComparisonTable } from '@/components/landing/LandingComparisonTable';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Marque Sua Hora | Sistema de Agendamento Online e Gestão para Profissionais',
  description:
    'Sua agenda organizada e suas clientes agendando sozinhas. Link na bio, lembretes automáticos no WhatsApp, cursos online próprios e controle de faltas sem complicação.'
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-purple-600 selection:text-white antialiased">
      {/* 1. Faixa de Novidades */}
      <AnnouncementBar />

      {/* 2. Cabeçalho de Navegação */}
      <LandingHeader />

      <main className="flex-1">
        {/* 3. Hero Section com Mockup Desktop */}
        <LandingHero />

        {/* 4. Bento Grid de Recursos */}
        <LandingBentoGrid />

        {/* 5. Simulador Interativo no Celular */}
        <LandingPhoneSimulator />

        {/* 6. Nichos Atendidos */}
        <LandingNiches />

        {/* 7. Calculadora de No-Show */}
        <LandingNoShowCalculator />

        {/* 8. Segurança & LGPD */}
        <LandingSecurityLgpd />

        {/* 9. Prova Social e Depoimentos */}
        <LandingTestimonials />

        {/* 10. Tabela Comparativa */}
        <LandingComparisonTable />

        {/* 11. Planos e Preços */}
        <LandingPricing />

        {/* 12. Dúvidas Frequentes (FAQ) */}
        <LandingFaq />

        {/* 13. Chamada Final para Ação */}
        <LandingFinalCta />
      </main>

      {/* 14. Rodapé Oficial */}
      <LandingFooter />
    </div>
  );
}
