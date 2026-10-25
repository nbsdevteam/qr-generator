import type { BarcodeContent, BarcodeDesign, BarcodeTemplate, CaptionSettings, Symbology } from '../../types/barcode';
import type { DeepPartial } from '../../types/design';
import { mergeDeep } from '../defaults';
import { readJson, writeJson } from '../storage';
import { SYMBOLOGIES } from './symbologies';

const caption = (over: Partial<CaptionSettings> = {}): CaptionSettings => ({
  text: '',
  font: 'sans',
  sizePt: 8,
  bold: true,
  color: '#111111',
  align: 'center',
  ...over,
});

export const DEFAULT_BARCODE_DESIGN: BarcodeDesign = {
  version: 1,
  bars: {
    color: '#111111',
    gradient: { type: 'none', color2: '#1f5fe0', angle: 0 },
    roundness: 0,
    reduction: 0,
    moduleShape: 'square',
    moduleScale: 1,
  },
  size: { xDimMm: 0.33, barHeightMm: 22.85, quietZone: 11, quietZone2d: 2, paddingMm: 1.5 },
  text: {
    show: true,
    show2d: false,
    override: '',
    position: 'below',
    align: 'center',
    font: 'mono',
    sizePt: 9,
    bold: false,
    color: '#111111',
    gapMm: 0.4,
    letterSpacingMm: 0,
    guardMarks: false,
  },
  top: caption(),
  bottom: caption({ bold: false, sizePt: 7 }),
  card: {
    background: '#ffffff',
    transparent: false,
    borderWidthMm: 0,
    borderColor: '#111111',
    radiusMm: 0,
    bearer: 'none',
    bearerWidth: 4,
  },
  rotation: 0,
  dpi: 600,
};

const values = Object.fromEntries(SYMBOLOGIES.map((s) => [s.id, s.sample])) as Record<Symbology, string>;

export const DEFAULT_BARCODE_CONTENT: BarcodeContent = {
  symbology: 'ean13',
  values,
  addon: '',
  includeCheck: false,
};

const preset = (id: string, name: string, patch: DeepPartial<BarcodeDesign>): BarcodeTemplate => ({
  id,
  name,
  builtIn: true,
  createdAt: 0,
  design: mergeDeep(DEFAULT_BARCODE_DESIGN, patch),
});

/** Built-in barcode styles. Scannable as shipped; they never change your data. */
export const BARCODE_PRESETS: BarcodeTemplate[] = [
  preset('retail', 'Retail standard', {}),
  preset('gold-label', 'Gold label', {
    bars: { color: '#3d2c0c', gradient: { type: 'linear', color2: '#7a5714', angle: 90 } },
    text: { font: 'serif', color: '#3d2c0c', sizePt: 9 },
    top: { text: 'NOOR AL-NIBRAS', font: 'serif', color: '#7a5714', sizePt: 9 },
    card: { background: '#fbf3df', borderWidthMm: 0.5, borderColor: '#b8892f', radiusMm: 2 },
    size: { paddingMm: 2.5 },
  }),
  preset('soft-rounded', 'Soft rounded', {
    bars: { color: '#1b2a4a', roundness: 50, reduction: 6, moduleShape: 'circle', moduleScale: 0.9 },
    text: { font: 'display', color: '#1b2a4a', bold: true, sizePt: 9, letterSpacingMm: 0.3 },
    card: { background: '#eef3ff', radiusMm: 3 },
    size: { paddingMm: 2.5 },
  }),
  preset('carton', 'Shipping carton', {
    size: { xDimMm: 0.5, barHeightMm: 32, quietZone: 10 },
    text: { font: 'mono', sizePt: 11, bold: true },
    card: { bearer: 'box', bearerWidth: 4.8 },
  }),
  preset('night', 'Night label', {
    bars: { color: '#0b0b0b' },
    text: { font: 'sans', color: '#d9b25f', bold: true },
    top: { text: 'RIVO', font: 'display', color: '#d9b25f', sizePt: 10 },
    card: { background: '#ffffff', borderWidthMm: 1.6, borderColor: '#0b0b0b', radiusMm: 2.5 },
    size: { paddingMm: 2 },
  }),
];

const KEYS = {
  design: 'qra.barcode.design.v1',
  content: 'qra.barcode.content.v1',
  templates: 'qra.barcode.templates.v1',
} as const;

export function loadBarcodeDesign(): BarcodeDesign {
  return mergeDeep(DEFAULT_BARCODE_DESIGN, readJson(KEYS.design));
}

export function loadBarcodeContent(): BarcodeContent {
  const merged = mergeDeep(DEFAULT_BARCODE_CONTENT, readJson(KEYS.content));
  // Unknown symbology ids from older data fall back to the default.
  return SYMBOLOGIES.some((s) => s.id === merged.symbology) ? merged : { ...merged, symbology: DEFAULT_BARCODE_CONTENT.symbology };
}

export function loadBarcodeTemplates(): BarcodeTemplate[] {
  const raw = readJson(KEYS.templates);
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const t = item as Record<string, unknown>;
    if (typeof t.id !== 'string' || typeof t.name !== 'string') return [];
    return [{ id: t.id, name: t.name, builtIn: false, createdAt: typeof t.createdAt === 'number' ? t.createdAt : 0, design: mergeDeep(DEFAULT_BARCODE_DESIGN, t.design) }];
  });
}

export const saveBarcodeDesign = (d: BarcodeDesign): boolean => writeJson(KEYS.design, d);
export const saveBarcodeContent = (c: BarcodeContent): boolean => writeJson(KEYS.content, c);
export const saveBarcodeTemplates = (t: BarcodeTemplate[]): boolean => writeJson(KEYS.templates, t);
