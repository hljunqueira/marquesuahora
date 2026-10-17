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
      hasAnamnesis: false,
      hasCommissions: false,
      hasGoogleCalendar: false,
      features: [
        'Até 30 agendamentos por mês',
        '1 profissional cadastrado',
        'Link na bio personalizável',
        'Catálogo de serviços e preços',
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
      hasAnamnesis: false,
      hasCommissions: false,
      hasGoogleCalendar: false,
      features: [
        'Até 30 agendamentos por mês',
        '1 profissional cadastrado',
        'Link na bio personalizável',
        'Catálogo de serviços e preços',
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
      description: 'Para profissionais autônomas que vivem de hora marcada e não podem perder tempo.',
      monthlyPrice: 39.0,
      maxProfessionals: 1,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
      extraBookingFee: 0.0,
      hasAiAssistant: false,
      hasAnamnesis: true,
      hasCommissions: false,
      hasGoogleCalendar: true,
      features: [
        'Agendamentos ilimitados',
        '1 profissional cadastrado',
        'Lembretes automáticos no WhatsApp',
        'Módulo de Cursos Online para alunas',
        'Proteção No-Show anti-faltas',
        'Galeria de fotos de procedimentos',
      ],
      active: true
    },
    create: {
      code: 'SOLO',
      name: 'Profissional Solo',
      description: 'Para profissionais autônomas que vivem de hora marcada e não podem perder tempo.',
      monthlyPrice: 39.0,
      maxProfessionals: 1,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
      extraBookingFee: 0.0,
      hasAiAssistant: false,
      hasAnamnesis: true,
      hasCommissions: false,
      hasGoogleCalendar: true,
      features: [
        'Agendamentos ilimitados',
        '1 profissional cadastrado',
        'Lembretes automáticos no WhatsApp',
        'Módulo de Cursos Online para alunas',
        'Proteção No-Show anti-faltas',
        'Galeria de fotos de procedimentos',
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
      description: 'Para salões, barbearias e estúdios com múltiplos atendentes e cadeiras.',
      monthlyPrice: 79.0,
      maxProfessionals: 5,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
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
        'Cursos e vídeos online',
        'Cálculo de Comissões e Relatórios',
      ],
      active: true
    },
    create: {
      code: 'EQUIPE_PRO',
      name: 'Equipe Pro',
      description: 'Para salões, barbearias e estúdios com múltiplos atendentes e cadeiras.',
      monthlyPrice: 79.0,
      maxProfessionals: 5,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
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
        'Cursos e vídeos online',
        'Cálculo de Comissões e Relatórios',
      ],
      active: true
    }
  });
  console.log(`✓ Equipe Pro atualizado: R$ ${equipePlan.monthlyPrice} (Agendamentos ilimitados, até 5 profissionais)`);

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

  // 5. Garantir que o plano da Emanuelle Telles é o VIP Pro Cortesia (R$ 0,00 sem mensalidade)
  const vipCortesia = await prisma.plan.upsert({
    where: { code: 'VIP_PRO' },
    update: {
      name: 'VIP Equipe Pro (Cortesia Sem Mensalidade)',
      description: 'Plano VIP vitalício cortesia para o estúdio Emanuelle Telles Nails.',
      monthlyPrice: 0.0,
      maxProfessionals: 99,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
      extraBookingFee: 0.0,
      hasAiAssistant: true,
      hasAnamnesis: true,
      hasCommissions: true,
      hasGoogleCalendar: true,
      features: [
        'Agendamentos Ilimitados',
        'Atendente IA no WhatsApp',
        'Ficha de Anamnese Digital',
        'Sem Mensalidade (Cliente VIP)'
      ],
      active: false // Oculto na vitrine comercial pública
    },
    create: {
      code: 'VIP_PRO',
      name: 'VIP Equipe Pro (Cortesia Sem Mensalidade)',
      description: 'Plano VIP vitalício cortesia para o estúdio Emanuelle Telles Nails.',
      monthlyPrice: 0.0,
      maxProfessionals: 99,
      isUnlimitedBookings: true,
      monthlyFreeBookings: 999999,
      extraBookingFee: 0.0,
      hasAiAssistant: true,
      hasAnamnesis: true,
      hasCommissions: true,
      hasGoogleCalendar: true,
      features: [
        'Agendamentos Ilimitados',
        'Atendente IA no WhatsApp',
        'Ficha de Anamnese Digital',
        'Sem Mensalidade (Cliente VIP)'
      ],
      active: false
    }
  });

  await prisma.tenant.updateMany({
    where: { slug: 'emanuelletelles' },
    data: {
      planId: vipCortesia.id,
      billingStatus: 'ACTIVE'
    }
  });

  console.log('✓ Salão Emanuelle Telles vinculado com sucesso ao plano VIP Cortesia sem mensalidade');
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
