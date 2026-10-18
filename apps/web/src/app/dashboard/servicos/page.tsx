'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  categoryId?: string | null;
  description: string;
  durationMinutes: number;
  price: number;
  imageUrl?: string;
  processingMinutes?: number;
  finishingMinutes?: number;
  allowOnlineBooking: boolean;
  isActive: boolean;
  requiresDeposit: boolean;
  depositType: 'PERCENTAGE' | 'FIXED';
  depositAmount: number;
}

interface CategoryItem {
  id: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  _count?: { services: number };
}

export default function DashboardServicosPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [depositFilter, setDepositFilter] = useState<'ALL' | 'WITH_DEPOSIT' | 'WITHOUT_DEPOSIT'>('ALL');

  // Modais de Criação / Edição de Serviço
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal de Categorias
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<CategoryItem | null>(null);

  // Form State de Serviço
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('45');
  const [price, setPrice] = useState('50.00');
  const [imageUrl, setImageUrl] = useState('');
  const [processingMinutes, setProcessingMinutes] = useState('0');
  const [finishingMinutes, setFinishingMinutes] = useState('0');
  const [allowOnlineBooking, setAllowOnlineBooking] = useState(true);
  const [requiresDeposit, setRequiresDeposit] = useState(false);
  const [depositType, setDepositType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [depositAmount, setDepositAmount] = useState('50');
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategoriesList(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias do banco:', err);
    }
  };

  const fetchServices = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const res = await api.get('/services');
      const items: ServiceItem[] = (res.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category || 'Geral',
        categoryId: s.categoryId || null,
        description: s.description || '',
        durationMinutes: s.durationMinutes,
        price: Number(s.price),
        imageUrl: s.photos && s.photos.length > 0 ? s.photos[0] : (s.imageUrl || ''),
        processingMinutes: s.processingMinutes || 0,
        finishingMinutes: s.finishingMinutes || 0,
        allowOnlineBooking: s.allowOnlineBooking ?? true,
        isActive: s.allowOnlineBooking ?? true,
        requiresDeposit: Boolean(s.requiresDeposit),
        depositType: s.depositType || 'PERCENTAGE',
        depositAmount: Number(s.depositAmount || 50)
      }));
      setServices(items);
    } catch (err) {
      console.error('Erro ao buscar serviços do banco:', err);
      if (!silent) {
        showToast('Erro ao carregar catálogo.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchServices();
  }, []);

  // Revalidação em Segundo Plano
  useEffect(() => {
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible') {
        fetchServices(true);
        fetchCategories();
      }
    };

    const interval = setInterval(handleRevalidate, 30000);
    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleRevalidate);
    window.addEventListener('marquesuahora_agenda_sync', handleRevalidate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleRevalidate);
      window.removeEventListener('marquesuahora_agenda_sync', handleRevalidate);
    };
  }, []);

  // Upload de Foto via Multipart
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingServiceImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.url) {
        setImageUrl(res.data.url);
        showToast('Foto carregada com sucesso!');
      }
    } catch {
      showToast('Não foi possível carregar a imagem do procedimento.');
    } finally {
      setUploadingServiceImage(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingService(null);
    setName('');
    const defaultCat = categoriesList[0]?.name || 'Geral';
    setCategory(defaultCat);
    setCategoryId(categoriesList[0]?.id || null);
    setDescription('');
    setDuration('45');
    setPrice('50.00');
    setImageUrl('');
    setProcessingMinutes('0');
    setFinishingMinutes('0');
    setAllowOnlineBooking(true);
    setRequiresDeposit(false);
    setDepositType('PERCENTAGE');
    setDepositAmount('50');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (svc: ServiceItem) => {
    setEditingService(svc);
    setName(svc.name);
    setCategory(svc.category);
    setCategoryId(svc.categoryId || null);
    setDescription(svc.description || '');
    setDuration(String(svc.durationMinutes));
    setPrice(String(svc.price));
    setImageUrl(svc.imageUrl || '');
    setProcessingMinutes(String(svc.processingMinutes || 0));
    setFinishingMinutes(String(svc.finishingMinutes || 0));
    setAllowOnlineBooking(svc.allowOnlineBooking);
    setRequiresDeposit(svc.requiresDeposit ?? false);
    setDepositType(svc.depositType || 'PERCENTAGE');
    setDepositAmount(String(svc.depositAmount ?? 50));
    setIsModalOpen(true);
  };

  const handleDuplicate = async (svc: ServiceItem) => {
    try {
      await api.post('/services', {
        name: `${svc.name} (Cópia)`,
        category: svc.category,
        categoryId: svc.categoryId || null,
        description: svc.description || null,
        durationMinutes: svc.durationMinutes,
        price: svc.price,
        photos: svc.imageUrl ? [svc.imageUrl] : [],
        processingMinutes: svc.processingMinutes || 0,
        finishingMinutes: svc.finishingMinutes || 0,
        allowOnlineBooking: svc.allowOnlineBooking,
        requiresDeposit: svc.requiresDeposit,
        depositType: svc.depositType,
        depositAmount: svc.depositAmount,
        serviceType: 'STANDARD'
      });
      showToast(`Serviço "${svc.name}" duplicado com sucesso!`);
      fetchServices();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch {
      showToast('Erro ao duplicar serviço no banco.');
    }
  };

  const handleToggleActive = async (svc: ServiceItem) => {
    try {
      await api.put(`/services/${svc.id}`, { allowOnlineBooking: !svc.allowOnlineBooking });
      showToast(
        `Serviço "${svc.name}" ${!svc.allowOnlineBooking ? 'ativado na vitrine' : 'pausado'}.`
      );
      fetchServices();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch {
      showToast('Erro ao atualizar status do serviço.');
    }
  };

  // Alternar Exigência de Sinal com 1 Clique diretamente no card
  const handleToggleDeposit = async (svc: ServiceItem) => {
    const nextState = !svc.requiresDeposit;
    try {
      await api.put(`/services/${svc.id}`, {
        requiresDeposit: nextState,
        depositType: svc.depositType || 'PERCENTAGE',
        depositAmount: Number(svc.depositAmount) || 50
      });
      showToast(
        nextState
          ? `Sinal ativado para "${svc.name}".`
          : `Sinal desativado para "${svc.name}".`
      );
      fetchServices(true);
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch {
      showToast('Erro ao atualizar regra de sinal do serviço.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Resolve categoria e categoryId
    const matchedCategory = categoriesList.find(
      (c) => c.name.toLowerCase() === category.trim().toLowerCase()
    );

    const payload = {
      name: name.trim(),
      category: category.trim() || 'Geral',
      categoryId: matchedCategory?.id || categoryId || null,
      description: description.trim() || null,
      durationMinutes: Math.max(5, Number(duration) || 30),
      price: Math.max(0, Number(price) || 0),
      photos: imageUrl.trim() ? [imageUrl.trim()] : [],
      imageUrl: imageUrl.trim() || null,
      processingMinutes: Number(processingMinutes) || 0,
      finishingMinutes: Number(finishingMinutes) || 0,
      allowOnlineBooking,
      requiresDeposit,
      depositType,
      depositAmount: Number(depositAmount) || 50,
      serviceType: 'STANDARD'
    };

    try {
      if (editingService) {
        await api.put(`/services/${editingService.id}`, payload);
        showToast(`Serviço "${name.trim()}" atualizado com sucesso!`);
      } else {
        await api.post('/services', payload);
        showToast(`Novo serviço "${name.trim()}" cadastrado com sucesso!`);
      }
      setIsModalOpen(false);
      fetchServices();
      fetchCategories();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar serviço no banco.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/services/${deleteTarget.id}`);
      showToast(res.data?.message || `Serviço "${deleteTarget.name}" removido com sucesso.`);
      setDeleteTarget(null);
      fetchServices();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch {
      showToast('Erro ao excluir serviço.');
    }
  };

  // Funções de Gestão de Categorias
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSavingCategory(true);
    try {
      await api.post('/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim() || null
      });
      showToast(`Categoria "${newCatName.trim()}" criada com sucesso!`);
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao cadastrar categoria.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpdateCategory = async (catId: string) => {
    if (!editCatName.trim()) return;
    try {
      await api.put(`/categories/${catId}`, {
        name: editCatName.trim(),
        description: editCatDesc.trim() || null
      });
      showToast('Categoria atualizada com sucesso!');
      setEditingCatId(null);
      fetchCategories();
      fetchServices(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao atualizar categoria.');
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryDeleteTarget) return;
    try {
      await api.delete(`/categories/${categoryDeleteTarget.id}`);
      showToast(`Categoria "${categoryDeleteTarget.name}" removida com sucesso.`);
      setCategoryDeleteTarget(null);
      fetchCategories();
      fetchServices(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao excluir categoria.');
    }
  };

  // Lista de Categorias Únicas para os Filtros
  const uniqueCategoryNames = Array.from(
    new Set([
      ...categoriesList.map((c) => c.name),
      ...services.map((s) => s.category)
    ])
  ).filter(Boolean);

  const categories = ['TODAS', ...uniqueCategoryNames];

  const filteredServices = services.filter((svc) => {
    const matchesSearch =
      svc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (svc.description && svc.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'TODAS' ||
      svc.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && svc.isActive) ||
      (statusFilter === 'INACTIVE' && !svc.isActive);

    const matchesDeposit =
      depositFilter === 'ALL' ||
      (depositFilter === 'WITH_DEPOSIT' && svc.requiresDeposit) ||
      (depositFilter === 'WITHOUT_DEPOSIT' && !svc.requiresDeposit);

    return matchesSearch && matchesCategory && matchesStatus && matchesDeposit;
  });

  const totalServicesCount = services.length;
  const activeServicesCount = services.filter((s) => s.isActive).length;
  const servicesWithDepositCount = services.filter((s) => s.requiresDeposit).length;
  const categoriesCount = uniqueCategoryNames.length;

  return (
    <div className="w-full space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-800"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CARDS DE KPI SÓBRIOS (SEM ÍCONES DECORATIVOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total de Serviços
          </span>
          <span className="text-2xl font-bold font-display text-slate-900 mt-1 block">
            {totalServicesCount}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Procedimentos cadastrados no catálogo
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Serviços Ativos
          </span>
          <span className="text-2xl font-bold font-display text-emerald-600 mt-1 block">
            {activeServicesCount}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">
            Disponíveis para agendamento online
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Com Sinal Anti-Falta
          </span>
          <span className="text-2xl font-bold font-display text-purple-700 mt-1 block">
            {servicesWithDepositCount}
          </span>
          <span className="text-[11px] text-purple-700 font-medium block mt-1">
            Exigem adiantamento no agendamento
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Categorias
          </span>
          <span className="text-2xl font-bold font-display text-slate-900 mt-1 block">
            {categoriesCount}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Divisões ativas no catálogo
          </span>
        </div>
      </div>

      {/* 2. BARRA DE CONTROLE: BUSCA, FILTROS E CADASTROS */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar serviço por nome, categoria ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all text-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer transition-all shrink-0"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="INACTIVE">Apenas Pausados</option>
            </select>

            {/* Filtro de Sinal */}
            <select
              value={depositFilter}
              onChange={(e) => setDepositFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer transition-all shrink-0"
            >
              <option value="ALL">Todos os Sinais</option>
              <option value="WITH_DEPOSIT">Com Sinal Ativo</option>
              <option value="WITHOUT_DEPOSIT">Sem Sinal</option>
            </select>

            {/* Botão de Gerenciamento de Categorias */}
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all cursor-pointer shrink-0"
            >
              Categorias ({categoriesList.length})
            </button>

            {/* Botão de Cadastrar Novo Serviço */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold btn-primary-tenant transition-all active:scale-95 cursor-pointer shrink-0 shadow-md"
            >
              Cadastrar Novo Serviço
            </button>
          </div>
        </div>

        {/* Pílulas de Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold border-t border-slate-100 pt-3">
          <span className="text-[11px] text-slate-400 mr-1 shrink-0">Categorias:</span>
          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'btn-primary-tenant shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'TODAS' ? 'Todas as Categorias' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. GRID DE SERVIÇOS DO ESTABELECIMENTO */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-3" />
          <p className="text-xs font-semibold text-slate-600">Carregando catálogo do banco de dados...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">
              {services.length === 0
                ? 'Nenhum serviço cadastrado ainda'
                : 'Nenhum procedimento encontrado'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {services.length === 0
                ? 'Cadastre os procedimentos, durações e valores para que seus clientes possam agendar online na sua vitrine.'
                : 'Não há procedimentos correspondentes aos filtros aplicados. Tente buscar por outro termo ou categoria.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl text-xs font-bold btn-primary-tenant transition-all active:scale-95 cursor-pointer shadow-md inline-block mx-auto"
          >
            Cadastrar Novo Serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className={`rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-2xs hover:shadow-md hover:border-slate-400 ${
                !svc.isActive ? 'opacity-70 border-slate-200 bg-slate-50/50' : 'border-slate-200/80'
              }`}
            >
              <div>
                {/* Imagem do Serviço */}
                <div className="relative w-full h-44 bg-slate-100 overflow-hidden">
                  {svc.imageUrl ? (
                    <img
                      src={resolveImageUrl(svc.imageUrl)}
                      alt={svc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                      <span className="text-xs font-medium text-slate-500">Sem foto definida</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5 pointer-events-none z-10">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-md shadow-xs shrink-0 flex items-center gap-1.5 ${
                        svc.isActive
                          ? 'bg-emerald-600/90 text-white border border-emerald-400/30'
                          : 'bg-slate-800/80 text-white border border-slate-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${svc.isActive ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{svc.isActive ? 'Ativo' : 'Pausado'}</span>
                    </span>

                    <span
                      title={svc.category}
                      className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/95 text-slate-700 shadow-xs backdrop-blur-xs border border-slate-200/80 truncate max-w-[58%]"
                    >
                      {svc.category}
                    </span>
                  </div>

                  {/* Preço sobreposto no rodapé da imagem */}
                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="px-3 py-1 rounded-xl text-sm font-bold font-display shadow-md backdrop-blur-md bg-slate-900/90 text-white">
                      R$ {svc.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Detalhes do Procedimento */}
                <div className="p-5 space-y-2">
                  <h3
                    title={svc.name}
                    className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.6rem] transition-colors"
                  >
                    {svc.name}
                  </h3>

                  {svc.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {svc.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                      {svc.durationMinutes} min
                    </span>

                    {Boolean(svc.processingMinutes && svc.processingMinutes > 0) && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/60">
                        Pausa: {svc.processingMinutes} min
                      </span>
                    )}

                    {svc.requiresDeposit ? (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200">
                        Sinal: {svc.depositType === 'PERCENTAGE' ? `${svc.depositAmount}%` : `R$ ${svc.depositAmount.toFixed(0)}`}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                        Sem sinal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra de Ações Textuais Limpas */}
              <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(svc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      svc.isActive
                        ? 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                        : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {svc.isActive ? 'Pausar' : 'Ativar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDeposit(svc)}
                    title={svc.requiresDeposit ? 'Clique para desativar o sinal' : 'Clique para ativar sinal de 50%'}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      svc.requiresDeposit
                        ? 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                        : 'text-slate-500 hover:text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    {svc.requiresDeposit ? 'Desativar Sinal' : 'Exigir Sinal'}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(svc)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Duplicar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(svc)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(svc)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL DE CRIAÇÃO / EDIÇÃO DE SERVIÇO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors font-semibold cursor-pointer"
              >
                Fechar
              </button>

              <div>
                <h3 className="text-xl font-display font-bold text-slate-900">
                  {editingService ? 'Editar Procedimento' : 'Novo Procedimento'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preencha as informações do serviço e defina se exige sinal antecipado de reserva.
                </p>
              </div>

              <form onSubmit={handleSave} className="mt-6 space-y-5">
                {/* SEÇÃO 1: FOTO DO PROCEDIMENTO (UPLOAD REAL VIA MULTIPART) */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 block">
                      Foto do Procedimento
                    </span>
                    <span className="text-[11px] text-slate-400">
                      JPG, PNG ou WEBP
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Preview da Foto */}
                    <div className="relative w-28 h-28 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                      {imageUrl ? (
                        <>
                          <img
                            src={resolveImageUrl(imageUrl)}
                            alt="Prévia"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            disabled={uploadingServiceImage}
                            onClick={() => setImageUrl('')}
                            className="absolute top-1 right-1 px-2 py-0.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="Remover foto"
                          >
                            Remover
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            Sem imagem
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botão de Upload */}
                    <div className="space-y-2 flex-1 w-full">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={uploadingServiceImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          <span>{uploadingServiceImage ? 'Enviando foto...' : (imageUrl ? 'Trocar Foto' : 'Enviar Foto')}</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          disabled={uploadingServiceImage}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>

                      <span className="text-[10px] text-slate-400 block">
                        Fotos atrativas aumentam a conversão de agendamentos na sua vitrine.
                      </span>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: DADOS BÁSICOS */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome do Procedimento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Alongamento Fibra de Vidro, Manicure em Gel..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Select de Categoria Dinâmica */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Categoria *
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                        >
                          + Nova
                        </button>
                      </div>
                      <select
                        required
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          const matched = categoriesList.find((c) => c.name === e.target.value);
                          setCategoryId(matched?.id || null);
                        }}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all text-slate-800 cursor-pointer"
                      >
                        {categoriesList.length === 0 ? (
                          <option value="Geral">Geral</option>
                        ) : (
                          categoriesList.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Duração Total (min) *
                      </label>
                      <input
                        type="number"
                        required
                        min={5}
                        step={5}
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 font-mono transition-all text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Preço (R$) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 font-mono transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Descrição e Orientações aos Clientes (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Informações adicionais, cuidados prévios ou recomendações..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all resize-none text-slate-800"
                    />
                  </div>
                </div>

                {/* SEÇÃO 3: TEMPO DE PAUSA / ENCAIXES SIMULTÂNEOS (OPCIONAL) */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Tempo de Espera / Encaixes Simultâneos (Opcional)
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Para procedimentos com tempo de espera (ex: tintura, química ou secagem em cabine). A agenda libera o profissional para encaixar outro atendimento rápido nesse período.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Tempo Livre para Encaixe (min)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={processingMinutes}
                        onChange={(e) => setProcessingMinutes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none font-mono focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Tempo para Finalizar o Serviço (min)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={finishingMinutes}
                        onChange={(e) => setFinishingMinutes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none font-mono focus:border-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 4: EXIGÊNCIA DE SINAL DE RESERVA (PIX) */}
                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-purple-950 block">
                        Exigir Sinal de Reserva Antecipado (PIX)
                      </span>
                      <p className="text-[11px] text-purple-800/80 leading-relaxed mt-0.5">
                        Exige o pagamento de sinal via PIX para garantir o horário deste procedimento na vitrine online.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={requiresDeposit}
                        onChange={(e) => setRequiresDeposit(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                    </label>
                  </div>

                  {requiresDeposit && (
                    <div className="pt-2 border-t border-purple-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-purple-900 block mb-1">
                          Tipo de Cobrança
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-xl border border-purple-200">
                          <button
                            type="button"
                            onClick={() => setDepositType('PERCENTAGE')}
                            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              depositType === 'PERCENTAGE'
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Porcentagem (%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDepositType('FIXED')}
                            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              depositType === 'FIXED'
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Valor Fixo (R$)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-purple-900 block mb-1">
                          {depositType === 'PERCENTAGE' ? 'Porcentagem do Sinal (%)' : 'Valor Fixo (R$)'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={depositType === 'PERCENTAGE' ? 100 : 2000}
                            step={depositType === 'PERCENTAGE' ? 5 : 5}
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-purple-300 rounded-xl outline-none font-mono focus:border-purple-600 text-slate-800 font-bold"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            {depositType === 'PERCENTAGE' ? '%' : 'BRL'}
                          </span>
                        </div>
                      </div>

                      <div className="sm:col-span-2 p-2.5 bg-white/80 rounded-xl border border-purple-200/80 text-[11px] text-purple-900">
                        {depositType === 'PERCENTAGE' ? (
                          <span>
                            Para este serviço de <strong>R$ {Number(price || 0).toFixed(2).replace('.', ',')}</strong>, a cliente pagará{' '}
                            <strong>
                              R${' '}
                              {(((Number(price) || 0) * (Number(depositAmount) || 50)) / 100)
                                .toFixed(2)
                                .replace('.', ',')}
                            </strong>{' '}
                            de sinal antecipado via PIX ({depositAmount}%).
                          </span>
                        ) : (
                          <span>
                            A cliente pagará{' '}
                            <strong>R$ {Number(depositAmount || 50).toFixed(2).replace('.', ',')}</strong> de sinal fixo para garantir este procedimento.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Switch de Ativação na Vitrine */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Disponível na Vitrine Online
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Clientes podem agendar este serviço pelo link da vitrine
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowOnlineBooking}
                      onChange={(e) => setAllowOnlineBooking(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                {/* Botões do Rodapé */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 rounded-xl font-semibold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white btn-primary-tenant shadow-md active:scale-95 cursor-pointer transition-all"
                  >
                    {editingService ? 'Salvar Alterações' : 'Cadastrar Procedimento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL DE GERENCIAMENTO DE CATEGORIAS */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-display font-bold text-slate-900">
                    Categorias de Serviços
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Crie e organize as categorias do catálogo do seu estabelecimento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              {/* Formulário de Nova Categoria */}
              <form onSubmit={handleCreateCategory} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Cadastrar Nova Categoria
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Nome da Categoria (Ex: Unhas em Gel, Cabelo...)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-slate-900 text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Descrição opcional..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-slate-900 text-slate-900"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingCategory || !newCatName.trim()}
                    className="px-4 py-2 text-xs font-bold text-white btn-primary-tenant rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {savingCategory ? 'Cadastrando...' : 'Cadastrar Categoria'}
                  </button>
                </div>
              </form>

              {/* Lista de Categorias Cadastradas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Categorias Cadastradas ({categoriesList.length})
                </span>

                {categoriesList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    Nenhuma categoria cadastrada ainda. Crie a primeira categoria acima.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {categoriesList.map((cat) => {
                      const isEditing = editingCatId === cat.id;

                      if (isEditing) {
                        return (
                          <div
                            key={cat.id}
                            className="p-3 bg-purple-50/70 border border-purple-300 rounded-xl space-y-2"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editCatName}
                                onChange={(e) => setEditCatName(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-bold"
                              />
                              <input
                                type="text"
                                placeholder="Descrição..."
                                value={editCatDesc}
                                onChange={(e) => setEditCatDesc(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateCategory(cat.id)}
                                className="px-3 py-1 text-xs font-bold text-white bg-slate-900 rounded-lg"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {cat.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {cat._count?.services ?? 0} serviço(s)
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {cat.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setEditCatName(cat.name);
                                setEditCatDesc(cat.description || '');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryDeleteTarget(cat)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmação de Exclusão de Serviço */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Excluir Serviço"
        description={`Tem certeza que deseja excluir o serviço "${deleteTarget?.name}"? Se houver histórico de agendamentos, ele será apenas desativado da vitrine.`}
        confirmLabel="Excluir Serviço"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Confirmação de Exclusão de Categoria */}
      <ConfirmModal
        isOpen={Boolean(categoryDeleteTarget)}
        title="Excluir Categoria"
        description={`Tem certeza que deseja excluir a categoria "${categoryDeleteTarget?.name}"? Atenção: Se houver serviços vinculados a esta categoria, será necessário desvinculá-los primeiro.`}
        confirmLabel="Excluir Categoria"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleDeleteCategoryConfirm}
        onClose={() => setCategoryDeleteTarget(null)}
      />
    </div>
  );
}
