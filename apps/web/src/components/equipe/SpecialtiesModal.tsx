'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Check, Edit2, Sparkles, Clock, Tag } from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUrl';

export interface ProfessionalMemberForModal {
  id: string;
  name: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  color?: string;
  commissionPercentage?: number;
  specialties: string[];
}

interface SpecialtiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: ProfessionalMemberForModal | null;
  onEditMember?: (member: ProfessionalMemberForModal) => void;
}

export function SpecialtiesModal({
  isOpen,
  onClose,
  member,
  onEditMember
}: SpecialtiesModalProps) {
  const [search, setSearch] = useState('');

  const specialties = useMemo(() => {
    if (!member?.specialties) return [];
    return member.specialties;
  }, [member]);

  const filteredSpecialties = useMemo(() => {
    if (!search.trim()) return specialties;
    const term = search.toLowerCase();
    return specialties.filter((s) => s.toLowerCase().includes(term));
  }, [specialties, search]);

  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Cabeçalho */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3 min-w-0">
              {member.avatarUrl ? (
                <img
                  src={resolveImageUrl(member.avatarUrl)}
                  alt={member.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-2xs shrink-0"
                  style={{ backgroundColor: member.color || '#7C3AED' }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {member.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                    {specialties.length} {specialties.length === 1 ? 'serviço' : 'serviços'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate font-medium">
                  {member.role || 'Especialista'} • Especialidades habilitadas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Busca de Especialidades */}
          {specialties.length > 6 && (
            <div className="p-3.5 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar especialidades..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Conteúdo / Lista de Especialidades */}
          <div className="p-5 overflow-y-auto flex-1 space-y-2">
            {filteredSpecialties.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhuma especialidade encontrada com esse termo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredSpecialties.map((spec, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate" title={spec}>
                        {spec}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé de Ações */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Procedimentos disponíveis na vitrine e na agenda
            </span>
            <div className="flex items-center gap-2">
              {onEditMember && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditMember(member);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Gerenciar Serviços</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
