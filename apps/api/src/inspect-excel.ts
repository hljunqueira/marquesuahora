import * as XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve(__dirname, '../../../docs/Agendamentos-Emanuelle.xlsx');
console.log('Lendo arquivo:', filePath);

const workbook = XLSX.readFile(filePath);
console.log('Planilhas encontradas:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n========================================`);
  console.log(`Planilha: ${sheetName}`);
  console.log(`========================================`);
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total de linhas: ${json.length}`);
  if (json.length > 0) {
    console.log('Cabeçalhos (Linha 1):', json[0]);
    console.log('Amostra Linha 2:', json[1]);
    console.log('Amostra Linha 3:', json[2]);
    console.log('Amostra Linha 4:', json[3]);
  }
});
