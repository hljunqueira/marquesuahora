'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  Scissors,
  DollarSign,
  UserCheck,
  Package,
  GraduationCap,
  Star,
  RefreshCw,
  Loader2,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ReportPeriodSelector, DateRange } from '@/components/reports/ReportPeriodSelector';
import { ReportPdfExportButton } from '@/components/reports/ReportPdfExportButton';
import { ReportPaywallUpgrade } from '@/components/reports/ReportPaywallUpgrade';
import { ReportPrintView } from '@/components/reports/ReportPrintView';

// Subcomponents tabs
import { ReportClientsTab } from '@/components/reports/tabs/ReportClientsTab';
import { ReportSchedulesTab } from '@/components/reports/tabs/ReportSchedulesTab';
import { ReportServicesTab } from '@/components/reports/tabs/ReportServicesTab';
import { ReportFinancialTab } from '@/components/reports/tabs/ReportFinancialTab';
import { ReportTeamTab } from '@/components/reports/tabs/ReportTeamTab';
import { ReportProductsTab } from '@/components/reports/tabs/ReportProductsTab';
import { ReportCoursesTab } from '@/components/reports/tabs/ReportCoursesTab';
import { ReportReputationTab } from '@/components/reports/tabs/ReportReputationTab';

type ReportTabId =
  | 'overview'
  | 'clients'
  | 'schedules'
  | 'services'
  | 'financial'
  | 'team'
  | 'products'
  | 'courses'
  | 'reputation';

