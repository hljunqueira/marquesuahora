'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Cake,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Phone,
  Calendar,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  UserX,
  CreditCard,
  FileText,
  Clock,
  Settings
} from 'lucide-react';

export type ShieldStatus = 'FREE' | 'DEPOSIT_REQUIRED' | 'BLOCKED';

export interface ClientHistoryItem {
  date: string;
  service: string;
  price: number;
  professional: string;
}

export interface ClientItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string; // YYYY-MM-DD
  lastVisitAt: string;
  lastVisitDaysAgo: number;
  totalVisits: number;
  noShowCount: number;
  avgVisitDays?: number;
  shieldStatus: ShieldStatus;
  tag?: string;
  notes?: string;
  history?: ClientHistoryItem[];
}

const INITIAL_CLIENTS: ClientItem[] = [
  {
    id: 'cli-1',
    name: 'Fernanda Lima',
    phone: '11987654321',
    email: 'fernanda.lima@gmail.com',
    birthday: '1995-10-03', // Hoje! (03/10)
    lastVisitAt: 'Hoje (03/10)',
    lastVisitDaysAgo: 0,
    totalVisits: 14,
    noShowCount: 0,
    avgVisitDays: 21,
    shieldStatus: 'FREE',
    tag: 'VIP',
    notes: 'Prefere corte em camadas na tesoura e escova modelada. Sempre toma café sem açúcar.',
    history: [
      { date: '03/10/2026', service: 'Corte Feminino & Escova', price: 140.0, professional: 'Juliana Silva' },
      { date: '12/09/2026', service: 'Hidratação & Escova', price: 110.0, professional: 'Juliana Silva' },
      { date: '20/08/2026', service: 'Coloração Global', price: 220.0, professional: 'Juliana Silva' }
    ]
  },
  {
    id: 'cli-2',
    name: 'Roberto Camargo',
    phone: '11977771111',
    email: 'roberto.camargo@empresa.com.br',
    birthday: '1988-06-12', // Junho
    lastVisitAt: 'Há 52 dias',
    lastVisitDaysAgo: 52,
    totalVisits: 8,
    noShowCount: 0,
    avgVisitDays: 25,
    shieldStatus: 'FREE',
    tag: 'Fiel',
    notes: 'Corte degradê navalhado baixo (0.5), barba desenhada com toalha quente.',
    history: [
      { date: '12/08/2026', service: 'Corte Fade & Barba', price: 80.0, professional: 'Carlos Barbeiro' },
      { date: '18/07/2026', service: 'Corte Degradê Navalhado', price: 55.0, professional: 'Carlos Barbeiro' }
    ]
  },
  {
    id: 'cli-3',
    name: 'Juliana Pires',
    phone: '11966662222',
    email: 'juliana.pires@uol.com.br',
    birthday: '1992-04-18', // Abril
    lastVisitAt: 'Há 3 meses',
    lastVisitDaysAgo: 90,
    totalVisits: 3,
    noShowCount: 2,
    avgVisitDays: 30,
    shieldStatus: 'BLOCKED',
    tag: 'Atenção com Faltas',
    notes: 'Faltou duas vezes sem aviso prévio. Agendamento online direcionado para atendimento humano no WhatsApp.',
    history: [
      { date: '05/07/2026', service: 'Design de Sobrancelha', price: 45.0, professional: 'Juliana Silva' },
      { date: '15/06/2026', service: 'Faltou sem avisar', price: 0.0, professional: 'Juliana Silva' }
    ]
  },
  {
    id: 'cli-4',
    name: 'Camila Rocha',
    phone: '11999994444',
    email: 'camila.rocha@outlook.com',
    birthday: '1998-10-09', // Aniversariante deste mês (09/10)
    lastVisitAt: 'Há 14 dias',
    lastVisitDaysAgo: 14,
    totalVisits: 6,
    noShowCount: 0,
    avgVisitDays: 20,
    shieldStatus: 'FREE',
    tag: 'Frequente',
    notes: 'Alérgica a produtos com amônia. Usa preferencialmente linha reconstrutora vegana.',
    history: [
      { date: '19/09/2026', service: 'Tratamento Reconstrutor', price: 160.0, professional: 'Juliana Silva' },
      { date: '30/08/2026', service: 'Corte & Escova', price: 130.0, professional: 'Juliana Silva' }
    ]
  },
  {
    id: 'cli-5',
    name: 'Lucas Albuquerque',
    phone: '11955553333',
    email: 'lucas.albuquerque@gmail.com',
    birthday: '1994-11-22',
    lastVisitAt: 'Há 5 dias',
    lastVisitDaysAgo: 5,
    totalVisits: 1,
    noShowCount: 0,
    avgVisitDays: 0,
    shieldStatus: 'FREE',
    tag: 'Novo',
    notes: 'Cliente novo vindo por indicação no Google Maps.',
    history: [
      { date: '28/09/2026', service: 'Corte Masculino Clássico', price: 50.0, professional: 'Carlos Barbeiro' }
    ]
  },
  {
    id: 'cli-6',
    name: 'Marcelo Rossi',
    phone: '11944447777',
    email: 'marcelo.rossi@terra.com.br',
    birthday: '1985-02-14',
    lastVisitAt: 'Há 65 dias',
    lastVisitDaysAgo: 65,
    totalVisits: 11,
    noShowCount: 1,
    avgVisitDays: 28,
    shieldStatus: 'DEPOSIT_REQUIRED',
    tag: 'Exige Sinal',
    notes: 'Teve 1 falta recente sem aviso. Sistema configurado para solicitar sinal de 50% via PIX para garantir horário.',
    history: [
      { date: '30/07/2026', service: 'Barba & Cabelo Completo', price: 95.0, professional: 'Carlos Barbeiro' }
    ]
  }
];

