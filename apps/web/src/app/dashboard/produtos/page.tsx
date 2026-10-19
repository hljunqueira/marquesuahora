'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  ShoppingBag,
  Plus,
  Minus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Package,
  DollarSign,
  Tag,
  Upload,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  ExternalLink,
  TrendingUp,
  Percent,
  RefreshCw,
  Loader2,
  Lock,
  ArrowUpRight,
  ShoppingCart
} from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { QuickSaleModal } from '@/components/pos/QuickSaleModal';

// ==========================================
// TIPOS E MODELOS DE PRODUTOS
// ==========================================

export type BusinessNicheKey =
  | 'BARBERSHOP'
  | 'BEAUTY_SALON'
  | 'NAIL_LASH_STUDIO'
  | 'AESTHETICS_CLINIC'
  | 'PERSONAL_TRAINER';

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  description: string;
  salePrice: number;
  costPrice?: number;
  stockQuantity: number;
  minStockAlert: number;
  imageUrl?: string;
  showInVitrine: boolean;
  isActive: boolean;
  sku?: string;
}

export default function DashboardProdutosPage() {
  const [tenantPlanCode, setTenantPlanCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('marquesuahora_tenant_plan_code') || 'FREE';
    }
    return 'FREE';
  });
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyVitrineFilter, setOnlyVitrineFilter] = useState(false);

  // Modais de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);

  // Modal de Movimentação Formal de Estoque
  const [stockMovementTarget, setStockMovementTarget] = useState<ProductItem | null>(null);
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [movementQuantity, setMovementQuantity] = useState('1');
  const [movementUnitCost, setMovementUnitCost] = useState('');
  const [movementReason, setMovementReason] = useState('Reposição de Estoque / Compra');
  const [syncFinanceExpense, setSyncFinanceExpense] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showInVitrine, setShowInVitrine] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [sku, setSku] = useState('');
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [productsRes, tenantRes] = await Promise.all([
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/tenants/me').catch(() => ({ data: null }))
      ]);

      if (tenantRes.data?.plan?.code) {
        setTenantPlanCode(tenantRes.data.plan.code);
        localStorage.setItem('marquesuahora_tenant_plan_code', tenantRes.data.plan.code);
      }

      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const notifyProductsSync = () => {
    window.dispatchEvent(new CustomEvent('marquesuahora_products_sync'));
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    fetchProducts();

    // 1. Polling silencioso a cada 30 segundos se a aba estiver visível
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchProducts(true);
      }
    }, 30000);

    // 2. Foco da janela e alternância de abas
    const handleFocus = () => fetchProducts(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts(true);
      }
    };

    // 3. Sincronização entre componentes e abas
    const handleProductsSync = () => fetchProducts(true);
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('product') || e.key.includes('niche')) {
        fetchProducts(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('marquesuahora_products_sync', handleProductsSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('marquesuahora_products_sync', handleProductsSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const [uploadingImage, setUploadingImage] = useState(false);

  // Upload de Imagem via Arquivo do Dispositivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem do produto deve ter no máximo 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.relativeUrl;
      if (url) {
        setImageUrl(url);
        showToast('Foto do produto enviada com sucesso.');
      }
    } catch (err: any) {
      console.error('Erro ao enviar foto do produto:', err);
      showToast('Erro ao enviar imagem do produto. Tente novamente.');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Modais de Criação e Edição
  const handleOpenCreate = () => {
    if (tenantPlanCode === 'FREE') {
      showToast('O cadastro e vitrine de produtos é exclusivo dos planos pagos (Solo ou Equipe Pro). Faça upgrade para liberar.');
      return;
    }
    setEditingProduct(null);
    setName('');
    setCategory(allCategories[0] || '');
    setDescription('');
    setSalePrice('');
    setCostPrice('');
    setStockQuantity('');
    setMinStockAlert('');
    setImageUrl('');
    setShowInVitrine(true);
    setIsActive(true);
    setSku('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProductItem) => {
    if (tenantPlanCode === 'FREE') {
      showToast('A gestão e edição de produtos é exclusiva dos planos pagos (Solo ou Equipe Pro). Faça upgrade para liberar.');
      return;
    }
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setDescription(p.description || '');
    setSalePrice(String(p.salePrice));
    setCostPrice(p.costPrice ? String(p.costPrice) : '');
    setStockQuantity(String(p.stockQuantity));
    setMinStockAlert(String(p.minStockAlert));
    setImageUrl(p.imageUrl || '');
    setShowInVitrine(p.showInVitrine);
    setIsActive(p.isActive);
    setSku(p.sku || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSale = parseFloat(salePrice.replace(',', '.'));
    if (isNaN(parsedSale) || parsedSale <= 0) {
      showToast('Informe um preço de venda válido maior que zero.');
      return;
    }

    const parsedCost = costPrice ? parseFloat(costPrice.replace(',', '.')) : 0;
    const parsedStock = parseInt(stockQuantity, 10) || 0;
    const parsedMinStock = parseInt(minStockAlert, 10) || 2;

    try {
      setIsSubmitting(true);
      if (editingProduct) {
        const payload = {
          name,
          category: category.trim() || 'Geral',
          description,
          salePrice: parsedSale,
          costPrice: parsedCost,
          stockQuantity: parsedStock,
          minStockAlert: parsedMinStock,
          imageUrl: imageUrl || null,
          showInVitrine,
          isActive,
          sku: sku.trim() || null
        };
        const res = await api.put(`/products/${editingProduct.id}`, payload);
        setProducts((prev) =>
          prev.map((item) =>
            item.id === editingProduct.id
              ? {
                  ...item,
                  ...res.data,
                  name,
                  category: category.trim() || 'Geral',
                  description,
                  salePrice: parsedSale,
                  costPrice: parsedCost,
                  stockQuantity: parsedStock,
                  minStockAlert: parsedMinStock,
                  imageUrl,
                  showInVitrine,
                  isActive,
                  sku: sku.trim() || undefined
                }
              : item
          )
        );
        showToast('Produto atualizado com sucesso!');
      } else {
        const payload = {
          name,
          category: category.trim() || 'Geral',
          description,
          salePrice: parsedSale,
          costPrice: parsedCost,
          stockQuantity: parsedStock,
          minStockAlert: parsedMinStock,
          imageUrl: imageUrl || null,
          showInVitrine,
          isActive,
          sku: sku.trim() || null
        };
        const res = await api.post('/products', payload);
        const created = res.data;
        const newProduct: ProductItem = {
          id: created.id,
          name: created.name,
          category: created.category,
          description: created.description || '',
          salePrice: Number(created.salePrice),
          costPrice: Number(created.costPrice),
          stockQuantity: created.stockQuantity,
          minStockAlert: created.minStockAlert || created.minStock || parsedMinStock,
          imageUrl: created.imageUrl || undefined,
          showInVitrine: created.showInVitrine ?? true,
          isActive: created.isActive ?? true,
          sku: created.sku || created.barcode || sku.trim() || undefined
        };
        setProducts((prev) => [newProduct, ...prev]);
        showToast('Novo produto adicionado ao catálogo!');
      }
      setIsModalOpen(false);
      notifyProductsSync();
      await fetchProducts(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erro ao salvar produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/products/${deleteTarget.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('Produto removido.');
      notifyProductsSync();
      await fetchProducts(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erro ao remover produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Movimentação Formal de Estoque (Entrada, Saída, Balanço)
  const handleSaveStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tenantPlanCode === 'FREE') {
      showToast('A movimentação de estoque é exclusiva dos planos pagos (Solo ou Equipe Pro). Faça upgrade para liberar.');
      return;
    }
    if (!stockMovementTarget) return;

    const qty = parseInt(movementQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Informe uma quantidade válida maior que zero.');
      return;
    }

    let nextStock = stockMovementTarget.stockQuantity;
    if (movementType === 'IN') {
      nextStock += qty;
    } else if (movementType === 'OUT') {
      nextStock = Math.max(0, nextStock - qty);
    } else if (movementType === 'ADJUST') {
      nextStock = qty;
    }

    const parsedUnitCost = movementUnitCost ? parseFloat(movementUnitCost.replace(',', '.')) : undefined;

    try {
      setIsSubmitting(true);
      await api.put(`/products/${stockMovementTarget.id}`, {
        stockQuantity: nextStock,
        ...(movementType === 'IN' && parsedUnitCost && parsedUnitCost > 0 ? { costPrice: parsedUnitCost } : {})
      });

      // Se for Entrada de Estoque com custo e sincronização financeira ativada
      if (movementType === 'IN' && syncFinanceExpense && parsedUnitCost && parsedUnitCost > 0) {
        const totalExpense = parsedUnitCost * qty;
        await api.post('/financial', {
          type: 'EXPENSE',
          title: `Compra de Insumo: ${stockMovementTarget.name} (${qty} un)`,
          category: 'Insumos & Produtos de Bancada',
          amount: totalExpense,
          paymentMethod: 'PIX',
          paidAt: new Date().toISOString().split('T')[0]
        }).catch(() => null);

        window.dispatchEvent(new CustomEvent('marquesuahora_financial_sync'));
      }

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === stockMovementTarget.id) {
            return {
              ...p,
              stockQuantity: nextStock,
              costPrice: movementType === 'IN' && parsedUnitCost && parsedUnitCost > 0 ? parsedUnitCost : p.costPrice
            };
          }
          return p;
        })
      );

      showToast(`Estoque de "${stockMovementTarget.name}" atualizado para ${nextStock} un.`);
      setStockMovementTarget(null);
      notifyProductsSync();
      await fetchProducts(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erro ao registrar movimentação de estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ajuste Rápido de Estoque (+1 / -1) direto no Card
  const handleStockDelta = async (productId: string, delta: number) => {
    if (tenantPlanCode === 'FREE') {
      showToast('O ajuste de estoque é exclusivo dos planos pagos (Solo ou Equipe Pro).');
      return;
    }
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const nextStock = Math.max(0, target.stockQuantity + delta);
    try {
      await api.put(`/products/${productId}`, { stockQuantity: nextStock });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stockQuantity: nextStock } : p))
      );
      notifyProductsSync();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erro ao ajustar estoque.');
    }
  };

  // Toggle Rápido de Exibição na Vitrine
  const handleToggleVitrine = async (productId: string) => {
    if (tenantPlanCode === 'FREE') {
      showToast('A vitrine pública de produtos é exclusiva dos planos pagos (Solo ou Equipe Pro).');
      return;
    }
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const nextVal = !target.showInVitrine;
    try {
      await api.put(`/products/${productId}`, { showInVitrine: nextVal });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, showInVitrine: nextVal } : p))
      );
      notifyProductsSync();
      showToast(nextVal ? 'Produto visível na vitrine pública!' : 'Produto oculto da vitrine.');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erro ao alterar visibilidade na vitrine.');
    }
  };

  // Cálculos de KPIs
  const summary = useMemo(() => {
    const totalCount = products.length;
    const vitrineCount = products.filter((p) => p.showInVitrine && p.isActive).length;
    const totalInventoryValue = products.reduce((acc, curr) => acc + curr.salePrice * curr.stockQuantity, 0);
    const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockAlert).length;

    return {
      totalCount,
      vitrineCount,
      totalInventoryValue,
      lowStockCount
    };
  }, [products]);

  // Filtragem de Produtos
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'TODAS' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesVitrine = onlyVitrineFilter ? p.showInVitrine : true;

    return matchesCategory && matchesSearch && matchesVitrine;
  });

  const allCategories = Array.from(new Set(products.map((p) => p.category)));

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Carregando catálogo de produtos...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Toast Notifier (Sem ícone) */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700"
          >
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Gate Elegante para o Plano Gratuito (FREE) */}
      {tenantPlanCode === 'FREE' && (
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-purple-50/90 via-white to-violet-50/90 border border-purple-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fadeIn">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                Planos Solo & Equipe Pro
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Gestão de Estoque & Vitrine Pública de Produtos
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Venda produtos home-care diretamente na sua vitrine pública (Link da Bio), controle movimentações de estoque com custo de aquisição e deduza automaticamente as compras do caixa financeiro. Faça upgrade para os planos <strong>Solo</strong> ou <strong>Equipe Pro</strong> para liberar a criação de produtos e vitrine.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-2xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Produtos expostos na vitrine online
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Alerta automático de estoque mínimo
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Cálculo de margem e lucro real
              </span>
            </div>
          </div>

          <Link
            href="/dashboard/planos"
            className="shrink-0 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Fazer Upgrade para Liberar Produtos</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Grid de Métricas Principais (TODOS COM FUNDO BRANCO PADRONIZADO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Produtos */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total de Produtos
            </span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-mono font-bold text-slate-900 block">
            {summary.totalCount}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Catálogo</span>
            <span className="font-semibold text-purple-700">Produtos & Vitrine</span>
          </div>
        </div>

        {/* Em Destaque na Vitrine */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ativos na Vitrine
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-mono font-bold text-emerald-600 block">
            {summary.vitrineCount}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Visíveis para Clientes</span>
            <span className="font-semibold text-emerald-600">Vitrine Pública</span>
          </div>
        </div>

        {/* Valor Total do Estoque */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Valor do Estoque
            </span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-mono font-bold text-slate-900 block">
            R$ {summary.totalInventoryValue.toFixed(2).replace('.', ',')}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Preço de Venda</span>
            <span className="font-semibold text-purple-700">Previsão bruta</span>
          </div>
        </div>

        {/* Alerta de Estoque Baixo */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estoque Baixo
            </span>
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${summary.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <span
            className={`text-2xl font-mono font-bold block ${summary.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
          >
            {summary.lowStockCount}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Abaixo do limite</span>
            <span className={summary.lowStockCount > 0 ? 'font-bold text-amber-600' : 'text-slate-400'}>
              {summary.lowStockCount > 0 ? 'Reabastecer' : 'Estoque regular'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Categorias e Ação de Criar Produto */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="TODAS">Todas as Categorias</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyVitrineFilter(!onlyVitrineFilter)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${onlyVitrineFilter
                ? 'bg-tenant-light text-tenant-primary border-tenant-primary font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Apenas na Vitrine
            </button>
          </div>
        </div>

        {tenantPlanCode === 'FREE' ? (
          <Link
            href="/dashboard/planos"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Liberar no Plano Solo / Pro</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQuickSaleOpen(true)}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Venda Balcão (PDV)</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 btn-primary-tenant rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid de Cards de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const isLowStock = product.stockQuantity <= product.minStockAlert;
          return (
            <div
              key={product.id}
              className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden ${product.isActive
                ? 'bg-white border-slate-200/80 shadow-2xs hover:shadow-md'
                : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
            >
              {/* Imagem do Produto com Badges de Vitrine e Estoque */}
              <div className="relative w-full h-44 bg-slate-100 overflow-hidden flex items-center justify-center">
                {product.imageUrl ? (
                  <img
                    src={resolveImageUrl(product.imageUrl)}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-slate-300 ${product.imageUrl ? 'absolute inset-0 -z-0' : ''}`}>
                  <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
                </div>

                {/* Badge da Vitrine Pública */}
                <button
                  type="button"
                  onClick={() => handleToggleVitrine(product.id)}
                  className={`absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-md backdrop-blur-md flex items-center gap-1 cursor-pointer transition-all ${product.showInVitrine
                    ? 'bg-purple-900/80 text-white border border-purple-400/40'
                    : 'bg-slate-900/60 text-slate-300 border border-slate-700'
                    }`}
                  title="Clique para alternar exibição na vitrine"
                >
                  {product.showInVitrine ? <Eye className="w-3 h-3 text-purple-300" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                  <span>{product.showInVitrine ? 'Na Vitrine' : 'Oculto'}</span>
                </button>

                {/* Badge de Alerta de Estoque */}
                {isLowStock && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow-md flex items-center gap-1 backdrop-blur-md">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Estoque Baixo ({product.stockQuantity})</span>
                  </span>
                )}
              </div>

              {/* Informações do Produto */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                    {product.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {product.name}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Preço de Venda</span>
                      <span className="text-base font-mono font-bold text-slate-900">
                        R$ {product.salePrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Stepper de Controle Rápido de Estoque */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-slate-400 block">Estoque</span>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => handleStockDelta(product.id, -1)}
                          className="w-5 h-5 rounded bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          title="Diminuir 1 unidade"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1.5 font-mono text-xs font-bold text-slate-800">
                          {product.stockQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStockDelta(product.id, 1)}
                          className="w-5 h-5 rounded bg-white hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 flex items-center justify-center font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          title="Adicionar 1 unidade"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações de Edição, Movimentação e Exclusão */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStockMovementTarget(product);
                      setMovementType('IN');
                      setMovementQuantity('1');
                      setMovementUnitCost(product.costPrice ? String(product.costPrice) : '');
                      setMovementReason('Reposição de Estoque / Compra');
                      setSyncFinanceExpense(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Movimentar estoque (Entrada / Saída / Balanço)"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(product)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                    title="Editar produto"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(product)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Nenhum produto encontrado</h4>
          <p className="text-xs text-slate-500">
            Cadastre os produtos e cosméticos do seu nicho para vender no balcão e exibir na vitrine online.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 btn-primary-tenant rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cadastrar Primeiro Produto
          </button>
        </div>
      )}

      {/* ==========================================
          MODAL DE CADASTRO / EDIÇÃO DE PRODUTO
          ========================================== */}
      <AnimatePresence>
        {isModalOpen && (() => {
          const currentSale = parseFloat(salePrice.replace(',', '.')) || 0;
          const currentCost = parseFloat(costPrice.replace(',', '.')) || 0;
          const currentStock = parseInt(stockQuantity, 10) || 0;
          const currentProfit = Math.max(0, currentSale - currentCost);
          const currentMargin = currentSale > 0 ? (currentCost > 0 ? ((currentSale - currentCost) / currentSale) * 100 : 100) : 0;
          const currentMarkup = currentCost > 0 ? currentSale / currentCost : 1;
          const currentInventoryGross = currentSale * currentStock;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-xl font-display font-bold text-slate-900">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina precificação com cálculo de margem em tempo real, saldo em estoque e configurações de vitrine.
                </p>

                <form onSubmit={handleSave} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Nome do Produto (2 cols) */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Nome do Produto *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-semibold"
                      />
                    </div>

                    {/* Categoria (1 col) com Datalist Aberto */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Categoria *
                      </label>
                      <input
                        type="text"
                        required
                        list="product-categories-list"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Ex: Home Care, Cabelos, Lash..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-purple-600"
                      />
                      <datalist id="product-categories-list">
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>

                    {/* SKU (1 col) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Código SKU / Referência
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Ex: PROD-001"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold"
                      />
                    </div>

                    {/* Preço de Custo (1 col) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Preço de Custo (R$)
                      </label>
                      <input
                        type="text"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        placeholder="Ex: 25,00"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs font-medium"
                      />
                    </div>

                    {/* Preço de Venda (1 col) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Preço de Venda (R$) *
                      </label>
                      <input
                        type="text"
                        required
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="Ex: 50,00"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-mono font-bold text-xs"
                      />
                    </div>

                    {/* Estoque Atual (1 col) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Estoque Atual (Unidades) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold"
                      />
                    </div>

                    {/* Alerta Estoque Mínimo (1 col) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Alerta de Estoque Mínimo
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={minStockAlert}
                        onChange={(e) => setMinStockAlert(e.target.value)}
                        placeholder="Ex: 3"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold"
                      />
                    </div>

                    {/* PAINEL DINÂMICO DE RENTABILIDADE E MARGEM DE LUCRO (4 cols) */}
                    <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span>Análise de Rentabilidade & Margem em Tempo Real</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Padrão Inteligente de Precificação
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Lucro Bruto Unitário</span>
                          <span className={`text-sm font-mono font-bold block ${currentProfit > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                            R$ {currentProfit.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[9px] text-slate-400">por frasco / unidade</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Margem de Lucro (%)</span>
                          <span className={`text-sm font-mono font-bold block ${currentMargin >= 40 ? 'text-emerald-600' : currentMargin > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {currentMargin.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-400">sobre o preço de venda</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Markup Multiplicador</span>
                          <span className="text-sm font-mono font-bold text-purple-700 block">
                            {currentMarkup.toFixed(2)}x
                          </span>
                          <span className="text-[9px] text-slate-400">fator sobre custo</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Faturamento Potencial</span>
                          <span className="text-sm font-mono font-bold text-slate-900 block">
                            R$ {currentInventoryGross.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[9px] text-slate-400">lote em estoque ({currentStock} un)</span>
                        </div>
                      </div>

                      {/* Barra Visual de Custo vs Lucro */}
                      {currentSale > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                            <span>Composição do Preço</span>
                            <span>
                              Custo: {((100 - currentMargin) > 0 ? (100 - currentMargin).toFixed(1) : 0)}% | Lucro: {currentMargin.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                            <div
                              className="h-full bg-amber-400 transition-all duration-300"
                              style={{ width: `${Math.max(0, 100 - currentMargin)}%` }}
                              title="Fatia de Custo"
                            />
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, currentMargin)}%` }}
                              title="Fatia de Lucro"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Descrição Comercial (2 cols) */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Descrição Comercial & Orientação de Uso
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                      />
                    </div>

                    {/* Foto do Produto (2 cols) */}
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Foto do Produto
                      </label>
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                            <img src={resolveImageUrl(imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}

                        <div className="flex-1 space-y-1.5">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            disabled={uploadingImage}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={uploadingImage}
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingImage ? 'Enviando...' : (imageUrl ? 'Trocar Imagem' : 'Upload do Dispositivo')}</span>
                            </button>
                            {imageUrl && (
                              <button
                                type="button"
                                disabled={uploadingImage}
                                onClick={() => setImageUrl('')}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">JPG, PNG ou WebP</p>
                        </div>
                      </div>
                    </div>

                    {/* Toggles: Exibir na Vitrine e Ativo (4 cols) */}
                    <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showInVitrine}
                          onChange={(e) => setShowInVitrine(e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Exibir na Vitrine Pública</span>
                          <span className="text-[10px] text-slate-500">Disponível para clientes visualizarem e solicitarem</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Produto Ativo para Vendas</span>
                          <span className="text-[10px] text-slate-500">Permitido para checkout e controle de estoque</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE MOVIMENTAÇÃO FORMAL DE ESTOQUE
          ========================================== */}
      <AnimatePresence>
        {stockMovementTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStockMovementTarget(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setStockMovementTarget(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 mb-1">
                <ArrowUpDown className="w-4 h-4" />
                <span>Gestão de Almoxarifado & Estoque</span>
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">
                Movimentação de Estoque
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Produto: <strong className="text-slate-800">{stockMovementTarget.name}</strong> • Saldo atual: <strong className="text-purple-700">{stockMovementTarget.stockQuantity} un</strong>
              </p>

              <form onSubmit={handleSaveStockMovement} className="mt-5 space-y-4">
                {/* Tipo de Operação */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Tipo de Operação *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMovementType('IN');
                        setMovementReason('Entrada de Nota / Compra de Fornecedor');
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${movementType === 'IN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <Plus className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                      <span>Entrada / Compra</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMovementType('OUT');
                        setMovementReason('Uso em Bancada / Procedimento Interno');
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${movementType === 'OUT'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <Minus className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                      <span>Saída / Baixa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMovementType('ADJUST');
                        setMovementReason('Balanço Periódico de Inventário');
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${movementType === 'ADJUST'
                        ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <RefreshCw className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                      <span>Balanço / Ajuste</span>
                    </button>
                  </div>
                </div>

                {/* Quantidade e Custo Unitário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {movementType === 'ADJUST' ? 'Nova Quantidade Contada *' : 'Quantidade *'}
                    </label>
                    <input
                      type="number"
                      required
                      min={movementType === 'ADJUST' ? 0 : 1}
                      value={movementQuantity}
                      onChange={(e) => setMovementQuantity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Custo Unitário da Operação (R$)
                    </label>
                    <input
                      type="text"
                      value={movementUnitCost}
                      onChange={(e) => setMovementUnitCost(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Motivo da Movimentação */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Justificativa / Motivo da Operação *
                  </label>
                  <input
                    type="text"
                    required
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                </div>

                {/* Checkbox de Sincronização com Financeiro */}
                {movementType === 'IN' && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncFinanceExpense}
                        onChange={(e) => setSyncFinanceExpense(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-purple-900 block">
                          Lançar Despesa Automática no Módulo Financeiro
                        </span>
                        <span className="text-[11px] text-purple-700 leading-relaxed block">
                          Registra uma saída de caixa de R$ {((parseFloat(movementUnitCost.replace(',', '.')) || 0) * (parseInt(movementQuantity, 10) || 0)).toFixed(2).replace('.', ',')} na categoria Insumos & Produtos de Bancada.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStockMovementTarget(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirmar Movimentação</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Excluir Produto do Catálogo?"
        description={`Tem certeza que deseja apagar "${deleteTarget?.name}"? Ele será removido do controle de estoque e da vitrine pública.`}
        confirmLabel="Sim, Excluir"
        isDestructive={true}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Modal de Venda Expressa de Balcão (PDV) */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        onSaleCompleted={fetchProducts}
        showToast={showToast}
      />
    </div>
  );
}
