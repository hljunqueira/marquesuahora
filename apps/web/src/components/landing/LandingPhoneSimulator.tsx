'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LandingPhoneSimulator: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState('Alongamento em Gel');
  const [selectedPrice, setSelectedPrice] = useState('R$ 130,00');
  const [selectedSlot, setSelectedSlot] = useState('Hoje às 15:30');
  const [clientName, setClientName] = useState('Mariana Costa');

  const services = [
    { name: 'Alongamento em Gel', price: 'R$ 130,00', duration: '1h 30min' },
    { name: 'Corte Feminino & Escova', price: 'R$ 95,00', duration: '1h' },
    { name: 'Design de Sobrancelha', price: 'R$ 45,00', duration: '30min' },
    { name: 'Barba & Cabelo Completo', price: 'R$ 70,00', duration: '45min' }
  ];

  const slots = [
    'Hoje às 14:00',
    'Hoje às 15:30',
    'Amanhã às 10:00',
    'Amanhã às 16:30'
  ];

  const handleReset = () => {
    setStep(1);
    setSelectedService('Alongamento em Gel');
    setSelectedPrice('R$ 130,00');
    setSelectedSlot('Hoje às 15:30');
  };

  return (
    <section id="demonstracao" className="py-24 md:py-36 bg-white border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
          {/* Text context on the left */}
          <div className="lg:col-span-6 space-y-7 text-left">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200/60 inline-block">
              Simulador interativo
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight leading-tight">
              Veja como é simples para a sua cliente agendar
            </h2>
            <p className="text-lg sm:text-xl text-zinc-600 leading-relaxed font-normal">
              O fluxo foi desenhado para ser direto, sem exigir download de aplicativo nem cadastro com senhas complicadas. A cliente clica no seu link, escolhe o procedimento, o horário vago e confirma com o número do WhatsApp.
            </p>

            <div className="space-y-5 pt-2 text-base sm:text-lg text-zinc-700 font-medium">
              <div className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 shadow-2xs">
                  1
                </span>
                <span>Ela escolhe o serviço pelo nome e vê a duração e o preço claramente.</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 shadow-2xs">
                  2
                </span>
                <span>O sistema só mostra os horários que você realmente tem livres na sua grade.</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 shadow-2xs">
                  3
                </span>
                <span>A confirmação e o lembrete chegam automaticamente no WhatsApp dela.</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900 transition-colors bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl border border-purple-200/60 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar simulação</span>
              </button>
            </div>
          </div>

          {/* Interactive Phone Mockup on the right */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-[340px] sm:w-[380px] bg-zinc-900 border-[6px] border-zinc-800 rounded-[48px] p-3.5 shadow-2xl relative">
              {/* Phone speaker / camera notch */}
              <div className="w-28 h-4.5 bg-zinc-950 rounded-full mx-auto mb-3" />

              {/* Phone Screen Area */}
              <div className="bg-white rounded-[36px] p-5 text-left border border-zinc-200 min-h-[530px] flex flex-col justify-between shadow-inner">
                {/* Simulated Business Header */}
                <div className="pb-3.5 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-zinc-950">Espaço Mariana Silva</div>
                    <div className="text-xs text-zinc-500">Atendimento com hora marcada</div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80">
                    Aberto
                  </span>
                </div>

                {/* Step Content */}
                <div className="py-4 flex-1">
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="text-sm font-bold text-zinc-900">
                          1. Escolha o procedimento:
                        </div>
                        <div className="space-y-2.5">
                          {services.map((svc) => (
                            <div
                              key={svc.name}
                              onClick={() => {
                                setSelectedService(svc.name);
                                setSelectedPrice(svc.price);
                              }}
                              className={`p-3 rounded-2xl border text-sm cursor-pointer transition-all ${
                                selectedService === svc.name
                                  ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                                  : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-300'
                              }`}
                            >
                              <div className="flex justify-between items-center font-bold text-zinc-950">
                                <span>{svc.name}</span>
                                <span className="text-purple-700 font-extrabold">{svc.price}</span>
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                Duração estimada: {svc.duration}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="text-sm font-bold text-zinc-900">
                          2. Escolha o melhor horário:
                        </div>
                        <div className="space-y-2.5">
                          {slots.map((s) => (
                            <div
                              key={s}
                              onClick={() => setSelectedSlot(s)}
                              className={`p-3 rounded-2xl border text-sm cursor-pointer transition-all flex items-center justify-between ${
                                selectedSlot === s
                                  ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                                  : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 text-zinc-950 font-bold">
                                <Clock className="w-4 h-4 text-purple-600" />
                                <span>{s}</span>
                              </div>
                              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                                Livre
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="text-sm font-bold text-zinc-900">
                          3. Confirme seus dados:
                        </div>
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="text-xs text-zinc-600 font-semibold block mb-1">Seu nome:</label>
                            <input
                              type="text"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-zinc-950 text-sm font-medium focus:outline-hidden focus:border-purple-600"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-600 font-semibold block mb-1">WhatsApp para confirmação:</label>
                            <input
                              type="text"
                              defaultValue="(11) 98765-4321"
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-zinc-950 text-sm font-medium focus:outline-hidden focus:border-purple-600"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-xs sm:text-sm text-purple-950 space-y-1">
                          <div className="font-bold">{selectedService}</div>
                          <div className="text-zinc-600 font-medium">{selectedSlot} • {selectedPrice}</div>
                        </div>
                      </motion.div>
                    )}

                    {step === 4 && (
                      <motion.div
                        key="step-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 text-center py-3"
                      >
                        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-extrabold text-zinc-950">
                            Horário Confirmado!
                          </div>
                          <div className="text-sm text-zinc-500 mt-1">
                            {clientName}, sua vaga está garantida.
                          </div>
                        </div>

                        {/* WhatsApp simulated message */}
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 text-left space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            <span>Mensagem recebida no WhatsApp</span>
                          </div>
                          <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                            "Olá Mariana! Seu agendamento de <strong>{selectedService}</strong> foi confirmado para <strong>{selectedSlot}</strong>. Te esperamos!"
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Step controls */}
                <div className="pt-3.5 border-t border-zinc-100">
                  {step < 4 ? (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => setStep((prev) => ((prev + 1) as any))}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <span>Continuar</span>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={handleReset}
                      className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Testar novamente</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
