'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  SlidersHorizontal,
  RotateCcw,
  Check,
  X,
  Copy,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

export interface NotificationRuleItem {
  trigger: string;
  category: string;
  recipientType: 'CLIENT' | 'TEAM' | 'STUDENT';
  title: string;
  description: string;
  variables: string[];
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  notifyProfessional: boolean;
  notifyOwner: boolean;
  whatsappText: string;
  emailSubject: string;
  emailBody: string;
  isCustomized: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  SCHEDULE: 'Agendamentos (Cliente)',
  TEAM: 'Avisos para a Equipe (Profissional & Recepção)',
  POST_SERVICE: 'Pós-Atendimento & Retenção',
  WAITLIST: 'Fila Online (Lista de Espera)',
  COURSES: 'Formações & Cursos',
  FINANCIAL: 'Financeiro & Cobrança de Sinal PIX'
};

const SAMPLE_DATA: Record<string, string> = {
  '{client_first_name}': 'Maria',
  '{client_name}': 'Maria Silva',
  '{client_phone}': '(11) 98765-4321',
  '{service_name}': 'Design de Sobrancelhas + Lash Lifting',
  '{services_list}': 'Design de Sobrancelhas + Lash Lifting',
  '{professional_name}': 'Dra. Ana Costa',
  '{date}': '18/10/2026',
  '{time}': '14:30',
  '{duration}': '60 min',
  '{price}': '150,00',
  '{location}': 'Av. Paulista, 1000 - Sala 42',
  '{business_name}': 'Studio Bem-Estar',
  '{booking_url}': 'https://marquesuahora.com.br/studio-bem-estar',
  '{google_review_url}': 'https://g.page/r/studio-bem-estar/review',
  '{deposit_amount}': '50,00',
  '{pix_link}': 'https://marquesuahora.com.br/pix/reserva-123',
  '{course_title}': 'Master em Micropigmentação Avançada',
  '{course_description}': 'Aprenda do zero às técnicas mais valorizadas com certificado incluso.',
  '{course_price}': '497,00',
  '{course_duration}': '20 horas',
  '{course_enroll_url}': 'https://marquesuahora.com.br/studio/cursos/master',
  '{course_access_url}': 'https://marquesuahora.com.br/studio/aluna',
  '{coupon_code}': 'BELEZA15',
  '{coupon_discount}': '15% de desconto',
  '{coupon_valid_until}': '31/10/2026'
};

