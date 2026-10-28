export interface ScheduleAppointment {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  professionalId: string;
  professional: {
    id: string;
    name: string;
    color?: string | null;
    avatarUrl?: string | null;
  };
  serviceId: string;
  service: {
    id: string;
    name: string;
    price: number | string;
    durationMinutes: number;
    color?: string | null;
  };
  date: string; // YYYY-MM-DD
  startTime: string; // "14:00"
  endTime: string; // "15:00"
  totalPrice: number | string;
  totalDurationMinutes: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  notes?: string | null;
  depositAmount?: number | string | null;
  depositPaid?: boolean;
  arrivalPhotoUrl?: string | null;
  resultPhotoUrl?: string | null;
  source?: string | null;
  reminder24hSentAt?: string | null;
  additionalServices?: any;
  items?: Array<{
    service?: {
      id: string;
      name: string;
      price: number | string;
      durationMinutes: number;
      color?: string | null;
    };
  }>;
}

export interface ProfessionalItem {
  id: string;
  name: string;
  color?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  color?: string | null;
}

export interface BlockItem {
  id: string;
  tenantId?: string;
  professionalId?: string | null;
  professional?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  date?: string | null;
  dayOfWeek?: number | null;
  startTime: string;
  endTime: string;
  reason: string;
  isPaused?: boolean;
}

export interface FreeGap {
  startTime: string; // "11:30"
  endTime: string;   // "13:30"
  durationMinutes: number; // 120
  label: string; // "2h livres"
}


