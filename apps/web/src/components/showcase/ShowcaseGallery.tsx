'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Camera, X, ZoomIn, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUrl';

interface ShowcaseGalleryProps {
  photos?: string[];
  tenantName: string;
}

export function ShowcaseGallery({ photos, tenantName }: ShowcaseGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Regra estrita: sem fotos fictícias/default. Se o estabelecimento não cadastrou fotos, a galeria não é renderizada.
  if (!photos || photos.length === 0) {
    return null;
  }

  const initialCount = 6;
  const displayPhotos = expanded ? photos : photos.slice(0, initialCount);

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length);
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Galeria de Trabalhos
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Inspirações e resultados reais do espaço
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70">
          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
        </span>
      </div>

      {/* Grid de Fotos com cantos arredondados modernos */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {displayPhotos.map((url, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedPhotoIndex(idx)}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-100 shadow-2xs hover:shadow-md transition-all duration-200"
          >
            <Image
              src={resolveImageUrl(url)}
              alt={`Trabalho ${idx + 1} - ${tenantName}`}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 33vw, 20vw"
            />
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Botão Ver Mais Fotos */}
      {photos.length > initialCount && (
        <div className="mt-3.5 text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold text-purple-700 hover:text-purple-800 transition-colors py-1 px-3 rounded-lg hover:bg-purple-50 cursor-pointer"
          >
            {expanded ? 'Mostrar menos' : `Ver todas as fotos (${photos.length})`}
          </button>
        </div>
      )}

      {/* Modal Lightbox de Foto Ampliada com Navegação */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <div
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center"
          >
            {/* Fechar */}
            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navegação Anterior */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
                title="Foto anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Navegação Próxima */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
                title="Próxima foto"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Foto Ampliada */}
            <div className="relative w-full aspect-square sm:aspect-4/3 max-h-[75vh] flex items-center justify-center p-2">
              <Image
                src={resolveImageUrl(photos[selectedPhotoIndex])}
                alt={`${tenantName} - Foto ${selectedPhotoIndex + 1}`}
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            {/* Rodapé com contador */}
            <div className="w-full py-3 px-5 bg-black/40 border-t border-white/10 flex items-center justify-between text-white text-xs font-medium">
              <span className="truncate">{tenantName}</span>
              <span className="font-mono opacity-80">
                {selectedPhotoIndex + 1} de {photos.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
