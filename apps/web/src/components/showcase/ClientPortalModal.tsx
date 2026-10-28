'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Loader2,
  Calendar,
  ShoppingBag,
  ShieldCheck,
  FileText,
  GraduationCap,
  Info,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  RotateCcw,
  Star,
  Package,
  Copy,
  Check
} from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { InputMask } from '@/components/ui/InputMask';

interface ClientPortalModalProps {
  slug: string;
  tenantName: string;
  tenantPhone?: string;
  brandColor?: string;
  onClose: () => void;
}

interface PortalSchedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  serviceName: string;
  professionalName: string;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  arrivalPhotoUrl?: string | null;
  resultPhotoUrl?: string | null;
  npsScore?: number | null;
  npsFeedback?: string | null;
}

interface PortalProduct {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  salePrice: number;
  stockQuantity: number;
  imageUrl?: string | null;
}

interface PortalData {
  client: {
    id: string;
    name: string;
    phone: string;
    anamnesis?: any;
    anamnesisToken?: string;
  } | null;
  tenant: {
    name: string;
    slug: string;
    phone: string;
    addressStreet: string;
    addressNumber: string;
    addressNeighborhood: string;
    addressCity: string;
    addressState: string;
    openingTime: string;
    closingTime: string;
    pixKey?: string | null;
    pixKeyType?: string | null;
    pixKeyHolder?: string | null;
    googleReviewUrl?: string | null;
    courses: Array<{
      id: string;
      title: string;
      description?: string | null;
      price?: number | null;
      coverUrl?: string | null;
    }>;
    products?: PortalProduct[];
    aftercareGuides?: Array<{
      id: string;
      title: string;
      category: string;
      description?: string;
      items: string[];
      isActive: boolean;
    }>;
  };
  schedules: PortalSchedule[];
}

