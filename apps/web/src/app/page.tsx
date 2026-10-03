'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Calendar,
  Clock,
  Check,
  Search,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const NICHES = [
  {
    id: 'barber',
    label: 'Barbearia',
    headline: 'Atendimento ágil para barbearias',
    tagline: 'Combos de corte e barba contínuos, encaixes rápidos e confirmação automática.',
    terminology: {
      prof: 'Barbeiro',
      space: 'Cadeira de Barbeiro',
      service: 'Corte Degradê + Barba Terapia'
    }
  },
  {
    id: 'salon',
    label: 'Salão de Beleza',
    headline: 'Tempo de pausa e processos químicos',
    tagline: 'Encaixe escova ou manicure durante o tempo de ação da coloração sem conflitos.',
    terminology: {
      prof: 'Cabeleireira / Colorista',
      space: 'Lavatório & Bancada',
      service: 'Coloração + Tratamento + Escova'
    }
  },
  {
    id: 'aesthetics',
    label: 'Estética & Saúde',
    headline: 'Bloqueio de salas e equipamentos',
    tagline: 'Controle de cabines esterilizadas e aparelhos compartilhados entre profissionais.',
    terminology: {
      prof: 'Biomédica / Esteticista',
      space: 'Cabine Estéril',
      service: 'Harmonização Facial & Laser'
    }
  },
  {
    id: 'lash-nails',
    label: 'Unhas & Lash',
    headline: 'Controle por ciclo de manutenção',
    tagline: 'Diferenciação clara entre aplicação nova, manutenção periódica e remoção externa.',
    terminology: {
      prof: 'Lash Designer / Nail Artist',
      space: 'Mesa de Manicure',
      service: 'Extensão de Cílios Fio a Fio'
    }
  },
  {
    id: 'personal',
    label: 'Personal Trainer',
    headline: 'Treinos presenciais e condomínio',
    tagline: 'Janela automática de trânsito entre aulas domiciliares e débito de pacotes.',
    terminology: {
      prof: 'Personal Trainer',
      space: 'Studio / Condomínio',
      service: 'Sessão Individualizada 60 min'
    }
  }
];

