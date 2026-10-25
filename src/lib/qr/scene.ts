import type { FinderEyeShape, FinderFrameShape, QrDesign } from '../../types/design';
import { clampLightness, rgbToHex } from '../color';
import { getRasterPixels, renderBackgroundRaster } from './background';
import { FRAME_FONTS, measureText } from './fonts';
import type { QrMatrix } from './matrix';
import { Role } from './matrix';
import { circlePath, dotPath, eyePath, n, rectPath, ringPath, roundRectPath } from './shapes';

export interface GradientStop {
  offset: number;
  color: string;
}

export type Paint =
  | { kind: 'solid'; color: string }
  | { kind: 'linear'; x1: number; y1: number; x2: number; y2: number; stops: GradientStop[] }
  | { kind: 'radial'; cx: number; cy: number; r: number; stops: GradientStop[] };

export type SceneNode =
  | { kind: 'path'; d: string; paint: Paint; evenOdd: boolean; opacity?: number }
  | { kind: 'raster'; canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }
  | { kind: 'image'; image: HTMLImageElement; href: string; x: number; y: number; w: number; h: number; clip: string | null }
  | {
      kind: 'text';
      text: string;
      x: number;
      y: number;
      size: number;
      family: string;
      weight: number;
      color: string;
      /** Defaults: centered horizontally, vertically centered on y. */
      align?: 'center' | 'left' | 'right';
      baseline?: 'middle' | 'alphabetic';
    }
  | { kind: 'clip'; d: string; children: SceneNode[] };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneLayout {
  width: number;
  height: number;
  /** The QR area: background image / color, quiet zone and modules. */
  code: Rect;
  codeRadius: number;
  cell: number;
  matrixX: number;
  matrixY: number;
}

/** Anything the canvas and SVG renderers can draw. */
export interface PaintableScene {
  width: number;
  height: number;
  nodes: SceneNode[];
  /** Clockwise rotation applied to the whole picture on output. */
  rotation?: 0 | 90 | 180 | 270;
}

export interface Scene extends PaintableScene {
  layout: SceneLayout;
}

