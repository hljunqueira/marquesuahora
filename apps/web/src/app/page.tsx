'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  MessageSquare,
  Users,
  Smartphone,
  ChevronRight,
  DollarSign
} from 'lucide-react';

const niches = [
  {
    id: 'BARBERSHOP',
    label: 'Barbearia',
    icon: '💈',
    headline: 'Para cavalheiros exigentes',
    terminology: { prof: 'Barbeiro', space: 'Cadeira', service: 'Corte Degradê & Barba Terapia' },
    accent: '#D4AF37',
    tagline: 'Cerveja gelada, navalha afiada e zero atraso na bancada.'
  },
  {
    id: 'BEAUTY_SALON',
    label: 'Salão de Beleza',
    icon: '💇‍♀️',
    headline: 'Elegância e cuidado capilar',
    terminology: { prof: 'Cabeleireira(o)', space: 'Bancada', service: 'Mechas Criativas & Escova Modelada' },
    accent: '#7C3AED',
    tagline: 'Gestão de combos químicos sem sobreposição de horários.'
  },
  {
    id: 'AESTHETICS_CLINIC',
    label: 'Clínica de Estética',
    icon: '🧴',
    headline: 'Saúde, precisão e bem-estar',
    terminology: { prof: 'Biomédica(o)', space: 'Cabine', service: 'Harmonização & Peeling Químico' },
    accent: '#C07A65',
    tagline: 'Ficha de anamnese digital integrada e controle de salas.'
  },
  {
    id: 'PERSONAL_TRAINER',
    label: 'Personal Trainer',
    icon: '🏋️',
    headline: 'Performance e evolução física',
    terminology: { prof: 'Personal Trainer', space: 'Área de Treino', service: 'Consultoria VIP & Bioimpedância' },
    accent: '#2563EB',
    tagline: 'Gestão de pacotes de sessões e janela de deslocamento.'
  },
  {
    id: 'NAIL_LASH_STUDIO',
    label: 'Unhas & Cílios',
    icon: '💅',
    headline: 'Design refinado e durabilidade',
    terminology: { prof: 'Lash / Nail Designer', space: 'Poltrona', service: 'Alongamento Fibra & Volume Russo' },
    accent: '#E11D48',
    tagline: 'Perguntas prévias de remoção e manutenção programada.'
  }
];

