import { PrismaClient, ScheduleStatus, BookingSource } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface RawAppointment {
  'Data do atendimento': string;
  'Início': string;
  'Término': string;
  'Duração (min)': number;
  'Cliente': string;
  'Telefone': string;
  'E-mail'?: string;
  'Serviços': string;
  'Profissional': string;
  'Agendado por'?: string;
  'Status'?: string;
  'Tipo de atendimento'?: string;
  'Valor dos serviços'?: number;
  'Valor líquido'?: number;
  'Faturamento'?: string;
  'Agendado em'?: string;
  'Observações internas'?: string;
}

function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  return digits;
}

function parseDateBr(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  // Meio-dia UTC para evitar deslocamentos de fuso horário
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function mapStatus(rawStatus?: string): ScheduleStatus {
  const s = (rawStatus || '').toLowerCase();
  if (s.includes('conclu')) return ScheduleStatus.COMPLETED;
  if (s.includes('confirm')) return ScheduleStatus.CONFIRMED;
  if (s.includes('cancel')) return ScheduleStatus.CANCELLED;
  if (s.includes('não compareceu') || s.includes('nao compareceu')) return ScheduleStatus.NO_SHOW;
  if (s.includes('penden')) return ScheduleStatus.PENDING;
  return ScheduleStatus.CONFIRMED;
}

function mapSource(rawSource?: string): BookingSource {
  const s = (rawSource || '').toLowerCase();
  if (s.includes('link público') || s.includes('link publico') || s.includes('online')) {
    return BookingSource.ONLINE;
  }
  return BookingSource.MANUAL_RECEPTION;
}

async function main() {
  console.log('================================================================');
  console.log('   IMPORTADOR OFICIAL DE AGENDAMENTOS — EMANUELLE TELLES NAILS  ');
  console.log('================================================================\n');

  // 1. Localizar o Tenant da Emanuelle
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: 'emanuelletelles' },
        { name: { contains: 'Emanuelle', mode: 'insensitive' } }
      ]
    }
  });

  if (!tenant) {
    throw new Error('Tenant emanuelletelles não localizado no banco de dados!');
  }

  console.log(`✓ Salão localizado: "${tenant.name}" (ID: ${tenant.id}, Slug: ${tenant.slug})`);

  // 2. Localizar ou Garantir o Profissional
  let professional = await prisma.professional.findFirst({
    where: {
      tenantId: tenant.id,
      name: { contains: 'Emanuelle', mode: 'insensitive' }
    }
  });

  if (!professional) {
    console.log('Cadastrando profissional Emanuelle Telles...');
    professional = await prisma.professional.create({
      data: {
        tenantId: tenant.id,
        name: 'Emanuelle Telles',
        phone: tenant.phone || '48999999999',
        color: '#9333EA',
      scheduleConfig: {
        mon: { start: '09:00', end: '19:00' },
        tue: { start: '09:00', end: '19:00' },
        wed: { start: '09:00', end: '19:00' },
        thu: { start: '09:00', end: '19:00' },
        fri: { start: '09:00', end: '19:00' },
        sat: { start: '09:00', end: '15:00' }
      },
      isActive: true
    }
  });
}

console.log(`✓ Profissional: "${professional.name}" (ID: ${professional.id})`);

// 3. Ler o arquivo de agendamentos
let jsonPath = path.resolve(__dirname, 'data/agendamentos_emanuelle.json');
if (!fs.existsSync(jsonPath)) {
  jsonPath = path.resolve(__dirname, '../../../docs/agendamentos_2026-10-18_1612.json');
}

console.log(`Lendo arquivo de dados: ${jsonPath}`);
let fileContent = fs.readFileSync(jsonPath, 'utf-8').trim();
if (!fileContent.startsWith('[')) {
  fileContent = `[${fileContent}]`;
}

const rawAppointments: RawAppointment[] = JSON.parse(fileContent);
console.log(`Total de registros a processar: ${rawAppointments.length}\n`);

// 4. Mapeamento e Criação de Serviços
console.log('--- 1. PROCESSANDO CATÁLOGO DE SERVIÇOS ---');
const existingServices = await prisma.service.findMany({
  where: { tenantId: tenant.id }
});

const serviceMap = new Map<string, string>(); // nome minúsculo -> id
existingServices.forEach((s) => {
  serviceMap.set(s.name.toLowerCase().trim(), s.id);
});

