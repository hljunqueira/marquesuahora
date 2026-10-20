'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Palette,
  Clock,
  ShieldCheck,
  Zap,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  CreditCard,
  MessageSquare,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import { invalidateQueries } from '@/lib/queryEvents';
import { TenantSettings, SettingsTab } from '@/components/settings/types';
import { SettingsDataTab } from '@/components/settings/SettingsDataTab';
import { SettingsVisualTab } from '@/components/settings/SettingsVisualTab';
import { SettingsBookingTab } from '@/components/settings/SettingsBookingTab';
import { SettingsAftercareTab } from '@/components/settings/SettingsAftercareTab';
import { SettingsShieldTab } from '@/components/settings/SettingsShieldTab';
import { SettingsAutomationsTab } from '@/components/settings/SettingsAutomationsTab';
import { SettingsNotificationsTab } from '@/components/settings/SettingsNotificationsTab';
import { SettingsWhatsappTab } from '@/components/settings/SettingsWhatsappTab';
import { SettingsPlanTab } from '@/components/settings/SettingsPlanTab';

export default function DashboardConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('DATA');
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSettings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/tenants/me');
      setSettings(res.data);
      if (!silent) setHasChanges(false);
    } catch (err) {
      console.error('Erro ao carregar configurações do estabelecimento:', err);
      if (!silent) showToast('Erro ao carregar configurações.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field: keyof TenantSettings, value: any) => {
    setSettings((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = {
        name: settings.name,
        legalName: settings.legalName,
        documentType: settings.documentType,
        documentNumber: settings.documentNumber,
        niche: settings.niche,
        description: settings.description,
        phone: settings.phone,
        instagramUrl: settings.instagramUrl,
        themeTemplate: settings.themeTemplate,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        logoUrl: settings.logoUrl,
        coverUrl: settings.coverUrl,
        googleReviewUrl: settings.googleReviewUrl,
        npsFeedbackEnabled: settings.npsFeedbackEnabled,
        depositRequired: settings.depositRequired,
        depositType: settings.depositType,
        depositAmount: Number(settings.depositAmount),
        depositOnFirstBooking: settings.depositOnFirstBooking,
        depositFirstBookingType: settings.depositFirstBookingType || 'PERCENTAGE',
        depositFirstBookingValue: Number(settings.depositFirstBookingValue ?? settings.depositFirstBookingPercent ?? 50),
        depositFirstBookingPercent: Number(settings.depositFirstBookingValue ?? settings.depositFirstBookingPercent ?? 50),
        pixKey: settings.pixKey,
        pixKeyType: settings.pixKeyType,
        pixKeyHolder: settings.pixKeyHolder,
        maxNoShowsAllowed: Number(settings.maxNoShowsAllowed),
        churnRecoveryEnabled: settings.churnRecoveryEnabled,
        churnAlertDays: Number(settings.churnAlertDays),
        welcomeMessageEnabled: settings.welcomeMessageEnabled ?? true,
        welcomeMessageCustom: settings.welcomeMessageCustom,
        birthdayMessageEnabled: settings.birthdayMessageEnabled,
        birthdayMessageCustom: settings.birthdayMessageCustom,
        bufferMinutes: Number(settings.bufferMinutes),
        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
        slotIntervalMinutes: Number(settings.slotIntervalMinutes),
        minAdvanceBookingMinutes: Number(settings.minAdvanceBookingMinutes),
        maxAdvanceBookingDays: Number(settings.maxAdvanceBookingDays),
        blockNationalHolidays: settings.blockNationalHolidays ?? true,
        holidayExceptions: settings.holidayExceptions || [],
        addressStreet: settings.addressStreet ? settings.addressStreet.trim() : null,
        addressNumber: settings.addressNumber ? settings.addressNumber.trim() : null,
        addressComplement: settings.addressComplement ? settings.addressComplement.trim() : null,
        addressNeighborhood: settings.addressNeighborhood ? settings.addressNeighborhood.trim() : null,
        addressCity: settings.addressCity ? settings.addressCity.trim() : null,
        addressState: settings.addressState ? settings.addressState.trim() : null,
        addressZip: settings.addressZip ? settings.addressZip.trim() : null
      };

      const res = await api.put('/tenants/me/settings', payload);
      const updated = res.data?.tenant || res.data;
      if (updated) {
        setSettings((prev) => (prev ? { ...prev, ...updated } : updated));
        localStorage.setItem('tenant_name', updated.name);
        if (updated.slug) localStorage.setItem('tenant_slug', updated.slug);
        if (updated.niche) localStorage.setItem('tenant_niche', updated.niche);
        if (updated.primaryColor) localStorage.setItem('tenant_primary_color', updated.primaryColor);
        if (updated.themeTemplate) localStorage.setItem('tenant_theme_template', updated.themeTemplate);
        if (updated.logoUrl !== undefined) {
          if (updated.logoUrl) {
            localStorage.setItem('tenant_logo', updated.logoUrl);
          } else {
            localStorage.removeItem('tenant_logo');
          }
        }
        if (updated.coverUrl !== undefined) {
          if (updated.coverUrl) {
            localStorage.setItem('tenant_cover', updated.coverUrl);
          } else {
            localStorage.removeItem('tenant_cover');
          }
        }
        localStorage.setItem('tenant_data', JSON.stringify(updated));

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('marquesuahora_tenant_sync', { detail: updated }));
        invalidateQueries(['tenant', 'showcase'], updated);
      }
      setHasChanges(false);
      showToast('Configurações salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      const issues = err?.response?.data?.issues;
      let detailedMessage = err?.response?.data?.message || 'Erro ao salvar alterações.';
      if (Array.isArray(issues) && issues.length > 0) {
        detailedMessage = issues.map((i: any) => `${i.field}: ${i.message}`).join(' | ');
      }
      showToast(detailedMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'DATA' as SettingsTab, label: 'Dados & Endereço', icon: Building2 },
    { id: 'VISUAL' as SettingsTab, label: 'Identidade & Vitrine', icon: Palette },
    { id: 'BOOKING' as SettingsTab, label: 'Regras da Agenda', icon: Clock },
    { id: 'AFTERCARE' as SettingsTab, label: 'Cuidados Pós-Atendimento', icon: FileText },
    { id: 'SHIELD' as SettingsTab, label: 'No-Show Shield & PIX', icon: ShieldCheck },
    { id: 'AUTOMATIONS' as SettingsTab, label: 'Automações & Reviews', icon: Zap },
    { id: 'NOTIFICATIONS' as SettingsTab, label: 'Notificações & Mensagens', icon: SlidersHorizontal },
    { id: 'WHATSAPP' as SettingsTab, label: 'WhatsApp (QR Code)', icon: MessageSquare },
    { id: 'PLAN' as SettingsTab, label: 'Plano & Assinatura', icon: CreditCard }
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-slate-200/60 rounded-xl animate-pulse" />
        <div className="h-96 bg-white rounded-2xl animate-pulse border border-slate-200/80" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-12 text-center text-slate-500">
        Estabelecimento não localizado.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-24">
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl font-medium text-sm shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-900/20'
              : 'bg-emerald-600 text-white shadow-emerald-900/20'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configurações do Estabelecimento
          </h1>
          <p className="text-sm text-slate-500">
            Personalize dados comerciais, regras de agendamento e vitrine online
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            hasChanges
              ? 'btn-primary-tenant text-white shadow-md active:scale-95 cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Salvando...' : hasChanges ? 'Salvar Alterações' : 'Salvo'}</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-tenant-primary shadow-xs border border-slate-200/90 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-tenant-primary' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'DATA' && (
        <SettingsDataTab settings={settings} onChange={handleChange} />
      )}
      {activeTab === 'VISUAL' && (
        <SettingsVisualTab settings={settings} onChange={handleChange} />
      )}
      {activeTab === 'BOOKING' && (
        <SettingsBookingTab settings={settings} onChange={handleChange} />
      )}
      {activeTab === 'AFTERCARE' && (
        <SettingsAftercareTab
          initialGuides={settings.aftercareGuides}
          onSaved={(guides) => handleChange('aftercareGuides', guides)}
          showToast={(text, type) => showToast(text, type || 'success')}
        />
      )}
      {activeTab === 'SHIELD' && (
        <SettingsShieldTab settings={settings} onChange={handleChange} />
      )}
      {activeTab === 'AUTOMATIONS' && (
        <SettingsAutomationsTab settings={settings} onChange={handleChange} />
      )}
      {activeTab === 'NOTIFICATIONS' && (
        <SettingsNotificationsTab />
      )}
      {activeTab === 'WHATSAPP' && (
        <SettingsWhatsappTab
          settings={settings}
          onChange={handleChange}
          onNavigateToPlan={() => setActiveTab('PLAN')}
        />
      )}
      {activeTab === 'PLAN' && (
        <SettingsPlanTab settings={settings} onRefresh={fetchSettings} />
      )}

      {/* Floating Save Reminder if changed */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white border border-slate-800 shadow-2xl px-6 py-3.5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-xs text-slate-200 font-medium">
            Você possui alterações não salvas.
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl btn-primary-tenant text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {saving ? 'Salvando...' : 'Salvar Agora'}
          </button>
        </div>
      )}
    </div>
  );
}
