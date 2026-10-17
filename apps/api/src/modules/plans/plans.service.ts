import { prisma } from '../../lib/prisma';
import { Plan } from '@prisma/client';

export const DEFAULT_PLANS = [
  {
    code: 'FREE',
    name: 'Gratuito',
    description: 'Ideal para testar e para quem está começando o próprio negócio.',
    monthlyPrice: 0.0,
    maxProfessionals: 1,
    isUnlimitedBookings: false,
    monthlyFreeBookings: 30,
    extraBookingFee: 1.5,
    hasAiAssistant: false,
    hasAnamnesis: false,
    hasCommissions: false,
    hasGoogleCalendar: false,
    features: [
      'Até 30 agendamentos por mês',
      '1 profissional cadastrado',
      'Link na bio personalizável',
      'Catálogo de serviços e preços'
    ],
    active: true
  },
  {
    code: 'SOLO',
    name: 'Profissional Solo',
    description: 'Para profissionais autônomas que vivem de hora marcada e não podem perder tempo.',
    monthlyPrice: 39.0,
    maxProfessionals: 1,
    isUnlimitedBookings: true,
    monthlyFreeBookings: 0,
    extraBookingFee: 0.0,
    hasAiAssistant: true,
    hasAnamnesis: true,
    hasCommissions: false,
    hasGoogleCalendar: true,
    features: [
      'Agendamentos ilimitados',
      '1 profissional cadastrado',
      'Lembretes automáticos no WhatsApp',
      'Módulo de Cursos Online para alunas',
      'Proteção No-Show Shield (anti-faltas)',
      'Galeria de fotos de trabalhos'
    ],
    active: true
  },
  {
    code: 'EQUIPE_PRO',
    name: 'Equipe Pro',
    description: 'Para salões, barbearias e estúdios com múltiplos atendentes e cadeiras.',
    monthlyPrice: 79.0,
    maxProfessionals: 5,
    isUnlimitedBookings: true,
    monthlyFreeBookings: 0,
    extraBookingFee: 0.0,
    hasAiAssistant: true,
    hasAnamnesis: true,
    hasCommissions: true,
    hasGoogleCalendar: true,
    features: [
      'Agendamentos ilimitados',
      'Até 5 profissionais na equipe',
      'Grades individuais de horários',
      'Lembretes no WhatsApp para todos',
      'Cursos e vídeos para alunas',
      'Relatórios de atendimentos por profissional'
    ],
    active: true
  }
];

export class PlansService {
  /**
   * Garante a existência dos 3 planos canônicos no banco de dados.
   * Executa upsert baseado no código único do plano (code).
   */
  static async ensureDefaultPlans(): Promise<void> {
    for (const planData of DEFAULT_PLANS) {
      await prisma.plan.upsert({
        where: { code: planData.code },
        update: {
          name: planData.name,
          description: planData.description,
          monthlyPrice: planData.monthlyPrice,
          maxProfessionals: planData.maxProfessionals,
          isUnlimitedBookings: planData.isUnlimitedBookings,
          monthlyFreeBookings: planData.monthlyFreeBookings,
          extraBookingFee: planData.extraBookingFee,
          hasAiAssistant: planData.hasAiAssistant,
          hasAnamnesis: planData.hasAnamnesis,
          hasCommissions: planData.hasCommissions,
          hasGoogleCalendar: planData.hasGoogleCalendar,
          features: planData.features,
          active: planData.active
        },
        create: {
          code: planData.code,
          name: planData.name,
          description: planData.description,
          monthlyPrice: planData.monthlyPrice,
          maxProfessionals: planData.maxProfessionals,
          isUnlimitedBookings: planData.isUnlimitedBookings,
          monthlyFreeBookings: planData.monthlyFreeBookings,
          extraBookingFee: planData.extraBookingFee,
          hasAiAssistant: planData.hasAiAssistant,
          hasAnamnesis: planData.hasAnamnesis,
          hasCommissions: planData.hasCommissions,
          hasGoogleCalendar: planData.hasGoogleCalendar,
          features: planData.features,
          active: planData.active
        }
      });
    }
  }

  /**
   * Localiza um plano por UUID ou código (ex: "FREE", "SOLO", "EQUIPE", "EQUIPE_PRO").
   * Se não encontrado ou não informado, retorna o plano gratuito padrão.
   */
  static async resolvePlan(planIdentifier?: string | null): Promise<Plan | null> {
    await this.ensureDefaultPlans();

    if (planIdentifier) {
      const trimmed = planIdentifier.trim();

      // 1. Tenta buscar por UUID direto
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(trimmed)) {
        const plan = await prisma.plan.findUnique({ where: { id: trimmed } });
        if (plan) return plan;
      }

      // 2. Tenta buscar pelo código normalizado
      let codeToSearch = trimmed.toUpperCase();
      if (codeToSearch === 'EQUIPE' || codeToSearch === 'PRO') {
        codeToSearch = 'EQUIPE_PRO';
      } else if (codeToSearch === 'GRATUITO' || codeToSearch === 'GRATIS') {
        codeToSearch = 'FREE';
      }

      const planByCode = await prisma.plan.findUnique({ where: { code: codeToSearch } });
      if (planByCode) return planByCode;
    }

    // 3. Fallback: plano gratuito ativo
    const freePlan = await prisma.plan.findUnique({ where: { code: 'FREE' } });
    if (freePlan) return freePlan;

    // 4. Último fallback: primeiro plano ativo
    return prisma.plan.findFirst({
      where: { active: true },
      orderBy: { monthlyPrice: 'asc' }
    });
  }
}
