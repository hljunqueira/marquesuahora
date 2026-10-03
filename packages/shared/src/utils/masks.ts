/**
 * Utilitários de Máscara Reativa e Sanitização — Marque Sua Hora
 * 
 * Regras:
 * - Nunca trava backspace.
 * - Detecta dinamicamente CPF vs CNPJ pela quantidade de dígitos digitados.
 * - Suporta fixos (10 dígitos) e celulares com 9º dígito (11 dígitos).
 * - Formatação monetária reversível para o tipo Decimal do banco.
 */

/** Remove todos os caracteres não numéricos */
export function onlyDigits(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Máscara dinâmica de Documento Nacional:
 * - Até 11 dígitos: formata como CPF (000.000.000-00)
 * - De 12 a 14 dígitos: formata como CNPJ (00.000.000/0000-00)
 */
export function maskDocument(value: string | null | undefined): string {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    // CPF
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  // CNPJ
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Máscara de Telefone / WhatsApp com DDD:
 * - 10 dígitos: (00) 0000-0000 (Telefone fixo)
 * - 11 dígitos: (00) 00000-0000 (Celular com 9º dígito)
 */
export function maskPhone(value: string | null | undefined): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // 11 dígitos (Celular)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Máscara de CEP: 00000-000
 */
export function maskCep(value: string | null | undefined): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

/**
 * Máscara Monetária BRL: R$ 0,00
 */
export function maskCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'R$ 0,00';

  const num = typeof value === 'number' 
    ? value 
    : parseFloat(value.toString().replace(/\D/g, '')) / 100;

  if (isNaN(num)) return 'R$ 0,00';

  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Converte string formatada monetária de volta para número float
 */
export function unmaskCurrency(formatted: string | null | undefined): number {
  if (!formatted) return 0;
  const digits = onlyDigits(formatted);
  if (!digits) return 0;
  return parseFloat(digits) / 100;
}

export const maskZipCode = maskCep;
export const parseCurrencyToNumber = unmaskCurrency;

/**
 * Máscara de Data: DD/MM/AAAA
 */
export function maskDate(value: string | null | undefined): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}
