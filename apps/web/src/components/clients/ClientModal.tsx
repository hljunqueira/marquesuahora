'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, FileText, Calendar, ShieldAlert } from 'lucide-react';
import { InputMask } from '@/components/ui/InputMask';
import { ClientItem } from './types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Partial<ClientItem>) => Promise<void>;
  client?: ClientItem | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  client
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');
  const [isBlockedOnline, setIsBlockedOnline] = useState(false);
  const [noShowCount, setNoShowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setDocumentNumber(client.documentNumber || '');
      setBirthday(client.birthday ? client.birthday.split('T')[0] : '');
      setNotes(client.notes || '');
      setIsBlockedOnline(Boolean(client.isBlockedOnline));
      setNoShowCount(client.noShowCount || 0);
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setDocumentNumber('');
      setBirthday('');
      setNotes('');
      setIsBlockedOnline(false);
      setNoShowCount(0);
    }
    setError(null);
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome do cliente é obrigatório.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Informe um telefone válido com DDD (mínimo 10 dígitos).');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || null,
        documentNumber: documentNumber ? documentNumber.replace(/\D/g, '') : null,
        birthday: birthday || null,
        notes: notes.trim() || null,
        isBlockedOnline,
        noShowCount
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {client ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <p className="text-xs text-slate-500">
                {client ? 'Atualize as informações cadastrais' : 'Cadastre um novo cliente na sua base'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <InputMask
                mask="phone"
                label="WhatsApp / Celular *"
                value={phone}
                onChangeValue={(formatted) => setPhone(formatted)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <InputMask
                mask="document"
                label="CPF (Opcional)"
                value={documentNumber}
                onChangeValue={(formatted) => setDocumentNumber(formatted)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Observações & Preferências (Uso Interno)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            />
          </div>

          {/* No-Show Shield Settings */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Controle No-Show Shield</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">Bloqueio de Agendamento Online</div>
                <div className="text-[11px] text-slate-500">Cliente só poderá agendar falando diretamente pelo WhatsApp</div>
              </div>
              <input
                type="checkbox"
                checked={isBlockedOnline}
                onChange={(e) => setIsBlockedOnline(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 bg-white border-slate-300 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs font-semibold text-slate-800">Contador de Faltas (No-Show)</div>
                <div className="text-[11px] text-slate-500">Faltas acumuladas sem aviso prévio</div>
              </div>
              <input
                type="number"
                min={0}
                max={10}
                value={noShowCount}
                onChange={(e) => setNoShowCount(parseInt(e.target.value) || 0)}
                className="w-16 px-2.5 py-1.5 text-center rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl btn-primary-tenant text-sm font-semibold active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Salvando...' : client ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
