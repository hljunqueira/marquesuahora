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

  // Loading do plano
  if (isCheckingPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 dark:text-brand-400" />
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

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

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
    <div className="space-y-6 pb-12">
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
              <div className="space-y-6">
                {/* Faixa de Destaque Executivo (Resumo Geral) */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
                  <div
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    style={{ borderTopWidth: '3px', borderTopColor: tenantColor }}
                  >
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

                  <div
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    style={{ borderTopWidth: '3px', borderTopColor: tenantColor }}
                  >
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

                  <div
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    style={{ borderTopWidth: '3px', borderTopColor: tenantColor }}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Cliente Campeão
                    </span>
                    <div
                      className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
                      title={overviewData?.topClient?.name || clientsData?.rankingByBookings?.[0]?.name}
                    >
                      {overviewData?.topClient?.name || clientsData?.rankingByBookings?.[0]?.name || 'Nenhum'}
                    </div>
                    <span className="text-[11px] font-bold mt-1 block font-mono" style={{ color: tenantColor }}>
                      {overviewData?.topClient?.bookings ?? clientsData?.rankingByBookings?.[0]?.totalBookings ?? clientsData?.rankingByBookings?.[0]?.bookingsCount ?? 0} agendamentos
                    </span>
                  </div>

                  <div
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    style={{ borderTopWidth: '3px', borderTopColor: tenantColor }}
                  >
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

                  <div
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all col-span-2 md:col-span-1 flex flex-col justify-between"
                    style={{ borderTopWidth: '3px', borderTopColor: tenantColor }}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      NPS & Reputação
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono" style={{ color: tenantColor }}>
                      +{overviewData?.npsScore ?? overviewData?.npsAverage ?? 0}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                      Satisfação & recomendação
                    </span>
                  </div>
                </div>

                {/* Bloco Clientes & Frequência na Visão Geral */}
                {clientsData && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Fidelidade e Ranking de Clientes
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('clients')}
                        style={{ color: tenantColor }}
                        className="text-xs font-bold hover:underline cursor-pointer"
                      >
                        Ver análise completa &rarr;
                      </button>
                    </div>
                    <ReportClientsTab data={clientsData} tenantColor={tenantColor} />
                  </div>
                )}
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
