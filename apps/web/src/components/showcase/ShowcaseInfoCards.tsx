'use client';

import React from 'react';
import { MapPin, ShieldCheck, ExternalLink, CalendarClock } from 'lucide-react';
import { TenantShowcase } from './types';

interface ShowcaseInfoCardsProps {
  tenant: TenantShowcase;
}

export function ShowcaseInfoCards({ tenant }: ShowcaseInfoCardsProps) {
  // Constrói string formatada do endereço físico
  const addressParts = [
    tenant.addressStreet && tenant.addressNumber
      ? `${tenant.addressStreet}, ${tenant.addressNumber}`
      : tenant.addressStreet,
    tenant.addressNeighborhood,
    tenant.addressCity && tenant.addressState
      ? `${tenant.addressCity} - ${tenant.addressState}`
      : tenant.addressCity
  ].filter(Boolean);

  const fullAddress = addressParts.length > 0 ? addressParts.join(' · ') : null;
  const mapsUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tenant.name}, ${fullAddress}`)}`
    : null;

  return (
    <div className="space-y-4">
      {/* Card de Endereço Físico */}
      {fullAddress && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Localização & Atendimento
            </h3>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {fullAddress}
            </p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-block text-xs font-semibold hover:underline"
                style={{ color: tenant.primaryColor || '#7C3AED' }}
              >
                Ver no Google Maps →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Card de Política, Transparência & LGPD */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-4 shadow-xs">
        <div className="text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 mb-1">
            Privacidade & Flexibilidade Garantidas
          </p>
          <p>
            Seus dados são protegidos em conformidade rigorosa com a LGPD.
            Cancelamento e remarcação são permitidos sem custo até 24 horas antes do início do atendimento diretamente pelo seu link pessoal.
          </p>
        </div>
      </div>
    </div>
  );
}
