import { z } from 'zod';

export const ticketCategories = [
  'TECHNICAL_ISSUE',
  'FEATURE_REQUEST',
  'BILLING',
  'DOUBT',
  'OTHER'
] as const;

export const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const ticketStatuses = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'RESOLVED',
  'CLOSED'
] as const;

export const createTicketSchema = z.object({
  subject: z.string().min(5, 'Informe o assunto do chamado (mínimo 5 caracteres).'),
  category: z.enum(ticketCategories, {
    errorMap: () => ({ message: 'Selecione uma categoria válida para o chamado.' })
  }),
  priority: z.enum(ticketPriorities).default('MEDIUM'),
  initialMessage: z.string().min(5, 'Descreva detalhadamente o problema ou solicitação.')
});

export const createTicketMessageSchema = z.object({
  content: z.string().optional(),
  attachmentUrl: z.string().url().optional().nullable(),
  attachmentType: z.enum(['IMAGE', 'AUDIO', 'FILE']).optional().nullable(),
  audioDurationSeconds: z.number().int().min(1).optional().nullable(),
  isInternalNote: z.boolean().default(false)
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(ticketStatuses)
});

export const createTicketTaskSchema = z.object({
  title: z.string().min(2, 'O título da tarefa operacional é obrigatório.')
});

export const updateTicketTaskSchema = z.object({
  completed: z.boolean()
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type CreateTicketTaskInput = z.infer<typeof createTicketTaskSchema>;
export type UpdateTicketTaskInput = z.infer<typeof updateTicketTaskSchema>;
