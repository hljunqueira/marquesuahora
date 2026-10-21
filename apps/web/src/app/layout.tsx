import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#7c3aed'
};

export const metadata: Metadata = {
  title: 'Marque Sua Hora — Plataforma Premium de Agendamentos e Gestão',
  description:
    'A plataforma definitiva para salões de alto padrão, barbearias, clínicas de estética e personal trainers. Vitrine elegante, No-Show Shield com PIX dinâmico e lista de espera inteligente.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/favicon-32x32.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MarqueSuaHora'
  },
  openGraph: {
    title: 'Marque Sua Hora — Plataforma Premium de Agendamentos',
    description: 'Transforme a gestão do seu salão com vitrine editorial, sinal PIX anti-faltas e lista de espera.',
    images: ['/brand/app-icon.jpg']
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
