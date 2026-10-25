import type { DotShape, FinderEyeShape, FinderFrameShape } from '../../types/design';

/** Compact number formatting for SVG path data. */
export const n = (v: number): string => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

export function rectPath(x: number, y: number, w: number, h: number): string {
  return `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;
}

export function roundRectPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r <= 0.01) return rectPath(x, y, w, h);
  const iw = w - 2 * r;
  const ih = h - 2 * r;
  return (
    `M${n(x + r)} ${n(y)}h${n(iw)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(ih)}` +
    `a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(-iw)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}` +
    `v${n(-ih)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}z`
  );
}

export function circlePath(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0z`;
}

export function diamondPath(cx: number, cy: number, r: number): string {
  return `M${n(cx)} ${n(cy - r)}L${n(cx + r)} ${n(cy)}L${n(cx)} ${n(cy + r)}L${n(cx - r)} ${n(cy)}z`;
}

/** One data module drawn inside its cell, shrunk by `scale` around the cell center. */
export function dotPath(shape: DotShape, x: number, y: number, cell: number, scale: number): string {
  const s = cell * scale;
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  switch (shape) {
    case 'square':
      return rectPath(cx - s / 2, cy - s / 2, s, s);
    case 'rounded':
      return roundRectPath(cx - s / 2, cy - s / 2, s, s, s * 0.32);
    case 'circle':
      return circlePath(cx, cy, s / 2);
    case 'diamond':
      return diamondPath(cx, cy, (s / 2) * 1.08);
  }
}

/** Square ring (outer minus inner) — fill with even-odd. */
export function ringPath(
  shape: FinderFrameShape,
  x: number,
  y: number,
  size: number,
  thickness: number,
): string {
  const ix = x + thickness;
  const iy = y + thickness;
  const isz = size - 2 * thickness;
  switch (shape) {
    case 'square':
      return rectPath(x, y, size, size) + rectPath(ix, iy, isz, isz);
    case 'rounded': {
      const r = size * 0.3;
      return roundRectPath(x, y, size, size, r) + roundRectPath(ix, iy, isz, isz, Math.max(r - thickness, thickness * 0.35));
    }
    case 'circle':
      return circlePath(x + size / 2, y + size / 2, size / 2) + circlePath(x + size / 2, y + size / 2, isz / 2);
  }
}

/** Inner eye of a finder (or the center of an alignment pattern). */
export function eyePath(shape: FinderEyeShape, x: number, y: number, size: number): string {
  const cx = x + size / 2;
  const cy = y + size / 2;
  switch (shape) {
    case 'square':
      return rectPath(x, y, size, size);
    case 'rounded':
      return roundRectPath(x, y, size, size, size * 0.3);
    case 'circle':
      return circlePath(cx, cy, size / 2);
    case 'diamond':
      return diamondPath(cx, cy, (size / 2) * 1.2);
  }
}
