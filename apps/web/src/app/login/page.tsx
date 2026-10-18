'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  X,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  // Estados do Modal de Recuperação de Senha
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired') === 'true') {
        setSessionExpiredNotice(true);
      }
      if (params.get('forgot') === 'true') {
        setIsForgotPasswordOpen(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.marquesuahora.com.br').replace(/\/$/, '');

    try {
      let res;
      try {
        res = await axios.post(`${API_BASE}/api/v1/auth/login`, {
          email: email.trim().toLowerCase(),
          password
        }, { withCredentials: true });
      } catch (err1: any) {
        if (err1.response?.status === 404) {
          res = await axios.post(`${API_BASE}/auth/login`, {
            email: email.trim().toLowerCase(),
            password
          }, { withCredentials: true });
        } else {
          throw err1;
        }
      }

      const { user, token, refreshToken } = res.data;

      if (token) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
      }

      if (user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'E-mail ou senha incorretos. Por favor, tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) return;

    setForgotPasswordLoading(true);
    setForgotPasswordError(null);

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.marquesuahora.com.br').replace(/\/$/, '');

    try {
      let res;
      try {
        res = await axios.post(`${API_BASE}/api/v1/auth/forgot-password`, {
          email: forgotPasswordEmail.trim().toLowerCase()
        });
      } catch (err1: any) {
        if (err1.response?.status === 404) {
          res = await axios.post(`${API_BASE}/auth/forgot-password`, {
            email: forgotPasswordEmail.trim().toLowerCase()
          });
        } else {
          throw err1;
        }
      }

      setForgotPasswordSuccess(true);
    } catch (err: any) {
      setForgotPasswordError(
        err.response?.data?.message || 'Não foi possível processar o pedido. Tente novamente mais tarde.'
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    setForgotPasswordEmail(email || '');
    setForgotPasswordSuccess(false);
    setForgotPasswordError(null);
    setIsForgotPasswordOpen(true);
  };

  const closeForgotPasswordModal = () => {
    setIsForgotPasswordOpen(false);
    setForgotPasswordSuccess(false);
    setForgotPasswordError(null);
  };

  return (
    <div className="w-full min-h-screen bg-white text-zinc-900 flex flex-col justify-center items-center px-4 py-12 relative">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Cabeçalho com Logo Aumentada e Nítida */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="inline-block relative w-64 sm:w-72 h-18 sm:h-20 mb-4 transition-transform hover:scale-[1.02]">
            <Image
              src="/brand/logooficial-semfundo.png"
              alt="Marque Sua Hora"
              width={288}
              height={80}
              className="h-16 sm:h-20 w-auto object-contain mx-auto"
              priority
            />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Acesse seu espaço
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-600">
            Gerencie sua agenda, equipe e clientes em um só lugar.
          </p>
        </div>

        {/* Card de Login Fundo Branco Clean */}
        <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-9 shadow-xl shadow-zinc-200/60">
          {sessionExpiredNotice && !error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-800 flex items-start gap-2.5 font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>Sua sessão expirou por segurança. Por favor, faça login novamente para continuar.</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-start gap-2.5 font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={openForgotPasswordModal}
                  className="text-xs text-purple-600 hover:text-purple-700 font-semibold transition-colors cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé do card */}
          <div className="mt-6 pt-6 border-t border-zinc-200/80 text-center text-xs sm:text-sm text-zinc-600">
            Ainda não tem um espaço cadastrado?{' '}
            <Link
              href="/cadastro"
              className="text-purple-600 hover:text-purple-700 font-bold underline underline-offset-4 transition-colors"
            >
              Criar conta gratuita
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* MODAL DE RECUPERAÇÃO DE SENHA (SUBSTITUI A PÁGINA ANTIGA) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForgotPasswordModal}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="w-full max-w-md bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10"
            >
              {/* Botão Fechar */}
              <button
                type="button"
                onClick={closeForgotPasswordModal}
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {forgotPasswordSuccess ? (
                /* Estado de Sucesso */
                <div className="text-center py-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-zinc-950 tracking-tight">
                    Instruções Enviadas!
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-xs mx-auto">
                    Se existir uma conta associada ao e-mail{' '}
                    <strong className="text-zinc-900 font-bold">{forgotPasswordEmail}</strong>,
                    enviamos um link com as instruções para redefinir sua senha.
                  </p>
                  <p className="mt-3 text-[11px] text-zinc-400">
                    Verifique também sua pasta de spam ou lixo eletrônico.
                  </p>

                  <button
                    type="button"
                    onClick={closeForgotPasswordModal}
                    className="mt-6 w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    Entendido, voltar ao Login
                  </button>
                </div>
              ) : (
                /* Formulário de Recuperação */
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 shadow-xs">
                    <KeyRound className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-extrabold text-zinc-950 tracking-tight">
                    Recuperação de Senha
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    Informe seu e-mail cadastrado. Enviaremos um link seguro para você criar uma nova senha.
                  </p>

                  {forgotPasswordError && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{forgotPasswordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPasswordSubmit} className="mt-5 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1.5">
                        E-mail Cadastrado
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          required
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                      className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {forgotPasswordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando link...</span>
                        </>
                      ) : (
                        <span>Enviar Link de Recuperação</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={closeForgotPasswordModal}
                      className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors text-center cursor-pointer"
                    >
                      Cancelar e voltar ao login
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
