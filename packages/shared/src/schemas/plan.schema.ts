import { z } from 'zod';

/**
 * Schemas de Validação de Planos Comerciais do SaaS
 * 
 * REGRA MANDATÓRIA DE NEGÓCIO: ZERO DEFAULTS
 * O Super Admin tem 100% de autonomia e deve enviar todos os parâmetros.
 * Não existem valores fixos ou defaults pré-programados.
 */

export const createPlanSchema = z.object({
  name: z.string().min(2, 'O nome comercial do plano é obrigatório (mínimo 2 caracteres).'),
  code: z
    .string()
    .min(2, 'O código do plano é obrigatório.')
    .regex(/^[A-Z0-9_]+$/, 'O código deve conter apenas letras maiúsculas, números e sublinhados (ex: FREE_HYBRID, SOLO, VIP_AI).'),
  description: z.string().min(5, 'A descrição comercial do plano é obrigatória.'),
  monthlyPrice: z.number().min(0, 'A mensalidade deve ser maior ou igual a zero.'),
  maxProfessionals: z.number().int().min(1, 'O limite de profissionais deve ser de no mínimo 1.'),
  isUnlimitedBookings: z.boolean(),
  monthlyFreeBookings: z.number().int().min(0, 'A franquia mensal de agendamentos deve ser maior ou igual a zero.'),
  extraBookingFee: z.number().min(0, 'A tarifa por agendamento extra deve ser maior ou igual a zero.'),
  hasAiAssistant: z.boolean(),
  hasAnamnesis: z.boolean(),
  hasCommissions: z.boolean(),
  hasGoogleCalendar: z.boolean(),
  features: z.array(z.string()).min(1, 'Informe pelo menos um diferencial ou benefício para o plano.'),
  active: z.boolean()
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  id: z.string().uuid('ID de plano inválido.')
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
