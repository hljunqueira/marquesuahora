'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Plus,
  Play,
  Users,
  Clock,
  Video,
  DollarSign,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  Loader2,
  ChevronRight,
  Film,
  Upload,
  Link as LinkIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  duration?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  coverUrl?: string | null;
  videoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: {
    lessons: number;
    accesses: number;
  };
  lessons?: Lesson[];
}

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast Feedback Notifier
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Modal de Confirmação Seguro
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  // Modal Curso (Criar / Editar)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [coursePrice, setCoursePrice] = useState<string>('');
  const [courseCover, setCourseCover] = useState('');
  const [courseVideoUrl, setCourseVideoUrl] = useState('');
  const [courseVideoMode, setCourseVideoMode] = useState<'link' | 'upload'>('link');
  const [courseIsActive, setCourseIsActive] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingCourseVideo, setUploadingCourseVideo] = useState(false);

  // Modal Aulas / Gestor de Aulas do Curso Selecionado
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Modal Nova Aula
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonVideoMode, setLessonVideoMode] = useState<'link' | 'upload'>('link');
  const [lessonDuration, setLessonDuration] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadingLessonVideo, setUploadingLessonVideo] = useState(false);

  // Modal Player de Pré-visualização do Vídeo
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewLessonTitle, setPreviewLessonTitle] = useState<string>('');

  // Disparo de Curso no WhatsApp com Anti-Ban
  const [broadcastingCourseId, setBroadcastingCourseId] = useState<string | null>(null);

  const notifyCoursesSync = () => {
    window.dispatchEvent(new CustomEvent('marquesuahora_courses_sync'));
    window.dispatchEvent(new Event('storage'));
  };

  const handleBroadcastCourse = (course: Course) => {
    setConfirmModal({
      isOpen: true,
      title: 'Divulgar Curso no WhatsApp',
      description: `Deseja divulgar o curso "${course.title}" para todas as clientes cadastradas no WhatsApp? O envio ocorre em segundo plano com cadência segura anti-ban (8 a 10s entre contatos).`,
      confirmLabel: 'Iniciar Envio WhatsApp',
      cancelLabel: 'Cancelar',
      isDestructive: false,
      onConfirm: async () => {
        setBroadcastingCourseId(course.id);
        try {
          const res = await api.post(`/courses/${course.id}/broadcast`, {
            audienceFilter: 'ALL'
          });
          showToast(res.data?.message || 'Divulgação iniciada com sucesso!');
        } catch (err: any) {
          showToast(err?.response?.data?.message || 'Erro ao iniciar divulgação do curso.');
        } finally {
          setBroadcastingCourseId(null);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 1. Carrega cursos do estabelecimento com revalidação silenciosa
  const fetchCourses = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/courses');
      setCourses(res.data || []);
      setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(err?.response?.data?.message || 'Erro ao carregar cursos.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();

    // 1. Polling silencioso a cada 30 segundos se a aba estiver visível
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCourses(true);
      }
    }, 30000);

    // 2. Foco e visibilidade da aba
    const handleFocus = () => fetchCourses(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCourses(true);
      }
    };

    // 3. Sincronização entre abas e módulos
    const handleCoursesSync = () => fetchCourses(true);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('marquesuahora_courses_sync', handleCoursesSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('marquesuahora_courses_sync', handleCoursesSync);
    };
  }, []);

  // 2. Abre gerenciador de aulas para um curso
  const openLessonsManager = async (course: Course) => {
    setSelectedCourseForLessons(course);
    setLoadingLessons(true);
    try {
      const res = await api.get(`/courses/${course.id}`);
      setLessons(res.data?.lessons || []);
    } catch {
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Helper de Upload de Arquivo (com fallback para DataURL)
  const handleUploadFile = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.url) {
        return res.data.url;
      }
    } catch (err) {
      console.warn('Upload endpoint falhou, fallback para DataURL:', err);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload da Capa do Curso
  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await handleUploadFile(file);
      setCourseCover(url);
    } catch {
      showToast('Não foi possível carregar a imagem da capa.');
    } finally {
      setUploadingCover(false);
    }
  };

  // Upload do Vídeo de Apresentação do Curso
  const handleCourseVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCourseVideo(true);
    try {
      const url = await handleUploadFile(file);
      setCourseVideoUrl(url);
    } catch {
      showToast('Não foi possível carregar o vídeo de apresentação.');
    } finally {
      setUploadingCourseVideo(false);
    }
  };

  // Upload do Vídeo da Aula
  const handleLessonVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLessonVideo(true);
    try {
      const url = await handleUploadFile(file);
      setLessonVideoUrl(url);
    } catch {
      showToast('Não foi possível carregar o vídeo da aula.');
    } finally {
      setUploadingLessonVideo(false);
    }
  };

  // 3. Salvar Curso (Criar ou Atualizar)
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;

    setSavingCourse(true);
    try {
      const payload = {
        title: courseTitle.trim(),
        description: courseDesc.trim() || null,
        price: coursePrice ? parseFloat(coursePrice.replace(',', '.')) : null,
        coverUrl: courseCover.trim() || null,
        videoUrl: courseVideoUrl.trim() || null,
        isActive: courseIsActive
      };

      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, payload);
        showToast('Curso atualizado com sucesso!');
      } else {
        await api.post('/courses', payload);
        showToast('Novo curso criado com sucesso!');
      }

      setIsCourseModalOpen(false);
      setEditingCourse(null);
      resetCourseForm();
      fetchCourses(true);
      notifyCoursesSync();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar curso.');
    } finally {
      setSavingCourse(false);
    }
  };

  const resetCourseForm = () => {
    setCourseTitle('');
    setCourseDesc('');
    setCoursePrice('');
    setCourseCover('');
    setCourseVideoUrl('');
    setCourseVideoMode('link');
    setCourseIsActive(true);
  };

  const handleEditCourseClick = (c: Course) => {
    setEditingCourse(c);
    setCourseTitle(c.title);
    setCourseDesc(c.description || '');
    setCoursePrice(c.price !== undefined && c.price !== null ? String(c.price) : '');
    setCourseCover(c.coverUrl || '');
    setCourseVideoUrl(c.videoUrl || '');
    setCourseVideoMode(c.videoUrl?.startsWith('data:') || c.videoUrl?.startsWith('/uploads') ? 'upload' : 'link');
    setCourseIsActive(c.isActive);
    setIsCourseModalOpen(true);
  };

  const handleDeleteCourse = (courseId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Curso',
      description: 'Deseja realmente excluir este curso e todas as suas aulas e acessos associados? Esta ação é irreversível.',
      confirmLabel: 'Sim, Excluir Curso',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/courses/${courseId}`);
          if (selectedCourseForLessons?.id === courseId) {
            setSelectedCourseForLessons(null);
          }
          fetchCourses(true);
          notifyCoursesSync();
          showToast('Curso excluído com sucesso!');
        } catch (err: any) {
          showToast(err?.response?.data?.message || 'Erro ao excluir curso.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 4. Salvar Aula
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLessons || !lessonTitle.trim() || !lessonVideoUrl.trim()) return;

    setSavingLesson(true);
    try {
      const payload = {
        title: lessonTitle.trim(),
        description: lessonDesc.trim() || null,
        videoUrl: lessonVideoUrl.trim(),
        duration: lessonDuration.trim() || null
      };

      if (editingLesson) {
        await api.put(`/courses/lessons/${editingLesson.id}`, payload);
        showToast('Aula atualizada com sucesso!');
      } else {
        await api.post(`/courses/${selectedCourseForLessons.id}/lessons`, payload);
        showToast('Nova aula adicionada!');
      }

      setIsLessonModalOpen(false);
      setEditingLesson(null);
      setLessonTitle('');
      setLessonDesc('');
      setLessonVideoUrl('');
      setLessonDuration('');
      setLessonVideoMode('link');

      // Recarrega aulas
      openLessonsManager(selectedCourseForLessons);
      fetchCourses(true);
      notifyCoursesSync();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar aula.');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = (lessonId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aula',
      description: 'Tem certeza que deseja excluir esta aula? As alunas não terão mais acesso a este vídeo.',
      confirmLabel: 'Sim, Excluir Aula',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/courses/lessons/${lessonId}`);
          if (selectedCourseForLessons) {
            openLessonsManager(selectedCourseForLessons);
            fetchCourses(true);
            notifyCoursesSync();
          }
          showToast('Aula excluída com sucesso!');
        } catch (err: any) {
          showToast(err?.response?.data?.message || 'Erro ao excluir aula.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Converte URL de vídeo para Embed compatível (YouTube, Vimeo ou direto)
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
    return url;
  };

  // Renderizador de Preview Interativo de Vídeo
  const renderVideoPlayerPreview = (url: string) => {
    if (!url) return null;
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo = url.includes('vimeo.com');

    if (isYoutube || isVimeo) {
      const embedUrl = getEmbedUrl(url);
      return (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-xs border border-slate-200 mt-2">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-xs border border-slate-200 mt-2 flex items-center justify-center">
        <video
          src={url}
          controls
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Cursos & Treinamentos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-tenant-light text-tenant-primary">
              {courses.length} {courses.length === 1 ? 'formação' : 'formações'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Crie workshops e videoaulas para suas alunas e gerencie alunas diretamente na plataforma
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/dashboard/assinantes"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-tenant-primary" />
            <span>Alunas & Assinantes</span>
          </Link>

          <button
            onClick={() => {
              setEditingCourse(null);
              resetCourseForm();
              setIsCourseModalOpen(true);
            }}
            className="px-4 py-2.5 btn-primary-tenant text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Curso</span>
          </button>
        </div>
      </div>

      {/* 2. Lista de Cursos em Grade */}
      {loading ? (
        <div className="py-24 bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
          <p className="text-xs font-semibold">Carregando cursos e aulas...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200/80 text-center px-4">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Você ainda não cadastrou nenhum curso
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Monetize seu conhecimento ministrando workshops, cursos de unhas, cílios, barbearia ou estética com videoaulas direto no painel.
          </p>
          <button
            onClick={() => {
              setEditingCourse(null);
              resetCourseForm();
              setIsCourseModalOpen(true);
            }}
            className="mt-4 px-4 py-2 btn-primary-tenant rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Criar Primeiro Curso
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group hover:shadow-lg transition-all"
            >
              {/* Capa do Curso */}
              <div className="relative h-44 bg-slate-900 overflow-hidden flex items-center justify-center">
                {course.coverUrl ? (
                  <img
                    src={course.coverUrl}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <GraduationCap className="w-12 h-12 text-slate-600 mb-1" />
                    <span className="text-[11px] font-semibold">Sem capa</span>
                  </div>
                )}

                {/* Badges Flutuantes */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-xs ${
                      course.isActive
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-700/90 text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {course.isActive ? 'Ativo' : 'Pausado'}
                  </span>

                  {course.price ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-white/95 text-purple-900 shadow-xs font-mono">
                      R$ {Number(course.price).toFixed(2).replace('.', ',')}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-slate-800 shadow-xs">
                      Acesso Livre
                    </span>
                  )}
                </div>

                {/* Botão de Trailer / Prévia se houver vídeo */}
                {course.videoUrl && (
                  <button
                    onClick={() => {
                      setPreviewVideoUrl(course.videoUrl || '');
                      setPreviewLessonTitle(`Trailer: ${course.title}`);
                    }}
                    className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-black/60 hover:bg-purple-600 text-white text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Ver Trailer</span>
                  </button>
                )}
              </div>

              {/* Informações do Curso */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                      {course.description}
                    </p>
                  )}
                </div>

                {/* Métricas Rápidas */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Video className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-800">
                      {course._count?.lessons || 0}
                    </span>
                    <span className="text-slate-400">aulas</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800">
                      {course._count?.accesses || 0}
                    </span>
                    <span className="text-slate-400">alunas</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditCourseClick(course)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Editar dados do curso"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Excluir curso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBroadcastCourse(course)}
                      disabled={broadcastingCourseId === course.id}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-emerald-200/60 shadow-2xs hover:shadow-xs active:scale-97"
                      title="Divulgar este curso para as clientes no WhatsApp"
                    >
                      {broadcastingCourseId === course.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <WhatsAppIcon size={14} color="#059669" />
                      )}
                      <span>Divulgar</span>
                    </button>

                    <button
                      onClick={() => openLessonsManager(course)}
                      className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Aulas</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Modal / Gaveta de Gerenciamento de Aulas */}
      {selectedCourseForLessons && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
          >
            {/* Header da Gaveta de Aulas */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {selectedCourseForLessons.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {lessons.length} {lessons.length === 1 ? 'aula cadastrada' : 'aulas cadastradas'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingLesson(null);
                    setLessonTitle('');
                    setLessonDesc('');
                    setLessonVideoUrl('');
                    setLessonDuration('');
                    setLessonVideoMode('link');
                    setIsLessonModalOpen(true);
                  }}
                  className="px-3 py-1.5 btn-primary-tenant rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Aula</span>
                </button>

                <button
                  onClick={() => setSelectedCourseForLessons(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista de Aulas */}
            <div className="p-6 overflow-y-auto divide-y divide-slate-100 space-y-3">
              {loadingLessons ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                  <p className="text-xs">Carregando aulas...</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="py-12 text-center">
                  <Film className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Nenhuma aula adicionada neste curso ainda
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Adicione links de vídeos do YouTube, Vimeo, MP4 ou importe vídeos do seu computador para montar o curso.
                  </p>
                </div>
              ) : (
                lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-mono">
                          {lesson.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {lesson.duration}
                            </span>
                          )}
                          <span className="truncate max-w-[200px] text-slate-400">
                            {lesson.videoUrl}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setPreviewVideoUrl(lesson.videoUrl);
                          setPreviewLessonTitle(lesson.title);
                        }}
                        className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors cursor-pointer"
                        title="Assistir pré-visualização"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingLesson(lesson);
                          setLessonTitle(lesson.title);
                          setLessonDesc(lesson.description || '');
                          setLessonVideoUrl(lesson.videoUrl);
                          setLessonDuration(lesson.duration || '');
                          setLessonVideoMode(lesson.videoUrl?.startsWith('data:') || lesson.videoUrl?.startsWith('/uploads') ? 'upload' : 'link');
                          setIsLessonModalOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Editar aula"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Excluir aula"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Criar / Editar Curso (com Upload Moderno de Capa e Vídeo com Preview) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">
                {editingCourse ? 'Editar Curso' : 'Novo Curso Online'}
              </h3>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Título do Curso *
                </label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Descrição Comercial
                </label>
                <textarea
                  rows={2}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="text"
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold font-mono outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Status
                  </label>
                  <select
                    value={courseIsActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setCourseIsActive(e.target.value === 'ACTIVE')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold outline-hidden focus:border-purple-600 cursor-pointer"
                  >
                    <option value="ACTIVE">Ativo / Aberto</option>
                    <option value="INACTIVE">Pausado / Oculto</option>
                  </select>
                </div>
              </div>

              {/* Upload Moderno de Imagem da Capa */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Capa do Curso
                </label>
                {courseCover ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900 shadow-xs">
                    <img
                      src={courseCover}
                      alt="Capa do Curso"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-xs cursor-pointer hover:bg-slate-50 transition-colors">
                        Trocar Imagem
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCourseCover('')}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-purple-50/20 group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverSelect}
                      className="hidden"
                    />
                    {uploadingCover ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Carregando imagem...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-purple-600 mb-1.5 transition-colors" />
                        <p className="text-xs font-bold text-slate-700 group-hover:text-purple-700">
                          Clique ou arraste a imagem de capa do dispositivo
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Formatos PNG, JPG ou WebP recomendados
                        </p>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Campo de Vídeo de Apresentação / Trailer com Preview e Importação */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Vídeo de Apresentação (opcional)
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setCourseVideoMode('link')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        courseVideoMode === 'link'
                          ? 'bg-white text-purple-700 shadow-xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Colar Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseVideoMode('upload')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        courseVideoMode === 'upload'
                          ? 'bg-white text-purple-700 shadow-xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Importar Vídeo
                    </button>
                  </div>
                </div>

                {courseVideoMode === 'link' ? (
                  <div>
                    <input
                      type="url"
                      value={courseVideoUrl}
                      onChange={(e) => setCourseVideoUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600"
                    />
                  </div>
                ) : (
                  <div>
                    {courseVideoUrl && !courseVideoUrl.includes('youtube') && !courseVideoUrl.includes('vimeo') ? (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs font-semibold text-purple-900">
                        <span className="truncate max-w-[280px]">Vídeo do dispositivo carregado</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer">
                            Trocar
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              onChange={handleCourseVideoSelect}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setCourseVideoUrl('')}
                            className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-purple-50/20 group">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={handleCourseVideoSelect}
                          className="hidden"
                        />
                        {uploadingCourseVideo ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processando arquivo de vídeo...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-purple-600 mb-1 transition-colors" />
                            <p className="text-xs font-bold text-slate-700 group-hover:text-purple-700">
                              Clique para escolher vídeo do dispositivo
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              MP4, WebM ou MOV
                            </p>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                )}

                {/* Preview Interativo do Vídeo */}
                {courseVideoUrl && renderVideoPlayerPreview(courseVideoUrl)}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCourse || uploadingCover || uploadingCourseVideo}
                  className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingCourse ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingCourse ? 'Salvar Alterações' : 'Criar Curso'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Adicionar / Editar Aula (com opção de Link ou Importar Vídeo + Preview) */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">
                {editingLesson ? 'Editar Aula' : 'Nova Videoaula'}
              </h3>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Título da Aula *
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Descrição / Conteúdo (opcional)
                </label>
                <textarea
                  rows={2}
                  value={lessonDesc}
                  onChange={(e) => setLessonDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-purple-600 resize-none"
                />
              </div>

              {/* Seletor de Modo de Vídeo da Aula */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Vídeo da Aula *
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setLessonVideoMode('link')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        lessonVideoMode === 'link'
                          ? 'bg-white text-purple-700 shadow-xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Colar Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonVideoMode('upload')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        lessonVideoMode === 'upload'
                          ? 'bg-white text-purple-700 shadow-xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Importar Vídeo
                    </button>
                  </div>
                </div>

                {lessonVideoMode === 'link' ? (
                  <div>
                    <input
                      type="url"
                      required
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium outline-hidden focus:border-purple-600"
                    />
                  </div>
                ) : (
                  <div>
                    {lessonVideoUrl && !lessonVideoUrl.includes('youtube') && !lessonVideoUrl.includes('vimeo') ? (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs font-semibold text-purple-900">
                        <span className="truncate max-w-[280px]">Vídeo da aula importado</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer">
                            Trocar
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              onChange={handleLessonVideoSelect}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setLessonVideoUrl('')}
                            className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-purple-50/20 group">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={handleLessonVideoSelect}
                          className="hidden"
                        />
                        {uploadingLessonVideo ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processando arquivo de vídeo...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-purple-600 mb-1 transition-colors" />
                            <p className="text-xs font-bold text-slate-700 group-hover:text-purple-700">
                              Clique para escolher vídeo da aula do dispositivo
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              MP4, WebM ou MOV
                            </p>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                )}

                {/* Preview Interativo do Vídeo da Aula */}
                {lessonVideoUrl && renderVideoPlayerPreview(lessonVideoUrl)}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Duração Estimada (opcional)
                </label>
                <input
                  type="text"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLesson || uploadingLessonVideo}
                  className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingLesson ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingLesson ? 'Salvar Alterações' : 'Adicionar Aula'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Player Flutuante (Assistir Aula / Trailer) */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <span className="text-sm font-bold text-white truncate pr-4">
                {previewLessonTitle || 'Reproduzindo Vídeo'}
              </span>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {renderVideoPlayerPreview(previewVideoUrl)}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Acessível */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        isDestructive={confirmModal.isDestructive}
        isLoading={confirmModal.isLoading}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border border-slate-800 text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
