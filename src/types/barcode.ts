import type { DotShape, FrameFont, GradientType } from './design';

/** bwip-js symbology ids supported on the Barcode page. */
export type Symbology =
  | 'code128'
  | 'gs1-128'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'isbn'
  | 'itf14'
  | 'interleaved2of5'
  | 'code39'
  | 'code93'
  | 'rationalizedCodabar'
  | 'msi'
  | 'pharmacode'
  | 'datamatrix'
  | 'pdf417'
  | 'azteccode';

export type TextPosition = 'below' | 'above';
export type TextAlign = 'center' | 'left' | 'right' | 'justify';
export type Rotation = 0 | 90 | 180 | 270;
export type BearerStyle = 'none' | 'topbottom' | 'box';

export interface BarcodeContent {
  symbology: Symbology;
  /** The value per symbology, so switching types keeps what you typed for each. */
  values: Record<Symbology, string>;
  /** EAN/UPC 2- or 5-digit add-on (price / issue number). */
  addon: string;
  /** Add an optional check digit (Code 39, Interleaved 2 of 5, MSI). */
  includeCheck: boolean;
}

export interface BarSettings {
  color: string;
  gradient: { type: GradientType; color2: string; angle: number };
  /** Rounded bar ends, % of the bar width (0 – 50). */
  roundness: number;
  /** Ink-spread compensation: each bar is narrowed by this % of a module (0 – 30). */
  reduction: number;
  /** 2D codes only: module shape and size. */
  moduleShape: DotShape;
  moduleScale: number;
}

export interface SizeSettings {
  /** Narrowest bar width (X-dimension) in mm. */
  xDimMm: number;
  /** Bar height in mm (linear codes). */
  barHeightMm: number;
  /** Quiet zone each side for linear codes, in modules. */
  quietZone: number;
  /** Quiet zone around 2D codes, in modules. */
  quietZone2d: number;
  /** Extra space above and below, in mm. */
  paddingMm: number;
}

export interface HumanTextSettings {
  /** Show text under linear barcodes. */
  show: boolean;
  /** Show text with 2D codes (off by default: it is usually wider than the code). */
  show2d: boolean;
  /** Replace the encoded data with your own text (non-retail codes). */
  override: string;
  position: TextPosition;
  align: TextAlign;
  font: FrameFont;
  /** Text size in points. */
  sizePt: number;
  bold: boolean;
  color: string;
  /** Gap between bars and text in mm. */
  gapMm: number;
  /** Extra space between characters in mm. */
  letterSpacingMm: number;
  /** EAN/UPC: show the < > quiet-zone marks. */
  guardMarks: boolean;
}

export interface CaptionSettings {
  text: string;
  font: FrameFont;
  sizePt: number;
  bold: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface CardSettings {
  background: string;
  transparent: boolean;
  borderWidthMm: number;
  borderColor: string;
  radiusMm: number;
  bearer: BearerStyle;
  /** Bearer bar thickness in modules. */
  bearerWidth: number;
}

export interface BarcodeDesign {
  version: 1;
  bars: BarSettings;
  size: SizeSettings;
  text: HumanTextSettings;
  top: CaptionSettings;
  bottom: CaptionSettings;
  card: CardSettings;
  rotation: Rotation;
  /** Export resolution in dots per inch. */
  dpi: number;
}

export interface BarcodeTemplate {
  id: string;
  name: string;
  design: BarcodeDesign;
  builtIn: boolean;
  createdAt: number;
}
