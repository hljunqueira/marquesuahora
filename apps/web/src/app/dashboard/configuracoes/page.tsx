'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import axios from 'axios';
import {
  Building2,
  Palette,
  Briefcase,
  Calendar,
  DollarSign,
  Cake,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { InputMask } from '@/components/ui/InputMask';

export default function DashboardConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<
    'DATA' | 'THEME' | 'NICHE' | 'SCHEDULE' | 'FINANCE' | 'AUTOMATIONS' | 'SECURITY'
  >('DATA');

  // Dados Cadastrais
  const [name, setName] = useState('Salão Imperial');
  const [documentNumber, setDocumentNumber] = useState('12.345.678/0001-90');
  const [phone, setPhone] = useState('(11) 98765-4321');
  const [cep, setCep] = useState('01310-100');
  const [street, setStreet] = useState('Avenida Paulista');
  const [number, setNumber] = useState('1000');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('Bela Vista');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');

  // Identidade Visual
  const [themeTemplate, setThemeTemplate] = useState('PURPLE_IMPERIAL');

  // Regras da Agenda
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('19:00');
  const [bufferMinutes, setBufferMinutes] = useState('15');

  // Políticas Financeiras
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositType, setDepositType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [depositAmount, setDepositAmount] = useState('30.00');
  const [maxNoShows, setMaxNoShows] = useState('2');

  // Troca de Senha Segura
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve possuir pelo menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação de senha não confere.');
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  const THEMES = [
    {
      id: 'PURPLE_IMPERIAL',
      name: 'Roxo Imperial & Ouro',
      primary: '#7C3AED',
      secondary: '#D4AF37',
      desc: 'Salões de alto padrão e barbearias refinadas'
    },
    {
      id: 'DARK_OBSIDIAN',
      name: 'Dark Obsidian & Grafite',
      primary: '#0B0F19',
      secondary: '#64748B',
      desc: 'Barbearias urbanas e estúdios industriais'
    },
    {
      id: 'ROSE_GOLD',
      name: 'Rose Gold & Nude Estético',
      primary: '#FAF7F5',
      secondary: '#C07A65',
      desc: 'Clínicas de estética, unhas e lash designers'
    },
    {
      id: 'EMERALD_SAGE',
      name: 'Verde Esmeralda & Sage',
      primary: '#047857',
      secondary: '#A7F3D0',
      desc: 'Spas holísticos, massoterapia e estética natural'
    },
    {
      id: 'MIDNIGHT_SAPPHIRE',
      name: 'Azul Safira Real',
      primary: '#2563EB',
      secondary: '#93C5FD',
      desc: 'Estúdios esportivos, fisioterapia e personal trainers'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navegação entre as Abas */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs text-xs font-semibold">
        {[
          { id: 'DATA', label: 'Dados da Loja', icon: Building2 },
          { id: 'THEME', label: 'Identidade Visual', icon: Palette },
          { id: 'SCHEDULE', label: 'Regras da Agenda', icon: Calendar },
          { id: 'FINANCE', label: 'Sinal & No-Show', icon: DollarSign },
          { id: 'AUTOMATIONS', label: 'CRM & Aniversários', icon: Cake },
          { id: 'SECURITY', label: 'Troca de Senha', icon: Lock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                  : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Aba */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        {/* ABA 1: DADOS DA LOJA */}
        {activeTab === 'DATA' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Dados Cadastrais & Localização
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Informações visíveis para os clientes na vitrine pública e nos comprovantes de agendamento.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome do Estabelecimento *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  CNPJ ou CPF
                </label>
                <InputMask
                  mask="document"
                  value={documentNumber}
                  onChangeValue={(val) => setDocumentNumber(val)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  WhatsApp Comercial da Recepção
                </label>
                <InputMask
                  mask="phone"
                  value={phone}
                  onChangeValue={(val) => setPhone(val)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  CEP
                </label>
                <InputMask
                  mask="cep"
                  value={cep}
                  onChangeValue={(val) => setCep(val)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Logradouro / Rua
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Ex: Sala 4, Bloco B"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-semibold uppercase transition-all"
                />
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Configurações Salvas!' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ABA 2: IDENTIDADE VISUAL */}
        {activeTab === 'THEME' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Template Editorial da Vitrine
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Escolha uma das 5 paletas de luxo desenhadas para o seu nicho:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.map((theme) => {
                const isSelected = themeTemplate === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemeTemplate(theme.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-purple-600 ring-2 ring-purple-600/10 bg-purple-50/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-5 h-5 rounded-full border border-black/10"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-black/10"
                        style={{ backgroundColor: theme.secondary }}
                      />
                      <strong className="text-xs font-bold text-slate-900 ml-1">
                        {theme.name}
                      </strong>
                    </div>
                    <span className="text-[11px] text-slate-500">{theme.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 3: REGRAS DA AGENDA */}
        {activeTab === 'SCHEDULE' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Horários de Atendimento & Buffer
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Horário de Abertura
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Horário de Fechamento
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Buffer Higiênico / Respiro (min)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Regras Salvas!' : 'Salvar Regras'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ABA 4: SINAL PIX & NO-SHOW */}
        {activeTab === 'FINANCE' && (
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Políticas de Sinal & No-Show Shield
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proteja sua agenda contra horários ociosos e prejuízos com reservas vazias.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={depositRequired}
                  onChange={(e) => setDepositRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <strong className="text-xs font-bold text-slate-800 block">
                    Exigir Sinal PIX Antecipado (Reserva Garantida)
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    O cliente tem 15 minutos para pagar o PIX para segurar o horário.
                  </span>
                </div>
              </label>

              {depositRequired && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Tipo de Sinal
                    </label>
                    <select
                      value={depositType}
                      onChange={(e) => setDepositType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                    >
                      <option value="FIXED">Valor Fixo (R$)</option>
                      <option value="PERCENTAGE">Percentual do Total (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Valor do Sinal
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Limite de Faltas Consecutivas para Bloqueio Amigável (No-Show Shield)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxNoShows}
                onChange={(e) => setMaxNoShows(e.target.value)}
                className="w-24 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Ao atingir este número de faltas, o cliente é direcionado cordialmente para a recepção no WhatsApp.
              </span>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Políticas Salvas!' : 'Salvar Políticas'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ABA 5: CRM & ANIVERSÁRIOS */}
        {activeTab === 'AUTOMATIONS' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Felicitações Automáticas de Aniversário
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Disparo matinal automático às 09:00 com mensagem cordial pelo padrão Humanizer (sem presentes ou cupons forçados).
              </p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
              <strong>Mensagem Oficial Humanizer:</strong>
              <p className="mt-1 italic">
                "Olá, [Nome]! Toda a nossa equipe deseja a você um aniversário maravilhoso, repleto de paz, saúde e momentos inesquecíveis. É uma alegria ter você conosco!"
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Automações Salvas!' : 'Confirmar Automações'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ABA 6: SEGURANÇA E TROCA DE SENHA */}
        {activeTab === 'SECURITY' && (
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Troca de Senha Segura
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Criptografia avançada Argon2id para proteção máxima dos seus dados de acesso.
              </p>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Senha atualizada com sucesso!</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nova Senha (Mínimo 8 caracteres)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 transition-all"
              />
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Atualizar Senha</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
