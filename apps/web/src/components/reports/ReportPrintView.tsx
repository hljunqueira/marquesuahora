'use client';

import React from 'react';

interface ReportPrintViewProps {
  tenantName: string;
  tenantLogo?: string | null;
  periodLabel: string;
  overviewData: any;
  topClients: any[];
  topServices: any[];
  teamReport: any[];
  tenantPrimaryColor?: string;
}

export function ReportPrintView({
  tenantName,
  tenantLogo,
  periodLabel,
  overviewData,
  topClients = [],
  topServices = [],
  teamReport = [],
  tenantPrimaryColor = '#5c0701'
}: ReportPrintViewProps) {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const generationDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="hidden print:block print:w-full print:bg-white text-slate-900 print:p-0">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body {
            background-color: #ffffff !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          .no-print, header, aside, nav, button {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}} />

      {/* Cabeçalho Executivo do Documento */}
      <div className="border-b-2 pb-4 mb-5 flex items-center justify-between" style={{ borderColor: tenantPrimaryColor }}>
        <div className="flex items-center gap-3">
          {tenantLogo && (
            <img
              src={tenantLogo}
              alt={tenantName}
              className="max-h-12 max-w-[120px] object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
              {tenantName}
            </h1>
            <p className="text-[11px] font-semibold text-slate-500">
              Relatório Executivo Integrado 360° de Gestão & BI
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-600 space-y-0.5">
          <p><strong>Período:</strong> {periodLabel}</p>
          <p><strong>Emissão:</strong> {generationDate}</p>
          <p className="text-[9px] text-slate-400">MarqueSuaHora SaaS</p>
        </div>
      </div>

      {/* Bloco 1: KPIs Principais do Período */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          1. Indicadores Chave de Desempenho
        </h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Faturamento Bruto</span>
            <span className="text-base font-extrabold font-mono text-slate-900 block mt-1">
              {formatBRL(overviewData?.grossRevenue || 0)}
            </span>
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Atendimentos Concluídos</span>
            <span className="text-base font-extrabold font-mono text-slate-900 block mt-1">
              {overviewData?.completedCount || 0}
            </span>
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Ticket Médio</span>
            <span className="text-base font-extrabold font-mono text-slate-900 block mt-1">
              {formatBRL(overviewData?.ticketMedio || 0)}
            </span>
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Clientes Únicas</span>
            <span className="text-base font-extrabold font-mono text-slate-900 block mt-1">
              {overviewData?.uniqueClientsInPeriod || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Bloco 2: Ranking de Clientes (Quem mais agendou) */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          2. Ranking de Clientes Mais Frequentes (Quem Mais Agendou)
        </h2>
        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-2 w-12 text-center">#</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Telefone</th>
              <th className="p-2 text-center">Qtd. Visitas</th>
              <th className="p-2 text-right">Total Pago</th>
              <th className="p-2 text-right">Ticket Médio</th>
              <th className="p-2 text-center">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topClients.slice(0, 10).map((c, idx) => (
              <tr key={c.id || idx} className="hover:bg-slate-50">
                <td className="p-2 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                <td className="p-2 font-bold text-slate-900">{c.name}</td>
                <td className="p-2 font-mono text-slate-600">{c.phone || '-'}</td>
                <td className="p-2 text-center font-extrabold font-mono text-slate-900">{c.bookingsCount}</td>
                <td className="p-2 text-right font-extrabold font-mono text-slate-900">{formatBRL(c.totalSpent)}</td>
                <td className="p-2 text-right font-mono text-slate-600">{formatBRL(c.ticketMedio)}</td>
                <td className="p-2 text-center font-bold text-[10px]">
                  {c.fidelityStatus === 'VIP' ? 'VIP' : c.fidelityStatus === 'FREQUENT' ? 'Frequente' : c.fidelityStatus === 'AT_RISK' ? 'Em Risco' : 'Nova'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bloco 3: Procedimentos Mais Rentáveis e Equipe */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Procedimentos */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            3. Procedimentos Mais Realizados
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2">Procedimento</th>
                <th className="p-2 text-center">Qtd</th>
                <th className="p-2 text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topServices.slice(0, 6).map((s, idx) => (
                <tr key={s.id || idx}>
                  <td className="p-2 font-bold text-slate-800">{s.name}</td>
                  <td className="p-2 text-center font-mono font-bold">{s.count}</td>
                  <td className="p-2 text-right font-mono font-extrabold">{formatBRL(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Equipe & Comissões */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            4. Performance da Equipe & Comissões
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2">Profissional</th>
                <th className="p-2 text-center">Atend.</th>
                <th className="p-2 text-right">Receita</th>
                <th className="p-2 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamReport.slice(0, 6).map((t, idx) => (
                <tr key={t.id || idx}>
                  <td className="p-2 font-bold text-slate-800">{t.name}</td>
                  <td className="p-2 text-center font-mono">{t.completedCount}</td>
                  <td className="p-2 text-right font-mono font-bold">{formatBRL(t.grossRevenue)}</td>
                  <td className="p-2 text-right font-mono font-extrabold text-emerald-800">{formatBRL(t.estimatedCommission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé Institucional do Relatório */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
        <span>MarqueSuaHora — Plataforma Integrada de Gestão de Salões e Clínicas</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
}
