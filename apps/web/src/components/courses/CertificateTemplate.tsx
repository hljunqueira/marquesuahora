'use client';

import React from 'react';

export interface CertificateData {
  code: string;
  studentName: string;
  courseTitle: string;
  tenantName: string;
  tenantLogoUrl?: string | null;
  completedAt: string | Date;
  hours?: number | null;
  instructorName?: string | null;
  instructorTitle?: string | null;
  signatureUrl?: string | null;
  borderStyle?: 'GOLD' | 'SLATE' | 'CHAMPAGNE' | string;
  customText?: string | null;
  programmaticContent?: string | null;
  verificationUrl?: string;
}

interface CertificateTemplateProps {
  data: CertificateData;
  className?: string;
}

export function CertificateTemplate({ data, className = '' }: CertificateTemplateProps) {
  const formattedDate = React.useMemo(() => {
    try {
      const d = typeof data.completedAt === 'string' ? new Date(data.completedAt) : data.completedAt;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return new Date().toLocaleDateString('pt-BR');
    }
  }, [data.completedAt]);

  const borderTheme = React.useMemo(() => {
    switch (data.borderStyle) {
      case 'SLATE':
        return {
          primary: '#334155',
          secondary: '#64748B',
          accent: '#94A3B8',
          bgHighlight: 'rgba(51, 65, 85, 0.03)'
        };
      case 'CHAMPAGNE':
        return {
          primary: '#B45309',
          secondary: '#D97706',
          accent: '#FBBF24',
          bgHighlight: 'rgba(180, 83, 9, 0.03)'
        };
      case 'GOLD':
      default:
        return {
          primary: '#947A46',
          secondary: '#C5A880',
          accent: '#DFCCA8',
          bgHighlight: 'rgba(148, 122, 70, 0.04)'
        };
    }
  }, [data.borderStyle]);

  const verificationUrl = data.verificationUrl || `https://marquesuahora.com.br/validar/${data.code}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;

  const hours = data.hours || 16;
  const instructorName = data.instructorName || data.tenantName;
  const instructorTitle = data.instructorTitle || 'Instrutora Responsável';

  return (
    <div
      className={`certificate-container relative bg-[#FDFBF7] text-zinc-900 select-none shadow-xl border overflow-hidden p-6 md:p-10 ${className}`}
      style={{
        aspectRatio: '1.414 / 1',
        borderColor: borderTheme.primary,
        backgroundColor: '#FDFBF7',
        boxSizing: 'border-box'
      }}
    >
      {/* Moldura Geométrica Dupla Nobre */}
      <div
        className="absolute inset-3 md:inset-5 pointer-events-none border"
        style={{ borderColor: borderTheme.primary, borderWidth: '2px' }}
      />
      <div
        className="absolute inset-4 md:inset-7 pointer-events-none border"
        style={{ borderColor: borderTheme.secondary, borderWidth: '1px' }}
      />

      {/* Arabescos Geométricos dos 4 Cantos (SVG Vetorial de Alta Precisão) */}
      <svg
        className="absolute top-4 left-4 md:top-7 md:left-7 w-12 h-12 md:w-16 md:h-16 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke={borderTheme.primary}
        strokeWidth="2"
      >
        <path d="M5 5 H45 M5 5 V45 M15 15 H35 M15 15 V35 M5 25 Q25 25 25 5 M10 40 Q40 40 40 10" />
      </svg>
      <svg
        className="absolute top-4 right-4 md:top-7 md:right-7 w-12 h-12 md:w-16 md:h-16 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke={borderTheme.primary}
        strokeWidth="2"
      >
        <path d="M95 5 H55 M95 5 V45 M85 15 H65 M85 15 V35 M95 25 Q75 25 75 5 M90 40 Q60 40 60 10" />
      </svg>
      <svg
        className="absolute bottom-4 left-4 md:bottom-7 md:left-7 w-12 h-12 md:w-16 md:h-16 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke={borderTheme.primary}
        strokeWidth="2"
      >
        <path d="M5 95 H45 M5 95 V55 M15 85 H35 M15 85 V65 M5 75 Q25 75 25 95 M10 60 Q40 60 40 90" />
      </svg>
      <svg
        className="absolute bottom-4 right-4 md:bottom-7 md:right-7 w-12 h-12 md:w-16 md:h-16 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke={borderTheme.primary}
        strokeWidth="2"
      >
        <path d="M95 95 H55 M95 95 V55 M85 85 H65 M85 85 V65 M95 75 Q75 75 75 95 M90 60 Q60 60 60 90" />
      </svg>

      {/* Conteúdo Central Estruturado */}
      <div className="relative h-full flex flex-col justify-between text-center px-4 md:px-12 py-3 md:py-6">
        {/* Topo: Logo & Instituição Formadora */}
        <div className="flex flex-col items-center justify-center">
          {data.tenantLogoUrl ? (
            <img
              src={data.tenantLogoUrl}
              alt={data.tenantName}
              className="h-10 md:h-14 max-w-[180px] object-contain mb-1"
            />
          ) : (
            <div
              className="font-serif tracking-widest text-xs md:text-sm font-semibold uppercase mb-1"
              style={{ color: borderTheme.primary }}
            >
              {data.tenantName}
            </div>
          )}
          <div className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-zinc-500 font-medium">
            Formação Profissional & Especialização Técnica
          </div>
        </div>

        {/* Título Principal do Diploma */}
        <div className="my-2 md:my-3">
          <h1
            className="font-serif text-xl md:text-3xl lg:text-4xl font-bold tracking-wider uppercase text-zinc-900"
            style={{ letterSpacing: '0.08em' }}
          >
            Certificado de Conclusão
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="h-[1px] w-12 md:w-20" style={{ backgroundColor: borderTheme.secondary }} />
            <span className="text-[9px] md:text-[11px] tracking-widest uppercase text-zinc-400 font-medium">
              Chancela Oficial
            </span>
            <span className="h-[1px] w-12 md:w-20" style={{ backgroundColor: borderTheme.secondary }} />
          </div>
        </div>

        {/* Corpo: Outorga e Nome da Aluna */}
        <div className="max-w-2xl mx-auto my-1 md:my-2 space-y-2">
          <p className="text-xs md:text-sm text-zinc-600 font-serif italic">
            Certificamos que, para os devidos fins de comprovação técnica e capacitação profissional,
          </p>

          <div className="py-1">
            <div
              className="font-serif text-xl md:text-3xl lg:text-4xl font-bold tracking-wide text-zinc-900 border-b-2 pb-1 inline-block min-w-[260px] md:min-w-[380px]"
              style={{ borderColor: borderTheme.primary }}
            >
              {data.studentName}
            </div>
          </div>

          <p className="text-xs md:text-sm text-zinc-700 leading-relaxed max-w-xl mx-auto">
            {data.customText ? (
              data.customText
                .replace('{aluna_nome}', data.studentName)
                .replace('{curso_titulo}', data.courseTitle)
                .replace('{carga_horaria}', `${hours} horas`)
                .replace('{data_conclusao}', formattedDate)
                .replace('{estabelecimento_nome}', data.tenantName)
            ) : (
              <>
                concluiu com êxito e integral aproveitamento a formação em{' '}
                <strong className="font-semibold text-zinc-900">{data.courseTitle}</strong>, ministrada com carga horária
                de <strong className="font-semibold text-zinc-900">{hours} horas</strong>, desenvolvendo as competências e
                padrões de excelência prática exigidos pelo mercado.
              </>
            )}
          </p>

          {data.programmaticContent && (
            <p className="text-[10px] md:text-xs text-zinc-500 italic max-w-lg mx-auto line-clamp-2">
              Conteúdo Programático: {data.programmaticContent}
            </p>
          )}
        </div>

        {/* Rodapé: Data, Assinatura e QR Code de Autenticação */}
        <div className="grid grid-cols-3 items-end pt-3 md:pt-6 border-t border-zinc-200/60 mt-2">
          {/* Coluna 1: Data e Local */}
          <div className="text-left">
            <div className="text-[10px] md:text-xs text-zinc-500 uppercase tracking-wider">Emitido em</div>
            <div className="text-xs md:text-sm font-semibold text-zinc-800">{formattedDate}</div>
            <div className="text-[9px] md:text-[11px] text-zinc-500">{data.tenantName}</div>
          </div>

          {/* Coluna 2: Assinatura da Instrutora */}
          <div className="flex flex-col items-center justify-center">
            {data.signatureUrl ? (
              <img
                src={data.signatureUrl}
                alt="Assinatura"
                className="h-10 md:h-14 object-contain mb-[-8px] pointer-events-none"
              />
            ) : (
              <div className="h-8 md:h-10 flex items-end">
                <span className="font-serif italic text-base md:text-lg text-zinc-700">{instructorName}</span>
              </div>
            )}
            <div className="w-40 md:w-56 h-[1px] bg-zinc-400 mt-1" />
            <div className="text-xs md:text-sm font-semibold text-zinc-900 mt-1">{instructorName}</div>
            <div className="text-[9px] md:text-[11px] text-zinc-500 uppercase tracking-wider">{instructorTitle}</div>
          </div>

          {/* Coluna 3: QR Code e Código Anti-Fraude */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-[8px] md:text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Autenticidade
                </div>
                <div className="font-mono text-[9px] md:text-xs font-semibold text-zinc-800 tracking-wider">
                  {data.code}
                </div>
                <div className="text-[8px] md:text-[9px] text-zinc-400">Verificação Online</div>
              </div>
              <img
                src={qrCodeUrl}
                alt={`QR Code ${data.code}`}
                className="w-12 h-12 md:w-16 md:h-16 p-0.5 border border-zinc-300 bg-white shadow-sm rounded-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
