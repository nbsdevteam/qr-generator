import type { Symbology } from '../../types/barcode';

export type SymbologyGroup = 'Retail' | 'Logistics' | 'General' | 'Industrial' | '2D';

/** ZXing format names used to verify a symbology, or null when ZXing cannot read it. */
export type VerifyFormat =
  | 'CODE_128'
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'ITF'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODABAR'
  | 'DATA_MATRIX'
  | 'PDF_417'
  | 'AZTEC';

export interface SymbologyInfo {
  id: Symbology;
  label: string;
  group: SymbologyGroup;
  /** What it's typically used for. */
  use: string;
  /** What to type. */
  hint: string;
  sample: string;
  /** Linear (bars) or 2D (module grid). */
  kind: 'linear' | '2d';
  /** Retail codes have fixed digit layout under the bars. */
  retailText: boolean;
  supportsAddon: boolean;
  supportsCheck: boolean;
  verify: VerifyFormat | null;
  /** Default bar height in multiples of the X-dimension. */
  heightRatio: number;
}

export const SYMBOLOGIES: readonly SymbologyInfo[] = [
  {
    id: 'ean13',
    label: 'EAN-13',
    group: 'Retail',
    use: 'Products sold in shops worldwide',
    hint: '12 digits (the 13th check digit is added for you) or all 13 digits.',
    sample: '590123412345',
    kind: 'linear',
    retailText: true,
    supportsAddon: true,
    supportsCheck: false,
    verify: 'EAN_13',
    heightRatio: 69,
  },
  {
    id: 'ean8',
    label: 'EAN-8',
    group: 'Retail',
    use: 'Small retail packs',
    hint: '7 digits (check digit added) or 8 digits.',
    sample: '9638507',
    kind: 'linear',
    retailText: true,
    supportsAddon: true,
    supportsCheck: false,
    verify: 'EAN_8',
    heightRatio: 55,
  },
  {
    id: 'upca',
    label: 'UPC-A',
    group: 'Retail',
    use: 'Products sold in the US and Canada',
    hint: '11 digits (check digit added) or 12 digits.',
    sample: '03600029145',
    kind: 'linear',
    retailText: true,
    supportsAddon: true,
    supportsCheck: false,
    verify: 'UPC_A',
    heightRatio: 69,
  },
  {
    id: 'upce',
    label: 'UPC-E',
    group: 'Retail',
    use: 'Small US products',
    hint: '7 digits starting with 0 or 1 (check digit added) or 8 digits.',
    sample: '0123456',
    kind: 'linear',
    retailText: true,
    supportsAddon: true,
    supportsCheck: false,
    // ZXing's JavaScript port cannot read UPC-E, so it cannot be verified in the browser.
    verify: null,
    heightRatio: 69,
  },
  {
    id: 'isbn',
    label: 'ISBN',
    group: 'Retail',
    use: 'Books',
    hint: 'ISBN-13 with hyphens, e.g. 978-1-56581-231-4 (or without the check digit).',
    sample: '978-1-56581-231-4',
    kind: 'linear',
    retailText: true,
    supportsAddon: true,
    supportsCheck: false,
    verify: 'EAN_13',
    heightRatio: 69,
  },
  {
    id: 'code128',
    label: 'Code 128',
    group: 'General',
    use: 'SKUs, serial numbers, internal labels',
    hint: 'Letters, numbers and symbols (ASCII).',
    sample: 'NBS-RIVO-0042',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: 'CODE_128',
    heightRatio: 40,
  },
  {
    id: 'gs1-128',
    label: 'GS1-128',
    group: 'Logistics',
    use: 'Cartons and pallets with batch, expiry and GTIN',
    hint: 'Application identifiers in brackets, e.g. (01)05901234123457(17)271231(10)LOT42',
    sample: '(01)05901234123457(17)271231(10)LOT42',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: 'CODE_128',
    heightRatio: 40,
  },
  {
    id: 'itf14',
    label: 'ITF-14',
    group: 'Logistics',
    use: 'Outer shipping cartons',
    hint: '13 digits (check digit added) or 14 digits.',
    sample: '1590123412345',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: 'ITF',
    heightRatio: 50,
  },
  {
    id: 'interleaved2of5',
    label: 'Interleaved 2 of 5',
    group: 'Industrial',
    use: 'Warehouse and distribution numbers',
    hint: 'Digits only. An even count is required (a leading 0 is added if needed).',
    sample: '12345670',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: true,
    verify: 'ITF',
    heightRatio: 40,
  },
  {
    id: 'code39',
    label: 'Code 39',
    group: 'Industrial',
    use: 'Industry, automotive, ID badges',
    hint: 'A–Z, 0–9, space and - . $ / + %',
    sample: 'NBS-2026',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: true,
    verify: 'CODE_39',
    heightRatio: 40,
  },
  {
    id: 'code93',
    label: 'Code 93',
    group: 'Industrial',
    use: 'Compact alternative to Code 39',
    hint: 'A–Z, 0–9, space and - . $ / + %',
    sample: 'NBS-93',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: 'CODE_93',
    heightRatio: 40,
  },
  {
    id: 'rationalizedCodabar',
    label: 'Codabar',
    group: 'Industrial',
    use: 'Libraries, blood banks, couriers',
    hint: 'Starts and ends with A, B, C or D; digits and - $ : / . + between.',
    sample: 'A40156B',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: 'CODABAR',
    heightRatio: 40,
  },
  {
    id: 'msi',
    label: 'MSI Plessey',
    group: 'Industrial',
    use: 'Shelf labels and inventory',
    hint: 'Digits only.',
    sample: '0123456',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: true,
    verify: null,
    heightRatio: 40,
  },
  {
    id: 'pharmacode',
    label: 'Pharmacode',
    group: 'Industrial',
    use: 'Pharmaceutical packaging control',
    hint: 'A number from 3 to 131070.',
    sample: '117480',
    kind: 'linear',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: null,
    heightRatio: 25,
  },
  {
    id: 'datamatrix',
    label: 'Data Matrix',
    group: '2D',
    use: 'Small parts, pharma serials, tiny labels',
    hint: 'Any text.',
    sample: 'NBS RIVO 50ML LOT42',
    kind: '2d',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: 'DATA_MATRIX',
    heightRatio: 1,
  },
  {
    id: 'pdf417',
    label: 'PDF417',
    group: '2D',
    use: 'IDs, boarding passes, shipping documents',
    hint: 'Any text — holds a lot of data.',
    sample: 'Noor Al-Nibras | Order 10042 | 24 cartons',
    kind: '2d',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    verify: 'PDF_417',
    heightRatio: 1,
  },
  {
    id: 'azteccode',
    label: 'Aztec',
    group: '2D',
    use: 'Tickets and transport',
    hint: 'Any text.',
    sample: 'NBS-TICKET-0042',
    kind: '2d',
    retailText: false,
    supportsAddon: false,
    supportsCheck: false,
    // ZXing's JavaScript Aztec reader fails on clean images at some sizes, so its verdict
    // would be misleading.
    verify: null,
    heightRatio: 1,
  },
];

const BY_ID = new Map(SYMBOLOGIES.map((s) => [s.id, s]));

export function symbologyInfo(id: Symbology): SymbologyInfo {
  const info = BY_ID.get(id);
  if (!info) throw new Error(`Unknown symbology ${id}`);
  return info;
}

export const GROUP_ORDER: readonly SymbologyGroup[] = ['Retail', 'General', 'Logistics', 'Industrial', '2D'];
