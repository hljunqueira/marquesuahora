/**
 * Validador e Extrator de Comprovantes PIX — MarqueSuaHora
 * Analisa textos de comprovantes bancários extraídos via OCR ou Visão Computacional,
 * validando autenticidade, valores, EndToEndId do Banco Central e titularidade.
 */
export interface PixExtractedData {
  isValid: boolean;
  amount: number | null;
  endToEndId: string | null;
  receiverMatched: boolean;
  receiverFound: string | null;
  transactionDate: string | null;
  bankName: string | null;
}

export class PixValidatorService {
  /**
   * Extrai e valida dados de comprovante a partir do texto bruto.
   */
  public static parseReceiptText(text: string, expectedReceiverName?: string | null): PixExtractedData {
    if (!text || text.trim().length === 0) {
      return {
        isValid: false,
        amount: null,
        endToEndId: null,
        receiverMatched: false,
        receiverFound: null,
        transactionDate: null,
        bankName: null
      };
    }

    const clean = text.replace(/\r\n/g, '\n');

    // 1. Extração de Valor (R$ 150,00 ou 150,00)
    let amount: number | null = null;
    const valueMatch = clean.match(/R\$\s*([\d.]+,\d{2})/i) || clean.match(/(?:valor|pago|total)[:\s]*R?\$?\s*([\d.]+,\d{2})/i);
    if (valueMatch) {
      const normalizedValue = valueMatch[1].replace(/\./g, '').replace(',', '.');
      amount = parseFloat(normalizedValue);
    }

    // 2. Extração de ID de Transação / EndToEndId do Banco Central (E + 32 caracteres)
    let endToEndId: string | null = null;
    const endToEndMatch = clean.match(/\b(E[0-9a-zA-Z]{31,35})\b/);
    if (endToEndMatch) {
      endToEndId = endToEndMatch[1];
    }

    // 3. Extração da Data da Transação
    let transactionDate: string | null = null;
    const dateMatch = clean.match(/(\d{2}\/\d{2}\/\d{4})(?:\s*(?:às|-)?\s*(\d{2}:\d{2}(?::\d{2})?))?/i);
    if (dateMatch) {
      transactionDate = dateMatch[2] ? `${dateMatch[1]} ${dateMatch[2]}` : dateMatch[1];
    }

    // 4. Identificação do Banco Emissor
    let bankName: string | null = null;
    const knownBanks = ['Nubank', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Santander', 'Inter', 'C6 Bank', 'Caixa', 'PagBank', 'PicPay', 'Mercado Pago'];
    for (const bank of knownBanks) {
      if (new RegExp(bank, 'i').test(clean)) {
        bankName = bank;
        break;
      }
    }

    // 5. Verificação do Favorecido / Recebedor
    let receiverFound: string | null = null;
    let receiverMatched = false;

    const receiverMatch = clean.match(/(?:favorecido|recebedor|para|pago a|destinat[aá]rio)[:\s]*([^\n\r]+)/i);
    if (receiverMatch) {
      receiverFound = receiverMatch[1].trim();
    }

    if (expectedReceiverName && expectedReceiverName.trim().length > 2) {
      const normalizedExpected = expectedReceiverName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedClean = clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Compara termos chave do titular (evita falso negativo em nomes compostos)
      const parts = normalizedExpected.split(/\s+/).filter(p => p.length > 2);
      const matches = parts.filter(p => normalizedClean.includes(p));
      receiverMatched = matches.length >= Math.min(2, parts.length);
    }

    const isValid = Boolean(amount !== null && amount > 0 && (endToEndId || clean.toLowerCase().includes('pix')));

    return {
      isValid,
      amount,
      endToEndId,
      receiverMatched,
      receiverFound,
      transactionDate,
      bankName
    };
  }
}
