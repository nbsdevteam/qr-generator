// Deep imports: the package has no tree-shaking metadata, and we only need the QR reader.
import BinaryBitmap from '@zxing/library/esm/core/BinaryBitmap';
import GlobalHistogramBinarizer from '@zxing/library/esm/core/common/GlobalHistogramBinarizer';
import HybridBinarizer from '@zxing/library/esm/core/common/HybridBinarizer';
import DecodeHintType from '@zxing/library/esm/core/DecodeHintType';
import QRCodeReader from '@zxing/library/esm/core/qrcode/QRCodeReader';
import RGBLuminanceSource from '@zxing/library/esm/core/RGBLuminanceSource';
import jsQR from 'jsqr';

/**
 * Two independent decoders. jsQR is a pure-JS port tuned for webcams; ZXing is the engine
 * behind many phone scanner apps. A design only counts as readable when both agree.
 */

export function decodeWithJsQR(rgba: Uint8ClampedArray, width: number, height: number): string | null {
  try {
    const result = jsQR(rgba, width, height, { inversionAttempts: 'dontInvert' });
    return result ? new TextDecoder().decode(new Uint8Array(result.binaryData)) : null;
  } catch {
    return null;
  }
}

// TRY_HARDER stands in for a phone scanning many video frames in a row.
const zxingHints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.CHARACTER_SET, 'UTF-8'],
  [DecodeHintType.TRY_HARDER, true],
]);
const zxingReader = new QRCodeReader();

function zxingTry(source: RGBLuminanceSource, binarizer: 'hybrid' | 'global'): string | null {
  try {
    const bin = binarizer === 'hybrid' ? new HybridBinarizer(source) : new GlobalHistogramBinarizer(source);
    return zxingReader.decode(new BinaryBitmap(bin), zxingHints).getText();
  } catch {
    // ZXing signals "no code found" by throwing.
    return null;
  } finally {
    zxingReader.reset();
  }
}

/**
 * ZXing with its two standard binarizers, like scanner apps that retry a frame. The hybrid
 * one handles uneven lighting; the global one handles large modules, where the hybrid one
 * can mistake big flat dark areas for light.
 */
export function decodeWithZXing(rgba: Uint8ClampedArray, width: number, height: number): string | null {
  const luma = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; j < luma.length; i += 4, j += 1) {
    luma[j] = ((rgba[i] ?? 0) * 77 + (rgba[i + 1] ?? 0) * 150 + (rgba[i + 2] ?? 0) * 29) >> 8;
  }
  const source = new RGBLuminanceSource(luma, width, height);
  return zxingTry(source, 'hybrid') ?? zxingTry(source, 'global');
}
