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
  };
  serviceId: string;
  service: {
    id: string;
    name: string;
    price: number | string;
    durationMinutes: number;
  };
  date: string; // YYYY-MM-DD
  startTime: string; // "14:00"
  endTime: string; // "15:00"
  totalPrice: number | string;
  totalDurationMinutes: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  notes?: string | null;
}

export interface ProfessionalItem {
  id: string;
  name: string;
  color?: string | null;
  phone?: string | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
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

