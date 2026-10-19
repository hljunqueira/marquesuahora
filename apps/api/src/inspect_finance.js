const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('Tenants:', JSON.stringify(tenants, null, 2));

  for (const t of tenants) {
    console.log('\n=== TENANT:', t.name, t.id, '===');
    
    const users = await prisma.user.findMany({
      where: { tenantId: t.id },
      select: { id: true, name: true, email: true, role: true }
    });
    console.log('Users:', users);

    const profs = await prisma.professional.findMany({
      where: { tenantId: t.id },
      select: { id: true, name: true, role: true, userId: true, commissionRate: true }
    });
    console.log('Professionals:', profs);

    const scheds = await prisma.schedule.findMany({
      where: { tenantId: t.id },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        totalPrice: true,
        client: { select: { name: true } },
        service: { select: { name: true, price: true } }
      },
      take: 20
    });
    console.log('First 20 Schedules:', scheds.map(s => ({
      date: s.date.toISOString().slice(0, 10),
      client: s.client?.name,
      service: s.service?.name,
      price: s.service?.price,
      totalPrice: s.totalPrice,
      status: s.status
    })));

    const countByStatus = await prisma.schedule.groupBy({
      by: ['status'],
      where: { tenantId: t.id },
      _count: { id: true },
      _sum: { totalPrice: true }
    });
    console.log('Schedules by Status:', countByStatus);

    const finCount = await prisma.financialEntry.count({ where: { tenantId: t.id } });
    const finSum = await prisma.financialEntry.aggregate({
      where: { tenantId: t.id },
      _sum: { amount: true }
    });
    console.log('Financial Entries Count:', finCount, 'Sum:', finSum._sum.amount);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
