import type { QrDesign } from '../../types/design';
import { contrastRatio, hexToRgb, luminance } from '../color';

export interface ContrastReport {
  level: 'ok' | 'low' | 'inverted';
  /** Lowest contrast ratio between a dark color and the light color. */
  ratio: number;
  message: string | null;
}

/** Minimum ratio most phone scanners handle comfortably. */
export const MIN_CONTRAST = 3;

export function analyzeContrast(design: QrDesign, hasImage: boolean): ContrastReport {
  const { colors, finders, imageColor } = design;
  const light = colors.transparent && !hasImage ? '#ffffff' : colors.background;
  const darks: string[] = [finders.frameColor, finders.eyeColor];
  if (!(hasImage && imageColor.enabled)) {
    darks.push(colors.foreground);
    if (colors.gradient.type !== 'none') darks.push(colors.gradient.color2);
  }
  const ratio = Math.min(...darks.map((d) => contrastRatio(d, light)));
  const lightLum = luminance(hexToRgb(light));
  const inverted = darks.some((d) => luminance(hexToRgb(d)) > lightLum);

  if (inverted) {
    return {
      level: 'inverted',
      ratio,
      message: 'The code is lighter than its background. Many scanners only read dark-on-light codes.',
    };
  }
  if (ratio < MIN_CONTRAST) {
    return {
      level: 'low',
      ratio,
      message: `Low contrast (${ratio.toFixed(1)}:1). Use a darker foreground or a lighter background — aim for at least ${MIN_CONTRAST}:1.`,
    };
  }
  return { level: 'ok', ratio, message: null };
}
