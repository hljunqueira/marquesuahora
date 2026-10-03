'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  MapPin,
  Scissors,
  Palette,
  Loader2,
  AlertCircle,
  Upload,
  Camera
} from 'lucide-react';
import { InputMask } from '@/components/ui/InputMask';
import { BusinessNiche, ThemeTemplate } from '@marquesuahora/shared';

const nichesList = [
  { id: 'BARBERSHOP', label: 'Barbearia', icon: '💈', desc: 'Cortes, barboterapia e acabamentos' },
  { id: 'BEAUTY_SALON', label: 'Salão de Beleza', icon: '💇‍♀️', desc: 'Cabelo, maquiagem e químicas' },
  { id: 'AESTHETICS_CLINIC', label: 'Clínica de Estética', icon: '🧴', desc: 'Procedimentos faciais e corporais' },
  { id: 'PERSONAL_TRAINER', label: 'Personal Trainer', icon: '🏋️', desc: 'Treinamento VIP e consultoria' },
  { id: 'NAIL_LASH_STUDIO', label: 'Unhas & Cílios', icon: '💅', desc: 'Extensões, lash lifting e esmaltação' },
  { id: 'OTHER', label: 'Outro Estabelecimento', icon: '✨', desc: 'Saúde, massoterapia ou bem-estar' }
];

const themesList: Array<{ id: ThemeTemplate; name: string; primary: string; secondary: string; accent: string; previewClass: string }> = [
  { id: 'PURPLE_GOLD', name: 'Roxo Imperial & Ouro Champagne', primary: '#7C3AED', secondary: '#0F172A', accent: '#D4AF37', previewClass: 'from-purple-900 via-slate-900 to-amber-700' },
  { id: 'DARK_OBSIDIAN', name: 'Dark Obsidian & Grafite', primary: '#0B0F19', secondary: '#F8FAFC', accent: '#64748B', previewClass: 'from-slate-950 via-slate-900 to-slate-800' },
  { id: 'ROSE_GOLD', name: 'Rose Gold & Nude Estético', primary: '#C07A65', secondary: '#FAF7F5', accent: '#FDF2F8', previewClass: 'from-rose-900 via-stone-900 to-amber-800' },
  { id: 'EMERALD_SAGE', name: 'Verde Esmeralda & Sage', primary: '#047857', secondary: '#F0FDF4', accent: '#A7F3D0', previewClass: 'from-emerald-950 via-slate-900 to-teal-800' },
  { id: 'MIDNIGHT_BLUE', name: 'Azul Meia-Noite & Safira', primary: '#2563EB', secondary: '#030712', accent: '#93C5FD', previewClass: 'from-blue-950 via-slate-900 to-indigo-900' }
];

