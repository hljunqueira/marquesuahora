'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  GraduationCap,
  Users,
  Award,
  Plus,
  Search,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Loader2,
  RefreshCw,
  X,
  ExternalLink,
  Play,
  Edit,
  MessageCircle,
  Video,
  ChevronRight,
  Filter,
  ShieldCheck,
  Printer,
  Check,
  Sliders
} from 'lucide-react';
import { api } from '@/lib/api';
import { InputMask } from '@/components/ui/InputMask';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CertificateModal } from '@/components/courses/CertificateModal';
import { CertificateConfigTab } from '@/components/courses/CertificateConfigTab';
import { CertificateData } from '@/components/courses/CertificateTemplate';

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
  certificateConfig?: any;
  _count?: {
    lessons: number;
    accesses: number;
  };
  lessons?: Lesson[];
}

interface Subscriber {
  id: string;
  courseId: string;
  clientId?: string | null;
  phone: string;
  certificateCode?: string | null;
  completedAt?: string | null;
  grantedAt: string;
  revokedAt?: string | null;
  isActive: boolean;
  course?: {
    id: string;
    title: string;
    price?: number | null;
    coverUrl?: string | null;
    certificateConfig?: any;
  };
  client?: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

interface CourseAnalytics {
  totalCourses: number;
  totalStudents: number;
  activeStudents: number;
  certifiedStudents: number;
  estimatedRevenue: number;
}

function CursosEAlunasContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'courses' | 'subscribers' | 'certificates'>(
    initialTabParam === 'subscribers'
      ? 'subscribers'
      : initialTabParam === 'certificates'
      ? 'certificates'
      : 'courses'
  );

