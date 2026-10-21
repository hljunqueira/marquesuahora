'use client';

import React, { useState } from 'react';
import { MapPin, ShieldCheck, ExternalLink, Clock, Star, CheckCircle2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { TenantShowcase } from './types';

interface ShowcaseInfoCardsProps {
  tenant: TenantShowcase;
}

export function ShowcaseInfoCards({ tenant }: ShowcaseInfoCardsProps) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);

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

  const brandColor = tenant.primaryColor || '#5c0701';

  // Informações dinâmicas de funcionamento hoje
  const isTodayOpen = tenant.todayIsOpen !== undefined ? tenant.todayIsOpen : Boolean(tenant.openingTime && tenant.closingTime);
  const todayLabel = tenant.todayScheduleLabel || (isTodayOpen && tenant.openingTime && tenant.closingTime ? `${tenant.openingTime} às ${tenant.closingTime}` : 'Fechado hoje');
  const hasWeeklyRules = Array.isArray(tenant.weeklySchedule) && tenant.weeklySchedule.length > 0;

  return (
    <div className="space-y-4">
      {/* 1. Card de Avaliação no Google Maps (Apenas se o estabelecimento cadastrou o link oficial) */}
      {tenant.googleReviewUrl && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Google Maps
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Avaliação Oficial
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Avalie nosso atendimento no Google
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Já foi atendido(a) por {tenant.name}? Deixe sua avaliação no Google Maps e nos ajude a continuar melhorando.
            </p>
          </div>

          <a
            href={tenant.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-97"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Deixar Avaliação no Google</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
          </a>
        </div>
      )}

      {/* 2. Card de Diferenciais do Espaço & Horários Dinâmicos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Conforto & Pontualidade
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Diferenciais de {tenant.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Atendimento exclusivo, ambiente higienizado e pontualidade garantida para o seu bem-estar.
          </p>
        </div>

        {/* Badges de Diferenciais do Espaço */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Hora Marcada
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Lembrete via WhatsApp
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ambiente Climatizado
          </span>
        </div>

        {/* Horário de Atendimento Dinâmico & Integrado às Configurações */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-medium">Horário de Atendimento:</span>
              {isTodayOpen ? (
                <strong className="text-slate-900 font-mono">
                  {todayLabel}
                </strong>
              ) : (
                <span className="font-semibold text-rose-600">
                  {todayLabel}
                </span>
              )}
            </div>

            {tenant.isOpenNow ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 self-start sm:self-auto shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aberto agora
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-500 self-start sm:self-auto shrink-0">
                Fechado agora
              </span>
            )}
          </div>

          {/* Alternância da Grade Semanal Completa */}
          {hasWeeklyRules && (
            <div>
              <button
                type="button"
                onClick={() => setShowFullSchedule((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                style={{ color: showFullSchedule ? brandColor : undefined }}
              >
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{showFullSchedule ? 'Ocultar horários da semana' : 'Ver horários da semana'}</span>
                {showFullSchedule ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {showFullSchedule && (
                <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs animate-in fade-in duration-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Grade Semanal de Atendimento
                  </div>
                  {tenant.weeklySchedule?.map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className={`flex items-center justify-between py-1 px-2 rounded-lg text-xs transition-colors ${
                        day.isToday
                          ? 'bg-white font-bold border border-slate-200 shadow-2xs text-slate-900'
                          : 'text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-10 font-semibold">{day.shortName}</span>
                        {day.isToday && (
                          <span
                            className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded text-white"
                            style={{ backgroundColor: brandColor }}
                          >
                            Hoje
                          </span>
                        )}
                      </div>

                      {day.isOpen ? (
                        <span className="font-mono text-slate-800">
                          {day.startTime} às {day.endTime}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Fechado
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Card de Endereço Físico & Localização */}
      {fullAddress && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Localização & Atendimento
            </h3>
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-snug pl-6">
            {fullAddress}
          </p>
          {mapsUrl && (
            <div className="pl-6 pt-1">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                style={{ color: tenant.primaryColor || '#5c0701' }}
              >
                <span>Ver Rota no Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* 4. Card de Política, Transparência & LGPD */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-4 shadow-xs">
        <div className="text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Privacidade & Flexibilidade Garantidas</span>
          </div>
          <p>
            Seus dados são protegidos em conformidade rigorosa com a LGPD.
            Cancelamento e remarcação são permitidos sem custo até 24 horas antes do início do atendimento diretamente pelo seu link pessoal.
          </p>
        </div>
      </div>
    </div>
  );
}
