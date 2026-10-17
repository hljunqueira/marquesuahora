import { PrismaClient, Role, BusinessNiche } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed de Usuários VIP e Admin ---');

  // 1. Hashes das senhas com argon2id
  const henriquePassHash = await argon2.hash('183834@Hlj');
  const emanuellePassHash = await argon2.hash('Davih06.');

  // 2. Garantir o Plano VIP sem mensalidade
  const vipPlan = await prisma.plan.upsert({
    where: { code: 'VIP_PRO' },
    update: {
      name: 'VIP Equipe Pro',
      description: 'Acesso VIP vitalício com todos os recursos liberados e sem mensalidade',
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
        'Cálculo de Comissões',
        'Gestão Financeira & Relatórios',
        'Sem Mensalidade (Cliente VIP)'
      ],
      active: true
    },
    create: {
      code: 'VIP_PRO',
      name: 'VIP Equipe Pro',
      description: 'Acesso VIP vitalício com todos os recursos liberados e sem mensalidade',
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
        'Cálculo de Comissões',
        'Gestão Financeira & Relatórios',
        'Sem Mensalidade (Cliente VIP)'
      ],
      active: true
    }
  });

  console.log(`✓ Plano VIP garantido: ${vipPlan.name} (${vipPlan.code})`);

  // 3. Garantir o Tenant da Emanuelle
  const emanuelleTenant = await prisma.tenant.upsert({
    where: { slug: 'emanuelletelles' },
    update: {
      name: 'Emanuelle Telles Nails',
      legalName: 'Emanuelle Telles Studio de Unhas',
      phone: '11999999999',
      description: 'Especialista em Nail Art, Alongamentos em Gel, Cílios e Cuidados Especiais.',
      niche: BusinessNiche.NAIL_LASH_STUDIO,
      terminology: {
        professional: 'Designer',
        space: 'Mesa de Atendimento',
        service: 'Procedimento'
      },
      planId: vipPlan.id,
      billingStatus: 'ACTIVE',
      blockedAt: null,
      blockedReason: null
    },
    create: {
      name: 'Emanuelle Telles Nails',
      legalName: 'Emanuelle Telles Studio de Unhas',
      documentType: 'CPF',
      documentNumber: '11122233344',
      slug: 'emanuelletelles',
      phone: '11999999999',
      description: 'Especialista em Nail Art, Alongamentos em Gel, Cílios e Cuidados Especiais.',
      niche: BusinessNiche.NAIL_LASH_STUDIO,
      terminology: {
        professional: 'Designer',
        space: 'Mesa de Atendimento',
        service: 'Procedimento'
      },
      addressStreet: 'Rua das Flores',
      addressNumber: '100',
      addressNeighborhood: 'Centro',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZip: '01001-000',
      planId: vipPlan.id,
      billingStatus: 'ACTIVE'
    }
  });

  console.log(`✓ Salão / Tenant da Emanuelle garantido: ${emanuelleTenant.name} (${emanuelleTenant.slug})`);

  // 4. Cadastrar / Atualizar Usuário Emanuelle Telles
  const emanuelleUser = await prisma.user.upsert({
    where: { email: 'emanuelletelles.unhas@gmail.com' },
    update: {
      name: 'Emanuelle Telles',
      passwordHash: emanuellePassHash,
      role: Role.ADMIN,
      tenantId: emanuelleTenant.id
    },
    create: {
      email: 'emanuelletelles.unhas@gmail.com',
      name: 'Emanuelle Telles',
      passwordHash: emanuellePassHash,
      role: Role.ADMIN,
      tenantId: emanuelleTenant.id
    }
  });

  console.log(`✓ Usuário Emanuelle cadastrado: ${emanuelleUser.email} (Role: ${emanuelleUser.role})`);

  // 5. Vincular Profissional Emanuelle
  const existingProf = await prisma.professional.findFirst({
    where: { userId: emanuelleUser.id }
  });

  if (existingProf) {
    await prisma.professional.update({
      where: { id: existingProf.id },
      data: {
        name: 'Emanuelle Telles',
        phone: '11999999999',
        color: '#9333ea',
        isActive: true,
        tenantId: emanuelleTenant.id
      }
    });
    console.log(`✓ Profissional Emanuelle atualizado: ${existingProf.name}`);
  } else {
    const createdProf = await prisma.professional.create({
      data: {
        name: 'Emanuelle Telles',
        phone: '11999999999',
        color: '#9333ea',
        scheduleConfig: {
          seg: { start: '09:00', end: '19:00' },
          ter: { start: '09:00', end: '19:00' },
          qua: { start: '09:00', end: '19:00' },
          qui: { start: '09:00', end: '19:00' },
          sex: { start: '09:00', end: '19:00' },
          sab: { start: '09:00', end: '18:00' }
        },
        isActive: true,
        tenantId: emanuelleTenant.id,
        userId: emanuelleUser.id
      }
    });
    console.log(`✓ Profissional Emanuelle criado: ${createdProf.name}`);
  }

  // 6. Cadastrar / Atualizar Usuário Admin Henrique Linhares Junqueira
  const henriqueUser = await prisma.user.upsert({
    where: { email: 'henriquelinharesjunqueira@gmail.com' },
    update: {
      name: 'Henrique Linhares Junqueira',
      passwordHash: henriquePassHash,
      role: Role.SUPER_ADMIN
    },
    create: {
      email: 'henriquelinharesjunqueira@gmail.com',
      name: 'Henrique Linhares Junqueira',
      passwordHash: henriquePassHash,
      role: Role.SUPER_ADMIN
    }
  });

  console.log(`✓ Usuário Henrique (SUPER_ADMIN) cadastrado: ${henriqueUser.email} (Role: ${henriqueUser.role})`);

  console.log('--- Seed Concluído com Sucesso Total ---');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
