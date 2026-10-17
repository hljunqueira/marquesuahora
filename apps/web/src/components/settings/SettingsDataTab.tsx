'use client';

import React from 'react';
import { Building2, MapPin, Phone, Instagram, FileText } from 'lucide-react';
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
              placeholder="Ex: Studio Bella Donna"
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
              placeholder="Ex: Bella Donna Estética Ltda"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {settings.documentType || 'CNPJ/CPF'}
            </label>
            <input
              type="text"
              disabled
              value={settings.documentNumber || ''}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-500 font-mono cursor-not-allowed"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Para alterar o documento, contate o suporte.
            </span>
          </div>

          <div>
            <InputMask
              mask="phone"
              label="WhatsApp / Telefone de Contato *"
              value={settings.phone || ''}
              onChangeValue={(formatted, raw) => onChange('phone', raw)}
              placeholder="(11) 99999-9999"
              required
            />
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
              placeholder="https://instagram.com/seuestudio"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Bio / Descrição Editorial (Exibida no topo da Vitrine)
          </label>
          <textarea
            rows={3}
            value={settings.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Ex: Especialistas em mega hair, mechas criativas e estética avançada há mais de 8 anos..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
          />
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
              label="CEP *"
              value={settings.addressZip || ''}
              onChangeValue={(formatted) => onChange('addressZip', formatted)}
              placeholder="00000-000"
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
              placeholder="Ex: Rua das Flores"
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
              placeholder="123"
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
              placeholder="Sala 204, Bloco B"
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
              placeholder="Centro"
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
                placeholder="São Paulo"
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
                placeholder="SP"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 uppercase text-center focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-semibold"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
