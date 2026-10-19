import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_EMANUELLE_AFTERCARE = [
  {
    id: 'aftercare-unhas-gel',
    title: 'Alongamento em Gel & Fibra de Vidro',
    category: 'Unhas',
    description: 'Recomendações fundamentais para manter suas unhas impecáveis, resistentes e saudáveis.',
    items: [
      'Evite usar as unhas como ferramentas para abrir latas, gavetas, caixas ou raspar superfícies rígidas.',
      'Utilize luvas de proteção sempre que manusear produtos químicos de limpeza doméstica (cloro, água sanitária e detergentes concentrados).',
      'Hidrate diariamente as cutículas com óleo vegetal ou sérum nutritivo para preservar a flexibilidade do gel e o brilho do top coat.',
      'Respeite rigorosamente o período de manutenção (a cada 18 a 25 dias) para prevenir infiltrações, descolamentos e proteger a matriz natural da unha.',
      'Nunca tente arrancar o alongamento ou morder o gel. Em caso de qualquer descolamento acidental, entre em contato imediatamente com o studio.'
    ],
    isActive: true
  },
  {
    id: 'aftercare-esmaltacao-gel',
    title: 'Esmaltação em Gel & Blindagem Diamond',
    category: 'Unhas',
    description: 'Cuidados essenciais para garantir brilho espelhado e durabilidade superior a 20 dias.',
    items: [
      'Evite banhos muito quentes e contato contínuo com água fervente nas primeiras 12 horas após a polimerização.',
      'Não lixe as pontas das unhas em casa para não romper o selamento da borda livre feito em mesa.',
      'Caso deseje retirar qualquer esmalte comum aplicado sobre a blindagem, use exclusivamente removedor sem acetona.'
    ],
    isActive: true
  },
  {
    id: 'aftercare-cilios-lash',
    title: 'Extensão de Cílios & Lash Lifting',
    category: 'Cílios',
    description: 'Orientações práticas para retenção máxima do adesivo e preservação dos fios naturais.',
    items: [
      'Evite molhar a área dos olhos, vapor quente, saunas ou atividades físicas de alta sudorese nas primeiras 24 horas.',
      'Higienize os cílios diariamente a partir do segundo dia utilizando espuma micelar ou shampoo neutro diluído em água fria.',
      'Penteie suavemente as extensões com a escovinha limpa fornecida ao acordar e após secar o rosto.',
      'Não utilize máscaras de cílios (rímel) à prova d\'água nem demaquilantes à base de óleos na região dos olhos.'
    ],
    isActive: true
  }
];

async function main() {
  console.log('Populando orientações de Cuidados Pós-Atendimento para o tenant...');

  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { slug: 'emanuelletelles' },
        { niche: 'NAIL_LASH_STUDIO' }
      ]
    }
  });

  for (const t of tenants) {
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        aftercareGuides: DEFAULT_EMANUELLE_AFTERCARE
      }
    });
    console.log(`[OK] AftercareGuides aplicados com sucesso para ${t.name} (${t.slug})`);
  }

  console.log('Finalizado com sucesso.');
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('Erro ao popular aftercare:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
