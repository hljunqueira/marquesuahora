'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!token) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Link Incompleto ou Inválido</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          O token de segurança não foi identificado na URL. Por favor, verifique o link enviado para o seu e-mail ou solicite um novo.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
        >
          Voltar para o Login
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        'Não foi possível redefinir sua senha. O link pode ter expirado.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 max-w-md w-full text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Senha Definida com Sucesso</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sua conta está confirmada e sua senha foi registrada com segurança. Você já pode fazer login na plataforma.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <span>Acessar Minha Conta</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 max-w-md w-full space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Defina sua Senha de Acesso</h1>
        <p className="text-xs text-slate-500">
          Crie sua senha pessoal e intransferível para gerenciar seu espaço.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nova Senha *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md focus:outline-none transition-colors cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirme a Nova Senha *
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando Senha...</span>
            </>
          ) : (
            <span>Confirmar e Salvar Senha</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 flex flex-col items-center justify-center">
      <Link href="/" className="mb-6 inline-block">
        <span className="text-2xl font-black tracking-tight text-slate-900 font-display">
          Marque<span className="text-purple-600">SuaHora</span>
        </span>
      </Link>
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
            <span className="text-xs">Carregando formulário...</span>
          </div>
        }
      >
        <RedefinirSenhaForm />
      </Suspense>
    </div>
  );
}
