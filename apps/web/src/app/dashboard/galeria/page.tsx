'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  ZoomIn,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/imageUrl';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function DashboardGaleriaPage() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('Seu Espaço');
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState<string>('#5c0701');

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.get('/tenants/me').catch(() => null),
      api.get('/tenants/me/gallery').catch(() => ({ data: { photos: [] } }))
    ])
      .then(([tenantRes, galleryRes]) => {
        if (!isMounted) return;

        if (tenantRes?.data) {
          setTenantSlug(tenantRes.data.slug || '');
          setTenantName(tenantRes.data.name || 'Seu Espaço');
          if (tenantRes.data.primaryColor) {
            setTenantPrimaryColor(tenantRes.data.primaryColor);
          }
        }

        const initialPhotos = galleryRes?.data?.photos || tenantRes?.data?.galleryPhotos || [];
        setPhotos(initialPhotos);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await api.post('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.relativeUrl || res.data?.url) {
          newUploadedUrls.push(res.data.relativeUrl || res.data.url);
        }
      }

      if (newUploadedUrls.length > 0) {
        const updatedList = [...newUploadedUrls, ...photos];
        setPhotos(updatedList);

        // Salva imediatamente no banco
        setSaving(true);
        await api.put('/tenants/me/gallery', { photos: updatedList });
        showToast(
          `${newUploadedUrls.length} ${
            newUploadedUrls.length === 1 ? 'foto adicionada' : 'fotos adicionadas'
          } à galeria com sucesso.`
        );
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao realizar upload das fotos.');
    } finally {
      setUploading(false);
      setSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    const updated = photos.filter((p) => p !== photoUrl);
    setPhotos(updated);
    setDeleteTarget(null);

    try {
      setSaving(true);
      await api.put('/tenants/me/gallery', { photos: updated });
      showToast('Foto removida da galeria.');
    } catch (err: any) {
      showToast('Erro ao remover foto da galeria.');
      // Reverte em caso de falha
      setPhotos(photos);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Oculto de Upload Múltiplo */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        onChange={handleUploadFiles}
        className="hidden"
      />

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xs shrink-0"
              style={{ backgroundColor: tenantPrimaryColor }}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Galeria de Fotos & Inspirações
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Fotos dos seus trabalhos e unhas exibidas na vitrine online para as clientes se inspirarem.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {tenantSlug && (
            <Link
              href={`/${tenantSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Abrir vitrine pública em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver na Vitrine</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ backgroundColor: tenantPrimaryColor }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando fotos...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Adicionar Fotos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card de Boas Práticas e Explicação de Negócio */}
      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/70 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs text-purple-950 space-y-1">
          <span className="font-bold block">
            Por que a Galeria de Fotos é essencial para aumentar seus agendamentos?
          </span>
          <p className="text-purple-800 leading-relaxed text-[11px]">
            Muitas clientes não sabem diferenciar os nomes técnicos dos serviços (como esmaltação em gel, banho de gel ou alongamento na fibra). Ao verem as fotos reais das unhas e procedimentos feitos no seu espaço, elas se apaixonam pelo resultado e decidem agendar com muito mais confiança!
          </p>
        </div>
      </div>

      {/* Lista / Grade de Fotos da Galeria */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">
            Carregando fotos da galeria...
          </p>
        </div>
      ) : photos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Sua galeria ainda não possui fotos
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Adicione fotos das unhas e procedimentos que você faz para que suas clientes vejam na vitrine de agendamento.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ backgroundColor: tenantPrimaryColor }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Adicionar Primeiras Fotos</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">
              {photos.length} {photos.length === 1 ? 'foto publicada' : 'fotos publicadas'} na vitrine
            </span>
            {saving && (
              <span className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando alterações...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {photos.map((url, idx) => (
              <div
                key={idx}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200"
              >
                <img
                  src={resolveImageUrl(url)}
                  alt={`Trabalho ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Camada de Ações no Hover */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(url)}
                    className="w-8 h-8 rounded-xl bg-white/90 text-slate-800 hover:bg-white flex items-center justify-center transition-transform hover:scale-110 shadow-sm cursor-pointer"
                    title="Ampliar foto"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(url)}
                    className="w-8 h-8 rounded-xl bg-rose-600/90 text-white hover:bg-rose-600 flex items-center justify-center transition-transform hover:scale-110 shadow-sm cursor-pointer"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[9px] font-mono font-bold">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Lightbox de Foto Ampliada */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative w-full max-h-[80vh] flex items-center justify-center p-4">
              <img
                src={resolveImageUrl(selectedPhoto)}
                alt="Foto ampliada"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remover foto da galeria?"
        description="Esta foto deixará de ser exibida na vitrine online dos seus clientes. Essa ação não pode ser desfeita."
        confirmLabel="Sim, remover foto"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTarget) handleDeletePhoto(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
