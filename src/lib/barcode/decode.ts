// Deep imports keep the worker small (the package has no tree-shaking metadata).
import BarcodeFormat from '@zxing/library/esm/core/BarcodeFormat';
import BinaryBitmap from '@zxing/library/esm/core/BinaryBitmap';
import GlobalHistogramBinarizer from '@zxing/library/esm/core/common/GlobalHistogramBinarizer';
import HybridBinarizer from '@zxing/library/esm/core/common/HybridBinarizer';
import DecodeHintType from '@zxing/library/esm/core/DecodeHintType';
import MultiFormatReader from '@zxing/library/esm/core/MultiFormatReader';
import RGBLuminanceSource from '@zxing/library/esm/core/RGBLuminanceSource';
import type { VerifyFormat } from './symbologies';

const reader = new MultiFormatReader();

/**
 * Decodes one image with ZXing, restricted to the format we expect, trying both of its
 * standard binarizers like scanner apps that retry a frame. Returns the text or null.
 */
export function decodeBarcode(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  format: VerifyFormat,
  expectedLength: number,
): string | null {
  const luma = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; j < luma.length; i += 4, j += 1) {
    luma[j] = ((rgba[i] ?? 0) * 77 + (rgba[i + 1] ?? 0) * 150 + (rgba[i + 2] ?? 0) * 29) >> 8;
  }
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat[format]]],
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.CHARACTER_SET, 'UTF-8'],
  ]);
  // ZXing only accepts a few ITF lengths unless told the length to expect.
  if (format === 'ITF') hints.set(DecodeHintType.ALLOWED_LENGTHS, Int32Array.from([expectedLength, expectedLength + 1, 6, 8, 10, 12, 14]));
  const source = new RGBLuminanceSource(luma, width, height);
  for (const make of [(s: RGBLuminanceSource) => new HybridBinarizer(s), (s: RGBLuminanceSource) => new GlobalHistogramBinarizer(s)]) {
    try {
      return reader.decode(new BinaryBitmap(make(source)), hints).getText();
    } catch {
      // Not found with this binarizer.
    } finally {
      reader.reset();
    }
  }
  return null;
}
