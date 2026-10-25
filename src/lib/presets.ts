import type { DeepPartial, DesignTemplate, QrDesign } from '../types/design';
import { DEFAULT_DESIGN, mergeDeep } from './defaults';

const preset = (id: string, name: string, patch: DeepPartial<QrDesign>): DesignTemplate => ({
  id,
  name,
  builtIn: true,
  createdAt: 0,
  design: mergeDeep(DEFAULT_DESIGN, patch),
});

/** Built-in styles. They never carry images, so applying one keeps your uploads. */
export const BUILT_IN_TEMPLATES: DesignTemplate[] = [
  preset('classic', 'Classic', {}),
  preset('gold-luxe', 'Gold Luxe', {
    ecc: 'Q',
    dots: { shape: 'rounded', scale: 0.9 },
    finders: { frameShape: 'rounded', eyeShape: 'rounded', frameColor: '#8a6418', eyeColor: '#5c420f' },
    colors: {
      foreground: '#7a5714',
      background: '#fffaf0',
      gradient: { type: 'linear', color2: '#9a6f1e', angle: 135 },
    },
    border: { width: 3, color: '#c99a3c', radius: 8 },
    frame: { style: 'banner-bottom', text: 'Scan me', color: '#1a160e', textColor: '#e8c47a', width: 3, radius: 9, font: 'serif' },
  }),
  preset('ocean-blue', 'Ocean Blue', {
    dots: { shape: 'circle', scale: 0.86 },
    finders: { frameShape: 'circle', eyeShape: 'circle', frameColor: '#0b3d91', eyeColor: '#1d72e8' },
    colors: {
      foreground: '#0b3d91',
      background: '#ffffff',
      gradient: { type: 'radial', color2: '#1d9be8', angle: 0 },
    },
    frame: { style: 'pill', text: 'Scan to visit', color: '#0b3d91', textColor: '#ffffff', width: 1.2, radius: 8 },
  }),
  preset('rounded-soft', 'Rounded Soft', {
    dots: { shape: 'rounded', scale: 0.82 },
    finders: { frameShape: 'rounded', eyeShape: 'circle', frameColor: '#3a3550', eyeColor: '#7b61d9' },
    colors: { foreground: '#3a3550', background: '#f6f3ff' },
    border: { width: 0, radius: 10 },
    quietZone: 3,
    frame: { style: 'bubble', text: 'Scan me', color: '#3a3550', textColor: '#f6f3ff', width: 1.2, radius: 10, font: 'display' },
  }),
  preset('image-halftone', 'Image Halftone', {
    ecc: 'H',
    dots: { shape: 'circle', scale: 0.5, lightDots: true },
    finders: { frameShape: 'rounded', eyeShape: 'rounded', frameColor: '#111111', eyeColor: '#111111' },
    colors: { foreground: '#111111', background: '#ffffff' },
    imageColor: { enabled: true, contrast: 70 },
    quietZone: 2,
    border: { width: 0, radius: 6 },
    background: { overlayColor: '#ffffff', overlayOpacity: 0.08, contrast: 110 },
  }),
];
