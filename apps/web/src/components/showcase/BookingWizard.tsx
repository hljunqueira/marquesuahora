'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Ban
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
}

export function BookingWizard({ tenant, brandColor = '#5c0701' }: BookingWizardProps) {
  // Passos: 1 = Motivo/Serviços, 2 = Data/Horário, 3 = Dados da Cliente, 4 = Confirmado
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Passo 1: Seleções
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const isSoloProfessional = (tenant.professionals || []).length === 1;
  const soloProfessional = isSoloProfessional ? tenant.professionals[0] : null;

  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(() => {
    if (tenant.professionals?.length === 1) {
      return tenant.professionals[0].id;
    }
    return '';
  });
  const [professionalError, setProfessionalError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

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

  // Agrupa serviços por Categoria/Especialidade
  const categorizedServices = useMemo(() => {
    const map: Record<string, { categoryName: string; description?: string | null; services: ServiceItem[] }> = {};

    // Inicializa com as categorias do tenant
    if (tenant.categories && tenant.categories.length > 0) {
      tenant.categories.forEach((cat) => {
        map[cat.id] = {
          categoryName: cat.name,
          description: cat.description,
          services: []
        };
      });
    }

    // Distribui os serviços nas categorias
    tenant.services.forEach((s) => {
      const key = s.categoryId || s.category || 'Geral';
      if (!map[key]) {
        map[key] = {
          categoryName: s.category || 'Outros Serviços',
          description: null,
          services: []
        };
      }
      map[key].services.push(s);
    });

    return Object.entries(map).filter(([_, data]) => data.services.length > 0);
  }, [tenant.categories, tenant.services]);

  // Abre a primeira categoria por padrão
  useEffect(() => {
    if (categorizedServices.length > 0 && Object.keys(expandedCategories).length === 0) {
      const firstKey = categorizedServices[0][0];
      setExpandedCategories({ [firstKey]: true });
    }
  }, [categorizedServices, expandedCategories]);

  // Lista dos serviços selecionados
  const selectedServices = useMemo(() => {
    return tenant.services.filter((s) => selectedServiceIds.includes(s.id));
  }, [tenant.services, selectedServiceIds]);

  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + s.price, 0);
  }, [selectedServices]);

  // Alterna seleção de serviço
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Garante seleção do profissional quando solo
  useEffect(() => {
    if (tenant.professionals?.length === 1 && !selectedProfessionalId) {
      setSelectedProfessionalId(tenant.professionals[0].id);
    }
  }, [tenant.professionals, selectedProfessionalId]);

  // Nome amigável do profissional selecionado para os resumos
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

  // Avançar para o Passo 2 com validação de seleção de profissional
  const handleProceedToStep2 = () => {
    if (selectedServices.length === 0) return;

    if (tenant.professionals && tenant.professionals.length > 1 && !selectedProfessionalId) {
      setProfessionalError('Por favor, selecione um profissional ou escolha "Sem preferência".');
      const el = document.getElementById('seletor-profissional');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setProfessionalError(null);
    setStep(2);
  };

  // Carrega horários livres do backend quando a data ou serviços mudam no Passo 2
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

  const finalBookingTotal = appliedCoupon ? appliedCoupon.finalAmount : totalPrice;

  const [copiedPix, setCopiedPix] = useState(false);

  const requiredDepositAmount = useMemo(() => {
    if (!tenant.pixKey) return 0;

    let deposit = 0;

    // Regra 1: Serviços selecionados que exigem sinal específico (ex: Alongamento, Banho de Gel, Spa)
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

    // Regra 2: Fallback para regra global do tenant
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
      setSubmitError('Por favor, preencha seu nome e telefone.');
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

  // Próximos 14 dias para a barra de datas (blindados contra drift de fuso horário UTC-3)
  const nextDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Fixo ao meio-dia local impedindo saltos noturnos de fuso
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = formatLocalDateToYMD(d);
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNum = d.getDate();
      const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      days.push({ iso, weekday, dayNum, month });
    }
    return days;
  }, []);

  // Garante sincronia da data selecionada com os dias disponíveis na barra
  useEffect(() => {
    if (nextDays.length > 0 && (!selectedDate || !nextDays.some((d) => d.iso === selectedDate))) {
      setSelectedDate(nextDays[0].iso);
    }
  }, [nextDays, selectedDate]);

  return (
    <div
      id="agendamento"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-luxury overflow-hidden transition-all duration-200"
    >
      {/* Barra de Progresso e Indicador de Etapas no Topo */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between text-xs font-bold mb-2.5">
          <span className="text-slate-500 uppercase tracking-wider">
            Passo {step} de 4
          </span>
          <span className="font-extrabold text-slate-800">
            {step === 1 && 'Especialidade & Serviços'}
            {step === 2 && 'Data & Horário'}
            {step === 3 && 'Seus Dados'}
            {step === 4 && 'Confirmação'}
          </span>
        </div>

        {/* 4 Barras de Progresso Segmentadas */}
        <div className="grid grid-cols-4 gap-2">
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

      <div className="p-5 sm:p-7">
        {/* ========================================================================= */}
        {/* PASSO 1: ESPECIALIDADE, SERVIÇOS & PROFISSIONAL */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className={`space-y-6 ${selectedServices.length > 0 ? 'pb-20 sm:pb-0' : ''}`}>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Como podemos te ajudar?
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Selecione os serviços desejados. Você pode adicionar mais de um serviço ao mesmo atendimento.
              </p>
            </div>

            {/* Seletor de Profissional */}
            {tenant.professionals && tenant.professionals.length > 0 && (
              <div id="seletor-profissional" className="space-y-2">
                {isSoloProfessional && soloProfessional ? (
                  // Caso 1: Apenas 1 profissional no estabelecimento (Solo Professional)
                  <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: soloProfessional.color || brandColor
                        }}
                      >
                        {soloProfessional.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {soloProfessional.name}
                          </p>
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                            Profissional Responsável
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Atendimento exclusivo e personalizado
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden xs:inline">Confirmado</span>
                    </div>
                  </div>
                ) : (
                  // Caso 2: Múltiplos profissionais (Não pré-definir nenhum por padrão)
                  <>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Selecione o Profissional
                      </label>
                      {!selectedProfessionalId && (
                        <span className="text-[11px] font-semibold text-amber-600">
                          Escolha quem vai te atender
                        </span>
                      )}
                    </div>

                    {professionalError && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>{professionalError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProfessionalId('ANY');
                          setProfessionalError(null);
                        }}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          selectedProfessionalId === 'ANY'
                            ? 'border-brand-purple bg-purple-50/50 text-slate-900 ring-1 ring-brand-purple'
                            : professionalError
                            ? 'border-amber-300 bg-white hover:bg-slate-50 text-slate-700'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold">
                            SP
                          </div>
                          <div>
                            <p className="font-bold">Sem preferência</p>
                            <p className="text-[11px] font-normal text-slate-500">
                              Qualquer profissional disponível
                            </p>
                          </div>
                        </div>
                        {selectedProfessionalId === 'ANY' && (
                          <Check className="w-4 h-4 text-brand-purple" />
                        )}
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
                            className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'border-brand-purple bg-purple-50/50 text-slate-900 ring-1 ring-brand-purple'
                                : professionalError
                                ? 'border-amber-300 bg-white hover:bg-slate-50 text-slate-700'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{
                                  backgroundColor: prof.color || brandColor
                                }}
                              >
                                {prof.name.substring(0, 1).toUpperCase()}
                              </div>
                              <p className="font-bold truncate">{prof.name}</p>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-brand-purple" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Categorias & Especialidades em Acordeão */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Especialidades do Estabelecimento
              </label>

              {categorizedServices.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 text-center">
                  Nenhum serviço disponível para agendamento online no momento.
                </div>
              ) : (
                categorizedServices.map(([catKey, data]) => {
                  const isOpen = !!expandedCategories[catKey];
                  return (
                    <div
                      key={catKey}
                      className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [catKey]: !prev[catKey]
                          }))
                        }
                        className="w-full px-4 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors"
                      >
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            {data.categoryName}
                          </h3>
                          {data.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                              {data.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-[11px] font-semibold">
                            {data.services.length} opções
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-3 bg-white divide-y divide-slate-100">
                          {data.services.map((service) => {
                            const isSelected = selectedServiceIds.includes(service.id);
                            const servicePhoto = (service as any).photos?.[0];
                            return (
                              <div
                                key={service.id}
                                onClick={() => toggleService(service.id)}
                                className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-purple-50/60 ring-1 ring-brand-purple/40'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {servicePhoto && (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative border border-slate-200/80">
                                      <img
                                        src={resolveImageUrl(servicePhoto)}
                                        alt={service.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900">
                                      {service.name}
                                    </h4>
                                  {service.description && (
                                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
                                      {service.description}
                                    </p>
                                  )}
                                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                    <span className="font-medium">
                                      {service.durationMinutes} min
                                    </span>
                                    <span className="text-slate-300">·</span>
                                    <span className="font-bold text-slate-900">
                                      R$ {service.price.toFixed(2).replace('.', ',')}
                                    </span>
                                    {service.requiresDeposit && (
                                      <>
                                        <span className="text-slate-300">·</span>
                                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-extrabold text-[10px]">
                                          Sinal: {service.depositType === 'PERCENTAGE' ? `${service.depositAmount || 50}%` : `R$ ${Number(service.depositAmount || 50).toFixed(0)}`}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                                <button
                                  type="button"
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-brand-purple text-white shadow-sm'
                                      : 'border border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600'
                                  }`}
                                  style={{
                                    backgroundColor: isSelected ? brandColor : undefined
                                  }}
                                >
                                  {isSelected ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                </button>
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

            {/* Resumo do Combo e Botão Avançar no Desktop */}
            {selectedServices.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold text-slate-500">
                    {selectedServices.length} serviço(s) selecionado(s) · {totalDurationMinutes} min
                  </p>
                  <p className="text-xl font-extrabold text-slate-900">
                    Total: R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  style={{ backgroundColor: brandColor }}
                >
                  <span>Escolher Data & Horário</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Barra Flutuante Mobile no Passo 1 (Sticky Bottom Bar) */}
        {step === 1 && selectedServices.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3.5 shadow-2xl sm:hidden flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                {selectedServices.length} {selectedServices.length === 1 ? 'item' : 'itens'} · {totalDurationMinutes} min
              </p>
              <p className="text-base font-black text-slate-900">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleProceedToStep2}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              style={{ backgroundColor: brandColor }}
            >
              <span>Escolher Data</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASSO 2: DATA & HORÁRIO */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Escolha o melhor dia e horário
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Duração estimada: {totalDurationMinutes} min
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            </div>

            {/* Tira Horizontal de Próximos Dias */}
            <div className="flex gap-2.5 overflow-x-auto py-1.5 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {nextDays.map((d) => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.iso);
                      setSelectedTime('');
                    }}
                    style={{
                      backgroundColor: isSelected ? brandColor : undefined,
                      borderColor: isSelected ? brandColor : undefined
                    }}
                    className={`flex-shrink-0 w-16 sm:w-18 py-3.5 px-1 rounded-2xl border text-center transition-all select-none cursor-pointer ${
                      isSelected
                        ? 'text-white shadow-md scale-[1.03] ring-2 ring-purple-400/30'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-700 shadow-2xs'
                    }`}
                  >
                    <span
                      className={`block text-[11px] font-extrabold uppercase tracking-wider ${
                        isSelected ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {d.weekday}
                    </span>
                    <span
                      className={`block text-xl font-black mt-0.5 ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {d.dayNum}
                    </span>
                    <span
                      className={`block text-[10px] font-semibold uppercase ${
                        isSelected ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {d.month}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grade de Horários Livres */}
            <div>
              {loadingSlots ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-purple mb-2" />
                  <span>Buscando horários disponíveis em tempo real...</span>
                </div>
              ) : slotsError ? (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{slotsError}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Manhã */}
                  {slotsData.morning && slotsData.morning.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Manhã
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {slotsData.morning.map((slot) => {
                          const isSlotSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-3 px-3 sm:px-4 rounded-xl border text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer active:scale-97 ${
                                isSlotSelected
                                  ? 'text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-600/30 scale-[1.03]'
                                  : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-slate-800 shadow-2xs hover:shadow-xs'
                              }`}
                              style={{
                                backgroundColor: isSlotSelected ? brandColor : undefined,
                                borderColor: isSlotSelected ? brandColor : undefined
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
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Tarde
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {slotsData.afternoon.map((slot) => {
                          const isSlotSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-3 px-3 sm:px-4 rounded-xl border text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer active:scale-97 ${
                                isSlotSelected
                                  ? 'text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-600/30 scale-[1.03]'
                                  : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-slate-800 shadow-2xs hover:shadow-xs'
                              }`}
                              style={{
                                backgroundColor: isSlotSelected ? brandColor : undefined,
                                borderColor: isSlotSelected ? brandColor : undefined
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
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Noite
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {slotsData.night.map((slot) => {
                          const isSlotSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-3 px-3 sm:px-4 rounded-xl border text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer active:scale-97 ${
                                isSlotSelected
                                  ? 'text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-600/30 scale-[1.03]'
                                  : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-slate-800 shadow-2xs hover:shadow-xs'
                              }`}
                              style={{
                                backgroundColor: isSlotSelected ? brandColor : undefined,
                                borderColor: isSlotSelected ? brandColor : undefined
                              }}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sem horários livres na data */}
                  {slotsData.morning.length === 0 &&
                    slotsData.afternoon.length === 0 &&
                    slotsData.night.length === 0 && (
                      <div className="py-12 px-4 text-center rounded-2xl bg-slate-50/80 border border-slate-200/80">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
                          <Ban className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-slate-900 text-sm">
                          {!isDayOpen && dayClosedReason
                            ? dayClosedReason
                            : 'Nenhum horário livre nesta data'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                          {!isDayOpen
                            ? 'O estabelecimento não realiza atendimentos nesta data. Por favor, escolha outro dia na barra acima.'
                            : 'Todos os horários para esta data já foram preenchidos ou o limite foi atingido. Por favor, selecione outro dia na barra acima.'}
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Botão Avançar com Horário Selecionado */}
            {selectedTime && (
              <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 font-bold border border-purple-100 flex-shrink-0">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Horário Selecionado
                    </p>
                    <p className="text-base font-black text-slate-900">
                      {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
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
        {/* PASSO 3: SEUS DADOS */}
        {/* ========================================================================= */}
        {step === 3 && (
          <form onSubmit={handleConfirmBooking} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Finalize seu agendamento
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Enviaremos a confirmação e lembrete direto no seu WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            </div>

            {/* Card de Resumo do Atendimento */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Data & Horário:</span>
                <span>
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Serviços ({selectedServices.length}):</span>
                <span className="font-semibold truncate max-w-[200px]">
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
                  <span className="font-semibold text-slate-800">{selectedProfessionalName}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                  <span>Desconto ({appliedCoupon.code}):</span>
                  <span>- R$ {appliedCoupon.discountAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Valor Final:</span>
                <div className="flex items-center gap-2">
                  {appliedCoupon && (
                    <span className="text-xs text-slate-400 line-through font-normal">
                      R$ {totalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  <span className="text-sm font-black" style={{ color: brandColor }}>
                    R$ {finalBookingTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            {/* Campo de Cupom de Desconto */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  <span>Possui cupom de desconto?</span>
                </div>
                {appliedCoupon && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Cupom Ativo
                  </span>
                )}
              </div>

              {appliedCoupon ? (
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <p className="text-xs font-bold text-emerald-800">
                      {appliedCoupon.code} • {appliedCoupon.message}
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      Economia de R$ {appliedCoupon.discountAmount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remover cupom"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase tracking-wider outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 bg-white"
                  />
                  <button
                    type="button"
                    disabled={validatingCoupon || !couponInput.trim()}
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer flex-shrink-0 active:scale-97"
                  >
                    {validatingCoupon ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Aplicar</span>
                    )}
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-red-600 font-semibold">{couponError}</p>
              )}
            </div>

            {/* Campos da Cliente */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Seu WhatsApp *
                </label>
                <InputMask
                  mask="phone"
                  value={clientPhone}
                  onChangeValue={(formatted) => setClientPhone(formatted)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Observações adicionais (opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 resize-none"
                />
              </div>
            </div>

            {/* Card de Sinal Direto para o Estabelecimento (PIX) */}
            {requiredDepositAmount > 0 && (
              <div className="p-4 bg-purple-50/70 border border-purple-200/90 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                    Sinal de Reserva (PIX Direto)
                  </span>
                  <span className="text-sm font-extrabold text-purple-700">
                    R$ {requiredDepositAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Para garantir seu horário, o estabelecimento solicita um sinal pago <strong>diretamente via PIX</strong>:
                </p>

                <div className="bg-white p-3 rounded-xl border border-purple-200/60 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Favorecido:</span>
                    <strong className="text-slate-900">{tenant.pixKeyHolder || tenant.name}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tipo de Chave:</span>
                    <strong className="text-slate-900">{tenant.pixKeyType || 'PIX'}</strong>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 truncate select-all">
                      {tenant.pixKey}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedPix ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Chave</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  O valor restante de R$ {(finalBookingTotal - requiredDepositAmount).toFixed(2).replace('.', ',')} será pago no dia do atendimento.
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
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
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASSO 4: AGENDAMENTO CONFIRMADO! */}
        {/* ========================================================================= */}
        {step === 4 && createdBooking && (
          <div className="text-center space-y-6 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Agendamento Confirmado!
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Tudo pronto para seu atendimento no{' '}
                <span className="font-bold text-slate-800">{tenant.name}</span>.
              </p>
            </div>

            {/* Card com Detalhes do Agendamento */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left text-xs space-y-3">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-900">{clientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Data & Horário:</span>
                <span className="font-bold text-slate-900">
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Serviços:</span>
                <span className="font-bold text-slate-900 text-right">
                  {selectedServices.map((s) => s.name).join(', ')}
                </span>
              </div>
              {tenant.professionals && tenant.professionals.length > 0 && (
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
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

            {/* Lembrete de Envio do Sinal PIX (calculado de forma precisa pelo backend / regras) */}
            {(() => {
              const finalDepositToPay =
                createdBooking?.depositAmount !== undefined
                  ? Number(createdBooking.depositAmount)
                  : requiredDepositAmount;

              if (finalDepositToPay <= 0) return null;

              return (
                <div className="bg-purple-50/80 rounded-2xl p-4 border border-purple-200/90 text-left text-xs space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-purple-200/60">
                    <span className="font-bold text-purple-900 uppercase tracking-wide">
                      Sinal de Reserva via PIX
                    </span>
                    <span className="font-extrabold text-purple-700 text-sm">
                      R$ {finalDepositToPay.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Para confirmar seu horário, envie o sinal diretamente para a chave PIX do estabelecimento:
                  </p>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200/60 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
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

            {/* Ações de Conveniência */}
            <div className="space-y-2 pt-2">
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
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98"
                  >
                    <WhatsAppIcon size={18} color="#FFFFFF" />
                    <span>{finalDepositToPay > 0 ? 'Enviar Comprovante pelo WhatsApp' : 'Conversar no WhatsApp da Profissional'}</span>
                  </a>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedServiceIds([]);
                  setSelectedTime('');
                  setCreatedBooking(null);
                }}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Fazer Outro Agendamento
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé de Confiança do Widget */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          Agendamento seguro por{' '}
          <span className="font-bold text-slate-600">Marque Sua Hora</span>
        </p>
      </div>
    </div>
  );
}
