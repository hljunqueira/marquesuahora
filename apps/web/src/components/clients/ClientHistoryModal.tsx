'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  ExternalLink,
  FileText,
  AlertCircle,
  FileCheck,
  Send,
  Copy,
  Check,
  Pencil,
  Camera,
  Trash2,
  Maximize2,
  ChevronRight,
  SplitSquareVertical,
  Upload,
  CheckCircle2,
  Save,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { api, API_BASE_URL } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { ClientItem, ClientScheduleItem } from './types';

interface ClientHistoryModalProps {
  clientId: string | null;
  onClose: () => void;
}

const NAIL_SHAPES = [
  'Quadrada',
  'Redonda',
  'Almond',
  'Bailarina',
  'Stiletto',
  'Oval',
  'Squoval'
];

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  clientId,
  onClose
}) => {
  const [client, setClient] = useState<ClientItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estados de Edição da Ficha de Anamnese
  const [isEditingAnamnesis, setIsEditingAnamnesis] = useState(false);
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);
  const [anamnesisForm, setAnamnesisForm] = useState({
    hasAllergies: false,
    allergies: '',
    isDiabetic: false,
    hasNailMycosis: false,
    isPregnant: false,
    bitesNails: false,
    chemicalHandling: false,
    preferredShape: 'Quadrada',
    notes: ''
  });

  // Estados de Upload de Fotos nas Manutenções
  const [uploadingPhoto, setUploadingPhoto] = useState<{
    scheduleId: string;
    type: 'arrival' | 'result';
  } | null>(null);

  // Estados de Preview e Comparação
  const [comparisonModal, setComparisonModal] = useState<{
    arrivalUrl?: string | null;
    resultUrl?: string | null;
    serviceName: string;
    date: string;
  } | null>(null);

  const [singlePhotoModal, setSinglePhotoModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Toast de Notificação
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Estado de Confirmação de Exclusão de Foto
  const [photoToDelete, setPhotoToDelete] = useState<{
    scheduleId: string;
    type: 'arrival' | 'result';
    label: string;
  } | null>(null);

  useEffect(() => {
    if (!clientId) return;

    setLoading(true);
    setError(null);
    setIsEditingAnamnesis(false);

    api
      .get(`/clients/${clientId}`)
      .then((res) => {
        setClient(res.data);
        if (res.data?.anamnesis) {
          setAnamnesisForm({
            hasAllergies: !!res.data.anamnesis.hasAllergies,
            allergies: res.data.anamnesis.allergies || '',
            isDiabetic: !!res.data.anamnesis.isDiabetic,
            hasNailMycosis: !!res.data.anamnesis.hasNailMycosis,
            isPregnant: !!res.data.anamnesis.isPregnant,
            bitesNails: !!res.data.anamnesis.bitesNails,
            chemicalHandling: !!res.data.anamnesis.chemicalHandling,
            preferredShape: res.data.anamnesis.preferredShape || 'Quadrada',
            notes: res.data.anamnesis.notes || ''
          });
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Erro ao carregar histórico do cliente.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clientId]);

  const getImageUrl = (url?: string | null) => {
    return resolveImageUrl(url);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleCopyLink = () => {
    if (!client?.anamnesisToken) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/anamnese/${client.anamnesisToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenEditAnamnesis = () => {
    if (client?.anamnesis) {
      setAnamnesisForm({
        hasAllergies: !!client.anamnesis.hasAllergies,
        allergies: client.anamnesis.allergies || '',
        isDiabetic: !!client.anamnesis.isDiabetic,
        hasNailMycosis: !!client.anamnesis.hasNailMycosis,
        isPregnant: !!client.anamnesis.isPregnant,
        bitesNails: !!client.anamnesis.bitesNails,
        chemicalHandling: !!client.anamnesis.chemicalHandling,
        preferredShape: client.anamnesis.preferredShape || 'Quadrada',
        notes: client.anamnesis.notes || ''
      });
    } else {
      setAnamnesisForm({
        hasAllergies: false,
        allergies: '',
        isDiabetic: false,
        hasNailMycosis: false,
        isPregnant: false,
        bitesNails: false,
        chemicalHandling: false,
        preferredShape: 'Quadrada',
        notes: ''
      });
    }
    setIsEditingAnamnesis(true);
  };

  const handleSaveAnamnesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setSavingAnamnesis(true);
    try {
      const res = await api.patch(`/clients/${client.id}/anamnesis`, {
        anamnesis: anamnesisForm
      });

      setClient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          anamnesis: res.data?.anamnesis || anamnesisForm
        };
      });

      setIsEditingAnamnesis(false);
      showToast('Ficha de anamnese salva com sucesso!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Falha ao salvar ficha de anamnese.');
    } finally {
      setSavingAnamnesis(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    scheduleId: string,
    type: 'arrival' | 'result'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto({ scheduleId, type });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res.data?.url;
      if (!uploadedUrl) throw new Error('Não foi possível obter a URL da imagem.');

      const field = type === 'arrival' ? 'arrivalPhotoUrl' : 'resultPhotoUrl';

      await api.patch(`/schedules/${scheduleId}`, {
        [field]: uploadedUrl
      });

      setClient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          schedules: prev.schedules?.map((s) => {
            if (s.id === scheduleId) {
              return { ...s, [field]: uploadedUrl };
            }
            return s;
          })
        };
      });
      showToast('Foto do atendimento enviada com sucesso!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Falha ao fazer upload da foto de manutenção.');
    } finally {
      setUploadingPhoto(null);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (scheduleId: string, type: 'arrival' | 'result') => {
    const label = type === 'arrival' ? 'Como Chegou (Entrada)' : 'Como Ficou (Resultado)';
    setPhotoToDelete({ scheduleId, type, label });
  };

  const executeRemovePhoto = async () => {
    if (!photoToDelete) return;
    const { scheduleId, type } = photoToDelete;
    const field = type === 'arrival' ? 'arrivalPhotoUrl' : 'resultPhotoUrl';

    try {
      await api.patch(`/schedules/${scheduleId}`, {
        [field]: null
      });

      setClient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          schedules: prev.schedules?.map((s) => {
            if (s.id === scheduleId) {
              return { ...s, [field]: null };
            }
            return s;
          })
        };
      });
      showToast('Foto removida com sucesso.');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao remover foto.');
    } finally {
      setPhotoToDelete(null);
    }
  };

  const schedules = client?.schedules || [];
  const totalSpent = schedules
    .filter((s) => s.status === 'COMPLETED' || s.status === 'CONFIRMED')
    .reduce((acc, curr) => acc + Number(curr.totalPrice || 0), 0);

  if (!clientId) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
        <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-tenant-primary flex items-center justify-center text-white font-bold text-base shadow-sm">
                {client ? client.name.slice(0, 2).toUpperCase() : '..'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    {client?.name || 'Ficha do Cliente'}
                  </h3>
                  {client?.phone && (
                    <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                      {client.phone}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Histórico completo de atendimentos, ficha de anamnese e fotos de manutenções
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {loading ? (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="h-20 bg-slate-100 rounded-2xl" />
                <div className="h-44 bg-slate-100 rounded-2xl" />
                <div className="h-64 bg-slate-100 rounded-2xl" />
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : client ? (
              <>
                {/* Quick Info & KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Visitas Totais
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {schedules.length}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Total Faturado
                    </div>
                    <div className="text-xl font-bold text-emerald-700">
                      {formatCurrency(totalSpent)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Faltas (No-Show)
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        client.noShowCount > 0 ? 'text-amber-600' : 'text-slate-900'
                      }`}
                    >
                      {client.noShowCount}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Status Shield
                    </div>
                    <div className="text-xs font-bold mt-1">
                      {client.isBlockedOnline ? (
                        <span className="text-rose-600">Bloqueado</span>
                      ) : client.noShowCount > 0 ? (
                        <span className="text-amber-600">Exige Sinal</span>
                      ) : (
                        <span className="text-emerald-700">Regular</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* FICHA DE ANAMNESE TÉCNICA */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-purple-700 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Ficha de Anamnese Técnica
                      </span>
                      {client.anamnesis ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Preenchida
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Pendente
                        </span>
                      )}
                    </div>

                    {!isEditingAnamnesis && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenEditAnamnesis}
                          className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{client.anamnesis ? 'Editar Ficha' : 'Preencher Ficha'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Formulário de Edição da Anamnese */}
                  {isEditingAnamnesis ? (
                    <form
                      onSubmit={handleSaveAnamnesis}
                      className="p-4 rounded-xl bg-white border border-purple-200 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800">
                          Editando Ficha de Anamnese Técnica
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Atualização direta pela profissional
                        </span>
                      </div>

                      {/* Alergias */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={anamnesisForm.hasAllergies}
                            onChange={(e) =>
                              setAnamnesisForm({
                                ...anamnesisForm,
                                hasAllergies: e.target.checked
                              })
                            }
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-800">
                            Possui histórico de alergias (esmaltes, monomer, cosméticos, etc.)
                          </span>
                        </label>
                        {anamnesisForm.hasAllergies && (
                          <input
                            type="text"
                            placeholder="Descreva as alergias da cliente (ex: esmalte em gel, produtos à base de ácido)"
                            value={anamnesisForm.allergies}
                            onChange={(e) =>
                              setAnamnesisForm({
                                ...anamnesisForm,
                                allergies: e.target.value
                              })
                            }
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                          />
                        )}
                      </div>

                      {/* Condições de Saúde & Cuidados */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={anamnesisForm.isDiabetic}
                            onChange={(e) =>
                              setAnamnesisForm({
                                ...anamnesisForm,
                                isDiabetic: e.target.checked
                              })
                            }
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 block">
                              Diabetes
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Cuidado com cutilagem e cicatrização
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={anamnesisForm.hasNailMycosis}
                            onChange={(e) =>
                              setAnamnesisForm({
                                ...anamnesisForm,
                                hasNailMycosis: e.target.checked
                              })
                            }
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 block">
                              Fungos / Micose de Unha
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Atenção a manchas ou descolamento
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={anamnesisForm.isPregnant}
                            onChange={(e) =>
                              setAnamnesisForm({
                                ...anamnesisForm,
                                isPregnant: e.target.checked
                              })
                            }
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 block">
                              Gestante ou Lactante
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Sensibilidade a odores ou químicos
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={anamnesisForm.bitesNails}
                            onChange={(e) =>
                              setAnamnesisForm({
                                ...anamnesisForm,
                                bitesNails: e.target.checked
                              })
                            }
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 block">
                              Hábito de Roer Unhas (Onicofagia)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Leito reduzido / reforço estrutural
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={anamnesisForm.chemicalHandling}
                            onChange={(e) =>
                              setAnamnesisForm({
                                ...anamnesisForm,
                                chemicalHandling: e.target.checked
                              })
                            }
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 block">
                              Contato Frequente com Produtos Químicos / Limpeza / Água
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Exige maior selagem e preparação
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Formato Predileto */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Formato Predileto de Unhas
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {NAIL_SHAPES.map((shape) => {
                            const isSelected = anamnesisForm.preferredShape === shape;
                            return (
                              <button
                                key={shape}
                                type="button"
                                onClick={() =>
                                  setAnamnesisForm({
                                    ...anamnesisForm,
                                    preferredShape: shape
                                  })
                                }
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                                  isSelected
                                    ? 'bg-purple-700 text-white border-purple-700'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {shape}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Observações da Profissional */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Observações Técnicas e Preferências
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Ex: Lâmina oleosa, necessita de desidratador reforçado, prefere cutícula funda, sensível à cabine..."
                          value={anamnesisForm.notes}
                          onChange={(e) =>
                            setAnamnesisForm({
                              ...anamnesisForm,
                              notes: e.target.value
                            })
                          }
                          className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                      </div>

                      {/* Ações do Formulário */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setIsEditingAnamnesis(false)}
                          disabled={savingAnamnesis}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingAnamnesis}
                          className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {savingAnamnesis ? (
                            <span>Salvando...</span>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar Ficha</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : client.anamnesis ? (
                    /* Visualização da Ficha Preenchida */
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-medium block text-[11px]">
                            Alergias
                          </span>
                          <span className="font-semibold text-slate-800">
                            {client.anamnesis.hasAllergies
                              ? client.anamnesis.allergies || 'Sim (Histórico assinalado)'
                              : 'Nenhuma alergia relatada'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-medium block text-[11px]">
                            Diabetes
                          </span>
                          <span
                            className={`font-semibold ${
                              client.anamnesis.isDiabetic ? 'text-rose-700' : 'text-slate-800'
                            }`}
                          >
                            {client.anamnesis.isDiabetic ? 'Sim (Cuidado com cutilagem)' : 'Não'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-medium block text-[11px]">
                            Fungos / Micose de Unha
                          </span>
                          <span className="font-semibold text-slate-800">
                            {client.anamnesis.hasNailMycosis ? 'Sim (Atenção)' : 'Não'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-medium block text-[11px]">
                            Gestante / Lactante
                          </span>
                          <span className="font-semibold text-slate-800">
                            {client.anamnesis.isPregnant ? 'Sim' : 'Não'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-medium block text-[11px]">
                            Hábito de Roer Unhas
                          </span>
                          <span className="font-semibold text-slate-800">
                            {client.anamnesis.bitesNails ? 'Sim' : 'Não'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-medium block text-[11px]">
                            Formato Predileto
                          </span>
                          <span className="font-semibold text-slate-800">
                            {client.anamnesis.preferredShape || 'Não especificado'}
                          </span>
                        </div>
                      </div>

                      {client.anamnesis.notes && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs">
                          <span className="text-slate-500 font-medium block text-[11px] mb-0.5">
                            Observações da Ficha
                          </span>
                          <p className="text-slate-800 leading-relaxed">
                            {client.anamnesis.notes}
                          </p>
                        </div>
                      )}

                      {client.anamnesisToken && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedLink ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedLink ? 'Link Copiado' : 'Copiar Link da Ficha'}</span>
                          </button>
                          <a
                            href={`/anamnese/${client.anamnesisToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir Link da Ficha</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Ficha Pendente */
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-slate-600">
                        A cliente ainda não preencheu a ficha. Você pode preenchê-la agora
                        manualmente ou enviar o link exclusivo via WhatsApp.
                      </p>
                      {client.anamnesisToken && (
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedLink ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
                          </button>
                          <a
                            href={`https://wa.me/55${client.phone.replace(
                              /\D/g,
                              ''
                            )}?text=${encodeURIComponent(
                              `Olá, ${
                                client.name.split(' ')[0]
                              }! Por gentileza, preencha sua ficha rápida de atendimento antes do seu horário no salão: ${
                                typeof window !== 'undefined' ? window.location.origin : ''
                              }/anamnese/${client.anamnesisToken}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar no WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TIMELINE DE MANUTENÇÕES E ATENDIMENTOS COM FOTOS ANTES E DEPOIS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Linha do Tempo de Manutenções</span>
                        <span className="text-xs font-medium text-slate-500">
                          ({schedules.length} {schedules.length === 1 ? 'visita' : 'visitas'})
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Evolução fotográfica das unhas (Como Chegou vs Como Ficou) a cada manutenção
                      </p>
                    </div>
                  </div>

                  {schedules.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-500 text-xs">
                      Nenhum agendamento registrado até o momento para este cliente.
                    </div>
                  ) : (
                    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                      {schedules.map((schedule, idx) => {
                        const serviceName = schedule.service?.name || 'Serviço Personalizado';
                        const profName = schedule.professional?.name || 'Não atribuído';

                        // Cálculo de intervalo entre visitas
                        let intervalBadge: { text: string; color: string } | null = null;
                        const previousVisit = schedules[idx + 1];
                        if (previousVisit) {
                          try {
                            const dCurr = new Date(schedule.date);
                            const dPrev = new Date(previousVisit.date);
                            const diffDays = Math.round(
                              (dCurr.getTime() - dPrev.getTime()) / (1000 * 60 * 60 * 24)
                            );
                            if (diffDays > 0) {
                              if (diffDays <= 30) {
                                intervalBadge = {
                                  text: `${diffDays} dias após a manutenção anterior (Ciclo ideal)`,
                                  color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                };
                              } else {
                                intervalBadge = {
                                  text: `${diffDays} dias após a manutenção anterior (Intervalo longo)`,
                                  color: 'text-amber-700 bg-amber-50 border-amber-200'
                                };
                              }
                            }
                          } catch {
                            // Ignora erro no parse
                          }
                        } else {
                          intervalBadge = {
                            text: 'Primeira visita registrada',
                            color: 'text-slate-600 bg-slate-100 border-slate-200'
                          };
                        }

                        const statusLabels: Record<
                          string,
                          { label: string; color: string }
                        > = {
                          PENDING: {
                            label: 'Pendente',
                            color: 'bg-amber-50 text-amber-700 border-amber-200'
                          },
                          CONFIRMED: {
                            label: 'Confirmado',
                            color: 'bg-blue-50 text-blue-700 border-blue-200'
                          },
                          IN_SERVICE: {
                            label: 'Em Atendimento',
                            color: 'bg-purple-50 text-purple-700 border-purple-200'
                          },
                          COMPLETED: {
                            label: 'Concluído',
                            color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          },
                          NO_SHOW: {
                            label: 'Faltou (No-Show)',
                            color: 'bg-rose-50 text-rose-700 border-rose-200'
                          },
                          CANCELLED: {
                            label: 'Cancelado',
                            color: 'bg-slate-100 text-slate-600 border-slate-200'
                          }
                        };

                        const currentStatus =
                          statusLabels[schedule.status] || statusLabels.PENDING;

                        const hasPhotos = !!schedule.arrivalPhotoUrl || !!schedule.resultPhotoUrl;

                        const isUploadingArrival =
                          uploadingPhoto?.scheduleId === schedule.id &&
                          uploadingPhoto?.type === 'arrival';
                        const isUploadingResult =
                          uploadingPhoto?.scheduleId === schedule.id &&
                          uploadingPhoto?.type === 'result';

                        return (
                          <div key={schedule.id} className="relative group">
                            {/* Marcador da Timeline */}
                            <div className="absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-purple-600 flex items-center justify-center shadow-xs">
                              <div className="w-2 h-2 rounded-full bg-purple-600" />
                            </div>

                            {/* Card da Manutenção */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors space-y-4">
                              {/* Top Bar do Card */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                                      {serviceName}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${currentStatus.color}`}
                                    >
                                      {currentStatus.label}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {formatDate(schedule.date)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      {schedule.startTime} - {schedule.endTime}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                      {profName}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                                  <span className="font-bold text-emerald-700 text-sm sm:text-base">
                                    {formatCurrency(Number(schedule.totalPrice || 0))}
                                  </span>
                                  {intervalBadge && (
                                    <span
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${intervalBadge.color}`}
                                    >
                                      {intervalBadge.text}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* ÁREA DE FOTOS: Como Chegou vs Como Ficou */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Registro Fotográfico da Manutenção
                                  </span>

                                  {hasPhotos && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setComparisonModal({
                                          arrivalUrl: schedule.arrivalPhotoUrl,
                                          resultUrl: schedule.resultPhotoUrl,
                                          serviceName,
                                          date: formatDate(schedule.date)
                                        })
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <SplitSquareVertical className="w-3.5 h-3.5" />
                                      <span>Comparar Antes e Depois</span>
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* 1. Como Chegou (Entrada) */}
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-xs font-bold text-slate-800">
                                          1. Como Chegou (Entrada)
                                        </span>
                                      </div>
                                      {schedule.arrivalPhotoUrl && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemovePhoto(schedule.id, 'arrival')
                                          }
                                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Remover
                                        </button>
                                      )}
                                    </div>

                                    {schedule.arrivalPhotoUrl ? (
                                      <div
                                        onClick={() =>
                                          setSinglePhotoModal({
                                            url: schedule.arrivalPhotoUrl!,
                                            title: 'Foto de Entrada — Como a cliente chegou',
                                            subtitle: `${serviceName} • ${formatDate(
                                              schedule.date
                                            )}`
                                          })
                                        }
                                        className="relative aspect-video rounded-xl overflow-hidden bg-slate-200 border border-slate-200 group cursor-pointer"
                                      >
                                        <img
                                          src={getImageUrl(schedule.arrivalPhotoUrl)}
                                          alt="Como a cliente chegou"
                                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                                          <Maximize2 className="w-4 h-4" />
                                          <span>Ampliar</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <label className="border border-dashed border-slate-300 rounded-xl p-3.5 text-center flex flex-col items-center justify-center gap-1 hover:border-purple-400 hover:bg-purple-50/40 transition-colors cursor-pointer bg-white">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          capture="environment"
                                          disabled={isUploadingArrival}
                                          onChange={(e) =>
                                            handlePhotoUpload(e, schedule.id, 'arrival')
                                          }
                                          className="hidden"
                                        />
                                        <Camera className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700">
                                          {isUploadingArrival
                                            ? 'Enviando...'
                                            : 'Fotografar / Anexar'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Unhas com crescimento ou estado inicial
                                        </span>
                                      </label>
                                    )}
                                  </div>

                                  {/* 2. Como Ficou (Resultado da Manutenção) */}
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-bold text-slate-800">
                                          2. Como Ficou (Resultado)
                                        </span>
                                      </div>
                                      {schedule.resultPhotoUrl && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemovePhoto(schedule.id, 'result')
                                          }
                                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Remover
                                        </button>
                                      )}
                                    </div>

                                    {schedule.resultPhotoUrl ? (
                                      <div
                                        onClick={() =>
                                          setSinglePhotoModal({
                                            url: schedule.resultPhotoUrl!,
                                            title: 'Resultado da Manutenção — Como ficou',
                                            subtitle: `${serviceName} • ${formatDate(
                                              schedule.date
                                            )}`
                                          })
                                        }
                                        className="relative aspect-video rounded-xl overflow-hidden bg-slate-200 border border-slate-200 group cursor-pointer"
                                      >
                                        <img
                                          src={getImageUrl(schedule.resultPhotoUrl)}
                                          alt="Como ficou"
                                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                                          <Maximize2 className="w-4 h-4" />
                                          <span>Ampliar</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <label className="border border-dashed border-slate-300 rounded-xl p-3.5 text-center flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors cursor-pointer bg-white">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          capture="environment"
                                          disabled={isUploadingResult}
                                          onChange={(e) =>
                                            handlePhotoUpload(e, schedule.id, 'result')
                                          }
                                          className="hidden"
                                        />
                                        <Camera className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700">
                                          {isUploadingResult
                                            ? 'Enviando...'
                                            : 'Fotografar / Anexar'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Unhas finalizadas e cuticuladas
                                        </span>
                                      </label>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Observações da visita */}
                              {schedule.notes && (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700 block text-[11px]">
                                    Anotação da visita:
                                  </span>
                                  {schedule.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE COMPARAÇÃO ANTES E DEPOIS (LADO A LADO) */}
      {comparisonModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <SplitSquareVertical className="w-5 h-5 text-purple-700" />
                  <span>Comparação da Manutenção — Antes & Depois</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {comparisonModal.serviceName} • Atendimento em {comparisonModal.date}
                </p>
              </div>
              <button
                onClick={() => setComparisonModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lado Esquerdo: Como Chegou */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Como a Cliente Chegou (Entrada)
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden aspect-4/3 flex items-center justify-center">
                    {comparisonModal.arrivalUrl ? (
                      <img
                        src={getImageUrl(comparisonModal.arrivalUrl)}
                        alt="Como a cliente chegou"
                        className="w-full h-full object-contain bg-black/5"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        Nenhuma foto de entrada anexada nesta visita.
                      </span>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Como Ficou */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Resultado da Manutenção (Saída)
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden aspect-4/3 flex items-center justify-center">
                    {comparisonModal.resultUrl ? (
                      <img
                        src={getImageUrl(comparisonModal.resultUrl)}
                        alt="Resultado final da manutenção"
                        className="w-full h-full object-contain bg-black/5"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        Nenhuma foto de resultado anexada nesta visita.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setComparisonModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar Comparação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM DE UMA FOTO INDIVIDUAL */}
      {singlePhotoModal && (
        <div
          onClick={() => setSinglePhotoModal(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col cursor-default"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {singlePhotoModal.title}
                </h4>
                {singlePhotoModal.subtitle && (
                  <p className="text-xs text-slate-500">
                    {singlePhotoModal.subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSinglePhotoModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={getImageUrl(singlePhotoModal.url)}
                alt={singlePhotoModal.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSinglePhotoModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifier */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-60 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700"
          >
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmação de Remoção de Foto */}
      <ConfirmModal
        isOpen={Boolean(photoToDelete)}
        title="Remover Foto do Atendimento?"
        description={`Deseja realmente remover a foto de "${photoToDelete?.label}" deste atendimento? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, Remover Foto"
        isDestructive={true}
        onConfirm={executeRemovePhoto}
        onClose={() => setPhotoToDelete(null)}
      />
    </>
  );
};
