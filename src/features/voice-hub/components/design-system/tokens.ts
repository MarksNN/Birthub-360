export function hexToRgb(
  hex: string | null | undefined,
): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function relativeLuminance(hex: string | null | undefined): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = sRGB.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

export function getAccessibleTextOnBrand(
  brandHex: string | null | undefined,
): '#ffffff' | '#000000' {
  if (!brandHex) return '#ffffff';
  const ratioWhite = contrastRatio(brandHex, '#ffffff');
  const ratioBlack = contrastRatio(brandHex, '#000000');
  return ratioWhite >= ratioBlack ? '#ffffff' : '#000000';
}

export function getAccessibleBrandForeground(
  brandHex: string | null | undefined,
  bgHex?: string,
): string {
  if (brandHex === null) return '#000000';
  if (brandHex === undefined)
    return bgHex && relativeLuminance(bgHex) < 0.2 ? '#38bdf8' : '#0369a1';
  if (!hexToRgb(brandHex)) return brandHex;
  const targetBg = bgHex || '#ffffff';
  const ratioCurrent = contrastRatio(brandHex, targetBg);
  if (ratioCurrent >= 4.5) return brandHex;
  const isDark = relativeLuminance(targetBg) < 0.2;
  return isDark ? '#38bdf8' : '#0369a1';
}

export const colors = {
  brand: '#ff5618',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    800: '#1e293b',
    900: '#0f172a',
  },
  light: {
    surface: '#ffffff',
  },
  dark: {
    surface: '#0f172a',
  },
};
