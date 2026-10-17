'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Check, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { InputMask } from '@/components/ui/InputMask';
import { BusinessNiche, ThemeTemplate } from '@marquesuahora/shared';
import { api } from '@/lib/api';

const NICHES = [
  { id: 'OTHER', label: 'Geral / Múltiplos Serviços', desc: 'Atendimentos diversos, beleza, bem-estar e múltiplos serviços' },
  { id: 'NAIL_LASH_STUDIO', label: 'Unhas & Cílios', desc: 'Alongamento em gel, fibra e lash design' },
  { id: 'BEAUTY_SALON', label: 'Salão de Beleza', desc: 'Cabelos, mechas, tratamentos e make' },
  { id: 'BARBERSHOP', label: 'Barbearia', desc: 'Cortes degradê, barboterapia e acabamentos' },
  { id: 'AESTHETICS_CLINIC', label: 'Clínica de Estética', desc: 'Limpeza de pele, corporal e facial' },
  { id: 'PERSONAL_TRAINER', label: 'Personal Trainer', desc: 'Treinamento presencial VIP e consultoria' }
];

const THEMES: Array<{
  id: ThemeTemplate;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}> = [
  { id: 'PURPLE_GOLD', name: 'Roxo Imperial & Ouro', primary: '#7C3AED', secondary: '#0B0F19', accent: '#D4AF37' },
  { id: 'ROSE_GOLD', name: 'Rose Gold & Estética', primary: '#EC4899', secondary: '#18181B', accent: '#F472B6' },
  { id: 'DARK_OBSIDIAN', name: 'Obsidiana Barber', primary: '#EAB308', secondary: '#09090B', accent: '#F59E0B' },
  { id: 'EMERALD_SAGE', name: 'Esmeralda & Spa', primary: '#10B981', secondary: '#064E3B', accent: '#34D399' },
  { id: 'MIDNIGHT_BLUE', name: 'Azul Meia-Noite', primary: '#3B82F6', secondary: '#0F172A', accent: '#60A5FA' }
];

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || 'SOLO';

  // Dados de Acesso
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

  // Dados do Estabelecimento
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [niche, setNiche] = useState<BusinessNiche>('OTHER');

  // Personalização
  const [themeTemplate, setThemeTemplate] = useState<ThemeTemplate>('PURPLE_GOLD');
  const [primaryColor, setPrimaryColor] = useState('#7C3AED');
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-gera slug limpo a partir do nome do estabelecimento
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generatedSlug);
  };

  const handleSelectTheme = (t: typeof THEMES[0]) => {
    setThemeTemplate(t.id);
    setPrimaryColor(t.primary);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('A logo deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim()) {
      setError('Informe o nome do estabelecimento e confirme o link.');
      return;
    }

    if (!ownerName.trim() || !ownerEmail.trim() || !ownerPassword.trim() || !phone.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);

    try {
      const selectedTheme = THEMES.find((t) => t.id === themeTemplate) || THEMES[0];

      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        niche,
        themeTemplate,
        primaryColor: selectedTheme.primary,
        secondaryColor: selectedTheme.secondary,
        accentColor: selectedTheme.accent,
        logoUrl: logoUrl || undefined,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword,
        phone,
        planId: planParam.toUpperCase()
      };

      const res = await api.post('/tenants/onboarding', payload);

      const { accessToken, user, tenant } = res.data;

      if (accessToken) {
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('user_data', JSON.stringify(user));
        if (tenant) {
          localStorage.setItem('tenant_name', tenant.name);
          localStorage.setItem('tenant_slug', tenant.slug);
          localStorage.setItem('tenant_niche', tenant.niche);
          if (tenant.themeTemplate) localStorage.setItem('tenant_theme_template', tenant.themeTemplate);
          if (selectedTheme.primary) localStorage.setItem('tenant_primary_color', selectedTheme.primary);
          if (tenant.logoUrl) localStorage.setItem('tenant_logo', tenant.logoUrl);
          localStorage.setItem('tenant_data', JSON.stringify(tenant));
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('marquesuahora_tenant_sync'));
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      setError(
        err?.response?.data?.message ||
        'Não foi possível concluir seu cadastro. Verifique os dados e tente novamente.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-black tracking-tight text-slate-900 font-display">
              Marque<span className="text-purple-600">SuaHora</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Crie sua conta profissional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Sem burocracias. Escolha seu nicho, personalize sua vitrine e comece a receber agendamentos.
          </p>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. SEÇÃO: DADOS DE ACESSO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                1. Seus Dados de Acesso
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ex: Emanuelle Telles"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp / Telefone de Contato *
                </label>
                <InputMask
                  mask="phone"
                  value={phone}
                  onChangeValue={(formatted, raw) => setPhone(raw)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu E-mail de Login *
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="contato@seuestudio.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Crie sua Senha *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md focus:outline-none transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SEÇÃO: DADOS DO ESTABELECIMENTO */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                2. Informações do Estabelecimento
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Espaço / Salão / Studio *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Emanuelle Telles Nails"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Link de Vitrine Exclusivo *
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 overflow-hidden focus-within:bg-white focus-within:border-purple-600">
                  <span className="pl-3 text-[11px] font-mono text-slate-400 select-none">
                    marquesuahora.com.br/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="meuestudio"
                    className="w-full py-2.5 pr-3 bg-transparent text-xs text-slate-800 outline-none font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Seletor de Nicho (Opcional) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Segmento ou Área de Atuação (Opcional)
                </label>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Opcional
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Não é obrigatório ter um nicho único. Selecione o segmento mais próximo ou mantenha Geral para múltiplos serviços.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {NICHES.map((n) => {
                  const isSelected = niche === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => setNiche(n.id as BusinessNiche)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-bold ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                          {n.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {n.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. SEÇÃO: PERSONALIZAÇÃO INICIAL */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                3. Personalização Visual da Vitrine
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Escolha o tema e as cores do seu espaço:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {THEMES.map((t) => {
                  const isSelected = themeTemplate === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTheme(t)}
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1.5">
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.primary }} />
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.accent }} />
                      </div>
                      <span className="text-[11px] font-bold block truncate text-slate-800">
                        {t.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logo Upload Opcional */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Logotipo da sua marca (Opcional)
              </label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden relative shrink-0">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                    LOGO
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                    <span>{logoUrl ? 'Alterar Logo' : 'Enviar Logo do Dispositivo'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Conclusão */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-600/30 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando seu espaço...</span>
                </>
              ) : (
                <>
                  <span>Criar Minha Conta e Acessar Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-500">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-purple-600 hover:underline font-bold">
                Fazer Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-xs font-semibold">Carregando formulário...</p>
        </div>
      }
    >
      <CadastroForm />
    </Suspense>
  );
}
