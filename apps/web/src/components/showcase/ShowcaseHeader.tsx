'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Instagram,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink,
  CalendarCheck2
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { TenantShowcase } from './types';

interface ShowcaseHeaderProps {
  tenant: TenantShowcase;
  onBookClick?: () => void;
}

export function ShowcaseHeader({ tenant, onBookClick }: ShowcaseHeaderProps) {
  const [bioExpanded, setBioExpanded] = useState(false);

  const brandColor = tenant.primaryColor || '#7C3AED';
  const bio = tenant.description?.trim() || null;
  const isBioLong = bio ? bio.length > 140 : false;

  // Monta lista de especialidades em linha com base exclusivamente nas categorias/serviços reais do tenant
  const specialtiesLine =
    tenant.categories && tenant.categories.length > 0
      ? tenant.categories.map((c) => c.name.toUpperCase()).join(' · ')
      : tenant.services && tenant.services.length > 0
      ? tenant.services.slice(0, 4).map((s) => s.name.toUpperCase()).join(' · ')
      : '';

  return (
    <header className="relative w-full bg-white border-b border-slate-100 shadow-sm overflow-hidden">
      {/* Banner Panorâmico de Capa */}
      <div
        className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden"
        style={{
          background: tenant.coverUrl
            ? undefined
            : `linear-gradient(135deg, ${brandColor}dd 0%, #0F172A 100%)`
        }}
      >
        {tenant.coverUrl && (
          <Image
            src={tenant.coverUrl}
            alt={tenant.name}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Badge Flutuante de Status Aberto/Fechado */}
        <div className="absolute top-4 right-4 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm text-white ${
              tenant.isOpenNow
                ? 'bg-emerald-600/90 ring-1 ring-emerald-400/50'
                : 'bg-slate-800/80 ring-1 ring-white/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tenant.isOpenNow ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {tenant.isOpenNow ? 'Aberto Agora' : 'Fechado no Momento'}
          </span>
        </div>
      </div>

      {/* Conteúdo Principal com Avatar Sobreposto */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-6">
        <div className="relative flex flex-col items-center sm:items-start text-center sm:text-left -mt-16 sm:-mt-20 z-10">
          {/* Avatar Sobreposto Circular com Anel Branco */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white ring-4 ring-white shadow-xl flex-shrink-0">
            {tenant.logoUrl ? (
              <Image
                src={tenant.logoUrl}
                alt={tenant.name}
                fill
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-bold text-3xl text-white select-none"
                style={{ backgroundColor: brandColor }}
              >
                {tenant.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nome, Especialidades e Informações */}
          <div className="mt-3.5 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {tenant.name}
                </h1>
                {specialtiesLine && (
                  <p
                    className="mt-1 text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-500"
                    style={{ color: brandColor }}
                  >
                    {specialtiesLine}
                  </p>
                )}
              </div>

              {/* Botão de Agendamento Online no Topo (Desktop / Mobile CTA) */}
              <div className="flex items-center justify-center sm:justify-end gap-2.5">
                <button
                  onClick={onBookClick}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                  style={{ backgroundColor: brandColor }}
                >
                  Agendamento Online
                </button>
              </div>
            </div>

            {/* Bio Institucional com Expansão Ver Mais (Apenas se o negócio cadastrou bio) */}
            {bio && (
              <div className="mt-3 text-sm text-slate-600 leading-relaxed max-w-3xl">
                <p>
                  {bioExpanded || !isBioLong ? bio : `${bio.substring(0, 140)}...`}
                  {isBioLong && (
                    <button
                      onClick={() => setBioExpanded(!bioExpanded)}
                      className="ml-2 font-medium underline inline-flex items-center gap-0.5"
                      style={{ color: brandColor }}
                    >
                      {bioExpanded ? (
                        <>
                          ver menos <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          ver mais <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </p>
              </div>
            )}

            {/* Redes Sociais e Ações Rápidas */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 border-t border-slate-100">
              {tenant.instagramUrl && (
                <a
                  href={tenant.instagramUrl.startsWith('http') ? tenant.instagramUrl : `https://instagram.com/${tenant.instagramUrl.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  <span>Instagram</span>
                </a>
              )}

              {tenant.phone && (
                <a
                  href={`https://wa.me/55${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de tirar uma dúvida sobre os serviços do ${tenant.name}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all shadow-2xs hover:shadow-xs active:scale-97"
                >
                  <WhatsAppIcon size={14} color="#059669" />
                  <span>WhatsApp</span>
                </a>
              )}

              {tenant.googleReviewUrl && (
                <a
                  href={tenant.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/60 transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Avaliações no Google</span>
                </a>
              )}

              {tenant.openingTime && tenant.closingTime && (
                <div className="inline-flex items-center px-3 py-1.5 text-xs text-slate-500 font-medium">
                  <span>
                    Atendimento: {tenant.openingTime} às {tenant.closingTime}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
