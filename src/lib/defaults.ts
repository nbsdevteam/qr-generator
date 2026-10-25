import type { DeepPartial, QrDesign } from '../types/design';

export const DEFAULT_DESIGN: QrDesign = {
  version: 1,
  ecc: 'M',
  dots: { shape: 'square', scale: 1, lightDots: true },
  finders: { frameShape: 'square', eyeShape: 'square', frameColor: '#111111', eyeColor: '#111111' },
  patterns: { style: 'dots', dotScale: 0.7, cornerBlend: 0.2, backingShape: 'follow', alignment: 'marker' },
  colors: {
    foreground: '#111111',
    background: '#ffffff',
    transparent: false,
    gradient: { type: 'none', color2: '#2f5bd3', angle: 45 },
  },
  imageColor: { enabled: false, contrast: 60 },
  quietZone: 3,
  border: { width: 0, color: '#111111', radius: 0 },
  frame: {
    style: 'none',
    text: 'Scan me',
    color: '#111111',
    textColor: '#ffffff',
    textSize: 9,
    width: 3,
    radius: 6,
    font: 'sans',
  },
  logo: {
    src: null,
    size: 22,
    padding: 12,
    showBackground: true,
    background: '#ffffff',
    radius: 18,
    clearModules: true,
  },
  background: {
    src: null,
    fit: 'cover',
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    rotation: 0,
    opacity: 1,
    brightness: 100,
    contrast: 100,
    blur: 0,
    grayscale: false,
    overlayColor: '#ffffff',
    overlayOpacity: 0,
    solidQuietZone: false,
    moduleTint: 0,
  },
  exportSize: 1024,
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Deep-merges a partial onto a base, keeping only keys (and value types) the base knows.
 * Used for presets and for safely restoring possibly stale data from localStorage.
 */
export function mergeDeep<T>(base: T, patch: DeepPartial<T> | unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    const bv = (base as Record<string, unknown>)[key];
    const pv = patch[key];
    if (pv === undefined) continue;
    if (isPlainObject(bv)) out[key] = mergeDeep(bv, pv);
    else if (bv === null || pv === null) out[key] = typeof pv === 'string' || pv === null ? pv : bv;
    else if (typeof bv === typeof pv) out[key] = pv;
  }
  return out as T;
}

export function withImages(design: QrDesign, from: QrDesign): QrDesign {
  return {
    ...design,
    logo: { ...design.logo, src: design.logo.src ?? from.logo.src },
    background: { ...design.background, src: design.background.src ?? from.background.src },
  };
}
