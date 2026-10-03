import { describe, it, expect } from 'vitest';
import {
  onlyDigits,
  maskDocument,
  maskPhone,
  maskCep,
  maskCurrency,
  unmaskCurrency,
  maskDate
} from './masks';

describe('Utilitários de Máscaras Reativas — Marque Sua Hora', () => {
  describe('onlyDigits', () => {
    it('deve extrair apenas números de strings com pontuação e caracteres', () => {
      expect(onlyDigits('123.456.789-00')).toBe('12345678900');
      expect(onlyDigits('(11) 98765-4321')).toBe('11987654321');
      expect(onlyDigits('abc-123_xyz')).toBe('123');
    });

    it('deve lidar de forma segura com valores nulos ou vazios', () => {
      expect(onlyDigits('')).toBe('');
      expect(onlyDigits(null)).toBe('');
      expect(onlyDigits(undefined)).toBe('');
    });
  });

  describe('maskDocument (Dinâmico CPF / CNPJ)', () => {
    it('deve formatar CPF até 11 dígitos', () => {
      expect(maskDocument('12345678901')).toBe('123.456.789-01');
      expect(maskDocument('123456')).toBe('123.456');
    });

    it('deve formatar CNPJ a partir do 12º dígito', () => {
      expect(maskDocument('12345678000195')).toBe('12.345.678/0001-95');
    });

    it('deve truncar dígitos excedentes em 14 caracteres', () => {
      expect(maskDocument('12345678000195999')).toBe('12.345.678/0001-95');
    });
  });

  describe('maskPhone (Fixo 10 dígitos vs Celular 11 dígitos)', () => {
    it('deve formatar celular com 11 dígitos e 9º dígito', () => {
      expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    });

    it('deve formatar telefone fixo com 10 dígitos', () => {
      expect(maskPhone('1134567890')).toBe('(11) 3456-7890');
    });

    it('deve formatar parcialmente durante a digitação', () => {
      expect(maskPhone('11')).toBe('(11');
      expect(maskPhone('11987')).toBe('(11) 987');
    });
  });

  describe('maskCep', () => {
    it('deve formatar CEP com 8 dígitos', () => {
      expect(maskCep('01310100')).toBe('01310-100');
    });
  });

  describe('maskCurrency & unmaskCurrency', () => {
    it('deve formatar valor numérico para Moeda BRL', () => {
      expect(maskCurrency(50)).toBe('R$\u00A050,00');
      expect(maskCurrency(135.5)).toBe('R$\u00A0135,50');
    });

    it('deve converter string digitada em centavos para Moeda BRL', () => {
      expect(maskCurrency('5000')).toBe('R$\u00A050,00');
      expect(maskCurrency('13550')).toBe('R$\u00A0135,50');
    });

    it('deve desmascarar string formatada de volta para número', () => {
      expect(unmaskCurrency('R$ 50,00')).toBe(50);
      expect(unmaskCurrency('R$ 135,50')).toBe(135.5);
      expect(unmaskCurrency('')).toBe(0);
    });
  });

  describe('maskDate', () => {
    it('deve formatar data DD/MM/AAAA', () => {
      expect(maskDate('15081995')).toBe('15/08/1995');
      expect(maskDate('1508')).toBe('15/08');
    });
  });
});
