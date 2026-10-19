import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('    DEDUPLICAÇÃO E LIMPEZA DE SERVIÇOS — EMANUELLE TELLES       ');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'emanuelletelles' }
  });

  if (!tenant) {
    throw new Error('Tenant emanuelletelles não localizado!');
  }

  // IDs dos serviços duplicados / seeds não utilizados que devem ser removidos
  const servicesToRemove = [
    {
      id: '9474e5ba-1994-4c60-a3e2-361020ebf99a',
      name: 'Esmaltação em Gel (Mãos)',
      reason: 'Duplicata antiga de "ESMALTAÇÃO EM GEL | Mãos"'
    },
    {
      id: 'a885802c-0cbb-49de-b7c2-6cd7d8b5fd55',
      name: 'Blindagem Diamante / Banho de Gel',
      reason: 'Duplicata antiga de "BANHO DE GEL | Mais procurado"'
    },
    {
      id: 'b4816d55-f096-438c-af45-82116d47c699',
      name: 'Spa dos Pés & Pedicure Completa',
      reason: 'Duplicata antiga de "SPA dos pés"'
    },
    {
      id: 'fbc23fb4-ac0c-4463-a3ea-9c3f3a348a9e',
      name: 'Alongamento em Gel na Fibra de Vidro',
      reason: 'Duplicata antiga de "Alongamento | Fibra de Vidro - Unhas Saudáveis"'
    },
    {
      id: 'bfc88590-d6f9-445e-8798-75afd2afcfd2',
      name: 'Manutenção de Gel (Unhas Perfeitas)',
      reason: 'Duplicata antiga de "MANUTENÇÃO | Alongamento"'
    },
    {
      id: 'c7a75c65-b2f2-4da4-ad4a-c92595c1beae',
      name: 'Manicure Tradicional + Cutilagem Fina',
      reason: 'Serviço seed genérico não oferecido pelo studio'
    },
    {
      id: '55a9f39d-63a2-47c8-80ec-b87156fdfc6c',
      name: 'Extensão Fio a Fio Clássico',
      reason: 'Serviço seed de cílios (studio exclusivo de unhas)'
    },
    {
      id: '166802a1-20fa-4aca-be92-40e140a62592',
      name: 'Extensão de Cílios Volume Brasileiro',
      reason: 'Serviço seed de cílios (studio exclusivo de unhas)'
    },
    {
      id: '4dba3521-9684-49c7-93fd-c738ee67645e',
      name: 'Manutenção de Cílios',
      reason: 'Serviço seed de cílios (studio exclusivo de unhas)'
    }
  ];

  console.log(`Iniciando checagem de segurança para ${servicesToRemove.length} serviços a remover...\n`);

  let removedCount = 0;
  for (const item of servicesToRemove) {
    const service = await prisma.service.findFirst({
      where: { id: item.id, tenantId: tenant.id },
      include: {
        _count: {
          select: {
            schedules: true,
            scheduleItems: true
          }
        }
      }
    });

    if (!service) {
      console.log(`- Serviço "${item.name}" (ID: ${item.id}) já não existe no banco.`);
      continue;
    }

    if (service._count.schedules > 0 || service._count.scheduleItems > 0) {
      console.warn(
        `! ATENÇÃO: Serviço "${service.name}" possui ${service._count.schedules} agendamentos associados! Pulando para evitar perda de dados.`
      );
      continue;
    }

    // 1. Remove vínculos na tabela de profissionais
    await prisma.serviceProfessional.deleteMany({
      where: { serviceId: service.id }
    });

    // 2. Remove o serviço
    await prisma.service.delete({
      where: { id: service.id }
    });

    console.log(`✓ Removido com sucesso: "${service.name}" (${item.reason})`);
    removedCount++;
  }

  // 3. Listagem final consolidada
  const remainingServices = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: {
        select: { schedules: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`\n================================================================`);
  console.log(`CATÁLOGO FINAL CONSOLIDADO (${remainingServices.length} serviços ativos)`);
  console.log(`================================================================\n`);

  remainingServices.forEach((s, idx) => {
    console.log(
      `${idx + 1}. "${s.name}" — R$ ${s.price} (${s.durationMinutes} min) | ${s._count.schedules} agendamentos`
    );
  });

  console.log(`\n✓ Concluído: ${removedCount} serviços duplicados/seeds removidos com sucesso.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
