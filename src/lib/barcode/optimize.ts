import type { BarcodeDesign } from '../../types/barcode';
import { contrastRatio, isLight, mix } from '../color';
import { prepareBarcode, type BarcodeJob } from './render';
import { scanBarcode } from './scan';

interface Step {
  label: string;
  apply: (d: BarcodeDesign) => BarcodeDesign | null;
  /** Put this setting back from the original design (used to undo unneeded steps). */
  revert: (d: BarcodeDesign, original: BarcodeDesign) => BarcodeDesign;
  changed: (d: BarcodeDesign, original: BarcodeDesign) => boolean;
}

const STEPS: Step[] = [
  {
    label: 'Bar width reduction off',
    apply: (d) => (d.bars.reduction > 0 ? { ...d, bars: { ...d.bars, reduction: 0 } } : null),
    revert: (d, o) => ({ ...d, bars: { ...d.bars, reduction: o.bars.reduction } }),
    changed: (d, o) => d.bars.reduction !== o.bars.reduction,
  },
  {
    label: 'Square modules at full size',
    apply: (d) =>
      d.bars.moduleShape !== 'square' || d.bars.moduleScale < 1 ? { ...d, bars: { ...d.bars, moduleShape: 'square', moduleScale: 1 } } : null,
    revert: (d, o) => ({ ...d, bars: { ...d.bars, moduleShape: o.bars.moduleShape, moduleScale: o.bars.moduleScale } }),
    changed: (d, o) => d.bars.moduleShape !== o.bars.moduleShape || d.bars.moduleScale !== o.bars.moduleScale,
  },
  {
    label: 'Less bar rounding',
    apply: (d) => (d.bars.roundness > 0 ? { ...d, bars: { ...d.bars, roundness: d.bars.roundness > 20 ? 20 : 0 } } : null),
    revert: (d, o) => ({ ...d, bars: { ...d.bars, roundness: o.bars.roundness } }),
    changed: (d, o) => d.bars.roundness !== o.bars.roundness,
  },
  {
    label: 'Standard quiet zone',
    apply: (d) =>
      d.size.quietZone < 10 || d.size.quietZone2d < 2
        ? { ...d, size: { ...d.size, quietZone: Math.max(10, d.size.quietZone), quietZone2d: Math.max(2, d.size.quietZone2d) } }
        : null,
    revert: (d, o) => ({ ...d, size: { ...d.size, quietZone: o.size.quietZone, quietZone2d: o.size.quietZone2d } }),
    changed: (d, o) => d.size.quietZone !== o.size.quietZone || d.size.quietZone2d !== o.size.quietZone2d,
  },
  {
    label: 'Solid bar color',
    apply: (d) => (d.bars.gradient.type !== 'none' ? { ...d, bars: { ...d.bars, gradient: { ...d.bars.gradient, type: 'none' } } } : null),
    revert: (d, o) => ({ ...d, bars: { ...d.bars, gradient: o.bars.gradient } }),
    changed: (d, o) => d.bars.gradient.type !== o.bars.gradient.type,
  },
  {
    label: 'Stronger colors',
    apply: (d) => {
      const bg = d.card.background;
      if (contrastRatio(d.bars.color, bg) >= 7 && isLight(bg)) return null;
      return {
        ...d,
        bars: { ...d.bars, color: mix(d.bars.color, '#000000', 0.7) },
        card: { ...d.card, background: isLight(bg) ? bg : mix(bg, '#ffffff', 0.9), transparent: false },
      };
    },
    revert: (d, o) => ({ ...d, bars: { ...d.bars, color: o.bars.color }, card: { ...d.card, background: o.card.background, transparent: o.card.transparent } }),
    changed: (d, o) => d.bars.color !== o.bars.color || d.card.background !== o.card.background,
  },
];

export interface BarcodeOptimizeResult {
  ok: boolean;
  design: BarcodeDesign;
  changes: string[];
}

export async function optimizeBarcode(job: BarcodeJob, onProgress?: (label: string) => void): Promise<BarcodeOptimizeResult> {
  const test = async (design: BarcodeDesign): Promise<boolean> => {
    const prepared = prepareBarcode({ ...job, design });
    return (await scanBarcode(design, job.content, prepared.encoded)).verdict === 'ok';
  };
  const original = job.design;
  if (await test(original)) return { ok: true, design: original, changes: [] };

  let design = original;
  let ok = false;
  for (const step of STEPS) {
    const next = step.apply(design);
    if (!next) continue;
    design = next;
    onProgress?.(step.label);
    await new Promise<void>((r) => window.setTimeout(r, 0));
    if (await test(design)) {
      ok = true;
      break;
    }
  }
  if (!ok) return { ok: false, design: original, changes: [] };

  // Undo any step that turned out not to be needed.
  onProgress?.('Undoing changes that were not needed');
  for (const step of STEPS) {
    if (!step.changed(design, original)) continue;
    const reverted = step.revert(design, original);
    if (await test(reverted)) design = reverted;
  }
  return { ok: true, design, changes: STEPS.filter((s) => s.changed(design, original)).map((s) => s.label) };
}