  const [courses, setCourses] = useState<Course[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [hasCoursesPlan, setHasCoursesPlan] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

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

  // Modal de Visualização/Impressão do Certificado
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [activeCertificateData, setActiveCertificateData] = useState<CertificateData | null>(null);
  const [issuingCertificate, setIssuingCertificate] = useState(false);

  // 1. Checa plano no localStorage
  useEffect(() => {
    try {
      const savedTenant = localStorage.getItem('tenant_data');
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (parsed?.plan && parsed.plan.hasCourses !== undefined) {
          setHasCoursesPlan(Boolean(parsed.plan.hasCourses));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // 2. Carrega Cursos e Estatísticas
  const fetchCourses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [resCourses, resAnalytics] = await Promise.all([
        api.get('/courses'),
        api.get('/courses/analytics').catch(() => ({ data: null }))
      ]);
      setCourses(Array.isArray(resCourses.data) ? resCourses.data : []);
      if (resAnalytics?.data) {
        setAnalytics(resAnalytics.data);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao carregar cursos.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  // 3. Carrega Alunas / Acessos
  const [searchSubscriber, setSearchSubscriber] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');

  const fetchSubscribers = useCallback(async (silent = false) => {
    if (!silent) setLoadingSubscribers(true);
    try {
      const params: any = {};
      if (selectedCourseFilter && selectedCourseFilter !== 'ALL') {
        params.courseId = selectedCourseFilter;
      }
      if (searchSubscriber.trim()) {
        params.search = searchSubscriber.trim();
      }
      const res = await api.get('/courses/subscribers', { params });
      setSubscribers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao carregar alunas matriculadas.');
    } finally {
      if (!silent) setLoadingSubscribers(false);
    }
  }, [selectedCourseFilter, searchSubscriber, showToast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (activeTab === 'subscribers') {
      fetchSubscribers();
    }
  }, [activeTab, fetchSubscribers]);

  // =========================================================================
  // GESTÃO DE CURSOS (CRIAR / EDITAR)
  // =========================================================================
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [coursePrice, setCoursePrice] = useState<string>('');
  const [courseCover, setCourseCover] = useState('');
  const [courseVideoUrl, setCourseVideoUrl] = useState('');
  const [courseIsActive, setCourseIsActive] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const resetCourseForm = () => {
    setCourseTitle('');
    setCourseDesc('');
    setCoursePrice('');
    setCourseCover('');
    setCourseVideoUrl('');
    setCourseIsActive(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseTitle(course.title);
    setCourseDesc(course.description || '');
    setCoursePrice(course.price ? String(course.price) : '');
    setCourseCover(course.coverUrl || '');
    setCourseVideoUrl(course.videoUrl || '');
    setCourseIsActive(course.isActive);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      showToast('O título do curso é obrigatório.');
      return;
    }

    setSavingCourse(true);
    try {
      const payload = {
        title: courseTitle.trim(),
        description: courseDesc.trim() || null,
        price: coursePrice ? Number(coursePrice) : null,
        coverUrl: courseCover.trim() || null,
        videoUrl: courseVideoUrl.trim() || null,
        isActive: courseIsActive
      };

      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, payload);
        showToast('Curso atualizado com sucesso!');
      } else {
        await api.post('/courses', payload);
        showToast('Curso cadastrado com sucesso!');
      }

      setIsCourseModalOpen(false);
      resetCourseForm();
      setEditingCourse(null);
      fetchCourses(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar curso.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Formação',
      description: `Deseja realmente excluir o curso "${course.title}"? Todas as aulas e registros de alunas vinculados serão desativados.`,
      confirmLabel: 'Sim, Excluir Curso',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/courses/${course.id}`);
          fetchCourses(true);
          showToast('Curso removido com sucesso!');
        } catch (err: any) {
          showToast(err?.response?.data?.message || 'Erro ao excluir curso.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Upload de Capa
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingCover(true);
    try {
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.fileUrl;
      if (url) {
        setCourseCover(url);
        showToast('Capa enviada com sucesso!');
      }
    } catch {
      showToast('Erro ao enviar imagem de capa.');
    } finally {
      setUploadingCover(false);
    }
  };

  // =========================================================================
  // GESTÃO DE AULAS DO CURSO
  // =========================================================================
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const handleOpenLessonsModal = async (course: Course) => {
    setSelectedCourseForLessons(course);
    setLoadingLessons(true);
    try {
      const res = await api.get(`/courses/${course.id}`);
      setLessons(res.data?.lessons || []);
    } catch {
      showToast('Erro ao carregar videoaulas do curso.');
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLessons) return;
    if (!lessonTitle.trim() || !lessonVideoUrl.trim()) {
      showToast('Título e Link do Vídeo são obrigatórios.');
      return;
    }

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
        showToast('Aula atualizada!');
      } else {
        await api.post(`/courses/${selectedCourseForLessons.id}/lessons`, payload);
        showToast('Aula adicionada com sucesso!');
      }

      setIsLessonModalOpen(false);
      setEditingLesson(null);
      setLessonTitle('');
      setLessonDesc('');
      setLessonVideoUrl('');
      setLessonDuration('');

      // Recarrega aulas
      const res = await api.get(`/courses/${selectedCourseForLessons.id}`);
      setLessons(res.data?.lessons || []);
      fetchCourses(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar aula.');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    if (!selectedCourseForLessons) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aula',
      description: `Deseja realmente excluir a aula "${lesson.title}"?`,
      confirmLabel: 'Excluir Aula',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/courses/lessons/${lesson.id}`);
          const res = await api.get(`/courses/${selectedCourseForLessons.id}`);
          setLessons(res.data?.lessons || []);
          fetchCourses(true);
          showToast('Aula removida!');
        } catch {
          showToast('Erro ao excluir aula.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // =========================================================================
  // GESTÃO DE ALUNAS & MATRÍCULAS
  // =========================================================================
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [targetCourseId, setTargetCourseId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [registerPaymentInCash, setRegisterPaymentInCash] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH'>('PIX');
  const [savingAccess, setSavingAccess] = useState(false);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCourseId || !studentName.trim() || !studentPhone.trim()) {
      showToast('Preencha o curso, nome e telefone com DDD da aluna.');
      return;
    }

    setSavingAccess(true);
    try {
      await api.post(`/courses/${targetCourseId}/access`, {
        clientName: studentName.trim(),
        phone: studentPhone.trim(),
        registerPayment: registerPaymentInCash,
        paymentAmount: registerPaymentInCash && paymentAmount ? Number(paymentAmount) : undefined,
        paymentMethod
      });

      setIsAccessModalOpen(false);
      setStudentName('');
      setStudentPhone('');
      setRegisterPaymentInCash(false);
      setPaymentAmount('');
      fetchSubscribers(true);
      fetchCourses(true);
      showToast('Aluna matriculada com sucesso!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao conceder acesso à aluna.');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleToggleAccessStatus = async (sub: Subscriber) => {
    try {
      await api.patch(`/courses/access/${sub.id}/toggle`, {});
      fetchSubscribers(true);
      showToast(`Acesso da aluna ${sub.isActive ? 'revogado' : 'reativado'}!`);
    } catch {
      showToast('Erro ao alterar status de acesso.');
    }
  };

  const handleDeleteAccess = (sub: Subscriber) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revogar e Excluir Matrícula',
      description: `Deseja realmente remover o acesso de ${sub.client?.name || sub.phone} ao curso ${sub.course?.title || ''}?`,
      confirmLabel: 'Sim, Remover',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/courses/access/${sub.id}`);
          fetchSubscribers(true);
          fetchCourses(true);
          showToast('Matrícula removida com sucesso!');
        } catch {
          showToast('Erro ao remover matrícula.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Emitir ou Abrir Certificado
  const handleOpenCertificate = async (sub: Subscriber) => {
    setIssuingCertificate(true);
    try {
      // Endpoint emite código se ainda não possuir e retorna dados completos
      const res = await api.post(`/courses/access/${sub.id}/certificate`, {});
      setActiveCertificateData(res.data);
      setCertificateModalOpen(true);
      fetchSubscribers(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao emitir/carregar certificado da aluna.');
    } finally {
      setIssuingCertificate(false);
    }
  };

  // WhatsApp Suporte / Acesso
  const handleOpenWhatsApp = (name: string, phone: string, courseTitle?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithDdd = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Olá, ${name}! Seu acesso à formação em *${courseTitle || 'nosso curso'}* está liberado com sucesso na plataforma! Se tiver qualquer dúvida sobre as aulas práticas ou materiais de apoio, estou à disposição por aqui.`
    );
    window.open(`https://wa.me/${phoneWithDdd}?text=${msg}`, '_blank');
  };

  const filteredSubscribers = useMemo(() => {
    const list = Array.isArray(subscribers) ? subscribers : [];
    return list.filter((sub) => {
      if (statusFilter === 'ACTIVE') return sub.isActive;
      if (statusFilter === 'REVOKED') return !sub.isActive;
      return true;
    });
  }, [subscribers, statusFilter]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-zinc-800 transition-all flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Cabeçalho Principal Unificado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-3xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">Cursos &amp; Alunas</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
              {Array.isArray(courses) ? courses.length : 0} {(Array.isArray(courses) ? courses.length : 0) === 1 ? 'formação' : 'formações'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Gestão de videoaulas, alunas matriculadas, controle de pagamentos e emissão de certificados oficiais com QR Code.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'courses' && (
            <button
              onClick={() => {
                if (!hasCoursesPlan) {
                  showToast('O módulo de Cursos Online está liberado a partir do plano Equipe Pro.');
                  return;
                }
                setEditingCourse(null);
                resetCourseForm();
                setIsCourseModalOpen(true);
              }}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Curso</span>
            </button>
          )}

          {activeTab === 'subscribers' && (
            <button
              onClick={() => {
                if (courses.length === 0) {
                  showToast('Cadastre um curso antes de matricular alunas.');
                  return;
                }
                setTargetCourseId(courses[0].id);
                setStudentName('');
                setStudentPhone('');
                setRegisterPaymentInCash(false);
                setPaymentAmount('');
                setIsAccessModalOpen(true);
              }}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Matricular Aluna</span>
            </button>
          )}
        </div>
      </div>

      {/* Upgrade Gate se não tiver plano com Cursos */}
      {!hasCoursesPlan && (
        <div className="p-6 bg-zinc-900 text-white rounded-3xl border border-zinc-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2.5 py-0.5 rounded-full">
                Exclusivo Plano Equipe Pro
              </span>
              <h3 className="text-sm font-bold text-zinc-100">Módulo de Cursos &amp; Alunas com Certificados</h3>
            </div>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              Monetize seu conhecimento ministrando workshops, videoaulas e emitindo certificados profissionais com verificação pública. Faça upgrade para o plano Equipe Pro para liberar o módulo completo.
            </p>
          </div>
          <Link
            href="/dashboard/planos"
            className="px-4 py-2.5 bg-white text-zinc-950 hover:bg-zinc-100 rounded-xl text-xs font-bold shadow-sm shrink-0 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Fazer Upgrade para Equipe Pro</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 2. Barra de Métricas Rápidas */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total de Cursos</div>
            <div className="text-xl font-bold text-zinc-900 mt-0.5">{analytics.totalCourses}</div>
          </div>
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Alunas Matriculadas</div>
            <div className="text-xl font-bold text-zinc-900 mt-0.5">{analytics.totalStudents}</div>
          </div>
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Acessos Ativos</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{analytics.activeStudents}</div>
          </div>
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Certificados Emitidos</div>
            <div className="text-xl font-bold text-zinc-900 mt-0.5">{analytics.certifiedStudents}</div>
          </div>
        </div>
      )}

      {/* 3. Seletor de Abas Integradas */}
      <div className="flex items-center gap-2 border-b border-zinc-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('courses')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'courses'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Cursos &amp; Aulas</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'subscribers'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Alunas &amp; Matrículas</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
            {Array.isArray(subscribers) ? subscribers.length : 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Certificado Digital</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* ABA 1: CURSOS & AULAS                                                 */}
      {/* ===================================================================== */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 bg-white rounded-3xl border border-zinc-200/80 flex flex-col items-center justify-center text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-900 mb-2" />
              <p className="text-xs font-semibold text-zinc-600">Carregando catálogo de cursos...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-20 bg-white rounded-3xl border border-zinc-200/80 text-center px-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Você ainda não cadastrou nenhum curso</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                Disponibilize videoaulas para suas alunas e gere uma nova fonte de renda para seu espaço.
              </p>
              <button
                onClick={() => {
                  setEditingCourse(null);
                  resetCourseForm();
                  setIsCourseModalOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800"
              >
                Cadastrar Primeiro Curso
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Capa */}
                  <div className="relative h-44 bg-zinc-100 overflow-hidden">
                    {course.coverUrl ? (
                      <img src={course.coverUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                        <GraduationCap className="w-12 h-12 stroke-[1.2]" />
                        <span className="text-[10px] mt-1 font-medium">Sem imagem de capa</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          course.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {course.isActive ? 'Ativo' : 'Oculto'}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700">
                          {course.price ? `R$ ${Number(course.price).toFixed(2)}` : 'Acesso Livre'}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {course._count?.lessons || 0} {(course._count?.lessons || 0) === 1 ? 'aula' : 'aulas'} •{' '}
                          {course._count?.accesses || 0} alunas
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 mt-1 line-clamp-1">{course.title}</h3>
                      {course.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{course.description}</p>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenLessonsModal(course)}
                        type="button"
                        className="flex-1 py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Gerenciar Aulas</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditCourse(course)}
                        type="button"
                        className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                        title="Editar curso"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(course)}
                        type="button"
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir curso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: ALUNAS & MATRÍCULAS                                            */}
      {/* ===================================================================== */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchSubscriber}
                onChange={(e) => setSearchSubscriber(e.target.value)}
                placeholder="Buscar aluna por nome ou telefone..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:outline-none"
              >
                <option value="ALL">Todos os Cursos</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:outline-none"
              >
                <option value="ALL">Status: Todos</option>
                <option value="ACTIVE">Apenas Ativas</option>
                <option value="REVOKED">Apenas Revogadas</option>
              </select>
            </div>
          </div>

          {/* Tabela de Alunas */}
          {loadingSubscribers ? (
            <div className="py-20 bg-white rounded-2xl border border-zinc-200/80 text-center text-zinc-400">
              <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-zinc-900" />
              <p className="text-xs">Carregando alunas matriculadas...</p>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="py-16 bg-white rounded-2xl border border-zinc-200/80 text-center px-4">
              <Users className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
              <h3 className="text-sm font-semibold text-zinc-800">Nenhuma aluna encontrada</h3>
              <p className="text-xs text-zinc-500 mt-1">
                {searchSubscriber ? 'Nenhum resultado para a busca aplicada.' : 'Matricule sua primeira aluna pelo botão acima.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Aluna</th>
                      <th className="py-3 px-4">Formação</th>
                      <th className="py-3 px-4">Matrícula</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Certificado</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredSubscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-zinc-50/60 transition-colors">
                        {/* Nome & Telefone */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900">{sub.client?.name || 'Aluna'}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-400" />
                            <span>{sub.phone}</span>
                          </div>
                        </td>

                        {/* Curso */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-800">{sub.course?.title || 'Curso'}</div>
                          {sub.course?.price && (
                            <div className="text-[11px] text-zinc-500">R$ {Number(sub.course.price).toFixed(2)}</div>
                          )}
                        </td>

                        {/* Data */}
                        <td className="py-3 px-4 text-zinc-600">
                          {new Date(sub.grantedAt).toLocaleDateString('pt-BR')}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleAccessStatus(sub)}
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          >
                            {sub.isActive ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                                <XCircle className="w-3 h-3" /> Revogado
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Botão de Certificado */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenCertificate(sub)}
                            disabled={issuingCertificate}
                            type="button"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shadow-2xs ${
                              sub.certificateCode
                                ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-300 hover:bg-zinc-200'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{sub.certificateCode ? 'Ver Diploma' : 'Emitir'}</span>
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenWhatsApp(sub.client?.name || 'Aluna', sub.phone, sub.course?.title)}
                              type="button"
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Enviar mensagem no WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAccess(sub)}
                              type="button"
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remover acesso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 3: CERTIFICADO DIGITAL                                            */}
      {/* ===================================================================== */}
      {activeTab === 'certificates' && (
        <CertificateConfigTab
          courses={courses}
          onConfigSaved={() => fetchCourses(true)}
          showToast={showToast}
        />
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: CRIAR / EDITAR CURSO                                         */}
      {/* ===================================================================== */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingCourse ? 'Editar Formação / Curso' : 'Cadastrar Novo Curso'}
              </h3>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Título da Formação *</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Ex: Formação Master em Alongamento de Unhas"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Detalhes sobre a técnica, materiais e suporte..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(e.target.value)}
                    placeholder="0.00 (ou em branco)"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Status</label>
                  <select
                    value={courseIsActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setCourseIsActive(e.target.value === 'ACTIVE')}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:outline-none"
                  >
                    <option value="ACTIVE">Ativo na Plataforma</option>
                    <option value="INACTIVE">Rascunho / Oculto</option>
                  </select>
                </div>
              </div>

              {/* Upload de Imagem de Capa */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Imagem de Capa</label>
                <div className="flex items-center gap-3">
                  {courseCover ? (
                    <img src={courseCover} alt="Capa" className="w-16 h-10 object-cover rounded-lg border" />
                  ) : (
                    <div className="w-16 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400 text-[10px]">
                      Sem capa
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium border border-zinc-300">
                    {uploadingCover ? 'Enviando...' : courseCover ? 'Trocar Capa' : 'Carregar Imagem'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCourse}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingCourse ? 'Salvando...' : editingCourse ? 'Salvar Alterações' : 'Criar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: MATRICULAR NOVA ALUNA                                        */}
      {/* ===================================================================== */}
      {isAccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900">Matricular Aluna</h3>
              <button
                onClick={() => setIsAccessModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Formação / Curso *</label>
                <select
                  required
                  value={targetCourseId}
                  onChange={(e) => {
                    setTargetCourseId(e.target.value);
                    const sel = courses.find((c) => c.id === e.target.value);
                    if (sel?.price) {
                      setPaymentAmount(String(sel.price));
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.price ? `(R$ ${Number(c.price).toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Nome Completo da Aluna *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ex: Juliana Mendes"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Telefone / WhatsApp com DDD *</label>
                <InputMask
                  mask="phone"
                  value={studentPhone}
                  onChangeValue={(formatted) => setStudentPhone(formatted)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Registro Financeiro no Caixa */}
              <div className="pt-2 border-t border-zinc-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerPaymentInCash}
                    onChange={(e) => {
                      setRegisterPaymentInCash(e.target.checked);
                      if (e.target.checked && !paymentAmount) {
                        const sel = courses.find((c) => c.id === targetCourseId);
                        if (sel?.price) setPaymentAmount(String(sel.price));
                      }
                    }}
                    className="w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-800">
                    Lançar entrada financeira no Caixa (Receita)
                  </span>
                </label>

                {registerPaymentInCash && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Valor Recebido (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Forma de Pagamento</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800"
                      >
                        <option value="PIX">PIX Direto</option>
                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                        <option value="DEBIT_CARD">Cartão de Débito</option>
                        <option value="CASH">Dinheiro</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAccessModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAccess}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingAccess ? 'Matriculando...' : 'Confirmar Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: GERENCIADOR DE AULAS DO CURSO                                */}
      {/* ===================================================================== */}
      {selectedCourseForLessons && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200/80 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Videoaulas: {selectedCourseForLessons.title}
                </h3>
                <p className="text-xs text-zinc-500">
                  {lessons.length} {lessons.length === 1 ? 'aula cadastrada' : 'aulas cadastradas'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingLesson(null);
                    setLessonTitle('');
                    setLessonDesc('');
                    setLessonVideoUrl('');
                    setLessonDuration('');
                    setIsLessonModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Aula</span>
                </button>
                <button
                  onClick={() => setSelectedCourseForLessons(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista de Aulas */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {loadingLessons ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-900" />
                  Carregando aulas...
                </div>
              ) : lessons.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  Nenhuma aula cadastrada ainda. Adicione links de vídeos do YouTube (não listado), Vimeo ou Drive.
                </div>
              ) : (
                lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{lesson.title}</h4>
                        {lesson.duration && (
                          <span className="text-[10px] text-zinc-500">{lesson.duration}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewVideoUrl(lesson.videoUrl)}
                        type="button"
                        className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 text-emerald-600" />
                        <span>Assistir</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingLesson(lesson);
                          setLessonTitle(lesson.title);
                          setLessonDesc(lesson.description || '');
                          setLessonVideoUrl(lesson.videoUrl);
                          setLessonDuration(lesson.duration || '');
                          setIsLessonModalOpen(true);
                        }}
                        type="button"
                        className="p-1 text-zinc-400 hover:text-zinc-700"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteLesson(lesson)}
                        type="button"
                        className="p-1 text-zinc-400 hover:text-red-600"
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

      {/* ===================================================================== */}
      {/* MODAL 4: NOVA / EDITAR AULA                                           */}
      {/* ===================================================================== */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingLesson ? 'Editar Aula' : 'Nova Videoaula'}
              </h3>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Título da Aula *</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ex: Aula 01 - Preparação e Biossegurança"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Link do Vídeo (YouTube, Vimeo ou Drive) *
                </label>
                <input
                  type="text"
                  required
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  placeholder="https://youtu.be/... ou https://vimeo.com/..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Recomendado: Crie vídeos &quot;Não Listados&quot; no YouTube para que apenas suas alunas matriculadas assistam.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Duração Estimada (Opcional)</label>
                <input
                  type="text"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  placeholder="Ex: 25 min"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLesson}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                >
                  {savingLesson ? 'Salvando...' : 'Salvar Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: PLAYER DE VÍDEO (ASSISTIR AULA)                              */}
      {/* ===================================================================== */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-200">Reprodução de Videoaula</span>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe
                src={previewVideoUrl.replace('watch?v=', 'embed/')}
                title="Player de Videoaula"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Certificado */}
      <CertificateModal
        isOpen={certificateModalOpen}
        onClose={() => setCertificateModalOpen(false)}
        data={activeCertificateData}
      />

      {/* Modal de Confirmação Seguro */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        isDestructive={confirmModal.isDestructive}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function CursosEAlunasPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      }
    >
      <CursosEAlunasContent />
    </React.Suspense>
  );
}