export function ClientPortalModal({
  slug,
  tenantName,
  tenantPhone,
  brandColor = '#5c0701',
  onClose
}: ClientPortalModalProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'schedules' | 'products' | 'aftercare' | 'anamnesis' | 'courses' | 'info'
  >('schedules');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [aftercareCategory, setAftercareCategory] = useState<string>('cilios');

  // Estados de Avaliação NPS em Tempo Real
  const [evaluatingScheduleId, setEvaluatingScheduleId] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [googlePromptUrl, setGooglePromptUrl] = useState<string | null>(null);

  const handleSubmitReview = async (scheduleId: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;

    setSubmittingReview(true);
    try {
      const res = await api.post(`/public/client-portal/${slug}/schedules/${scheduleId}/review`, {
        phone: cleanPhone,
        score: selectedScore,
        feedback: feedbackText.trim() || null
      });

      // Atualiza a lista local de agendamentos com a nota dada
      if (portalData) {
        setPortalData({
          ...portalData,
          schedules: portalData.schedules.map((s) =>
            s.id === scheduleId
              ? { ...s, npsScore: selectedScore, npsFeedback: feedbackText.trim() || null }
              : s
          )
        });
      }

      setReviewSuccessMessage('Sua avaliação foi registrada com sucesso! Muito obrigado.');
      setEvaluatingScheduleId(null);
      setFeedbackText('');

      if (res.data?.googleReviewUrl && selectedScore >= 4) {
        setGooglePromptUrl(res.data.googleReviewUrl);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Falha ao registrar sua avaliação. Tente novamente.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Informe seu telefone completo com DDD.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/public/client-portal/${slug}?phone=${cleanPhone}`);
      setPortalData(res.data);
      setHasSearched(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao buscar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const clean = dateStr.slice(0, 10);
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; bg: string }> = {
      CONFIRMED: { label: 'Confirmado', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      IN_SERVICE: { label: 'Em Atendimento', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
      COMPLETED: { label: 'Concluído', bg: 'bg-slate-100 text-slate-800 border-slate-200' },
      NO_SHOW: { label: 'Não Compareceu', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
      CANCELLED: { label: 'Cancelado', bg: 'bg-red-50 text-red-800 border-red-200' },
      PENDING: { label: 'Pendente', bg: 'bg-blue-50 text-blue-800 border-blue-200' }
    };
    return map[status] || { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const handleRebook = () => {
    onClose();
    setTimeout(() => {
      const el = document.getElementById('agendamento');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handleCopyPix = () => {
    if (portalData?.tenant.pixKey) {
      navigator.clipboard.writeText(portalData.tenant.pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const completedCount =
    portalData?.schedules.filter((s) => s.status === 'COMPLETED').length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh]"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {tenantName}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Portal da Cliente
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
              {error}
            </div>
          )}

          {reviewSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-2xl font-bold border border-emerald-200 flex items-center justify-between">
              <span>{reviewSuccessMessage}</span>
              <button
                type="button"
                onClick={() => setReviewSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          {googlePromptUrl && (
            <div className="p-4 bg-amber-50 text-amber-950 text-xs rounded-2xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Gostaria de apoiar o salão no Google?
                </span>
                <button
                  type="button"
                  onClick={() => setGooglePromptUrl(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>
              <p className="text-slate-600 text-[11px]">
                Sua avaliação 5 estrelas faz toda a diferença para o nosso salão no Google Meu Negócio!
              </p>
              <div className="pt-1">
                <a
                  href={googlePromptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setGooglePromptUrl(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>Publicar no Google Meu Negócio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Busca Inicial por Telefone */}
          {!hasSearched ? (
            <div className="space-y-4 max-w-md mx-auto text-center py-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Consulte seus agendamentos, produtos e ficha
                </h4>
                <p className="text-xs text-slate-500">
                  Digite o número do seu WhatsApp com DDD para acessar seu histórico de horários, linha de produtos, guia de cuidados e anamnese.
                </p>
              </div>

              <form onSubmit={handleSearch} className="space-y-3 pt-2">
                <InputMask
                  mask="phone"
                  value={phone}
                  onChangeValue={(formatted) => setPhone(formatted)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-bold font-mono text-center outline-hidden focus:border-slate-900 bg-slate-50/50"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[46px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Consultando...' : 'Acessar Meu Painel'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Identificação e Fidelidade da Cliente */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cliente
                  </span>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {portalData?.client?.name || 'Cliente Cadastrada'}
                    </h4>
                    {completedCount >= 3 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-600" />
                        Cliente Fidelidade
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-500 block">
                    {phone}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {completedCount > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                        Visitas
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-800">
                        {completedCount} realizadas
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setHasSearched(false);
                      setPortalData(null);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    Trocar número
                  </button>
                </div>
              </div>

              {/* Navegação em Abas Sóbrias com Scroll Horizontal suave */}
              <div className="flex border-b border-slate-200/80 gap-1 overflow-x-auto pb-px scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('schedules')}
                  className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'schedules'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Agendamentos ({portalData?.schedules.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'products'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Produtos & Home Care ({portalData?.tenant.products?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('aftercare')}
                  className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'aftercare'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cuidados Pós-Atendimento
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('anamnesis')}
                  className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'anamnesis'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ficha de Anamnese
                </button>

                {Boolean(portalData?.tenant.courses && portalData.tenant.courses.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'courses'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Cursos ({portalData?.tenant.courses.length})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'info'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  Sobre o Salão
                </button>
              </div>

              {/* ABA 1: Agendamentos */}
              {activeTab === 'schedules' && (
                <div className="space-y-3">
                  {!portalData?.schedules || portalData.schedules.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-600">
                          Nenhum agendamento encontrado para este número.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Escolha um serviço e horário na vitrine para agendar seu primeiro atendimento.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRebook}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Agendar Agora
                      </button>
                    </div>
                  ) : (
                    portalData.schedules.map((s) => {
                      const st = getStatusLabel(s.status);
                      const isCompleted = s.status === 'COMPLETED';

                      return (
                        <div
                          key={s.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-sm font-bold text-slate-900">
                                {s.serviceName}
                              </h5>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Profissional: <strong className="text-slate-700">{s.professionalName}</strong>
                              </p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.bg}`}>
                              {st.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Data e Horário
                              </span>
                              <span className="font-semibold text-slate-800">
                                {formatDateBR(s.date)} às {s.startTime}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Origem do Agendamento
                              </span>
                              <span className="font-bold text-slate-700 font-mono text-[11px]">
                                {s.source === 'WHATSAPP'
                                  ? 'Origem: WhatsApp'
                                  : s.source === 'MANUAL_RECEPTION' || s.source === 'MANUAL'
                                  ? 'Origem: Balcão'
                                  : 'Origem: Vitrine Online'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Valor
                              </span>
                              <span className="font-bold text-slate-900 font-mono">
                                R$ {s.totalPrice.toFixed(2).replace('.', ',')}
                              </span>
                              {s.depositAmount > 0 && (
                                <span className="block text-[10px] text-emerald-700 font-medium font-mono">
                                  {s.depositPaid ? `(Sinal R$ ${s.depositAmount.toFixed(2)} pago)` : `(Sinal R$ ${s.depositAmount.toFixed(2)} pendente)`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Fotos do Atendimento se houver */}
                          {(s.arrivalPhotoUrl || s.resultPhotoUrl) && (
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Registro Visual do Atendimento
                              </span>
                              <div className="flex gap-2">
                                {s.arrivalPhotoUrl && (
                                  <div
                                    onClick={() => setPreviewPhoto({ url: resolveImageUrl(s.arrivalPhotoUrl)!, title: 'Foto de Entrada' })}
                                    className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-slate-100 hover:opacity-90 relative"
                                  >
                                    <img src={resolveImageUrl(s.arrivalPhotoUrl)} alt="Entrada" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5 font-bold">
                                      Antes
                                    </span>
                                  </div>
                                )}
                                {s.resultPhotoUrl && (
                                  <div
                                    onClick={() => setPreviewPhoto({ url: resolveImageUrl(s.resultPhotoUrl)!, title: 'Resultado Final' })}
                                    className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-slate-100 hover:opacity-90 relative"
                                  >
                                    <img src={resolveImageUrl(s.resultPhotoUrl)} alt="Saída" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-white text-[8px] text-center py-0.5 font-bold">
                                      Depois
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Avaliação NPS & Feedback do Atendimento Concluído */}
                          {isCompleted && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              {s.npsScore ? (
                                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`w-3.5 h-3.5 ${
                                              star <= (s.npsScore || 0)
                                                ? 'fill-amber-400 text-amber-500'
                                                : 'text-slate-200'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs font-bold text-amber-950">
                                        Sua Avaliação: {s.npsScore}/5
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800">
                                      Avaliado
                                    </span>
                                  </div>
                                  {s.npsFeedback && (
                                    <p className="text-xs text-slate-700 italic">
                                      "{s.npsFeedback}"
                                    </p>
                                  )}
                                  {s.npsScore >= 4 && portalData?.tenant.googleReviewUrl && (
                                    <div className="pt-1.5 flex items-center justify-between border-t border-amber-200/60">
                                      <span className="text-[11px] text-amber-900 font-medium">
                                        Compartilhe também no Google:
                                      </span>
                                      <a
                                        href={portalData.tenant.googleReviewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-2xs transition-colors"
                                      >
                                        <Star className="w-3 h-3 fill-white" />
                                        <span>Avaliar no Google</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ) : evaluatingScheduleId === s.id ? (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900">
                                      Como foi seu atendimento com {s.professionalName}?
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEvaluatingScheduleId(null)}
                                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>

                                  {/* Seletor Interativo de 1 a 5 estrelas */}
                                  <div className="flex items-center gap-1.5 py-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setSelectedScore(star)}
                                        className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                        title={`${star} estrela${star > 1 ? 's' : ''}`}
                                      >
                                        <Star
                                          className={`w-6 h-6 transition-colors ${
                                            star <= selectedScore
                                              ? 'fill-amber-400 text-amber-500'
                                              : 'text-slate-300 hover:text-amber-300'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                    <span className="text-xs font-bold font-mono text-slate-700 ml-2">
                                      {selectedScore === 5 && 'Excelente (5/5)'}
                                      {selectedScore === 4 && 'Muito Bom (4/5)'}
                                      {selectedScore === 3 && 'Razoável (3/5)'}
                                      {selectedScore === 2 && 'Insatisfeito (2/5)'}
                                      {selectedScore === 1 && 'Péssimo (1/5)'}
                                    </span>
                                  </div>

                                  {/* Campo de comentário opcional */}
                                  <div>
                                    <textarea
                                      value={feedbackText}
                                      onChange={(e) => setFeedbackText(e.target.value)}
                                      placeholder="Deixe um comentário ou elogio para a profissional (opcional)..."
                                      rows={2}
                                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-hidden focus:border-slate-800"
                                      maxLength={500}
                                    />
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEvaluatingScheduleId(null)}
                                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                                    >
                                      Depois
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitReview(s.id)}
                                      disabled={submittingReview}
                                      className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                    >
                                      {submittingReview ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                      )}
                                      <span>Enviar Avaliação</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEvaluatingScheduleId(s.id);
                                    setSelectedScore(5);
                                    setFeedbackText('');
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                    <span>Como foi este atendimento? Avalie sua experiência</span>
                                  </div>
                                  <span className="text-[11px] underline">Dar nota &rarr;</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Ações Rápidas: Reagendar */}
                          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={handleRebook}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                              <span>Reagendar este serviço</span>
                            </button>

                            {isCompleted && !s.npsScore && evaluatingScheduleId !== s.id && portalData?.tenant.googleReviewUrl && (
                              <a
                                href={portalData.tenant.googleReviewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold transition-colors"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-600" />
                                <span>Avaliar no Google</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ABA 2: Produtos & Linha Home Care */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">
                        Linha Home Care do Estabelecimento
                      </h5>
                      <p className="text-xs text-slate-500">
                        Produtos recomendados pela equipe para manter seus resultados em casa.
                      </p>
                    </div>
                  </div>

                  {!portalData?.tenant.products || portalData.tenant.products.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                      <Package className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                      <p className="text-xs font-semibold text-slate-600">
                        Nenhum produto cadastrado para pronta-entrega no momento.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Consulte as recomendações de produtos diretamente com o profissional na recepção.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {portalData.tenant.products.map((prod) => {
                        const buyUrl = `https://wa.me/55${portalData.tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá! Vi o produto "${prod.name}" no portal da cliente e gostaria de reservar para retirar no meu próximo atendimento.`
                        )}`;

                        return (
                          <div
                            key={prod.id}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-colors"
                          >
                            <div>
                              <div className="relative w-full h-28 rounded-xl overflow-hidden bg-slate-100 mb-2.5 flex items-center justify-center border border-slate-200/60">
                                {prod.imageUrl ? (
                                  <img
                                    src={resolveImageUrl(prod.imageUrl)}
                                    alt={prod.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <Package className="w-7 h-7 text-slate-300 stroke-1" />
                                )}
                                {prod.stockQuantity > 0 && prod.stockQuantity <= 3 && (
                                  <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-bold uppercase">
                                    Últimas unidades
                                  </span>
                                )}
                              </div>

                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                                {prod.category || 'Home Care'}
                              </span>
                              <h6 className="text-xs font-bold text-slate-900 line-clamp-1">
                                {prod.name}
                              </h6>
                              {prod.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                  {prod.description}
                                </p>
                              )}
                            </div>

                            <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[9px] font-semibold text-slate-400 block uppercase">
                                  Preço
                                </span>
                                <span className="text-xs font-bold font-mono text-slate-900">
                                  R$ {Number(prod.salePrice).toFixed(2).replace('.', ',')}
                                </span>
                              </div>

                              <a
                                href={buyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 text-emerald-800 text-[11px] font-bold transition-colors"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600" />
                                <span>Reservar</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: Cuidados Pós-Atendimento (Aftercare Digital) */}
              {activeTab === 'aftercare' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">
                        Guia de Cuidados Pós-Atendimento
                      </h5>
                      <p className="text-xs text-slate-500">
                        Instruções práticas para preservar os resultados e a saúde do seu procedimento.
                      </p>
                    </div>
                  </div>

                  {/* Seletor e Conteúdo Dinâmico por Guia de Cuidado */}
                  {(() => {
                    const activeGuides = (portalData?.tenant.aftercareGuides || []).filter(
                      (g) => g.isActive !== false
                    );

                    if (activeGuides.length === 0) {
                      return (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
                          <p className="text-xs font-semibold text-slate-700">
                            Nenhum guia de cuidados cadastrado no momento.
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                            Para tirar qualquer dúvida sobre o pós-procedimento do seu atendimento, entre em contato direto com a recepção pelo WhatsApp.
                          </p>
                          {portalData?.tenant.phone && (
                            <a
                              href={`https://wa.me/55${portalData.tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                'Olá! Gostaria de tirar uma dúvida sobre os cuidados recomendados após o meu atendimento.'
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold transition-all shadow-xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Falar no WhatsApp</span>
                            </a>
                          )}
                        </div>
                      );
                    }

                    const selectedGuide =
                      activeGuides.find((g) => g.id === aftercareCategory) || activeGuides[0];

                    return (
                      <>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {activeGuides.map((guide) => (
                            <button
                              key={guide.id}
                              type="button"
                              onClick={() => setAftercareCategory(guide.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                                selectedGuide?.id === guide.id
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {guide.title}
                            </button>
                          ))}
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3 text-xs leading-relaxed text-slate-700">
                          {selectedGuide && (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {selectedGuide.category}
                                </span>
                                <h6 className="font-bold text-slate-900 text-sm">
                                  {selectedGuide.title}
                                </h6>
                              </div>
                              {selectedGuide.description && (
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                  {selectedGuide.description}
                                </p>
                              )}
                              <ul className="space-y-2 pt-1">
                                {selectedGuide.items.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Dúvidas no WhatsApp */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              Ficou com alguma dúvida sobre o pós-procedimento?
                            </span>
                            {portalData?.tenant.phone && (
                              <a
                                href={`https://wa.me/55${portalData.tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  'Olá! Gostaria de tirar uma dúvida sobre os cuidados recomendados após o meu atendimento.'
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-slate-600" />
                                <span>Falar com o Salão</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ABA 4: Ficha de Anamnese */}
              {activeTab === 'anamnesis' && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">
                        Ficha de Saúde e Preferências
                      </h5>
                      <p className="text-xs text-slate-500">
                        Mantenha suas informações de saúde atualizadas para garantir um atendimento seguro.
                      </p>
                    </div>
                  </div>

                  {portalData?.client?.anamnesis ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <strong>Possui Alergias:</strong>{' '}
                          {portalData.client.anamnesis.hasAllergies
                            ? portalData.client.anamnesis.allergies || 'Sim'
                            : 'Não'}
                        </div>
                        <div>
                          <strong>Diabetes:</strong>{' '}
                          {portalData.client.anamnesis.isDiabetic ? 'Sim (Cuidado com cutilagem)' : 'Não'}
                        </div>
                        <div>
                          <strong>Histórico de Micose/Fungo:</strong>{' '}
                          {portalData.client.anamnesis.hasNailMycosis ? 'Sim' : 'Não'}
                        </div>
                        <div>
                          <strong>Formato Predileto:</strong>{' '}
                          {portalData.client.anamnesis.preferredShape || 'Não especificado'}
                        </div>
                      </div>
                      {portalData.client.anamnesis.notes && (
                        <div className="pt-2 border-t border-slate-200/60 text-slate-600">
                          <strong>Observações:</strong> {portalData.client.anamnesis.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Você ainda não preencheu sua ficha de anamnese.
                    </p>
                  )}

                  {portalData?.client?.anamnesisToken && (
                    <div className="pt-2">
                      <a
                        href={`/anamnese/${portalData.client.anamnesisToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                      >
                        {portalData.client.anamnesis ? 'Atualizar Minha Ficha' : 'Preencher Ficha Agora'}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 5: Cursos */}
              {activeTab === 'courses' && (
                <div className="space-y-3">
                  {portalData?.tenant.courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                    >
                      <div className="space-y-1">
                        <h5 className="text-sm font-bold text-slate-900">
                          {course.title}
                        </h5>
                        {course.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {course.description}
                          </p>
                        )}
                        {course.price && (
                          <span className="inline-block text-xs font-bold font-mono text-slate-900">
                            Investimento: R$ {course.price.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>

                      {tenantPhone && (
                        <a
                          href={`https://wa.me/55${tenantPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá! Vi o curso "${course.title}" no portal da cliente e gostaria de mais informações sobre matrícula e próximas turmas.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0"
                        >
                          Informações no WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ABA 6: Sobre o Salão & Chave PIX */}
              {activeTab === 'info' && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Localização
                    </span>
                    <p className="font-semibold text-slate-800">
                      {portalData?.tenant.addressStreet}, {portalData?.tenant.addressNumber} — {portalData?.tenant.addressNeighborhood}
                    </p>
                    <p className="text-slate-500">
                      {portalData?.tenant.addressCity} - {portalData?.tenant.addressState}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Horário de Atendimento
                      </span>
                      <p className="font-semibold text-slate-800">
                        {(portalData?.tenant as any)?.operatingHoursSummary || (portalData?.tenant as any)?.todayScheduleLabel || `${portalData?.tenant.openingTime} às ${portalData?.tenant.closingTime}`}
                      </p>
                    </div>

                    {portalData?.tenant.pixKey && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Chave PIX Oficial
                        </span>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-slate-900 break-all">
                            {portalData.tenant.pixKey}
                          </p>
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                            title="Copiar Chave PIX"
                          >
                            {copiedPix ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {portalData.tenant.pixKeyHolder && (
                          <p className="text-[10px] text-slate-500">
                            Favorecido: {portalData.tenant.pixKeyHolder}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span className="text-[11px] text-slate-400">
            {tenantName} · Marque Sua Hora
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Visualizador de Foto em Zoom */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800"
          >
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-white text-xs font-bold">
              <span>{previewPhoto.title}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black">
              <img src={resolveImageUrl(previewPhoto.url)} alt={previewPhoto.title} className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
