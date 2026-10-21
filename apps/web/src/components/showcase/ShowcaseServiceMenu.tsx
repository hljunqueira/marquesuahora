'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Clock, CalendarPlus, ChevronRight, Plus } from 'lucide-react';
import { TenantShowcase, ServiceItem } from './types';

interface ShowcaseServiceMenuProps {
  tenant: TenantShowcase;
  brandColor?: string;
  onSelectService: (serviceId: string) => void;
  onOpenBooking: () => void;
}

export function ShowcaseServiceMenu({
  tenant,
  brandColor = '#5c0701',
  onSelectService,
  onOpenBooking
}: ShowcaseServiceMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Organiza categorias respeitando sortOrder
  const categoriesWithCounts = useMemo(() => {
    const list: { id: string; name: string; count: number }[] = [];

    // Mapeia todas as categorias
    const catMap = new Map<string, { name: string; count: number }>();
    if (tenant.categories && tenant.categories.length > 0) {
      tenant.categories.forEach((cat) => {
        catMap.set(cat.id, { name: cat.name, count: 0 });
      });
    }

    let uncategorizedCount = 0;

    tenant.services.forEach((s) => {
      if (s.categoryId && catMap.has(s.categoryId)) {
        const item = catMap.get(s.categoryId)!;
        item.count += 1;
      } else if (s.category) {
        // Tenta achar pelo nome
        let found = false;
        for (const [id, val] of catMap.entries()) {
          if (val.name.trim().toLowerCase() === s.category.trim().toLowerCase()) {
            val.count += 1;
            found = true;
            break;
          }
        }
        if (!found) uncategorizedCount += 1;
      } else {
        uncategorizedCount += 1;
      }
    });

    catMap.forEach((val, id) => {
      if (val.count > 0) {
        list.push({ id, name: val.name, count: val.count });
      }
    });

    if (uncategorizedCount > 0) {
      list.push({ id: 'OTHER', name: 'Outros Procedimentos', count: uncategorizedCount });
    }

    return list;
  }, [tenant.categories, tenant.services]);

  // Filtra serviços baseado na categoria selecionada
  const filteredServices = useMemo(() => {
    if (selectedCategory === 'ALL') {
      return tenant.services;
    }

    return tenant.services.filter((s) => {
      if (selectedCategory === 'OTHER') {
        return !s.categoryId && !s.category;
      }
      if (s.categoryId === selectedCategory) return true;
      if (s.category) {
        const cat = tenant.categories?.find((c) => c.id === selectedCategory);
        if (cat && cat.name.trim().toLowerCase() === s.category.trim().toLowerCase()) {
          return true;
        }
      }
      return false;
    });
  }, [selectedCategory, tenant.services, tenant.categories]);

  // Menor preço para chamar atenção
  const lowestPrice = useMemo(() => {
    if (!tenant.services || tenant.services.length === 0) return null;
    const prices = tenant.services.map((s) => s.price).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [tenant.services]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho do Cardápio de Serviços */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu de Especialidades
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {tenant.services.length} opções
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Serviços & Procedimentos
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Escolha seu procedimento e agende seu horário com atendimento exclusivo.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenBooking}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-97"
            style={{ backgroundColor: brandColor }}
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Ver Todos os Horários</span>
          </button>
        </div>

        {/* Pílulas de Filtro por Categoria (Scroll Horizontal Suave) */}
        {categoriesWithCounts.length > 1 && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'text-white shadow-2xs'
                  : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600'
              }`}
              style={{
                backgroundColor: selectedCategory === 'ALL' ? brandColor : undefined
              }}
            >
              Todos ({tenant.services.length})
            </button>

            {categoriesWithCounts.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-2xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600'
                  }`}
                  style={{
                    backgroundColor: isSelected ? brandColor : undefined
                  }}
                >
                  {cat.name} ({cat.count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grade / Lista de Serviços Refinada */}
      <div className="space-y-3">
        {filteredServices.map((service) => {
          return (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-slate-800 transition-colors">
                    {service.name}
                  </h3>
                  {service.serviceType && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {service.serviceType}
                    </span>
                  )}
                </div>

                {service.description && (
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2 max-w-xl">
                    {service.description}
                  </p>
                )}

                <div className="mt-2.5 flex items-center gap-2.5 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {service.durationMinutes} min
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-black text-slate-900 text-sm">
                    R$ {service.price.toFixed(2).replace('.', ',')}
                  </span>
                  {service.requiresDeposit && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200/60">
                        Sinal de {service.depositType === 'PERCENTAGE' ? `${service.depositAmount || 50}%` : `R$ ${Number(service.depositAmount || 50).toFixed(0)}`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Botão de Agendamento Rápido */}
              <div className="flex-shrink-0 flex items-center sm:self-center">
                <button
                  type="button"
                  onClick={() => onSelectService(service.id)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  style={{ backgroundColor: brandColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center text-slate-500">
            <p className="text-sm font-semibold">Nenhum serviço nesta categoria.</p>
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className="mt-2 text-xs font-bold underline"
              style={{ color: brandColor }}
            >
              Ver todos os serviços
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
