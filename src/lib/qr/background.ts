import type { BackgroundSettings } from '../../types/design';

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  return ctx;
}

let filterSupport: boolean | null = null;

/** Functional check: some browsers expose ctx.filter but ignore it. */
export function supportsCanvasFilter(): boolean {
  if (filterSupport !== null) return filterSupport;
  try {
    const ctx = get2d(createCanvas(2, 2));
    ctx.filter = 'brightness(0)';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
    filterSupport = (ctx.getImageData(0, 0, 1, 1).data[0] ?? 255) < 20;
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

/** Pixel fallback for browsers without ctx.filter (brightness / contrast / grayscale). */
function applyManualAdjustments(ctx: CanvasRenderingContext2D, size: number, bg: BackgroundSettings): void {
  if (bg.brightness === 100 && bg.contrast === 100 && !bg.grayscale) return;
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const br = bg.brightness / 100;
  const ct = bg.contrast / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] ?? 0;
    let g = d[i + 1] ?? 0;
    let b = d[i + 2] ?? 0;
    if (bg.grayscale) {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = y;
      g = y;
      b = y;
    }
    r = (r * br - 128) * ct + 128;
    g = (g * br - 128) * ct + 128;
    b = (b * br - 128) * ct + 128;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

/** Cheap blur fallback: downscale then upscale with smoothing. */
function applyManualBlur(canvas: HTMLCanvasElement, blurPx: number): void {
  if (blurPx < 0.5) return;
  const factor = Math.min(24, 1 + blurPx / 1.5);
  const small = createCanvas(canvas.width / factor, canvas.height / factor);
  const sctx = get2d(small);
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  const ctx = get2d(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
}

const imageIds = new WeakMap<HTMLImageElement, number>();
let nextImageId = 1;
function imageId(img: HTMLImageElement): number {
  let id = imageIds.get(img);
  if (id === undefined) {
    id = nextImageId;
    nextImageId += 1;
    imageIds.set(img, id);
  }
  return id;
}

interface CachedRaster {
  canvas: HTMLCanvasElement;
  pixels: ImageData | null;
}
const cache = new Map<string, CachedRaster>();
const CACHE_LIMIT = 6;

function rasterKey(img: HTMLImageElement, bg: BackgroundSettings, size: number): string {
  const { src: _src, ...rest } = bg;
  void _src;
  return `${imageId(img)}|${size}|${JSON.stringify(rest)}`;
}

/**
 * Renders the background image (fit, offset, zoom, rotation, filters, opacity) plus the
 * overlay tint into a square canvas covering the QR area.
 */
export function renderBackgroundRaster(img: HTMLImageElement, bg: BackgroundSettings, sizePx: number): HTMLCanvasElement {
  return getRaster(img, bg, sizePx).canvas;
}

function getRaster(img: HTMLImageElement, bg: BackgroundSettings, sizePx: number): CachedRaster {
  const size = Math.max(1, Math.round(sizePx));
  const key = rasterKey(img, bg, size);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const out = createCanvas(size, size);
  const octx = get2d(out);
  const layer = createCanvas(size, size);
  const lctx = get2d(layer);

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const base = bg.fit === 'cover' ? Math.max(size / iw, size / ih) : Math.min(size / iw, size / ih);
  const scale = base * bg.zoom;
  const blurPx = (bg.blur * size) / 1000;
  const useFilter = supportsCanvasFilter();

  if (useFilter) {
    const parts: string[] = [];
    if (bg.brightness !== 100) parts.push(`brightness(${bg.brightness}%)`);
    if (bg.contrast !== 100) parts.push(`contrast(${bg.contrast}%)`);
    if (bg.grayscale) parts.push('grayscale(1)');
    if (blurPx >= 0.3) parts.push(`blur(${blurPx.toFixed(2)}px)`);
    lctx.filter = parts.length ? parts.join(' ') : 'none';
  }

  lctx.imageSmoothingQuality = 'high';
  lctx.translate(size / 2 + (bg.offsetX / 100) * size, size / 2 + (bg.offsetY / 100) * size);
  lctx.rotate((bg.rotation * Math.PI) / 180);
  lctx.drawImage(img, (-iw * scale) / 2, (-ih * scale) / 2, iw * scale, ih * scale);
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.filter = 'none';

  if (!useFilter) {
    applyManualAdjustments(lctx, size, bg);
    applyManualBlur(layer, blurPx);
  }

  octx.globalAlpha = Math.max(0, Math.min(1, bg.opacity));
  octx.drawImage(layer, 0, 0);
  octx.globalAlpha = 1;

  if (bg.overlayOpacity > 0) {
    octx.globalAlpha = Math.min(1, bg.overlayOpacity);
    octx.fillStyle = bg.overlayColor;
    octx.fillRect(0, 0, size, size);
    octx.globalAlpha = 1;
  }

  const entry: CachedRaster = { canvas: out, pixels: null };
  cache.set(key, entry);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return entry;
}

/** Pixel data of a raster (cached), used for "dots take image color". */
export function getRasterPixels(img: HTMLImageElement, bg: BackgroundSettings, sizePx: number): ImageData {
  const entry = getRaster(img, bg, sizePx);
  if (!entry.pixels) {
    const ctx = entry.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
    entry.pixels = ctx.getImageData(0, 0, entry.canvas.width, entry.canvas.height);
  }
  return entry.pixels;
}
