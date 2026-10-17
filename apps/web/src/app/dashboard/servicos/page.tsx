'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { api } from '@/lib/api';

type BusinessNicheKey =
  | 'BARBERSHOP'
  | 'BEAUTY_SALON'
  | 'NAIL_LASH_STUDIO'
  | 'AESTHETICS_CLINIC'
  | 'PERSONAL_TRAINER';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  price: number;
  imageUrl?: string;
  processingMinutes?: number;
  finishingMinutes?: number;
  allowOnlineBooking: boolean;
  isActive: boolean;
}

interface NicheThemeStyle {
  themeId: string;
  themeName: string;
  primaryButton: string;
  activePill: string;
  badge: string;
  priceTag: string;
  highlightText: string;
  accentBorder: string;
}

const NICHE_THEMES: Record<BusinessNicheKey, NicheThemeStyle> = {
  BARBERSHOP: {
    themeId: 'DARK_OBSIDIAN',
    themeName: 'Dark Obsidian & Grafite',
    primaryButton: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20',
    activePill: 'bg-slate-900 text-white shadow-2xs',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    priceTag: 'bg-slate-900/90 text-white',
    highlightText: 'text-slate-900',
    accentBorder: 'hover:border-slate-400'
  },
  BEAUTY_SALON: {
    themeId: 'PURPLE_IMPERIAL',
    themeName: 'Roxo Imperial & Ouro',
    primaryButton: 'btn-primary-tenant',
    activePill: 'btn-primary-tenant',
    badge: 'bg-tenant-light text-tenant-primary border-tenant-primary/20',
    priceTag: 'bg-slate-900 text-white',
    highlightText: 'text-tenant-primary',
    accentBorder: 'hover:border-tenant-primary'
  },
  NAIL_LASH_STUDIO: {
    themeId: 'ROSE_GOLD',
    themeName: 'Rose Gold & Nude Estético',
    primaryButton: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20',
    activePill: 'bg-rose-600 text-white shadow-2xs',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    priceTag: 'bg-stone-900/90 text-white',
    highlightText: 'text-rose-700',
    accentBorder: 'hover:border-rose-300'
  },
  AESTHETICS_CLINIC: {
    themeId: 'EMERALD_SAGE',
    themeName: 'Verde Esmeralda & Sage',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20',
    activePill: 'bg-emerald-600 text-white shadow-2xs',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    priceTag: 'bg-emerald-950/90 text-white',
    highlightText: 'text-emerald-700',
    accentBorder: 'hover:border-emerald-300'
  },
  PERSONAL_TRAINER: {
    themeId: 'MIDNIGHT_SAPPHIRE',
    themeName: 'Azul Safira Real',
    primaryButton: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20',
    activePill: 'bg-blue-600 text-white shadow-2xs',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    priceTag: 'bg-slate-900/90 text-white',
    highlightText: 'text-blue-700',
    accentBorder: 'hover:border-blue-300'
  }
};

interface NicheKpiCard4 {
  title: string;
  calculateValue: (services: ServiceItem[]) => string | number;
  subtitle: string;
}

const NICHE_KPI_CARD4: Record<BusinessNicheKey, NicheKpiCard4> = {
  BARBERSHOP: {
    title: 'Combos & Barboterapia',
    calculateValue: (services) =>
      services.filter(
        (s) =>
          s.category.toLowerCase().includes('barba') ||
          s.category.toLowerCase().includes('combo') ||
          s.name.toLowerCase().includes('barba') ||
          s.name.toLowerCase().includes('combo')
      ).length,
    subtitle: 'Procedimentos de barba e combos'
  },
  BEAUTY_SALON: {
    title: 'Encaixes Simultâneos',
    calculateValue: (services) =>
      services.filter((s) => Boolean(s.processingMinutes && s.processingMinutes > 0)).length,
    subtitle: 'Procedimentos com tempo de espera livre'
  },
  NAIL_LASH_STUDIO: {
    title: 'Alongamentos & Extensões',
    calculateValue: (services) =>
      services.filter(
        (s) =>
          s.category.toLowerCase().includes('gel') ||
          s.category.toLowerCase().includes('cílios') ||
          s.name.toLowerCase().includes('alongamento') ||
          s.name.toLowerCase().includes('extensão')
      ).length,
    subtitle: 'Procedimentos de alta retenção'
  },
  AESTHETICS_CLINIC: {
    title: 'Protocolos Faciais & Corporais',
    calculateValue: (services) =>
      services.filter(
        (s) =>
          s.category.toLowerCase().includes('facial') ||
          s.category.toLowerCase().includes('corporal') ||
          s.category.toLowerCase().includes('massagem')
      ).length,
    subtitle: 'Procedimentos clínicos e estéticos'
  },
  PERSONAL_TRAINER: {
    title: 'Consultorias & Planos',
    calculateValue: (services) =>
      services.filter(
        (s) =>
          s.category.toLowerCase().includes('consultoria') ||
          s.name.toLowerCase().includes('consultoria') ||
          s.name.toLowerCase().includes('avaliação')
      ).length,
    subtitle: 'Planos de acompanhamento individual'
  }
};

