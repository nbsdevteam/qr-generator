import type { VerifyFormat } from './symbologies';

export interface BarcodeScanRequest {
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  format: VerifyFormat;
  expectedLength: number;
}

export interface BarcodeScanResponse {
  id: number;
  text: string | null;
}