export default function LandingPage() {
  const [selectedNiche, setSelectedNiche] = useState(NICHES[0]);
  const [activePreviewTab, setActivePreviewTab] = useState<'dashboard' | 'mobile'>('dashboard');

  // Calculadora No-Show
  const [dailyAppointments, setDailyAppointments] = useState(12);
  const [averageTicket, setAverageTicket] = useState(85);
  const [noShowRate, setNoShowRate] = useState(15);

  const monthlyAppointments = dailyAppointments * 26;
  const lostAppointments = Math.round(monthlyAppointments * (noShowRate / 100));
  const lostRevenue = lostAppointments * averageTicket;
  const recoveredRevenue = Math.round(lostRevenue * 0.9);

  return (
    <div className="w-full min-h-screen bg-[#FBFBFA] text-slate-900 selection:bg-purple-900/10 selection:text-purple-900 font-sans">
      {/* 1. NAVEGAÇÃO SUPERIOR */}
      <header className="sticky top-0 z-50 w-full bg-white/80 border-b border-slate-200/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="relative w-44 h-12">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#preview" className="hover:text-slate-900 transition-colors">
              Como funciona
            </a>
            <a href="#simulator" className="hover:text-slate-900 transition-colors">
              Para seu setor
            </a>
            <a href="#calculator" className="hover:text-slate-900 transition-colors">
              Calculadora de faltas
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Planos
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/onboarding"
              className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-slate-900 tracking-tight leading-[1.12]">
            Sua agenda cheia, sem faltas e organizada direto no celular.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Seus clientes escolhem o serviço e o horário livre em segundos, pelo navegador ou WhatsApp.
            Você atende com calma enquanto o sistema confirma presenças e organiza o caixa.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Começar teste de 7 dias</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <a
              href="#preview"
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all text-center"
            >
              Ver demonstração interativa
            </a>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Não é necessário cartão de crédito. Configuração em menos de 2 minutos.
          </p>
        </div>

        {/* 3. SHOWCASE INTERATIVO DO PRODUTO (REPLACE ESTÁTICO DE BRANDING POR CÓDIGO & MOTION) */}
        <div id="preview" className="mt-14 max-w-5xl mx-auto px-4 sm:px-6">
          {/* Seletor de Modo do Showcase */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActivePreviewTab('dashboard')}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activePreviewTab === 'dashboard'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {activePreviewTab === 'dashboard' && (
                  <motion.div
                    layoutId="previewTabHighlight"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Painel da Recepção</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewTab('mobile')}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activePreviewTab === 'mobile'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {activePreviewTab === 'mobile' && (
                  <motion.div
                    layoutId="previewTabHighlight"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Agendamento do Cliente (Celular)</span>
              </button>
            </div>
          </div>

          {/* Janela de Demonstração */}
          <div className="relative rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/5 p-4 sm:p-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {activePreviewTab === 'dashboard' ? (
                <motion.div
                  key="dashboard-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Top Bar da Janela */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-200" />
                      <span className="w-3 h-3 rounded-full bg-slate-200" />
                      <span className="w-3 h-3 rounded-full bg-slate-200" />
                      <span className="ml-2 text-xs font-mono text-slate-400">
                        marquesuahora.com.br/dashboard
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        Atendimento em andamento
                      </span>
                    </div>
                  </div>

                  {/* 4 Cards de Métricas Reais com Mini Sparklines */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Agendamentos hoje</span>
                      <div className="mt-1 text-2xl font-bold font-display text-slate-900">12</div>
                      <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                        +20% vs ontem
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Clientes ativos</span>
                      <div className="mt-1 text-2xl font-bold font-display text-slate-900">86</div>
                      <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                        +12% no mês
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Faturamento hoje</span>
                      <div className="mt-1 text-2xl font-bold font-display text-slate-900">
                        R$ 2.480,00
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                        +18% no dia
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Presença confirmada</span>
                      <div className="mt-1 text-2xl font-bold font-display text-slate-900">96%</div>
                      <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                        Faltas zeradas
                      </span>
                    </div>
                  </div>

                  {/* Lista de Atendimentos do Dia com Status */}
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Próximos atendimentos da bancada
                      </span>
                      <span className="text-xs text-slate-500">Hoje</span>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-700 w-12">09:00</span>
                          <div>
                            <strong className="text-slate-900 font-semibold">Juliana Costa</strong>
                            <span className="text-slate-500 ml-2">Corte &amp; Escova Modelada</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Confirmado
                        </span>
                      </div>

                      <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-700 w-12">10:30</span>
                          <div>
                            <strong className="text-slate-900 font-semibold">Mariana Lima</strong>
                            <span className="text-slate-500 ml-2">Coloração &amp; Tratamento</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Confirmado
                        </span>
                      </div>

                      <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-700 w-12">14:00</span>
                          <div>
                            <strong className="text-slate-900 font-semibold">Fernanda Alves</strong>
                            <span className="text-slate-500 ml-2">Manicure e Spa dos Pés</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Na cadeira
                        </span>
                      </div>

                      <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-700 w-12">16:30</span>
                          <div>
                            <strong className="text-slate-900 font-semibold">Camila Rodrigues</strong>
                            <span className="text-slate-500 ml-2">Limpeza de Pele Profunda</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Confirmado
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center py-6"
                >
                  {/* Smartphone Frame em código puro */}
                  <div className="w-full max-w-sm rounded-[36px] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800">
                    <div className="rounded-[28px] bg-[#FAF9F6] p-5 text-slate-900 space-y-4 text-left">
                      {/* Topo do Celular */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                          <h4 className="font-display font-bold text-sm text-slate-900">
                            Studio Elegance
                          </h4>
                          <span className="text-[11px] text-slate-500">Agendamento online</span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>

                      {/* Escolha do Serviço */}
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block mb-2">
                          1. Escolha o procedimento
                        </span>
                        <div className="p-3 rounded-xl bg-white border-2 border-purple-600 shadow-sm flex items-center justify-between">
                          <div>
                            <strong className="text-xs text-slate-900 block font-semibold">
                              Corte &amp; Escova Modelada
                            </strong>
                            <span className="text-[11px] text-slate-500">45 minutos</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-purple-700">
                            R$ 95,00
                          </span>
                        </div>
                      </div>

                      {/* Horário */}
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block mb-2">
                          2. Horários disponíveis hoje
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            className="py-2 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-600 hover:border-purple-600"
                          >
                            14:00
                          </button>
                          <button
                            type="button"
                            className="py-2 rounded-lg bg-purple-600 text-white text-xs font-mono font-bold shadow-sm"
                          >
                            15:30
                          </button>
                          <button
                            type="button"
                            className="py-2 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-600 hover:border-purple-600"
                          >
                            17:00
                          </button>
                        </div>
                      </div>

                      {/* Botão de confirmação sem fricção */}
                      <div className="pt-2">
                        <div className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold text-center shadow-md">
                          Confirmar em 1 toque
                        </div>
                        <span className="text-[10px] text-center text-slate-400 block mt-1.5">
                          Sem cadastro prévio • Aviso enviado no WhatsApp
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 4. SIMULADOR POR NICHO (SEM BADGES ARTIFICIAIS) */}
      <section id="simulator" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
              Adaptado para a rotina de cada nicho
            </h2>
            <p className="mt-3 text-slate-600 text-sm">
              Cada setor possui regras próprias de escala, tempo de atendimento e terminologia.
            </p>
          </div>

          {/* Abas dos Nichos */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {NICHES.map((niche) => {
              const isSelected = selectedNiche.id === niche.id;
              return (
                <button
                  key={niche.id}
                  type="button"
                  onClick={() => setSelectedNiche(niche)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {niche.label}
                </button>
              );
            })}
          </div>

          {/* Card Detalhado do Nicho */}
          <div className="bg-[#FAF9F7] border border-slate-200/90 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900">
                  {selectedNiche.headline}
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">{selectedNiche.tagline}</p>
              </div>

              <Link
                href={`/onboarding?niche=${selectedNiche.id}`}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-xl transition-colors self-start md:self-auto"
              >
                Ativar para meu negócio →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Profissional
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {selectedNiche.terminology.prof}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Adaptado na vitrine e escala</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Espaço ou Equipamento
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {selectedNiche.terminology.space}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Evita conflito de máquina ou sala</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Procedimento Típico
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {selectedNiche.terminology.service}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Com intervalo contínuo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALCULADORA DE NO-SHOW (SEM BADGES ARTIFICIAIS) */}
      <section id="calculator" className="py-20 bg-[#FBFBFA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
              Calcule quanto as faltas custam no mês
            </h2>
            <p className="mt-3 text-slate-600 text-sm">
              Clientes que faltam sem desmarcar deixam a cadeira ociosa e geram prejuízo na escala.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            {/* Controles de Sliders */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                  <span>Atendimentos diários na equipe</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {dailyAppointments} clientes/dia
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={dailyAppointments}
                  onChange={(e) => setDailyAppointments(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                  <span>Valor médio por atendimento</span>
                  <span className="font-mono text-slate-900 font-bold">
                    R$ {averageTicket},00
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="400"
                  step="5"
                  value={averageTicket}
                  onChange={(e) => setAverageTicket(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                  <span>Média de ausências sem aviso</span>
                  <span className="font-mono text-rose-600 font-bold">
                    {noShowRate}% dos agendamentos
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  value={noShowRate}
                  onChange={(e) => setNoShowRate(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
              </div>
            </div>

            {/* Resultado Contábil */}
            <div className="lg:col-span-5 bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Perda estimada no mês
                </span>
                <p className="text-2xl sm:text-3xl font-mono font-bold text-rose-400 mt-1">
                  - R$ {lostRevenue.toLocaleString('pt-BR')},00
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cerca de {lostAppointments} horários perdidos na grade.
                </p>
              </div>

              <div className="my-6 border-t border-slate-800 pt-5">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                  Valor recuperável com Sinal PIX
                </span>
                <p className="text-2xl sm:text-3xl font-mono font-bold text-emerald-300 mt-1">
                  + R$ {recoveredRevenue.toLocaleString('pt-BR')},00
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  O adiantamento via PIX reduz ausências em até 90% porque formaliza o compromisso do horário.
                </p>
              </div>

              <Link
                href="/onboarding"
                className="w-full py-3 text-center text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all"
              >
                Proteger minha agenda
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PILARES ESSENCIAIS (EDITORIAL LIMPO, SEM BADGES ARTIFICIAIS) */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
              Recursos pensados para o dia a dia
            </h2>
            <p className="mt-3 text-slate-600 text-sm">
              Ferramentas diretas para a recepção e a equipe de atendimento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAF9F7] border border-slate-200/80">
              <h3 className="text-base font-display font-bold text-slate-900">
                Sinal de reserva no PIX
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Cobre uma taxa de reserva nos horários mais concorridos. O valor entra como sinal e é
                abatido no pagamento final no balcão.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F7] border border-slate-200/80">
              <h3 className="text-base font-display font-bold text-slate-900">
                Agendamento em 30 segundos
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                O cliente escolhe o serviço, o profissional e o horário direto pelo navegador, sem
                precisar instalar aplicativo ou cadastrar senha.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F7] border border-slate-200/80">
              <h3 className="text-base font-display font-bold text-slate-900">
                Fila de espera automática
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Se houver uma desistência, os clientes da lista de espera recebem um aviso automático
                pelo WhatsApp para ocupar o horário vago.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PLANOS SIMPLES (SEM BADGES POLUÍDOS) */}
      <section id="pricing" className="py-20 bg-[#FBFBFA] border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
              Planos claros para cada fase
            </h2>
            <p className="mt-3 text-slate-600 text-sm">
              Todos os planos contam com 7 dias de teste completo e suporte humano.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Solo */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500">Individual</span>
                <h3 className="text-xl font-display font-bold text-slate-900 mt-1">Solo</h3>
                <p className="text-xs text-slate-500 mt-1">Para quem atende sozinho</p>
                <div className="mt-4 font-mono font-bold text-3xl text-slate-900">
                  R$ 49,90<span className="text-xs font-normal text-slate-400">/mês</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 1 profissional ativo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Agendamentos ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Vitrine no celular
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Sinal de reserva PIX
                  </li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="mt-8 w-full py-2.5 text-center text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Testar por 7 dias
              </Link>
            </div>

            {/* Equipe Pro */}
            <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-purple-700">Espaços e Salões</span>
                <h3 className="text-xl font-display font-bold text-slate-900 mt-1">Equipe Pro</h3>
                <p className="text-xs text-slate-500 mt-1">Para equipes em crescimento</p>
                <div className="mt-4 font-mono font-bold text-3xl text-slate-900">
                  R$ 99,90<span className="text-xs font-normal text-slate-400">/mês</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Até 5 profissionais
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Fila de espera automática
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Cálculo de comissões
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Controle de salas e cabines
                  </li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="mt-8 w-full py-2.5 text-center text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Testar por 7 dias
              </Link>
            </div>

            {/* VIP + IA */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500">Automação total</span>
                <h3 className="text-xl font-display font-bold text-slate-900 mt-1">VIP + IA</h3>
                <p className="text-xs text-slate-500 mt-1">Para operações com alto fluxo</p>
                <div className="mt-4 font-mono font-bold text-3xl text-slate-900">
                  R$ 199,90<span className="text-xs font-normal text-slate-400">/mês</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Profissionais ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Atendente Virtual WhatsApp
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Ficha de anamnese com fotos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Suporte prioritário
                  </li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="mt-8 w-full py-2.5 text-center text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Testar por 7 dias
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. RODAPÉ SÓBRIO E ELEGANTE */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-36 h-10">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
            <span className="text-xs text-slate-400">
              © {new Date().getFullYear()} Marque Sua Hora.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link href="/onboarding" className="hover:text-white transition-colors">
              Cadastrar negócio
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Acesso assinante
            </Link>
            <a href="#calculator" className="hover:text-white transition-colors">
              Calculadora
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Planos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
