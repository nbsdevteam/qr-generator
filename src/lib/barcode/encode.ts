import bwipjs from 'bwip-js/browser';
import type { BarcodeContent, Symbology } from '../../types/barcode';
import { symbologyInfo } from './symbologies';

/**
 * Encoding uses bwip-js's raw output — bar/space widths, bar heights and the retail digit
 * layout for linear codes, the module grid for 2D codes. All drawing (and so all styling)
 * happens in our own renderer.
 *
 * Linear geometry is in modules (1 = the narrowest bar), y pointing UP from the bottom of
 * the normal bars, the way bwip-js reports it.
 */

export interface LinearBar {
  /** Left edge, in modules. */
  x: number;
  w: number;
  /** Bottom and top, in modules (y up). Guard bars reach below 0. */
  bottom: number;
  top: number;
  /** Part of an EAN/UPC add-on. */
  addon: boolean;
}

export interface RetailDigit {
  text: string;
  /** Horizontal center, in modules. */
  cx: number;
  /** Relative size from bwip-js (12 = normal, 10 = small outer UPC digits). */
  rel: number;
  /** Add-on digits sit above the add-on bars. */
  addon: boolean;
  /** The < > quiet-zone marks. */
  mark: boolean;
}

export interface EncodedLinear {
  kind: 'linear';
  bars: LinearBar[];
  /** Total width of the bars, in modules. */
  width: number;
  /** Height of the normal bars, in modules. */
  height: number;
  /** EAN/UPC digit layout, or null for codes whose text is a single line. */
  retail: RetailDigit[] | null;
  /** Human-readable text for non-retail codes. */
  humanText: string;
  /** What a scanner should read back. */
  expected: string;
}

export interface Encoded2D {
  kind: '2d';
  cols: number;
  rows: number;
  /** 1 = dark, row-major. */
  cells: Uint8Array;
  humanText: string;
  expected: string;
}

export type EncodedBarcode = EncodedLinear | Encoded2D;

export class BarcodeInputError extends Error {}

/** bwip-js errors look like "bwipp.ean13badLength#6878: EAN-13 must be 12 or 13 digits". */
function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.replace(/^bwipp?\.[\w-]+#?\d*:\s*/, '').replace(/^bwip-js:\s*/, '').trim();
  return msg ? msg.charAt(0).toUpperCase() + msg.slice(1).replace(/\.?$/, '.') : 'This value cannot be encoded.';
}

const digitsOnly = (s: string): string => s.replace(/\D/g, '');

