'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ClientItem, ClientMetrics, ClientTab } from '@/components/clients/types';
import { ClientsHeader } from '@/components/clients/ClientsHeader';
import { ClientsTabs } from '@/components/clients/ClientsTabs';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientHistoryModal } from '@/components/clients/ClientHistoryModal';
import { CouponBroadcastModal } from '@/components/marketing/CouponBroadcastModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function DashboardClientesPage() {
  const [activeTab, setActiveTab] = useState<ClientTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClientsCount, setTotalClientsCount] = useState(0);

  const [metrics, setMetrics] = useState<ClientMetrics>({
    totalClients: 0,
    birthdaysThisMonth: 0,
    churnRisk: 0,
    shieldAlerts: 0
  });

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);
  const [deleteTargetClient, setDeleteTargetClient] = useState<ClientItem | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.get('/clients/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Erro ao buscar métricas de clientes:', err);
    }
  }, []);

  const fetchClients = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const res = await api.get('/clients', {
        params: {
          tab: activeTab,
          search: searchTerm || undefined,
          page: currentPage,
          limit: pageSize
        }
      });
      setClients(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalClientsCount(res.data.total ?? res.data.data?.length ?? 0);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      if (!silent) {
        showToast('Erro ao carregar lista de clientes.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeTab, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Revalidação Automática Inteligente (30s, foco na janela e eventos do ecossistema)
  useEffect(() => {
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible') {
        fetchMetrics();
        fetchClients(true);
      }
    };

    const interval = setInterval(handleRevalidate, 30000);
    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleRevalidate);
    window.addEventListener('marquesuahora_agenda_sync', handleRevalidate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleRevalidate);
      window.removeEventListener('marquesuahora_agenda_sync', handleRevalidate);
    };
  }, [fetchMetrics, fetchClients]);

  const handleSaveClient = async (data: Partial<ClientItem>) => {
    if (editingClient) {
      await api.put(`/clients/${editingClient.id}`, data);
      showToast('Cliente atualizado com sucesso!');
    } else {
      await api.post('/clients', data);
      showToast('Novo cliente cadastrado com sucesso!');
    }
    fetchMetrics();
    fetchClients();
    window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
  };

  const handleToggleBlock = async (client: ClientItem) => {
    try {
      const res = await api.patch(`/clients/${client.id}/toggle-block`);
      const isNowBlocked = res.data.isBlockedOnline;
      showToast(
        isNowBlocked
          ? `Agendamento online bloqueado para ${client.name}.`
          : `Agendamento online liberado para ${client.name}.`
      );
      fetchMetrics();
      fetchClients();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch {
      showToast('Erro ao alterar status de bloqueio do cliente.');
    }
  };

  const handleDeleteClient = (client: ClientItem) => {
    setDeleteTargetClient(client);
  };

  const confirmDeleteClient = async () => {
    if (!deleteTargetClient) return;
    try {
      await api.delete(`/clients/${deleteTargetClient.id}`);
      showToast('Cliente removido com sucesso.');
      setDeleteTargetClient(null);
      fetchMetrics();
      fetchClients();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao remover cliente.');
      setDeleteTargetClient(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-purple-600 text-white font-medium text-sm shadow-xl shadow-purple-900/30 animate-in fade-in slide-in-from-bottom-4">
          {toastMessage}
        </div>
      )}

      <ClientsHeader
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        onNewClient={() => {
          setEditingClient(null);
          setIsModalOpen(true);
        }}
        onSendCoupon={() => setIsCouponModalOpen(true)}
        totalCount={metrics.totalClients}
      />

      <ClientsTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
        }}
        metrics={metrics}
      />

      <ClientsTable
        clients={clients}
        loading={loading}
        totalCount={totalClientsCount}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        onViewHistory={(client) => setHistoryClientId(client.id)}
        onEdit={(client) => {
          setEditingClient(client);
          setIsModalOpen(true);
        }}
        onToggleBlock={handleToggleBlock}
        onDelete={handleDeleteClient}
      />

      <ClientModal
        isOpen={isModalOpen}
        client={editingClient}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
      />

      {historyClientId && (
        <ClientHistoryModal
          clientId={historyClientId}
          onClose={() => setHistoryClientId(null)}
        />
      )}

      <CouponBroadcastModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onSuccess={() => {
          fetchMetrics();
          fetchClients();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTargetClient)}
        title="Remover Cliente?"
        description={`Tem certeza que deseja remover "${deleteTargetClient?.name}" da base de clientes? O histórico passado de atendimentos continuará preservado no financeiro.`}
        confirmLabel="Sim, Remover"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={confirmDeleteClient}
        onClose={() => setDeleteTargetClient(null)}
      />
    </div>
  );
}
