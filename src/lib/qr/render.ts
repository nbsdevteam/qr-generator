import type { QrDesign } from '../../types/design';
import { createCanvas } from './background';
import { paintScene } from './canvas';
import { buildMatrix, type QrMatrix } from './matrix';
import { buildScene, type Scene, type SceneAssets } from './scene';
import { sceneToSvg } from './svg';

export interface RenderJob {
  design: QrDesign;
  payload: string;
  assets: SceneAssets;
}

const matrixCache = new Map<string, QrMatrix>();

/** Builds (and memoizes) the module grid for a payload. Throws QrOverflowError. */
export function getMatrix(payload: string, design: QrDesign): QrMatrix {
  const key = `${design.ecc}|${payload}`;
  const hit = matrixCache.get(key);
  if (hit) return hit;
  const m = buildMatrix(payload, design.ecc);
  matrixCache.set(key, m);
  if (matrixCache.size > 24) {
    const oldest = matrixCache.keys().next().value;
    if (oldest !== undefined) matrixCache.delete(oldest);
  }
  return m;
}

/** Draws background → overlay → modules → finders → logo → frame onto the canvas. */
export function renderToCanvas(canvas: HTMLCanvasElement, job: RenderJob, width: number): Scene {
  const matrix = getMatrix(job.payload, job.design);
  const scene = buildScene(job.design, matrix, job.assets, { width: Math.round(width) });
  paintScene(canvas, scene);
  return scene;
}

export function renderOffscreen(job: RenderJob, width: number): HTMLCanvasElement {
  const canvas = createCanvas(width, width);
  renderToCanvas(canvas, job, width);
  return canvas;
}

export function exportPngBlob(job: RenderJob): Promise<Blob> {
  const canvas = renderOffscreen(job, job.design.exportSize);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the PNG.'))), 'image/png');
  });
}

export function exportSvgString(job: RenderJob): string {
  const matrix = getMatrix(job.payload, job.design);
  const scene = buildScene(job.design, matrix, job.assets, { width: job.design.exportSize });
  return sceneToSvg(scene);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
