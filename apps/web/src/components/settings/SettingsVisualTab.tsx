'use client';

import React, { useState, useRef } from 'react';
import {
  Palette,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  Upload,
  Trash2,
  Smartphone,
  Eye,
  Instagram,
  Clock,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { TenantSettings } from './types';

interface SettingsVisualTabProps {
  settings: TenantSettings;
  onChange: (field: keyof TenantSettings, value: any) => void;
}

export const SettingsVisualTab: React.FC<SettingsVisualTabProps> = ({
  settings,
  onChange
}) => {
  const [copied, setCopied] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setUploadFeedback({ text, type });
    setTimeout(() => {
      setUploadFeedback(null);
    }, 4000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showFeedback('A imagem do logotipo deve ter no máximo 5MB.', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.relativeUrl;
      if (url) {
        onChange('logoUrl', url);
        showFeedback('Logotipo enviado com sucesso. Clique em Salvar Configurações para confirmar.', 'success');
      }
    } catch (err) {
      console.error('Erro ao enviar logotipo:', err);
      showFeedback('Erro ao enviar o logotipo. Tente novamente.', 'error');
    } finally {
      setUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showFeedback('A imagem do banner deve ter no máximo 10MB.', 'error');
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.relativeUrl;
      if (url) {
        onChange('coverUrl', url);
        showFeedback('Banner enviado com sucesso. Clique em Salvar Configurações para confirmar.', 'success');
      }
    } catch (err) {
      console.error('Erro ao enviar banner:', err);
      showFeedback('Erro ao enviar o banner. Tente novamente.', 'error');
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  const themeTemplates = [
    {
      id: 'PURPLE_GOLD',
      name: 'Roxo Imperial & Dourado',
      desc: 'Sofisticado e premium para salões, lash e estética',
      primary: '#7C3AED',
      secondary: '#0B0F19',
      accent: '#D4AF37'
    },
    {
      id: 'DARK_OBSIDIAN',
      name: 'Obsidiana Barber',
      desc: 'Dark sóbrio e elegante para barbearias e tatuadores',
      primary: '#EAB308',
      secondary: '#09090B',
      accent: '#F59E0B'
    },
    {
      id: 'ROSE_GOLD',
      name: 'Rose Gold & Estética',
      desc: 'Delicado e suave para estética facial, noivas e sobrancelhas',
      primary: '#EC4899',
      secondary: '#18181B',
      accent: '#F472B6'
    },
    {
      id: 'EMERALD_SAGE',
      name: 'Esmeralda & Bem-Estar',
      desc: 'Natural e zen para spas, massoterapia e terapeutas',
      primary: '#10B981',
      secondary: '#064E3B',
      accent: '#34D399'
    },
    {
      id: 'MIDNIGHT_BLUE',
      name: 'Azul Meia-Noite',
      desc: 'Clínico e confiável para biomédicos e consultórios',
      primary: '#2563EB',
      secondary: '#0F172A',
      accent: '#60A5FA'
    }
  ];

  // Cores Rápidas Populares
  const colorPresets = [
    { name: 'Roxo Imperial', color: '#7C3AED' },
    { name: 'Dourado Nobre', color: '#D4AF37' },
    { name: 'Rose Gold', color: '#EC4899' },
    { name: 'Verde Esmeralda', color: '#10B981' },
    { name: 'Azul Safira', color: '#2563EB' },
    { name: 'Preto Obsidiana', color: '#18181B' },
    { name: 'Vinho Marsala', color: '#991B1B' },
    { name: 'Coral Elegante', color: '#EA580C' }
  ];

  const handleSelectTemplate = (template: typeof themeTemplates[0]) => {
    onChange('themeTemplate', template.id);
    onChange('primaryColor', template.primary);
    onChange('secondaryColor', template.secondary);
    onChange('accentColor', template.accent);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('marquesuahora_tenant_sync', { detail: { primaryColor: template.primary } }));
    }
  };

  const handlePrimaryColorChange = (color: string) => {
    onChange('primaryColor', color);
    if (typeof window !== 'undefined' && color.startsWith('#') && color.length === 7) {
      window.dispatchEvent(new CustomEvent('marquesuahora_tenant_sync', { detail: { primaryColor: color } }));
    }
  };

  const showcaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${settings.slug}`
    : `/${settings.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(showcaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activePrimaryColor = settings.primaryColor || '#5c0701';

  // Determina se o estabelecimento está aberto no momento (Fuso Horário de Brasília)
  const isPreviewOpen = React.useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hour12: false
      }).formatToParts(new Date());
      const partMap: Record<string, string> = {};
      for (const p of parts) partMap[p.type] = p.value;
      if (partMap.weekday === 'Sun') return false; // Domingo fechado na grade
      const current = `${partMap.hour}:${partMap.minute}`;
      const open = settings.openingTime || '09:00';
      const close = settings.closingTime || '19:00';
      return current >= open && current < close;
    } catch {
      return false;
    }
  }, [settings.openingTime, settings.closingTime]);

  return (
    <div className="space-y-6">
      {/* Vitrine Link Banner */}
      <div className="bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/70 border border-purple-200/80 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            Link na Bio & Vitrine Oficial
          </div>
          <div className="text-slate-800 font-mono text-sm break-all font-medium">
            {showcaseUrl}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>

          <a
            href={`/${settings.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl btn-primary-tenant text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Ver Vitrine</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Feedback de Upload Operacional */}
      {uploadFeedback && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-medium border transition-all ${
            uploadFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {uploadFeedback.text}
        </div>
      )}

      {/* Grid Principal: Configurações Visuais + Preview da Vitrine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna da Esquerda: Controles Visuais (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Banner Panorâmico de Capa */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    Banner Panorâmico de Capa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Imagem de topo exibida no cabeçalho da sua vitrine pública
                  </p>
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={coverInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />

            {/* Preview do Banner */}
            <div className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden border border-slate-200 shadow-inner group bg-slate-100 flex items-center justify-center">
              {settings.coverUrl ? (
                <>
                  <img
                    src={resolveImageUrl(settings.coverUrl)}
                    alt="Capa da Vitrine"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingCover ? 'Enviando...' : 'Alterar'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploadingCover}
                      onClick={() => onChange('coverUrl', '')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-center p-4 relative"
                  style={{
                    background: `linear-gradient(135deg, ${activePrimaryColor}dd 0%, #0F172A 100%)`
                  }}
                >
                  <p className="text-white text-xs font-bold uppercase tracking-wider mb-1">
                    Gradiente Padrão da Marca
                  </p>
                  <p className="text-white/80 text-[11px] max-w-xs">
                    Nenhum banner enviado. A vitrine usa as cores primárias do salão como gradiente premium.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin text-purple-700" /> : <Upload className="w-4 h-4" />}
                <span>{uploadingCover ? 'Enviando Banner...' : 'Enviar Banner do Dispositivo'}</span>
              </button>

              {settings.coverUrl && (
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => onChange('coverUrl', '')}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Banner</span>
                </button>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Ou cole o Link Direto da Imagem de Capa
              </label>
              <input
                type="url"
                value={settings.coverUrl || ''}
                placeholder="https://exemplo.com/minha-capa.jpg"
                onChange={(e) => onChange('coverUrl', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
              <p className="text-[11px] text-slate-500">
                Recomendado: proporção 16:9 ou panorâmica (mínimo 1200x480px em formato JPG ou PNG).
              </p>
            </div>
          </div>

          {/* 2. Logotipo do Estabelecimento */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-tenant-light text-tenant-primary">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">
                  Logotipo do Estabelecimento
                </h3>
                <p className="text-xs text-slate-500">
                  Foto de perfil ou logo da sua marca sobreposto no cabeçalho
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm relative group">
                {settings.logoUrl ? (
                  <>
                    <img
                      src={resolveImageUrl(settings.logoUrl)}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => onChange('logoUrl', '')}
                      className="absolute inset-0 bg-slate-900/60 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Remover logotipo"
                    >
                      <Trash2 className="w-4 h-4 text-rose-300" />
                      <span>Remover</span>
                    </button>
                  </>
                ) : (
                  <span
                    className="w-full h-full flex items-center justify-center text-2xl font-bold text-white select-none"
                    style={{ backgroundColor: activePrimaryColor }}
                  >
                    {settings.name?.slice(0, 2).toUpperCase() || 'MH'}
                  </span>
                )}
              </div>

              <div className="w-full space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin text-purple-700" /> : <Upload className="w-4 h-4" />}
                    <span>{uploadingLogo ? 'Enviando Logotipo...' : 'Enviar Foto / Logo'}</span>
                  </button>

                  {settings.logoUrl && (
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => onChange('logoUrl', '')}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Ou cole o Link Direto da Imagem
                  </label>
                  <input
                    type="url"
                    value={settings.logoUrl || ''}
                    placeholder="https://exemplo.com/meu-logo.png"
                    onChange={(e) => onChange('logoUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  />
                  <p className="text-[11px] text-slate-500">
                    Recomendado: formato quadrado ou circular (mínimo 200x200px com fundo transparente ou sólido).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Paletas de Cores & Escolha Direta */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-pink-50 text-pink-700">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">
                  Cores da Marca & Estilo Visual
                </h3>
                <p className="text-xs text-slate-500">
                  Personalize a cor principal e o tema para encantar seus clientes
                </p>
              </div>
            </div>

            {/* Swatches de Cores Rápidas */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                Escolha Rápida de Cor Principal
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {colorPresets.map((preset) => {
                  const isCurrent = settings.primaryColor?.toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => handlePrimaryColorChange(preset.color)}
                      title={preset.name}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-slate-900 ring-2 ring-slate-900/20 bg-slate-50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full border border-black/10 shadow-inner flex items-center justify-center"
                        style={{ backgroundColor: preset.color }}
                      >
                        {isCurrent && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-700 text-center truncate w-full">
                        {preset.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Templates Estilizados */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                Temas Completos com Paleta Harmonizada
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {themeTemplates.map((tpl) => {
                  const isSelected = settings.themeTemplate === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-slate-900 text-xs">
                          {tpl.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: tpl.primary }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: tpl.accent }}
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {tpl.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seletores Hexadecimais Personalizados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cor Primária
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor || '#5c0701'}
                    onChange={(e) => handlePrimaryColorChange(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor || '#5c0701'}
                    onChange={(e) => handlePrimaryColorChange(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.secondaryColor || '#0B0F19'}
                    onChange={(e) => onChange('secondaryColor', e.target.value)}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor || '#0B0F19'}
                    onChange={(e) => onChange('secondaryColor', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cor de Destaque
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accentColor || '#D4AF37'}
                    onChange={(e) => onChange('accentColor', e.target.value)}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.accentColor || '#D4AF37'}
                    onChange={(e) => onChange('accentColor', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Preview da Vitrine em Tempo Real (lg:col-span-5) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Preview em Tempo Real
                </h3>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-[11px] font-bold text-purple-700">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (Link na Bio)</span>
              </div>
            </div>

            {/* Moldura de Smartphone Premium */}
            <div className="mx-auto max-w-[310px] bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50">
              {/* Dynamic Island / Notch */}
              <div className="relative w-full flex justify-center mb-1.5">
                <div className="w-20 h-3.5 bg-black rounded-full flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-800" />
                  <div className="w-1 h-1 rounded-full bg-slate-900" />
                </div>
              </div>

              {/* Tela do Celular */}
              <div className="bg-[#FAF9F6] text-slate-900 rounded-[1.8rem] overflow-hidden overflow-y-auto max-h-[500px] select-none text-left shadow-inner border border-slate-200/50">
                {/* Barra do Navegador Mobile Simulado */}
                <div className="bg-slate-100/90 px-3 py-1.5 flex items-center justify-center border-b border-slate-200/80">
                  <div className="px-3 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] text-slate-600 font-mono flex items-center gap-1 shadow-2xs truncate max-w-[210px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="truncate">marquesuahora.com.br/{settings.slug || 'salao'}</span>
                  </div>
                </div>

                {/* Banner de Capa */}
                <div
                  className="relative w-full h-28 overflow-hidden"
                  style={{
                    background: settings.coverUrl
                      ? undefined
                      : `linear-gradient(135deg, ${activePrimaryColor}dd 0%, #0F172A 100%)`
                  }}
                >
                  {settings.coverUrl && (
                    <img
                      src={resolveImageUrl(settings.coverUrl)}
                      alt="Banner Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Badge Flutuante de Status no Topo Direito (Idêntico ao original) */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold backdrop-blur-md shadow-2xs text-white ${
                        isPreviewOpen
                          ? 'bg-emerald-600/90 ring-1 ring-emerald-400/50'
                          : 'bg-slate-800/80 ring-1 ring-white/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPreviewOpen ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {isPreviewOpen ? 'Aberto Agora' : 'Fechado no Momento'}
                    </span>
                  </div>
                </div>

                {/* Topo do Salão com Avatar Sobreposto e Informações Limpas */}
                <div className="px-3.5 pb-4">
                  {/* Avatar Centralizado com Anel Branco */}
                  <div className="relative flex flex-col items-center text-center -mt-9 mb-2 z-10">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white ring-3 ring-white shadow-lg flex-shrink-0 relative">
                      {settings.logoUrl ? (
                        <img
                          src={resolveImageUrl(settings.logoUrl)}
                          alt="Logo Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-bold text-sm text-white select-none"
                          style={{ backgroundColor: activePrimaryColor }}
                        >
                          {settings.name?.slice(0, 2).toUpperCase() || 'MH'}
                        </div>
                      )}
                    </div>

                    {/* Nome do Estabelecimento */}
                    <h4 className="mt-2 font-extrabold text-sm text-slate-900 tracking-tight leading-tight">
                      {settings.name || 'Seu Estabelecimento'}
                    </h4>

                    {/* Biografia Direta Sem Caixa Alta de Especialidades */}
                    {settings.description && (
                      <p className="mt-1 text-[10px] text-slate-600 leading-relaxed max-w-xs">
                        {settings.description}
                      </p>
                    )}

                    {/* Botão de Agendamento Online no Topo */}
                    <div className="mt-2">
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl font-bold text-[10px] text-white shadow-xs transition-all active:scale-95"
                        style={{ backgroundColor: activePrimaryColor }}
                      >
                        Agendamento Online
                      </button>
                    </div>

                    {/* Ações Rápidas: Portal, WhatsApp, Instagram e Horário */}
                    <div className="mt-2.5 w-full flex flex-wrap items-center justify-center gap-1 pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-slate-800 bg-slate-100 border border-slate-200 shadow-2xs">
                        Portal da Cliente
                      </span>

                      {settings.instagramUrl && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium text-slate-700 bg-slate-50 border border-slate-200/70 shadow-2xs">
                          <Instagram className="w-2.5 h-2.5 text-pink-600" />
                          <span>Instagram</span>
                        </span>
                      )}

                      {settings.phone && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 shadow-2xs">
                          <WhatsAppIcon size={10} color="#059669" />
                          <span>WhatsApp</span>
                        </span>
                      )}

                      <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] text-slate-500 font-medium">
                        {isPreviewOpen
                          ? `Atendimento: ${settings.openingTime || '09:00'} às ${settings.closingTime || '19:00'}`
                          : 'Atendimento hoje: Fechado'}
                      </span>
                    </div>
                  </div>

                  {/* Widget do Passo 1 de 4: Agendamento */}
                  <div className="mt-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    {/* Barra de Progresso Segmentada */}
                    <div className="p-2 bg-slate-50/70 border-b border-slate-100">
                      <div className="flex items-center justify-between text-[8px] font-bold mb-1">
                        <span className="text-slate-500 uppercase tracking-wider">Passo 1 de 4</span>
                        <span className="text-slate-800 font-extrabold">Especialidade & Serviços</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <div
                          className="h-1 rounded-full"
                          style={{ backgroundColor: activePrimaryColor }}
                        />
                        <div className="h-1 rounded-full bg-slate-200" />
                        <div className="h-1 rounded-full bg-slate-200" />
                        <div className="h-1 rounded-full bg-slate-200" />
                      </div>
                    </div>

                    <div className="p-2.5 space-y-2">
                      <div>
                        <h5 className="font-extrabold text-[11px] text-slate-900 leading-tight">
                          Como podemos te ajudar?
                        </h5>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          Selecione os procedimentos desejados
                        </p>
                      </div>

                      {/* Card de Serviço Idêntico ao Original */}
                      <div className="p-2 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-900 truncate">
                            {settings.niche === 'BARBERSHOP'
                              ? 'Corte & Barba Completa'
                              : 'Alongamento em Gel na Fibra'}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">
                            {settings.niche === 'BARBERSHOP'
                              ? '45 min · Acabamento na navalha'
                              : '120 min · Procedimento completo'}
                          </p>
                          <p className="text-[11px] font-extrabold text-slate-900 mt-0.5">
                            {settings.niche === 'BARBERSHOP' ? 'R$ 70,00' : 'R$ 160,00'}
                          </p>
                        </div>

                        <span
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-2xs flex-shrink-0"
                          style={{ backgroundColor: activePrimaryColor }}
                        >
                          Agendar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Atualizações de capa, logotipo e cores refletem na vitrine imediatamente após salvar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
