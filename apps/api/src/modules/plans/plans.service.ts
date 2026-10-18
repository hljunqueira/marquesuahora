import { prisma } from '../../lib/prisma';
import { Plan } from '@prisma/client';

export class PlansService {
  /**
   * Sem planos padrão estáticos no código: planos são 100% gerenciados
   * pelo administrador diretamente no banco de dados.
   */
  static async ensureDefaultPlans(): Promise<void> {
    // Zero defaults injetados via código. Gerenciamento 100% via banco / admin.
  }

  /**
   * Localiza um plano por UUID ou código (ex: "FREE", "SOLO", "EQUIPE_PRO").
   * Se não encontrado ou não informado, busca o plano gratuito ativo ou o primeiro ativo no banco.
   */
  static async resolvePlan(planIdentifier?: string | null): Promise<Plan | null> {
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

    // 3. Fallback: plano gratuito ativo cadastrado no banco
    const freePlan = await prisma.plan.findFirst({
      where: { code: 'FREE', active: true }
    });
    if (freePlan) return freePlan;

    // 4. Último fallback: primeiro plano ativo cadastrado no banco
    return prisma.plan.findFirst({
      where: { active: true },
      orderBy: { monthlyPrice: 'asc' }
    });
  }
}

