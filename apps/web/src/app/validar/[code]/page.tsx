'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, XCircle, Award, Calendar, Clock, User, Building, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface CertificateVerification {
  valid: boolean;
  code: string;
  studentName: string;
  courseTitle: string;
  tenantName: string;
  tenantCity?: string | null;
  tenantState?: string | null;
  completedAt: string;
  instructorName: string;
  instructorTitle: string;
  hours: number;
  borderStyle?: string;
  programmaticContent?: string | null;
}

export default function ValidarCertificadoPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const [data, setData] = useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/public/certificates/${code}`);
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Certificado não localizado ou código inválido.');
      } finally {
        setLoading(false);
      }
    }
    if (code) {
      verify();
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 md:p-8">
      {/* Topo Institucional */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-100">
            M
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            Marque<span className="text-zinc-400">SuaHora</span>
          </span>
        </Link>
        <span className="text-xs text-zinc-400 font-medium">Validador de Diplomas Oficiais</span>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-2xl mx-auto w-full my-auto py-8">
        {loading ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-400 mb-3" />
            <h2 className="text-base font-semibold text-zinc-200">Consultando Registro de Certificado</h2>
            <p className="text-xs text-zinc-400 mt-1">Verificando autenticidade na base oficial de emissão...</p>
          </div>
        ) : error || !data ? (
          <div className="bg-zinc-900/60 border border-red-900/40 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center mx-auto mb-4 text-red-400">
              <XCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-zinc-100">Certificado Não Encontrado</h2>
            <p className="text-xs text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
              O código verificador <span className="font-mono text-zinc-200 font-semibold">{code}</span> não corresponde a um registro válido de conclusão em nossa base oficial.
            </p>
            <div className="mt-6 pt-6 border-t border-zinc-800/80">
              <p className="text-[11px] text-zinc-500">
                Se você recebeu este certificado, solicite à instrutora ou ao estabelecimento a emissão da chancela atualizada.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6">
            {/* Selo de Autenticidade */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-950/90 text-emerald-400 border border-emerald-700/40">
                    Certificado Autêntico &amp; Verificado
                  </div>
                  <h2 className="text-base font-bold text-zinc-100 mt-1">Chancela Oficial Emitida</h2>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Código de Autenticação</div>
                <div className="font-mono text-sm font-bold text-zinc-200 tracking-wider">{data.code}</div>
              </div>
            </div>

            {/* Ficha Técnica do Certificado */}
            <div className="space-y-4">
              {/* Aluna Formada */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex items-start gap-3">
                <User className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Aluna Diplomada</div>
                  <div className="text-base font-bold text-zinc-100 mt-0.5">{data.studentName}</div>
                </div>
              </div>

              {/* Formação */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex items-start gap-3">
                <Award className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Formação Profissional</div>
                  <div className="text-sm font-bold text-zinc-100 mt-0.5">{data.courseTitle}</div>
                </div>
              </div>

              {/* Grid: Instituição Formadora & Instrutora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex items-start gap-3">
                  <Building className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Espaço / Instituição</div>
                    <div className="text-xs font-semibold text-zinc-200 mt-0.5">{data.tenantName}</div>
                    {data.tenantCity && (
                      <div className="text-[11px] text-zinc-400">
                        {data.tenantCity}
                        {data.tenantState ? ` - ${data.tenantState}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex items-start gap-3">
                  <User className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Instrutora Responsável</div>
                    <div className="text-xs font-semibold text-zinc-200 mt-0.5">{data.instructorName}</div>
                    <div className="text-[11px] text-zinc-400">{data.instructorTitle}</div>
                  </div>
                </div>
              </div>

              {/* Grid: Carga Horária & Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Carga Horária</div>
                    <div className="text-xs font-semibold text-zinc-200 mt-0.5">{data.hours} horas de formação</div>
                  </div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Data de Conclusão</div>
                    <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                      {new Date(data.completedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo Programático */}
              {data.programmaticContent && (
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-1">
                    Conteúdo Programático &amp; Competências
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{data.programmaticContent}</p>
                </div>
              )}
            </div>

            {/* Rodapé de Segurança */}
            <div className="pt-4 border-t border-zinc-800 text-center text-[11px] text-zinc-400">
              Este registro digital é verificado e atestado criptograficamente pela plataforma MarqueSuaHora.
            </div>
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="max-w-2xl mx-auto w-full text-center py-4 text-xs text-zinc-400 border-t border-zinc-900">
        MarqueSuaHora • Gestão Profissional e Certificação Digital
      </footer>
    </div>
  );
}
