import type { BarcodeDesign, CaptionSettings, TextAlign } from '../../types/barcode';
import type { FrameFont } from '../../types/design';
import { FRAME_FONTS } from '../qr/fonts';
import type { Paint, PaintableScene, SceneNode } from '../qr/scene';
import { dotPath, rectPath, roundRectPath } from '../qr/shapes';
import type { EncodedBarcode, EncodedLinear } from './encode';

/**
 * Builds a drawable scene from an encoded barcode. Layout happens in modules (1 = the
 * X-dimension, y pointing down), then everything is scaled by `pxPerModule`.
 */

const PT_TO_MM = 25.4 / 72;
/** Cap height of digits as a fraction of the font size, for most text faces. */
const CAP = 0.72;

const solid = (color: string): Paint => ({ kind: 'solid', color });

let measureCtx: CanvasRenderingContext2D | null = null;
/** Text width in "em" (width at font size 1). */
function measureEm(text: string, font: FrameFont, bold: boolean): number {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 0.6;
  measureCtx.font = `${bold ? 700 : 400} 100px ${FRAME_FONTS[font].family}`;
  return measureCtx.measureText(text).width / 100;
}

interface TextRun {
  text: string;
  /** Anchor x in modules (meaning depends on align). */
  x: number;
  /** Alphabetic baseline in modules. */
  y: number;
  /** Font size in modules. */
  size: number;
  font: FrameFont;
  bold: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  /** Bars or modules, in modules. */
  marks: Array<Rect & { radius: number; shape: 'rect' | 'dot' }>;
  bearers: Rect[];
  texts: TextRun[];
  /** Area covered by the bars (for gradients). */
  barsBox: Rect;
  /** Full drawing, including quiet zones and padding. */
  box: Rect;
}

function textBounds(t: TextRun): Rect {
  const w = measureEm(t.text, t.font, t.bold) * t.size;
  const x = t.align === 'left' ? t.x : t.align === 'right' ? t.x - w : t.x - w / 2;
  return { x, y: t.y - t.size * CAP, w, h: t.size * (CAP + 0.22) };
}

/** Lays out a single line of text across [x0, x1], with letter spacing and justify. */
function lineRuns(
  text: string,
  x0: number,
  x1: number,
  baseline: number,
  base: Omit<TextRun, 'text' | 'x' | 'y' | 'align'>,
  align: TextAlign,
  spacing: number,
): TextRun[] {
  if (!text) return [];
  const chars = [...text];
  if (align !== 'justify' && spacing <= 0.001) {
    const x = align === 'left' ? x0 : align === 'right' ? x1 : (x0 + x1) / 2;
    return [{ ...base, text, x, y: baseline, align }];
  }
  const widths = chars.map((c) => measureEm(c, base.font, base.bold) * base.size);
  const natural = widths.reduce((a, b) => a + b, 0);
  let gap = spacing;
  let start: number;
  if (align === 'justify' && chars.length > 1) {
    gap = Math.max(0, (x1 - x0 - natural) / (chars.length - 1));
    start = x0;
  } else {
    const total = natural + spacing * (chars.length - 1);
    start = align === 'left' ? x0 : align === 'right' ? x1 - total : (x0 + x1 - total) / 2;
  }
  const runs: TextRun[] = [];
  let x = start;
  chars.forEach((c, i) => {
    runs.push({ ...base, text: c, x, y: baseline, align: 'left' });
    x += (widths[i] ?? 0) + gap;
  });
  return runs;
}

