import { decodeWithJsQR, decodeWithZXing } from '../lib/qr/decoders';
import type { ScanRequest, ScanResponse } from '../lib/qr/scanTypes';

interface WorkerScope {
  onmessage: ((event: MessageEvent<ScanRequest>) => void) | null;
  postMessage: (message: ScanResponse) => void;
}

const ctx = self as unknown as WorkerScope;

ctx.onmessage = (event: MessageEvent<ScanRequest>) => {
  const { id, width, height, buffer } = event.data;
  const rgba = new Uint8ClampedArray(buffer);
  const response: ScanResponse = {
    id,
    jsqr: decodeWithJsQR(rgba, width, height),
    zxing: decodeWithZXing(rgba, width, height),
  };
  ctx.postMessage(response);
};