export default function LandingPage() {
  const [selectedNiche, setSelectedNiche] = useState(niches[0]);

  // Calculadora de No-Show
  const [dailyAppointments, setDailyAppointments] = useState(10);
  const [averageTicket, setAverageTicket] = useState(70);
  const [noShowRate, setNoShowRate] = useState(15);

  const monthlyTotalClients = dailyAppointments * 24;
  const lostAppointments = Math.round(monthlyTotalClients * (noShowRate / 100));
  const lostRevenue = lostAppointments * averageTicket;
  const recoveredRevenue = Math.round(lostRevenue * 0.92);

  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] text-slate-900 selection:bg-brand-purple/20 selection:text-brand-purple">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-44 h-12 flex items-center">
              <Image
                src="/brand/logo-semfundo.png"
                alt="Marca Tua Hora Logo"
                fill
                className="object-contain object-left group-hover:scale-[1.02] transition-transform duration-300"
                priority
              />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#simulator" className="hover:text-brand-purple transition-colors">
              Simulador por Nicho
            </a>
            <a href="#calculator" className="hover:text-brand-purple transition-colors">
              Calculadora No-Show
            </a>
            <a href="#pillars" className="hover:text-brand-purple transition-colors">
              Diferenciais
            </a>
            <a href="#pricing" className="hover:text-brand-purple transition-colors">
              Planos
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-purple hover:bg-purple-700 active:scale-95 rounded-xl shadow-lg shadow-brand-purple/20 transition-all flex items-center gap-2"
            >
              <span>Experimentar Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Glow de Fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-brand-purple/15 to-amber-200/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple/10 text-brand-purple border border-brand-purple/20 text-xs font-semibold tracking-wide uppercase mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
            <span>Plataforma Premium de Agendamentos & Gestão</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-slate-900 tracking-tight leading-[1.15]"
          >
            A experiência de agendamento que seu cliente de{' '}
            <span className="bg-gradient-to-r from-brand-purple via-indigo-600 to-amber-600 bg-clip-text text-transparent">
              alto padrão
            </span>{' '}
            merece.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 font-serif italic max-w-3xl mx-auto leading-relaxed"
          >
            Elimine as faltas que corroem seu faturamento com o No-Show Shield, encante sua clientela
            com uma vitrine rápida sem login forçado e ganhe tempo para focar no que você faz de melhor.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/onboarding"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Criar Loja em 2 Minutos</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#simulator"
              className="w-full sm:w-auto px-7 py-4 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm transition-all"
            >
              Conhecer por Nicho
            </a>
          </motion.div>

          {/* Social Proof Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 7 dias de teste grátis
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sem cartão para começar
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sinal PIX anti-faltas
            </span>
          </div>
        </div>
      </section>

      {/* Simulador Interativo por Nicho */}
      <section id="simulator" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-purple">
              Terminologia & Atmosfera Sob Medida
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-display font-bold text-slate-900">
              Nada de sistema genérico. A plataforma fala a língua do seu negócio.
            </p>
            <p className="mt-3 text-slate-600 text-sm">
              Clique nos nichos abaixo e veja a vitrine e o painel mudarem instantaneamente.
            </p>
          </div>

          {/* Pill Selector */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {niches.map((niche) => {
              const isSelected = selectedNiche.id === niche.id;
              return (
                <button
                  key={niche.id}
                  onClick={() => setSelectedNiche(niche)}
                  className={`relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{niche.icon}</span>
                  <span>{niche.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Card Display */}
          <div className="relative max-w-4xl mx-auto bg-[#FDFBF9] border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-luxury overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
              <div>
                <span className="text-2xl mr-2">{selectedNiche.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {selectedNiche.label}
                </span>
                <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">
                  {selectedNiche.headline}
                </h3>
                <p className="text-sm text-slate-600 mt-1">{selectedNiche.tagline}</p>
              </div>

              <Link
                href={`/onboarding?niche=${selectedNiche.id}`}
                className="px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-xl shadow-sm transition-all"
              >
                Configurar para meu salão →
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs uppercase font-semibold text-slate-400">Profissional</span>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {selectedNiche.terminology.prof}
                </p>
                <p className="text-xs text-slate-500 mt-1">Termo usado no catálogo e na escala</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs uppercase font-semibold text-slate-400">Espaço Físico</span>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {selectedNiche.terminology.space}
                </p>
                <p className="text-xs text-slate-500 mt-1">Evita conflitos de sala ou bancada</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs uppercase font-semibold text-slate-400">Serviço Sugerido</span>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {selectedNiche.terminology.service}
                </p>
                <p className="text-xs text-slate-500 mt-1">Com duração e intervalo contínuo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculadora de Perdas por No-Show */}
      <section id="calculator" className="py-20 bg-[#FAF9F6]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Impacto Financeiro Real
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-display font-bold text-slate-900">
              Quanto dinheiro as faltas de clientes tiram do seu bolso todo mês?
            </p>
            <p className="mt-3 text-slate-600 text-sm">
              Ajuste os controles abaixo de acordo com a realidade do seu espaço.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-card">
            {/* Sliders */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2">
                  <span>Atendimentos por dia</span>
                  <span className="font-mono text-brand-purple font-bold text-base">
                    {dailyAppointments} clientes/dia
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={dailyAppointments}
                  onChange={(e) => setDailyAppointments(Number(e.target.value))}
                  className="w-full accent-brand-purple cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2">
                  <span>Ticket médio do serviço</span>
                  <span className="font-mono text-brand-purple font-bold text-base">
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
                  className="w-full accent-brand-purple cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2">
                  <span>Taxa média de faltas (No-Show)</span>
                  <span className="font-mono text-red-600 font-bold text-base">
                    {noShowRate}% dos clientes
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  value={noShowRate}
                  onChange={(e) => setNoShowRate(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Média brasileira em salões e clínicas varia entre 12% e 22%.
                </p>
              </div>
            </div>

            {/* Resultado em Destaque */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-7 rounded-2xl flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Prejuízo Mensal Atual
                </span>
                <p className="text-3xl font-mono font-extrabold text-red-400 mt-1">
                  - R$ {lostRevenue.toLocaleString('pt-BR')},00
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Aproximadamente {lostAppointments} horários vagos sem faturamento.
                </p>
              </div>

              <div className="my-6 border-t border-slate-700 pt-6">
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Recuperável com Sinal PIX
                </span>
                <p className="text-3xl font-mono font-extrabold text-emerald-300 mt-1">
                  + R$ {recoveredRevenue.toLocaleString('pt-BR')},00
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  O sinal PIX compromete o cliente e reduz a ausência em mais de 90%.
                </p>
              </div>

              <Link
                href="/onboarding"
                className="w-full py-3 text-center text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-md active:scale-95"
              >
                Blindar Meus Agendamentos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Pilares de Diferenciais */}
      <section id="pillars" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-purple">
              Tecnologia que Gera Resultado
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-display font-bold text-slate-900">
              Tudo o que sua recepção e seus clientes precisam em um só lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FAF9F6] p-8 rounded-3xl border border-slate-200/80 hover:shadow-card transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 text-brand-purple flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">
                No-Show Shield via PIX
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Exija uma taxa de reserva simbólica (fixa ou percentual) para novos clientes. O código
                PIX com expiração de 15 minutos garante o comparecimento real.
              </p>
            </div>

            <div className="bg-[#FAF9F6] p-8 rounded-3xl border border-slate-200/80 hover:shadow-card transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">
                Vitrine Editorial Fluida
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Seu cliente agenda em menos de 45 segundos direto do smartphone. Sem login obrigatório,
                com seleção de múltiplos serviços e gaveta contínua de horário.
              </p>
            </div>

            <div className="bg-[#FAF9F6] p-8 rounded-3xl border border-slate-200/80 hover:shadow-card transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">
                Lista de Espera Inteligente
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Teve um cancelamento de última hora? A plataforma avisa automaticamente os clientes na
                fila de espera pelo WhatsApp, preenchendo a vaga sem perda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabela de Planos Customizados */}
      <section id="pricing" className="py-20 bg-[#FAF9F6] border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-purple">
            Planos Transparentes
          </h2>
          <p className="mt-2 text-3xl sm:text-4xl font-display font-bold text-slate-900">
            Escolha o plano ideal para a escala do seu negócio
          </p>
          <p className="mt-3 text-slate-600 text-sm max-w-xl mx-auto">
            Todos os planos incluem 7 dias de teste grátis com suporte dedicado e vitrine personalizada.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Plano Solo */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Profissional Solo
                </span>
                <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">Solo VIP</h3>
                <p className="text-xs text-slate-500 mt-1">Para quem trabalha sozinho e quer agilidade</p>
                <div className="mt-6 font-mono font-extrabold text-3xl text-slate-900">
                  R$ 49,90<span className="text-xs font-sans text-slate-400 font-normal">/mês</span>
                </div>
                <ul className="mt-6 flex flex-col gap-3 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1 Profissional Ativo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Agendamentos Ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Vitrine Personalizada
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sinal PIX Anti-Faltas
                  </li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="mt-8 w-full py-3 text-center text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Começar Teste Grátis
              </Link>
            </div>

            {/* Plano Equipe Pro */}
            <div className="relative bg-white p-8 rounded-3xl border-2 border-brand-purple shadow-luxury flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-purple text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                Mais Escolhido
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-purple">
                  Salões & Clínicas
                </span>
                <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">Equipe Pro</h3>
                <p className="text-xs text-slate-500 mt-1">Gestão completa para equipes em crescimento</p>
                <div className="mt-6 font-mono font-extrabold text-3xl text-slate-900">
                  R$ 99,90<span className="text-xs font-sans text-slate-400 font-normal">/mês</span>
                </div>
                <ul className="mt-6 flex flex-col gap-3 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Até 5 Profissionais
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Agendamentos Ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lista de Espera Inteligente
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Gestão de Comissões
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Gestão de Salas & Cabines
                  </li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="mt-8 w-full py-3 text-center text-sm font-semibold text-white bg-brand-purple hover:bg-purple-700 rounded-xl shadow-md shadow-brand-purple/20 transition-all"
              >
                Começar Teste Grátis
              </Link>
            </div>

            {/* Plano VIP + IA */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Alta Escala
                </span>
                <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">VIP + Atendente IA</h3>
                <p className="text-xs text-slate-500 mt-1">Automação total via WhatsApp e equipes grandes</p>
                <div className="mt-6 font-mono font-extrabold text-3xl text-slate-900">
                  R$ 199,90<span className="text-xs font-sans text-slate-400 font-normal">/mês</span>
                </div>
                <ul className="mt-6 flex flex-col gap-3 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Profissionais Ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Atendente Virtual WhatsApp
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ficha de Anamnese com Fotos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Suporte Prioritário por Ticket
                  </li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="mt-8 w-full py-3 text-center text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Começar Teste Grátis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="relative w-40 h-10">
              <Image
                src="/brand/logo-semfundo.png"
                alt="Marca Tua Hora Logo"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Marca Tua Hora. Todos os direitos reservados.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/onboarding" className="hover:text-white transition-colors">
              Cadastrar Salão
            </Link>
            <a href="#simulator" className="hover:text-white transition-colors">
              Nossos Nichos
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
