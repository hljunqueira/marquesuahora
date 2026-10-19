/**
 * Utilitários de Cor para Paletas e Tonalidades da Agenda e Serviços
 * Permite selecionar variações de tom (Mais Claro / Pastel vs. Mais Forte / Sólido).
 */

export interface ColorShades {
  veryLight: string; // Pastel suave (~85% luz)
  light: string;     // Tom mais claro (~70% luz)
  medium: string;    // Tom equilibrado / base (~50% luz)
  strong: string;    // Tom mais forte / vívido (~38% luz)
  veryStrong: string;// Tom bem escuro (~25% luz)
}

/**
 * Converte HEX para HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { h: 210, s: 70, l: 50 }; // Fallback azul neutro
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Converte HSL para HEX
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Gera 5 tons graduais a partir de qualquer cor base:
 * Do mais claro (pastel suave) ao mais forte (sólido/escuro).
 */
export function getColorShades(baseHex: string): ColorShades {
  const { h, s } = hexToHsl(baseHex);
  const safeSat = Math.max(s, 40); // Assegura saturação viva

  return {
    veryLight: hslToHex(h, Math.min(safeSat, 65), 84), // Muito claro / pastel
    light: hslToHex(h, Math.min(safeSat, 75), 70),     // Tom mais claro
    medium: hslToHex(h, safeSat, 50),                   // Tom médio clássico
    strong: hslToHex(h, Math.min(safeSat + 5, 95), 36), // Tom mais forte / vívido
    veryStrong: hslToHex(h, Math.min(safeSat + 10, 100), 24) // Bem escuro / marcante
  };
}

/**
 * Ajusta uma cor para um dos 3 níveis de intensidade
 */
export function adjustColorTone(hex: string, tone: 'LIGHT' | 'MEDIUM' | 'STRONG'): string {
  const shades = getColorShades(hex);
  switch (tone) {
    case 'LIGHT':
      return shades.light;
    case 'STRONG':
      return shades.strong;
    default:
      return shades.medium;
  }
}