export interface SceneAssets {
  background: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

const solid = (color: string): Paint => ({ kind: 'solid', color });

/**
 * Scanners locate a finder by the 1:1:3:1:1 run ratio, measured across and diagonally.
 * Mixing shapes (e.g. a round eye in a square frame) skews the diagonal ratio, so the eye
 * is resized per combination. Values were tuned against jsQR at several scales.
 */
const EYE_SCALE: Record<FinderFrameShape, Record<FinderEyeShape, number>> = {
  square: { square: 1, rounded: 1.1, circle: 1.2, diamond: 1.15 },
  rounded: { square: 0.95, rounded: 1, circle: 1.1, diamond: 1.05 },
  circle: { square: 0.85, rounded: 1, circle: 1, diamond: 1 },
};

/** Frame/eye pairs that scan noticeably worse even after resizing. */
export function isWeakFinderCombo(frame: FinderFrameShape, eye: FinderEyeShape): boolean {
  return (eye === 'diamond' && frame !== 'circle') || (eye === 'circle' && frame === 'square');
}

interface FrameGeometry {
  /** Relative units: QR area = 1. */
  outerW: number;
  outerH: number;
  cardX: number;
  cardY: number;
  textY: number;
  textMaxW: number;
  build: (px: number, ox: number, oy: number) => SceneNode[];
}

/**
 * Lays out the frame around the card (border + QR area). All values are relative to the
 * QR area size so the same design renders identically at any export width.
 */
function frameGeometry(design: QrDesign, cardSize: number, cardRadius: number): FrameGeometry | null {
  const fr = design.frame;
  if (fr.style === 'none') return null;
  const f = Math.max(0.006, fr.width / 100);
  const t = fr.textSize / 100;
  const hasText = fr.text.trim().length > 0;
  const radius = fr.radius / 100;

  const card = (px: number, ox: number, oy: number, x: number, y: number): string =>
    roundRectPath(ox + x * px, oy + y * px, cardSize * px, cardSize * px, cardRadius * px);

  switch (fr.style) {
    case 'banner-bottom':
    case 'banner-top': {
      const band = hasText ? t * 2.1 : 0;
      const outerW = cardSize + 2 * f;
      const outerH = cardSize + 2 * f + band;
      const top = fr.style === 'banner-top';
      const cardY = top ? f + band : f;
      const textY = top ? (band + f) / 2 : f + cardSize + (band + f) / 2;
      return {
        outerW,
        outerH,
        cardX: f,
        cardY,
        textY,
        textMaxW: outerW - 2 * f - t,
        build: (px, ox, oy) => [
          {
            kind: 'path',
            d: roundRectPath(ox, oy, outerW * px, outerH * px, radius * px) + card(px, ox, oy, f, cardY),
            paint: solid(fr.color),
            evenOdd: true,
          },
        ],
      };
    }
    case 'outline': {
      const pad = 0.035 + f * 0.5;
      const band = hasText ? t * 2.0 : 0;
      const outerW = cardSize + 2 * (f + pad);
      const outerH = outerW + band;
      const textY = f + pad + cardSize + (band + pad) / 2;
      return {
        outerW,
        outerH,
        cardX: f + pad,
        cardY: f + pad,
        textY,
        textMaxW: outerW - 2 * (f + pad),
        build: (px, ox, oy) => {
          const nodes: SceneNode[] = [];
          const innerR = Math.max(0, radius - f) * px;
          if (!design.colors.transparent) {
            nodes.push({
              kind: 'path',
              d: roundRectPath(ox + f * px, oy + f * px, (outerW - 2 * f) * px, (outerH - 2 * f) * px, innerR),
              paint: solid(design.colors.background),
              evenOdd: false,
            });
          }
          nodes.push({
            kind: 'path',
            d:
              roundRectPath(ox, oy, outerW * px, outerH * px, radius * px) +
              roundRectPath(ox + f * px, oy + f * px, (outerW - 2 * f) * px, (outerH - 2 * f) * px, innerR),
            paint: solid(fr.color),
            evenOdd: true,
          });
          return nodes;
        },
      };
    }
    case 'pill':
    case 'bubble': {
      const ringW = cardSize + 2 * f;
      const isBubble = fr.style === 'bubble';
      const pointer = isBubble ? Math.max(0.025, t * 0.55) : 0;
      const gap = hasText ? (isBubble ? pointer + 0.012 : 0.04) : 0;
      const labelH = hasText ? t * 2.2 : 0;
      const outerW = ringW;
      const outerH = ringW + gap + labelH;
      const textY = ringW + gap + labelH / 2;
      return {
        outerW,
        outerH,
        cardX: f,
        cardY: f,
        textY,
        textMaxW: outerW - t * 1.6,
        build: (px, ox, oy) => {
          const nodes: SceneNode[] = [
            {
              kind: 'path',
              d: roundRectPath(ox, oy, ringW * px, ringW * px, radius * px) + card(px, ox, oy, f, f),
              paint: solid(fr.color),
              evenOdd: true,
            },
          ];
          if (!hasText) return nodes;
          const ly = oy + (ringW + gap) * px;
          if (isBubble) {
            const cx = ox + (outerW / 2) * px;
            const pw = pointer * 1.1 * px;
            const tri = `M${n(cx - pw)} ${n(ly + 1)}L${n(cx)} ${n(ly - pointer * px)}L${n(cx + pw)} ${n(ly + 1)}z`;
            nodes.push({
              kind: 'path',
              d: roundRectPath(ox, ly, outerW * px, labelH * px, Math.min(radius, labelH / 2) * px) + tri,
              paint: solid(fr.color),
              evenOdd: false,
            });
          } else {
            const textW = measureText(fr.text, fr.font, t * px) / px;
            const pillW = Math.min(outerW, textW + t * 2.4);
            nodes.push({
              kind: 'path',
              d: roundRectPath(ox + ((outerW - pillW) / 2) * px, ly, pillW * px, labelH * px, (labelH / 2) * px),
              paint: solid(fr.color),
              evenOdd: false,
            });
          }
          return nodes;
        },
      };
    }
  }
}

function dotsPaint(design: QrDesign, x: number, y: number, size: number): Paint {
  const { foreground, gradient } = design.colors;
  if (gradient.type === 'none') return solid(foreground);
  const stops: GradientStop[] = [
    { offset: 0, color: foreground },
    { offset: 1, color: gradient.color2 },
  ];
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (gradient.type === 'radial') return { kind: 'radial', cx, cy, r: size * 0.72, stops };
  const a = (gradient.angle * Math.PI) / 180;
  const h = size / 2;
  // Extend so the gradient covers the corners at any angle.
  const ext = h * (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
  return {
    kind: 'linear',
    x1: cx - Math.cos(a) * ext,
    y1: cy - Math.sin(a) * ext,
    x2: cx + Math.cos(a) * ext,
    y2: cy + Math.sin(a) * ext,
    stops,
  };
}

/** Average color in the central part of a cell from the background raster. */
function sampleCell(pixels: ImageData, x: number, y: number, cell: number): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const { width, height, data } = pixels;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const px = Math.min(width - 1, Math.max(0, Math.floor(x + cell * (0.3 + i * 0.2))));
      const py = Math.min(height - 1, Math.max(0, Math.floor(y + cell * (0.3 + j * 0.2))));
      const k = (py * width + px) * 4;
      r += data[k] ?? 0;
      g += data[k + 1] ?? 0;
      b += data[k + 2] ?? 0;
      count += 1;
    }
  }
  return { r: r / count, g: g / count, b: b / count };
}