export default function DashboardClientesPage() {
  const [filterTab, setFilterTab] = useState<'ALL' | 'BIRTHDAYS' | 'CHURN' | 'SHIELD'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientItem[]>(INITIAL_CLIENTS);

  // Modals de CRUD
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);

  const [detailsClient, setDetailsClient] = useState<ClientItem | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientItem | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    shieldStatus: 'FREE' as ShieldStatus,
    tag: 'Novo',
    noShowCount: 0,
    totalVisits: 1,
    notes: ''
  });

  // Categorias e Tags Dinâmicas (Sincronizadas com Configurações)
  const DEFAULT_TAGS = ['Novo', 'Frequente', 'VIP', 'Fiel', 'Atenção com Faltas', 'Exige Sinal'];
  const [clientTags, setClientTags] = useState<string[]>(DEFAULT_TAGS);
  const [isCreatingCustomTag, setIsCreatingCustomTag] = useState(false);
  const [newCustomTagInput, setNewCustomTagInput] = useState('');

  // Carrega e sincroniza com o LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('marquesuahora_clients_db');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClients(parsed);
        }
      } catch (err) {
        console.error('Erro ao ler clientes do localStorage', err);
      }
    }

    const loadTags = () => {
      const savedTags = localStorage.getItem('marquesuahora_client_tags');
      if (savedTags) {
        try {
          const parsed = JSON.parse(savedTags);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClientTags(parsed);
          }
        } catch (err) {
          console.error('Erro ao ler tags do localStorage', err);
        }
      } else {
        localStorage.setItem('marquesuahora_client_tags', JSON.stringify(DEFAULT_TAGS));
      }
    };

    loadTags();
    window.addEventListener('storage', loadTags);
    return () => window.removeEventListener('storage', loadTags);
  }, []);

  const saveClientsToStorage = (newClients: ClientItem[]) => {
    setClients(newClients);
    localStorage.setItem('marquesuahora_clients_db', JSON.stringify(newClients));
  };

  const handleSaveCustomTag = () => {
    const trimmed = newCustomTagInput.trim();
    if (!trimmed) return;
    if (!clientTags.includes(trimmed)) {
      const updated = [...clientTags, trimmed];
      setClientTags(updated);
      localStorage.setItem('marquesuahora_client_tags', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    }
    setFormData((prev) => ({ ...prev, tag: trimmed }));
    setNewCustomTagInput('');
    setIsCreatingCustomTag(false);
    showToast(`Categoria "${trimmed}" criada e aplicada!`);
  };

  // Helpers de Aniversário e Churn
  const isBirthdayThisMonth = (bday?: string) => {
    if (!bday) return false;
    const parts = bday.split('-');
    if (parts.length < 3) return false;
    const month = parseInt(parts[1], 10);
    return month === 10; // Outubro
  };

  const isBirthdayToday = (bday?: string) => {
    if (!bday) return false;
    const parts = bday.split('-');
    if (parts.length < 3) return false;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return month === 10 && day === 3; // 03 de Outubro
  };

  const formatBirthdayLabel = (bday?: string) => {
    if (!bday) return null;
    const parts = bday.split('-');
    if (parts.length < 3) return null;
    const day = parts[2];
    const month = parts[1];
    return `${day}/${month}`;
  };

  // Filtragem de Clientes
  const filteredClients = clients.filter((cli) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      cli.name.toLowerCase().includes(term) ||
      cli.phone.includes(term) ||
      (cli.email && cli.email.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filterTab === 'BIRTHDAYS') {
      return isBirthdayThisMonth(cli.birthday);
    }
    if (filterTab === 'CHURN') {
      return cli.lastVisitDaysAgo >= 45;
    }
    if (filterTab === 'SHIELD') {
      return cli.shieldStatus !== 'FREE' || cli.noShowCount > 0;
    }
    return true;
  });

  // Métricas para os Cards de KPI
  const totalCount = clients.length;
  const birthdayCount = clients.filter((c) => isBirthdayThisMonth(c.birthday)).length;
  const churnRiskCount = clients.filter((c) => c.lastVisitDaysAgo >= 45).length;
  const shieldRestrictedCount = clients.filter((c) => c.shieldStatus !== 'FREE' || c.noShowCount > 0).length;

  // Abertura do Modal de Cadastro / Edição
  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      birthday: '',
      shieldStatus: 'FREE',
      tag: 'Novo',
      noShowCount: 0,
      totalVisits: 0,
      notes: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (client: ClientItem) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      birthday: client.birthday || '',
      shieldStatus: client.shieldStatus,
      tag: client.tag || 'Frequente',
      noShowCount: client.noShowCount,
      totalVisits: client.totalVisits,
      notes: client.notes || ''
    });
    setIsFormModalOpen(true);
  };

  // Submissão do Formulário de Cliente (Create / Update)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Nome e WhatsApp são obrigatórios!');
      return;
    }

    if (editingClient) {
      // Update
      const updated = clients.map((c) => {
        if (c.id === editingClient.id) {
          return {
            ...c,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim() || undefined,
            birthday: formData.birthday || undefined,
            shieldStatus: formData.shieldStatus,
            tag: formData.tag,
            noShowCount: Number(formData.noShowCount),
            totalVisits: Number(formData.totalVisits),
            notes: formData.notes.trim() || undefined
          };
        }
        return c;
      });
      saveClientsToStorage(updated);
      showToast(`Cliente ${formData.name} atualizado com sucesso!`);
    } else {
      // Create
      const newClient: ClientItem = {
        id: `cli-${Date.now()}`,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        birthday: formData.birthday || undefined,
        lastVisitAt: 'Recém cadastrado',
        lastVisitDaysAgo: 0,
        totalVisits: Number(formData.totalVisits) || 0,
        noShowCount: Number(formData.noShowCount) || 0,
        avgVisitDays: 30,
        shieldStatus: formData.shieldStatus,
        tag: formData.tag || 'Novo',
        notes: formData.notes.trim() || undefined,
        history: []
      };
      saveClientsToStorage([newClient, ...clients]);
      showToast(`Cliente ${formData.name} cadastrado com sucesso!`);
    }

    setIsFormModalOpen(false);
  };

  // Toggle rápido de Regra de Agendamento
  const handleCycleShield = (clientId: string) => {
    const updated = clients.map((c) => {
      if (c.id === clientId) {
        let next: ShieldStatus = 'FREE';
        if (c.shieldStatus === 'FREE') next = 'DEPOSIT_REQUIRED';
        else if (c.shieldStatus === 'DEPOSIT_REQUIRED') next = 'BLOCKED';
        else next = 'FREE';
        return { ...c, shieldStatus: next };
      }
      return c;
    });
    saveClientsToStorage(updated);
    showToast('Regra de agendamento do cliente alterada com sucesso!');
  };

  // Exclusão de Cliente
  const handleConfirmDelete = () => {
    if (!deleteClient) return;
    const updated = clients.filter((c) => c.id !== deleteClient.id);
    saveClientsToStorage(updated);
    showToast(`Cliente ${deleteClient.name} removido com sucesso.`);
    setDeleteClient(null);
  };

  // Geração de mensagem inteligente para o WhatsApp
  const getWhatsappUrl = (client: ClientItem) => {
    const cleanPhone = client.phone.replace(/\D/g, '');
    let text = '';

    if (isBirthdayToday(client.birthday)) {
      text = `Olá ${client.name}! Parabéns pelo seu aniversário hoje! 🎂 Toda a nossa equipe deseja um dia maravilhoso! Preparamos um presente especial para você em seu próximo horário com a gente.`;
    } else if (isBirthdayThisMonth(client.birthday)) {
      text = `Olá ${client.name}! O mês do seu aniversário chegou! Que tal comemorar renovando seu visual com a gente esta semana?`;
    } else if (client.lastVisitDaysAgo >= 45) {
      text = `Olá ${client.name}, tudo bem? Sentimos muito a sua falta por aqui! Preparamos uma condição especial para você renovar seu visual esta semana. Que tal agendarmos?`;
    } else {
      text = `Olá ${client.name}, tudo bem? Como podemos ajudar você hoje com seus agendamentos?`;
    }

    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* ALERTA TOAST FLUTUANTE */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CARDS DE VISÃO RÁPIDA (COM TERMOS AMIGÁVEIS EM PORTUGUÊS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Clientes
            </span>
            <span className="text-2xl font-bold font-display text-slate-900 mt-1 block">
              {totalCount}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Base ativa e fidelizada
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Aniversariantes
            </span>
            <span className="text-2xl font-bold font-display text-amber-600 mt-1 block">
              {birthdayCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              Comemorando em Outubro
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Cake className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Clientes Ausentes
            </span>
            <span className="text-2xl font-bold font-display text-rose-600 mt-1 block">
              {churnRiskCount}
            </span>
            <span className="text-[11px] text-rose-600 font-medium block mt-1">
              Sem visitas há mais de 45 dias
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Controle de Faltas
            </span>
            <span className="text-2xl font-bold font-display text-purple-700 mt-1 block">
              {shieldRestrictedCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              Com sinal PIX ou aviso prévio
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. BARRA DE AÇÕES: ABAS AMIGÁVEIS, BUSCA E BOTÃO NOVO CLIENTE */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full">
        {/* Abas com Ícone Único e Nomes em Português */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {[
            { id: 'ALL', label: 'Todos os Clientes', count: totalCount, icon: Users },
            { id: 'BIRTHDAYS', label: 'Aniversariantes', count: birthdayCount, icon: Cake },
            { id: 'CHURN', label: 'Clientes Ausentes', count: churnRiskCount, icon: AlertTriangle },
            { id: 'SHIELD', label: 'Controle de Faltas', count: shieldRestrictedCount, icon: ShieldAlert }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = filterTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'bg-slate-50 text-slate-600 hover:text-purple-700 hover:bg-purple-50/70 border border-slate-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                    isActive ? 'bg-purple-700 text-purple-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lado Direito: Campo de Busca e Botão + Novo Cliente */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-purple-600/25 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* 3. TABELA COMPLETA DE CLIENTES (EXPANDIDA NO CONTAINER W-FULL) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-5">Cliente</th>
                <th className="py-4 px-4">Aniversário</th>
                <th className="py-4 px-4">Última Visita</th>
                <th className="py-4 px-4 text-center">Visitas</th>
                <th className="py-4 px-4 text-center">Faltas sem Aviso</th>
                <th className="py-4 px-4">Regra de Agendamento</th>
                <th className="py-4 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Nenhum cliente encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm
                        ? `Não há clientes correspondentes à busca "${searchTerm}".`
                        : 'Não há clientes cadastrados para este filtro.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="mt-4 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar primeiro cliente
                    </button>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isBdayToday = isBirthdayToday(client.birthday);
                  const isBdayMonth = isBirthdayThisMonth(client.birthday);
                  const bdayLabel = formatBirthdayLabel(client.birthday);

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-purple-50/20 transition-colors group"
                    >
                      {/* Cliente (Avatar, Nome, Telefone, Tag) */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 font-bold text-xs truncate">
                                {client.name}
                              </span>
                              {client.tag && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                  {client.tag}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-500 font-mono">
                                {client.phone}
                              </span>
                              {client.email && (
                                <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-[160px]">
                                  • {client.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Aniversário */}
                      <td className="py-4 px-4">
                        {client.birthday ? (
                          <div className="flex items-center gap-1.5">
                            {isBdayToday ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                                <Cake className="w-3.5 h-3.5 text-amber-600" />
                                <span>Hoje ({bdayLabel})!</span>
                              </span>
                            ) : isBdayMonth ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-lg">
                                <Cake className="w-3.5 h-3.5 text-purple-600" />
                                <span>{bdayLabel} (Este mês)</span>
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs font-mono font-medium">
                                {bdayLabel}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Última Visita */}
                      <td className="py-4 px-4">
                        <div className="text-slate-800 font-medium">{client.lastVisitAt}</div>
                        {client.lastVisitDaysAgo >= 45 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Ausente</span>
                          </span>
                        )}
                      </td>

                      {/* Total de Visitas */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 font-mono font-bold text-slate-900 text-xs">
                          {client.totalVisits}
                        </span>
                      </td>

                      {/* Faltas sem Aviso */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2.5 py-1 rounded-xl text-xs inline-block ${
                            client.noShowCount >= 2
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : client.noShowCount === 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {client.noShowCount}
                        </span>
                      </td>

                      {/* Regra de Agendamento com alternador rápido */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => handleCycleShield(client.id)}
                          title="Clique para alternar a regra de proteção contra faltas"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full transition-all cursor-pointer border hover:shadow-xs"
                        >
                          {client.shieldStatus === 'FREE' && (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Livre para Agendar</span>
                            </span>
                          )}
                          {client.shieldStatus === 'DEPOSIT_REQUIRED' && (
                            <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border-amber-200">
                              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                              <span>Exige Sinal de 50%</span>
                            </span>
                          )}
                          {client.shieldStatus === 'BLOCKED' && (
                            <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 border-rose-200">
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                              <span>Agendar via WhatsApp</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Ações Rápidas (CRUD COMPLETO) */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Ver Ficha / Histórico */}
                          <button
                            type="button"
                            onClick={() => setDetailsClient(client)}
                            title="Ver ficha e histórico do cliente"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Editar Cliente */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(client)}
                            title="Editar dados do cliente"
                            className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Chamar no WhatsApp */}
                          <a
                            href={getWhatsappUrl(client)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Conversar no WhatsApp com mensagem inteligente"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          {/* Botão Excluir Cliente */}
                          <button
                            type="button"
                            onClick={() => setDeleteClient(client)}
                            title="Remover cliente"
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL DE CADASTRO / EDIÇÃO DE CLIENTE (CRUD: CREATE & UPDATE) */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    {editingClient ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {editingClient ? 'Editar Cadastro do Cliente' : 'Novo Cliente'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {editingClient
                        ? 'Atualize os dados e preferências do cliente'
                        : 'Preencha as informações para cadastrar na base'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome Completo */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fernanda Lima"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium"
                    />
                  </div>

                  {/* Telefone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 11987654321"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium font-mono"
                    />
                  </div>

                  {/* E-mail */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-mail (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium"
                    />
                  </div>

                  {/* Data de Nascimento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium"
                    />
                  </div>

                  {/* Categoria / Tag Dinâmica */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Categoria / Tag
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingCustomTag(!isCreatingCustomTag);
                            setNewCustomTagInput('');
                          }}
                          className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                        >
                          {isCreatingCustomTag ? 'Voltar para lista' : '+ Criar nova'}
                        </button>
                        <a
                          href="/dashboard/configuracoes?tab=SCHEDULE"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-400 hover:text-purple-700 flex items-center gap-0.5"
                          title="Gerenciar lista completa em Configurações de Agendamento"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Configurações</span>
                        </a>
                      </div>
                    </div>

                    {isCreatingCustomTag ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Nome da categoria (ex: Noiva, Barba Terapia)"
                          value={newCustomTagInput}
                          onChange={(e) => setNewCustomTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCustomTag();
                            }
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-white border border-purple-400 rounded-xl outline-none focus:ring-2 focus:ring-purple-400/20 font-medium"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomTag}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreatingCustomTag(false)}
                          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <select
                        value={formData.tag}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setIsCreatingCustomTag(true);
                            setNewCustomTagInput('');
                          } else {
                            setFormData({ ...formData, tag: e.target.value });
                          }
                        }}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium"
                      >
                        {clientTags.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                        <option value="__NEW__">+ Criar nova categoria...</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Regra de Proteção contra Faltas */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Regra de Agendamento (Proteção contra Faltas)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shieldStatus: 'FREE' })}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        formData.shieldStatus === 'FREE'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Livre para Agendar</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        Agenda normalmente sem exigência de sinal.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shieldStatus: 'DEPOSIT_REQUIRED' })}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        formData.shieldStatus === 'DEPOSIT_REQUIRED'
                          ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                        <span>Exigir Sinal (50%)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        Exige sinal de 50% via PIX para garantir o horário.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shieldStatus: 'BLOCKED' })}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        formData.shieldStatus === 'BLOCKED'
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        <span>Via WhatsApp</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        Combina e confirma o horário diretamente no WhatsApp.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Ajustes de Histórico Rápido */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Total de Visitas
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.totalVisits}
                      onChange={(e) => setFormData({ ...formData, totalVisits: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Faltas sem Aviso
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.noShowCount}
                      onChange={(e) => setFormData({ ...formData, noShowCount: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Observações / Ficha Técnica */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observações & Preferências do Cliente
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Alergias, preferência de café, corte preferido, técnicas químicas..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium resize-none"
                  />
                </div>

                {/* Botões do Rodapé */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL DE FICHA COMPLETA DO CLIENTE (READ DETAILS) */}
      <AnimatePresence>
        {detailsClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6"
            >
              {/* Cabeçalho da Ficha */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
                    {detailsClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{detailsClient.name}</h2>
                      {detailsClient.tag && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                          {detailsClient.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="font-mono font-medium">{detailsClient.phone}</span>
                      {detailsClient.email && <span>• {detailsClient.email}</span>}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsClient(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Indicadores do Cliente */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Visitas</span>
                  <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                    {detailsClient.totalVisits}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Faltas sem Aviso</span>
                  <span
                    className={`text-lg font-bold font-mono mt-0.5 block ${
                      detailsClient.noShowCount > 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {detailsClient.noShowCount}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Aniversário</span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block">
                    {detailsClient.birthday ? formatBirthdayLabel(detailsClient.birthday) : 'Não informado'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Regra de Agendamento</span>
                  <span
                    className={`text-xs font-bold mt-1 block ${
                      detailsClient.shieldStatus === 'FREE'
                        ? 'text-emerald-700'
                        : detailsClient.shieldStatus === 'DEPOSIT_REQUIRED'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {detailsClient.shieldStatus === 'FREE'
                      ? 'Livre'
                      : detailsClient.shieldStatus === 'DEPOSIT_REQUIRED'
                      ? 'Sinal 50%'
                      : 'Via WhatsApp'}
                  </span>
                </div>
              </div>

              {/* Observações / Ficha de Preferências */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900 mb-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Observações & Preferências do Cliente</span>
                </div>
                <p className="text-xs text-purple-950 font-medium leading-relaxed">
                  {detailsClient.notes || 'Nenhuma observação técnica registrada para este cliente.'}
                </p>
              </div>

              {/* Histórico Recente de Atendimentos */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Histórico Recente de Atendimentos</span>
                </h3>
                {detailsClient.history && detailsClient.history.length > 0 ? (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {detailsClient.history.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 block">{item.service}</span>
                          <span className="text-[11px] text-slate-400">
                            {item.date} • Profissional: {item.professional}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-800">
                          {item.price > 0 ? `R$ ${item.price.toFixed(2)}` : 'Sem cobrança'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-center">
                    Nenhum histórico de agendamentos anterior registrado.
                  </p>
                )}
              </div>

              {/* Rodapé da Ficha */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <a
                  href={getWhatsappUrl(detailsClient)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Conversar no WhatsApp</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const c = detailsClient;
                      setDetailsClient(null);
                      handleOpenEditModal(c);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Cadastro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsClient(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (CRUD: DELETE) */}
      <AnimatePresence>
        {deleteClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h2 className="text-base font-bold text-slate-900">Excluir Cliente?</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Tem certeza que deseja remover o cliente{' '}
                <strong className="text-slate-800">{deleteClient.name}</strong>? Esta ação
                não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteClient(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-rose-600/20"
                >
                  Sim, Excluir Definitivamente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
