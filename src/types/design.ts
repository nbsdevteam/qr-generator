/** Every visual setting of a QR design lives in this single typed object. */

export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';
export type DotShape = 'square' | 'rounded' | 'circle' | 'diamond';
export type FinderFrameShape = 'square' | 'rounded' | 'circle';
export type FinderEyeShape = 'square' | 'rounded' | 'circle' | 'diamond';
export type GradientType = 'none' | 'linear' | 'radial';
export type FrameStyle = 'none' | 'banner-bottom' | 'banner-top' | 'pill' | 'bubble' | 'outline';
export type FrameFont = 'sans' | 'display' | 'serif' | 'mono';
export type ImageFit = 'cover' | 'contain';
export type PatternStyle = 'solid' | 'dots';
export type BackingShape = 'square' | 'follow';
export type AlignmentStyle = 'marker' | 'dots';

export interface DotSettings {
  shape: DotShape;
  /** Detail level: dot size as a fraction of the cell (0.2 – 1). */
  scale: number;
  /** Draw light modules as light dots when a background image is present. */
  lightDots: boolean;
}

export interface FinderSettings {
  frameShape: FinderFrameShape;
  eyeShape: FinderEyeShape;
  frameColor: string;
  eyeColor: string;
}

export interface GradientSettings {
  type: GradientType;
  /** Second gradient color (the first is the foreground color). */
  color2: string;
  /** Angle in degrees for linear gradients. */
  angle: number;
}

/** How the fixed QR patterns are drawn over a background image. */
export interface PatternSettings {
  /** Timing and format modules: full solid squares on a light strip, or dots like the rest. */
  style: PatternStyle;
  /** Dot size for timing / format modules when style = 'dots' (0.3 – 1). */
  dotScale: number;
  /** 0 = solid light backing behind corner markers, 1 = image fully visible. */
  cornerBlend: number;
  /** Backing behind corner markers: a square, or the marker's own shape. */
  backingShape: BackingShape;
  /** The small fourth marker: a mini corner marker, or dots that blend into the pattern. */
  alignment: AlignmentStyle;
}

export interface ColorSettings {
  foreground: string;
  background: string;
  transparent: boolean;
  gradient: GradientSettings;
}

export interface ImageColorSettings {
  /** Dots sample the background image color beneath them. */
  enabled: boolean;
  /** 0 – 100: how hard dark dots are darkened and light dots lightened. */
  contrast: number;
}

export interface BorderSettings {
  /** Border width as % of the QR area. */
  width: number;
  color: string;
  /** Corner radius as % of the QR area. */
  radius: number;
}

export interface FrameSettings {
  style: FrameStyle;
  text: string;
  color: string;
  textColor: string;
  /** Text size as % of the QR area. */
  textSize: number;
  /** Frame thickness as % of the QR area. */
  width: number;
  /** Frame corner radius as % of the QR area. */
  radius: number;
  font: FrameFont;
}

export interface LogoSettings {
  src: string | null;
  /** Logo size as % of the QR matrix width. */
  size: number;
  /** Padding around the logo as % of the logo size. */
  padding: number;
  showBackground: boolean;
  background: string;
  /** Corner radius as % of the logo box (50 = circle). */
  radius: number;
  /** Remove the modules behind the logo. */
  clearModules: boolean;
}

export interface BackgroundSettings {
  src: string | null;
  fit: ImageFit;
  /** Offset as % of the QR area (-50 – 50). */
  offsetX: number;
  offsetY: number;
  zoom: number;
  rotation: number;
  /** 0 – 1 */
  opacity: number;
  /** % (100 = unchanged) */
  brightness: number;
  /** % (100 = unchanged) */
  contrast: number;
  /** Blur, in px per 1000 px of QR area. */
  blur: number;
  grayscale: boolean;
  overlayColor: string;
  /** 0 – 1 */
  overlayOpacity: number;
  /** Fill the quiet zone with the light color instead of showing the image there. */
  solidQuietZone: boolean;
  /** 0 – 1: tint the image under each module toward its dark / light color. */
  moduleTint: number;
}

export interface QrDesign {
  version: 1;
  ecc: ErrorCorrection;
  dots: DotSettings;
  finders: FinderSettings;
  patterns: PatternSettings;
  colors: ColorSettings;
  imageColor: ImageColorSettings;
  /** Quiet zone in modules. */
  quietZone: number;
  border: BorderSettings;
  frame: FrameSettings;
  logo: LogoSettings;
  background: BackgroundSettings;
  /** Export width in px. */
  exportSize: number;
}

export interface DesignTemplate {
  id: string;
  name: string;
  design: QrDesign;
  builtIn: boolean;
  createdAt: number;
}

/** Recursive partial used for presets and patches. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? (T[K] extends null ? T[K] : DeepPartial<T[K]>) : T[K];
};
