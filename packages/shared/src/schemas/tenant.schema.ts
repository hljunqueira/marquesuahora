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
  niche: z.enum(businessNiches, {
    errorMap: () => ({ message: 'Selecione o nicho de atuação do seu estabelecimento.' })
  }),
  documentType: z.enum(['CNPJ', 'CPF']),
  documentNumber: z
    .string()
    .transform((val) => onlyDigits(val))
    .refine((val) => val.length === 11 || val.length === 14, {
      message: 'O documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.'
    }),
  name: z.string().min(2, 'O nome fantasia do estabelecimento é obrigatório.'),
  legalName: z.string().optional(),
  slug: z
    .string()
    .min(3, 'O link do salão deve ter no mínimo 3 caracteres.')
    .regex(/^[a-z0-9-]+$/, 'O link deve conter apenas letras minúsculas, números e traços.'),
  phone: z
    .string()
    .transform((val) => onlyDigits(val))
    .refine((val) => val.length === 10 || val.length === 11, {
      message: 'O telefone/WhatsApp deve ter 10 ou 11 dígitos com DDD.'
    }),
  addressZip: z.string().transform((val) => onlyDigits(val)),
  addressStreet: z.string().min(2, 'O logradouro é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().min(2, 'O bairro é obrigatório.'),
  addressCity: z.string().min(2, 'A cidade é obrigatória.'),
  addressState: z.string().length(2, 'O estado deve ter 2 letras (UF).'),
  isSingleCityZip: z.boolean().default(false),
  themeTemplate: z.enum(themeTemplates).default('PURPLE_GOLD'),
  logoUrl: z.string().url().optional().nullable(),
  ownerName: z.string().min(2, 'O nome do responsável é obrigatório.'),
  ownerEmail: z.string().email('E-mail inválido para acesso.'),
  ownerPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  planId: z.string().uuid().optional(),
  selectedServices: z
    .array(
      z.object({
        name: z.string().min(2),
        price: z.number().min(0),
        durationMinutes: z.number().int().min(5),
        category: z.string().default('Geral')
      })
    )
    .min(1, 'Selecione ou cadastre pelo menos um serviço inicial.')
});

export const updateTenantSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(500).optional().nullable(),
  phone: z
    .string()
    .transform((val) => onlyDigits(val))
    .optional(),
  instagramUrl: z.string().url().optional().nullable(),
  themeTemplate: z.enum(themeTemplates).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().url().optional().nullable(),
  googleReviewUrl: z.string().url().optional().nullable(),
  npsFeedbackEnabled: z.boolean().optional(),
  depositRequired: z.boolean().optional(),
  depositType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  depositAmount: z.number().min(0).optional(),
  maxNoShowsAllowed: z.number().int().min(1).max(10).optional(),
  churnRecoveryEnabled: z.boolean().optional(),
  churnAlertDays: z.number().int().min(15).max(180).optional(),
  birthdayMessageEnabled: z.boolean().optional(),
  birthdayMessageCustom: z.string().max(300).optional().nullable(),
  bufferMinutes: z.number().int().min(0).max(60).optional(),
  minAdvanceBookingMinutes: z.number().int().min(0).optional(),
  maxAdvanceBookingDays: z.number().int().min(1).max(90).optional()
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;
