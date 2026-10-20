'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Instagram,
  Phone,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink,
  CalendarCheck2
} from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUrl';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { TenantShowcase } from './types';

interface ShowcaseHeaderProps {
  tenant: TenantShowcase;
  onBookClick?: () => void;
  onPortalClick?: () => void;
}

export function ShowcaseHeader({ tenant, onBookClick, onPortalClick }: ShowcaseHeaderProps) {
  const [bioExpanded, setBioExpanded] = useState(false);

  const brandColor = tenant.primaryColor || '#5c0701';
  const bio = tenant.description?.trim() || null;
  const isBioLong = bio ? bio.length > 140 : false;

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
            src={resolveImageUrl(tenant.coverUrl)}
            alt={tenant.name}
            fill
            unoptimized
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

      {/* Conteúdo Principal com Logo Centralizada (Padrão UX Pro Max) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <div className="relative flex flex-col items-center text-center -mt-16 sm:-mt-20 z-10">
          {/* Avatar Sobreposto Circular Centralizado com Anel Nobre */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-white ring-4 ring-white shadow-2xl flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
            {tenant.logoUrl ? (
              <Image
                src={resolveImageUrl(tenant.logoUrl)}
                alt={tenant.name}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-bold text-3xl sm:text-4xl text-white select-none"
                style={{ backgroundColor: brandColor }}
              >
                {tenant.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nome e Descrição com Tipografia Nobre Centralizada */}
          <div className="mt-3.5 w-full flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {tenant.name}
            </h1>

            {bio && (
              <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
                <p>
                  {bioExpanded || !isBioLong ? bio : `${bio.substring(0, 140)}...`}
                  {isBioLong && (
                    <button
                      onClick={() => setBioExpanded(!bioExpanded)}
                      className="ml-2 font-semibold underline inline-flex items-center gap-0.5 cursor-pointer transition-opacity hover:opacity-80"
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

            {/* Redes Sociais, WhatsApp e Portal Centralizados */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {tenant.instagramUrl && (
                <a
                  href={tenant.instagramUrl.startsWith('http') ? tenant.instagramUrl : `https://instagram.com/${tenant.instagramUrl.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-2xs hover:shadow-xs active:scale-97"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-200/90 transition-all shadow-2xs hover:shadow-xs active:scale-97"
                >
                  <WhatsAppIcon variant="official" size={15} />
                  <span>WhatsApp</span>
                </a>
              )}

              {onPortalClick && (
                <button
                  type="button"
                  onClick={onPortalClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all cursor-pointer shadow-2xs active:scale-97"
                >
                  <span>Portal da Cliente</span>
                </button>
              )}

              {tenant.googleReviewUrl && (
                <a
                  href={tenant.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-2xs hover:shadow-xs active:scale-97"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Avaliar no Google</span>
                </a>
              )}

              <div className="inline-flex items-center px-3 py-1.5 text-xs text-slate-500 font-medium">
                <span>
                  {tenant.isOpenNow && tenant.openingTime && tenant.closingTime
                    ? `Atendimento hoje: ${tenant.openingTime} às ${tenant.closingTime}`
                    : 'Atendimento hoje: Fechado'}
                </span>
              </div>
            </div>

            {/* Botão de Agendamento Online Centralizado em Destaque */}
            {onBookClick && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={onBookClick}
                  className="px-7 py-3 rounded-2xl font-extrabold text-xs sm:text-sm text-white shadow-md hover:shadow-xl transition-all duration-200 active:scale-97 cursor-pointer inline-flex items-center gap-2"
                  style={{ backgroundColor: brandColor }}
                >
                  <CalendarCheck2 className="w-4 h-4" />
                  <span>Agendamento Online</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