export interface BuildOptions {
  /** Output width in px. Height follows from the frame. */
  width: number;
}

export function buildScene(design: QrDesign, matrix: QrMatrix, assets: SceneAssets, opts: BuildOptions): Scene {
  const size = matrix.size;
  const qz = Math.max(0, Math.round(design.quietZone));
  const b = Math.max(0, design.border.width / 100);
  const cardSize = 1 + 2 * b;
  const cardRadius = Math.min(cardSize / 2, design.border.radius / 100);
  const frame = frameGeometry(design, cardSize, cardRadius);
  const margin = frame ? 0.02 : 0;
  const outerW = (frame ? frame.outerW : cardSize) + 2 * margin;
  const outerH = (frame ? frame.outerH : cardSize) + 2 * margin;
  const px = opts.width / outerW;
  const width = opts.width;
  const height = Math.round(outerH * px);

  const ox = margin * px;
  const oy = margin * px;
  const cardX = ox + (frame ? frame.cardX : 0) * px;
  const cardY = oy + (frame ? frame.cardY : 0) * px;
  const codeX = cardX + b * px;
  const codeY = cardY + b * px;
  const codeSize = px;
  const codeRadius = Math.max(0, cardRadius - b) * px;
  const cell = codeSize / (size + 2 * qz);
  const mx = codeX + qz * cell;
  const my = codeY + qz * cell;

  const nodes: SceneNode[] = [];
  if (frame) nodes.push(...frame.build(px, ox, oy));

  if (b > 0) {
    nodes.push({
      kind: 'path',
      d:
        roundRectPath(cardX, cardY, cardSize * px, cardSize * px, cardRadius * px) +
        roundRectPath(codeX, codeY, codeSize, codeSize, codeRadius),
      paint: solid(design.border.color),
      evenOdd: true,
    });
  }

  // ----- QR area -----
  const code: SceneNode[] = [];
  const { colors } = design;
  const bgImage = design.background.src ? assets.background : null;
  const light = colors.background;

  if (!colors.transparent) {
    code.push({ kind: 'path', d: rectPath(codeX, codeY, codeSize, codeSize), paint: solid(light), evenOdd: false });
  }

  const rasterSize = Math.min(2400, Math.round(codeSize));
  let pixels: ImageData | null = null;
  if (bgImage) {
    code.push({
      kind: 'raster',
      canvas: renderBackgroundRaster(bgImage, design.background, rasterSize),
      x: codeX,
      y: codeY,
      w: codeSize,
      h: codeSize,
    });
    if (design.imageColor.enabled) pixels = getRasterPixels(bgImage, design.background, rasterSize);
  }
  const rasterScale = rasterSize / codeSize;

  // Logo reservation.
  const logo = design.logo;
  const logoImg = logo.src ? assets.logo : null;
  const matrixPx = size * cell;
  const logoSize = (Math.max(5, Math.min(40, logo.size)) / 100) * matrixPx;
  const logoBox = logoSize * (1 + (2 * Math.max(0, logo.padding)) / 100);
  const lcx = mx + matrixPx / 2;
  const lcy = my + matrixPx / 2;
  const clearSize = logoImg && logo.clearModules ? (logo.showBackground ? logoBox : logoSize) : 0;
  const clearX0 = lcx - clearSize / 2;
  const clearY0 = lcy - clearSize / 2;
  const isCleared = (r: number, c: number): boolean => {
    if (clearSize <= 0) return false;
    const x = mx + c * cell;
    const y = my + r * cell;
    const inset = cell * 0.15;
    return x + cell - inset > clearX0 && x + inset < clearX0 + clearSize && y + cell - inset > clearY0 && y + inset < clearY0 + clearSize;
  };

  // Protected light areas behind function patterns keep contrast over a photo.
  const protectLight = Boolean(bgImage);
  const lightParts: string[] = [];
  const darkParts: string[] = [];
  const tintDark: string[] = [];
  const tintLight: string[] = [];
  const tint = bgImage ? Math.max(0, Math.min(1, design.background.moduleTint)) : 0;
  const protectedDark: string[] = [];
  const colored = new Map<string, string[]>();
  const coloredLight = new Map<string, string[]>();
  const boost = Math.max(0, Math.min(100, design.imageColor.contrast)) / 100;
  const darkMaxL = 0.45 - boost * 0.37;
  const lightMinL = 0.62 + boost * 0.33;

  const scale = Math.max(0.15, Math.min(1, design.dots.scale));
  const drawLightDots = Boolean(bgImage) && design.dots.lightDots;

  const patterns = design.patterns;
  const patternDots = protectLight && patterns.style === 'dots';
  const patternScale = Math.max(0.3, Math.min(1, patterns.dotScale));
  const blend = Math.max(0, Math.min(0.95, patterns.cornerBlend));
  const followShape = patterns.backingShape === 'follow';
  const finderShape = design.finders.frameShape;
  // Over an image the small alignment marker can be drawn as dots so it blends in.
  const alignmentDots = patternDots && patterns.alignment === 'dots';

  // Light backing behind corner markers and alignment patterns. A one-module light ring on
  // every side of each finder — including the side facing the quiet zone — keeps the
  // 1:1:3:1:1 pattern from merging with dark image pixels. "Corner blend" makes it partly
  // see-through (a frosted look) instead of solid.
  const backingParts: string[] = [];
  const backing = (x: number, y: number, sz: number): string => {
    if (!followShape || finderShape === 'square') return rectPath(x, y, sz, sz);
    if (finderShape === 'circle') return circlePath(x + sz / 2, y + sz / 2, sz / 2);
    return roundRectPath(x, y, sz, sz, sz * 0.3);
  };
  if (protectLight) {
    for (const [fr, fc] of matrix.finders) backingParts.push(backing(mx + (fc - 1) * cell, my + (fr - 1) * cell, 9 * cell));
    if (!alignmentDots) {
      for (const [ar, ac] of matrix.alignments) backingParts.push(backing(mx + (ac - 2) * cell, my + (ar - 2) * cell, 5 * cell));
    }
  }

  const pushColored = (map: Map<string, string[]>, color: string, d: string): void => {
    const list = map.get(color);
    if (list) list.push(d);
    else map.set(color, [d]);
  };
  const q = (v: number): number => Math.round(v / 6) * 6;

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const idx = r * size + c;
      const role = matrix.role[idx];
      if (role === Role.Finder || role === Role.Separator) continue;
      if (role === Role.Alignment && !alignmentDots) continue;
      const isDark = matrix.dark[idx] === 1;
      const x = mx + c * cell;
      const y = my + r * cell;

      if (role === Role.Timing || role === Role.Format || role === Role.Version || role === Role.Alignment) {
        if (patternDots) {
          // Drawn like the other dots (light ones always), so no solid strip forms.
          const d = dotPath(design.dots.shape, x, y, cell, patternScale);
          if (pixels) {
            const s = sampleCell(pixels, (x - codeX) * rasterScale, (y - codeY) * rasterScale, cell * rasterScale);
            const adj = isDark ? clampLightness(s, 0, darkMaxL) : clampLightness(s, lightMinL, 1);
            pushColored(isDark ? colored : coloredLight, rgbToHex({ r: q(adj.r), g: q(adj.g), b: q(adj.b) }), d);
          } else if (isDark) protectedDark.push(d);
          else lightParts.push(d);
          continue;
        }
        if (protectLight) lightParts.push(rectPath(x, y, cell, cell));
        if (isDark) protectedDark.push(protectLight ? rectPath(x, y, cell, cell) : dotPath(design.dots.shape, x, y, cell, 1));
        continue;
      }

      if (isCleared(r, c)) continue;
      if (tint > 0) (isDark ? tintDark : tintLight).push(rectPath(x, y, cell, cell));

      if (pixels && (isDark || drawLightDots)) {
        const s = sampleCell(pixels, (x - codeX) * rasterScale, (y - codeY) * rasterScale, cell * rasterScale);
        const adj = isDark ? clampLightness(s, 0, darkMaxL) : clampLightness(s, lightMinL, 1);
        const hex = rgbToHex({ r: q(adj.r), g: q(adj.g), b: q(adj.b) });
        pushColored(isDark ? colored : coloredLight, hex, dotPath(design.dots.shape, x, y, cell, scale));
        continue;
      }

      if (isDark) darkParts.push(dotPath(design.dots.shape, x, y, cell, scale));
      else if (drawLightDots) lightParts.push(dotPath(design.dots.shape, x, y, cell, scale));
    }
  }

  // The quiet zone is made of light modules too: over a photo it gets light dots (or a
  // solid light band) so scanners can find the edge of the code.
  if (bgImage && qz > 0) {
    if (design.background.solidQuietZone) {
      const m = qz * cell;
      lightParts.push(
        rectPath(codeX, codeY, codeSize, m) +
          rectPath(codeX, codeY + codeSize - m, codeSize, m) +
          rectPath(codeX, codeY + m, m, codeSize - 2 * m) +
          rectPath(codeX + codeSize - m, codeY + m, m, codeSize - 2 * m),
      );
    } else if (drawLightDots) {
      for (let r = -qz; r < size + qz; r += 1) {
        for (let c = -qz; c < size + qz; c += 1) {
          if (r >= 0 && r < size && c >= 0 && c < size) continue;
          const x = mx + c * cell;
          const y = my + r * cell;
          if (pixels) {
            const s = sampleCell(pixels, (x - codeX) * rasterScale, (y - codeY) * rasterScale, cell * rasterScale);
            const adj = clampLightness(s, lightMinL, 1);
            pushColored(coloredLight, rgbToHex({ r: q(adj.r), g: q(adj.g), b: q(adj.b) }), dotPath(design.dots.shape, x, y, cell, scale));
          } else {
            lightParts.push(dotPath(design.dots.shape, x, y, cell, scale));
          }
        }
      }
    }
  }

  if (tint > 0) {
    // Bias the photo under every module toward its target so the module average reads correctly.
    if (tintDark.length) code.push({ kind: 'path', d: tintDark.join(''), paint: solid(colors.foreground), evenOdd: false, opacity: tint });
    if (tintLight.length) code.push({ kind: 'path', d: tintLight.join(''), paint: solid(light), evenOdd: false, opacity: tint });
  }

  if (backingParts.length) {
    code.push({ kind: 'path', d: backingParts.join(''), paint: solid(light), evenOdd: false, opacity: blend > 0 ? 1 - blend : undefined });
  }

  if (lightParts.length) code.push({ kind: 'path', d: lightParts.join(''), paint: solid(light), evenOdd: false });
  for (const [color, parts] of coloredLight) code.push({ kind: 'path', d: parts.join(''), paint: solid(color), evenOdd: false });

  const paint = dotsPaint(design, mx, my, matrixPx);
  if (darkParts.length) code.push({ kind: 'path', d: darkParts.join(''), paint, evenOdd: false });
  for (const [color, parts] of colored) code.push({ kind: 'path', d: parts.join(''), paint: solid(color), evenOdd: false });
  if (protectedDark.length) {
    code.push({ kind: 'path', d: protectedDark.join(''), paint: pixels ? solid(colors.foreground) : paint, evenOdd: false });
  }

  // Finder patterns and alignment patterns.
  const { finders } = design;
  const rings: string[] = [];
  const eyes: string[] = [];
  for (const [fr, fc] of matrix.finders) {
    const x = mx + fc * cell;
    const y = my + fr * cell;
    rings.push(ringPath(finders.frameShape, x, y, 7 * cell, cell));
    const eye = 3 * cell * EYE_SCALE[finders.frameShape][finders.eyeShape];
    eyes.push(eyePath(finders.eyeShape, x + 3.5 * cell - eye / 2, y + 3.5 * cell - eye / 2, eye));
  }
  for (const [ar, ac] of alignmentDots ? [] : matrix.alignments) {
    const x = mx + (ac - 2) * cell;
    const y = my + (ar - 2) * cell;
    rings.push(ringPath(finders.frameShape, x, y, 5 * cell, cell));
    eyes.push(eyePath(finders.eyeShape, x + 2 * cell, y + 2 * cell, cell));
  }
  // Each ring is drawn as its own sub-path pair; even-odd keeps the holes open.
  code.push({ kind: 'path', d: rings.join(''), paint: solid(finders.frameColor), evenOdd: true });
  code.push({ kind: 'path', d: eyes.join(''), paint: solid(finders.eyeColor), evenOdd: false });

  // Logo.
  if (logoImg) {
    const radiusPct = Math.max(0, Math.min(50, logo.radius)) / 100;
    if (logo.showBackground) {
      code.push({
        kind: 'path',
        d: roundRectPath(lcx - logoBox / 2, lcy - logoBox / 2, logoBox, logoBox, logoBox * radiusPct),
        paint: solid(logo.background),
        evenOdd: false,
      });
    }
    const iw = logoImg.naturalWidth || logoImg.width || 1;
    const ih = logoImg.naturalHeight || logoImg.height || 1;
    const k = Math.min(logoSize / iw, logoSize / ih);
    const w = iw * k;
    const h = ih * k;
    const x = lcx - w / 2;
    const y = lcy - h / 2;
    code.push({
      kind: 'image',
      image: logoImg,
      href: logo.src ?? '',
      x,
      y,
      w,
      h,
      clip: radiusPct > 0 ? roundRectPath(x, y, w, h, Math.min(w, h) * radiusPct) : null,
    });
  }

  nodes.push({ kind: 'clip', d: roundRectPath(codeX, codeY, codeSize, codeSize, codeRadius), children: code });

  // Frame text.
  if (frame && design.frame.text.trim()) {
    const fr = design.frame;
    let fontPx = (fr.textSize / 100) * px;
    const maxW = frame.textMaxW * px;
    const measured = measureText(fr.text, fr.font, fontPx);
    if (measured > maxW && measured > 0) fontPx *= maxW / measured;
    const font = FRAME_FONTS[fr.font];
    nodes.push({
      kind: 'text',
      text: fr.text,
      x: ox + (frame.outerW / 2) * px,
      y: oy + frame.textY * px,
      size: fontPx,
      family: font.family,
      weight: font.weight,
      color: fr.style === 'outline' ? fr.color : fr.textColor,
    });
  }

  return {
    width,
    height,
    nodes,
    layout: { width, height, code: { x: codeX, y: codeY, w: codeSize, h: codeSize }, codeRadius, cell, matrixX: mx, matrixY: my },
  };
}
