import type { BarcodeContent, BarcodeDesign } from '../../types/barcode';
import { contrastRatio, hexToRgb, luminance, rgbToHsl } from '../color';
import { createCanvas } from '../qr/background';
import { paintScene } from '../qr/canvas';
import { sceneToSvg } from '../qr/svg';
import { encodeBarcode, type EncodedBarcode } from './encode';
import { layoutBarcode, printPxPerModule, sceneFromLayout, type BarcodeLayout } from './scene';
import { symbologyInfo } from './symbologies';

export interface BarcodeJob {
  design: BarcodeDesign;
  content: BarcodeContent;
}

export interface PreparedBarcode {
  encoded: EncodedBarcode;
  layout: BarcodeLayout;
}

/** Encodes and lays out a job. Throws BarcodeInputError for invalid data. */
export function prepareBarcode(job: BarcodeJob): PreparedBarcode {
  const { design, content } = job;
  const info = symbologyInfo(content.symbology);
  const encoded = encodeBarcode(content, {
    heightModules: info.kind === 'linear' ? design.size.barHeightMm / Math.max(0.05, design.size.xDimMm) : 1,
    guardMarks: design.text.guardMarks,
  });
  return { encoded, layout: layoutBarcode(design, encoded) };
}

export function renderBarcodeCanvas(job: BarcodeJob, prepared: PreparedBarcode, pxPerModule: number, canvas = createCanvas(1, 1)): HTMLCanvasElement {
  paintScene(canvas, sceneFromLayout(job.design, prepared.layout, pxPerModule));
  return canvas;
}

/** PNG at the design's DPI, with every module a whole number of pixels for crisp printing. */
export function exportBarcodePng(job: BarcodeJob): Promise<Blob> {
  const prepared = prepareBarcode(job);
  const canvas = renderBarcodeCanvas(job, prepared, printPxPerModule(job.design));
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the PNG.'))), 'image/png');
  });
}

/** Vector SVG sized in millimetres so it prints at the designed size. */
export function exportBarcodeSvg(job: BarcodeJob): string {
  const prepared = prepareBarcode(job);
  // 10 user units per module keeps coordinates readable; width/height carry real millimetres.
  const scene = sceneFromLayout(job.design, prepared.layout, 10);
  const svg = sceneToSvg(scene);
  const swap = job.design.rotation === 90 || job.design.rotation === 270;
  const wMm = ((swap ? scene.height : scene.width) / 10) * job.design.size.xDimMm;
  const hMm = ((swap ? scene.width : scene.height) / 10) * job.design.size.xDimMm;
  return svg.replace(/<svg ([^>]*?)width="[^"]*" height="[^"]*"/, `<svg $1width="${wMm.toFixed(2)}mm" height="${hMm.toFixed(2)}mm"`);
}

export interface ColorWarning {
  level: 'warn' | 'error';
  message: string;
}

/** Practical print rules: contrast, dark-on-light, and no red bars (laser scanners use red light). */
export function barcodeColorWarnings(design: BarcodeDesign): ColorWarning[] {
  const out: ColorWarning[] = [];
  const bg = design.card.transparent ? '#ffffff' : design.card.background;
  const barColors = [design.bars.color, ...(design.bars.gradient.type !== 'none' ? [design.bars.gradient.color2] : [])];
  const ratio = Math.min(...barColors.map((c) => contrastRatio(c, bg)));
  if (barColors.some((c) => luminance(hexToRgb(c)) > luminance(hexToRgb(bg)))) {
    out.push({ level: 'error', message: 'The bars are lighter than the background. Scanners need dark bars on a light background.' });
  } else if (ratio < 3) {
    out.push({ level: 'warn', message: `Low contrast (${ratio.toFixed(1)}:1). Aim for at least 3:1 — darker bars or a lighter background.` });
  }
  const reddish = barColors.some((c) => {
    const hsl = rgbToHsl(hexToRgb(c));
    const deg = hsl.h * 360;
    return hsl.s > 0.45 && hsl.l > 0.25 && (deg < 50 || deg > 330);
  });
  if (reddish) out.push({ level: 'warn', message: 'Red, orange and yellow bars look blank to red-laser scanners used in many shops. Prefer black, dark blue, dark green or brown.' });
  if (design.card.transparent) out.push({ level: 'warn', message: 'Transparent background: make sure whatever it is printed on is light and plain.' });
  return out;
}
