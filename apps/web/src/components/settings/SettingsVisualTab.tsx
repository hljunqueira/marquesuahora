'use client';

import React, { useState, useRef } from 'react';
import { Palette, ExternalLink, Copy, Check, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const themeTemplates = [
    {
      id: 'PURPLE_GOLD',
      name: 'Roxo Imperial & Dourado',
      desc: 'Sofisticado, premium, salões e lash designers',
      primary: '#7C3AED',
      secondary: '#0B0F19',
      accent: '#D4AF37'
    },
    {
      id: 'DARK_OBSIDIAN',
      name: 'Obsidiana Barber',
      desc: 'Dark elegante, barbearias e tatuadores',
      primary: '#EAB308',
      secondary: '#09090B',
      accent: '#F59E0B'
    },
    {
      id: 'ROSE_GOLD',
      name: 'Rose Gold & Estética',
      desc: 'Delicado, estética facial, noivas e sobrancelhas',
      primary: '#EC4899',
      secondary: '#18181B',
      accent: '#F472B6'
    },
    {
      id: 'EMERALD_SAGE',
      name: 'Esmeralda & Bem-Estar',
      desc: 'Natural, spa, massoterapia e terapeutas',
      primary: '#10B981',
      secondary: '#064E3B',
      accent: '#34D399'
    },
    {
      id: 'MIDNIGHT_BLUE',
      name: 'Azul Meia-Noite',
      desc: 'Clínico, biomédicos e consultórios',
      primary: '#3B82F6',
      secondary: '#0F172A',
      accent: '#60A5FA'
    }
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

      {/* Logotipo */}
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
              URL da imagem da sua marca exibida no cabeçalho e vitrine
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner relative group">
            {settings.logoUrl ? (
              <>
                <img
                  src={settings.logoUrl}
                  alt="Logo Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => onChange('logoUrl', '')}
                  className="absolute inset-0 bg-slate-900/60 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer"
                  title="Remover logotipo"
                >
                  <Trash2 className="w-4 h-4 text-rose-300" />
                  <span>Remover</span>
                </button>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-400">
                {settings.name?.slice(0, 2).toUpperCase() || 'MH'}
              </span>
            )}
          </div>

          <div className="w-full space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Enviar Logo do Dispositivo</span>
              </button>

              {settings.logoUrl && (
                <button
                  type="button"
                  onClick={() => onChange('logoUrl', '')}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                onChange={(e) => onChange('logoUrl', e.target.value)}
                placeholder="https://suaimagem.com/logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
              <p className="text-[11px] text-slate-500">
                Recomendado: formato quadrado ou circular com fundo transparente (mínimo 200x200px).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates de Cores */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-pink-50 text-pink-700">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Paletas de Cores & Estilo Visual
            </h3>
            <p className="text-xs text-slate-500">
              Escolha uma paleta refinada para impressionar seus clientes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {themeTemplates.map((tpl) => {
            const isSelected = settings.themeTemplate === tpl.id;

            return (
              <div
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900 text-sm">
                    {tpl.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: tpl.primary }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: tpl.accent }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tpl.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Cor Primária
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.primaryColor || '#7C3AED'}
                onChange={(e) => handlePrimaryColorChange(e.target.value)}
                className="w-9 h-9 rounded-lg bg-white border border-slate-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={settings.primaryColor || '#7C3AED'}
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
  );
};
