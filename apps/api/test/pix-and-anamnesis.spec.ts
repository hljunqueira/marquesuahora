import { describe, it, expect } from 'vitest';
import { PixValidatorService } from '../src/modules/automation/pix-validator.service';
import { AnamnesisAnalyzerService } from '../src/modules/clients/anamnesis-analyzer.service';

describe('Validação de Comprovantes PIX e Anamnese Clínica (TypeSafe JEV)', () => {
  describe('1. PixValidatorService', () => {
    it('deve extrair valor, EndToEndId e banco de comprovante do Nubank', () => {
      const receiptText = `
        Comprovante de Transferência Pix
        Nubank
        Valor: R$ 65,00
        Data: 18/10/2026 às 14:32:10
        Para: Studio Elegance Estética Ltda
        ID da Transação: E18236120202610181432ABCDEF123456
      `;

      const result = PixValidatorService.parseReceiptText(receiptText, 'Studio Elegance');

      expect(result.isValid).toBe(true);
      expect(result.amount).toBe(65);
      expect(result.bankName).toBe('Nubank');
      expect(result.endToEndId).toBe('E18236120202610181432ABCDEF123456');
      expect(result.receiverMatched).toBe(true);
      expect(result.transactionDate).toContain('18/10/2026');
    });

    it('deve identificar quando o recebedor do comprovante não bate com o salão', () => {
      const receiptText = `
        Comprovante Pix
        Valor: R$ 50,00
        Para: Posto de Gasolina Silva
        ID: E99999999999999999999999999999999
      `;

      const result = PixValidatorService.parseReceiptText(receiptText, 'Studio Elegance');

      expect(result.isValid).toBe(true);
      expect(result.receiverMatched).toBe(false);
    });

    it('deve invalidar texto vazio ou sem dados bancários', () => {
      const result = PixValidatorService.parseReceiptText('');
      expect(result.isValid).toBe(false);
      expect(result.amount).toBeNull();
    });
  });

  describe('2. AnamnesisAnalyzerService', () => {
    it('deve gerar alertas clínicos de alta prioridade para alergia a gel e diabetes', () => {
      const anamnesis = {
        hasAllergies: true,
        allergyGel: true,
        diabetes: true,
        chemicalContactWithoutGloves: true
      };

      const alerts = AnamnesisAnalyzerService.analyze(anamnesis);

      expect(alerts.length).toBe(3);
      expect(alerts.some(a => a.code === 'ALLERGY_GEL' && a.severity === 'HIGH')).toBe(true);
      expect(alerts.some(a => a.code === 'DIABETES' && a.severity === 'HIGH')).toBe(true);
      expect(alerts.some(a => a.code === 'CHEMICAL_SENSITIVITY')).toBe(true);
    });

    it('deve retornar lista vazia quando a cliente não reportar contraindicações', () => {
      const anamnesis = {
        hasAllergies: false,
        diabetes: false,
        mycosis: false
      };

      const alerts = AnamnesisAnalyzerService.analyze(anamnesis);
      expect(alerts.length).toBe(0);
    });
  });
});
