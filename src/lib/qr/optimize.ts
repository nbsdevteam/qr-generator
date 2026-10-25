import type { QrDesign } from '../../types/design';
import { contrastRatio, isLight, mix } from '../color';
import type { RenderJob } from './render';
import { isWeakFinderCombo } from './scene';
import { scanJob } from './scan';

interface Step {
  label: (d: QrDesign) => string;
  /** Returns the adjusted design, or null when this step has nothing left to do. */
  apply: (d: QrDesign, hasImage: boolean, hasLogo: boolean) => QrDesign | null;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

const raiseDots = (limit: number): Step => ({
  label: (d) => `Dot size ${Math.round(d.dots.scale * 100)}%`,
  apply: (d) => (d.dots.scale < limit - 0.001 ? { ...d, dots: { ...d.dots, scale: round2(Math.min(limit, d.dots.scale + 0.1)) } } : null),
});

const raiseOverlay = (limit: number): Step => ({
  label: (d) => `Overlay ${Math.round(d.background.overlayOpacity * 100)}%`,
  apply: (d, hasImage) => {
    if (!hasImage || d.background.overlayOpacity >= limit - 0.001) return null;
    return {
      ...d,
      background: {
        ...d.background,
        overlayColor: d.colors.background,
        overlayOpacity: round2(Math.min(limit, d.background.overlayOpacity + 0.1)),
      },
    };
  },
});

const raiseTint = (limit: number): Step => ({
  label: (d) => `Module contrast ${Math.round(d.background.moduleTint * 100)}%`,
  apply: (d, hasImage) =>
    hasImage && d.background.moduleTint < limit - 0.001
      ? { ...d, background: { ...d.background, moduleTint: round2(Math.min(limit, d.background.moduleTint + 0.15)) } }
      : null,
});

/** Ordered from least to most visible change. */
const STEPS: Step[] = [
  {
    label: () => 'Error correction H',
    apply: (d) => (d.ecc !== 'H' ? { ...d, ecc: 'H' } : null),
  },
  {
    label: () => 'Corner eyes matched to frames',
    apply: (d) =>
      isWeakFinderCombo(d.finders.frameShape, d.finders.eyeShape)
        ? { ...d, finders: { ...d.finders, eyeShape: d.finders.frameShape === 'square' ? 'square' : 'rounded' } }
        : null,
  },
  {
    label: () => 'Quiet zone 2 modules',
    apply: (d) => (d.quietZone < 2 ? { ...d, quietZone: 2 } : null),
  },
  {
    label: () => 'Light dots over image',
    apply: (d, hasImage) => (hasImage && !d.dots.lightDots ? { ...d, dots: { ...d.dots, lightDots: true } } : null),
  },
  {
    label: () => 'Small marker restored',
    apply: (d, hasImage) =>
      hasImage && d.patterns.alignment === 'dots' ? { ...d, patterns: { ...d.patterns, alignment: 'marker' } } : null,
  },
  {
    label: (d) => `Corner blend ${Math.round(d.patterns.cornerBlend * 100)}%`,
    apply: (d, hasImage) =>
      hasImage && d.patterns.cornerBlend > 0.001
        ? { ...d, patterns: { ...d.patterns, cornerBlend: round2(Math.max(0, d.patterns.cornerBlend - 0.15)) } }
        : null,
  },
  {
    label: (d) => `Pattern dot size ${Math.round(d.patterns.dotScale * 100)}%`,
    apply: (d, hasImage) =>
      hasImage && d.patterns.style === 'dots' && d.patterns.dotScale < 0.999
        ? { ...d, patterns: { ...d.patterns, dotScale: round2(Math.min(1, d.patterns.dotScale + 0.1)) } }
        : null,
  },
  {
    label: (d) => `Image-color contrast ${d.imageColor.contrast}`,
    apply: (d, hasImage) =>
      hasImage && d.imageColor.enabled && d.imageColor.contrast < 85
        ? { ...d, imageColor: { ...d.imageColor, contrast: 85 } }
        : null,
  },
  raiseTint(0.3),
  raiseDots(0.55),
  raiseTint(0.5),
  {
    label: () => 'Solid quiet zone',
    apply: (d, hasImage) =>
      hasImage && !d.background.solidQuietZone ? { ...d, background: { ...d.background, solidQuietZone: true } } : null,
  },
  raiseOverlay(0.3),
  {
    label: () => 'Image-color contrast 100',
    apply: (d, hasImage) =>
      hasImage && d.imageColor.enabled && d.imageColor.contrast < 100
        ? { ...d, imageColor: { ...d.imageColor, contrast: 100 } }
        : null,
  },
  {
    label: (d) => `Image blur ${d.background.blur}`,
    apply: (d, hasImage) =>
      hasImage && d.background.blur < 6 ? { ...d, background: { ...d.background, blur: Math.min(6, d.background.blur + 3) } } : null,
  },
  raiseDots(0.8),
  {
    label: (d) => `Logo size ${d.logo.size}%`,
    apply: (d, _hasImage, hasLogo) =>
      hasLogo && d.logo.size > 16 ? { ...d, logo: { ...d.logo, size: Math.max(16, d.logo.size - 4) } } : null,
  },
  raiseOverlay(0.5),
  {
    label: () => 'Stronger colors',
    apply: (d) => {
      const fg = d.colors.foreground;
      const bg = d.colors.background;
      if (contrastRatio(fg, bg) >= 4.5 && !isLight(fg)) return null;
      return {
        ...d,
        colors: {
          ...d.colors,
          foreground: mix(fg, '#000000', 0.6),
          background: isLight(bg) ? bg : mix(bg, '#ffffff', 0.85),
          gradient: { ...d.colors.gradient, color2: mix(d.colors.gradient.color2, '#000000', 0.6) },
        },
        finders: {
          ...d.finders,
          frameColor: mix(d.finders.frameColor, '#000000', 0.6),
          eyeColor: mix(d.finders.eyeColor, '#000000', 0.6),
        },
      };
    },
  },
  {
    label: () => 'Solid timing patterns',
    apply: (d, hasImage) => (hasImage && d.patterns.style === 'dots' ? { ...d, patterns: { ...d.patterns, style: 'solid' } } : null),
  },
  raiseDots(1),
  {
    label: () => 'Image opacity 60%',
    apply: (d, hasImage) =>
      hasImage && d.background.opacity > 0.6 ? { ...d, background: { ...d.background, opacity: 0.6 } } : null,
  },
];

export interface OptimizeResult {
  ok: boolean;
  design: QrDesign;
  changes: string[];
}

export async function optimizeDesign(
  job: RenderJob,
  onProgress?: (attempt: number, label: string) => void,
): Promise<OptimizeResult> {
  const hasImage = Boolean(job.design.background.src && job.assets.background);
  const hasLogo = Boolean(job.design.logo.src && job.assets.logo);
  const test = async (design: QrDesign): Promise<boolean> => {
    return (await scanJob({ ...job, design })).ok;
  };

  let design = job.design;
  if (await test(design)) return { ok: true, design, changes: [] };

  let attempt = 0;
  for (const step of STEPS) {
    for (let guard = 0; guard < 8; guard += 1) {
      const next = step.apply(design, hasImage, hasLogo);
      if (!next) break;
      design = next;
      attempt += 1;
      const label = step.label(design);
      onProgress?.(attempt, label);
      // Yield so the UI can paint progress between attempts.
      await new Promise<void>((r) => window.setTimeout(r, 0));
      if (await test(design)) {
        onProgress?.(attempt, 'Undoing changes that were not needed');
        const pruned = await prune(job.design, design, test);
        return { ok: true, design: pruned.design, changes: pruned.changes };
      }
    }
  }
  return { ok: false, design: job.design, changes: [] };
}

interface Knob {
  label: (d: QrDesign) => string;
  get: (d: QrDesign) => unknown;
  /** Copies this setting from `from` into `d`. */
  copy: (d: QrDesign, from: QrDesign) => QrDesign;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** Settings the optimizer may touch, most visible first — these are reverted first when possible. */
const KNOBS: Knob[] = [
  { label: () => 'Small marker restored', get: (d) => d.patterns.alignment, copy: (d, f) => ({ ...d, patterns: { ...d.patterns, alignment: f.patterns.alignment } }) },
  { label: (d) => `Corner blend ${pct(d.patterns.cornerBlend)}`, get: (d) => d.patterns.cornerBlend, copy: (d, f) => ({ ...d, patterns: { ...d.patterns, cornerBlend: f.patterns.cornerBlend } }) },
  { label: (d) => (d.patterns.style === 'solid' ? 'Solid timing patterns' : 'Dotted timing patterns'), get: (d) => d.patterns.style, copy: (d, f) => ({ ...d, patterns: { ...d.patterns, style: f.patterns.style } }) },
  { label: (d) => `Dot size ${pct(d.dots.scale)}`, get: (d) => d.dots.scale, copy: (d, f) => ({ ...d, dots: { ...d.dots, scale: f.dots.scale } }) },
  {
    label: (d) => `Overlay ${pct(d.background.overlayOpacity)}`,
    get: (d) => `${d.background.overlayOpacity}|${d.background.overlayColor}`,
    copy: (d, f) => ({ ...d, background: { ...d.background, overlayOpacity: f.background.overlayOpacity, overlayColor: f.background.overlayColor } }),
  },
  { label: (d) => `Image opacity ${pct(d.background.opacity)}`, get: (d) => d.background.opacity, copy: (d, f) => ({ ...d, background: { ...d.background, opacity: f.background.opacity } }) },
  { label: (d) => `Image blur ${d.background.blur}`, get: (d) => d.background.blur, copy: (d, f) => ({ ...d, background: { ...d.background, blur: f.background.blur } }) },
  { label: () => 'Stronger colors', get: (d) => JSON.stringify([d.colors, d.finders.frameColor, d.finders.eyeColor]), copy: (d, f) => ({ ...d, colors: f.colors, finders: { ...d.finders, frameColor: f.finders.frameColor, eyeColor: f.finders.eyeColor } }) },
  { label: (d) => `Logo size ${d.logo.size}%`, get: (d) => d.logo.size, copy: (d, f) => ({ ...d, logo: { ...d.logo, size: f.logo.size } }) },
  { label: () => 'Solid quiet zone', get: (d) => d.background.solidQuietZone, copy: (d, f) => ({ ...d, background: { ...d.background, solidQuietZone: f.background.solidQuietZone } }) },
  { label: (d) => `Module contrast ${pct(d.background.moduleTint)}`, get: (d) => d.background.moduleTint, copy: (d, f) => ({ ...d, background: { ...d.background, moduleTint: f.background.moduleTint } }) },
  { label: (d) => `Pattern dot size ${pct(d.patterns.dotScale)}`, get: (d) => d.patterns.dotScale, copy: (d, f) => ({ ...d, patterns: { ...d.patterns, dotScale: f.patterns.dotScale } }) },
  { label: (d) => `Image-color contrast ${d.imageColor.contrast}`, get: (d) => d.imageColor.contrast, copy: (d, f) => ({ ...d, imageColor: { ...d.imageColor, contrast: f.imageColor.contrast } }) },
  { label: () => 'Light dots over image', get: (d) => d.dots.lightDots, copy: (d, f) => ({ ...d, dots: { ...d.dots, lightDots: f.dots.lightDots } }) },
  { label: () => 'Corner eyes matched to frames', get: (d) => d.finders.eyeShape, copy: (d, f) => ({ ...d, finders: { ...d.finders, eyeShape: f.finders.eyeShape } }) },
  { label: () => 'Quiet zone 2 modules', get: (d) => d.quietZone, copy: (d, f) => ({ ...d, quietZone: f.quietZone }) },
  { label: () => 'Error correction H', get: (d) => d.ecc, copy: (d, f) => ({ ...d, ecc: f.ecc }) },
];

/**
 * Steps are applied cumulatively, so some may not have been needed. Try putting each changed
 * setting back to the user's value and keep the revert whenever the code still scans.
 */
async function prune(
  original: QrDesign,
  optimized: QrDesign,
  test: (d: QrDesign) => Promise<boolean>,
): Promise<{ design: QrDesign; changes: string[] }> {
  let design = optimized;
  for (const knob of KNOBS) {
    if (knob.get(design) === knob.get(original)) continue;
    const reverted = knob.copy(design, original);
    if (await test(reverted)) design = reverted;
  }
  const changes = KNOBS.filter((k) => k.get(design) !== k.get(original)).map((k) => k.label(design));
  return { design, changes };
}

export interface BlendResult {
  ok: boolean;
  /** The chosen corner blend (0 – 1). */
  blend: number;
}

/**
 * Finds the most see-through corner backing that still scans, then backs off one step so
 * the result has a safety margin. Returns ok = false if even a solid backing fails.
 */
export async function autoCornerBlend(job: RenderJob, onProgress?: (blend: number) => void): Promise<BlendResult> {
  const MARGIN = 0.15;
  const MAX = 0.9;
  const test = async (blend: number): Promise<boolean> => {
    onProgress?.(blend);
    await new Promise<void>((r) => window.setTimeout(r, 0));
    return (await scanJob({ ...job, design: { ...job.design, patterns: { ...job.design.patterns, cornerBlend: blend } } })).ok;
  };
  // If even solid corners do not scan, the corners are not the problem.
  if (!(await test(0))) return { ok: false, blend: 0 };
  // Binary search for the highest passing blend (scan quality falls as blend rises).
  let lo = 0;
  let hi = MAX;
  if (await test(hi)) lo = hi;
  else {
    while (hi - lo > 0.05) {
      const mid = round2((lo + hi) / 2);
      if (await test(mid)) lo = mid;
      else hi = mid;
    }
  }
  // Step back for a safety margin and make sure that still scans.
  for (let b = round2(Math.max(0, lo - MARGIN)); b > 0.001; b = round2(b - 0.05)) {
    if (await test(b)) return { ok: true, blend: b };
  }
  return { ok: true, blend: 0 };
}
