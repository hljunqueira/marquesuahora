import { z } from 'zod';
import { onlyDigits } from '../utils/masks';

export const businessNiches = [
  'BARBERSHOP',
  'BEAUTY_SALON',
  'AESTHETICS_CLINIC',
  'PERSONAL_TRAINER',
  'NAIL_LASH_STUDIO',
  'OTHER'
] as const;

export type BusinessNiche = (typeof businessNiches)[number];

export const themeTemplates = [
  'PURPLE_GOLD',
  'DARK_OBSIDIAN',
  'ROSE_GOLD',
  'EMERALD_SAGE',
  'MIDNIGHT_BLUE'
] as const;

export type ThemeTemplate = (typeof themeTemplates)[number];

export const onboardingSchema = z.object({
  niche: z.enum(businessNiches).optional().nullable(),
  documentType: z.enum(['CNPJ', 'CPF']).default('CPF'),
  documentNumber: z
    .string()
    .transform((val) => onlyDigits(val))
    .optional()
    .nullable(),
  name: z.string().min(2, 'O nome do estabelecimento é obrigatório.'),
  legalName: z.string().optional().nullable(),
  slug: z
    .string()
    .min(3, 'O link da vitrine deve ter no mínimo 3 caracteres.')
    .regex(/^[a-z0-9-]+$/, 'O link deve conter apenas letras minúsculas, números e traços.'),
  phone: z
    .string()
    .transform((val) => onlyDigits(val))
    .refine((val) => val.length === 10 || val.length === 11, {
      message: 'O telefone/WhatsApp deve ter 10 ou 11 dígitos com DDD.'
    }),
  addressZip: z.string().transform((val) => onlyDigits(val)).optional().default('01001000'),
  addressStreet: z.string().optional().default('Endereço principal'),
  addressNumber: z.string().optional().default('S/N'),
  addressComplement: z.string().optional().nullable(),
  addressNeighborhood: z.string().optional().default('Centro'),
  addressCity: z.string().optional().default('São Paulo'),
  addressState: z.string().optional().default('SP'),
  isSingleCityZip: z.boolean().default(false),
  themeTemplate: z.enum(themeTemplates).default('PURPLE_GOLD'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().optional().nullable(),
  ownerName: z.string().min(2, 'O nome do responsável é obrigatório.'),
  ownerEmail: z.string().email('E-mail inválido para acesso.'),
  ownerPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').optional(),
  planId: z.string().optional(),
  selectedServices: z
    .array(
      z.object({
        name: z.string().min(2),
        price: z.number().min(0),
        durationMinutes: z.number().int().min(5),
        category: z.string().default('Geral')
      })
    )
    .optional()
});

export const updateTenantSettingsSchema = z.object({
  planCode: z.string().optional(),
  name: z.string().min(2).optional(),
  legalName: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  niche: z.enum(businessNiches).optional(),
  phone: z
    .string()
    .transform((val) => onlyDigits(val))
    .optional(),
  instagramUrl: z.string().optional().nullable().transform(v => (v && v.trim() !== '' ? v.trim() : null)),
  themeTemplate: z.enum(themeTemplates).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().optional().nullable().transform(v => (v && v.trim() !== '' ? v.trim() : null)),
  googleReviewUrl: z.string().optional().nullable().transform(v => (v && v.trim() !== '' ? v.trim() : null)),
  npsFeedbackEnabled: z.boolean().optional(),
  depositRequired: z.boolean().optional(),
  depositType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  depositAmount: z.number().min(0).optional(),
  depositOnFirstBooking: z.boolean().optional(),
  depositFirstBookingType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  depositFirstBookingValue: z.number().min(0).optional(),
  depositFirstBookingPercent: z.number().min(0).max(100).optional(),
  pixKey: z.string().optional().nullable().transform(v => (v && v.trim() !== '' ? v.trim() : null)),
  pixKeyType: z.enum(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM']).optional().nullable(),
  pixKeyHolder: z.string().optional().nullable().transform(v => (v && v.trim() !== '' ? v.trim() : null)),
  maxNoShowsAllowed: z.number().int().min(1).max(10).optional(),
  churnRecoveryEnabled: z.boolean().optional(),
  churnAlertDays: z.number().int().min(15).max(180).optional(),
  birthdayMessageEnabled: z.boolean().optional(),
  birthdayMessageCustom: z.string().max(300).optional().nullable(),
  bufferMinutes: z.number().int().min(0).max(60).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
  minAdvanceBookingMinutes: z.number().int().min(0).optional(),
  maxAdvanceBookingDays: z.number().int().min(1).max(90).optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional().nullable(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional()
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;