export default function DashboardRelatoriosPage() {
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('SOLO');
  const [tenantName, setTenantName] = useState<string>('MarqueSuaHora');
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const [tenantColor, setTenantColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_primary_color') || '#5c0701';
    }
    return '#5c0701';
  });

  useEffect(() => {
    const syncColor = (e: any) => {
      const saved = localStorage.getItem('tenant_primary_color');
      if (saved) setTenantColor(saved);
      if (e?.detail?.primaryColor) setTenantColor(e.detail.primaryColor);
    };
    window.addEventListener('storage', syncColor);
    window.addEventListener('marquesuahora_tenant_sync', syncColor);
    return () => {
      window.removeEventListener('storage', syncColor);
      window.removeEventListener('marquesuahora_tenant_sync', syncColor);
    };
  }, []);

  // Período de Filtro
  const getDefaultDateRange = (): DateRange => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      startDate: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
      endDate: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`,
      label: firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [activeTab, setActiveTab] = useState<ReportTabId>('overview');
  const [loadingData, setLoadingData] = useState(false);

  // Armazenamento de dados das abas
  const [overviewData, setOverviewData] = useState<any>(null);
  const [clientsData, setClientsData] = useState<any>(null);
  const [schedulesData, setSchedulesData] = useState<any>(null);
  const [servicesData, setServicesData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any>(null);
  const [coursesData, setCoursesData] = useState<any>(null);
  const [reputationData, setReputationData] = useState<any>(null);

  // 1. Checagem inicial do plano
  useEffect(() => {
    async function checkPlan() {
      try {
        setIsCheckingPlan(true);
        const res = await api.get('/reports/plan-status');
        if (res.data) {
          setIsAllowed(res.data.isAllowed);
          setCurrentPlan(res.data.currentPlan || 'SOLO');
          if (res.data.tenantName) setTenantName(res.data.tenantName);
          if (res.data.tenantPrimaryColor) {
            setTenantColor(res.data.tenantPrimaryColor);
            localStorage.setItem('tenant_primary_color', res.data.tenantPrimaryColor);
          }
        }
      } catch (err: any) {
        console.error('Erro ao verificar permissão do plano:', err);
        if (err.response?.status === 403) {
          setIsAllowed(false);
        } else {
          setIsAllowed(true);
        }
      } finally {
        setIsCheckingPlan(false);
      }
    }
    checkPlan();
  }, []);

  // 2. Carregamento dos dados de acordo com a aba ativa
  const fetchReportData = useCallback(async () => {
    if (!isAllowed) return;
    try {
      setLoadingData(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      // Sempre carrega overview e a aba ativa
      const requests: Promise<any>[] = [api.get('/reports/overview', { params })];

      if (activeTab === 'clients' || activeTab === 'overview') {
        requests.push(api.get('/reports/clients', { params }));
      }
      if (activeTab === 'schedules' || activeTab === 'overview') {
        requests.push(api.get('/reports/schedules', { params }));
      }
      if (activeTab === 'services' || activeTab === 'overview') {
        requests.push(api.get('/reports/services', { params }));
      }
      if (activeTab === 'financial' || activeTab === 'overview') {
        requests.push(api.get('/reports/financial', { params }));
      }
      if (activeTab === 'team' || activeTab === 'overview') {
        requests.push(api.get('/reports/team', { params }));
      }
      if (activeTab === 'products') {
        requests.push(api.get('/reports/products', { params }));
      }
      if (activeTab === 'courses') {
        requests.push(api.get('/reports/courses', { params }));
      }
      if (activeTab === 'reputation') {
        requests.push(api.get('/reports/reputation', { params }));
      }

      const results = await Promise.allSettled(requests);

      results.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value?.data) {
          const val = res.value.data;
          if (index === 0) setOverviewData(val);
          else if (activeTab === 'clients') setClientsData(val);
          else if (activeTab === 'schedules') setSchedulesData(val);
          else if (activeTab === 'services') setServicesData(val);
          else if (activeTab === 'financial') setFinancialData(val);
          else if (activeTab === 'team') setTeamData(val);
          else if (activeTab === 'products') setProductsData(val);
          else if (activeTab === 'courses') setCoursesData(val);
          else if (activeTab === 'reputation') setReputationData(val);
          else if (activeTab === 'overview') {
            if (index === 1) setClientsData(val);
            if (index === 2) setSchedulesData(val);
            if (index === 3) setServicesData(val);
            if (index === 4) setFinancialData(val);
            if (index === 5) setTeamData(val);
          }
        }
      });
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
    } finally {
      setLoadingData(false);
    }
  }, [isAllowed, activeTab, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (isAllowed) {
      fetchReportData();
    }
  }, [isAllowed, activeTab, dateRange.startDate, dateRange.endDate, fetchReportData]);

  // Formatação de valores
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  // Loading do plano
  if (isCheckingPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: tenantColor }} />
        <p className="text-sm text-slate-500 font-medium">Carregando permissões de inteligência...</p>
      </div>
    );
  }

  // Paywall para planos inferiores (Free/Solo)
  if (isAllowed === false) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <ReportPaywallUpgrade currentPlan={currentPlan} />
      </div>
    );
  }

  const tabs: { id: ReportTabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Visão Geral 360°', icon: BarChart3 },
    { id: 'clients', label: 'Clientes & LTV', icon: Users },
    { id: 'schedules', label: 'Agendamentos', icon: Calendar },
    { id: 'services', label: 'Serviços', icon: Scissors },
    { id: 'financial', label: 'Financeiro & PIX', icon: DollarSign },
    { id: 'team', label: 'Equipe & Comissões', icon: UserCheck },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'courses', label: 'Cursos & Alunos', icon: GraduationCap },
    { id: 'reputation', label: 'Reputação & NPS', icon: Star },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Visualização de Impressão (invisível em tela, acionada ao imprimir em PDF) */}
      <ReportPrintView
        tenantName={tenantName}
        tenantLogo={tenantLogo}
        periodLabel={dateRange.label}
        overviewData={overviewData}
        topClients={clientsData?.rankingByBookings || []}
        topServices={servicesData?.rankingByRevenue || []}
        teamReport={teamData?.professionals || []}
        tenantPrimaryColor={tenantColor}
      />

      {/* Cabeçalho da Página e Ações */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Relatórios & Business Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Análise integrada de clientes, faturamento, frequência, equipe e proteção anti-falta
          </p>
        </div>

        {/* Barra de Ações: Filtro de Período + Botão PDF */}
        <div className="flex flex-wrap items-center gap-2.5">
          <ReportPeriodSelector value={dateRange} onChange={setDateRange} tenantColor={tenantColor} />
          <button
            type="button"
            onClick={fetchReportData}
            disabled={loadingData}
            aria-label="Atualizar dados"
            className="p-2.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            title="Atualizar dados do período"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
          <ReportPdfExportButton variant="primary" primaryColor={tenantColor} />
        </div>
      </div>

      {/* Barra de Navegação por Abas (Segmented Glass Bar) */}
      <div className="no-print overflow-x-auto pb-1">
        <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100/90 border border-slate-200/90 rounded-2xl min-w-full sm:min-w-0 shadow-2xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={isActive ? { backgroundColor: tenantColor, color: '#ffffff' } : undefined}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'font-bold shadow-xs text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Dinâmico das Abas */}
      <div className="no-print">
        {loadingData && !overviewData ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: tenantColor }} />
            <p className="text-xs text-slate-500 font-medium">Consolidando métricas do período...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Faixa de Destaque Executivo (Resumo Geral) */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[120px]">
                    <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Faturamento Bruto
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
                      {formatBRL(overviewData?.totalRevenue ?? overviewData?.grossRevenue ?? 0)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-1 block font-mono">
                      {overviewData?.totalSchedules ?? overviewData?.totalBookings ?? 0} agendamentos
                    </span>
                  </div>

                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[120px]">
                    <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: tenantColor }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Taxa de Conclusão
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                      {((overviewData?.completionRate ?? overviewData?.attendanceRate ?? 0)).toFixed(1)}%
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">
                      {overviewData?.completedSchedules ?? overviewData?.completedCount ?? 0} atendidos
                    </span>
                  </div>

                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[120px]">
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Cliente Campeão
                    </span>
                    <div
                      className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
                      title={overviewData?.topClient?.name || clientsData?.rankingByBookings?.[0]?.name}
                    >
                      {formatName(overviewData?.topClient?.name || clientsData?.rankingByBookings?.[0]?.name || 'Nenhum')}
                    </div>
                    <span className="text-[11px] font-bold mt-1 block font-mono text-indigo-600">
                      {overviewData?.topClient?.bookings ?? clientsData?.rankingByBookings?.[0]?.totalBookings ?? clientsData?.rankingByBookings?.[0]?.bookingsCount ?? 0} agendamentos
                    </span>
                  </div>

                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[120px]">
                    <div className="absolute top-0 inset-x-0 h-1 bg-teal-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Sinal PIX Retido
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
                      {formatBRL(overviewData?.antiNoShowTotal ?? overviewData?.totalDeposits ?? 0)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                      100% direto na sua conta
                    </span>
                  </div>

                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all col-span-2 md:col-span-1 flex flex-col justify-between min-h-[120px]">
                    <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      NPS & Reputação
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono" style={{ color: (overviewData?.npsReviewsCount || 0) > 0 ? tenantColor : '#94a3b8' }}>
                      {(overviewData?.npsReviewsCount || 0) > 0 ? `${overviewData.npsScore > 0 ? `+${overviewData.npsScore}` : overviewData.npsScore}` : '0'}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                      {(overviewData?.npsReviewsCount || 0) > 0 ? `${overviewData.npsReviewsCount} avaliações` : 'Sem avaliações no período'}
                    </span>
                  </div>
                </div>

                {/* Painel Executivo Integrado (Grid Multi-Módulos 360°) */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Visão Geral Integrada do Estabelecimento
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Acompanhe o desempenho de cada departamento com acesso direto aos detalhes
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Pilar 1: Agendamentos & Frequência */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Agendamentos</h3>
                          </div>
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                            {overviewData?.totalBookings ?? overviewData?.totalSchedules ?? 0} total
                          </span>
                        </div>

                        <div className="space-y-2.5 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Concluídos
                            </span>
                            <span className="font-bold text-slate-900 font-mono">
                              {overviewData?.completedCount ?? overviewData?.completedSchedules ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Cancelados
                            </span>
                            <span className="font-bold text-slate-900 font-mono">
                              {overviewData?.cancelledCount ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              No-show (Faltas)
                            </span>
                            <span className="font-bold text-slate-900 font-mono">
                              {overviewData?.noShowCount ?? 0}
                            </span>
                          </div>
                        </div>

                        {/* Barra de progresso de comparecimento */}
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="text-slate-400 font-medium">Comparecimento Real</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {((overviewData?.completionRate ?? overviewData?.attendanceRate ?? 0)).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, overviewData?.completionRate ?? overviewData?.attendanceRate ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('schedules')}
                        className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold hover:underline cursor-pointer transition-colors"
                        style={{ color: tenantColor }}
                      >
                        <span>Explorar agendamentos & horários</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pilar 2: Financeiro & Proteção PIX */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                              <DollarSign className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Financeiro & PIX</h3>
                          </div>
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Anti-falta Ativo
                          </span>
                        </div>

                        <div className="space-y-2.5 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Faturamento Bruto</span>
                            <span className="font-bold text-emerald-600 font-mono">
                              {formatBRL(overviewData?.totalRevenue ?? overviewData?.grossRevenue ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Sinal PIX Protegido</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {formatBRL(overviewData?.antiNoShowTotal ?? overviewData?.totalDeposits ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Ticket Médio</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {formatBRL(overviewData?.ticketMedio ?? 0)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>100% dos sinais PIX caem direto na sua conta Asaas.</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('financial')}
                        className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold hover:underline cursor-pointer transition-colors"
                        style={{ color: tenantColor }}
                      >
                        <span>Ver fluxo financeiro & formas de pagamento</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pilar 3: Serviços Campeões */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                              <Scissors className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Serviços Campeões</h3>
                          </div>
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                            {servicesData?.summary?.totalServicesOffered ?? 0} ofertados
                          </span>
                        </div>

                        <div className="space-y-2 mb-2">
                          {(servicesData?.rankingByRevenue || []).slice(0, 3).length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">Nenhum serviço registrado no período.</p>
                          ) : (
                            (servicesData?.rankingByRevenue || []).slice(0, 3).map((item: any, idx: number) => (
                              <div key={item.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 text-xs">
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-900 font-mono shrink-0">
                                  {formatBRL(item.revenue)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('services')}
                        className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold hover:underline cursor-pointer transition-colors"
                        style={{ color: tenantColor }}
                      >
                        <span>Ver ranking completo de serviços</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pilar 4: Clientes & Retenção */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                              <Users className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Clientes & LTV</h3>
                          </div>
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                            {clientsData?.summary?.totalClients ?? overviewData?.totalRegisteredClients ?? 0} base total
                          </span>
                        </div>

                        <div className="space-y-2.5 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Ativos no Período</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {overviewData?.uniqueClientsInPeriod ?? 0} clientes
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Clientes Frequentes</span>
                            <span className="font-bold text-emerald-600 font-mono">
                              {clientsData?.summary?.frequentClients ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Clientes em Risco (&gt;45 dias)</span>
                            <span className={`font-bold font-mono ${(clientsData?.summary?.atRiskClients || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {clientsData?.summary?.atRiskClients ?? 0}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800">LTV Médio: </span>
                          <span className="font-bold text-slate-900 font-mono">{formatBRL(clientsData?.summary?.averageTicket ?? overviewData?.ticketMedio ?? 0)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('clients')}
                        className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold hover:underline cursor-pointer transition-colors"
                        style={{ color: tenantColor }}
                      >
                        <span>Ver fidelização e histórico de clientes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pilar 5: Equipe & Comissões */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Equipe & Produção</h3>
                          </div>
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            {teamData?.summary?.activeProfessionals ?? 0} ativos
                          </span>
                        </div>

                        <div className="space-y-2.5 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Produção Total da Equipe</span>
                            <span className="font-bold text-emerald-600 font-mono">
                              {formatBRL(teamData?.summary?.totalTeamRevenue ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Comissões a Repassar</span>
                            <span className="font-bold text-amber-600 font-mono">
                              {formatBRL(teamData?.summary?.totalCommissionsDue ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Saldo do Salão</span>
                            <span className="font-bold text-indigo-600 font-mono">
                              {formatBRL(teamData?.summary?.salonRetainedRevenue ?? 0)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600">
                          {teamData?.professionals?.[0] ? (
                            <span>Líder: <strong className="text-slate-900">{formatName(teamData.professionals[0].name)}</strong> ({formatBRL(teamData.professionals[0].grossRevenue)})</span>
                          ) : (
                            <span>Nenhum atendimento atribuído a profissionais no período.</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('team')}
                        className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold hover:underline cursor-pointer transition-colors"
                        style={{ color: tenantColor }}
                      >
                        <span>Ver fechamento de repasses & comissões</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pilar 6: Reputação & Avaliações */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">NPS & Reputação</h3>
                          </div>
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {(overviewData?.npsReviewsCount || 0) > 0 ? 'Avaliações Reais' : 'Aguardando'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className="text-3xl font-black font-mono"
                            style={{ color: (overviewData?.npsReviewsCount || 0) > 0 ? tenantColor : '#94a3b8' }}
                          >
                            {(overviewData?.npsReviewsCount || 0) > 0 ? `${overviewData.npsScore > 0 ? `+${overviewData.npsScore}` : overviewData.npsScore}` : '0'}
                          </div>
                          <div className="text-xs text-slate-500">
                            <div className="font-bold text-slate-900">Net Promoter Score</div>
                            <div>
                              {(overviewData?.npsReviewsCount || 0) > 0
                                ? 'Satisfação pós-atendimento'
                                : 'Sem avaliações no período'}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex items-center justify-between">
                          <span>Avaliações coletadas:</span>
                          <span className="font-bold font-mono text-slate-900">{overviewData?.npsReviewsCount ?? 0} respostas</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('reputation')}
                        className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold hover:underline cursor-pointer transition-colors"
                        style={{ color: tenantColor }}
                      >
                        <span>Ver feedbacks e comentários reais</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'clients' && clientsData && <ReportClientsTab data={clientsData} tenantColor={tenantColor} />}
            {activeTab === 'schedules' && schedulesData && <ReportSchedulesTab data={schedulesData} tenantColor={tenantColor} />}
            {activeTab === 'services' && servicesData && <ReportServicesTab data={servicesData} tenantColor={tenantColor} />}
            {activeTab === 'financial' && financialData && <ReportFinancialTab data={financialData} tenantColor={tenantColor} />}
            {activeTab === 'team' && teamData && <ReportTeamTab data={teamData} tenantColor={tenantColor} />}
            {activeTab === 'products' && productsData && <ReportProductsTab data={productsData} tenantColor={tenantColor} />}
            {activeTab === 'courses' && coursesData && <ReportCoursesTab data={coursesData} tenantColor={tenantColor} />}
            {activeTab === 'reputation' && reputationData && <ReportReputationTab data={reputationData} tenantColor={tenantColor} />}
          </>
        )}
      </div>
    </div>
  );
}