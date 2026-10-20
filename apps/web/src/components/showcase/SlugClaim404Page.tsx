'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock,
  Copy,
  Check,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users,
  Zap,
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface SlugClaim404PageProps {
  slug: string;
}

export function SlugClaim404Page({ slug }: SlugClaim404PageProps) {
  const [copied, setCopied] = useState(false);
  const cleanSlug = (slug || '').toLowerCase().trim();
  const fullUrl = `marquesuahora.com.br/${cleanSlug}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`https://${fullUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-slate-900 flex flex-col font-sans selection:bg-[#5c0701]/10 selection:text-[#5c0701]">
      {/* 1. Header Oficial do MarqueSuaHora com Brandkit */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group py-1">
            <div className="relative h-11 sm:h-13 w-48 sm:w-64 flex items-center">
              <Image
                src="/brand/logooficial-semfundo.png"
                alt="Marque Sua Hora"
                width={260}
                height={70}
                className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Entrar
            </Link>
            <a
              href="#planos"
              className="hidden sm:inline-block text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Ver Planos
            </a>
            <Link
              href={`/cadastro?slug=${encodeURIComponent(cleanSlug)}&plan=free`}
              className="text-xs sm:text-sm font-bold bg-[#5c0701] hover:bg-[#480501] text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs transition-all active:scale-95"
            >
              Testar Gratuitamente
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Principal de Lead Capture & Reserva */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center">
        {/* Badge 404 Institucional do Brandkit */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5c0701]/10 border border-[#5c0701]/20 text-[#5c0701] text-xs font-bold shadow-2xs mb-6">
          <span className="w-2 h-2 rounded-full bg-[#5c0701] shrink-0 animate-pulse" />
          <span>Aviso 404 • Endereço disponível para ativação oficial</span>
        </div>

        {/* Headline de Apropriação */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mb-4">
          O link <span className="text-[#5c0701] underline decoration-[#5c0701]/30 decoration-wavy underline-offset-4">{fullUrl}</span> ainda não tem dono!
        </h1>

        {/* Texto Explicativo de Alto Valor */}
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mb-8 leading-relaxed">
          Você tentou acessar uma página de agendamento que ainda não foi registrada. Se este é o nome do seu salão, estúdio, barbearia, clínica ou atendimento autônomo, <strong>garanta o seu endereço oficial agora mesmo</strong> e comece a receber agendamentos com proteção anti-falta.
        </p>

        {/* Card de Reserva Oficial do Link */}
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 sm:p-8 text-left mb-12">
          {/* Topo do Card com URL e Ação de Copiar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 truncate">
                https://{fullUrl}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-[#5c0701] bg-[#5c0701]/10 px-2.5 py-0.5 rounded-full border border-[#5c0701]/20">
                Disponível • Teste Gratuito
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
                title="Copiar endereço"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3 Benefícios de Alto Impacto do MarqueSuaHora */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200/60">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900 font-bold">Link exclusivo na bio do Instagram e WhatsApp:</strong> suas clientes agendam sozinhas em 4 passos rápidos pelo celular, sem precisar baixar aplicativos.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-[#5c0701]/10 text-[#5c0701] flex items-center justify-center shrink-0 mt-0.5 border border-[#5c0701]/20">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900 font-bold">Proteção Anti-Falta (Sinal PIX 100% Direto):</strong> acabe com no-shows cobrando sinal antecipado que vai 100% direto para a sua conta bancária, sem nenhuma taxa ou retenção da plataforma.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/60">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900 font-bold">Ativação imediata e sem fidelidade:</strong> comece a organizar seus horários hoje mesmo, com liberdade total para cancelar ou mudar de plano quando quiser.
              </div>
            </div>
          </div>

          {/* Box Informativo: Para quem quer testar ou tem poucos clientes */}
          <div className="p-4 rounded-2xl bg-[#5c0701]/5 border border-[#5c0701]/15 text-xs text-slate-700 flex items-start gap-3 mb-6">
            <div className="w-6 h-6 rounded-lg bg-[#5c0701] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="leading-relaxed">
              <strong className="text-slate-900 font-bold">Quer apenas testar ou tem poucos clientes no momento?</strong>
              <p className="mt-0.5 text-slate-600">
                Você pode cadastrar gratuitamente para testar o sistema. O plano gratuito oferece até <strong>30 agendamentos por mês sem pagar nada</strong>, ideal para quem está começando o próprio negócio.
              </p>
            </div>
          </div>

          {/* Botões de Ação Primário e Secundário */}
          <div className="space-y-2.5">
            <a
              href="#planos"
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#5c0701] hover:bg-[#480501] text-white font-extrabold text-sm sm:text-base shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <span>Garantir este endereço oficial e escolher plano</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <Link
              href={`/cadastro?slug=${encodeURIComponent(cleanSlug)}&plan=free`}
              className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition-all text-center"
            >
              <span>Cadastrar gratuitamente para testar (até 30 agendamentos/mês)</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* 3. SEÇÃO DE PLANOS TRANSPARENTES (Falar dos Planos) */}
        <section id="planos" className="w-full pt-6 pb-12 scroll-mt-24">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5c0701] bg-[#5c0701]/10 px-3 py-1 rounded-full border border-[#5c0701]/20">
              Planos & Investimento
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
              Escolha o plano ideal para o seu momento
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Comece gratuitamente para testar ou assine um plano com agendamentos ilimitados e lembretes automáticos no WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* 1. PLANO GRATUITO */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
              <div>
                <div className="h-7 mb-3" />
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Plano Gratuito
                </h3>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">R$ 0,00</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500">/mês</span>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Até 30 agendamentos por mês</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 profissional cadastrado</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Link na bio personalizável</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Catálogo de serviços e preços</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-purple-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Central de Suporte Oficial com IA</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/cadastro?slug=${encodeURIComponent(cleanSlug)}&plan=free`}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-bold text-xs sm:text-sm text-center transition-all"
              >
                Cadastrar Grátis para Testar
              </Link>
            </div>

            {/* 2. PLANO PROFISSIONAL SOLO */}
            <div className="bg-white rounded-3xl border-2 border-[#5c0701] p-6 sm:p-7 flex flex-col justify-between shadow-lg relative">
              <div>
                <div className="h-7 mb-3 flex items-center">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                    MAIS POPULAR
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Profissional Solo
                </h3>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">R$ 49,99</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500">/mês</span>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Agendamentos ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 profissional cadastrado</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automações de WhatsApp (Lembretes & Confirmações)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Proteção Anti-Falta (Sinal PIX Direto)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-purple-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Central de Suporte Oficial com IA</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Galeria de fotos de procedimentos</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sem fidelidade (cancele quando quiser)</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/cadastro?slug=${encodeURIComponent(cleanSlug)}&plan=solo`}
                className="w-full py-3.5 px-4 rounded-xl bg-[#5c0701] hover:bg-[#480501] text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-all"
              >
                Garantir com Plano Solo
              </Link>
            </div>

            {/* 3. PLANO EQUIPE PRO */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-[#5c0701]/40 transition-all">
              <div>
                <div className="h-7 mb-3 flex items-center">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-black uppercase tracking-wider">
                    PARA SALÕES & EQUIPES
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Equipe Pro
                </h3>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">R$ 99,99</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500">/mês</span>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Agendamentos ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Até 5 profissionais na equipe</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-purple-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Copiloto IA (Comandos de Voz & Texto)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-purple-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Lembretes automáticos no WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Módulo de Cursos Online para alunas</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-purple-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Central de Suporte Oficial com IA</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cálculo de Comissões e Relatórios</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/cadastro?slug=${encodeURIComponent(cleanSlug)}&plan=equipe`}
                className="w-full py-3.5 px-4 rounded-xl border-2 border-[#5c0701] text-[#5c0701] hover:bg-[#5c0701] hover:text-white font-bold text-xs sm:text-sm text-center transition-all"
              >
                Garantir com Plano Equipe Pro
              </Link>
            </div>
          </div>

          {/* Destaque de Segurança do Repasse PIX */}
          <div className="mt-8 max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs sm:text-sm font-medium flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold">100% do sinal PIX direto na sua conta bancária:</strong> o MarqueSuaHora não retém seu faturamento nem cobra taxa por agendamento realizado.
            </div>
          </div>
        </section>

        {/* 4. Três Cards de Recursos da Plataforma */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Agenda Aberta 24 Horas</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Não perca agendamentos à noite ou em horários de atendimento. O sistema organiza tudo automaticamente.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <WhatsAppIcon variant="official" size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Confirmação no WhatsApp</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Envio automático de lembretes e comprovantes com botão de WhatsApp oficial para reduzir no-shows a zero.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Ficha de Anamnese & Fotos</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Armazene o histórico de saúde, alergias e fotos de antes/depois de cada cliente com segurança.
            </p>
          </div>
        </div>

        {/* Rodapé de Navegação */}
        <div className="mt-12 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-3">
          <span>Digitou o endereço incorreto ou procura outro estabelecimento?</span>
          <Link href="/" className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2">
            Página Inicial
          </Link>
          <span>•</span>
          <Link href="/login" className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2">
            Acessar Meu Painel
          </Link>
        </div>
      </main>
    </div>
  );
}
