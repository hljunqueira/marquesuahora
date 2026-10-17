'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { GraduationCap, Play, MessageCircle, Sparkles } from 'lucide-react';
import { CourseItem, TenantShowcase } from './types';
import { CourseLessonModal } from './CourseLessonModal';

interface ShowcaseCoursesProps {
  tenant: TenantShowcase;
}

export function ShowcaseCourses({ tenant }: ShowcaseCoursesProps) {
  const [activeCourseModal, setActiveCourseModal] = useState<{
    id: string;
    title: string;
  } | null>(null);

  if (!tenant.courses || tenant.courses.length === 0) {
    return null;
  }

  const brandColor = tenant.primaryColor || '#7C3AED';

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Cursos & Especializações
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Aprenda com quem faz
        </span>
      </div>

      <div className="space-y-4">
        {tenant.courses.map((course) => {
          const buyUrl = `https://wa.me/55${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Olá! Tenho interesse no curso "${course.title}". Como funciona a matrícula e formas de pagamento?`
          )}`;

          return (
            <div
              key={course.id}
              className="group rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {course.coverUrl && (
                  <div className="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    <Image
                      src={course.coverUrl}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60">
                    <div className="text-xs font-bold text-slate-900">
                      {course.price ? (
                        <>
                          <span className="text-[11px] font-normal text-slate-500 mr-1">
                            Investimento:
                          </span>
                          R$ {course.price.toFixed(2).replace('.', ',')}
                        </>
                      ) : (
                        <span className="text-slate-500">Sob consulta</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Comprar pelo WhatsApp</span>
                      </a>

                      <button
                        onClick={() =>
                          setActiveCourseModal({
                            id: course.id,
                            title: course.title
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs hover:shadow-sm transition-all"
                        style={{ backgroundColor: brandColor }}
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Acessar Aulas</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeCourseModal && (
        <CourseLessonModal
          courseId={activeCourseModal.id}
          courseTitle={activeCourseModal.title}
          slug={tenant.slug}
          brandColor={brandColor}
          onClose={() => setActiveCourseModal(null)}
        />
      )}
    </section>
  );
}