interface NicheConfig {
  id: BusinessNicheKey;
  label: string;
  description: string;
  defaultCategories: string[];
  photoPresets: Array<{ name: string; url: string }>;
}

const NICHES_DATA: Record<BusinessNicheKey, NicheConfig> = {
  BARBERSHOP: {
    id: 'BARBERSHOP',
    label: 'Barbearia',
    description: 'Catálogo de cortes masculinos, barboterapia e acabamentos',
    defaultCategories: ['Cabelo', 'Barba', 'Combos', 'Tratamentos & Cor'],
    photoPresets: [
      {
        name: 'Degradê & Fade',
        url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Barboterapia & Toalha Quente',
        url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Corte Clássico na Tesoura',
        url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Alinhamento & Navalhado',
        url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },

  BEAUTY_SALON: {
    id: 'BEAUTY_SALON',
    label: 'Salão de Beleza',
    description: 'Catálogo de mechas, cortes femininos, escovas e tratamentos capilares',
    defaultCategories: ['Cabelo', 'Coloração & Mechas', 'Tratamentos', 'Penteados'],
    photoPresets: [
      {
        name: 'Mechas & Morena Iluminada',
        url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Corte Feminino & Escova',
        url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Penteado & Produção',
        url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Hidratação & Lavatório',
        url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },

  NAIL_LASH_STUDIO: {
    id: 'NAIL_LASH_STUDIO',
    label: 'Unhas & Cílios',
    description: 'Catálogo de esmalteria, alongamento em gel e extensões de cílios',
    defaultCategories: ['Unhas em Gel', 'Esmaltação', 'Extensão de Cílios', 'Sobrancelhas'],
    photoPresets: [
      {
        name: 'Alongamento em Gel',
        url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Esmaltação & Nail Art',
        url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Extensão de Cílios',
        url: 'https://images.unsplash.com/photo-1588515724527-074a7a56616c?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Design de Sobrancelhas',
        url: 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },

  AESTHETICS_CLINIC: {
    id: 'AESTHETICS_CLINIC',
    label: 'Clínica de Estética',
    description: 'Catálogo de procedimentos faciais, corporais, drenagem e massoterapia',
    defaultCategories: ['Facial', 'Corporal', 'Massoterapia', 'Avaliação'],
    photoPresets: [
      {
        name: 'Limpeza de Pele Profunda',
        url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Massagem Relaxante com Óleos',
        url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Drenagem Linfática Corporal',
        url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Peeling Químico Renovador',
        url: 'https://images.unsplash.com/photo-1512290900672-1f02e7ad0ba8?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },

  PERSONAL_TRAINER: {
    id: 'PERSONAL_TRAINER',
    label: 'Personal Trainer',
    description: 'Catálogo de sessões de treino presencial, consultoria e avaliações físicas',
    defaultCategories: ['Treinos Presenciais', 'Avaliação Física', 'Consultoria'],
    photoPresets: [
      {
        name: 'Treino de Força & Musculação',
        url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Treino Funcional & Cardio',
        url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Avaliação Bioimpedância',
        url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80'
      }
    ]
  }
};

export default function DashboardServicosPage() {
  const [currentNiche, setCurrentNiche] = useState<BusinessNicheKey>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tenant_niche') as BusinessNicheKey | null;
      if (saved && NICHES_DATA[saved]) return saved;
    }
    return 'NAIL_LASH_STUDIO';
  });
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modais de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('45');
  const [price, setPrice] = useState('50.00');
  const [imageUrl, setImageUrl] = useState('');
  const [processingMinutes, setProcessingMinutes] = useState('0');
  const [finishingMinutes, setFinishingMinutes] = useState('0');
  const [allowOnlineBooking, setAllowOnlineBooking] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services');
      const items: ServiceItem[] = (res.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category || 'Geral',
        description: s.description || '',
        durationMinutes: s.durationMinutes,
        price: Number(s.price),
        imageUrl: (s.photos && s.photos.length > 0) ? s.photos[0] : (s.imageUrl || ''),
        processingMinutes: s.processingMinutes || 0,
        finishingMinutes: s.finishingMinutes || 0,
        allowOnlineBooking: s.allowOnlineBooking ?? true,
        isActive: s.allowOnlineBooking ?? true
      }));
      setServices(items);
    } catch (err) {
      console.error('Erro ao buscar serviços do banco:', err);
      showToast('Erro ao carregar catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/tenants/me')
      .then((res) => {
        if (res.data?.niche && NICHES_DATA[res.data.niche as BusinessNicheKey]) {
          setCurrentNiche(res.data.niche as BusinessNicheKey);
          localStorage.setItem('tenant_niche', res.data.niche);
        }
      })
      .catch(() => {
        const savedNiche = localStorage.getItem('tenant_niche') as BusinessNicheKey | null;
        if (savedNiche && NICHES_DATA[savedNiche]) {
          setCurrentNiche(savedNiche);
        }
      });

    fetchServices();
  }, []);

  // Upload de Foto via File Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        showToast('Foto carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const currentNicheConfig = NICHES_DATA[currentNiche];
  const currentTheme = NICHE_THEMES[currentNiche];
  const card4Config = NICHE_KPI_CARD4[currentNiche];

  const handleOpenCreate = () => {
    setEditingService(null);
    setName('');
    setCategory(currentNicheConfig.defaultCategories[0] || 'Geral');
    setDescription('');
    setDuration('45');
    setPrice('50.00');
    setImageUrl('');
    setProcessingMinutes('0');
    setFinishingMinutes('0');
    setAllowOnlineBooking(true);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (svc: ServiceItem) => {
    setEditingService(svc);
    setName(svc.name);
    setCategory(svc.category);
    setDescription(svc.description || '');
    setDuration(String(svc.durationMinutes));
    setPrice(String(svc.price));
    setImageUrl(svc.imageUrl || '');
    setProcessingMinutes(String(svc.processingMinutes || 0));
    setFinishingMinutes(String(svc.finishingMinutes || 0));
    setAllowOnlineBooking(svc.allowOnlineBooking);
    setIsActive(svc.isActive);
    setIsModalOpen(true);
  };

  const handleDuplicate = async (svc: ServiceItem) => {
    try {
      await api.post('/services', {
        name: `${svc.name} (Cópia)`,
        category: svc.category,
        description: svc.description || null,
        durationMinutes: svc.durationMinutes,
        price: svc.price,
        photos: svc.imageUrl ? [svc.imageUrl] : [],
        processingMinutes: svc.processingMinutes || 0,
        finishingMinutes: svc.finishingMinutes || 0,
        allowOnlineBooking: svc.allowOnlineBooking,
        serviceType: 'STANDARD'
      });
      showToast(`Serviço "${svc.name}" duplicado com sucesso!`);
      fetchServices();
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
    } catch {
      showToast('Erro ao atualizar status do serviço.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      category: category.trim() || 'Geral',
      description: description.trim() || null,
      durationMinutes: Math.max(5, Number(duration) || 30),
      price: Math.max(0, Number(price) || 0),
      photos: imageUrl.trim() ? [imageUrl.trim()] : [],
      processingMinutes: Number(processingMinutes) || 0,
      finishingMinutes: Number(finishingMinutes) || 0,
      allowOnlineBooking,
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
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar serviço no banco.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/services/${deleteTarget.id}`);
      showToast(`Serviço "${deleteTarget.name}" removido com sucesso.`);
      setDeleteTarget(null);
      fetchServices();
    } catch {
      showToast('Erro ao excluir serviço.');
    }
  };

  const categories = ['TODAS', ...Array.from(new Set(services.map((s) => s.category)))];

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

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalServicesCount = services.length;
  const activeServicesCount = services.filter((s) => s.isActive).length;
  const averagePrice =
    totalServicesCount > 0
      ? services.reduce((acc, s) => acc + s.price, 0) / totalServicesCount
      : 0;
  const categoriesCount = new Set(services.map((s) => (s.category || '').trim()).filter(Boolean)).size;

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

      {/* CARDS DE KPI (SEM ÍCONES) */}
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
            Ticket Médio
          </span>
          <span className="text-2xl font-bold font-display text-slate-900 mt-1 block">
            R$ {averagePrice.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Média de valor dos serviços
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

      {/* 3. BARRA DE CONTROLE: BUSCA, FILTROS E CADASTRO (SEM ÍCONES) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar procedimento por nome ou categoria..."
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

          <div className="flex items-center gap-2">
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

            {/* Botão de Cadastrar Novo Serviço com estilo dinâmico do tema */}
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

      {/* 4. GRID DE SERVIÇOS DO ESTABELECIMENTO */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
          <p className="text-xs font-semibold text-slate-600">Carregando catálogo do banco de dados...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">
              {services.length === 0
                ? 'Nenhum serviço cadastrado ainda'
                : `Nenhum procedimento encontrado em ${currentNicheConfig.label}`}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {services.length === 0
                ? `Cadastre os procedimentos, durações e valores para que seus clientes possam agendar online na vitrine de ${currentNicheConfig.label}.`
                : 'Não há procedimentos correspondentes aos filtros aplicados. Tente buscar por outro termo ou categoria.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${currentTheme.primaryButton}`}
          >
            + Cadastrar Novo Serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className={`rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-2xs hover:shadow-md ${currentTheme.accentBorder} ${
                !svc.isActive ? 'opacity-70 border-slate-200 bg-slate-50/50' : 'border-slate-200/80'
              }`}
            >
              <div>
                {/* Imagem do Serviço */}
                <div className="relative w-full h-44 bg-slate-100 overflow-hidden">
                  {svc.imageUrl ? (
                    <img
                      src={svc.imageUrl}
                      alt={svc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                      <span className="text-xs font-medium text-slate-500">Sem foto definida</span>
                    </div>
                  )}

                  {/* Top Badges: Status e Categoria em flex container sem colisão */}
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
                    <span className={`px-3 py-1 rounded-xl text-sm font-bold font-display shadow-md backdrop-blur-md ${currentTheme.priceTag}`}>
                      R$ {svc.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Detalhes do Procedimento */}
                <div className="p-5 space-y-2">
                  <h3
                    title={svc.name}
                    className={`text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.6rem] transition-colors group-hover:${currentTheme.highlightText}`}
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
                        Encaixe livre: {svc.processingMinutes} min
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra de Ações Textuais Limpas (Sem Ícones) */}
              <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
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



      {/* 6. MODAL DE CRIAÇÃO / EDIÇÃO COM FOTOS EXCLUSIVAS DO NICHO */}
      <AnimatePresence>
        {isModalOpen && (
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
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${currentTheme.badge}`}>
                  {currentNicheConfig.label}
                </span>
                <h3 className="text-xl font-display font-bold text-slate-900 mt-2">
                  {editingService ? 'Editar Procedimento' : 'Novo Procedimento'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cadastre o serviço exclusivo para o nicho de {currentNicheConfig.label}.
                </p>
              </div>

              <form onSubmit={handleSave} className="mt-6 space-y-5">
                {/* SEÇÃO 1: FOTO DO PROCEDIMENTO (SOMENTE UPLOAD DO DISPOSITIVO) */}
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
                            src={imageUrl}
                            alt="Prévia"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="absolute top-1 right-1 px-2 py-0.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
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

                    {/* Botão de Upload do Dispositivo (Exclusivo) */}
                    <div className="space-y-2 flex-1 w-full">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-2"
                        >
                          <span>{imageUrl ? 'Trocar Foto do Dispositivo' : 'Enviar Foto do Dispositivo'}</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
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
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Nome do corte, procedimento ou sessão..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Categoria *
                      </label>
                      <input
                        type="text"
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Ex: Categoria do procedimento"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all text-slate-800"
                      />
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
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva detalhes como recomendações prévias, produtos inclusos..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all resize-none text-slate-800"
                    />
                  </div>
                </div>

                {/* SEÇÃO 3: TEMPO DE ESPERA & ENCAIXES SIMULTÂNEOS (APENAS SE O NICHO FOR SALÃO OU RELEVANTE) */}
                {currentNiche === 'BEAUTY_SALON' && (
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Tempo de Espera / Encaixes Simultâneos (Opcional)
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Ideal para procedimentos com tempo de espera (como hidratação, tintura ou máscara). A agenda libera automaticamente o profissional para encaixar outro atendimento rápido nesse período.
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
                          placeholder="Ex: 45"
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
                          placeholder="Ex: 30"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none font-mono focus:border-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SEÇÃO 4: CONFIGURAÇÕES DE VISIBILIDADE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Disponível na Vitrine
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Clientes podem ver e agendar online
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowOnlineBooking}
                      onChange={(e) => setAllowOnlineBooking(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Procedimento Ativo
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Disponível para a equipe na recepção
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                  </label>
                </div>

                {/* Botões do Rodapé do Modal */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${currentTheme.primaryButton}`}
                  >
                    {editingService ? 'Salvar Alterações' : 'Cadastrar Procedimento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Excluir Procedimento do Catálogo?"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? O procedimento não aparecerá mais para novos agendamentos na vitrine.`}
        confirmLabel="Sim, Excluir Procedimento"
        cancelLabel="Voltar"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
