'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  CalendarPlus,
  MessageSquare,
  ShieldCheck,
  Sun,
  SunMedium,
  Moon,
  MapPin,
  X,
  Tag,
  Copy,
  Ban,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { formatLocalDateToYMD } from '@/lib/dateUtils';
import { InputMask } from '@/components/ui/InputMask';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import {
  TenantShowcase,
  ServiceItem,
  ProfessionalItem,
  AvailabilitySlotsResponse,
  SlotItem
} from './types';

interface BookingWizardProps {
  tenant: TenantShowcase;
  brandColor?: string;
  initialServiceId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function BookingWizard({
  tenant,
  brandColor = '#5c0701',
  initialServiceId,
  onClose,
  isModal = false
}: BookingWizardProps) {
  // Passos: 1 = Serviços, 2 = Data/Horário, 3 = Dados da Cliente, 4 = Confirmado
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Passo 1: Seleções
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    return initialServiceId ? [initialServiceId] : [];
  });

  // Atualiza se initialServiceId mudar
  useEffect(() => {
    if (initialServiceId && !selectedServiceIds.includes(initialServiceId)) {
      setSelectedServiceIds([initialServiceId]);
    }
  }, [initialServiceId]);

  const isSoloProfessional = (tenant.professionals || []).length === 1;
  const soloProfessional = isSoloProfessional ? tenant.professionals[0] : null;

  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(() => {
    if (tenant.professionals?.length === 1) {
      return tenant.professionals[0].id;
    }
    return '';
  });
  const [professionalError, setProfessionalError] = useState<string | null>(null);


  // Passo 2: Data e Horário
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return formatLocalDateToYMD(new Date());
  });
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsData, setSlotsData] = useState<AvailabilitySlotsResponse['slots']>({
    morning: [],
    afternoon: [],
    night: []
  });
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isDayOpen, setIsDayOpen] = useState<boolean>(true);
  const [dayClosedReason, setDayClosedReason] = useState<string | null>(null);

  // Passo 3: Dados da Cliente & Cupons
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cupom de Desconto
  const [showCouponInput, setShowCouponInput] = useState<boolean>(false);
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
    message: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Passo 4: Dados do Agendamento Criado
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  // Garante seleção do profissional quando solo
  useEffect(() => {
    if (tenant.professionals?.length === 1 && !selectedProfessionalId) {
      setSelectedProfessionalId(tenant.professionals[0].id);
    }
  }, [tenant.professionals, selectedProfessionalId]);

  // Lista dos serviços selecionados
  const selectedServices = useMemo(() => {
    return tenant.services.filter((s) => selectedServiceIds.includes(s.id));
  }, [tenant.services, selectedServiceIds]);

  // Duração total estimada dos serviços em minutos
  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  }, [selectedServices]);

  // Preço total dos serviços selecionados
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);
  }, [selectedServices]);

  const finalBookingTotal = appliedCoupon ? appliedCoupon.finalAmount : totalPrice;

  // Toggle de seleção de serviços no Passo 1
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  // Agrupa serviços por Categoria/Especialidade respeitando rigorosamente a ordem
  const categorizedServices = useMemo(() => {
    const map: Record<
      string,
      { categoryName: string; description?: string | null; sortOrder: number; services: ServiceItem[] }
    > = {};

    // 1. Inicializa com as categorias do tenant na ordem correta
    if (tenant.categories && tenant.categories.length > 0) {
      tenant.categories.forEach((cat, idx) => {
        map[cat.id] = {
          categoryName: cat.name,
          description: cat.description,
          sortOrder: (cat as any).sortOrder !== undefined ? (cat as any).sortOrder : idx,
          services: []
        };
      });
    }

    // 2. Distribui os serviços nas categorias
    tenant.services.forEach((s) => {
      let targetKey = s.categoryId && map[s.categoryId] ? s.categoryId : null;

      if (!targetKey && s.category) {
        const found = Object.entries(map).find(
          ([_, val]) => val.categoryName.trim().toLowerCase() === s.category.trim().toLowerCase()
        );
        if (found) targetKey = found[0];
      }

      if (!targetKey) {
        targetKey = s.category || 'Geral';
        if (!map[targetKey]) {
          map[targetKey] = {
            categoryName: s.category || 'Outros Serviços',
            description: null,
            sortOrder: 9999,
            services: []
          };
        }
      }

      map[targetKey].services.push(s);
    });

    const entries = Object.entries(map).filter(([_, data]) => data.services.length > 0);
    entries.sort((a, b) => a[1].sortOrder - b[1].sortOrder);
    return entries;
  }, [tenant.categories, tenant.services]);

  // Estado de categorias expandidas (acordeão)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Inicializa com a primeira categoria aberta por padrão
  useEffect(() => {
    if (categorizedServices.length > 0) {
      setExpandedCategories((prev) => {
        if (Object.keys(prev).length > 0) return prev;

        if (initialServiceId) {
          const match = categorizedServices.find(([_, data]) =>
            data.services.some((s) => s.id === initialServiceId)
          );
          if (match) {
            return { [match[0]]: true };
          }
        }

        const firstKey = categorizedServices[0][0];
        return { [firstKey]: true };
      });
    }
  }, [categorizedServices, initialServiceId]);

  const toggleCategory = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  // Nome do profissional selecionado
  const selectedProfessionalName = useMemo(() => {
    if (isSoloProfessional && soloProfessional) {
      return soloProfessional.name;
    }
    if (!selectedProfessionalId || selectedProfessionalId === 'ANY') {
      return 'Sem preferência (qualquer profissional)';
    }
    const found = tenant.professionals?.find((p) => p.id === selectedProfessionalId);
    return found ? found.name : 'Sem preferência';
  }, [selectedProfessionalId, tenant.professionals, isSoloProfessional, soloProfessional]);

  // Avançar para o Passo 2
  const handleProceedToStep2 = () => {
    if (selectedServices.length === 0) return;

    if (tenant.professionals && tenant.professionals.length > 1 && !selectedProfessionalId) {
      setProfessionalError('Por favor, selecione quem vai te atender.');
      return;
    }

    setProfessionalError(null);
    setStep(2);
  };

  // Carrega horários livres do backend
  useEffect(() => {
    if (step !== 2 || selectedServiceIds.length === 0) return;

    let isMounted = true;
    setLoadingSlots(true);
    setSlotsError(null);

    const params = new URLSearchParams();
    selectedServiceIds.forEach((id) => params.append('serviceIds', id));
    if (selectedProfessionalId && selectedProfessionalId !== 'ANY') {
      params.set('professionalId', selectedProfessionalId);
    }
    params.set('date', selectedDate);

    api
      .get(`/public/${tenant.slug}/slots?${params.toString()}`)
      .then((res) => {
        if (!isMounted) return;
        setIsDayOpen(res.data?.isOpen ?? true);
        setDayClosedReason(res.data?.reason || null);
        if (res.data?.slots) {
          setSlotsData(res.data.slots);
        } else {
          setSlotsData({ morning: [], afternoon: [], night: [] });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setSlotsError(
          err?.response?.data?.message ||
            'Não foi possível carregar os horários disponíveis para esta data.'
        );
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [step, selectedDate, selectedServiceIds, selectedProfessionalId, tenant.slug]);

  // Aplicação e remoção de cupom
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.post(`/public/${tenant.slug}/validate-coupon`, {
        code: couponInput.trim(),
        totalAmount: totalPrice
      });
      setAppliedCoupon(res.data);
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || 'Cupom inválido ou expirado.');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const [copiedPix, setCopiedPix] = useState(false);

  // Cálculo de sinal PIX
  const requiredDepositAmount = useMemo(() => {
    if (!tenant.pixKey) return 0;

    let deposit = 0;

    const servicesRequiring = selectedServices.filter((s) => s.requiresDeposit);
    if (servicesRequiring.length > 0) {
      for (const s of servicesRequiring) {
        if (s.depositType === 'PERCENTAGE') {
          const pct = s.depositAmount || 50;
          deposit += (s.price * pct) / 100;
        } else {
          deposit += Math.min(s.depositAmount || 50, s.price);
        }
      }
    }

    if (deposit === 0 && tenant.depositRequired) {
      if (tenant.depositType === 'PERCENTAGE') {
        const pct = tenant.depositAmount || 30;
        deposit = (finalBookingTotal * pct) / 100;
      } else {
        deposit = Math.min(tenant.depositAmount || 30, finalBookingTotal);
      }
    }

    return Math.min(deposit, finalBookingTotal);
  }, [tenant.pixKey, tenant.depositRequired, tenant.depositType, tenant.depositAmount, selectedServices, finalBookingTotal]);

  const handleCopyPix = () => {
    if (!tenant.pixKey) return;
    navigator.clipboard.writeText(tenant.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Submissão do agendamento (Passo 3 -> 4)
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      setSubmitError('Por favor, informe seu nome e WhatsApp.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        serviceIds: selectedServiceIds,
        professionalId:
          selectedProfessionalId && selectedProfessionalId !== 'ANY'
            ? selectedProfessionalId
            : undefined,
        dateStr: selectedDate,
        startTime: selectedTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        couponCode: appliedCoupon?.code
      };

      const res = await api.post(`/public/${tenant.slug}/bookings`, payload);
      setCreatedBooking(res.data);
      setStep(4);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ||
          'Este horário não está mais disponível. Por favor, selecione outro horário.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Navegação de semanas
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const MAX_WEEK_OFFSET = 12;

  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const todayIso = useMemo(() => formatLocalDateToYMD(todayDate), [todayDate]);

  const maxIso = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + MAX_WEEK_OFFSET * 7 + 6);
    return formatLocalDateToYMD(d);
  }, [todayDate]);

  const visibleDays = useMemo(() => {
    const days = [];
    const baseDate = new Date(todayDate);
    baseDate.setDate(todayDate.getDate() + weekOffset * 7);

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const iso = formatLocalDateToYMD(d);
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNum = d.getDate();
      const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      days.push({ iso, weekday, dayNum, month, dateObj: d });
    }
    return days;
  }, [todayDate, weekOffset]);

  const weekInfo = useMemo(() => {
    if (visibleDays.length === 0) return { monthLabel: '', weekLabel: '' };
    const firstDay = visibleDays[0].dateObj;
    const lastDay = visibleDays[visibleDays.length - 1].dateObj;

    const monthLabel = firstDay.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });

    let weekPrefix = '';
    if (weekOffset === 0) {
      weekPrefix = 'Esta semana';
    } else if (weekOffset === 1) {
      weekPrefix = 'Próxima semana';
    } else {
      weekPrefix = `Em ${weekOffset} semanas`;
    }

    const intervalLabel = `${firstDay.getDate()} a ${lastDay.getDate()} de ${lastDay.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;

    return {
      monthLabel,
      weekLabel: `${weekPrefix} (${intervalLabel})`
    };
  }, [visibleDays, weekOffset]);

  const handleNextWeek = () => {
    if (weekOffset >= MAX_WEEK_OFFSET) return;
    const next = weekOffset + 1;
    setWeekOffset(next);
    const targetDate = new Date(todayDate);
    targetDate.setDate(todayDate.getDate() + next * 7);
    setSelectedDate(formatLocalDateToYMD(targetDate));
    setSelectedTime('');
  };

  const handlePrevWeek = () => {
    if (weekOffset <= 0) return;
    const prev = weekOffset - 1;
    setWeekOffset(prev);
    const targetDate = new Date(todayDate);
    targetDate.setDate(todayDate.getDate() + prev * 7);
    setSelectedDate(formatLocalDateToYMD(targetDate));
    setSelectedTime('');
  };

  const handleGoToday = () => {
    setWeekOffset(0);
    setSelectedDate(todayIso);
    setSelectedTime('');
  };

  const handleSelectSpecificDate = (dateStr: string) => {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return;

    const picked = new Date(y, m - 1, d, 12, 0, 0, 0);
    const diffTime = picked.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return;

    const newOffset = Math.min(MAX_WEEK_OFFSET, Math.max(0, Math.floor(diffDays / 7)));
    setWeekOffset(newOffset);
    setSelectedDate(dateStr);
    setSelectedTime('');
  };

  // Garante sincronia da data selecionada
  useEffect(() => {
    if (visibleDays.length > 0 && (!selectedDate || !visibleDays.some((d) => d.iso === selectedDate))) {
      setSelectedDate(visibleDays[0].iso);
    }
  }, [visibleDays, selectedDate]);

  return (
    <div
      id="agendamento"
      className={`bg-white transition-all duration-200 flex flex-col ${
        isModal ? '' : 'rounded-3xl border border-slate-200/90 shadow-luxury overflow-hidden'
      }`}
    >
      {/* Barra de Progresso e Indicador de Etapas no Topo */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-20">
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span className="text-slate-400 uppercase tracking-wider text-[11px]">
            Passo {step} de 4
          </span>
          <span className="font-extrabold text-slate-800 text-xs">
            {step === 1 && 'Procedimentos & Serviços'}
            {step === 2 && 'Data & Horário'}
            {step === 3 && 'Identificação da Cliente'}
            {step === 4 && 'Confirmação'}
          </span>
        </div>

        {/* 4 Barras de Progresso Segmentadas */}
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-brand-purple' : 'bg-slate-200'
              }`}
              style={{
                backgroundColor: s <= step ? brandColor : undefined
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-7 flex-1">
        {/* ========================================================================= */}
        {/* PASSO 1: ESPECIALIDADE, SERVIÇOS & PROFISSIONAL */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className={`space-y-5 ${selectedServices.length > 0 ? 'pb-24 sm:pb-0' : ''}`}>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                O que vamos cuidar hoje?
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Selecione os procedimentos desejados. Você pode combinar mais de uma opção no mesmo atendimento.
              </p>
            </div>

            {/* Profissional Responsável (Discreto para solo, seletor para múltiplos) */}
            {tenant.professionals && tenant.professionals.length > 0 && (
              <div>
                {isSoloProfessional && soloProfessional ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: soloProfessional.color || brandColor }}
                      >
                        {soloProfessional.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          Atendimento com {soloProfessional.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Profissional responsável exclusiva
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/70 shrink-0">
                      Confirmada
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Profissional
                      </span>
                      {!selectedProfessionalId && (
                        <span className="text-[11px] font-semibold text-amber-600">
                          Escolha quem vai te atender
                        </span>
                      )}
                    </div>

                    {professionalError && (
                      <p className="text-xs text-red-600 font-semibold">{professionalError}</p>
                    )}

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProfessionalId('ANY');
                          setProfessionalError(null);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                          selectedProfessionalId === 'ANY'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Sem preferência
                      </button>

                      {tenant.professionals.map((prof) => {
                        const isSelected = selectedProfessionalId === prof.id;
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => {
                              setSelectedProfessionalId(prof.id);
                              setProfessionalError(null);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? 'text-white border-transparent shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                            style={{
                              backgroundColor: isSelected ? brandColor : undefined
                            }}
                          >
                            <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">
                              {prof.name.substring(0, 1).toUpperCase()}
                            </span>
                            <span>{prof.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Categorias & Especialidades em Acordeão com Apple Design */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Especialidades & Procedimentos
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Toque para abrir e escolher
                </span>
              </div>

              {categorizedServices.length === 0 ? (
                <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-xs text-slate-500 text-center">
                  Nenhum procedimento disponível para agendamento online no momento.
                </div>
              ) : (
                categorizedServices.map(([catKey, data]) => {
                  const isOpen = !!expandedCategories[catKey];
                  const hasSelectedInside = data.services.some((s) =>
                    selectedServiceIds.includes(s.id)
                  );
                  const selectedCountInside = data.services.filter((s) =>
                    selectedServiceIds.includes(s.id)
                  ).length;

                  return (
                    <div
                      key={catKey}
                      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                        hasSelectedInside
                          ? 'border-slate-300 shadow-2xs'
                          : 'border-slate-200/80 hover:border-slate-300/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                      } bg-white`}
                    >
                      {/* Cabeçalho do Acordeão (Apple Button Surface) */}
                      <button
                        type="button"
                        onClick={() => toggleCategory(catKey)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer select-none group"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 group-hover:text-slate-950 transition-colors">
                              {data.categoryName}
                            </h3>
                            {hasSelectedInside && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-2xs"
                                style={{ backgroundColor: brandColor }}
                              >
                                {selectedCountInside} selecionado{selectedCountInside > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {data.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 font-normal line-clamp-1">
                              {data.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] font-semibold text-slate-500 bg-white/80 border border-slate-200/60 px-2.5 py-0.5 rounded-full shadow-2xs">
                            {data.services.length} {data.services.length === 1 ? 'opção' : 'opções'}
                          </span>
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 ${
                              isOpen
                                ? 'rotate-180 bg-slate-200/70 text-slate-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </button>

                      {/* Lista de Procedimentos da Categoria (Expandida) */}
                      {isOpen && (
                        <div className="p-3 sm:p-3.5 space-y-2.5 bg-slate-50/30 border-t border-slate-100/90 animate-in fade-in-50 duration-200">
                          {data.services.map((service) => {
                            const isSelected = selectedServiceIds.includes(service.id);
                            const cleanName = service.name
                              .replace(/\s*\|\s*/g, ' - ')
                              .replace(/\s+/g, ' ')
                              .trim();

                            return (
                              <div
                                key={service.id}
                                onClick={() => toggleService(service.id)}
                                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-white shadow-xs'
                                    : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/40'
                                }`}
                                style={{
                                  borderColor: isSelected ? brandColor : undefined,
                                  boxShadow: isSelected
                                    ? `0 0 0 1px ${brandColor}30, 0 2px 6px -1px rgba(0,0,0,0.04)`
                                    : undefined
                                }}
                              >
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                    {cleanName}
                                  </h4>
                                  {service.description && (
                                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                      {service.description}
                                    </p>
                                  )}
                                  <div className="mt-2 flex items-center gap-2 text-xs">
                                    <span className="font-medium text-slate-500 text-[11px]">
                                      {service.durationMinutes} min
                                    </span>
                                    <span className="text-slate-300">·</span>
                                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                                      R$ {service.price.toFixed(2).replace('.', ',')}
                                    </span>
                                    {service.requiresDeposit && (
                                      <>
                                        <span className="text-slate-300">·</span>
                                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200/60">
                                          Sinal: {service.depositType === 'PERCENTAGE' ? `${service.depositAmount || 50}%` : `R$ ${Number(service.depositAmount || 50).toFixed(0)}`}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div
                                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all shrink-0 border ${
                                    isSelected
                                      ? 'text-white shadow-xs border-transparent'
                                      : 'border-slate-300 text-slate-400 bg-white hover:border-slate-400'
                                  }`}
                                  style={{
                                    backgroundColor: isSelected ? brandColor : undefined
                                  }}
                                >
                                  {isSelected ? (
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Barra de Resumo e Avanço */}
            {selectedServices.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedServices.length} procedimento(s) · {totalDurationMinutes} min
                  </p>
                  <p className="text-lg font-black text-slate-900">
                    Total: R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-97 cursor-pointer"
                  style={{ backgroundColor: brandColor }}
                >
                  <span>Escolher Data & Horário</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASSO 2: DATA & HORÁRIO */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Escolha o melhor dia e horário
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Duração estimada: {totalDurationMinutes} min
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            </div>

            {/* Navegação de Semana e Carrossel de Dias */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <p className="text-xs font-black text-slate-900 capitalize">
                    {weekInfo.monthLabel}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {weekInfo.weekLabel}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {weekOffset > 0 && (
                    <button
                      type="button"
                      onClick={handleGoToday}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      Hoje
                    </button>
                  )}

                  <label className="relative px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold shadow-2xs hover:bg-slate-50 cursor-pointer flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Outra data</span>
                    <input
                      type="date"
                      min={todayIso}
                      max={maxIso}
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) handleSelectSpecificDate(e.target.value);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>

                  <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                    <button
                      type="button"
                      onClick={handlePrevWeek}
                      disabled={weekOffset === 0}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                      title="Semana anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextWeek}
                      disabled={weekOffset >= MAX_WEEK_OFFSET}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                      title="Próxima semana"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Carrossel de 7 Dias da Semana em Pílulas */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {visibleDays.map((d) => {
                  const isSelected = selectedDate === d.iso;
                  const isPast = d.iso < todayIso;

                  return (
                    <button
                      key={d.iso}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        setSelectedDate(d.iso);
                        setSelectedTime('');
                      }}
                      className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isPast
                          ? 'opacity-30 cursor-not-allowed bg-slate-50'
                          : isSelected
                            ? 'text-white shadow-md'
                            : 'bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700'
                      }`}
                      style={{
                        backgroundColor: isSelected ? brandColor : undefined
                      }}
                    >
                      <span className="text-[10px] uppercase font-bold">
                        {d.weekday}
                      </span>
                      <span className="text-sm font-black mt-0.5">
                        {d.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de Horários por Turnos */}
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                Horários Livres para {selectedDate.split('-').reverse().join('/')}
              </span>

              {loadingSlots ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: brandColor }} />
                  <p className="text-xs font-medium">Buscando horários disponíveis...</p>
                </div>
              ) : slotsError ? (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {slotsError}
                </div>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {/* Manhã */}
                  {slotsData.morning && slotsData.morning.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                        <span>Manhã (até 12:00)</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slotsData.morning.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                              }`}
                              style={{
                                backgroundColor: isSelected ? brandColor : undefined
                              }}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tarde */}
                  {slotsData.afternoon && slotsData.afternoon.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Sun className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tarde (12:00 às 18:00)</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slotsData.afternoon.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                              }`}
                              style={{
                                backgroundColor: isSelected ? brandColor : undefined
                              }}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Noite */}
                  {slotsData.night && slotsData.night.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Noite (após 18:00)</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slotsData.night.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                              }`}
                              style={{
                                backgroundColor: isSelected ? brandColor : undefined
                              }}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sem vagas no dia */}
                  {(!slotsData.morning || slotsData.morning.length === 0) &&
                    (!slotsData.afternoon || slotsData.afternoon.length === 0) &&
                    (!slotsData.night || slotsData.night.length === 0) && (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-600">
                        <Ban className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                        <p className="text-xs font-bold text-slate-800">
                          {!isDayOpen && dayClosedReason
                            ? dayClosedReason
                            : 'Nenhum horário livre nesta data'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Por favor, selecione outro dia na barra acima.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Barra Inferior com Horário Selecionado */}
            {selectedTime && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Horário Selecionado
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-97 cursor-pointer"
                  style={{ backgroundColor: brandColor }}
                >
                  <span>Continuar para Identificação</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASSO 3: IDENTIFICAÇÃO & PRÉ-RESERVA */}
        {/* ========================================================================= */}
        {step === 3 && (
          <form onSubmit={handleConfirmBooking} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Quem vai ser atendida?
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enviaremos a confirmação e o lembrete direto no seu WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            </div>

            {/* Ticket Boutique de Resumo do Atendimento */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Data & Horário:</span>
                <span>
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Procedimentos ({selectedServices.length}):</span>
                <span className="font-semibold truncate max-w-[220px]">
                  {selectedServices.map((s) => s.name).join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Duração total:</span>
                <span>{totalDurationMinutes} min</span>
              </div>
              {tenant.professionals && tenant.professionals.length > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Profissional:</span>
                  <span className="font-semibold text-slate-900">{selectedProfessionalName}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                  <span>Desconto ({appliedCoupon.code}):</span>
                  <span>- R$ {appliedCoupon.discountAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Valor Total:</span>
                <span className="text-sm font-black" style={{ color: brandColor }}>
                  R$ {finalBookingTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Cupom de Desconto Colapsável */}
            <div>
              {!showCouponInput && !appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => setShowCouponInput(true)}
                  className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Tag className="w-3 h-3" />
                  <span>Possui cupom de desconto?</span>
                </button>
              ) : appliedCoupon ? (
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <span className="font-bold text-emerald-800">
                      {appliedCoupon.code} • Economia de R${' '}
                      {appliedCoupon.discountAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    title="Remover cupom"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Código do cupom"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase tracking-wider outline-hidden focus:border-brand-purple"
                  />
                  <button
                    type="button"
                    disabled={validatingCoupon || !couponInput.trim()}
                    onClick={handleApplyCoupon}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white disabled:opacity-50 cursor-pointer"
                  >
                    {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aplicar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-[11px] text-red-600 font-semibold mt-1">{couponError}</p>
              )}
            </div>

            {/* Campos de Contato */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Seu WhatsApp *
                </label>
                <InputMask
                  mask="phone"
                  value={clientPhone}
                  onChangeValue={(val) => setClientPhone(val)}
                  required
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="Como gostaria de ser chamada?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Para envio do recibo digital"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma alergia ou detalhe importante sobre seu procedimento?"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-hidden focus:border-brand-purple resize-none"
                />
              </div>
            </div>

            {/* Aviso de Sinal PIX Obrigatório */}
            {requiredDepositAmount > 0 && (
              <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/90 text-xs space-y-1">
                <div className="flex justify-between font-bold text-purple-900">
                  <span>Sinal de Reserva (Garantia de Vaga):</span>
                  <span>R$ {requiredDepositAmount.toFixed(2).replace('.', ',')}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Para garantir seu horário exclusivo, o salão solicita um sinal antecipado pago via PIX direto. O valor restante de R$ {(finalBookingTotal - requiredDepositAmount).toFixed(2).replace('.', ',')} será quitado no dia do atendimento.
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-97 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: brandColor }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Garantindo seu horário...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Garantir Meu Horário</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASSO 4: AGENDAMENTO CONFIRMADO! (VOUCHER DIGITAL) */}
        {/* ========================================================================= */}
        {step === 4 && createdBooking && (
          <div className="text-center space-y-5 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Agendamento Garantido!
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Tudo pronto para seu atendimento no{' '}
                <span className="font-bold text-slate-800">{tenant.name}</span>.
              </p>
            </div>

            {/* Voucher Digital */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-900">{clientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Data & Horário:</span>
                <span className="font-bold text-slate-900">
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Procedimentos:</span>
                <span className="font-bold text-slate-900 text-right">
                  {selectedServices.map((s) => s.name).join(', ')}
                </span>
              </div>
              {tenant.professionals && tenant.professionals.length > 0 && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Profissional:</span>
                  <span className="font-bold text-slate-900">{selectedProfessionalName}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900">
                <span>Valor Total:</span>
                <span className="text-sm font-black" style={{ color: brandColor }}>
                  R$ {finalBookingTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Chave PIX se houver sinal */}
            {(() => {
              const finalDepositToPay =
                createdBooking?.depositAmount !== undefined
                  ? Number(createdBooking.depositAmount)
                  : requiredDepositAmount;

              if (finalDepositToPay <= 0) return null;

              return (
                <div className="bg-purple-50/80 rounded-2xl p-4 border border-purple-200 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-purple-200">
                    <span className="font-bold text-purple-900 uppercase tracking-wide">
                      Sinal de Reserva via PIX
                    </span>
                    <span className="font-extrabold text-purple-700 text-sm">
                      R$ {finalDepositToPay.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Para confirmar sua vaga, envie o sinal diretamente para o PIX do salão:
                  </p>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                        {tenant.pixKeyHolder || tenant.name} ({tenant.pixKeyType || 'PIX'})
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 truncate select-all block">
                        {tenant.pixKey}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Botão de WhatsApp */}
            <div className="space-y-2 pt-1">
              {(() => {
                const finalDepositToPay =
                  createdBooking?.depositAmount !== undefined
                    ? Number(createdBooking.depositAmount)
                    : requiredDepositAmount;

                return (
                  <a
                    href={`https://wa.me/55${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      finalDepositToPay > 0
                        ? `Olá! Acabei de agendar meu horário para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime} (${selectedServices.map(s => s.name).join(', ')}) pelo link. Segue o comprovante do sinal de R$ ${finalDepositToPay.toFixed(2).replace('.', ',')} para confirmar minha reserva!`
                        : `Olá! Acabei de agendar meu horário para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime} (${selectedServices.map(s => s.name).join(', ')}) pelo link.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-97"
                  >
                    <WhatsAppIcon size={18} color="#FFFFFF" />
                    <span>
                      {finalDepositToPay > 0
                        ? 'Enviar Comprovante pelo WhatsApp'
                        : 'Conversar no WhatsApp da Profissional'}
                    </span>
                  </a>
                );
              })()}

              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSelectedServiceIds([]);
                    setSelectedTime('');
                    setCreatedBooking(null);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Fazer Outro Agendamento
                </button>

                {onClose && (
                  <>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
