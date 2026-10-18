'use client';

import React, { useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building2,
  User,
  Mail,
  Phone,
  Search
} from 'lucide-react';
import { InputMask } from '@/components/ui/InputMask';
import { BusinessNiche, ThemeTemplate, onlyDigits } from '@marquesuahora/shared';
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

const STEPS = [
  { number: 1, title: 'Responsável', subtitle: 'Seus dados de acesso' },
  { number: 2, title: 'Estabelecimento & Endereço', subtitle: 'Nome, link e localização' },
  { number: 3, title: 'Identidade & Conclusão', subtitle: 'Tema visual e confirmação' }
];

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || 'FREE';

  const [currentStep, setCurrentStep] = useState(1);

  // Etapa 1: Dados do Responsável
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Etapa 2: Estabelecimento & Endereço
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [niche, setNiche] = useState<BusinessNiche | null>(null);

  // Endereço via CEP
  const [addressZip, setAddressZip] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [isSingleCityZip, setIsSingleCityZip] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepNotice, setCepNotice] = useState<string | null>(null);

  // Etapa 3: Identidade Visual
  const [themeTemplate, setThemeTemplate] = useState<ThemeTemplate>('PURPLE_GOLD');
  const [primaryColor, setPrimaryColor] = useState('#7C3AED');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Estados de Submissão e Sucesso
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTenantData, setCreatedTenantData] = useState<{ name: string; email: string; slug: string } | null>(null);

  // Estados de validação em tempo real (inline)
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isValidatingStep, setIsValidatingStep] = useState(false);

  // Verificação em tempo real de e-mail ao sair do campo
  const handleEmailBlur = async () => {
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) return;
    try {
      const res = await api.post('/tenants/check-availability', { email: ownerEmail.trim() });
      if (res.data?.emailAvailable === false) {
        setEmailError(res.data.emailMessage || 'Este e-mail já está em uso.');
      } else {
        setEmailError(null);
      }
    } catch {
      // ignore
    }
  };

  // Verificação em tempo real de WhatsApp ao sair do campo
  const handlePhoneBlur = async () => {
    const raw = onlyDigits(phone);
    if (raw.length < 10) return;
    try {
      const res = await api.post('/tenants/check-availability', { phone: raw });
      if (res.data?.phoneAvailable === false) {
        setPhoneError(res.data.phoneMessage || 'Este WhatsApp já está cadastrado.');
      } else {
        setPhoneError(null);
      }
    } catch {
      // ignore
    }
  };

  // Verificação em tempo real do Link/Slug da vitrine
  const handleSlugBlur = async () => {
    if (slug.trim().length < 3) return;
    try {
      const res = await api.post('/tenants/check-availability', { slug: slug.trim() });
      if (res.data?.slugAvailable === false) {
        setSlugError(res.data.slugMessage || 'Este link já está em uso.');
      } else {
        setSlugError(null);
      }
    } catch {
      // ignore
    }
  };

  // Auto-geração do slug limpo a partir do nome do estabelecimento
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
    if (slugError) setSlugError(null);
  };

  const handleSelectTheme = (t: (typeof THEMES)[0]) => {
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

  // Busca de Endereço via CEP com tratamento para CEP Único de município
  const handleSearchCep = useCallback(async (rawCep: string) => {
    const clean = onlyDigits(rawCep);
    if (clean.length !== 8) return;

    setLoadingCep(true);
    setCepNotice(null);
    setError(null);

    try {
      // 1. Tenta consulta pela API interna do sistema
      let data: any = null;
      try {
        const res = await api.get(`/lookup/cep/${clean}`);
        data = res.data;
      } catch {
        // Fallback direto via serviço aberto de CEP
        const fallbackRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const fallbackData = await fallbackRes.json();
        if (!fallbackData.erro) {
          data = {
            zip: clean,
            street: fallbackData.logradouro || '',
            neighborhood: fallbackData.bairro || '',
            city: fallbackData.localidade || '',
            state: fallbackData.uf || '',
            isSingleCityZip: !fallbackData.logradouro || fallbackData.logradouro.trim() === ''
          };
        }
      }

      if (data && data.city) {
        setAddressCity(data.city);
        setAddressState(data.state);

        const singleZip = Boolean(data.isSingleCityZip || !data.street || data.street.trim() === '');
        setIsSingleCityZip(singleZip);

        if (singleZip) {
          setAddressStreet(data.street || '');
          setAddressNeighborhood(data.neighborhood || '');
          setCepNotice(
            'Município com CEP geral único. Por favor, informe o nome do logradouro (rua/avenida) e o bairro.'
          );
        } else {
          setAddressStreet(data.street || '');
          setAddressNeighborhood(data.neighborhood || '');
          setCepNotice(null);
        }
      } else {
        setCepNotice('CEP não preenchido automaticamente. Você pode preencher os campos abaixo manualmente.');
      }
    } catch (err) {
      console.warn('Erro ao consultar CEP:', err);
      setCepNotice('Não foi possível autocompletar o CEP. Preencha os campos de endereço manualmente.');
    } finally {
      setLoadingCep(false);
    }
  }, []);

  // Validação para avanço de etapas com verificação de duplicidade na API
  const handleNextStep = async () => {
    setError(null);

    if (currentStep === 1) {
      if (!ownerName.trim()) {
        setError('Informe o seu nome completo.');
        return;
      }
      const rawPhone = onlyDigits(phone);
      if (rawPhone.length < 10) {
        setError('Informe um WhatsApp/telefone de contato válido com DDD.');
        return;
      }
      if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
        setError('Informe um endereço de e-mail de acesso válido.');
        return;
      }

      setIsValidatingStep(true);
      try {
        const res = await api.post('/tenants/check-availability', {
          email: ownerEmail.trim(),
          phone: rawPhone
        });

        if (res.data?.emailAvailable === false) {
          setEmailError(res.data.emailMessage || 'Este e-mail já está em uso.');
          setError(res.data.emailMessage || 'Este e-mail já está em uso na plataforma. Faça login ou utilize outro.');
          setIsValidatingStep(false);
          return;
        }

        if (res.data?.phoneAvailable === false) {
          setPhoneError(res.data.phoneMessage || 'Este WhatsApp já está cadastrado.');
          setError(res.data.phoneMessage || 'Este WhatsApp já está cadastrado em outro estabelecimento.');
          setIsValidatingStep(false);
          return;
        }
      } catch {
        // Se a rota falhar pontualmente, permite avançar
      } finally {
        setIsValidatingStep(false);
      }

      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!name.trim()) {
        setError('Informe o nome do estabelecimento.');
        return;
      }
      if (!slug.trim()) {
        setError('Informe o link exclusivo da vitrine.');
        return;
      }
      const rawZip = onlyDigits(addressZip);
      if (rawZip.length < 8) {
        setError('Informe um CEP válido com 8 dígitos.');
        return;
      }
      if (!addressStreet.trim()) {
        setError('Informe a rua / logradouro do estabelecimento.');
        return;
      }
      if (!addressNeighborhood.trim()) {
        setError('Informe o bairro do estabelecimento.');
        return;
      }
      if (!addressCity.trim() || !addressState.trim()) {
        setError('Informe a cidade e estado do estabelecimento.');
        return;
      }

      setIsValidatingStep(true);
      try {
        const res = await api.post('/tenants/check-availability', { slug: slug.trim() });
        if (res.data?.slugAvailable === false) {
          setSlugError(res.data.slugMessage || 'Este link já está em uso.');
          setError(res.data.slugMessage || 'Este link de vitrine já está em uso por outro espaço.');
          setIsValidatingStep(false);
          return;
        }
      } catch {
        // ignore
      } finally {
        setIsValidatingStep(false);
      }

      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Submissão Final do Cadastro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const selectedTheme = THEMES.find((t) => t.id === themeTemplate) || THEMES[0];

      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        niche: niche || undefined,
        addressZip: onlyDigits(addressZip),
        addressStreet: addressStreet.trim(),
        addressNumber: addressNumber.trim() || 'S/N',
        addressComplement: addressComplement.trim() || undefined,
        addressNeighborhood: addressNeighborhood.trim(),
        addressCity: addressCity.trim(),
        addressState: addressState.trim().toUpperCase(),
        isSingleCityZip,
        themeTemplate,
        primaryColor: selectedTheme.primary,
        secondaryColor: selectedTheme.secondary,
        accentColor: selectedTheme.accent,
        logoUrl: logoUrl || undefined,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        phone: onlyDigits(phone),
        planId: planParam.toUpperCase()
      };

      const res = await api.post('/tenants/onboarding', payload);

      setCreatedTenantData({
        name: name.trim(),
        email: ownerEmail.trim().toLowerCase(),
        slug: slug.trim().toLowerCase()
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      setError(
        err?.response?.data?.message ||
        'Não foi possível concluir seu cadastro. Verifique os dados e tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // TELA DE SUCESSO APÓS O CADASTRO
  if (isSuccess && createdTenantData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 sm:p-12 text-center space-y-6">
          <div className="flex justify-center">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                width={240}
                height={64}
                className="h-12 sm:h-14 w-auto object-contain mx-auto"
                priority
              />
            </Link>
          </div>

          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Cadastro Realizado com Sucesso
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              O espaço <strong>{createdTenantData.name}</strong> foi criado e sua vitrine exclusiva está pronta para uso na plataforma.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Link de Confirmação e Ativação Enviado
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enviamos uma mensagem para <strong>{createdTenantData.email}</strong> com o link seguro para você confirmar sua conta e definir sua senha definitiva.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Link da sua vitrine:</span>
              <a
                href={`/${createdTenantData.slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-purple-700 hover:text-purple-900 font-bold hover:underline"
              >
                marquesuahora.com.br/{createdTenantData.slug}
              </a>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ir para a Página de Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors text-center"
            >
              Página Inicial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-4 sm:py-6 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-3.5">
        {/* Cabeçalho com Logo Oficial Sem Fundo */}
        <div className="text-center space-y-2 mb-1">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <Image
              src="/brand/logooficial-semfundo.png"
              alt="Marque Sua Hora"
              width={260}
              height={70}
              className="h-12 sm:h-14 w-auto object-contain mx-auto"
              priority
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Crie sua conta profissional
          </h1>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Configuração rápida em 3 etapas para você começar a receber agendamentos.
          </p>
        </div>

        {/* Indicador de Etapas (Wizard Progress Compacto) */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-1.5 sm:p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {STEPS.map((s) => {
              const isActive = currentStep === s.number;
              const isDone = currentStep > s.number;

              return (
                <div
                  key={s.number}
                  className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-purple-50/80 border border-purple-200'
                      : isDone
                      ? 'bg-slate-50 border border-slate-200'
                      : 'opacity-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </div>
                  <div className="hidden sm:block text-left overflow-hidden">
                    <span className="text-xs font-bold block truncate text-slate-900 leading-tight">
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate leading-tight">
                      {s.subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Principal do Formulário */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ETAPA 1: DADOS DO RESPONSÁVEL & ACESSO */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Dados do Responsável
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome Completo do Responsável *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp / Telefone de Contato *
                    </label>
                    <InputMask
                      mask="phone"
                      value={phone}
                      onChangeValue={(_formatted, raw) => {
                        setPhone(raw);
                        if (phoneError) setPhoneError(null);
                      }}
                      onBlur={handlePhoneBlur}
                      required
                      className={`w-full px-3 py-2 rounded-lg bg-slate-50 border ${
                        phoneError ? '!border-rose-500 focus:!border-rose-600' : 'border-slate-200 focus:border-purple-600'
                      } text-xs text-slate-800 focus:bg-white outline-none transition-all font-medium`}
                    />
                    {phoneError ? (
                      <span className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {phoneError}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Usado para o suporte e notificações do espaço.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail Profissional de Acesso *
                    </label>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => {
                        setOwnerEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      onBlur={handleEmailBlur}
                      className={`w-full px-3 py-2 rounded-lg bg-slate-50 border ${
                        emailError ? 'border-rose-500 focus:border-rose-600' : 'border-slate-200 focus:border-purple-600'
                      } text-xs text-slate-800 focus:bg-white outline-none transition-all font-medium`}
                    />
                    {emailError ? (
                      <span className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {emailError}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Seu login de acesso ao painel do estabelecimento.
                      </span>
                    )}
                  </div>
                </div>

                {/* Box de Notificação sobre a Senha */}
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-purple-950 block text-xs">
                      Acesso Seguro e Ativação por E-mail
                    </span>
                    <p className="text-purple-900/80 leading-relaxed text-[11px]">
                      Você não precisa definir a senha agora. Ao concluir este cadastro, um link de ativação será enviado para o seu e-mail para você criar sua senha definitiva com total segurança.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href="/login"
                    className="text-xs text-slate-500 hover:text-purple-600 font-semibold transition-colors"
                  >
                    Já tenho conta na plataforma
                  </Link>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isValidatingStep}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isValidatingStep ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando dados...</span>
                      </>
                    ) : (
                      <>
                        <span>Avançar para Estabelecimento e Endereço</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 2: ESTABELECIMENTO & ENDEREÇO VIA CEP */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Dados do Espaço & Localização
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Espaço / Salão / Studio *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link Exclusivo da Vitrine Pública *
                    </label>
                    <div className={`flex items-center rounded-lg bg-slate-50 border ${
                      slugError ? 'border-rose-500 focus-within:border-rose-600' : 'border-slate-200 focus-within:border-purple-600'
                    } overflow-hidden focus-within:bg-white`}>
                      <span className="pl-3 text-[11px] font-mono text-slate-400 select-none">
                        marquesuahora.com.br/
                      </span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => {
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                          if (slugError) setSlugError(null);
                        }}
                        onBlur={handleSlugBlur}
                        className="w-full py-2 pr-3 bg-transparent text-xs text-slate-900 outline-none font-mono font-bold"
                      />
                    </div>
                    {slugError && (
                      <span className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {slugError}
                      </span>
                    )}
                  </div>
                </div>

                {/* Seletor de Nicho (Sem Default, Layout Compacto) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Segmento de Atuação (Opcional)
                    </label>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      Opcional
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {NICHES.map((n) => {
                      const isSelected = niche === n.id;
                      return (
                        <div
                          key={n.id}
                          onClick={() => setNiche((prev) => (prev === n.id ? null : (n.id as BusinessNiche)))}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/80 shadow-xs ring-1 ring-purple-600/30'
                              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                              {n.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">
                            {n.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SEÇÃO DO ENDEREÇO VIA CEP */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Endereço do Estabelecimento
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CEP *
                      </label>
                      <div className="relative">
                        <InputMask
                          mask="cep"
                          value={addressZip}
                          onChangeValue={(_formatted, raw) => {
                            setAddressZip(raw);
                            if (raw.length === 8) {
                              handleSearchCep(raw);
                            }
                          }}
                          onComplete={(raw) => handleSearchCep(raw)}
                          required
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                        />
                        {loadingCep && (
                          <div className="absolute right-2.5 top-2.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rua / Avenida / Logradouro *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Aviso de CEP Único de Município */}
                  {cepNotice && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>{cepNotice}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Número *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Complemento (Opcional)
                      </label>
                      <input
                        type="text"
                        value={addressComplement}
                        onChange={(e) => setAddressComplement(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bairro *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressNeighborhood}
                        onChange={(e) => setAddressNeighborhood(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cidade / UF *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
                        />
                        <input
                          type="text"
                          required
                          maxLength={2}
                          value={addressState}
                          onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                          className="w-12 px-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-none transition-all font-mono text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isValidatingStep}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isValidatingStep ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando link...</span>
                      </>
                    ) : (
                      <>
                        <span>Avançar para Identidade Visual</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 3: IDENTIDADE VISUAL & CONFIRMAÇÃO */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Identidade da Vitrine & Confirmação
                  </h2>
                </div>

                {/* Seleção do Tema */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Escolha a paleta de cores para a sua vitrine:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {THEMES.map((t) => {
                      const isSelected = themeTemplate === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTheme(t)}
                          className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: t.primary }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: t.accent }} />
                          </div>
                          <span className="text-[10px] font-bold block truncate text-slate-800">
                            {t.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upload de Logotipo Opcional */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Logotipo do Estabelecimento (Opcional)
                  </label>
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden relative shrink-0">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] font-bold shrink-0">
                        LOGO
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                        <span>{logoUrl ? 'Trocar Logo' : 'Enviar Imagem'}</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card de Resumo das Informações */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1">
                    Resumo do Cadastro
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Responsável:</span>
                      <strong>{ownerName}</strong> ({ownerEmail})
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Contato:</span>
                      <strong>{phone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Estabelecimento:</span>
                      <strong>{name}</strong> (marquesuahora.com.br/{slug})
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Endereço:</span>
                      <span>{addressStreet}, {addressNumber} - {addressNeighborhood}, {addressCity}/{addressState}</span>
                    </div>
                  </div>
                </div>

                {/* Botões Finais de Envio */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-md shadow-purple-600/30 hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Criando Estabelecimento...</span>
                      </>
                    ) : (
                      <>
                        <span>Concluir Cadastro</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </div>
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
