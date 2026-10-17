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

export default function DashboardClientesPage() {
  const [activeTab, setActiveTab] = useState<ClientTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
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
          limit: 100
        }
      });
      setClients(res.data.data || []);
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
  }, [activeTab, searchTerm]);

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

  const handleDeleteClient = async (client: ClientItem) => {
    if (!window.confirm(`Tem certeza que deseja remover ${client.name} da base de clientes?`)) {
      return;
    }

    try {
      await api.delete(`/clients/${client.id}`);
      showToast('Cliente removido com sucesso.');
      fetchMetrics();
      fetchClients();
      window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync'));
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao remover cliente.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-purple-600 text-white font-medium text-sm shadow-xl shadow-purple-900/30 animate-in fade-in slide-in-from-bottom-4">
          {toastMessage}
        </div>
      )}

      <ClientsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onNewClient={() => {
          setEditingClient(null);
          setIsModalOpen(true);
        }}
        onSendCoupon={() => setIsCouponModalOpen(true)}
        totalCount={metrics.totalClients}
      />

      <ClientsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        metrics={metrics}
      />

      <ClientsTable
        clients={clients}
        loading={loading}
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

      <ClientHistoryModal
        clientId={historyClientId}
        onClose={() => setHistoryClientId(null)}
      />

      <CouponBroadcastModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onSuccess={() => {
          fetchMetrics();
          fetchClients();
        }}
      />
    </div>
  );
}
