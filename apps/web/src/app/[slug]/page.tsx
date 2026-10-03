'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  Clock,
  MapPin,
  Phone,
  Instagram,
  Star,
  Check,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Copy,
  CheckCircle2,
  X,
  Loader2,
  CalendarPlus
} from 'lucide-react';
import { InputMask } from '@/components/ui/InputMask';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

interface ProfessionalItem {
  id: string;
  name: string;
  phone: string;
  color: string;
  serviceIds: string[];
}

interface ShowcaseData {
  id: string;
  name: string;
  slug: string;
  phone: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  niche: string;
  themeTemplate: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  googleReviewUrl?: string;
  instagramUrl?: string;
  terminology: { professional: string; resource: string; client: string; service: string };
  depositRequired: boolean;
  depositType: string;
  depositAmount: number;
  openingTime: string;
  closingTime: string;
  isOpenNow: boolean;
  services: ServiceItem[];
  professionals: ProfessionalItem[];
}

interface TimeSlot {
  time: string;
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  available: boolean;
  professionalId?: string;
  professionalName?: string;
}

export default function ShowcasePage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [data, setData] = useState<ShowcaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Seleções do Cliente
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Estados de Agendamento
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [daySlots, setDaySlots] = useState<{ morning: TimeSlot[]; afternoon: TimeSlot[]; night: TimeSlot[] }>({
    morning: [],
    afternoon: [],
    night: []
  });
  const [weekDays, setWeekDays] = useState<Array<{ date: string; dayOfWeek: number; hasAvailableSlots: boolean }>>([]);

  // Modais de Checkout e Confirmação
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [hasCopiedPix, setHasCopiedPix] = useState(false);

  // 1. Carrega dados da vitrine pública do estabelecimento
  useEffect(() => {
    async function loadShowcase() {
      setIsLoading(true);
      try {
        const res = await axios.get(`http://localhost:3333/public/showcase/${slug}`);
        setData(res.data);
      } catch (err: any) {
        setLoadError(
          err.response?.data?.message || 'Estabelecimento não encontrado ou temporariamente indisponível.'
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadShowcase();
  }, [slug]);

  // 2. Fita dos próximos 7 dias
  useEffect(() => {
    if (!data || selectedServices.length === 0) return;

    async function loadWeekStrip() {
      try {
        const serviceIds = selectedServices.map((s) => s.id).join(',');
        const res = await axios.get(
          `http://localhost:3333/schedules/week-strip?slug=${slug}&serviceIds=${serviceIds}&startDate=${new Date().toISOString().slice(0, 10)}`
        );
        setWeekDays(res.data);
      } catch {
        // Ignora erro
      }
    }
    loadWeekStrip();
  }, [data, slug, selectedServices]);

  // 3. Carrega slots disponíveis para a data selecionada
  useEffect(() => {
    if (!data || selectedServices.length === 0) return;

    async function loadSlots() {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const serviceIds = selectedServices.map((s) => s.id).join(',');
        const res = await axios.get(
          `http://localhost:3333/schedules/availability?slug=${slug}&serviceIds=${serviceIds}&date=${selectedDate}`
        );
        setDaySlots(res.data.slots || { morning: [], afternoon: [], night: [] });
      } catch {
        // Ignora erro
      } finally {
        setSlotsLoading(false);
      }
    }
    loadSlots();
  }, [data, slug, selectedServices, selectedDate]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] text-slate-600 gap-3">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
        <span className="text-sm font-medium">Carregando vitrine...</span>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FAF9F6]">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900">Vitrine Indisponível</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md">{loadError}</p>
      </div>
    );
  }

  const categories = ['TODOS', ...Array.from(new Set(data.services.map((s) => s.category)))];

  const filteredServices =
    selectedCategory === 'TODOS'
      ? data.services
      : data.services.filter((s) => s.category === selectedCategory);

  const toggleService = (svc: ServiceItem) => {
    if (selectedServices.some((s) => s.id === svc.id)) {
      setSelectedServices(selectedServices.filter((s) => s.id !== svc.id));
    } else {
      setSelectedServices([...selectedServices, svc]);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  const formatDurationStr = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m > 0 ? `${m}min` : ''}`;
  };

  // Envio do Agendamento Zero-Friction
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || selectedServices.length === 0) return;

    setIsSubmittingBooking(true);
    try {
      const payload = {
        clientName,
        clientPhone,
        serviceId: selectedServices[0].id,
        professionalId: selectedSlot.professionalId || data.professionals[0]?.id,
        date: selectedDate,
        startTime: selectedSlot.time,
        additionalServices: selectedServices.slice(1).map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          durationMinutes: s.durationMinutes
        }))
      };

      const res = await axios.post(`http://localhost:3333/public/booking/${data.slug}`, payload);
      setBookingSuccess(res.data);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Não foi possível confirmar o horário.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] text-slate-900 pb-36">
      {/* 1. STICKY BRAND HEADER */}
      <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-200/80 shadow-sm backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Image
                src={data.logoUrl || '/brand/logo.jpg'}
                alt={data.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-slate-900 leading-tight">
                {data.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    data.isOpenNow
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      data.isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {data.isOpenNow
                    ? `Aberto agora até ${data.closingTime}`
                    : `Fechado agora (Abre às ${data.openingTime})`}
                </span>
              </div>
            </div>
          </div>

          {/* Atalhos de 1 toque */}
          <div className="flex items-center gap-2">
            {data.phone && (
              <a
                href={`https://wa.me/55${data.phone}?text=Olá,%20gostaria%20de%20informações%20sobre%20o%20salão`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-colors"
                title="WhatsApp da Recepção"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                `${data.name}, ${data.addressStreet}, ${data.addressNumber} - ${data.addressCity}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-brand-purple/10 text-slate-600 hover:text-brand-purple transition-colors"
              title="Abrir no Google Maps"
            >
              <MapPin className="w-4 h-4" />
            </a>
            {data.googleReviewUrl && (
              <a
                href={data.googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-500 transition-colors"
                title="Avaliações no Google"
              >
                <Star className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal da Vitrine */}
      <main className="max-w-3xl mx-auto px-4 pt-6">
        {/* Endereço Subtítulo */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 font-medium">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {data.addressStreet}, {data.addressNumber} • {data.addressNeighborhood}, {data.addressCity} - {data.addressState}
          </span>
        </div>

        {/* 2. CATEGORY PILL BAR */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isSelected ? 'text-white' : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-slate-900 rounded-xl -z-10 shadow-sm"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Catálogo de Serviços */}
        <div className="mt-4 flex flex-col gap-3">
          {filteredServices.map((svc) => {
            const isSelected = selectedServices.some((s) => s.id === svc.id);
            return (
              <motion.div
                key={svc.id}
                whileHover={{ y: -1, scale: 1.005 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleService(svc)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-purple-50/50 border-brand-purple shadow-sm ring-1 ring-brand-purple/20'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-card'
                }`}
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900">{svc.name}</h3>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-brand-purple text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  {svc.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {svc.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {svc.durationMinutes} min
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base sm:text-lg font-mono font-bold text-slate-900">
                    R$ {Number(svc.price).toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    type="button"
                    className={`mt-2 block w-full text-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-brand-purple text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'Remover' : 'Adicionar'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 4. HORIZONTAL DAY STRIP & SLOT PICKER (Exibido quando serviços estão selecionados) */}
        {selectedServices.length > 0 && (
          <section className="mt-10 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-purple" />
                <span>Escolha o Dia do Atendimento</span>
              </h2>
            </div>

            {/* Fita de 7 Dias */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-4 scrollbar-none">
              {weekDays.map((day) => {
                const isSelected = selectedDate === day.date;
                const d = new Date(`${day.date}T00:00:00`);
                const weekDaysLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const dayLabel = weekDaysLabels[d.getDay()];
                const dayNumber = d.getDate();

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`relative min-w-[72px] py-3.5 px-2 rounded-2xl text-center border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">
                      {dayLabel}
                    </span>
                    <span className="block text-xl font-mono font-bold mt-0.5">{dayNumber}</span>
                    {day.hasAvailableSlots && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 5. SHIFT SLOT PICKER (☀️ Manhã, 🌤️ Tarde, 🌙 Noite) */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Horários Disponíveis ({selectedDate})
              </h3>

              {slotsLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-purple" />
                  <span>Calculando vagas livres...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Manhã */}
                  {daySlots.morning.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-2">
                        ☀️ Manhã
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {daySlots.morning.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-mono font-medium border transition-all ${
                                isSelected
                                  ? 'bg-brand-purple text-white border-brand-purple shadow-sm ring-2 ring-brand-purple/20'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-brand-purple'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tarde */}
                  {daySlots.afternoon.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-2">
                        🌤️ Tarde
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {daySlots.afternoon.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-mono font-medium border transition-all ${
                                isSelected
                                  ? 'bg-brand-purple text-white border-brand-purple shadow-sm ring-2 ring-brand-purple/20'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-brand-purple'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Noite */}
                  {daySlots.night.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-2">
                        🌙 Noite
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {daySlots.night.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-mono font-medium border transition-all ${
                                isSelected
                                  ? 'bg-brand-purple text-white border-brand-purple shadow-sm ring-2 ring-brand-purple/20'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-brand-purple'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {daySlots.morning.length === 0 &&
                    daySlots.afternoon.length === 0 &&
                    daySlots.night.length === 0 && (
                      <div className="py-6 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                        <p className="text-xs text-slate-600 font-medium">
                          Nenhum horário livre nesta data para a duração selecionada.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* 3. MULTI-SERVICE FLOATING ACTION DRAWER */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-floating px-4 py-4"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  {selectedServices.length} {selectedServices.length === 1 ? 'item' : 'itens'} • {formatDurationStr(totalDuration)}
                </span>
                <span className="text-xl font-mono font-extrabold text-slate-900">
                  R$ {totalPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!selectedSlot) {
                    alert('Por favor, selecione um dia e horário disponível antes de continuar.');
                    return;
                  }
                  setIsCheckoutOpen(true);
                }}
                className="px-6 py-3.5 bg-brand-purple hover:bg-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-purple/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <span>{selectedSlot ? `Agendar (${selectedSlot.time})` : 'Escolher Horário'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. ZERO-FRICTION CHECKOUT MODAL (Nome + WhatsApp) */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100"
            >
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-slate-900">Finalizar Agendamento</h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedDate} às {selectedSlot?.time} • {data.name}
              </p>

              <form onSubmit={handleConfirmBooking} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">Seu Nome *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Como prefere ser chamado"
                    className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-purple"
                    required
                  />
                </div>

                <InputMask
                  mask="phone"
                  label="Seu WhatsApp *"
                  value={clientPhone}
                  onChangeValue={(fmt, raw) => setClientPhone(raw)}
                  placeholder="(00) 00000-0000"
                  helperText="Enviaremos a confirmação e lembretes por aqui."
                  required
                />

                {data.depositRequired && Number(data.depositAmount) > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    🔒 Este estabelecimento solicita um sinal de reserva de{' '}
                    <strong className="font-mono">
                      {data.depositType === 'PERCENTAGE'
                        ? `${data.depositAmount}% (R$ ${((totalPrice * data.depositAmount) / 100).toFixed(2).replace('.', ',')})`
                        : `R$ ${Number(data.depositAmount).toFixed(2).replace('.', ',')}`}
                    </strong>{' '}
                    para segurar sua vaga.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="mt-2 w-full py-3.5 bg-brand-purple hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingBooking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Confirmar Agendamento</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. TELA DE SUCESSO DOPAMÍNICA & MODAL DE SINAL PIX */}
      <AnimatePresence>
        {bookingSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl z-10 border border-slate-100 overflow-hidden"
            >
              {/* Checkmark SVG animado */}
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                  <motion.path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </svg>
              </div>

              <h3 className="text-2xl font-display font-bold text-slate-900">
                {bookingSuccess.schedule?.depositAmount > 0 && !bookingSuccess.schedule?.depositPaid
                  ? 'Quase lá! Realize o PIX'
                  : 'Agendamento Confirmado!'}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {bookingSuccess.schedule?.depositAmount > 0 && !bookingSuccess.schedule?.depositPaid
                  ? 'Pague o sinal de reserva em até 15 minutos para garantir seu horário.'
                  : `Seu horário em ${data.name} está garantido.`}
              </p>

              {/* PIX Copia e Cola */}
              {bookingSuccess.schedule?.depositPixCode && !bookingSuccess.schedule?.depositPaid && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Código PIX Copia e Cola
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={bookingSuccess.schedule.depositPixCode}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingSuccess.schedule.depositPixCode);
                        setHasCopiedPix(true);
                        setTimeout(() => setHasCopiedPix(false), 3000);
                      }}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                    >
                      {hasCopiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{hasCopiedPix ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Ações pós confirmação */}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccess(null);
                    setSelectedServices([]);
                    setSelectedSlot(null);
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
