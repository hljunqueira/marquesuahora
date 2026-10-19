import fs from 'fs';
import path from 'path';

const filePath = path.resolve(__dirname, '../../../docs/agendamentos_2026-10-18_1612.json');
let content = fs.readFileSync(filePath, 'utf-8').trim();

// Se não começar com '[', adiciona para virar um array JSON válido
if (!content.startsWith('[')) {
  content = `[${content}]`;
}

interface RawAppointment {
  'Data do atendimento': string;
  'Início': string;
  'Término': string;
  'Duração (min)': number;
  'Cliente': string;
  'Telefone': string;
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

const list: RawAppointment[] = JSON.parse(content);
console.log(`\n--- RESUMO DA IMPORTAÇÃO ---`);
console.log(`Total de agendamentos: ${list.length}`);

const uniqueClients = new Map<string, { name: string; phone: string; count: number }>();
const uniqueServices = new Map<string, number>();
const uniqueStatuses = new Map<string, number>();
const uniquePros = new Map<string, number>();

list.forEach((item) => {
  const phone = (item['Telefone'] || '').replace(/\D/g, '');
  const name = (item['Cliente'] || '').trim();
  const service = (item['Serviços'] || '').trim();
  const status = (item['Status'] || '').trim();
  const pro = (item['Profissional'] || '').trim();

  if (phone) {
    const existing = uniqueClients.get(phone);
    if (existing) {
      existing.count += 1;
    } else {
      uniqueClients.set(phone, { name, phone: item['Telefone'], count: 1 });
    }
  }

  uniqueServices.set(service, (uniqueServices.get(service) || 0) + 1);
  uniqueStatuses.set(status, (uniqueStatuses.get(status) || 0) + 1);
  uniquePros.set(pro, (uniquePros.get(pro) || 0) + 1);
});

console.log(`Clientes únicos (por telefone): ${uniqueClients.size}`);
console.log(`\nProfissionais encontrados:`);
for (const [pro, count] of uniquePros.entries()) {
  console.log(`  - ${pro}: ${count} agendamentos`);
}

console.log(`\nStatus encontrados:`);
for (const [status, count] of uniqueStatuses.entries()) {
  console.log(`  - ${status}: ${count}`);
}

console.log(`\nServiços encontrados (${uniqueServices.size}):`);
for (const [service, count] of uniqueServices.entries()) {
  console.log(`  - "${service}": ${count} agendamentos`);
}

// Datas mais antigas e mais recentes
const dates = list
  .map((i) => {
    const parts = (i['Data do atendimento'] || '').split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return '';
  })
  .filter(Boolean)
  .sort();

console.log(`\nPeríodo dos agendamentos:`);
console.log(`  Mais antigo: ${dates[0]}`);
console.log(`  Mais recente: ${dates[dates.length - 1]}`);
