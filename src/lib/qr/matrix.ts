import qrcode from 'qrcode-generator';
import type { ErrorCorrection } from '../../types/design';

/** What each module is used for. Function patterns are rendered "protected". */
export const Role = {
  Data: 0,
  Finder: 1,
  Separator: 2,
  Alignment: 3,
  Timing: 4,
  Format: 5,
  Version: 6,
} as const;
export type ModuleRole = (typeof Role)[keyof typeof Role];

export interface QrMatrix {
  /** Modules per side. */
  size: number;
  version: number;
  ecc: ErrorCorrection;
  /** 1 = dark, row-major. */
  dark: Uint8Array;
  role: Uint8Array;
  /** Top-left module of each 7×7 finder. */
  finders: ReadonlyArray<readonly [number, number]>;
  /** Center module of each alignment pattern. */
  alignments: ReadonlyArray<readonly [number, number]>;
}

/** Alignment pattern centre positions per version (index = version - 1). */
const ALIGNMENT_TABLE: ReadonlyArray<ReadonlyArray<number>> = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
];

/** qrcode-generator maps chars to bytes with `& 0xff`, so pre-encode UTF-8 into a binary string. */
function toByteString(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i] ?? 0);
  return out;
}

export class QrOverflowError extends Error {
  constructor() {
    super('This content is too long for a QR code. Shorten it or lower the error correction level.');
    this.name = 'QrOverflowError';
  }
}

export function buildMatrix(text: string, ecc: ErrorCorrection): QrMatrix {
  const qr = qrcode(0, ecc);
  try {
    qr.addData(toByteString(text), 'Byte');
    qr.make();
  } catch {
    throw new QrOverflowError();
  }
  const size = qr.getModuleCount();
  const version = (size - 17) / 4;
  const dark = new Uint8Array(size * size);
  const role = new Uint8Array(size * size);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) dark[r * size + c] = qr.isDark(r, c) ? 1 : 0;
  }

  const set = (r: number, c: number, value: ModuleRole): void => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    role[r * size + c] = value;
  };

  // Timing patterns.
  for (let i = 8; i < size - 8; i += 1) {
    set(6, i, Role.Timing);
    set(i, 6, Role.Timing);
  }

  // Format information (plus the always-dark module).
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      set(8, i, Role.Format);
      set(i, 8, Role.Format);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    set(8, size - 1 - i, Role.Format);
    set(size - 1 - i, 8, Role.Format);
  }

  // Version information (v7+).
  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        set(i, size - 11 + j, Role.Version);
        set(size - 11 + j, i, Role.Version);
      }
    }
  }

  // Alignment patterns.
  const positions = ALIGNMENT_TABLE[version - 1] ?? [];
  const alignments: Array<readonly [number, number]> = [];
  const last = positions.length - 1;
  positions.forEach((row, i) => {
    positions.forEach((col, j) => {
      const overlapsFinder = (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
      if (overlapsFinder) return;
      alignments.push([row, col]);
      for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) set(row + dr, col + dc, Role.Alignment);
    });
  });

  // Finders and their separators (last so they win).
  const finders: Array<readonly [number, number]> = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [fr, fc] of finders) {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const inside = r >= 0 && r < 7 && c >= 0 && c < 7;
        set(fr + r, fc + c, inside ? Role.Finder : Role.Separator);
      }
    }
  }

  return { size, version, ecc, dark, role, finders, alignments };
}
