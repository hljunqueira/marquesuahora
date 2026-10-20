'use client';

import React from 'react';
import { GraduationCap, Users, CheckCircle, Award } from 'lucide-react';
import { ReportBarChart } from '../charts/ReportBarChart';

interface CourseItem {
  id: string;
  title: string;
  category?: string | null;
  totalStudents: number;
  completedStudents: number;
  completionRate: number;
}

interface ReportCoursesTabProps {
  data: {
    summary: {
      totalCourses: number;
      totalEnrollments: number;
      totalCompletions: number;
      averageCompletionRate: number;
    };
    courses: CourseItem[];
  };
  tenantColor?: string;
}

export function ReportCoursesTab({ data, tenantColor = '#5c0701' }: ReportCoursesTabProps) {
  const topCoursesChart = (data?.courses || []).map((c) => ({
    label: c.title.length > 20 ? c.title.slice(0, 18) + '...' : c.title,
    value: c.totalStudents,
    formattedValue: `${c.totalStudents} alunos`,
  }));

  return (
    <div className="space-y-6">
      {/* Resumo de Cursos e Treinamentos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Cursos Publicados</span>
            <GraduationCap className="w-4 h-4" style={{ color: tenantColor }} />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalCourses || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Módulos de capacitação</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total de Alunos</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalEnrollments || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Matrículas ativas</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Conclusões com Certificado</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalCompletions || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Alunos formados</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Taxa de Conclusão Média</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {data?.summary?.averageCompletionRate?.toFixed(1) || '0.0'}%
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Engajamento pedagógico
          </span>
        </div>
      </div>

      {/* Gráfico de Alunos por Curso */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Matrículas por Curso
        </h3>
        <ReportBarChart data={topCoursesChart} height={200} orientation="horizontal" primaryColor={tenantColor} />
      </div>

      {/* Tabela de Cursos */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/90">
          <h3 className="text-sm font-bold text-slate-900">
            Progresso e Conclusão dos Alunos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 uppercase text-[10px] text-slate-500 font-bold border-b border-slate-200/90">
              <tr>
                <th className="py-3 px-4">Título do Curso</th>
                <th className="py-3 px-4 text-center">Matrículas</th>
                <th className="py-3 px-4 text-center">Conclusões</th>
                <th className="py-3 px-4 text-right">Taxa de Sucesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.courses || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                    Nenhum curso ou aluno registrado no momento.
                  </td>
                </tr>
              ) : (
                data.courses.map((course, idx) => (
                  <tr key={course.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {course.title}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                      {course.totalStudents}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600 font-mono">
                      {course.completedStudents}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                      {course.completionRate?.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
