import type { BarcodeContent, BarcodeDesign } from '../../types/barcode';
import { createCanvas } from '../qr/background';
import { paintScene } from '../qr/canvas';
import { toScanImage } from '../qr/scan';
import { decodedMatches, type EncodedBarcode } from './encode';
import type { BarcodeScanRequest, BarcodeScanResponse } from './scanTypes';
import { layoutBarcode, sceneFromLayout } from './scene';
import { symbologyInfo, type VerifyFormat } from './symbologies';

/**
 * Same idea as the QR check: render the design, "photograph" it at several sizes with
 * camera blur, glare, noise and surroundings, and decode each photo with ZXing.
 */

export type BarcodeVerdict = 'ok' | 'partial' | 'fail' | 'unverifiable';

export interface BarcodeSizeResult {
  /** Pixels per module in the simulated photo. */
  pxPerModule: number;
  passed: boolean;
}

export interface BarcodeScanResult {
  verdict: BarcodeVerdict;
  decoded: string | null;
  sizes: BarcodeSizeResult[];
}

/** Simulated camera resolutions, in pixels per module: small and far → large and close. */
const LINEAR_SIZES = [1.6, 2.2, 3, 4.2] as const;
const MATRIX_SIZES = [2.4, 3.4, 4.8, 7] as const;
/** Render resolution before "photographing". */
const RENDER_PX_PER_MODULE = 8;

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 1;
const pending = new Map<number, (text: string | null) => void>();

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../../workers/barcode.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<BarcodeScanResponse>) => {
      const resolve = pending.get(event.data.id);
      if (resolve) {
        pending.delete(event.data.id);
        resolve(event.data.text);
      }
    };
    worker.onerror = () => {
      workerFailed = true;
      worker?.terminate();
      worker = null;
      for (const resolve of pending.values()) resolve(null);
      pending.clear();
    };
    return worker;
  } catch {
    workerFailed = true;
    return null;
  }
}

async function decode(image: ImageData, format: VerifyFormat, expectedLength: number): Promise<string | null> {
  const w = getWorker();
  if (!w) {
    const { decodeBarcode } = await import('./decode');
    return decodeBarcode(image.data, image.width, image.height, format, expectedLength);
  }
  const id = nextId;
  nextId += 1;
  const buffer = new Uint8ClampedArray(image.data).buffer;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    const request: BarcodeScanRequest = { id, width: image.width, height: image.height, buffer, format, expectedLength };
    w.postMessage(request, [buffer]);
  });
}

export async function scanBarcode(design: BarcodeDesign, content: BarcodeContent, enc: EncodedBarcode): Promise<BarcodeScanResult> {
  const info = symbologyInfo(content.symbology);
  if (!info.verify) return { verdict: 'unverifiable', decoded: null, sizes: [] };

  // Scan the unrotated design; rotation only changes how the file is saved. Decorative
  // frames outside the quiet zone are left out: phone scanners ignore them, but some of
  // ZXing's JavaScript readers give up when a dark frame surrounds the code.
  const flat: BarcodeDesign = {
    ...design,
    rotation: 0,
    card: { ...design.card, borderWidthMm: 0, bearer: design.card.bearer === 'box' ? 'topbottom' : design.card.bearer },
  };
  const layout = layoutBarcode(flat, enc);
  const k = Math.min(RENDER_PX_PER_MODULE, 2400 / Math.max(1, layout.box.w));
  const scene = sceneFromLayout(flat, layout, k);
  const canvas = createCanvas(scene.width, scene.height);
  paintScene(canvas, scene);

  const targets = enc.kind === 'linear' ? LINEAR_SIZES : MATRIX_SIZES;
  const expectedLength = enc.expected.replace(/\D/g, '').length;
  const format = info.verify;
  const attempt = async (ppm: number): Promise<string | null> => {
    // Camera blur scales with the module size: about a third of a module.
    const text = await decode(toScanImage(canvas, Math.round((scene.width * ppm) / k), Math.max(0.3, ppm * 0.33)), format, expectedLength);
    return text !== null && decodedMatches(content.symbology, text, enc.expected) ? text : null;
  };
  // A phone tries many frames at slightly different distances: a size passes when any of
  // three nearby scales reads correctly.
  const reads = await Promise.all(
    targets.map(async (ppm) => (await attempt(ppm)) ?? (await attempt(ppm * 1.09)) ?? (await attempt(ppm * 0.92))),
  );
  const sizes = reads.map((text, i) => ({ pxPerModule: targets[i] ?? 0, passed: text !== null }));
  const passed = sizes.filter((s) => s.passed).length;
  return {
    verdict: passed === sizes.length ? 'ok' : passed > 0 ? 'partial' : 'fail',
    decoded: reads.find((t) => t !== null) ?? null,
    sizes,
  };
}
