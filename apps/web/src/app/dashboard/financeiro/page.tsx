'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  QrCode,
  Percent,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Phone,
  MessageSquare,
  Receipt,
  Wallet,
  BookOpen,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Scissors,
  Users,
  CalendarDays,
  Zap,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InputMask } from '@/components/ui/InputMask';
import { api } from '@/lib/api';

// ==========================================
// TIPOS E MODELOS CONECTADOS
// ==========================================

export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CREDIT_ACCOUNT';

export interface TransactionItem {
  id: string;
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  clientName?: string;
  professionalName?: string;
  appointmentId?: string;
  serviceId?: string;
  notes?: string;
  status: 'PAID' | 'PENDING';
}

export interface CommissionPayoutItem {
  id: string;
  professionalId: string;
  professionalName: string;
  professionalRole: string;
  percentage: number;
  salesTotal: number;
  payoutAmount: number;
  servicesCount: number;
  status: 'PENDING' | 'PAID';
  paidAt?: string;
  paidMethod?: PaymentMethod;
}

export type CreditAccountStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface CreditAccountItem {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceOrDescription: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: CreditAccountStatus;
  notes?: string;
}

// Entidades conectadas de outros módulos
export interface ConnectedClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalVisits?: number;
}

export interface ConnectedService {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
}

export interface ConnectedAppointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: string;
  professionalName: string;
}

// Categorias Sugeridas
const INCOME_CATEGORIES = [
  'Procedimentos & Serviços',
  'Venda de Produtos & Cosméticos',
  'Sinais PIX Antecipados',
  'Quitação de Crediário',
  'Outras Receitas'
];

const EXPENSE_CATEGORIES = [
  'Repasse de Comissões',
  'Insumos & Produtos de Bancada',
  'Aluguel & Condomínio',
  'Energia, Água & Internet',
  'Marketing & Anúncios',
  'Manutenção & Equipamentos',
  'Taxas Bancárias & Cartão',
  'Outras Despesas'
];

