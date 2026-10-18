'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  Plus,
  Phone,
  Percent,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  Clock,
  Camera,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  CreditCard,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InputMask } from '@/components/ui/InputMask';

export interface ProfessionalMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  avatarUrl?: string;
  color: string;
  commissionPercentage: number;
  specialties: string[];
  workDays: string[];
  workHoursStart: string;
  workHoursEnd: string;
  isActive: boolean;
}

interface NicheConfig {
  nicheLabel: string;
  roleSuggestions: string[];
  specialtySuggestions: string[];
}

const WEEK_DAYS = [
  { id: 'Seg', label: 'Seg' },
  { id: 'Ter', label: 'Ter' },
  { id: 'Qua', label: 'Qua' },
  { id: 'Qui', label: 'Qui' },
  { id: 'Sex', label: 'Sex' },
  { id: 'Sáb', label: 'Sáb' },
  { id: 'Dom', label: 'Dom' }
];

const PRESET_COLORS = [
  '#7C3AED', // Roxo Imperial
  '#2563EB', // Azul Safira
  '#059669', // Esmeralda
  '#D97706', // Âmbar Gold
  '#DC2626', // Rubi
  '#EC4899', // Pink Glam
  '#0D9488', // Teal
  '#1E293B'  // Dark Obsidian
];

const NICHE_CONFIGS: Record<string, NicheConfig> = {
  BEAUTY_SALON: {
    nicheLabel: 'Salão de Beleza',
    roleSuggestions: [
      'Master Colorista & Terapeuta Capilar',
      'Visagista & Especialista em Cortes',
      'Especialista em Escovas & Tratamentos',
      'Colorista Assistente',
      'Terapeuta Capilar & Tricologia'
    ],
    specialtySuggestions: [
      'Mechas & Luzes',
      'Coloração Global',
      'Corte Feminino',
      'Escova Modelada',
      'Terapia Capilar',
      'Cronograma Capilar',
      'Penteado de Noiva',
      'Botox Capilar'
    ]
  },

  BARBERSHOP: {
    nicheLabel: 'Barbearia',
    roleSuggestions: [
      'Master Barber & Visagista',
      'Especialista em Degradê & Navalhado',
      'Barbeiro Clássico & Barboterapia',
      'Barbeiro Especialista em Barba Terapia'
    ],
    specialtySuggestions: [
      'Degradê / Fade',
      'Corte Clássico na Tesoura',
      'Barboterapia com Toalha Quente',
      'Platinado / Nevou',
      'Pigmentação de Barba',
      'Alinhamento de Fios'
    ]
  },

  NAIL_LASH_STUDIO: {
    nicheLabel: 'Unhas & Cílios',
    roleSuggestions: [
      'Master Lash Designer',
      'Nail Designer Especialista em Gel & Fibra',
      'Designer de Sobrancelhas & Micropigmentação',
      'Manicure & Pedicure Spa'
    ],
    specialtySuggestions: [
      'Volume Russo',
      'Lash Lifting',
      'Volume Brasileiro',
      'Alongamento em Gel',
      'Fibra de Vidro',
      'Blindagem de Unhas',
      'Spa dos Pés',
      'Nail Art'
    ]
  },

  AESTHETICS_CLINIC: {
    nicheLabel: 'Clínica de Estética',
    roleSuggestions: [
      'Biomédica Esteta',
      'Esteticista Facial & Corporal',
      'Massoterapeuta & Drenagem',
      'Fisioterapeuta Dermato-Funcional'
    ],
    specialtySuggestions: [
      'Harmonização Facial',
      'Limpeza de Pele Profunda',
      'Drenagem Linfática Pós-Operatório',
      'Massagem Modeladora',
      'Peeling de Diamante',
      'Microagulhamento'
    ]
  },

  PERSONAL_TRAINER: {
    nicheLabel: 'Personal Trainer',
    roleSuggestions: [
      'Personal Trainer & Fisiologista',
      'Treinadora & Especialista em Mobilidade',
      'Treinador de Hipertrofia & Força',
      'Coach de Reabilitação Postural'
    ],
    specialtySuggestions: [
      'Hipertrofia & Ganho de Massa',
      'Emagrecimento & Definição',
      'Treinamento Funcional VIP',
      'Pilates Solo & Mobilidade',
      'Reabilitação Postural'
    ]
  }
};