export const SettingsNotificationsTab: React.FC = () => {
  const [rules, setRules] = useState<NotificationRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<NotificationRuleItem | null>(null);
  const [activeChannelTab, setActiveChannelTab] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [modalWhatsappText, setModalWhatsappText] = useState('');
  const [modalEmailSubject, setModalEmailSubject] = useState('');
  const [modalEmailBody, setModalEmailBody] = useState('');
  const [savingModal, setSavingModal] = useState(false);
  const [resettingModal, setResettingModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/rules');
      setRules(res.data.rules || []);
    } catch (err: any) {
      console.error('Erro ao buscar regras de notificação:', err);
      showToast('Erro ao carregar regras de notificação.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Atualização rápida de toggle na tabela
  const handleToggle = async (
    trigger: string,
    field: 'whatsappEnabled' | 'emailEnabled' | 'notifyProfessional' | 'notifyOwner',
    currentValue: boolean
  ) => {
    const newValue = !currentValue;
    // Atualiza estado otimisticamente
    setRules((prev) =>
      prev.map((r) => (r.trigger === trigger ? { ...r, [field]: newValue } : r))
    );

    try {
      await api.put(`/notifications/rules/${trigger}`, {
        [field]: newValue
      });
    } catch (err) {
      console.error('Erro ao salvar alteração de canal:', err);
      // Reverte em caso de erro
      setRules((prev) =>
        prev.map((r) => (r.trigger === trigger ? { ...r, [field]: currentValue } : r))
      );
      showToast('Não foi possível atualizar a configuração.', 'error');
    }
  };

  const handleOpenEditModal = (rule: NotificationRuleItem) => {
    setEditingRule(rule);
    setModalWhatsappText(rule.whatsappText || '');
    setModalEmailSubject(rule.emailSubject || '');
    setModalEmailBody(rule.emailBody || '');
    setActiveChannelTab('WHATSAPP');
  };

  const handleInsertVariable = (variable: string) => {
    if (activeChannelTab === 'WHATSAPP') {
      setModalWhatsappText((prev) => `${prev} ${variable}`);
    } else {
      setModalEmailBody((prev) => `${prev} ${variable}`);
    }
  };

  const handleSaveModal = async () => {
    if (!editingRule) return;
    setSavingModal(true);
    try {
      await api.put(`/notifications/rules/${editingRule.trigger}`, {
        customWhatsappText: modalWhatsappText.trim() || null,
        customEmailSubject: modalEmailSubject.trim() || null,
        customEmailBody: modalEmailBody.trim() || null
      });

      setRules((prev) =>
        prev.map((r) =>
          r.trigger === editingRule.trigger
            ? {
                ...r,
                whatsappText: modalWhatsappText,
                emailSubject: modalEmailSubject,
                emailBody: modalEmailBody,
                isCustomized: true
              }
            : r
        )
      );

      showToast('Mensagens salvas com sucesso.');
      setEditingRule(null);
    } catch (err: any) {
      console.error('Erro ao salvar texto personalizado:', err);
      showToast(err?.response?.data?.message || 'Erro ao salvar texto.', 'error');
    } finally {
      setSavingModal(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!editingRule) return;
    setResettingModal(true);
    try {
      const res = await api.post(`/notifications/rules/${editingRule.trigger}/reset`);
      const { defaultWhatsappText, defaultEmailSubject, defaultEmailBody } = res.data;

      setModalWhatsappText(defaultWhatsappText || '');
      setModalEmailSubject(defaultEmailSubject || '');
      setModalEmailBody(defaultEmailBody || '');

      setRules((prev) =>
        prev.map((r) =>
          r.trigger === editingRule.trigger
            ? {
                ...r,
                whatsappText: defaultWhatsappText,
                emailSubject: defaultEmailSubject,
                emailBody: defaultEmailBody,
                isCustomized: false
              }
            : r
        )
      );

      showToast('Mensagem restaurada para o padrão oficial.');
    } catch (err) {
      console.error('Erro ao restaurar texto padrão:', err);
      showToast('Erro ao restaurar texto padrão.', 'error');
    } finally {
      setResettingModal(false);
    }
  };

  // Renderiza prévia com substituição das variáveis por dados de exemplo
  const renderLivePreview = (text: string) => {
    let rendered = text || '';
    Object.entries(SAMPLE_DATA).forEach(([tag, sampleVal]) => {
      rendered = rendered.split(tag).join(sampleVal);
    });
    return rendered;
  };

  // Agrupamento por categoria
  const groupedRules = rules.reduce<Record<string, NotificationRuleItem[]>>((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl font-medium text-sm shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-900/20'
              : 'bg-emerald-600 text-white shadow-emerald-900/20'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner Informativo sem poluição visual */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Canais de Notificação & Mensagens Automáticas
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Defina quais mensagens são enviadas via WhatsApp e E-mail para clientes, profissionais e dono do estúdio.
              Você pode ativar ou desativar canais individualmente e personalizar o texto oficial de cada momento.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">
              <WhatsAppIcon size={15} color="#059669" />
              <span>WhatsApp Integrado</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-xs font-medium">
              <Mail className="w-3.5 h-3.5 text-sky-600" />
              <span>E-mail Transacional</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categorias e Tabela de Regras */}
      <div className="space-y-6">
        {Object.entries(groupedRules).map(([catKey, catRules]) => {
          const categoryTitle = CATEGORY_LABELS[catKey] || catKey;

          return (
            <div key={catKey} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {categoryTitle}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {catRules.length} {catRules.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {catRules.map((rule) => {
                  return (
                    <div
                      key={rule.trigger}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Descrição do Evento */}
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {rule.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${
                              rule.recipientType === 'CLIENT'
                                ? 'bg-purple-100 text-purple-700'
                                : rule.recipientType === 'TEAM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {rule.recipientType === 'CLIENT'
                              ? 'Cliente'
                              : rule.recipientType === 'TEAM'
                              ? 'Equipe'
                              : 'Aluna'}
                          </span>
                          {rule.isCustomized && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Personalizada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {rule.description}
                        </p>
                      </div>

                      {/* Canais e Ações */}
                      <div className="flex flex-wrap items-center gap-4 lg:gap-6 self-start lg:self-auto">
                        {/* Controles para destinatários de Equipe */}
                        {rule.recipientType === 'TEAM' && (
                          <div className="flex items-center gap-3 pr-2 border-r border-slate-200 text-xs text-slate-600">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={rule.notifyProfessional}
                                onChange={() =>
                                  handleToggle(rule.trigger, 'notifyProfessional', rule.notifyProfessional)
                                }
                                className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span>Profissional</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={rule.notifyOwner}
                                onChange={() =>
                                  handleToggle(rule.trigger, 'notifyOwner', rule.notifyOwner)
                                }
                                className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span>Dono/Recepção</span>
                            </label>
                          </div>
                        )}

                        {/* Toggle WhatsApp com SVG oficial */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(rule.trigger, 'whatsappEnabled', rule.whatsappEnabled)
                            }
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              rule.whatsappEnabled
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800'
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          >
                            <WhatsAppIcon
                              size={15}
                              color={rule.whatsappEnabled ? '#059669' : '#94a3b8'}
                            />
                            <span>WhatsApp</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                rule.whatsappEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Toggle E-mail */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(rule.trigger, 'emailEnabled', rule.emailEnabled)
                            }
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              rule.emailEnabled
                                ? 'bg-sky-50/80 border-sky-300 text-sky-800'
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          >
                            <Mail
                              className={`w-3.5 h-3.5 ${
                                rule.emailEnabled ? 'text-sky-600' : 'text-slate-400'
                              }`}
                            />
                            <span>E-mail</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                rule.emailEnabled ? 'bg-sky-500' : 'bg-slate-300'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Botão Editar Mensagem */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(rule)}
                          className="px-3.5 py-1.5 bg-white border border-slate-300 hover:border-purple-400 hover:text-purple-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Editar Mensagem
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Edição de Mensagem sem ícones decorativos */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Editar Notificação: {editingRule.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Personalize as variáveis e o texto enviado aos destinatários.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Seletor de Canal dentro do Modal */}
              <div className="flex border-b border-slate-200 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveChannelTab('WHATSAPP')}
                  className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeChannelTab === 'WHATSAPP'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <WhatsAppIcon
                    size={16}
                    color={activeChannelTab === 'WHATSAPP' ? '#059669' : '#64748b'}
                  />
                  <span>Mensagem WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChannelTab('EMAIL')}
                  className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeChannelTab === 'EMAIL'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Mail
                    className={`w-4 h-4 ${
                      activeChannelTab === 'EMAIL' ? 'text-sky-600' : 'text-slate-400'
                    }`}
                  />
                  <span>Modelo de E-mail (Assunto & Corpo)</span>
                </button>
              </div>

              {/* Variáveis Dinâmicas Disponíveis */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Variáveis Dinâmicas (Clique para inserir no texto)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editingRule.variables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => handleInsertVariable(variable)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:border-purple-500 hover:text-purple-700 text-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
                      title="Inserir variável"
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid: Editor à Esquerda e Prévia à Direita */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lado Esquerdo: Editor */}
                <div className="space-y-4">
                  {activeChannelTab === 'WHATSAPP' ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Texto da Mensagem
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {modalWhatsappText.length} caracteres
                        </span>
                      </div>
                      <textarea
                        value={modalWhatsappText}
                        onChange={(e) => setModalWhatsappText(e.target.value)}
                        rows={12}
                        className="w-full text-xs font-mono leading-relaxed p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Assunto do E-mail
                        </label>
                        <input
                          type="text"
                          value={modalEmailSubject}
                          onChange={(e) => setModalEmailSubject(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Corpo do E-mail (HTML permitido)
                        </label>
                        <textarea
                          value={modalEmailBody}
                          onChange={(e) => setModalEmailBody(e.target.value)}
                          rows={9}
                          className="w-full text-xs font-mono leading-relaxed p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lado Direito: Prévia Realista */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Pré-visualização (Simulação com Dados Reais)
                  </div>

                  {activeChannelTab === 'WHATSAPP' ? (
                    <div className="bg-[#EFEAE2] border border-slate-300 rounded-2xl p-4 min-h-[300px] flex flex-col justify-end">
                      <div className="max-w-[85%] bg-white rounded-lg p-3 text-slate-800 text-xs shadow-xs space-y-2 self-start border border-slate-200">
                        <div className="whitespace-pre-wrap font-sans leading-relaxed">
                          {renderLivePreview(modalWhatsappText)}
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          14:30
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[300px] space-y-3">
                      <div className="border-b border-slate-200 pb-2">
                        <div className="text-[11px] text-slate-500">Assunto:</div>
                        <div className="text-xs font-semibold text-slate-900">
                          {renderLivePreview(modalEmailSubject)}
                        </div>
                      </div>
                      <div
                        className="text-xs text-slate-700 leading-relaxed space-y-2"
                        dangerouslySetInnerHTML={{
                          __html: renderLivePreview(modalEmailBody)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={resettingModal || savingModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resettingModal ? 'Restaurando...' : 'Restaurar Padrão Oficial'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={savingModal}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {savingModal ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