export default function DashboardFinanceiroPage() {
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'COMMISSIONS' | 'CREDIT_ACCOUNT'>('TRANSACTIONS');
  const [period, setPeriod] = useState<'HOJE' | 'ESTA_SEMANA' | 'ESTE_MES' | 'TODOS'>('ESTE_MES');

  // Estado da Loja & Nicho
  const [storeName, setStoreName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_name') || 'Meu Estabelecimento';
    }
    return 'Meu Estabelecimento';
  });
  const [currentNiche, setCurrentNiche] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenant_niche') || 'NAIL_LASH_STUDIO';
    }
    return 'NAIL_LASH_STUDIO';
  });
  const [tenantPlanCode, setTenantPlanCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('marquesuahora_tenant_plan_code') || 'VIP_PRO';
    }
    return 'VIP_PRO';
  });

  // 1. Fluxo de Caixa (Lançamentos)
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Repasses de Comissão
  const [commissions, setCommissions] = useState<CommissionPayoutItem[]>([]);

  // 3. Crediário de Cliente (Opcional)
  const [isCreditEnabled, setIsCreditEnabled] = useState(false);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccountItem[]>([]);

  // Entidades Conectadas
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);
  const [connectedServices, setConnectedServices] = useState<ConnectedService[]>([]);
  const [connectedAppointments, setConnectedAppointments] = useState<ConnectedAppointment[]>([]);

  // Modais de Transação
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [txDeleteTarget, setTxDeleteTarget] = useState<TransactionItem | null>(null);

  // Modal de Estorno Formal com Justificativa
  const [refundTarget, setRefundTarget] = useState<TransactionItem | null>(null);
  const [refundReason, setRefundReason] = useState('Desistência do cliente ou cancelamento amigável');
  const [isReopenAppointment, setIsReopenAppointment] = useState(false);

  // Form State Transação
  const [txType, setTxType] = useState<TransactionType>('INCOME');
  const [txTitle, setTxTitle] = useState('');
  const [txCategory, setTxCategory] = useState(INCOME_CATEGORIES[0]);
  const [txAmount, setTxAmount] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>('PIX');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txClient, setTxClient] = useState('');
  const [txProfessional, setTxProfessional] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Modais de Crediário
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<CreditAccountItem | null>(null);
  const [creditDeleteTarget, setCreditDeleteTarget] = useState<CreditAccountItem | null>(null);

  // Modal de Pagamento de Crediário (Baixa)
  const [payingCreditTarget, setPayingCreditTarget] = useState<CreditAccountItem | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentMethodForCredit, setPaymentMethodForCredit] = useState<PaymentMethod>('PIX');

  // Form State Crediário
  const [creditClientName, setCreditClientName] = useState('');
  const [creditClientPhone, setCreditClientPhone] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [creditTotalAmount, setCreditTotalAmount] = useState('');
  const [creditDueDate, setCreditDueDate] = useState('');
  const [creditNotes, setCreditNotes] = useState('');

  // Modal de Confirmação de Repasse
  const [payoutTarget, setPayoutTarget] = useState<CommissionPayoutItem | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>('PIX');

  // Toast Feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // CARREGAMENTO E SINCRONIZAÇÃO EM TEMPO REAL
  // ==========================================

  const [loading, setLoading] = useState(true);

  const loadAllConnectedData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [finRes, commRes, tenantRes, clientsRes, servicesRes, schedulesRes, creditRes] = await Promise.all([
        api.get('/financial').catch(() => ({ data: { transactions: [] } })),
        api.get('/financial/commissions').catch(() => ({ data: [] })),
        api.get('/tenants/me').catch(() => ({ data: null })),
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/services').catch(() => ({ data: [] })),
        api.get('/schedules').catch(() => ({ data: [] })),
        api.get('/financial/credit-accounts').catch(() => ({ data: { accounts: [] } }))
      ]);

      if (tenantRes.data) {
        setStoreName(tenantRes.data.name || 'Meu Estabelecimento');
        setCurrentNiche(tenantRes.data.niche || 'NAIL_LASH_STUDIO');
        setTenantPlanCode(tenantRes.data.plan?.code || 'VIP_PRO');
        if (tenantRes.data.name) localStorage.setItem('tenant_name', tenantRes.data.name);
        if (tenantRes.data.niche) localStorage.setItem('tenant_niche', tenantRes.data.niche);
        if (tenantRes.data.plan?.code) localStorage.setItem('marquesuahora_tenant_plan_code', tenantRes.data.plan.code);
        if (tenantRes.data.plan?.name) localStorage.setItem('marquesuahora_tenant_plan_name', tenantRes.data.plan.name);
      }

      setTransactions(finRes.data?.transactions || []);
      setCommissions(Array.isArray(commRes.data) ? commRes.data : []);

      if (Array.isArray(clientsRes.data)) {
        setConnectedClients(
          clientsRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            email: c.email,
            totalVisits: c._count?.schedules || 0
          }))
        );
      } else {
        setConnectedClients([]);
      }

      if (Array.isArray(servicesRes.data)) {
        setConnectedServices(
          servicesRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.category?.name || 'Serviços',
            durationMinutes: s.durationMinutes || 45,
            price: Number(s.price) || 0
          }))
        );
      } else {
        setConnectedServices([]);
      }

      if (Array.isArray(schedulesRes.data)) {
        setConnectedAppointments(
          schedulesRes.data.map((sch: any) => ({
            id: sch.id,
            clientName: sch.client?.name || 'Cliente',
            clientPhone: sch.client?.phone || '',
            serviceName: sch.service?.name || 'Serviço',
            date: sch.date ? sch.date.slice(0, 10) : '',
            startTime: sch.startTime || '',
            endTime: sch.endTime || '',
            totalPrice: Number(sch.totalPrice) || 0,
            depositAmount: 0,
            depositPaid: false,
            status: sch.status,
            professionalName: sch.professional?.name || ''
          }))
        );
      } else {
        setConnectedAppointments([]);
      }

      // Crediário vindo da API real
      const accountsList: CreditAccountItem[] = Array.isArray(creditRes.data?.accounts) ? creditRes.data.accounts : [];
      setCreditAccounts(accountsList);

      const savedPref = typeof window !== 'undefined' ? localStorage.getItem('marquesuahora_credit_enabled') : null;
      if (savedPref !== null) {
        setIsCreditEnabled(savedPref === 'true');
      } else if (accountsList.length > 0) {
        setIsCreditEnabled(true);
      }
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const notifyFinancialSync = () => {
    window.dispatchEvent(new CustomEvent('marquesuahora_financial_sync'));
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    loadAllConnectedData();

    // 1. Polling silencioso a cada 30 segundos se visível
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAllConnectedData(true);
      }
    }, 30000);

    // 2. Foco da janela e alternância de abas
    const handleFocus = () => loadAllConnectedData(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAllConnectedData(true);
      }
    };

    // 3. Sincronização entre abas e componentes
    const handleFinancialSync = () => loadAllConnectedData(true);
    const handleStorage = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key.includes('financial') ||
        e.key.includes('transactions') ||
        e.key.includes('credit') ||
        e.key.includes('appointments')
      ) {
        loadAllConnectedData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('marquesuahora_financial_sync', handleFinancialSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('marquesuahora_financial_sync', handleFinancialSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleToggleCreditEnabled = () => {
    const nextVal = !isCreditEnabled;
    setIsCreditEnabled(nextVal);
    localStorage.setItem('marquesuahora_credit_enabled', String(nextVal));
    notifyFinancialSync();
    showToast(nextVal ? 'Módulo de Crediário Ativado com Sucesso!' : 'Crediário desativado.');
  };

  // ==========================================
  // CÁLCULOS E TOTAIS DINÂMICOS (KPIs)
  // ==========================================
  const summary = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        incomeTotal += tx.amount;
      } else {
        expenseTotal += tx.amount;
      }
    });

    const pendingCommissionsTotal = commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((acc, curr) => acc + curr.payoutAmount, 0);

    const netProfit = incomeTotal - expenseTotal;
    const margin = incomeTotal > 0 ? ((netProfit / incomeTotal) * 100).toFixed(1) : '0';

    return {
      incomeTotal,
      expenseTotal,
      pendingCommissionsTotal,
      netProfit,
      margin
    };
  }, [transactions, commissions]);

  // Total do Crediário Pendente
  const creditSummary = useMemo(() => {
    const totalDue = creditAccounts.reduce((acc, c) => acc + (c.status !== 'PAID' ? c.remainingAmount : 0), 0);
    const activeCount = creditAccounts.filter((c) => c.status !== 'PAID').length;
    return { totalDue, activeCount };
  }, [creditAccounts]);

  // ==========================================
  // AJUSTE RÁPIDO DE VALORES (+ / - EM TEMPO REAL)
  // ==========================================
  const handleQuickAdjustAmount = async (txId: string, delta: number) => {
    const target = transactions.find((t) => t.id === txId);
    if (!target) return;

    const newAmount = Math.max(0, target.amount + delta);
    try {
      await api.put(`/financial/${txId}`, {
        amount: newAmount
      });
      notifyFinancialSync();
      await loadAllConnectedData(true);
      showToast(
        `Valor atualizado para R$ ${newAmount.toFixed(2).replace('.', ',')} (${delta > 0 ? '+' : ''}R$ ${delta})`
      );
    } catch {
      showToast('Erro ao ajustar valor do lançamento no caixa.');
    }
  };

  // Conciliar Agendamentos Hoje em 1 Clique
  const handleReconcileAppointmentsToday = async () => {
    let importedCount = 0;
    const currentTxs = [...transactions];

    for (const app of connectedAppointments) {
      const alreadyLogged = currentTxs.some(
        (t) => t.id === `tx-app-${app.id}` || (t.title.includes(app.serviceName) && t.clientName === app.clientName)
      );

      if (!alreadyLogged && (app.status === 'COMPLETED' || app.depositPaid)) {
        const amountToLog = app.status === 'COMPLETED' ? app.totalPrice : app.depositAmount;
        if (amountToLog > 0) {
          try {
            await api.post('/financial', {
              type: 'INCOME',
              title: `Atendimento: ${app.serviceName} - ${app.clientName}`,
              category: 'Procedimentos & Serviços',
              amount: amountToLog,
              paymentMethod: app.depositPaid ? 'PIX' : 'CREDIT_CARD',
              paidAt: app.date || new Date().toISOString().slice(0, 10)
            });
            importedCount++;
          } catch {
            // Ignora duplicados ou erro individual
          }
        }
      }
    }

    if (importedCount > 0) {
      notifyFinancialSync();
      await loadAllConnectedData(true);
      showToast(`${importedCount} agendamento(s) conciliado(s) e registrado(s) no caixa com sucesso!`);
    } else {
      showToast('Todos os agendamentos confirmados já estão conciliados no caixa.');
    }
  };

  // ==========================================
  // HANDLERS DE TRANSAÇÃO (CRUD)
  // ==========================================
  const handleOpenCreateTx = (type: TransactionType = 'INCOME') => {
    setEditingTx(null);
    setTxType(type);
    setTxTitle('');
    setTxCategory(type === 'INCOME' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setTxAmount('');
    setTxPaymentMethod('PIX');
    setTxDate(new Date().toISOString().slice(0, 10));
    setTxClient('');
    setTxProfessional('');
    setTxNotes('');
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: TransactionItem) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxTitle(tx.title);
    setTxCategory(tx.category);
    setTxAmount(String(tx.amount));
    setTxPaymentMethod(tx.paymentMethod);
    setTxDate(tx.date);
    setTxClient(tx.clientName || '');
    setTxProfessional(tx.professionalName || '');
    setTxNotes(tx.notes || '');
    setIsTxModalOpen(true);
  };

  // Preenchimento Rápido no Modal a partir de Serviço Conectado
  const handleSelectConnectedService = (srv: ConnectedService) => {
    setTxTitle(srv.name);
    setTxCategory('Procedimentos & Serviços');
    setTxAmount(String(srv.price));
  };

  // Preenchimento Rápido no Modal a partir de Agendamento Conectado
  const handleSelectConnectedAppointment = (app: ConnectedAppointment) => {
    setTxTitle(`Atendimento: ${app.serviceName} - ${app.clientName}`);
    setTxCategory('Procedimentos & Serviços');
    setTxClient(app.clientName);
    setTxProfessional(app.professionalName);
    setTxAmount(String(app.totalPrice));
    setTxDate(app.date);
    setTxPaymentMethod(app.depositPaid ? 'PIX' : 'CREDIT_CARD');
  };

  // Delta de Valor no Modal
  const handleModalAmountDelta = (delta: number) => {
    const currentVal = parseFloat(txAmount.replace(',', '.')) || 0;
    const nextVal = Math.max(0, currentVal + delta);
    setTxAmount(String(nextVal));
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(txAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert('Informe um valor monetário válido maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingTx) {
        await api.put(`/financial/${editingTx.id}`, {
          type: txType,
          amount: val,
          description: txTitle,
          category: txCategory,
          paymentMethod: txPaymentMethod,
          paidAt: txDate
        });
        showToast('Lançamento atualizado no caixa com sucesso!');
      } else {
        await api.post('/financial', {
          type: txType,
          amount: val,
          description: txTitle,
          category: txCategory,
          paymentMethod: txPaymentMethod,
          paidAt: txDate
        });
        showToast('Lançamento adicionado ao caixa!');
      }

      setIsTxModalOpen(false);
      notifyFinancialSync();
      await loadAllConnectedData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar lançamento no caixa.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTx = async () => {
    if (!txDeleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/financial/${txDeleteTarget.id}`);
      setTxDeleteTarget(null);
      showToast('Lançamento removido do caixa com sucesso.');
      notifyFinancialSync();
      await loadAllConnectedData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao remover lançamento.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!refundTarget) return;

    const refundAmount = refundTarget.amount;
    const today = new Date().toISOString().slice(0, 10);

    try {
      setIsSubmitting(true);
      await api.post('/financial', {
        type: 'EXPENSE',
        amount: refundAmount,
        description: `Estorno: ${refundTarget.title} (Motivo: ${refundReason})`,
        category: 'Outras Despesas',
        paymentMethod: refundTarget.paymentMethod,
        paidAt: today
      });

      // Se solicitado reabrir o agendamento na agenda
      if (isReopenAppointment && refundTarget.appointmentId) {
        try {
          await api.put(`/schedules/${refundTarget.appointmentId}`, {
            status: 'CONFIRMED'
          });
        } catch {
          // ignore
        }
      }

      showToast(`Estorno de R$ ${refundAmount.toFixed(2).replace('.', ',')} lançado com sucesso.`);
      setRefundTarget(null);
      setRefundReason('Desistência do cliente ou cancelamento amigável');
      setIsReopenAppointment(false);
      notifyFinancialSync();
      await loadAllConnectedData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao registrar estorno no caixa.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS DE REPASSE DE COMISSÃO
  // ==========================================
  const handleOpenPayout = (c: CommissionPayoutItem) => {
    setPayoutTarget(c);
    setPayoutMethod('PIX');
  };

  const handleConfirmPayout = async () => {
    if (!payoutTarget) return;

    try {
      setIsSubmitting(true);
      await api.post('/financial', {
        type: 'EXPENSE',
        amount: payoutTarget.payoutAmount,
        description: `Repasse de Comissão - ${payoutTarget.professionalName}`,
        category: 'Repasse de Comissões',
        paymentMethod: payoutMethod,
        professionalId: payoutTarget.professionalId,
        paidAt: new Date().toISOString().slice(0, 10)
      });

      setCommissions((prev) =>
        prev.map((c) =>
          c.id === payoutTarget.id
            ? {
                ...c,
                status: 'PAID',
                paidAt: `Hoje às ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                paidMethod: payoutMethod
              }
            : c
        )
      );

      showToast(`Repasse de R$ ${payoutTarget.payoutAmount.toFixed(2)} efetuado para ${payoutTarget.professionalName}!`);
      setPayoutTarget(null);
      notifyFinancialSync();
      await loadAllConnectedData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao registrar repasse de comissão.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoPayout = async (c: CommissionPayoutItem) => {
    setCommissions((prev) =>
      prev.map((item) =>
        item.id === c.id ? { ...item, status: 'PENDING', paidAt: undefined, paidMethod: undefined } : item
      )
    );
    showToast(`Repasse de ${c.professionalName} reaberto.`);
    notifyFinancialSync();
  };

  // ==========================================
  // HANDLERS DO CREDIÁRIO DE CLIENTES
  // ==========================================
  const handleOpenCreateCredit = () => {
    setEditingCredit(null);
    setCreditClientName('');
    setCreditClientPhone('');
    setCreditDescription('');
    setCreditTotalAmount('');
    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);
    setCreditDueDate(in15Days.toISOString().slice(0, 10));
    setCreditNotes('');
    setIsCreditModalOpen(true);
  };

  const handleSelectCreditClient = (cli: ConnectedClient) => {
    setCreditClientName(cli.name);
    setCreditClientPhone(cli.phone);
  };

  const handleSelectCreditService = (srv: ConnectedService) => {
    setCreditDescription(srv.name);
    setCreditTotalAmount(String(srv.price));
  };

  const handleOpenEditCredit = (item: CreditAccountItem) => {
    setEditingCredit(item);
    setCreditClientName(item.clientName);
    setCreditClientPhone(item.clientPhone);
    setCreditDescription(item.serviceOrDescription);
    setCreditTotalAmount(String(item.totalAmount));
    setCreditDueDate(item.dueDate);
    setCreditNotes(item.notes || '');
    setIsCreditModalOpen(true);
  };

  const handleSaveCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalVal = parseFloat(creditTotalAmount.replace(',', '.'));
    if (isNaN(totalVal) || totalVal <= 0) {
      alert('Informe um valor de crédito válido maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCredit) {
        await api.put(`/financial/credit-accounts/${editingCredit.id}`, {
          clientName: creditClientName,
          clientPhone: creditClientPhone,
          serviceOrDescription: creditDescription,
          totalAmount: totalVal,
          dueDate: creditDueDate,
          notes: creditNotes.trim() || undefined
        });
        showToast('Conta de crediário atualizada com sucesso!');
      } else {
        await api.post('/financial/credit-accounts', {
          clientName: creditClientName,
          clientPhone: creditClientPhone,
          serviceOrDescription: creditDescription,
          totalAmount: totalVal,
          dueDate: creditDueDate,
          notes: creditNotes.trim() || undefined
        });
        showToast(`Conta de crediário aberta para ${creditClientName}!`);
      }

      setIsCreditModalOpen(false);
      notifyFinancialSync();
      await loadAllConnectedData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar conta no crediário.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir Modal de Pagamento de Crediário (Baixa)
  const handleOpenPayCredit = (item: CreditAccountItem) => {
    setPayingCreditTarget(item);
    setPaymentAmountInput(String(item.remainingAmount));
    setPaymentMethodForCredit('PIX');
  };

  const handleConfirmPayCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCreditTarget) return;

    const paidVal = parseFloat(paymentAmountInput.replace(',', '.'));
    if (isNaN(paidVal) || paidVal <= 0) {
      alert('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/financial/credit-accounts/${payingCreditTarget.id}/pay`, {
        amount: paidVal,
        paymentMethod: paymentMethodForCredit
      });

      showToast(`Pagamento de R$ ${paidVal.toFixed(2)} registrado e lançado no caixa com sucesso!`);
      setPayingCreditTarget(null);
      notifyFinancialSync();
      await loadAllConnectedData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao registrar pagamento do crediário.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCredit = async () => {
    if (!creditDeleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/financial/credit-accounts/${creditDeleteTarget.id}`);
      setCreditDeleteTarget(null);
      showToast('Conta removida do crediário.');
      notifyFinancialSync();
      await loadAllConnectedData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao excluir conta do crediário.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtragem de Transações
  const filteredTransactions = transactions.filter((t) => {
    const matchesType = typeFilter === 'ALL' ? true : t.type === typeFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.clientName && t.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.professionalName && t.professionalName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Toast Notifier */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700"
          >
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar: Abas e Período */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Abas */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'TRANSACTIONS'
                ? 'btn-primary-tenant shadow-xs'
                : 'text-slate-600 hover:text-tenant-primary hover:bg-tenant-light'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Fluxo de Caixa & Extrato</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMMISSIONS')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'COMMISSIONS'
                ? 'btn-primary-tenant shadow-xs'
                : 'text-slate-600 hover:text-tenant-primary hover:bg-tenant-light'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Repasse de Comissões</span>
            {summary.pendingCommissionsTotal > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREDIT_ACCOUNT')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CREDIT_ACCOUNT'
                ? 'btn-primary-tenant shadow-xs'
                : 'text-slate-600 hover:text-tenant-primary hover:bg-tenant-light'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Crediário de Clientes</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                isCreditEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isCreditEnabled ? 'Ativo' : 'Opcional'}
            </span>
          </button>
        </div>

        {/* Seletor de Período */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80 text-[11px] font-semibold self-end sm:self-auto">
          {[
            { id: 'HOJE', label: 'Hoje' },
            { id: 'ESTA_SEMANA', label: 'Esta Semana' },
            { id: 'ESTE_MES', label: 'Este Mês' },
            { id: 'TODOS', label: 'Todos' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                period === p.id
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>


      {/* Grid de Cards de Métricas Financeiras (TODOS COM FUNDO BRANCO PADRONIZADO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas & Faturamento */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Entradas & Faturamento
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-mono font-bold text-slate-900 block">
            R$ {summary.incomeTotal.toFixed(2).replace('.', ',')}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Atendimentos & Vendas</span>
            <span className="font-semibold text-emerald-600">Receitas confirmadas</span>
          </div>
        </div>

        {/* Saídas & Despesas */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saídas & Despesas
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-mono font-bold text-slate-900 block">
            R$ {summary.expenseTotal.toFixed(2).replace('.', ',')}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Custos operacionais</span>
            <span className="font-semibold text-rose-600">Insumos e contas</span>
          </div>
        </div>

        {/* Comissões Pendentes */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Comissões a Repassar
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-mono font-bold text-amber-700 block">
            R$ {summary.pendingCommissionsTotal.toFixed(2).replace('.', ',')}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Repasses pendentes</span>
            <button
              onClick={() => setActiveTab('COMMISSIONS')}
              className="text-purple-600 font-bold hover:underline"
            >
              Ver repasses →
            </button>
          </div>
        </div>

        {/* Lucro Líquido do Espaço (FUNDO BRANCO HARMONIZADO) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lucro Líquido
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                Margem {summary.margin}%
              </span>
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
          </div>
          <span className="text-2xl font-mono font-bold text-slate-900 block">
            R$ {summary.netProfit.toFixed(2).replace('.', ',')}
          </span>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Caixa Livre da Casa</span>
            <span className="font-semibold text-emerald-600">100% conciliado</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          ABA 1: FLUXO DE CAIXA & EXTRATO DE LANÇAMENTOS
          ========================================== */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Ações de Lançamento */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">Todas as Movimentações</option>
                  <option value="INCOME">Apenas Entradas (Receitas)</option>
                  <option value="EXPENSE">Apenas Saídas (Despesas)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenCreateTx('EXPENSE')}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Nova Despesa</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCreateTx('INCOME')}
                className="px-4 py-2 btn-primary-tenant rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Entrada</span>
              </button>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Extrato Consolidado do Caixa</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lançamentos integrados com a agenda, vendas de balcão e crediário. Ajuste valores na hora.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {filteredTransactions.length} registros
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <Wallet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Nenhum lançamento encontrado</h4>
                <p className="text-xs text-slate-500">
                  Cadastre uma entrada de atendimento ou registre uma despesa para alimentar seu fluxo de caixa.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <div
                      key={tx.id}
                      className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {tx.title}
                            </strong>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {tx.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span>{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              {tx.paymentMethod === 'PIX'
                                ? 'PIX'
                                : tx.paymentMethod === 'CREDIT_CARD'
                                ? 'Cartão de Crédito'
                                : tx.paymentMethod === 'DEBIT_CARD'
                                ? 'Cartão de Débito'
                                : tx.paymentMethod === 'CASH'
                                ? 'Dinheiro'
                                : 'Crediário'}
                            </span>
                            {tx.clientName && (
                              <>
                                <span>•</span>
                                <span className="text-purple-700 font-medium">Cliente: {tx.clientName}</span>
                              </>
                            )}
                            {tx.professionalName && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600">Por: {tx.professionalName}</span>
                              </>
                            )}
                            {tx.notes && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400 italic truncate max-w-xs">{tx.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controles de Valor com Botões de Aumentar / Diminuir em Tempo Real */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                        {/* Stepper Rápido (- R$ 10 / + R$ 10) */}
                        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustAmount(tx.id, -10)}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                            title="Diminuir R$ 10 do valor"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span
                            className={`px-2 text-xs sm:text-sm font-mono font-bold ${
                              isIncome ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isIncome ? '+ ' : '- '}R$ {tx.amount.toFixed(2).replace('.', ',')}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickAdjustAmount(tx.id, 10)}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 flex items-center justify-center font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                            title="Aumentar R$ 10 ao valor"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {tx.type === 'INCOME' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundTarget(tx);
                                setRefundReason('Desistência do cliente ou cancelamento amigável');
                                setIsReopenAppointment(false);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Estornar lançamento (reverter com justificativa)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditTx(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTxDeleteTarget(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          ABA 2: REPASSE AUTOMÁTICO DE COMISSÕES
          ========================================== */}
      {activeTab === 'COMMISSIONS' && (
        <div className="space-y-4">
          {(tenantPlanCode === 'FREE' || tenantPlanCode === 'SOLO') && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-tenant-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Comissões & Rateio Automático para Equipes
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase tracking-wider">
                      A partir do Equipe Pro
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Você está no plano <strong>{tenantPlanCode === 'FREE' ? 'Plano Gratuito' : 'Profissional Solo'}</strong>. 
                    O rateio automático de comissões por colaborador e dedução direta do caixa com relatórios detalhados é liberado nos planos <strong>Equipe Pro</strong> e <strong>Império VIP</strong>.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/planos"
                className="shrink-0 px-4 py-2.5 btn-primary-tenant rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
              >
                <span>Conhecer Planos</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Repasse de Comissões por Profissional
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cálculo automático sobre os atendimentos da equipe cadastrada em{' '}
                  <strong className="text-purple-700">{storeName}</strong>. Ao efetuar repasse, a despesa entra no caixa e diminui o lucro líquido na hora.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Total pendente:</span>
                <span className="text-sm font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/60">
                  R$ {summary.pendingCommissionsTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {commissions.map((comm) => {
                const isPaid = comm.status === 'PAID';
                return (
                  <div
                    key={comm.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isPaid
                        ? 'bg-slate-50/70 border-slate-200/80 opacity-90'
                        : 'bg-white border-purple-200 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{comm.professionalName}</h4>
                          <span className="text-[11px] font-semibold text-purple-700 block">
                            {comm.professionalRole}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'Repasse Efetuado' : 'Pendente'}
                        </span>
                      </div>

                      <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Faturamento Bruto:</span>
                          <span className="font-mono font-bold text-slate-900">
                            R$ {comm.salesTotal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Taxa de Repasse:</span>
                          <span className="font-bold text-purple-700">{comm.percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Atendimentos Concluídos:</span>
                          <span className="font-semibold text-slate-800">{comm.servicesCount} serviços</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">Valor do Repasse:</span>
                          <span className="font-mono font-bold text-base text-purple-700">
                            R$ {comm.payoutAmount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      {isPaid && (
                        <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pago via {comm.paidMethod} ({comm.paidAt})</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isPaid ? (
                        <button
                          type="button"
                          onClick={() => handleUndoPayout(comm)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reabrir Repasse (Estornar)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPayout(comm)}
                          className="w-full py-2.5 btn-primary-tenant rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                          <span>Efetuar Repasse de Comissão</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          ABA 3: CREDIÁRIO DE CLIENTES (OPCIONAL)
          ========================================== */}
      {activeTab === 'CREDIT_ACCOUNT' && (
        <div className="space-y-4">
          {/* Card de Configuração e Ativação do Crediário */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Crediário & Contas de Clientes de Confiança
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase tracking-wider">
                  Recurso Opcional
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Permite registrar valores pendentes para clientes frequentes que pagam quinzenalmente ou no final
                do mês, com controle de quitação e cobrança no WhatsApp.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleCreditEnabled}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCreditEnabled
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                }`}
              >
                {isCreditEnabled ? 'Desativar Crediário' : 'Ativar Crediário'}
              </button>

              {isCreditEnabled && (
                <button
                  type="button"
                  onClick={handleOpenCreateCredit}
                  className="px-4 py-2 btn-primary-tenant rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Conta no Crediário</span>
                </button>
              )}
            </div>
          </div>

          {!isCreditEnabled ? (
            <div className="p-12 rounded-3xl bg-white border border-dashed border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-tenant-light text-tenant-primary flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">O Crediário está desativado no momento</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Se o seu estabelecimento permite que clientes de confiança façam procedimentos para pagar depois
                (na quinzena ou fim de mês), clique no botão acima para ativar.
              </p>
              <button
                type="button"
                onClick={handleToggleCreditEnabled}
                className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Habilitar Crediário Agora
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* KPIs do Crediário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Saldo Total a Receber
                  </span>
                  <span className="text-xl font-mono font-bold text-amber-700 block">
                    R$ {creditSummary.totalDue.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[11px] text-slate-400">Em haver de clientes</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Contas Ativas
                  </span>
                  <span className="text-xl font-mono font-bold text-slate-900 block">
                    {creditSummary.activeCount} clientes
                  </span>
                  <span className="text-[11px] text-slate-400">Com saldo pendente</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Controle de Inadimplência
                  </span>
                  <span className="text-xl font-mono font-bold text-emerald-600 block">
                    Lembretes WhatsApp
                  </span>
                  <span className="text-[11px] text-slate-400">Cobrança amigável em 1 clique</span>
                </div>
              </div>

              {/* Tabela de Contas de Crediário */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Clientes com Contas no Crediário
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Monitore débitos, dê baixas parciais ou totais e cobre pelo WhatsApp com mensagem pronta.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    {creditAccounts.length} contas
                  </span>
                </div>

                {creditAccounts.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <p className="text-xs text-slate-500">Nenhuma conta em aberto no crediário.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {creditAccounts.map((account) => {
                      const isPaid = account.status === 'PAID';
                      const isOverdue =
                        account.status !== 'PAID' && new Date(account.dueDate) < new Date();

                      // Mensagem personalizada de cobrança amigável no WhatsApp
                      const phoneClean = account.clientPhone.replace(/\D/g, '');
                      const whatsappText = encodeURIComponent(
                        `Olá ${account.clientName}, tudo bem? Aqui é do ${storeName}. Passando para lembrar da conta pendente referente a "${account.serviceOrDescription}" no valor de R$ ${account.remainingAmount.toFixed(2).replace('.', ',')}. Podemos te enviar a chave PIX para quitação? Obrigado!`
                      );
                      const whatsappUrl = `https://wa.me/55${phoneClean}?text=${whatsappText}`;

                      return (
                        <div
                          key={account.id}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-sm font-bold text-slate-900">
                                {account.clientName}
                              </strong>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isOverdue
                                    ? 'bg-rose-100 text-rose-800'
                                    : account.status === 'PARTIAL'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {isPaid
                                  ? 'Quitado'
                                  : isOverdue
                                  ? 'Vencido'
                                  : account.status === 'PARTIAL'
                                  ? 'Parcial'
                                  : 'Em Aberto'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-medium">
                              {account.serviceOrDescription}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {account.clientPhone}
                              </span>
                              <span>•</span>
                              <span>
                                Vencimento:{' '}
                                <strong className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                  {new Date(account.dueDate).toLocaleDateString('pt-BR')}
                                </strong>
                              </span>
                              {account.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic truncate max-w-xs">{account.notes}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                            <div>
                              <span className="text-xs text-slate-400 block sm:text-right">
                                Restante:
                              </span>
                              <span
                                className={`text-base font-mono font-bold block sm:text-right ${
                                  isPaid ? 'text-emerald-600' : 'text-amber-700'
                                }`}
                              >
                                R$ {account.remainingAmount.toFixed(2).replace('.', ',')}
                              </span>
                              <span className="text-[10px] text-slate-400 block sm:text-right">
                                Total: R$ {account.totalAmount.toFixed(2).replace('.', ',')} (Pago: R${' '}
                                {account.paidAmount.toFixed(2).replace('.', ',')})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              {!isPaid && (
                                <>
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                    title="Enviar lembrete amigável no WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Cobrar</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenPayCredit(account)}
                                    className="px-3 py-1 btn-primary-tenant rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                  >
                                    Dar Baixa
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditCredit(account)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Editar conta"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setCreditDeleteTarget(account)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remover conta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODAL DE LANÇAMENTO (ENTRADA / DESPESA)
          COM PREENCHIMENTO RÁPIDO DE SERVIÇOS & AGENDAMENTOS
          ========================================== */}
      <AnimatePresence>
        {isTxModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTxModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsTxModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-slate-900">
                {editingTx
                  ? 'Editar Lançamento'
                  : txType === 'INCOME'
                  ? 'Registrar Entrada (Receita)'
                  : 'Registrar Saída (Despesa)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Alimente o fluxo de caixa com registros transparentes e conectados ao CRM e equipe.
              </p>

              {/* Atalhos Rápidos de Conexão com Agenda & Catálogo */}
              {txType === 'INCOME' && !editingTx && (
                <div className="mt-4 p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-purple-900 block">
                    Preencher Rápido Conectado:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Seletor de Serviço */}
                    <div>
                      <label className="text-[10px] font-semibold text-purple-800 block mb-0.5">
                        A partir de Serviço:
                      </label>
                      <select
                        onChange={(e) => {
                          const srv = connectedServices.find((s) => s.id === e.target.value);
                          if (srv) handleSelectConnectedService(srv);
                        }}
                        defaultValue=""
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-xl outline-none font-medium text-slate-700"
                      >
                        <option value="" disabled>
                          Escolha um serviço...
                        </option>
                        {connectedServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (R$ {s.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seletor de Agendamento */}
                    <div>
                      <label className="text-[10px] font-semibold text-purple-800 block mb-0.5">
                        A partir de Agendamento:
                      </label>
                      <select
                        onChange={(e) => {
                          const app = connectedAppointments.find((a) => a.id === e.target.value);
                          if (app) handleSelectConnectedAppointment(app);
                        }}
                        defaultValue=""
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-xl outline-none font-medium text-slate-700"
                      >
                        <option value="" disabled>
                          Escolha da agenda...
                        </option>
                        {connectedAppointments.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.clientName} - {a.serviceName} (R$ {a.totalPrice.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveTx} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Seletor Tipo Entrada vs Saída (2 colunas) */}
                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tipo de Movimentação *
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setTxType('INCOME');
                          setTxCategory(INCOME_CATEGORIES[0]);
                        }}
                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          txType === 'INCOME'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Entrada (Receita)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTxType('EXPENSE');
                          setTxCategory(EXPENSE_CATEGORIES[0]);
                        }}
                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          txType === 'EXPENSE'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Saída (Despesa)
                      </button>
                    </div>
                  </div>

                  {/* Data do Lançamento (1 coluna) */}
                  <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold"
                    />
                  </div>

                  {/* Forma de Pagamento (1 coluna) */}
                  <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Forma de Pagamento *
                    </label>
                    <select
                      value={txPaymentMethod}
                      onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
                    >
                      <option value="PIX">PIX</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                      <option value="DEBIT_CARD">Cartão de Débito</option>
                      <option value="CASH">Dinheiro</option>
                      {isCreditEnabled && <option value="CREDIT_ACCOUNT">Crediário</option>}
                    </select>
                  </div>

                  {/* Descrição do Lançamento (2 colunas) */}
                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Descrição do Lançamento *
                    </label>
                    <input
                      type="text"
                      required
                      value={txTitle}
                      onChange={(e) => setTxTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-semibold"
                    />
                  </div>

                  {/* Categoria (1 coluna) */}
                  <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Categoria *
                    </label>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
                    >
                      {(txType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Valor (R$) com steppers inline (1 coluna) */}
                  <div className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Valor (R$) *
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleModalAmountDelta(-10)}
                          className="px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-bold text-slate-600"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModalAmountDelta(10)}
                          className="px-1 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-[9px] font-bold text-purple-700"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModalAmountDelta(50)}
                          className="px-1 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-[9px] font-bold text-purple-700"
                        >
                          +50
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      required
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-mono font-bold text-sm"
                    />
                  </div>

                  {/* Cliente Conectado CRM (2 colunas) */}
                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cliente Conectado (CRM)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) setTxClient(e.target.value);
                        }}
                        defaultValue=""
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                      >
                        <option value="">Selecionar do CRM...</option>
                        {connectedClients.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={txClient}
                        onChange={(e) => setTxClient(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Profissional da Equipe (2 colunas) */}
                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Profissional da Equipe
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) setTxProfessional(e.target.value);
                        }}
                        defaultValue=""
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                      >
                        <option value="">Selecionar da Equipe...</option>
                        {commissions.map((p) => (
                          <option key={p.id} value={p.professionalName}>
                            {p.professionalName} ({p.percentage}%)
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={txProfessional}
                        onChange={(e) => setTxProfessional(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Observações / Notas (4 colunas) */}
                  <div className="lg:col-span-4">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Observações & Notas Adicionais (Opcional)
                    </label>
                    <input
                      type="text"
                      value={txNotes}
                      onChange={(e) => setTxNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingTx ? 'Salvar Alterações' : 'Salvar Lançamento'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE CONFIRMAÇÃO DE REPASSE
          ========================================== */}
      <AnimatePresence>
        {payoutTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPayoutTarget(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100 space-y-4"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto font-bold">
                  <Percent className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Confirmar Repasse</h3>
                <p className="text-xs text-slate-500">
                  Você está efetuando o pagamento de comissão para{' '}
                  <strong className="text-purple-700">{payoutTarget.professionalName}</strong>.
                </p>
              </div>

              <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-1 text-center">
                <span className="text-[11px] text-purple-700 font-medium">Valor Total a Transferir:</span>
                <span className="text-2xl font-mono font-bold text-purple-900 block">
                  R$ {payoutTarget.payoutAmount.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[10px] text-purple-600">
                  {payoutTarget.percentage}% de R$ {payoutTarget.salesTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Método de Transferência do Repasse:
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
                >
                  <option value="PIX">Chave PIX do Colaborador</option>
                  <option value="DEBIT_CARD">Transferência Bancária / TED</option>
                  <option value="CASH">Dinheiro em Espécie (Caixa Físico)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmPayout}
                  className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar e Baixar no Caixa</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE CADASTRO / EDIÇÃO DE CREDIÁRIO
          ========================================== */}
      <AnimatePresence>
        {isCreditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreditModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsCreditModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-display font-bold text-slate-900">
                {editingCredit ? 'Editar Conta do Crediário' : 'Nova Conta no Crediário'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vincule um cliente do CRM e selecione o serviço para preenchimento imediato.
              </p>

              {/* Atalhos Rápidos para Crediário */}
              {!editingCredit && (
                <div className="mt-4 p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-purple-900 block">
                    Vincular Cliente & Serviço do Catálogo:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-purple-800 block mb-0.5">
                        Cliente do CRM:
                      </label>
                      <select
                        onChange={(e) => {
                          const cli = connectedClients.find((c) => c.id === e.target.value);
                          if (cli) handleSelectCreditClient(cli);
                        }}
                        defaultValue=""
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-xl outline-none font-medium text-slate-700"
                      >
                        <option value="" disabled>
                          Escolha um cliente...
                        </option>
                        {connectedClients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-purple-800 block mb-0.5">
                        Serviço do Catálogo:
                      </label>
                      <select
                        onChange={(e) => {
                          const srv = connectedServices.find((s) => s.id === e.target.value);
                          if (srv) handleSelectCreditService(srv);
                        }}
                        defaultValue=""
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-xl outline-none font-medium text-slate-700"
                      >
                        <option value="" disabled>
                          Escolha um serviço...
                        </option>
                        {connectedServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (R$ {s.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveCredit} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      value={creditClientName}
                      onChange={(e) => setCreditClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-semibold"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      WhatsApp do Cliente *
                    </label>
                    <InputMask
                      mask="phone"
                      required
                      value={creditClientPhone}
                      onChangeValue={(formatted: string) => setCreditClientPhone(formatted)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-mono font-semibold"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Procedimento ou Descrição da Dívida *
                    </label>
                    <input
                      type="text"
                      required
                      value={creditDescription}
                      onChange={(e) => setCreditDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-semibold"
                    />
                  </div>

                  <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Valor Total (R$) *
                    </label>
                    <input
                      type="text"
                      required
                      value={creditTotalAmount}
                      onChange={(e) => setCreditTotalAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-mono font-bold"
                    />
                  </div>

                  <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Data de Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold"
                    />
                  </div>

                  <div className="lg:col-span-4">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Observações de Acordo (Opcional)
                    </label>
                    <input
                      type="text"
                      value={creditNotes}
                      onChange={(e) => setCreditNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 btn-primary-tenant rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingCredit ? 'Salvar Alterações' : 'Criar Conta no Crediário'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE ESTORNO FORMAL COM JUSTIFICATIVA
          ========================================== */}
      <AnimatePresence>
        {refundTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRefundTarget(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-slate-900">
                    Estorno Formal de Lançamento
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gera uma movimentação de saída compensatória e registra o motivo no histórico financeiro.
                  </p>
                </div>
              </div>

              {/* Detalhes da Transação a ser Estornada */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lançamento Original</span>
                  <span className="font-semibold text-slate-800 text-sm block mt-0.5">{refundTarget.title}</span>
                  {refundTarget.clientName && (
                    <span className="text-slate-500 text-[11px] block">Cliente: {refundTarget.clientName}</span>
                  )}
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Valor a Estornar</span>
                  <span className="text-lg font-mono font-bold text-rose-700 block mt-0.5">
                    - R$ {refundTarget.amount.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-slate-400 text-[11px] block font-mono">Data: {refundTarget.date}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Motivo / Justificativa do Estorno *
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 mb-2"
                  >
                    <option value="Desistência do cliente ou cancelamento amigável">Desistência do cliente ou cancelamento amigável</option>
                    <option value="Cobrança duplicada ou valor incorreto">Cobrança duplicada ou valor incorreto</option>
                    <option value="Insatisfação com o serviço / acordo de devolução">Insatisfação com o serviço / acordo de devolução</option>
                    <option value="Impossibilidade de comparecimento do profissional">Impossibilidade de comparecimento do profissional</option>
                    <option value="Outro motivo operacional">Outro motivo operacional</option>
                  </select>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                    required
                  />
                </div>

                {refundTarget.appointmentId && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-purple-900 block">
                        Reabrir horário na agenda?
                      </span>
                      <span className="text-[11px] text-purple-700 block">
                        Libera o slot ou remarca o agendamento associado no calendário.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReopenAppointment(!isReopenAppointment)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isReopenAppointment
                          ? 'bg-brand-purple text-white shadow-2xs'
                          : 'bg-white border border-purple-200 text-purple-700'
                      }`}
                    >
                      {isReopenAppointment ? '✓ Sim, Reabrir' : 'Não'}
                    </button>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundTarget(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmRefund}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirmar Estorno</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE PAGAMENTO / BAIXA DO CREDIÁRIO
          ========================================== */}
      <AnimatePresence>
        {payingCreditTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPayingCreditTarget(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100 space-y-4"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Dar Baixa no Crediário</h3>
                <p className="text-xs text-slate-500">
                  Registrar recebimento de{' '}
                  <strong className="text-slate-800">{payingCreditTarget.clientName}</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Procedimento:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {payingCreditTarget.serviceOrDescription}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total da Conta:</span>
                  <span className="font-mono font-bold">
                    R$ {payingCreditTarget.totalAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Saldo Restante:</span>
                  <span className="font-mono font-bold text-amber-700">
                    R$ {payingCreditTarget.remainingAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmPayCredit} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Valor do Pagamento Recebido (R$) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setPaymentAmountInput(String(payingCreditTarget.remainingAmount))}
                      className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Quitar Tudo
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-600 font-mono font-bold text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Forma de Pagamento Recebida *
                  </label>
                  <select
                    value={paymentMethodForCredit}
                    onChange={(e) => setPaymentMethodForCredit(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
                  >
                    <option value="PIX">PIX</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                    <option value="DEBIT_CARD">Cartão de Débito</option>
                    <option value="CASH">Dinheiro em Espécie</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayingCreditTarget(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirmar Recebimento</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmação de Exclusão de Transação */}
      <ConfirmModal
        isOpen={Boolean(txDeleteTarget)}
        title="Excluir Lançamento do Caixa?"
        description={`Tem certeza que deseja apagar "${txDeleteTarget?.title}" no valor de R$ ${txDeleteTarget?.amount.toFixed(
          2
        )}? Essa ação recalcula os totais do caixa.`}
        confirmLabel="Sim, Excluir"
        isDestructive={true}
        onConfirm={handleDeleteTx}
        onClose={() => setTxDeleteTarget(null)}
      />

      {/* Confirmação de Exclusão de Crediário */}
      <ConfirmModal
        isOpen={Boolean(creditDeleteTarget)}
        title="Remover Conta do Crediário?"
        description={`Tem certeza que deseja apagar a conta de ${creditDeleteTarget?.clientName} referente a "${creditDeleteTarget?.serviceOrDescription}"?`}
        confirmLabel="Sim, Remover"
        isDestructive={true}
        onConfirm={handleDeleteCredit}
        onClose={() => setCreditDeleteTarget(null)}
      />
    </div>
  );
}
