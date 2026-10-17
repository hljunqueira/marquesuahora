'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Play,
  Lock,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { api } from '@/lib/api';
import { InputMask } from '@/components/ui/InputMask';

interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  duration?: number | null;
  sortOrder: number;
}

interface CourseWithLessons {
  id: string;
  title: string;
  description?: string | null;
  lessons: Lesson[];
}

interface CourseLessonModalProps {
  courseId: string;
  courseTitle: string;
  slug: string;
  onClose: () => void;
  brandColor?: string;
}

export function CourseLessonModal({
  courseId,
  courseTitle,
  slug,
  onClose,
  brandColor = '#7C3AED'
}: CourseLessonModalProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CourseWithLessons | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Por favor, informe seu telefone com DDD completo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/public/courses/${slug}/auth`, {
        phone,
        courseId
      });

      if (res.data?.course) {
        setCourseData(res.data.course);
        if (res.data.course.lessons?.length > 0) {
          setActiveLesson(res.data.course.lessons[0]);
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Não foi possível localizar sua matrícula. Verifique seu WhatsApp ou fale com a instrutora.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Renderizador de vídeo com suporte a YouTube, Vimeo ou MP4 direto
  const renderVideoPlayer = (url: string) => {
    if (!url) return null;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be/')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : new URL(url).searchParams.get('v');
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="Vídeo aula"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (url.includes('vimeo.com')) {
      const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
          title="Vídeo aula"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    return (
      <video
        src={url}
        controls
        autoPlay
        className="w-full h-full object-contain bg-black"
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: brandColor }}
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {courseTitle}
              </h3>
              <p className="text-xs text-slate-500">
                Área de Alunas · Acesso Direto sem Intermediários
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo: Tela de Login por WhatsApp ou Player de Aulas */}
        {!courseData ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-brand-purple flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" style={{ color: brandColor }} />
            </div>

            <h4 className="text-lg font-bold text-slate-900 mb-2">
              Acesso Exclusivo para Alunas
            </h4>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Informe o número de WhatsApp utilizado na aquisição do curso para liberar suas aulas imediatamente.
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Seu WhatsApp
                </label>
                <InputMask
                  mask="phone"
                  value={phone}
                  onChangeValue={(formatted) => setPhone(formatted)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple text-sm font-medium outline-hidden"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando Matrícula...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Acessar Minhas Aulas</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Player de Vídeo e Lista de Aulas */
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
            {/* Coluna do Vídeo em Reprodução */}
            <div className="lg:col-span-8 bg-black flex flex-col">
              <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center">
                {activeLesson ? (
                  renderVideoPlayer(activeLesson.videoUrl)
                ) : (
                  <p className="text-slate-400 text-sm">
                    Selecione uma aula na barra lateral para assistir.
                  </p>
                )}
              </div>
              {activeLesson && (
                <div className="p-4 bg-white border-t border-slate-100">
                  <h4 className="text-base font-bold text-slate-900">
                    {activeLesson.title}
                  </h4>
                  {activeLesson.description && (
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {activeLesson.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Coluna da Grade de Aulas Liberadas */}
            <div className="lg:col-span-4 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-4 overflow-y-auto max-h-[60vh] lg:max-h-full">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Conteúdo do Curso ({courseData.lessons?.length || 0} aulas)
                </h5>
              </div>

              <div className="space-y-2">
                {courseData.lessons?.map((lesson, idx) => {
                  const isCurrent = activeLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                        isCurrent
                          ? 'bg-white border-brand-purple shadow-xs ring-1 ring-brand-purple'
                          : 'bg-white/80 hover:bg-white border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCurrent
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                        style={{
                          backgroundColor: isCurrent ? brandColor : undefined
                        }}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {lesson.title}
                        </p>
                        {lesson.duration && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {lesson.duration} min
                          </span>
                        )}
                      </div>

                      {isCurrent && (
                        <Play
                          className="w-3.5 h-3.5 fill-brand-purple flex-shrink-0"
                          style={{
                            color: brandColor,
                            fill: brandColor
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
