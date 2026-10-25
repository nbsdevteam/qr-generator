import { useEffect, useRef, useState, type RefObject } from 'react';
import { QrOverflowError } from '../lib/qr/matrix';
import { getMatrix, renderToCanvas, type RenderJob } from '../lib/qr/render';
import { scanJob, type ScanSizeResult } from '../lib/qr/scan';
import type { Scene } from '../lib/qr/scene';

export type ScanStatus = 'idle' | 'ok' | 'partial' | 'fail';

export interface PreviewState {
  error: string | null;
  scan: ScanStatus;
  /** A newer render is waiting to be decoded; `scan` still shows the last result. */
  checking: boolean;
  decoded: string | null;
  /** Per camera size results of the last check. */
  sizes: ScanSizeResult[];
  version: number | null;
  modules: number | null;
}

const SCAN_DELAY_MS = 260;

/**
 * Redraws the preview on the next animation frame whenever the job changes (so sliders feel
 * live), then — once input settles — runs the camera-simulation scan check (see lib/qr/scan.ts).
 */
export function useQrPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  job: RenderJob | null,
  width: number,
  ready: boolean,
): { state: PreviewState; sceneRef: RefObject<Scene | null> } {
  const [state, setState] = useState<PreviewState>({ error: null, scan: 'idle', checking: true, decoded: null, sizes: [], version: null, modules: null });
  const sceneRef = useRef<Scene | null>(null);
  const scanSeq = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !job || width <= 0) {
      setState((s) => ({ ...s, error: null, scan: 'idle', checking: false, decoded: null }));
      return;
    }
    if (!ready) {
      setState((s) => ({ ...s, checking: true }));
      return;
    }

    let scanTimer = 0;
    const seq = ++scanSeq.current;
    // Mark the shown result as stale right away so it never describes an older design.
    setState((s) => (s.checking ? s : { ...s, checking: true }));
    const frame = window.requestAnimationFrame(() => {
      try {
        const matrix = getMatrix(job.payload, job.design);
        sceneRef.current = renderToCanvas(canvas, job, width);
        setState((s) => ({ ...s, error: null, checking: true, version: matrix.version, modules: matrix.size }));
      } catch (err) {
        sceneRef.current = null;
        const message = err instanceof QrOverflowError ? err.message : 'The preview could not be drawn.';
        setState({ error: message, scan: 'idle', checking: false, decoded: null, sizes: [], version: null, modules: null });
        return;
      }
      scanTimer = window.setTimeout(() => {
        void scanJob(job).then((result) => {
          if (seq !== scanSeq.current) return;
          setState((s) => ({ ...s, scan: result.verdict, checking: false, decoded: result.decoded, sizes: result.sizes }));
        });
      }, SCAN_DELAY_MS);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(scanTimer);
    };
  }, [canvasRef, job, width, ready]);

  return { state, sceneRef };
}
