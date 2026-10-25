import { createCanvas } from './background';
import { renderOffscreen, type RenderJob } from './render';
import type { ScanRequest, ScanResponse } from './scanTypes';

/**
 * How the scan check works
 * ------------------------
 * The design is rendered once at a fixed size, then "photographed" at five sizes — from a
 * small on-screen preview to a large print — each softened by camera blur, washed out by a
 * little glare and sprinkled with sensor noise. Every photo is decoded by two independent
 * decoders (jsQR and ZXing). A size passes only when both read back exactly the payload.
 *
 *   ok      → every size passes: reliable on screens and in print
 *   partial → some sizes pass: works sometimes; phones will often fail
 *   fail    → nothing reads
 */

export type ScanVerdict = 'ok' | 'partial' | 'fail';

export interface ScanSizeResult {
  /** Width of the code in the simulated camera image, in px. */
  width: number;
  jsqr: boolean;
  zxing: boolean;
  passed: boolean;
}

export interface ScanResult {
  verdict: ScanVerdict;
  /** Shorthand for verdict === 'ok'. */
  ok: boolean;
  /** Text read by any decoder at any size (for display), or null. */
  decoded: string | null;
  sizes: ScanSizeResult[];
}

/** Camera image widths tested, small preview → large print. */
export const SCAN_SIZES = [240, 320, 420, 560, 760] as const;

/** The design is rendered at this width before being "photographed". */
export const SCAN_RENDER_WIDTH = 900;

/** Simulated camera conditions. */
const CAMERA = {
  /** Blur radius as a fraction of the image width. */
  blurPerPx: 1 / 300,
  /** Glare: contrast multiplier. */
  contrast: 0.92,
  /** Sensor noise amplitude (± levels of 255). */
  noise: 6,
  /** Space around the code in the frame, as a fraction of its width. */
  margin: 0.12,
  /** What the camera sees around the code (a light wall, paper or screen bezel). */
  surroundings: '#e9e9e6',
};

/**
 * Downscales the rendered design onto white (transparent areas would otherwise read as
 * black) and applies blur, glare and noise like a phone camera.
 */
export function toScanImage(source: HTMLCanvasElement, width: number, blurPx?: number): ImageData {
  const w = Math.min(width, source.width);
  const h = Math.max(1, Math.round((source.height / source.width) * w));
  // A camera frame always shows some surroundings; decoders struggle when a code touches the edge.
  const pad = Math.round(w * CAMERA.margin);
  const fw = w + 2 * pad;
  const fh = h + 2 * pad;
  const c = createCanvas(fw, fh);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  ctx.fillStyle = CAMERA.surroundings;
  ctx.fillRect(0, 0, fw, fh);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(pad, pad, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = `blur(${(blurPx ?? w * CAMERA.blurPerPx).toFixed(2)}px) contrast(${CAMERA.contrast})`;
  ctx.drawImage(source, pad, pad, w, h);
  ctx.filter = 'none';
  const image = ctx.getImageData(0, 0, fw, fh);

  // Deterministic noise (mulberry32) so the same design always gets the same verdict.
  const d = image.data;
  let seed = (w * 7919 + 17) >>> 0;
  const rand = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 2 * CAMERA.noise;
    d[i] = (d[i] ?? 0) + n;
    d[i + 1] = (d[i + 1] ?? 0) + n;
    d[i + 2] = (d[i + 2] ?? 0) + n;
  }
  return image;
}

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 1;
const pending = new Map<number, (r: { jsqr: string | null; zxing: string | null }) => void>();

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../../workers/scan.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<ScanResponse>) => {
      const resolve = pending.get(event.data.id);
      if (resolve) {
        pending.delete(event.data.id);
        resolve({ jsqr: event.data.jsqr, zxing: event.data.zxing });
      }
    };
    worker.onerror = () => {
      workerFailed = true;
      worker?.terminate();
      worker = null;
      for (const resolve of pending.values()) resolve({ jsqr: null, zxing: null });
      pending.clear();
    };
    return worker;
  } catch {
    workerFailed = true;
    return null;
  }
}

/** Decodes one image with both decoders, off the main thread when possible. */
export async function decodeImage(image: ImageData): Promise<{ jsqr: string | null; zxing: string | null }> {
  const w = getWorker();
  if (!w) {
    // Fallback without workers; the decoders are loaded on demand to keep the main bundle small.
    const { decodeWithJsQR, decodeWithZXing } = await import('./decoders');
    return { jsqr: decodeWithJsQR(image.data, image.width, image.height), zxing: decodeWithZXing(image.data, image.width, image.height) };
  }
  const id = nextId;
  nextId += 1;
  const buffer = new Uint8ClampedArray(image.data).buffer;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    const request: ScanRequest = { id, width: image.width, height: image.height, buffer };
    w.postMessage(request, [buffer]);
  });
}

export async function scanCanvas(canvas: HTMLCanvasElement, expected: string): Promise<ScanResult> {
  const reads = await Promise.all(SCAN_SIZES.map((w) => decodeImage(toScanImage(canvas, w))));
  const sizes: ScanSizeResult[] = reads.map((r, i) => {
    const jsqr = r.jsqr === expected;
    const zxing = r.zxing === expected;
    return { width: SCAN_SIZES[i] ?? 0, jsqr, zxing, passed: jsqr && zxing };
  });
  const passed = sizes.filter((s) => s.passed).length;
  const verdict: ScanVerdict = passed === sizes.length ? 'ok' : passed > 0 ? 'partial' : 'fail';
  const decoded = reads.flatMap((r) => [r.jsqr, r.zxing]).find((t) => t !== null) ?? null;
  return { verdict, ok: verdict === 'ok', decoded, sizes };
}

/** Renders the job at a fixed size and runs the full scan check on it. */
export function scanJob(job: RenderJob): Promise<ScanResult> {
  return scanCanvas(renderOffscreen(job, SCAN_RENDER_WIDTH), job.payload);
}
