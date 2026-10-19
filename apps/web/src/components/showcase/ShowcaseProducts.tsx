'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Package, MessageCircle, Check } from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUrl';
import { ProductItem, TenantShowcase } from './types';

interface ShowcaseProductsProps {
  tenant: TenantShowcase;
}

export function ShowcaseProducts({ tenant }: ShowcaseProductsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!tenant.products || tenant.products.length === 0) {
    return null;
  }

  const categories = Array.from(
    new Set(tenant.products.map((p) => p.category || 'Geral'))
  );

  const filteredProducts =
    selectedCategory === 'ALL'
      ? tenant.products
      : tenant.products.filter((p) => (p.category || 'Geral') === selectedCategory);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Linha de Produtos & Home Care
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Cuidados para levar para casa
        </span>
      </div>

      {/* Filtro por Categorias de Produtos */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({tenant.products.length})
          </button>
          {categories.map((cat) => {
            const count = tenant.products?.filter((p) => (p.category || 'Geral') === cat).length || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredProducts.map((product) => {
          const buyUrl = `https://wa.me/55${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Olá! Vi o produto "${product.name}" na vitrine online e gostaria de reservar para retirar no salão.`
          )}`;

          return (
            <div
              key={product.id}
              className="group rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Imagem do Produto ou Fallback */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 mb-3 flex items-center justify-center border border-slate-200/60">
                  {product.imageUrl ? (
                    <Image
                      src={resolveImageUrl(product.imageUrl)}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                      <Package className="w-8 h-8 stroke-1 text-slate-300" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        {product.category || 'Home Care'}
                      </span>
                    </div>
                  )}
                  {product.stockQuantity > 0 && product.stockQuantity <= 3 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wide shadow-xs">
                      Últimas unidades
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {product.category || 'Home Care'}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Preço e Botão de WhatsApp */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 block uppercase">
                    Valor
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    R$ {Number(product.salePrice).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition-colors"
                  title="Reservar este produto pelo WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Reservar</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
