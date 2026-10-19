'use client';

import React from 'react';
import { X, Printer, Link as LinkIcon, Check, Download } from 'lucide-react';
import { CertificateTemplate, CertificateData } from './CertificateTemplate';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CertificateData | null;
}

export function CertificateModal({ isOpen, onClose, data }: CertificateModalProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const handleCopyLink = () => {
    const url = data.verificationUrl || `https://marquesuahora.com.br/validar/${data.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
      {/* Estilos dedicados para impressão limpa em A4 Paisagem */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .certificate-modal-content,
          .certificate-modal-content * {
            visibility: visible;
          }
          .certificate-modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Cabeçalho de Ações (Oculto na impressão) */}
        <div className="no-print flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Certificado Profissional de Conclusão</h3>
            <p className="text-xs text-zinc-400">
              Emitido para <span className="text-zinc-200 font-medium">{data.studentName}</span> • Formato A4 Paisagem
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700/60"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
              {copied ? 'Link Copiado!' : 'Copiar Link'}
            </button>

            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-100 text-zinc-950 hover:bg-white rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Área de Visualização do Certificado */}
        <div className="p-4 md:p-8 overflow-x-auto bg-zinc-950/50 flex justify-center">
          <div className="certificate-modal-content w-full max-w-4xl">
            <CertificateTemplate data={data} />
          </div>
        </div>

        {/* Rodapé Informativo (Oculto na impressão) */}
        <div className="no-print px-5 py-3 border-t border-zinc-800 bg-zinc-950 text-center text-xs text-zinc-500">
          Código autenticador: <strong className="font-mono text-zinc-300">{data.code}</strong> • O QR Code permite verificação imediata de autenticidade por clientes e empregadores.
        </div>
      </div>
    </div>
  );
}