/** GS1 mod-10 check digit for the given digits (without the check digit). */
export function gs1CheckDigit(digits: string): number {
  let sum = 0;
  const rev = digits.split('').reverse();
  rev.forEach((d, i) => {
    sum += Number(d) * (i % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10;
}

/** Explains the check digit for codes that have one, for display under the input. */
export function checkDigitNote(content: BarcodeContent): string | null {
  const value = content.values[content.symbology].trim();
  const d = digitsOnly(value);
  const lengths: Partial<Record<Symbology, number>> = { ean13: 12, ean8: 7, upca: 11, itf14: 13 };
  const base = lengths[content.symbology];
  if (base === undefined || !d) return null;
  if (d.length === base) return `Check digit ${gs1CheckDigit(d)} is added automatically.`;
  if (d.length === base + 1) {
    const expected = gs1CheckDigit(d.slice(0, base));
    return Number(d[base]) === expected ? `Check digit ${expected} is correct.` : `The last digit should be ${expected} — check digit mismatch.`;
  }
  return null;
}

type RawLinear = { sbs: number[]; bhs: number[]; bbs: number[]; txt?: Array<[string, number, number | null, string, number]> };
type Raw2D = { pixs: number[]; pixx: number; pixy: number; height: number; width: number };

function isRawLinear(r: unknown): r is RawLinear {
  return typeof r === 'object' && r !== null && Array.isArray((r as RawLinear).sbs);
}

export interface EncodeOptions {
  /** Height of the normal bars, in modules. */
  heightModules: number;
  guardMarks: boolean;
}

/**
 * Digit positions for retail codes from the GS1 module grid: 7-module digit cells, 3-module
 * outer guards and a 5-module centre guard. Centres are in modules from the first bar.
 */
function retailLayout(
  sym: Symbology,
  digits: string,
  addon: string,
  addonStart: number | null,
  width: number,
  marks: boolean,
): RetailDigit[] {
  const out: RetailDigit[] = [];
  const put = (text: string | undefined, cx: number, rel = 12): void => {
    if (text) out.push({ text, cx, rel, addon: false, mark: false });
  };
  const d = [...digits];
  const cell = (start: number, k: number): number => start + 7 * k + 3.5;
  if (sym === 'ean13' || sym === 'isbn') {
    put(d[0], -4.8);
    for (let k = 0; k < 6; k += 1) put(d[1 + k], cell(3, k));
    for (let k = 0; k < 6; k += 1) put(d[7 + k], cell(50, k));
  } else if (sym === 'ean8') {
    for (let k = 0; k < 4; k += 1) put(d[k], cell(3, k));
    for (let k = 0; k < 4; k += 1) put(d[4 + k], cell(36, k));
  } else if (sym === 'upca') {
    put(d[0], -4.2, 9);
    for (let k = 1; k < 6; k += 1) put(d[k], cell(3, k));
    for (let k = 0; k < 5; k += 1) put(d[6 + k], cell(50, k));
    put(d[11], 99.2, 9);
  } else if (sym === 'upce') {
    put(d[0], -4.2, 9);
    for (let k = 0; k < 6; k += 1) put(d[1 + k], cell(3, k));
    put(d[7], 55.2, 9);
  }
  if (addon && addonStart !== null) {
    [...addon].forEach((ch, k) => out.push({ text: ch, cx: addonStart + 7.5 + 9 * k, rel: 12, addon: true, mark: false }));
  }
  if (marks) {
    const end = addon && addonStart !== null ? width : sym === 'ean8' ? 67 : 95;
    if (sym === 'ean13' || sym === 'isbn' || sym === 'ean8') out.push({ text: '>', cx: end + 5, rel: 12, addon: false, mark: true });
    if (sym === 'ean8') out.push({ text: '<', cx: -5, rel: 12, addon: false, mark: true });
  }
  return out;
}

/** Turns the content into bars or modules. Throws BarcodeInputError with a readable message. */
export function encodeBarcode(content: BarcodeContent, opts: EncodeOptions): EncodedBarcode {
  const sym = content.symbology;
  const info = symbologyInfo(sym);
  let text = content.values[sym].trim();
  if (!text) throw new BarcodeInputError(`Enter a value. ${info.hint}`);

  if (sym === 'interleaved2of5') {
    text = digitsOnly(text);
    if (!text) throw new BarcodeInputError('Interleaved 2 of 5 takes digits only.');
    const total = text.length + (content.includeCheck ? 1 : 0);
    if (total % 2 === 1) text = `0${text}`;
  }
  if (info.supportsAddon && content.addon.trim()) {
    const addon = digitsOnly(content.addon);
    if (addon.length !== 2 && addon.length !== 5) throw new BarcodeInputError('The add-on must be 2 or 5 digits.');
    text = `${text} ${addon}`;
  }

  const options: Record<string, string | number | boolean> = { bcid: sym, text };
  if (info.kind === 'linear') {
    options.height = Math.max(1, opts.heightModules) / 72;
    options.includetext = true;
    if (info.retailText) options.guardwhitespace = opts.guardMarks;
  }
  if (info.supportsCheck && content.includeCheck) options.includecheck = true;
  // Code 93's two check characters are mandatory for scanners.
  if (sym === 'code93') options.includecheck = true;
  if (sym === 'gs1-128') options.parse = false;

  let raw: unknown[];
  try {
    raw = bwipjs.raw(options as unknown as Parameters<typeof bwipjs.raw>[0]) as unknown[];
  } catch (err) {
    throw new BarcodeInputError(friendlyError(err));
  }
  const first = raw[0];

  if (info.kind === '2d') {
    const r = first as Raw2D;
    const cells = new Uint8Array(r.pixx * r.pixy);
    for (let i = 0; i < cells.length; i += 1) cells[i] = r.pixs[i] ? 1 : 0;
    return { kind: '2d', cols: r.pixx, rows: r.pixy, cells, humanText: content.values[sym].trim(), expected: content.values[sym].trim() };
  }

  if (!isRawLinear(first)) throw new BarcodeInputError('This value cannot be encoded.');

  // Bars: sbs alternates bar, space, bar, space… starting with a bar.
  const bars: LinearBar[] = [];
  let x = 0;
  let mainEnd = Infinity;
  for (let i = 0; i < first.sbs.length; i += 1) {
    const w = first.sbs[i] ?? 0;
    if (i % 2 === 0) {
      const j = i / 2;
      const bottom = (first.bbs[j] ?? 0) * 72;
      const top = bottom + (first.bhs[j] ?? 0) * 72;
      bars.push({ x, w, bottom, top, addon: false });
    } else if (w >= 7 && info.supportsAddon && content.addon.trim() && mainEnd === Infinity && x > 40) {
      // The wide gap before the add-on.
      mainEnd = x;
    }
    x += w;
  }
  for (const b of bars) b.addon = b.x >= mainEnd;
  const width = x;

  const txt = first.txt ?? [];
  let retail: RetailDigit[] | null = null;
  let humanText = content.values[sym].trim();
  if (info.retailText) {
    const mainDigits = txt.filter((t) => (t[2] ?? 0) < 0 && t[0] !== '<' && t[0] !== '>').map((t) => t[0]).join('');
    const addonDigits = txt.filter((t) => (t[2] ?? 0) > 0).map((t) => t[0]).join('');
    const addonStart = bars.find((b) => b.addon)?.x ?? null;
    retail = retailLayout(sym, mainDigits, addonDigits, addonStart, width, opts.guardMarks);
    humanText = mainDigits;
  } else if (txt.length && sym !== 'pharmacode') {
    humanText = txt.map((t) => t[0]).join('');
  } else if (sym === 'pharmacode') {
    humanText = content.values[sym].trim();
  }
  if (sym === 'msi' && content.includeCheck) humanText = content.values[sym].trim();

  return {
    kind: 'linear',
    bars,
    width,
    height: Math.max(1, opts.heightModules),
    retail,
    humanText,
    expected: retail ? humanText : sym === 'gs1-128' ? text : sym === 'code39' ? humanText.replace(/^\*|\*$/g, '') : humanText,
  };
}

/**
 * Does what a scanner read match what we encoded? Scanners differ in what they return
 * (check digits, start/stop characters, GS1 separators), so compare the meaningful part.
 */
export function decodedMatches(sym: Symbology, decoded: string, expected: string): boolean {
  const clean = (s: string): string => s.replace(/[()\u001d\s]/g, '');
  switch (sym) {
    case 'ean13':
    case 'ean8':
    case 'upca':
    case 'upce':
    case 'isbn':
    case 'itf14':
      return digitsOnly(decoded) === digitsOnly(expected);
    case 'interleaved2of5':
      return digitsOnly(decoded).replace(/^0+/, '').startsWith(digitsOnly(expected).replace(/^0+/, ''));
    case 'code39':
      return decoded.toUpperCase().startsWith(expected.toUpperCase());
    case 'rationalizedCodabar': {
      const core = (s: string): string => s.toUpperCase().replace(/^[ABCD]/, '').replace(/[ABCD]$/, '');
      return core(decoded) === core(expected);
    }
    case 'gs1-128':
      return clean(decoded).replace(/^\]C1/, '') === clean(expected);
    default:
      return decoded === expected;
  }
}
