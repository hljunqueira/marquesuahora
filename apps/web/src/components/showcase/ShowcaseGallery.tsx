'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Camera, X, ZoomIn } from 'lucide-react';

interface ShowcaseGalleryProps {
  photos?: string[];
  tenantName: string;
}

export function ShowcaseGallery({ photos, tenantName }: ShowcaseGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Regra estrita: sem fotos fictícias/default. Se o estabelecimento não cadastrou fotos, a galeria não é renderizada.
  if (!photos || photos.length === 0) {
    return null;
  }

  const displayPhotos = photos.slice(0, 6);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Trabalhos Recentes
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Galeria de Resultados
        </span>
      </div>

      {/* Grid 3x2 de Fotos com Cantos Arredondados */}
      <div className="grid grid-cols-3 gap-2.5">
        {displayPhotos.map((url, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedPhoto(url)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200"
          >
            <Image
              src={url}
              alt={`Trabalho ${idx + 1} - ${tenantName}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 33vw, 20vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Lightbox de Foto Ampliada */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative w-full aspect-square sm:aspect-4/3 max-h-[80vh]">
              <Image
                src={selectedPhoto}
                alt={tenantName}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
