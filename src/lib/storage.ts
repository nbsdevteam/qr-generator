import type { ContentState } from '../types/content';
import type { DesignTemplate, QrDesign } from '../types/design';
import { DEFAULT_DESIGN, mergeDeep } from './defaults';
import { DEFAULT_CONTENT } from './payload';

export const KEYS = {
  theme: 'qra.theme',
  design: 'qra.design.v1',
  content: 'qra.content.v1',
  templates: 'qra.templates.v1',
  recentColors: 'qra.recentColors.v1',
} as const;

/** Data URLs above this length are not persisted (localStorage is usually ~5 MB per site). */
export const MAX_STORED_IMAGE_CHARS = 1_200_000;

export type SaveOutcome = 'saved' | 'saved-without-images' | 'failed';

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22)
  );
}

export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): 'ok' | 'quota' | 'error' {
  try {
    localStorage.setItem(key, value);
    return 'ok';
  } catch (err) {
    return isQuotaError(err) ? 'quota' : 'error';
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return writeRaw(key, JSON.stringify(value)) === 'ok';
}

const keepImage = (src: string | null): string | null => (src && src.length <= MAX_STORED_IMAGE_CHARS ? src : null);

export function stripImages(design: QrDesign): QrDesign {
  return {
    ...design,
    logo: { ...design.logo, src: null },
    background: { ...design.background, src: null },
  };
}

/** Saves a design, dropping oversize images first and retrying without images on quota errors. */
export function saveDesignTo(key: string, design: QrDesign): SaveOutcome {
  const trimmed: QrDesign = {
    ...design,
    logo: { ...design.logo, src: keepImage(design.logo.src) },
    background: { ...design.background, src: keepImage(design.background.src) },
  };
  const droppedOversize = trimmed.logo.src !== design.logo.src || trimmed.background.src !== design.background.src;
  const first = writeRaw(key, JSON.stringify(trimmed));
  if (first === 'ok') return droppedOversize ? 'saved-without-images' : 'saved';
  if (first === 'quota') {
    return writeRaw(key, JSON.stringify(stripImages(trimmed))) === 'ok' ? 'saved-without-images' : 'failed';
  }
  return 'failed';
}

export function loadDesign(): QrDesign | null {
  const raw = readJson(KEYS.design);
  return raw ? mergeDeep(DEFAULT_DESIGN, raw) : null;
}

export function loadContent(): ContentState | null {
  const raw = readJson(KEYS.content);
  return raw ? mergeDeep(DEFAULT_CONTENT, raw) : null;
}

export function loadTemplates(): DesignTemplate[] {
  const raw = readJson(KEYS.templates);
  if (!Array.isArray(raw)) return [];
  const out: DesignTemplate[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const t = item as Record<string, unknown>;
    if (typeof t.id !== 'string' || typeof t.name !== 'string') continue;
    out.push({
      id: t.id,
      name: t.name,
      builtIn: false,
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
      design: mergeDeep(DEFAULT_DESIGN, t.design),
    });
  }
  return out;
}

/** Templates are saved as a list; on quota errors, images are dropped from the newest first. */
export function saveTemplates(templates: DesignTemplate[]): SaveOutcome {
  const trimmed = templates.map((t) => ({
    ...t,
    design: {
      ...t.design,
      logo: { ...t.design.logo, src: keepImage(t.design.logo.src) },
      background: { ...t.design.background, src: keepImage(t.design.background.src) },
    },
  }));
  if (writeRaw(KEYS.templates, JSON.stringify(trimmed)) === 'ok') return 'saved';
  const noImages = trimmed.map((t) => ({ ...t, design: stripImages(t.design) }));
  return writeRaw(KEYS.templates, JSON.stringify(noImages)) === 'ok' ? 'saved-without-images' : 'failed';
}

export function loadRecentColors(): string[] {
  const raw = readJson(KEYS.recentColors);
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string').slice(0, 14) : [];
}
