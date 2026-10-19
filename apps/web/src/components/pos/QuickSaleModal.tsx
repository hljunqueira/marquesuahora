'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Search,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  costPrice: number;
  stockQuantity: number;
  imageUrl?: string | null;
}

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted?: () => void;
  showToast: (msg: string) => void;
}

export function QuickSaleModal({ isOpen, onClose, onSaleCompleted, showToast }: QuickSaleModalProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH'>('PIX');
  const [clientName, setClientName] = useState('');
  const [discount, setDiscount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingProducts(true);
      api
        .get('/products')
        .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
        .catch(() => showToast('Erro ao carregar catálogo de produtos.'))
        .finally(() => setLoadingProducts(false));
    } else {
      setCart([]);
      setDiscount('');
      setClientName('');
      setSearch('');
    }
  }, [isOpen, showToast]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    if (!search.trim()) return list.filter((p) => p.stockQuantity > 0);
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
        p.stockQuantity > 0
    );
  }, [products, search]);

  const handleAddToCart = (prod: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) {
        if (existing.quantity >= prod.stockQuantity) {
          showToast(`Estoque máximo atingido para ${prod.name} (${prod.stockQuantity} un).`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          name: prod.name,
          unitPrice: prod.salePrice,
          quantity: 1,
          maxStock: prod.stockQuantity
        }
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxStock) {
              showToast(`Limite de estoque: ${item.maxStock} unidades.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const grossTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const discountVal = Number(discount) || 0;
  const netTotal = Math.max(0, grossTotal - discountVal);

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Adicione pelo menos um produto para finalizar a venda.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/products/sell', {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        paymentMethod,
        clientName: clientName.trim() || undefined,
        discount: discountVal
      });

      showToast(`Venda de balcão concluída: R$ ${netTotal.toFixed(2)} lançados no caixa!`);
      if (onSaleCompleted) onSaleCompleted();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao processar venda balcão.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-zinc-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-white rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Venda Expressa de Balcão (PDV)</h3>
              <p className="text-[11px] text-zinc-500">
                Baixa instantânea de estoque e lançamento automático de receita no caixa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Dividido em Duas Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Coluna 1: Catálogo de Produtos Disponíveis */}
          <div className="md:col-span-7 p-5 border-r border-zinc-100 flex flex-col overflow-hidden space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto por nome ou categoria..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {loadingProducts ? (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-800" />
                  Carregando estoque disponível...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  Nenhum produto em estoque disponível.
                </div>
              ) : (
                filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddToCart(prod)}
                    className="p-2.5 bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200/80 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="w-10 h-10 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-bold">
                          {prod.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{prod.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span>{prod.category}</span>
                          <span>•</span>
                          <span className={prod.stockQuantity <= 3 ? 'text-amber-700 font-bold' : ''}>
                            {prod.stockQuantity} em estoque
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">
                        R$ {Number(prod.salePrice).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        className="p-1 bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coluna 2: Carrinho e Finalização */}
          <div className="md:col-span-5 p-5 bg-zinc-50/40 flex flex-col justify-between space-y-4 overflow-y-auto">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)} itens)
              </h4>

              {cart.length === 0 ? (
                <div className="py-10 text-center text-zinc-400 text-xs italic">
                  Clique nos produtos ao lado para adicionar à venda.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 bg-white border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-semibold text-zinc-900 line-clamp-1">{item.name}</div>
                        <div className="text-[10px] text-zinc-500">
                          R$ {item.unitPrice.toFixed(2)} cada
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="p-1 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          className="p-1 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="p-1 text-zinc-400 hover:text-red-600 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Informações da Venda */}
            <form onSubmit={handleSubmitSale} className="space-y-3 pt-3 border-t border-zinc-200">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Nome da Cliente (Opcional)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Mariana Costa"
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium"
                  >
                    <option value="PIX">PIX Direto</option>
                    <option value="CREDIT_CARD">Cartão Crédito</option>
                    <option value="DEBIT_CARD">Cartão Débito</option>
                    <option value="CASH">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Totais */}
              <div className="p-3 bg-zinc-900 text-white rounded-xl space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Subtotal bruto</span>
                  <span>R$ {grossTotal.toFixed(2)}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-[11px] text-amber-300">
                    <span>Desconto aplicado</span>
                    <span>- R$ {discountVal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-zinc-800 text-zinc-100">
                  <span>Total a Receber</span>
                  <span>R$ {netTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? 'Registrando Venda...' : 'Finalizar Venda de Balcão'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
