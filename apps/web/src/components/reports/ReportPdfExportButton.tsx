'use client';

import React, { useState } from 'react';
import { FileText, Loader2, Printer } from 'lucide-react';

interface ReportPdfExportButtonProps {
  onBeforePrint?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  primaryColor?: string;
}

export function ReportPdfExportButton({
  onBeforePrint,
  className = '',
  variant = 'primary',
  primaryColor = '#5c0701',
}: ReportPdfExportButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handleExportPdf = () => {
    setIsPrinting(true);
    if (onBeforePrint) {
      onBeforePrint();
    }

    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 250);
  };

  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      onClick={handleExportPdf}
      disabled={isPrinting}
      aria-label="Exportar relatório em formato PDF"
      style={isPrimary ? { backgroundColor: primaryColor } : undefined}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${className}`}
      title="Gera documento A4 executivo pronto para impressão ou salvamento em PDF"
    >
      {isPrinting ? (
        <Loader2 className="w-4 h-4 animate-spin text-white" />
      ) : (
        <FileText className="w-4 h-4 text-white" />
      )}
      <span>{isPrinting ? 'Preparando PDF...' : 'Exportar Relatório PDF'}</span>
      <span className="ml-1 text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded bg-black/20 text-white font-bold">
        PDF
      </span>
    </button>
  );
}