const DAY_MAP_TO_KEY: Record<string, string> = {
  Seg: 'mon',
  Ter: 'tue',
  Qua: 'wed',
  Qui: 'thu',
  Sex: 'fri',
  Sáb: 'sat',
  Dom: 'sun'
};

const KEY_TO_DAY_MAP: Record<string, string> = {
  mon: 'Seg',
  tue: 'Ter',
  wed: 'Qua',
  thu: 'Qui',
  fri: 'Sex',
  sat: 'Sáb',
  sun: 'Dom'
};

function buildScheduleConfig(days: string[], start: string, end: string) {
  const cfg: Record<string, any> = {};
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((k) => {
    const dayLabel = KEY_TO_DAY_MAP[k];
    if (days.includes(dayLabel)) {
      cfg[k] = { start: start || '09:00', end: end || '19:00' };
    } else {
      cfg[k] = { isOff: true };
    }
  });
  return cfg;
}

function parseScheduleConfig(cfg: any) {
  const days: string[] = [];
  let start = '09:00';
  let end = '19:00';
  if (cfg && typeof cfg === 'object') {
    Object.entries(cfg).forEach(([k, v]: [string, any]) => {
      if (v && !v.isOff && KEY_TO_DAY_MAP[k]) {
        days.push(KEY_TO_DAY_MAP[k]);
        if (v.start) start = v.start;
        if (v.end) end = v.end;
      }
    });
  }
  return {
    days: days.length > 0 ? days : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    start,
    end
  };
}