function union(a: Rect | null, b: Rect): Rect {
  if (!a) return { ...b };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

function linearLayout(design: BarcodeDesign, enc: EncodedLinear, mm: (v: number) => number): Omit<Layout, 'box'> & { content: Rect } {
  const { bars: barSet, text } = design;
  const H = enc.height;
  const size = mm(text.sizePt * PT_TO_MM);
  const gap = mm(text.gapMm);
  const cap = size * CAP;
  const showText = text.show;
  const bearerW = design.card.bearer !== 'none' ? Math.max(0.5, design.card.bearerWidth) : 0;
  const reduce = Math.max(0, Math.min(0.45, barSet.reduction / 100));
  const textBelow = !enc.retail ? text.position === 'below' : true;

  const marks: Layout['marks'] = [];
  const addonTop = Math.max(0, ...enc.bars.filter((b) => b.addon).map((b) => b.top));
  // Retail guards reach half way into the digits.
  const guardExt = showText ? gap + cap * 0.5 : 5;
  for (const b of enc.bars) {
    let top = H - b.top;
    let bottom = H - b.bottom;
    if (b.bottom < -0.01) bottom = H + guardExt;
    const w = Math.max(0.05, b.w - reduce);
    const x = b.x + (b.w - w) / 2;
    marks.push({ x, y: top, w, h: Math.max(0.1, bottom - top), radius: (barSet.roundness / 100) * w, shape: 'rect' });
  }

  const texts: TextRun[] = [];
  const base = { font: text.font, bold: text.bold, color: text.color };
  let content: Rect = { x: 0, y: 0, w: enc.width, h: H };

  if (showText && enc.retail) {
    for (const d of enc.retail) {
      if (d.mark && !text.guardMarks) continue;
      const s = size * (d.rel / 12);
      // Add-on digits sit above the (shorter) add-on bars; main digits sit below the bars.
      const y = d.addon ? H - addonTop - gap : H + gap + cap;
      texts.push({ ...base, text: d.text, x: d.cx, y, size: s, align: 'center' });
    }
  } else if (showText) {
    const value = text.override.trim() || enc.humanText;
    const below = textBelow;
    const offset = bearerW;
    const baseline = below ? H + offset + gap + cap : -offset - gap;
    texts.push(...lineRuns(value, 0, enc.width, baseline, { ...base, size }, text.align, mm(text.letterSpacingMm)));
  }

  for (const t of texts) content = union(content, textBounds(t));
  for (const m of marks) content = union(content, m);

  return { marks, bearers: [], texts, barsBox: { x: 0, y: 0, w: enc.width, h: H }, content };
}

function captionRuns(c: CaptionSettings, x0: number, x1: number, baseline: number, mm: (v: number) => number): TextRun[] {
  if (!c.text.trim()) return [];
  const size = mm(c.sizePt * PT_TO_MM);
  return lineRuns(c.text.trim(), x0, x1, baseline, { size, font: c.font, bold: c.bold, color: c.color }, c.align, 0);
}

export interface BarcodeScene extends PaintableScene {
  /** Pixels per module actually used. */
  pxPerModule: number;
  /** Size of the unrotated drawing in modules. */
  widthModules: number;
  heightModules: number;
}

/** Lays out the barcode in modules. Separate from scaling so preview and export share it. */
export function layoutBarcode(design: BarcodeDesign, enc: EncodedBarcode): Layout {
  const x = Math.max(0.05, design.size.xDimMm);
  const mm = (v: number): number => v / x;

  let partial: Omit<Layout, 'box'> & { content: Rect };
  let quiet: number;
  if (enc.kind === 'linear') {
    partial = linearLayout(design, enc, mm);
    quiet = Math.max(0, design.size.quietZone);
  } else {
    const shape = design.bars.moduleShape;
    const scale = Math.max(0.3, Math.min(1, design.bars.moduleScale));
    const marks: Layout['marks'] = [];
    for (let r = 0; r < enc.rows; r += 1) {
      for (let c = 0; c < enc.cols; c += 1) {
        if (!enc.cells[r * enc.cols + c]) continue;
        marks.push({ x: c, y: r, w: 1, h: 1, radius: scale, shape: shape === 'square' && scale >= 0.999 ? 'rect' : 'dot' });
      }
    }
    const t = design.text;
    const size = mm(t.sizePt * PT_TO_MM);
    const gap = mm(t.gapMm);
    const texts: TextRun[] = [];
    if (t.show2d) {
      const value = t.override.trim() || enc.humanText;
      const baseline = t.position === 'below' ? enc.rows + gap + size * CAP : -gap;
      texts.push(...lineRuns(value, 0, enc.cols, baseline, { size, font: t.font, bold: t.bold, color: t.color }, t.align, mm(t.letterSpacingMm)));
    }
    let content: Rect = { x: 0, y: 0, w: enc.cols, h: enc.rows };
    for (const tr of texts) content = union(content, textBounds(tr));
    partial = { marks, bearers: [], texts, barsBox: { x: 0, y: 0, w: enc.cols, h: enc.rows }, content };
    quiet = Math.max(0, design.size.quietZone2d);
  }

  const { barsBox } = partial;
  let content = partial.content;
  // Quiet zones are measured from the bars, but never cut into text.
  const left = Math.min(barsBox.x - quiet, content.x - 1);
  const right = Math.max(barsBox.x + barsBox.w + quiet, content.x + content.w + 1);
  const quietVertical = enc.kind === '2d' ? quiet : 0;
  content = { x: left, y: Math.min(content.y, -quietVertical), w: right - left, h: 0 };
  content.h = Math.max(partial.content.y + partial.content.h, barsBox.y + barsBox.h + quietVertical) - content.y;

  // Bearer bars (linear only): along the top and bottom of the bars, optionally boxed.
  const bearers: Rect[] = [];
  if (enc.kind === 'linear' && design.card.bearer !== 'none') {
    const bw = Math.max(0.5, design.card.bearerWidth);
    const bx = left;
    const bwid = right - left;
    bearers.push({ x: bx, y: -bw, w: bwid, h: bw }, { x: bx, y: barsBox.h, w: bwid, h: bw });
    if (design.card.bearer === 'box') {
      bearers.push({ x: bx - bw, y: -bw, w: bw, h: barsBox.h + 2 * bw }, { x: right, y: -bw, w: bw, h: barsBox.h + 2 * bw });
    }
    for (const b of bearers) content = union(content, b);
  }

  // Captions above and below.
  const texts = [...partial.texts];
  const pad = mm(design.size.paddingMm);
  const topSize = mm(design.top.sizePt * PT_TO_MM);
  const bottomSize = mm(design.bottom.sizePt * PT_TO_MM);
  if (design.top.text.trim()) {
    const runs = captionRuns(design.top, content.x + 1, content.x + content.w - 1, content.y - topSize * 0.45, mm);
    texts.push(...runs);
    for (const r of runs) content = union(content, textBounds(r));
  }
  if (design.bottom.text.trim()) {
    const runs = captionRuns(design.bottom, content.x + 1, content.x + content.w - 1, content.y + content.h + bottomSize * (CAP + 0.45), mm);
    texts.push(...runs);
    for (const r of runs) content = union(content, textBounds(r));
  }

  const border = mm(design.card.borderWidthMm);
  const box = { x: content.x - border, y: content.y - pad - border, w: content.w + 2 * border, h: content.h + 2 * pad + 2 * border };
  return { ...partial, bearers, texts, box };
}

function barsPaint(design: BarcodeDesign, box: Rect, k: number, ox: number, oy: number): Paint {
  const g = design.bars.gradient;
  if (g.type === 'none') return solid(design.bars.color);
  const stops = [
    { offset: 0, color: design.bars.color },
    { offset: 1, color: g.color2 },
  ];
  const cx = ox + (box.x + box.w / 2) * k;
  const cy = oy + (box.y + box.h / 2) * k;
  if (g.type === 'radial') return { kind: 'radial', cx, cy, r: (Math.max(box.w, box.h) * k) / 1.6, stops };
  const a = (g.angle * Math.PI) / 180;
  const ext = ((box.w * k) / 2) * Math.abs(Math.cos(a)) + ((box.h * k) / 2) * Math.abs(Math.sin(a));
  return { kind: 'linear', x1: cx - Math.cos(a) * ext, y1: cy - Math.sin(a) * ext, x2: cx + Math.cos(a) * ext, y2: cy + Math.sin(a) * ext, stops };
}

/** Scales a layout to pixels. */
export function sceneFromLayout(design: BarcodeDesign, layout: Layout, pxPerModule: number): BarcodeScene {
  const k = pxPerModule;
  const { box } = layout;
  const ox = -box.x * k;
  const oy = -box.y * k;
  const X = (v: number): number => ox + v * k;
  const Y = (v: number): number => oy + v * k;
  const width = Math.max(1, Math.round(box.w * k));
  const height = Math.max(1, Math.round(box.h * k));
  const nodes: SceneNode[] = [];
  const card = design.card;
  const radius = (card.radiusMm / design.size.xDimMm) * k;
  const border = (card.borderWidthMm / design.size.xDimMm) * k;

  if (!card.transparent) {
    nodes.push({ kind: 'path', d: roundRectPath(0, 0, width, height, radius), paint: solid(card.background), evenOdd: false });
  }
  if (border > 0) {
    nodes.push({
      kind: 'path',
      d: roundRectPath(0, 0, width, height, radius) + roundRectPath(border, border, width - 2 * border, height - 2 * border, Math.max(0, radius - border)),
      paint: solid(card.borderColor),
      evenOdd: true,
    });
  }

  if (layout.bearers.length) {
    nodes.push({ kind: 'path', d: layout.bearers.map((b) => rectPath(X(b.x), Y(b.y), b.w * k, b.h * k)).join(''), paint: solid(design.bars.color), evenOdd: false });
  }

  const parts: string[] = [];
  for (const m of layout.marks) {
    if (m.shape === 'dot') parts.push(dotPath(design.bars.moduleShape, X(m.x), Y(m.y), k, m.radius));
    else parts.push(m.radius > 0.001 ? roundRectPath(X(m.x), Y(m.y), m.w * k, m.h * k, m.radius * k) : rectPath(X(m.x), Y(m.y), m.w * k, m.h * k));
  }
  if (parts.length) nodes.push({ kind: 'path', d: parts.join(''), paint: barsPaint(design, layout.barsBox, k, ox, oy), evenOdd: false });

  for (const t of layout.texts) {
    const f = FRAME_FONTS[t.font];
    nodes.push({
      kind: 'text',
      text: t.text,
      x: X(t.x),
      y: Y(t.y),
      size: t.size * k,
      family: f.family,
      weight: t.bold ? 700 : 400,
      color: t.color,
      align: t.align,
      baseline: 'alphabetic',
    });
  }

  return { width, height, nodes, rotation: design.rotation, pxPerModule: k, widthModules: box.w, heightModules: box.h };
}

/** Pixels per module for printing at the design's DPI, snapped to whole pixels for crisp bars. */
export function printPxPerModule(design: BarcodeDesign): number {
  return Math.max(1, Math.round((design.size.xDimMm / 25.4) * design.dpi));
}

/** Real physical size of a print export, in mm, after pixel snapping. */
export function printSizeMm(design: BarcodeDesign, layout: Layout): { w: number; h: number; xDim: number } {
  const k = printPxPerModule(design);
  const pxToMm = 25.4 / design.dpi;
  const swap = design.rotation === 90 || design.rotation === 270;
  const w = Math.round(layout.box.w * k) * pxToMm;
  const h = Math.round(layout.box.h * k) * pxToMm;
  return { w: swap ? h : w, h: swap ? w : h, xDim: k * pxToMm };
}

export type { Layout as BarcodeLayout };
