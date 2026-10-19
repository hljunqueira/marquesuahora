'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { api } from '@/lib/api';

export interface AftercareGuideItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  items: string[];
  isActive: boolean;
}

interface SettingsAftercareTabProps {
  initialGuides?: AftercareGuideItem[];
  onSaved?: (guides: AftercareGuideItem[]) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const DEFAULT_NAIL_AFTERCARE: AftercareGuideItem[] = [
  {
    id: 'aftercare-unhas-gel',
    title: 'Alongamento em Gel & Fibra de Vidro',
    category: 'Unhas',
    description: 'Recomendações fundamentais para manter suas unhas impecáveis, resistentes e saudáveis.',
    items: [
      'Evite usar as unhas como ferramentas para abrir latas, gavetas, caixas ou raspar superfícies rígidas.',
      'Utilize luvas de proteção sempre que manusear produtos químicos de limpeza doméstica (cloro, água sanitária e detergentes concentrados).',
      'Hidrate diariamente as cutículas com óleo vegetal ou sérum nutritivo para preservar a flexibilidade do gel e o brilho do top coat.',
      'Respeite rigorosamente o período de manutenção (a cada 18 a 25 dias) para prevenir infiltrações, descolamentos e proteger a matriz natural da unha.',
      'Nunca tente arrancar o alongamento ou morder o gel. Em caso de qualquer descolamento acidental, entre em contato imediatamente com o studio.'
    ],
    isActive: true
  },
  {
    id: 'aftercare-esmaltacao-gel',
    title: 'Esmaltação em Gel & Blindagem Diamond',
    category: 'Unhas',
    description: 'Cuidados essenciais para garantir brilho espelhado e durabilidade superior a 20 dias.',
    items: [
      'Evite banhos muito quentes e contato contínuo com água fervente nas primeiras 12 horas após a aplicação.',
      'Não lixe as pontas das unhas em casa para não romper o selamento da borda livre feito em mesa.',
      'Caso deseje retirar qualquer esmalte comum aplicado sobre a blindagem, use exclusivamente removedor sem acetona.'
    ],
    isActive: true
  },
  {
    id: 'aftercare-cilios-lash',
    title: 'Extensão de Cílios & Lash Lifting',
    category: 'Cílios',
    description: 'Orientações práticas para retenção máxima do adesivo e preservação dos fios naturais.',
    items: [
      'Evite molhar a área dos olhos, vapor quente, saunas ou atividades físicas de alta sudorese nas primeiras 24 horas.',
      'Higienize os cílios diariamente a partir do segundo dia utilizando espuma micelar ou shampoo neutro diluído em água fria.',
      'Penteie suavemente as extensões com a escovinha limpa fornecida ao acordar e após secar o rosto.',
      'Não utilize máscaras de cílios (rímel) à prova d\'água nem demaquilantes à base de óleos na região dos olhos.'
    ],
    isActive: true
  }
];

export const SettingsAftercareTab: React.FC<SettingsAftercareTabProps> = ({
  initialGuides = [],
  onSaved,
  showToast
}) => {
  const [guides, setGuides] = useState<AftercareGuideItem[]>(() => {
    if (Array.isArray(initialGuides) && initialGuides.length > 0) {
      return initialGuides;
    }
    return DEFAULT_NAIL_AFTERCARE;
  });

  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Modal / Edição de Guia
  const [editingGuide, setEditingGuide] = useState<AftercareGuideItem | null>(null);
  const [guideTitle, setGuideTitle] = useState('');
  const [guideCategory, setGuideCategory] = useState('');
  const [guideDescription, setGuideDescription] = useState('');
  const [guideItems, setGuideItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleOpenNewGuide = () => {
    setEditingGuide(null);
    setGuideTitle('');
    setGuideCategory('Geral');
    setGuideDescription('');
    setGuideItems([]);
    setNewItemText('');
    setIsEditorOpen(true);
  };

  const handleOpenEditGuide = (g: AftercareGuideItem) => {
    setEditingGuide(g);
    setGuideTitle(g.title);
    setGuideCategory(g.category || 'Geral');
    setGuideDescription(g.description || '');
    setGuideItems([...g.items]);
    setNewItemText('');
    setIsEditorOpen(true);
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setGuideItems((prev) => [...prev, newItemText.trim()]);
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    setGuideItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveGuideInList = () => {
    if (!guideTitle.trim()) {
      showToast('O título do guia de cuidados é obrigatório.', 'error');
      return;
    }

    if (guideItems.length === 0) {
      showToast('Adicione ao menos uma orientação prática de cuidado.', 'error');
      return;
    }

    if (editingGuide) {
      setGuides((prev) =>
        prev.map((g) =>
          g.id === editingGuide.id
            ? {
                ...g,
                title: guideTitle.trim(),
                category: guideCategory.trim() || 'Geral',
                description: guideDescription.trim() || undefined,
                items: guideItems
              }
            : g
        )
      );
    } else {
      const newGuide: AftercareGuideItem = {
        id: `guide-${Date.now()}`,
        title: guideTitle.trim(),
        category: guideCategory.trim() || 'Geral',
        description: guideDescription.trim() || undefined,
        items: guideItems,
        isActive: true
      };
      setGuides((prev) => [...prev, newGuide]);
    }

    setIsEditorOpen(false);
  };

  const handleToggleGuideActive = (id: string) => {
    setGuides((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g))
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    setGuides((prev) => prev.filter((g) => g.id !== deleteTargetId));
    setDeleteTargetId(null);
    showToast('Guia removido da lista.', 'success');
  };

  const handleSaveToBackend = async () => {
    setSaving(true);
    try {
      await api.put('/tenants/me/aftercare', { aftercareGuides: guides });
      showToast('Guias de cuidados pós-atendimento salvos com sucesso!', 'success');
      if (onSaved) onSaved(guides);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar guias de cuidados.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    setGuides(DEFAULT_NAIL_AFTERCARE);
    showToast('Recomendações padrão restauradas na tela. Clique em Salvar para gravar.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header da Aba */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-tenant-primary" />
            <span>Cuidados Pós-Atendimento (Portal da Cliente)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Personalize as orientações de cuidados exibidas diretamente na área da cliente (Link da Bio). As clientes visualizam essas recomendações no celular após a realização de cada procedimento.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Restaurar Padrão
          </button>
          <button
            type="button"
            onClick={handleOpenNewGuide}
            className="px-4 py-2 text-xs font-bold text-white btn-primary-tenant rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Guia</span>
          </button>
        </div>
      </div>

      {/* Lista de Guias */}
      <div className="grid grid-cols-1 gap-4">
        {guides.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum guia de cuidados cadastrado</p>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre orientações práticas para instruir suas clientes e aumentar a retenção dos procedimentos.
            </p>
          </div>
        ) : (
          guides.map((guide) => (
            <div
              key={guide.id}
              className={`p-6 bg-white rounded-3xl border transition-all ${
                guide.isActive ? 'border-slate-200/90 shadow-xs' : 'border-slate-100 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                      {guide.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{guide.title}</h3>
                  </div>
                  {guide.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{guide.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleGuideActive(guide.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      guide.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {guide.isActive ? 'Ativo' : 'Pausado'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditGuide(guide)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    aria-label="Editar Guia"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(guide.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    aria-label="Excluir Guia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tópicos de Orientação */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Orientações Práticas ({guide.items.length})
                </span>
                <ul className="space-y-2">
                  {guide.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Botão de Salvar Alterações no Banco */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveToBackend}
          disabled={saving}
          className="px-6 py-3 rounded-2xl text-xs font-bold text-white btn-primary-tenant shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Gravando Alterações...' : 'Salvar Orientações de Cuidados'}
        </button>
      </div>

      {/* Modal Clean de Edição/Criação de Guia */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingGuide ? 'Editar Guia de Cuidados' : 'Novo Guia de Cuidados'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título do Guia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={guideTitle}
                  onChange={(e) => setGuideTitle(e.target.value)}
                  placeholder="Ex: Alongamento em Gel & Fibra"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoria de Exibição
                </label>
                <input
                  type="text"
                  value={guideCategory}
                  onChange={(e) => setGuideCategory(e.target.value)}
                  placeholder="Ex: Unhas, Cílios, Cabelos, Pele"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição Curta (Opcional)
                </label>
                <input
                  type="text"
                  value={guideDescription}
                  onChange={(e) => setGuideDescription(e.target.value)}
                  placeholder="Ex: Recomendações práticas para preservar o procedimento."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Orientações Práticas
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    placeholder="Digite uma recomendação e clique em adicionar..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {guideItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-400">{idx + 1}.</span>
                        <span>{item}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGuideInList}
                className="px-5 py-2 text-xs font-bold text-white btn-primary-tenant rounded-xl shadow-xs"
              >
                Concluir Guia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Remover Guia de Cuidados"
        description="Deseja realmente excluir este guia de cuidados? As clientes não terão mais acesso a estas orientações no portal."
        confirmLabel="Excluir Guia"
        cancelLabel="Cancelar"
        isDestructive
      />
    </div>
  );
};
