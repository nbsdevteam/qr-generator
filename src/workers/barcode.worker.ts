import { decodeBarcode } from '../lib/barcode/decode';
import type { BarcodeScanRequest, BarcodeScanResponse } from '../lib/barcode/scanTypes';

interface WorkerScope {
  onmessage: ((event: MessageEvent<BarcodeScanRequest>) => void) | null;
  postMessage: (message: BarcodeScanResponse) => void;
}

const ctx = self as unknown as WorkerScope;

ctx.onmessage = (event: MessageEvent<BarcodeScanRequest>) => {
  const { id, width, height, buffer, format, expectedLength } = event.data;
  ctx.postMessage({ id, text: decodeBarcode(new Uint8ClampedArray(buffer), width, height, format, expectedLength) });
};
