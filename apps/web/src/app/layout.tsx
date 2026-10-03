import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marca Tua Hora — Plataforma Premium de Agendamentos e Gestão',
  description:
    'A plataforma definitiva para salões de alto padrão, barbearias, clínicas de estética e personal trainers. Vitrine elegante, No-Show Shield com PIX dinâmico e lista de espera inteligente.',
  icons: {
    icon: '/brand/logo.jpg',
    shortcut: '/brand/logo.jpg',
    apple: '/brand/logo.jpg'
  },
  openGraph: {
    title: 'Marca Tua Hora — Plataforma Premium de Agendamentos',
    description: 'Transforme a gestão do seu salão com vitrine editorial, sinal PIX anti-faltas e lista de espera.',
    images: ['/brand/logo.jpg']
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#FAF9F6] text-slate-900 selection:bg-brand-purple/20 selection:text-brand-purple">
        {children}
      </body>
    </html>
  );
}