export default function DashboardEquipePage() {
  const [currentNiche, setCurrentNiche] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_niche') || 'NAIL_LASH_STUDIO';
    }
    return 'NAIL_LASH_STUDIO';
  });
  const [team, setTeam] = useState<ProfessionalMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProfessionalMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalMember | null>(null);

  // Limites do Plano Ativo
  const [tenantPlanCode, setTenantPlanCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('marquesuahora_tenant_plan_code') || 'VIP_PRO';
    }
    return 'VIP_PRO';
  });
  const [tenantPlanName, setTenantPlanName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('marquesuahora_tenant_plan_name') || 'Império VIP & IA';
    }
    return 'Império VIP & IA';
  });
  const [maxProfessionals, setMaxProfessionals] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('marquesuahora_tenant_max_prof');
      if (saved) return Number(saved);
    }
    return 10;
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [color, setColor] = useState('#7C3AED');
  const [commission, setCommission] = useState('50');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState('');
  const [selectedWorkDays, setSelectedWorkDays] = useState<string[]>(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
  const [workHoursStart, setWorkHoursStart] = useState('09:00');
  const [workHoursEnd, setWorkHoursEnd] = useState('19:00');
  const [isActiveForm, setIsActiveForm] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega profissionais e dados do tenant diretamente do PostgreSQL
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const [tenantRes, profRes] = await Promise.all([
        api.get('/tenants/me').catch(() => null),
        api.get('/professionals').catch(() => ({ data: [] }))
      ]);

      if (tenantRes?.data) {
        const t = tenantRes.data;
        if (t.niche && NICHE_CONFIGS[t.niche]) {
          setCurrentNiche(t.niche);
        }
        if (t.plan) {
          setTenantPlanCode(t.plan.code);
          setTenantPlanName(t.plan.name);
          setMaxProfessionals(t.plan.maxProfessionals || 1);
          localStorage.setItem('marquesuahora_tenant_plan_code', t.plan.code);
          localStorage.setItem('marquesuahora_tenant_plan_name', t.plan.name);
          localStorage.setItem('marquesuahora_tenant_max_prof', String(t.plan.maxProfessionals || 1));
        } else if (t.usage) {
          setMaxProfessionals(t.usage.maxProfessionals || 1);
        }
      }

      const rawList = profRes.data || [];
      const formatted: ProfessionalMember[] = rawList.map((p: any) => {
        const schedule = parseScheduleConfig(p.scheduleConfig);
        const specialties = (p.services || [])
          .map((sp: any) => sp.service?.name)
          .filter(Boolean);

        return {
          id: p.id,
          name: p.name,
          role: p.role || '',
          phone: p.phone || '',
          avatarUrl: p.avatarUrl || '',
          color: p.color || '#7C3AED',
          commissionPercentage: Number(p.commissionRate) || 50,
          specialties,
          workDays: schedule.days,
          workHoursStart: schedule.start,
          workHoursEnd: schedule.end,
          isActive: p.isActive
        };
      });

      setTeam(formatted);
    } catch (err) {
      console.error('Erro ao buscar equipe:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Revalidação Automática Inteligente em Segundo Plano (30s e foco na janela)
  useEffect(() => {
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
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
  }, [fetchData]);

  const currentConfig = NICHE_CONFIGS[currentNiche] || NICHE_CONFIGS.BEAUTY_SALON;

  const handleOpenCreate = () => {
    // Bloqueia caso atinja o limite do plano contratado
    if (team.length >= maxProfessionals) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setEditingMember(null);
    setName('');
    setRole(currentConfig.roleSuggestions[0] || '');
    setPhone('');
    setAvatarUrl('');
    setColor(PRESET_COLORS[0]);
    setCommission('50');
    setSelectedSpecialties(currentConfig.specialtySuggestions.slice(0, 3));
    setCustomSpecialtyInput('');
    setSelectedWorkDays(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    setWorkHoursStart('09:00');
    setWorkHoursEnd('19:00');
    setIsActiveForm(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: ProfessionalMember) => {
    setEditingMember(m);
    setName(m.name);
    setRole(m.role || '');
    setPhone(m.phone || '');
    setAvatarUrl(m.avatarUrl || '');
    setColor(m.color || PRESET_COLORS[0]);
    setCommission(String(m.commissionPercentage));
    setSelectedSpecialties(m.specialties || []);
    setCustomSpecialtyInput('');
    setSelectedWorkDays(m.workDays || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    setWorkHoursStart(m.workHoursStart || '09:00');
    setWorkHoursEnd(m.workHoursEnd || '19:00');
    setIsActiveForm(m.isActive);
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSpecialty = (item: string) => {
    if (selectedSpecialties.includes(item)) {
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== item));
    } else {
      setSelectedSpecialties([...selectedSpecialties, item]);
    }
  };

  const handleAddCustomSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customSpecialtyInput.trim();
    if (!val) return;
    if (!selectedSpecialties.includes(val)) {
      setSelectedSpecialties([...selectedSpecialties, val]);
    }
    setCustomSpecialtyInput('');
  };

  const toggleWorkDay = (dayId: string) => {
    if (selectedWorkDays.includes(dayId)) {
      if (selectedWorkDays.length === 1) return; // mantém pelo menos 1 dia
      setSelectedWorkDays(selectedWorkDays.filter((d) => d !== dayId));
    } else {
      setSelectedWorkDays([...selectedWorkDays, dayId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCommission = Math.min(100, Math.max(0, Number(commission) || 0));
    setSaving(true);

    try {
      const payload = {
        name,
        role: role || undefined,
        phone,
        avatarUrl: avatarUrl || undefined,
        color,
        commissionRate: parsedCommission,
        isActive: isActiveForm,
        scheduleConfig: buildScheduleConfig(selectedWorkDays, workHoursStart, workHoursEnd)
      };

      if (editingMember) {
        await api.put(`/professionals/${editingMember.id}`, payload);
      } else {
        await api.post('/professionals', payload);
      }

      setIsModalOpen(false);
      fetchData();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Falha ao salvar colaborador.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: ProfessionalMember) => {
    try {
      await api.put(`/professionals/${member.id}`, { isActive: !member.isActive });
      fetchData();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch {
      alert('Erro ao alterar status do profissional.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/professionals/${deleteTarget.id}`);
      if (res.data?.action === 'DEACTIVATED') {
        alert(res.data.message);
      }
      setDeleteTarget(null);
      fetchData();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Falha ao remover colaborador.');
    }
  };

  // Coleta lista única de todas as especialidades presentes no time atual
  const allCurrentSpecialties = Array.from(
    new Set(team.flatMap((m) => m.specialties || []))
  );

  // Filtragem
  const filteredTeam = team.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.specialties || []).some((s) =>
        s.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? member.isActive
        : !member.isActive;

    const matchesSpecialty =
      specialtyFilter === 'ALL'
        ? true
        : (member.specialties || []).includes(specialtyFilter);

    return matchesSearch && matchesStatus && matchesSpecialty;
  });

  // Métricas
  const totalCount = team.length;
  const activeCount = team.filter((m) => m.isActive).length;
  const pausedCount = totalCount - activeCount;
  const avgCommission =
    totalCount > 0
      ? Math.round(
          team.reduce((acc, curr) => acc + curr.commissionPercentage, 0) / totalCount
        )
      : 0;

  if (loading) {
    return (
      <div className="w-full py-24 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
        <p className="text-xs font-semibold text-slate-600">Carregando colaboradores da sua equipe...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Barra de Contexto do Nicho e Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Cota de Colaboradores
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-slate-900">
                {totalCount} <span className="text-xs text-slate-400 font-normal">/ {maxProfessionals} max</span>
              </span>
              <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
                {tenantPlanName}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Ativos na Agenda & Vitrine
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-emerald-600">{activeCount}</span>
              <span className="text-xs text-slate-400">colaboradores</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Média de Repasse
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-slate-900">{avgCommission}%</span>
              <span className="text-xs text-slate-400">comissão média</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Status da Equipe
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-slate-800">
                {pausedCount > 0 ? `${pausedCount} em pausa` : '100% ativos'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Ação de Cadastro */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="INACTIVE">Apenas em Pausa</option>
            </select>

            {allCurrentSpecialties.length > 0 && (
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 cursor-pointer max-w-[160px] truncate"
              >
                <option value="ALL">Todas Especialidades</option>
                {allCurrentSpecialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 btn-primary-tenant rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Profissional</span>
        </button>
      </div>

      {/* Grid de Cards dos Profissionais */}
      {filteredTeam.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl font-bold">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Nenhum profissional encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos colaboradores com os filtros selecionados para o catálogo de{' '}
            {currentConfig.nicheLabel}.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Primeiro Profissional</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeam.map((member) => {
            const rawPhone = (member.phone || '').replace(/\D/g, '');
            const whatsappLink = rawPhone ? `https://wa.me/55${rawPhone}` : null;

            return (
              <div
                key={member.id}
                className={`p-5 rounded-3xl bg-white border transition-all flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  member.isActive
                    ? 'border-slate-200/90 hover:border-purple-300'
                    : 'border-slate-200/60 opacity-80 bg-slate-50/40'
                }`}
              >
                <div className="space-y-4">
                  {/* Topo do Card: Foto do Profissional, Identificação e Status */}
                  <div className="flex items-start gap-3.5">
                    {/* Foto com indicador de cor da agenda */}
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <span
                            className="text-base font-bold text-white w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: member.color || '#7C3AED' }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Dot com a cor da agenda do profissional */}
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-2xs"
                        style={{ backgroundColor: member.color || '#7C3AED' }}
                        title={`Cor na agenda: ${member.color}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {member.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                            member.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {member.isActive ? 'Ativo' : 'Em Pausa'}
                        </span>
                      </div>

                      <span className="text-[11px] font-semibold text-purple-700 block truncate mt-0.5">
                        {member.role || 'Especialista'}
                      </span>

                      {/* WhatsApp Formatado com Link */}
                      {member.phone && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-mono">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {whatsappLink ? (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-emerald-600 hover:underline transition-colors flex items-center gap-1 truncate"
                              title="Abrir WhatsApp"
                            >
                              <span>{member.phone}</span>
                            </a>
                          ) : (
                            <span className="truncate">{member.phone}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Especialidades / Tags do Profissional */}
                  {member.specialties && member.specialties.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Especialidades & Atendimentos
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {member.specialties.map((spec, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-slate-100/90 text-slate-700 text-[11px] font-medium border border-slate-200/60"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Informações de Trabalho e Escala */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-purple-600" />
                        <span>Comissão / Repasse:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {member.commissionPercentage}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {member.workHoursStart || '09:00'} às {member.workHoursEnd || '19:00'}
                        </span>
                      </span>
                      <div className="flex items-center gap-0.5">
                        {(member.workDays || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']).map(
                          (d) => (
                            <span
                              key={d}
                              className="text-[9px] font-bold px-1 rounded bg-slate-200/70 text-slate-700"
                            >
                              {d}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações do Card */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(member)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      member.isActive
                        ? 'text-slate-600 hover:bg-slate-100'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {member.isActive ? 'Pausar Atendimentos' : 'Ativar na Agenda'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(member)}
                      className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                      title="Editar dados e foto"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(member)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remover profissional"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição do Profissional */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-100 my-8 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-md">
                  Membro da Equipe
                </span>
                <h3 className="text-xl font-display font-bold text-slate-900 mt-2">
                  {editingMember ? 'Editar Profissional' : 'Novo Colaborador da Equipe'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cadastre o perfil, comissão, cor na agenda e especialidades atendidas.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Upload e Preview da Foto do Profissional */}
                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/70 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-purple-200 shadow-sm flex items-center justify-center">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Preview do Profissional"
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-bold text-white text-xl"
                          style={{ backgroundColor: color }}
                        >
                          {name ? name.charAt(0).toUpperCase() : <Camera className="w-6 h-6 text-purple-300" />}
                        </div>
                      )}
                    </div>
                    {/* Botão de câmera na foto */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                      title="Alterar foto"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1.5 flex-1 text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-800 block">
                      Foto do Profissional
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Fotos reais aumentam a confiança dos clientes na vitrine pública.
                    </p>
                    <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{avatarUrl ? 'Trocar Foto' : 'Enviar do Dispositivo'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-2.5 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dados Principais: Nome e Cargo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cargo / Função no Estabelecimento *
                    </label>
                    <input
                      type="text"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-medium"
                    />

                    {/* Sugestões rápidas de cargo para o nicho */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        Sugestões:
                      </span>
                      {currentConfig.roleSuggestions.slice(0, 3).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition-colors cursor-pointer"
                        >
                          + {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      WhatsApp Comercial *
                    </label>
                    <InputMask
                      mask="phone"
                      value={phone}
                      onChangeValue={(val) => setPhone(val)}
                      required
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-semibold font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Comissão do Profissional (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={0}
                        max={100}
                        value={commission}
                        onChange={(e) => setCommission(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all font-semibold font-mono"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cor na Agenda e Identidade */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Cor na Grade de Horários (Agenda)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          color === c ? 'ring-2 ring-purple-600 ring-offset-2 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2 border border-slate-200 rounded-xl px-2 py-1 bg-slate-50">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                      />
                      <span className="text-[11px] font-mono text-slate-600 font-semibold">{color}</span>
                    </div>
                  </div>
                </div>

                {/* Especialidades e Procedimentos */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Especialidades & Serviços
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Clique para marcar/desmarcar
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentConfig.specialtySuggestions.map((item) => {
                      const isSelected = selectedSpecialties.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleSpecialty(item)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  {/* Adicionar especialidade avulsa */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={customSpecialtyInput}
                      onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSpecialty}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Dias de Atendimento e Horários */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Escala de Atendimento na Agenda
                  </label>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                      Dias de Trabalho na Semana:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {WEEK_DAYS.map((d) => {
                        const isSelected = selectedWorkDays.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleWorkDay(d.id)}
                            className={`w-9 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Horário de Início
                      </span>
                      <input
                        type="time"
                        value={workHoursStart}
                        onChange={(e) => setWorkHoursStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Horário de Término
                      </span>
                      <input
                        type="time"
                        value={workHoursEnd}
                        onChange={(e) => setWorkHoursEnd(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Ativo */}
                <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActiveForm}
                    onChange={(e) => setIsActiveForm(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Profissional Ativo para Agendamento
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Disponível na vitrine online dos clientes e na agenda interna da recepção.
                    </span>
                  </div>
                </label>

                {/* Botões do Rodapé */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingMember ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remover Colaborador da Equipe?"
        description={`Tem certeza que deseja remover ${deleteTarget?.name}? O histórico financeiro, comissões acumuladas e atendimentos passados continuarão preservados no sistema.`}
        confirmLabel="Sim, Remover"
        cancelLabel="Voltar"
        isDestructive={true}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Modal de Limite Atingido & Upgrade de Plano */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpgradeModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-200 text-center"
            >
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-display font-bold text-slate-900">
                Limite de Colaboradores Atingido
              </h3>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                O seu espaço está no plano <strong className="text-slate-900">{tenantPlanName}</strong>, que permite o cadastro de até <strong className="text-slate-900">{maxProfessionals} profissional(is)</strong> ({totalCount}/{maxProfessionals} em uso).
              </p>

              <div className="mt-4 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/60 text-left text-xs text-purple-900 space-y-1">
                <span className="font-bold block text-purple-950">Por que fazer upgrade?</span>
                <p className="text-[11px] text-purple-800">
                  Planos superiores liberam mais profissionais simultâneos na agenda, comissões automatizadas e recursos avançados para o seu negócio crescer.
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="w-full sm:w-1/2 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Voltar
                </button>
                <Link
                  href="/dashboard/planos"
                  className="w-full sm:w-1/2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Ver Planos</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
