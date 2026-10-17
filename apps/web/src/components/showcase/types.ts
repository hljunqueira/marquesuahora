export interface CategoryItem {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  categoryId?: string | null;
  description?: string | null;
  price: number;
  durationMinutes: number;
  serviceType?: string;
  requiresRemovalCheck?: boolean;
  resourceName?: string | null;
}

export interface ProfessionalItem {
  id: string;
  name: string;
  phone?: string | null;
  color?: string | null;
  serviceIds: string[];
}

export interface CourseItem {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  coverUrl?: string | null;
}

export interface TenantShowcase {
  id: string;
  name: string;
  slug: string;
  phone: string;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  niche?: string | null;
  themeTemplate?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  googleReviewUrl?: string | null;
  instagramUrl?: string | null;
  description?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  isOpenNow?: boolean;
  categories: CategoryItem[];
  services: ServiceItem[];
  professionals: ProfessionalItem[];
  courses: CourseItem[];
  galleryPhotos?: string[];
  depositRequired?: boolean;
  depositType?: 'FIXED' | 'PERCENTAGE';
  depositAmount?: number;
  pixKey?: string | null;
  pixKeyType?: string | null;
  pixKeyHolder?: string | null;
}

export interface SlotItem {
  time: string;
  isAvailable: boolean;
  professionalId?: string;
  reason?: string;
}

export interface AvailabilitySlotsResponse {
  date: string;
  isOpen: boolean;
  reason?: string;
  slots: {
    morning: SlotItem[];
    afternoon: SlotItem[];
    night: SlotItem[];
  };
}
