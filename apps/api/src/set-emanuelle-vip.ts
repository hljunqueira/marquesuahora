import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Atualizando Cadastro da Emanuelle Telles para Plano VIP ---');

  // 1. Localizar ou garantir o Plano VIP_PRO
  let vipPlan = await prisma.plan.findFirst({
    where: {
      OR: [
        { code: 'VIP_PRO' },
        { code: 'VIP_AI' },
        { name: { contains: 'VIP', mode: 'insensitive' } }
      ]
    }
  });

  if (!vipPlan) {
    console.log('Criando plano VIP_PRO...');
    vipPlan = await prisma.plan.create({
      data: {
        code: 'VIP_PRO',
        name: 'Plano VIP Vitalício',
        description: 'Plano VIP exclusivo com acesso completo, suporte prioritário e sem mensalidade.',
        monthlyPrice: 0.0,
        maxProfessionals: 99,
        isUnlimitedBookings: true,
        monthlyFreeBookings: 999999,
        extraBookingFee: 0.0,
        hasAiAssistant: true,
        hasAutoWhatsapp: true,
        hasCourses: true,
        hasSupport: true,
        hasAnamnesis: true,
        hasCommissions: true,
        hasGoogleCalendar: true,
        features: [
          'Acesso VIP Vitalício sem mensalidade',
          'Agendamentos Ilimitados sem travas',
          'Equipe completa liberada (até 99 profissionais)',
          'Copiloto IA na agenda (Voz & Texto)',
          'Automações completas de WhatsApp (Lembretes & Confirmações)',
          'Módulo de Cursos & Vídeos para alunas',
          'Fichas de Anamnese digitais com fotos',
          'Cálculo de Comissões e Relatórios Financeiros Avançados',
          'Central de Suporte Oficial com IA de Alta Disponibilidade'
        ],
        active: false // Apenas administradores atribuem
      }
    });
  }

  console.log(`✓ Plano VIP identificado: ${vipPlan.name} (ID: ${vipPlan.id}, Code: ${vipPlan.code})`);

  // 2. Localizar todos os tenants da Emanuelle
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { slug: 'emanuelletelles' },
        { name: { contains: 'Emanuelle', mode: 'insensitive' } },
        { users: { some: { email: { contains: 'emanuelle', mode: 'insensitive' } } } }
      ]
    },
    include: {
      users: { select: { id: true, email: true, name: true, role: true } },
      plan: true
    }
  });

  if (tenants.length === 0) {
    console.warn('Nenhum tenant da Emanuelle encontrado pelos critérios. Verificando usuários...');
    const users = await prisma.user.findMany({
      where: { email: { contains: 'emanuelle', mode: 'insensitive' } }
    });
    console.log('Usuários encontrados:', users);
    return;
  }

  for (const t of tenants) {
    const updated = await prisma.tenant.update({
      where: { id: t.id },
      data: {
        planId: vipPlan.id,
        billingStatus: 'ACTIVE',
        blockedReason: null,
        blockedAt: null
      },
      include: { plan: true, users: { select: { name: true, email: true } } }
    });

    console.log(`✓ Tenant atualizado para VIP com sucesso!`);
    console.log(`  ID: ${updated.id}`);
    console.log(`  Nome: ${updated.name}`);
    console.log(`  Slug: ${updated.slug}`);
    console.log(`  Plano Anterior: ${t.plan?.name || 'Nenhum'} (${t.plan?.code || 'N/A'})`);
    console.log(`  Novo Plano: ${updated.plan?.name} (${updated.plan?.code})`);
    console.log(`  Status de Cobrança: ${updated.billingStatus}`);
    console.log(`  Usuários Vinculados: ${updated.users.map((u: any) => `${u.name} <${u.email}>`).join(', ')}`);
  }

  console.log('--- Atualização Concluída com Sucesso ---');
}

main()
  .catch((e) => {
    console.error('Erro ao atualizar tenant para VIP:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
