import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BarcodeInputError } from '../lib/barcode/encode';
import { prepareBarcode, renderBarcodeCanvas, type BarcodeJob, type PreparedBarcode } from '../lib/barcode/render';
import { scanBarcode, type BarcodeSizeResult, type BarcodeVerdict } from '../lib/barcode/scan';

export interface BarcodePreviewState {
  verdict: BarcodeVerdict | 'idle';
  checking: boolean;
  decoded: string | null;
  sizes: BarcodeSizeResult[];
}

const SCAN_DELAY_MS = 280;

/**
 * Encodes the barcode (synchronously, so input errors show at once), paints the preview on
 * the next frame and runs the scan check once input settles.
 */
export function useBarcodePreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  job: BarcodeJob,
  cssWidth: number,
  maxCssHeight: number,
  active: boolean,
): { prepared: PreparedBarcode | null; error: string | null; state: BarcodePreviewState } {
  const { prepared, error } = useMemo(() => {
    try {
      return { prepared: prepareBarcode(job), error: null };
    } catch (err) {
      return { prepared: null, error: err instanceof BarcodeInputError ? err.message : 'This barcode could not be drawn.' };
    }
  }, [job]);

  const [state, setState] = useState<BarcodePreviewState>({ verdict: 'idle', checking: true, decoded: null, sizes: [] });
  const seq = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !prepared || !active || cssWidth <= 0) return;
    const id = ++seq.current;
    setState((s) => (s.checking ? s : { ...s, checking: true }));
    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const { box } = prepared.layout;
      const swap = job.design.rotation === 90 || job.design.rotation === 270;
      const wMod = swap ? box.h : box.w;
      const hMod = swap ? box.w : box.h;
      // Fit inside the preview width, and keep tall (rotated) codes from getting huge.
      const k = Math.max(0.5, Math.min((cssWidth * dpr) / wMod, (maxCssHeight * dpr) / hMod));
      renderBarcodeCanvas(job, prepared, k, canvas);
      canvas.style.width = `${Math.round(canvas.width / dpr)}px`;
      timer = window.setTimeout(() => {
        void scanBarcode(job.design, job.content, prepared.encoded).then((r) => {
          if (id !== seq.current) return;
          setState({ verdict: r.verdict, checking: false, decoded: r.decoded, sizes: r.sizes });
        });
      }, SCAN_DELAY_MS);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [canvasRef, prepared, job, cssWidth, maxCssHeight, active]);

  return { prepared, error, state };
}