const defaultServicesByNiche: Record<string, Array<{ name: string; price: number; durationMinutes: number; category: string }>> = {
  BARBERSHOP: [
    { name: 'Corte Cabelo Degradê', price: 45, durationMinutes: 30, category: 'Cabelo' },
    { name: 'Barboterapia & Toalha Quente', price: 40, durationMinutes: 30, category: 'Barba' },
    { name: 'Combo Cabelo + Barba', price: 75, durationMinutes: 50, category: 'Combos' }
  ],
  BEAUTY_SALON: [
    { name: 'Escova Modelada', price: 70, durationMinutes: 45, category: 'Cabelo' },
    { name: 'Corte Feminino com Finalização', price: 90, durationMinutes: 50, category: 'Cabelo' },
    { name: 'Hidratação Profunda', price: 120, durationMinutes: 40, category: 'Tratamentos' }
  ],
  AESTHETICS_CLINIC: [
    { name: 'Limpeza de Pele Profunda', price: 150, durationMinutes: 60, category: 'Facial' },
    { name: 'Drenagem Linfática Corporal', price: 130, durationMinutes: 50, category: 'Corporal' },
    { name: 'Avaliação Estética Facial', price: 50, durationMinutes: 30, category: 'Avaliação' }
  ],
  PERSONAL_TRAINER: [
    { name: 'Sessão de Treino Presencial 1h', price: 100, durationMinutes: 60, category: 'Treinos' },
    { name: 'Avaliação Física & Bioimpedância', price: 120, durationMinutes: 45, category: 'Avaliação' }
  ],
  NAIL_LASH_STUDIO: [
    { name: 'Extensão de Cílios Volume Russo', price: 180, durationMinutes: 90, category: 'Cílios' },
    { name: 'Manutenção de Cílios (até 20 dias)', price: 110, durationMinutes: 60, category: 'Cílios' },
    { name: 'Alongamento de Unhas em Gel', price: 140, durationMinutes: 80, category: 'Unhas' }
  ],
  OTHER: [
    { name: 'Atendimento Personalizado', price: 100, durationMinutes: 60, category: 'Geral' }
  ]
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dados do Formulário
  const [niche, setNiche] = useState<BusinessNiche>('BARBERSHOP');
  const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [documentNumber, setDocumentNumber] = useState('');
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  // Endereço
  const [addressZip, setAddressZip] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [isSingleCityZip, setIsSingleCityZip] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);

  // Serviços selecionados (com autonomia total de preços e durações)
  const [services, setServices] = useState<Array<{ name: string; price: number; durationMinutes: number; category: string; selected: boolean }>>([]);

  // Identidade Visual e Usuário
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [themeTemplate, setThemeTemplate] = useState<ThemeTemplate>('PURPLE_GOLD');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('O arquivo de imagem da logo deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Ao trocar de nicho, recarrega sugestões
  const handleSelectNiche = (selectedNicheId: string) => {
    setNiche(selectedNicheId as BusinessNiche);
    const suggested = defaultServicesByNiche[selectedNicheId] || defaultServicesByNiche.OTHER;
    setServices(suggested.map((s) => ({ ...s, selected: true })));
    setStep(2);
  };

  // Auto-busca de CNPJ
  const handleCnpjComplete = async (rawDigits: string) => {
    if (rawDigits.length !== 14) return;
    setIsLookupLoading(true);
    setErrorMessage(null);
    try {
      const res = await axios.get(`http://localhost:3333/lookup/document/${rawDigits}`);
      const data = res.data;
      if (data.name) setName(data.name);
      if (data.legalName) setLegalName(data.legalName);
      if (data.addressZip) setAddressZip(data.addressZip);
      if (data.addressStreet) setAddressStreet(data.addressStreet);
      if (data.addressNumber) setAddressNumber(data.addressNumber);
      if (data.addressComplement) setAddressComplement(data.addressComplement);
      if (data.addressNeighborhood) setAddressNeighborhood(data.addressNeighborhood);
      if (data.addressCity) setAddressCity(data.addressCity);
      if (data.addressState) setAddressState(data.addressState);

      // Sugere slug a partir do nome fantasia
      if (data.name && !slug) {
        const cleanSlug = data.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        setSlug(cleanSlug);
      }
    } catch {
      // Falha silenciosa amigável
    } finally {
      setIsLookupLoading(false);
    }
  };

  // Auto-busca de CEP
  const handleCepComplete = async (rawCep: string) => {
    if (rawCep.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await axios.get(`http://localhost:3333/lookup/cep/${rawCep}`);
      const data = res.data;
      if (data.street) setAddressStreet(data.street);
      if (data.neighborhood) setAddressNeighborhood(data.neighborhood);
      if (data.city) setAddressCity(data.city);
      if (data.state) setAddressState(data.state);
      setIsSingleCityZip(!!data.isSingleCityZip);
    } catch {
      // Ignora erro
    } finally {
      setIsCepLoading(false);
    }
  };

  // Submissão Final do Onboarding
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const activeServices = services
      .filter((s) => s.selected)
      .map((s) => ({
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
        category: s.category
      }));

    if (activeServices.length === 0) {
      setErrorMessage('Selecione ou adicione pelo menos um serviço inicial para sua vitrine.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        niche,
        documentType,
        documentNumber,
        name,
        legalName: legalName || name,
        slug: slug.toLowerCase().trim(),
        phone,
        addressZip,
        addressStreet,
        addressNumber,
        addressComplement,
        addressNeighborhood,
        addressCity,
        addressState,
        isSingleCityZip,
        themeTemplate,
        ownerName,
        ownerEmail,
        ownerPassword,
        selectedServices: activeServices
      };

      const res = await axios.post('http://localhost:3333/tenants/onboarding', payload);
      const data = res.data;

      // Armazena token JWT e dados localmente
      if (data.accessToken) {
        localStorage.setItem('@marcatuahora:token', data.accessToken);
        localStorage.setItem('@marcatuahora:user', JSON.stringify(data.user));
        localStorage.setItem(
          '@marcatuahora:tenant',
          JSON.stringify({
            ...(data.tenant || {}),
            name: name || data.tenant?.name,
            logoUrl: logoUrl || data.tenant?.logoUrl
          })
        );
      }

      if (logoUrl) {
        localStorage.setItem('tenant_logo', logoUrl);
      }
      localStorage.setItem(
        'tenant_data',
        JSON.stringify({
          name: name || 'Meu Estabelecimento',
          slug,
          phone,
          logoUrl: logoUrl || ''
        })
      );
      localStorage.setItem(
        'user_data',
        JSON.stringify({
          name: ownerName,
          email: ownerEmail,
          role: 'ADMIN',
          tenantName: name,
          tenantLogo: logoUrl || null
        })
      );

      // Redireciona para a vitrine recém-criada ou painel
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Não foi possível concluir seu cadastro. Verifique os dados informados.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] text-slate-900 py-10 px-4 sm:px-6 flex flex-col justify-between">
      {/* Top Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between pb-8">
        <Link href="/" className="relative w-44 h-12">
          <Image
            src="/brand/logooficial-semfundo.png"
            alt="Marque Sua Hora Logo"
            fill
            className="object-contain object-left"
            priority
          />
        </Link>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Passo {step} de 5
        </span>
      </div>

      {/* Wizard Progress Bar */}
      <div className="max-w-2xl mx-auto w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-8">
        <div
          className="bg-brand-purple h-full transition-all duration-300 rounded-full"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      {/* Main Content Box */}
      <div className="max-w-2xl mx-auto w-full bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-luxury">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASSO 1: SELEÇÃO DE NICHO */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Qual é o segmento do seu negócio?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A plataforma adaptará automaticamente todos os termos, serviços sugeridos e vitrine para o seu ramo.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nichesList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNiche(item.id)}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-brand-purple hover:shadow-md transition-all text-left group bg-white flex flex-col justify-between"
                >
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 group-hover:text-brand-purple transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* PASSO 2: IDENTIFICAÇÃO (CNPJ/CPF) */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-bold text-brand-purple tracking-widest">
                Identificação do Estabelecimento
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            </div>

            <h2 className="text-2xl font-display font-bold text-slate-900">
              Dados do seu espaço
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Digite seu CNPJ para preenchimento automático sem digitação manual, ou utilize CPF.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setDocumentType('CNPJ')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                    documentType === 'CNPJ'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Pessoa Jurídica (CNPJ)
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType('CPF')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                    documentType === 'CPF'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Profissional Autônomo (CPF)
                </button>
              </div>

              <div className="relative">
                <InputMask
                  mask="document"
                  label={documentType === 'CNPJ' ? 'CNPJ do Salão' : 'CPF do Responsável'}
                  value={documentNumber}
                  onChangeValue={(fmt, raw) => setDocumentNumber(raw)}
                  onComplete={handleCnpjComplete}
                  placeholder={documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                  required
                />
                {isLookupLoading && (
                  <span className="absolute right-3 top-8 text-brand-purple flex items-center gap-1 text-xs font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Localizando...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]/g, '-')
                        );
                      }
                    }}
                    placeholder="Ex: Barbearia Dom Henrique"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Opcional se igual ao nome"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Link da Vitrine (URL) *
                  </label>
                  <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <span className="text-xs text-slate-400 font-mono">marcatuahora.com/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="seu-salao"
                      className="w-full py-3 bg-transparent text-sm font-semibold text-brand-purple outline-none"
                      required
                    />
                  </div>
                </div>

                <InputMask
                  mask="phone"
                  label="WhatsApp da Recepção *"
                  value={phone}
                  onChangeValue={(fmt, raw) => setPhone(raw)}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!name || !slug || !phone) {
                    setErrorMessage('Preencha os campos obrigatórios para continuar.');
                    return;
                  }
                  setErrorMessage(null);
                  setStep(3);
                }}
                className="mt-4 w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Avançar para Localização</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* PASSO 3: LOCALIZAÇÃO POR CEP */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-bold text-brand-purple tracking-widest">
                Endereço Físico
              </span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            </div>

            <h2 className="text-2xl font-display font-bold text-slate-900">
              Onde seus clientes encontrarão você?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              O endereço será exibido na sua vitrine com atalho de 1 toque para Waze e Google Maps.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <div className="relative">
                <InputMask
                  mask="cep"
                  label="CEP *"
                  value={addressZip}
                  onChangeValue={(fmt, raw) => setAddressZip(raw)}
                  onComplete={handleCepComplete}
                  placeholder="00000-000"
                  required
                />
                {isCepLoading && (
                  <span className="absolute right-3 top-8 text-brand-purple flex items-center gap-1 text-xs font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando CEP...
                  </span>
                )}
              </div>

              {isSingleCityZip && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  💡 Sua cidade possui CEP único de município. Por favor, digite o nome da sua rua/avenida abaixo.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Logradouro (Rua / Av.) *
                  </label>
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Ex: Rua das Flores"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    placeholder="123"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    placeholder="Sala 102"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    value={addressNeighborhood}
                    onChange={(e) => setAddressNeighborhood(e.target.value)}
                    placeholder="Centro"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Cidade / UF *
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="Cidade"
                      className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                      required
                    />
                    <input
                      type="text"
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="UF"
                      className="w-16 px-2 py-3 text-center uppercase font-mono bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!addressStreet || !addressNumber || !addressCity || !addressState) {
                    setErrorMessage('Preencha os campos obrigatórios de endereço para continuar.');
                    return;
                  }
                  setErrorMessage(null);
                  setStep(4);
                }}
                className="mt-4 w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Avançar para Catálogo de Serviços</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* PASSO 4: CATÁLOGO DE SERVIÇOS SUGERIDOS COM AUTONOMIA TOTAL */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-bold text-brand-purple tracking-widest">
                Autonomia Total de Catálogo
              </span>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            </div>

            <h2 className="text-2xl font-display font-bold text-slate-900">
              Quais serviços você oferece?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sugerimos os procedimentos mais procurados do seu nicho. Ajuste os valores e durações ou adicione os seus.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {services.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    item.selected ? 'bg-purple-50/40 border-brand-purple/40' : 'bg-white border-slate-200 opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        const copy = [...services];
                        copy[idx].selected = e.target.checked;
                        setServices(copy);
                      }}
                      className="w-5 h-5 accent-brand-purple rounded"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                      <span className="text-[11px] text-slate-400 block">{item.category}</span>
                    </div>
                  </label>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-mono">R$</span>
                      <input
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[idx].price = Number(e.target.value);
                          setServices(copy);
                        }}
                        className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={item.durationMinutes}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[idx].durationMinutes = Number(e.target.value);
                          setServices(copy);
                        }}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 text-center"
                      />
                      <span className="text-xs text-slate-400">min</span>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setServices([
                    ...services,
                    { name: 'Novo Serviço Customizado', price: 50, durationMinutes: 30, category: 'Personalizado', selected: true }
                  ]);
                }}
                className="mt-2 py-2.5 text-xs font-semibold text-brand-purple bg-brand-purple/10 hover:bg-brand-purple/20 rounded-xl transition-colors"
              >
                + Adicionar Outro Serviço
              </button>

              <button
                type="button"
                onClick={() => {
                  const selectedCount = services.filter((s) => s.selected).length;
                  if (selectedCount === 0) {
                    setErrorMessage('Selecione pelo menos um serviço para continuar.');
                    return;
                  }
                  setErrorMessage(null);
                  setStep(5);
                }}
                className="mt-6 w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Avançar para Identidade & Acesso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* PASSO 5: IDENTIDADE VISUAL & CONTA DE ACESSO */}
        {step === 5 && (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-bold text-brand-purple tracking-widest">
                Identidade Visual & Credenciais
              </span>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            </div>

            <h2 className="text-2xl font-display font-bold text-slate-900">
              Personalize o tema e crie sua senha
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Escolha uma das 5 paletas de luxo pré-configuradas e defina o e-mail de acesso ao painel do salão.
            </p>

            <div className="mt-6 flex flex-col gap-6">
              {/* Logo do Estabelecimento / Assinante */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-purple-200 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="w-7 h-7 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-0.5">
                    Logo do Estabelecimento
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Aparecerá no menu lateral do seu painel e na vitrine de agendamentos.
                  </p>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoUrl ? 'Alterar Logo' : 'Enviar Logo (PNG ou JPG)'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Seleção de Tema da Vitrine */}
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 block mb-2">
                  Template de Cores da Vitrine
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {themesList.map((t) => {
                    const isSelected = themeTemplate === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setThemeTemplate(t.id)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'border-brand-purple ring-2 ring-brand-purple/20 bg-purple-50/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.previewClass} shadow-sm`} />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{t.name}</span>
                          <span className="text-[10px] text-slate-400">Modo claro & escuro</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Criação da Conta do Responsável */}
              <div className="border-t border-slate-200 pt-6 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ex: Henrique Silva"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">
                    Crie uma Senha Segura *
                  </label>
                  <input
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-4 bg-brand-purple hover:bg-purple-700 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-brand-purple/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Criando sua loja...</span>
                  </>
                ) : (
                  <>
                    <span>Concluir e Abrir Minha Vitrine</span>
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-2xl mx-auto w-full text-center pt-8 text-xs text-slate-400">
        Ambiente seguro • Seus dados estão protegidos sob criptografia de ponta a ponta
      </div>
    </div>
  );
}
