'use client';

import React, { ChangeEvent, InputHTMLAttributes } from 'react';
import {
  maskDocument,
  maskPhone,
  maskZipCode,
  maskCurrency,
  maskDate,
  onlyDigits,
  parseCurrencyToNumber
} from '@marquesuahora/shared';

export type MaskType = 'document' | 'phone' | 'cep' | 'currency' | 'date';

export interface InputMaskProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: MaskType;
  value: string;
  onChangeValue: (formatted: string, raw: string, numericVal?: number) => void;
  onComplete?: (raw: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
}

export const InputMask: React.FC<InputMaskProps> = ({
  mask,
  value,
  onChangeValue,
  onComplete,
  label,
  error,
  helperText,
  className = '',
  placeholder,
  disabled,
  required,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    let formatted = '';
    let raw = '';
    let numVal: number | undefined;

    switch (mask) {
      case 'document': {
        formatted = maskDocument(rawInput);
        raw = onlyDigits(formatted);
        if ((raw.length === 11 || raw.length === 14) && onComplete) {
          onComplete(raw);
        }
        break;
      }
      case 'phone': {
        formatted = maskPhone(rawInput);
        raw = onlyDigits(formatted);
        if ((raw.length === 10 || raw.length === 11) && onComplete) {
          onComplete(raw);
        }
        break;
      }
      case 'cep': {
        formatted = maskZipCode(rawInput);
        raw = onlyDigits(formatted);
        if (raw.length === 8 && onComplete) {
          onComplete(raw);
        }
        break;
      }
      case 'currency': {
        formatted = maskCurrency(rawInput);
        raw = onlyDigits(formatted);
        numVal = parseCurrencyToNumber(formatted);
        break;
      }
      case 'date': {
        formatted = maskDate(rawInput);
        raw = onlyDigits(formatted);
        if (raw.length === 8 && onComplete) {
          onComplete(raw);
        }
        break;
      }
      default:
        formatted = rawInput;
        raw = rawInput;
    }

    onChangeValue(formatted, raw, numVal);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-wide uppercase text-slate-600 flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-brand-purple">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        <input
          {...props}
          id={inputId}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-white text-slate-900 border rounded-xl text-sm font-medium transition-all duration-200 outline-none
            ${
              error
                ? 'border-brand-danger focus:ring-2 focus:ring-brand-danger/20'
                : 'border-slate-200 hover:border-slate-300 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20'
            }
            ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'shadow-sm'}
            ${mask === 'currency' || mask === 'date' ? 'font-mono' : ''}
            ${className}`}
        />
      </div>

      {error ? (
        <p className="text-xs text-brand-danger font-medium animate-fadeIn">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
