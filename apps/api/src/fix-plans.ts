import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Ajustando Planos Oficiais do Marque Sua Hora ---');

  // 1. Plano Gratuito
  const freePlan = await prisma.plan.upsert({
    where: { code: 'FREE' },
    update: {
      name: 'Plano Gratuito',
      description: 'Plano gratuito permanente para testar e começar com hora marcada.',
      monthlyPrice: 0.0,
      maxProfessionals: 1,
      isUnlimitedBookings: false,
      monthlyFreeBookings: 30,
      extraBookingFee: 0.0,
      hasAiAssistant: false,
      hasAutoWhatsapp: false,
      hasCourses: false,
      hasSupport: true,
      hasAnamnesis: false,
      hasCommissions: false,
      hasGoogleCalendar: false,
      features: [
        'Até 30 agendamentos por mês',
        '1 profissional cadastrado',
        'Link na bio personalizável',
        'Catálogo de serviços e preços',
        'Central de Suporte Oficial com IA'
      ],
      active: true
    },
    create: {
      code: 'FREE',
      name: 'Plano Gratuito',
      description: 'Plano gratuito permanente para testar e começar com hora marcada.',
      monthlyPrice: 0.0,
      maxProfessionals: 1,
      isUnlimitedBookings: false,
      monthlyFreeBookings: 30,
      extraBookingFee: 0.0,
      hasAiAssistant: false,
      hasAutoWhatsapp: false,
      hasCourses: false,
      hasSupport: true,
      hasAnamnesis: false,
      hasCommissions: false,
      hasGoogleCalendar: false,
      features: [
        'Até 30 agendamentos por mês',
        '1 profissional cadastrado',
        'Link na bio personalizável',
        'Catálogo de serviços e preços',
        'Central de Suporte Oficial com IA'
      ],
      active: true
    }
  });
  console.log(`✓ Plano Gratuito atualizado: R$ ${freePlan.monthlyPrice} (30 agendamentos/mês, 1 profissional)`);

  // 2. Profissional Solo
  const soloPlan = await prisma.plan.upsert({
    where: { code: 'SOLO' },
    update: {
      name: 'Profissional Solo',
      description: 'Para profissionais autônomas que vivem de hora marcada e precisam de agendamentos ilimitados.',
      monthlyPrice: 49.99,
      maxProfessionals: 1,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
      extraBookingFee: 0.0,
      hasAiAssistant: false,
      hasAutoWhatsapp: true,
      hasCourses: false,
      hasSupport: true,
      hasAnamnesis: true,
      hasCommissions: false,
      hasGoogleCalendar: true,
      features: [
        'Agendamentos ilimitados',
        '1 profissional cadastrado',
        'Automações de WhatsApp (Lembretes & Confirmações)',
        'Proteção Anti-Falta (Sinal PIX Direto)',
        'Central de Suporte Oficial com IA',
        'Galeria de fotos de procedimentos',
        'Sem fidelidade (cancele quando quiser)'
      ],
      active: true
    },
    create: {
      code: 'SOLO',
      name: 'Profissional Solo',
      description: 'Para profissionais autônomas que vivem de hora marcada e precisam de agendamentos ilimitados.',
      monthlyPrice: 49.99,
      maxProfessionals: 1,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
      extraBookingFee: 0.0,
      hasAiAssistant: false,
      hasAutoWhatsapp: true,
      hasCourses: false,
      hasSupport: true,
      hasAnamnesis: true,
      hasCommissions: false,
      hasGoogleCalendar: true,
      features: [
        'Agendamentos ilimitados',
        '1 profissional cadastrado',
        'Automações de WhatsApp (Lembretes & Confirmações)',
        'Proteção Anti-Falta (Sinal PIX Direto)',
        'Central de Suporte Oficial com IA',
        'Galeria de fotos de procedimentos',
        'Sem fidelidade (cancele quando quiser)'
      ],
      active: true
    }
  });
  console.log(`✓ Profissional Solo atualizado: R$ ${soloPlan.monthlyPrice} (Agendamentos ilimitados, 1 profissional)`);

  // 3. Equipe Pro
  const equipePlan = await prisma.plan.upsert({
    where: { code: 'EQUIPE_PRO' },
    update: {
      name: 'Equipe Pro',
      description: 'Para salões, barbearias e clínicas com equipe, IA, WhatsApp e módulo de cursos.',
      monthlyPrice: 99.99,
      maxProfessionals: 5,
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
        'Agendamentos ilimitados',
        'Até 5 profissionais na equipe',
        'Copiloto IA (Comandos de Voz & Texto)',
        'Lembretes automáticos no WhatsApp',
        'Módulo de Cursos Online para alunas',
        'Central de Suporte Oficial com IA',
        'Cálculo de Comissões e Relatórios'
      ],
      active: true
    },
    create: {
      code: 'EQUIPE_PRO',
      name: 'Equipe Pro',
      description: 'Para salões, barbearias e clínicas com equipe, IA, WhatsApp e módulo de cursos.',
      monthlyPrice: 99.99,
      maxProfessionals: 5,
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
        'Agendamentos ilimitados',
        'Até 5 profissionais na equipe',
        'Copiloto IA (Comandos de Voz & Texto)',
        'Lembretes automáticos no WhatsApp',
        'Módulo de Cursos Online para alunas',
        'Central de Suporte Oficial com IA',
        'Cálculo de Comissões e Relatórios'
      ],
      active: true
    }
  });
  console.log(`✓ Equipe Pro atualizado: R$ ${equipePlan.monthlyPrice} (Agendamentos ilimitados, até 5 profissionais, IA, WhatsApp e Cursos)`);

  // 4. Remover / desativar planos legados que não fazem parte da vitrine
  await prisma.plan.deleteMany({
    where: {
      code: {
        in: ['VIP_AI', 'FREE_HYBRID', 'VIP_LEGACY']
      }
    }
  }).catch(() => {
    // se tiver tenants vinculados, desativa
    return prisma.plan.updateMany({
      where: { code: { in: ['VIP_AI', 'FREE_HYBRID'] } },
      data: { active: false }
    });
  });

  // 5. Garantir o Plano VIP (100% dos recursos liberados sem mensalidade)
  const vipPlan = await prisma.plan.upsert({
    where: { code: 'VIP_PRO' },
    update: {
      name: 'Plano VIP',
      description: 'Plano VIP',
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
        'Acesso VIP sem mensalidade',
        'Agendamentos Ilimitados',
        'Equipe completa liberada (até 99 profissionais)',
        'Copiloto IA na agenda (Voz & Texto)',
        'Automações completas de WhatsApp',
        'Módulo de Cursos & Vídeos para alunas',
        'Fichas de Anamnese digitais',
        'Cálculo de Comissões e Relatórios Financeiros'
      ],
      active: false // Exclusivo VIP, não aparece para contratação pública
    },
    create: {
      code: 'VIP_PRO',
      name: 'Plano VIP',
      description: 'Plano VIP',
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
        'Acesso VIP sem mensalidade',
        'Agendamentos Ilimitados',
        'Equipe completa liberada (até 99 profissionais)',
        'Copiloto IA na agenda (Voz & Texto)',
        'Automações completas de WhatsApp',
        'Módulo de Cursos & Vídeos para alunas',
        'Fichas de Anamnese digitais',
        'Cálculo de Comissões e Relatórios Financeiros'
      ],
      active: false
    }
  });

  await prisma.tenant.updateMany({
    where: { slug: 'emanuelletelles' },
    data: {
      planId: vipPlan.id,
      billingStatus: 'ACTIVE'
    }
  });

  console.log('✓ Salão Emanuelle Telles vinculado com sucesso ao plano VIP Vitalício (tudo liberado sem mensalidade)');
  console.log('--- Planos Atualizados com Sucesso ---');
}

main()
  .catch((e) => {
    console.error('Erro ao ajustar planos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
