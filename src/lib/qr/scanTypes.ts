export interface ScanRequest {
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

export interface ScanResponse {
  id: number;
  /** Text decoded by jsQR, or null. */
  jsqr: string | null;
  /** Text decoded by ZXing, or null. */
  zxing: string | null;
}
