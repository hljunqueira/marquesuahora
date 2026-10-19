export type ClientTab = 'ALL' | 'BIRTHDAYS' | 'CHURN' | 'SHIELD';

export interface ClientScheduleItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  totalPrice: number;
  professional?: {
    id: string;
    name: string;
    color: string;
  } | null;
  service?: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  } | null;
  items?: Array<{
    id: string;
    unitPrice: number;
    service: {
      id: string;
      name: string;
      price: number;
    };
  }>;
  arrivalPhotoUrl?: string | null;
  resultPhotoUrl?: string | null;
  notes?: string | null;
}

export interface ClientItem {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
  birthday?: string | null;
  notifyBirthday: boolean;
  packageBalance: number;
  noShowCount: number;
  avgVisitDays?: number | null;
  lastVisitAt?: string | null;
  isBlockedOnline: boolean;
  anamnesis?: any;
  anamnesisToken?: string;
  createdAt: string;
  _count?: {
    schedules: number;
  };
  schedules?: ClientScheduleItem[];
}

export interface ClientMetrics {
  totalClients: number;
  birthdaysThisMonth: number;
  churnRisk: number;
  shieldAlerts: number;
}
