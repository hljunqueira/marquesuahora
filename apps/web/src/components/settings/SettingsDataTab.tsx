'use client';

import React from 'react';
import { Building2, MapPin, Phone, Instagram, FileText, Star } from 'lucide-react';
import { InputMask } from '@/components/ui/InputMask';
import { TenantSettings } from './types';

interface SettingsDataTabProps {
  settings: TenantSettings;
  onChange: (field: keyof TenantSettings, value: any) => void;
}

export const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-6">
      {/* Informações Principais */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Identificação do Estabelecimento
            </h3>
            <p className="text-xs text-slate-500">
              Dados cadastrais exibidos na sua vitrine e recibos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Nome Fantasia *
            </label>
            <input
              type="text"
              required
              value={settings.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Razão Social
            </label>
            <input
              type="text"
              value={settings.legalName || ''}
              onChange={(e) => onChange('legalName', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Segmento / Área de Atuação (Opcional)
            </label>
            <select
              value={settings.niche || 'OTHER'}
              onChange={(e) => onChange('niche', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium cursor-pointer"
            >
              <option value="OTHER">Geral / Múltiplos Serviços</option>
              <option value="NAIL_LASH_STUDIO">Unhas & Cílios</option>
              <option value="BEAUTY_SALON">Salão de Beleza & Cabelos</option>
              <option value="BARBERSHOP">Barbearia & Corte Masculino</option>
              <option value="AESTHETICS_CLINIC">Clínica de Estética & Biomédica</option>
              <option value="PERSONAL_TRAINER">Personal Trainer & Treinos</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Documento Fiscal
              </label>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => onChange('documentType', 'CPF')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                    (settings.documentType || 'CPF') === 'CPF'
                      ? 'bg-white shadow-xs text-purple-700 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  CPF
                </button>
                <button
                  type="button"
                  onClick={() => onChange('documentType', 'CNPJ')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                    settings.documentType === 'CNPJ'
                      ? 'bg-white shadow-xs text-purple-700 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  CNPJ
                </button>
              </div>
            </div>
            <InputMask
              mask="document"
              value={settings.documentNumber || ''}
              onChangeValue={(formatted, raw) => {
                onChange('documentNumber', raw || '');
                if (raw && raw.length > 11 && settings.documentType !== 'CNPJ') {
                  onChange('documentType', 'CNPJ');
                }
              }}
              placeholder={settings.documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
              className="!py-2.5 !px-3.5 font-mono text-slate-800 text-sm"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              {(settings.documentType || 'CPF') === 'CNPJ'
                ? 'CNPJ do estabelecimento para identificação e recibos.'
                : 'CPF do titular responsável pelo salão.'}
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                WhatsApp / Telefone
              </label>
              {settings.phone && (
                <button
                  type="button"
                  onClick={() => onChange('phone', '')}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-medium cursor-pointer transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
            <InputMask
              mask="phone"
              value={settings.phone || ''}
              onChangeValue={(formatted, raw) => onChange('phone', raw || '')}
              placeholder="(00) 00000-0000"
              className="!py-2.5 !px-3.5 text-slate-800 text-sm"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Exibido na vitrine e usado para dúvidas de clientes.
            </span>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              <span>Instagram (URL)</span>
            </label>
            <input
              type="url"
              value={settings.instagramUrl || ''}
              onChange={(e) => onChange('instagramUrl', e.target.value)}
              placeholder="https://instagram.com/seuperfil"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Link na bio e botão direto na vitrine.
            </span>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Avaliações Google Maps</span>
            </label>
            <input
              type="url"
              value={settings.googleReviewUrl || ''}
              onChange={(e) => onChange('googleReviewUrl', e.target.value)}
              placeholder="https://g.page/r/.../review"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Selo 5 estrelas e link de avaliação na vitrine.
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Sobre o Estabelecimento / História da Marca & Bio da Vitrine
            </label>
            <span className={`text-[11px] font-mono transition-colors ${
              (settings.description || '').length > 1800
                ? 'text-amber-600 font-bold'
                : 'text-slate-400'
            }`}>
              {(settings.description || '').length} / 2000 caracteres
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={2000}
            value={settings.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Conte um pouco sobre sua trajetória, especialidades, conforto do espaço (ex: ambiente climatizado, café) e compromisso com suas clientes..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all resize-y"
          />
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
            <span>Exibido no topo e nos detalhes da Vitrine Pública</span>
            <span>Máximo de 2.000 caracteres</span>
          </div>
        </div>
      </div>

      {/* Endereço Físico */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Localização & Endereço
            </h3>
            <p className="text-xs text-slate-500">
              Endereço onde os atendimentos presenciais são realizados
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <InputMask
              mask="cep"
              label="CEP"
              value={settings.addressZip || ''}
              onChangeValue={(formatted) => onChange('addressZip', formatted)}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Rua / Logradouro *
            </label>
            <input
              type="text"
              required
              value={settings.addressStreet || ''}
              onChange={(e) => onChange('addressStreet', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Número *
            </label>
            <input
              type="text"
              required
              value={settings.addressNumber || ''}
              onChange={(e) => onChange('addressNumber', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Complemento
            </label>
            <input
              type="text"
              value={settings.addressComplement || ''}
              onChange={(e) => onChange('addressComplement', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Bairro *
            </label>
            <input
              type="text"
              required
              value={settings.addressNeighborhood || ''}
              onChange={(e) => onChange('addressNeighborhood', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Cidade *
              </label>
              <input
                type="text"
                required
                value={settings.addressCity || ''}
                onChange={(e) => onChange('addressCity', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                UF *
              </label>
              <input
                type="text"
                maxLength={2}
                required
                value={settings.addressState || ''}
                onChange={(e) => onChange('addressState', e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 uppercase text-center focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-semibold"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