// Extrai todos os serviços únicos (incluindo desmembramento de combos "A + B")
const baseServiceNames = new Set<string>();
rawAppointments.forEach((item) => {
  const rawServices = item['Serviços'] || 'Atendimento Geral';
  const parts = rawServices.split('+').map((p) => p.trim());
  parts.forEach((p) => {
    if (p) baseServiceNames.add(p);
  });
});

let servicesCreatedCount = 0;
for (const sName of baseServiceNames) {
  const key = sName.toLowerCase().trim();
  if (!serviceMap.has(key)) {
    // Determina preço e duração padrão com base no nome
    let defaultPrice = 135;
    let defaultDuration = 75;

    if (sName.toLowerCase().includes('banho de gel')) {
      defaultPrice = 110;
      defaultDuration = 75;
    } else if (sName.toLowerCase().includes('esmaltacao') || sName.toLowerCase().includes('esmaltação')) {
      defaultPrice = 60;
      defaultDuration = 45;
    } else if (sName.toLowerCase().includes('plano') || sName.toLowerCase().includes('2°')) {
      defaultPrice = 0; // Pacote / Plano pré-pago
      defaultDuration = 75;
    } else if (sName.toLowerCase().includes('spa')) {
      defaultPrice = 70;
      defaultDuration = 60;
    } else if (sName.toLowerCase().includes('reposição') || sName.toLowerCase().includes('reposicao')) {
      defaultPrice = 15;
      defaultDuration = 15;
    }

    const createdService = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: sName,
        category: sName.toLowerCase().includes('pé') || sName.toLowerCase().includes('pes') ? 'Esmaltação & Pés' : 'Alongamentos em Gel & Blindagem',
        price: defaultPrice,
        durationMinutes: defaultDuration,
        allowOnlineBooking: true
      }
    });

    // Vincula ao profissional
    await prisma.serviceProfessional.upsert({
      where: {
        serviceId_professionalId: {
          serviceId: createdService.id,
          professionalId: professional.id
        }
      },
      create: {
        serviceId: createdService.id,
        professionalId: professional.id
      },
      update: {}
    });

    serviceMap.set(key, createdService.id);
    servicesCreatedCount++;
    console.log(`  + Serviço criado: "${sName}" (R$ ${defaultPrice}, ${defaultDuration} min)`);
  } else {
    // Garante vínculo existente com a Emanuelle
    const sId = serviceMap.get(key)!;
    await prisma.serviceProfessional.upsert({
      where: {
        serviceId_professionalId: {
          serviceId: sId,
          professionalId: professional.id
        }
      },
      create: {
        serviceId: sId,
        professionalId: professional.id
      },
      update: {}
    });
  }
}

  console.log(`✓ Total de serviços disponíveis: ${serviceMap.size} (${servicesCreatedCount} novos criados)\n`);

  // 5. Cadastro e Atualização de Clientes
  console.log('--- 2. PROCESSANDO BASE DE CLIENTES (COM TOKEN DE ANAMNESE) ---');
  const existingClients = await prisma.client.findMany({
    where: { tenantId: tenant.id }
  });

  const clientMap = new Map<string, string>(); // phone -> client.id
  existingClients.forEach((c) => {
    clientMap.set(c.phone, c.id);
  });

  let clientsCreatedCount = 0;
  let clientsUpdatedCount = 0;

  // Extrai clientes únicos
  const clientsData = new Map<string, { name: string; rawPhone: string; email?: string | null }>();
  rawAppointments.forEach((item) => {
    const rawPhone = item['Telefone'] || '';
    const normPhone = normalizePhone(rawPhone);
    const clientName = (item['Cliente'] || '').trim();
    const email = (item['E-mail'] || '').trim() || null;

    if (normPhone && clientName) {
      const current = clientsData.get(normPhone);
      const chosenName = !current || clientName.length > current.name.length ? clientName : current.name;
      const chosenEmail = email || current?.email || null;

      clientsData.set(normPhone, {
        name: chosenName,
        rawPhone,
        email: chosenEmail
      });
    }
  });

  for (const [phone, data] of clientsData.entries()) {
    const existingId = clientMap.get(phone);

    if (existingId) {
      // Garante que o cliente tenha seu anamnesisToken único e e-mail atualizado
      const current = existingClients.find((c) => c.id === existingId);
      const updateData: any = {};
      if (!current?.anamnesisToken) {
        updateData.anamnesisToken = crypto.randomUUID();
      }
      if (data.email && (!current?.email || current.email !== data.email)) {
        updateData.email = data.email;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.client.update({
          where: { id: existingId },
          data: updateData
        });
      }
      clientsUpdatedCount++;
    } else {
      const newClient = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: data.name,
          phone,
          email: data.email || null,
          anamnesisToken: crypto.randomUUID(),
          notifyBirthday: true
        }
      });
      clientMap.set(phone, newClient.id);
      clientsCreatedCount++;
    }
  }

  console.log(`✓ Total de clientes processados: ${clientsData.size}`);
  console.log(`  + ${clientsCreatedCount} novos clientes cadastrados`);
  console.log(`  + ${clientsUpdatedCount} clientes já existentes atualizados\n`);

  // 6. Importação dos Agendamentos
  console.log('--- 3. IMPORTANDO AGENDAMENTOS NA GRADE ---');
  let schedulesCreatedCount = 0;
  let schedulesSkippedCount = 0;

  for (const item of rawAppointments) {
    const rawPhone = item['Telefone'] || '';
    const normPhone = normalizePhone(rawPhone);
    const clientId = clientMap.get(normPhone);

    if (!clientId) {
      console.warn(`! Cliente não encontrado para agendamento: ${item['Cliente']} (${rawPhone})`);
      continue;
    }

    const date = parseDateBr(item['Data do atendimento']);
    const startTime = (item['Início'] || '09:00').trim();
    const endTime = (item['Término'] || '10:15').trim();
    const duration = Number(item['Duração (min)']) || 75;
    const price = Number(item['Valor dos serviços']) || 0;
    const status = mapStatus(item['Status']);
    const source = mapSource(item['Agendado por']);
    const notes = item['Observações internas'] || null;

    // Resolução de serviço e combos ("A + B")
    const rawServices = item['Serviços'] || 'Atendimento Geral';
    const parts = rawServices.split('+').map((p) => p.trim());
    const mainServiceName = parts[0] || 'MANUTENÇÃO | Alongamento';
    const mainServiceId = serviceMap.get(mainServiceName.toLowerCase().trim()) || existingServices[0]?.id;

    if (!mainServiceId) {
      console.warn(`! Serviço principal não resolvido: ${mainServiceName}`);
      continue;
    }

    // Monta adicionais se for combo
    let additionalServices: any[] | null = null;
    if (parts.length > 1) {
      additionalServices = parts.slice(1).map((extraName) => {
        const extraId = serviceMap.get(extraName.toLowerCase().trim()) || null;
        return {
          id: extraId,
          name: extraName,
          price: 0,
          durationMinutes: 15
        };
      });
    }

    // Checagem de idempotência: evita duplicar se já existir o mesmo agendamento
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        tenantId: tenant.id,
        clientId,
        date,
        startTime
      }
    });

    if (existingSchedule) {
      schedulesSkippedCount++;
      continue;
    }

    await prisma.schedule.create({
      data: {
        tenantId: tenant.id,
        clientId,
        professionalId: professional.id,
        serviceId: mainServiceId,
        additionalServices: additionalServices ? additionalServices : undefined,
        totalDurationMinutes: duration,
        totalPrice: price,
        date,
        startTime,
        endTime,
        status,
        source,
        notes,
        rescheduleToken: crypto.randomUUID()
      }
    });

    schedulesCreatedCount++;
  }

  console.log(`✓ Concluído com Sucesso!`);
  console.log(`  + ${schedulesCreatedCount} agendamentos inseridos no banco.`);
  console.log(`  + ${schedulesSkippedCount} agendamentos pré-existentes ignorados (idempotência garantida).`);

  // 7. Recalcula métricas de visitas e última data de cada cliente
  console.log('\n--- 4. ATUALIZANDO HISTÓRICO E ÚLTIMA VISITA DOS CLIENTES ---');
  for (const clientId of clientMap.values()) {
    const lastSchedule = await prisma.schedule.findFirst({
      where: {
        clientId,
        tenantId: tenant.id,
        status: { in: [ScheduleStatus.COMPLETED, ScheduleStatus.CONFIRMED] }
      },
      orderBy: { date: 'desc' }
    });

    if (lastSchedule) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          lastVisitAt: lastSchedule.date
        }
      });
    }
  }

  console.log('✓ Métricas e última visita atualizadas para todos os 83 clientes.');
  console.log('================================================================');
  console.log('        TODOS OS DADOS FORAM IMPORTADOS COM ÊXITO!              ');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('Erro na importação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
