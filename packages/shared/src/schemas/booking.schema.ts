import { z } from 'zod';
import { onlyDigits } from '../utils/masks';

export const createBookingSchema = z.object({
  clientName: z.string().min(2, 'Informe seu nome completo.'),
  clientPhone: z
    .string()
    .transform((val) => onlyDigits(val))
    .refine((val) => val.length === 10 || val.length === 11, {
      message: 'Informe um WhatsApp válido com DDD.'
    }),
  clientEmail: z.string().email('E-mail inválido.').optional().nullable(),
  serviceId: z.string().uuid('Serviço principal inválido.'),
  professionalId: z.string().uuid('Profissional inválido.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário de início deve estar no formato HH:MM.'),
  additionalServices: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        price: z.number().min(0),
        durationMinutes: z.number().int().min(5)
      })
    )
    .optional(),
  intakeAnswers: z.record(z.any()).optional(),
  serviceLocation: z.string().optional(),
  notes: z.string().max(500).optional()
});

export const joinWaitlistSchema = z.object({
  clientName: z.string().min(2, 'Informe seu nome completo.'),
  clientPhone: z
    .string()
    .transform((val) => onlyDigits(val))
    .refine((val) => val.length === 10 || val.length === 11, {
      message: 'Informe um WhatsApp válido com DDD.'
    }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD.'),
  preferredShift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'ANY']).default('ANY'),
  serviceId: z.string().uuid().optional(),
  professionalId: z.string().uuid().optional()
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
