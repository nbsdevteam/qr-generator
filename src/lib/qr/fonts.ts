import type { FrameFont } from '../../types/design';

export const FRAME_FONTS: Record<FrameFont, { label: string; family: string; weight: number }> = {
  sans: { label: 'Sans', family: '"Figtree Variable", "Segoe UI", Roboto, Helvetica, Arial, sans-serif', weight: 700 },
  display: {
    label: 'Display',
    family: '"Bricolage Grotesque Variable", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    weight: 700,
  },
  serif: { label: 'Serif', family: 'Georgia, "Times New Roman", Times, serif', weight: 700 },
  mono: { label: 'Mono', family: '"Cascadia Mono", Consolas, "SF Mono", Menlo, monospace', weight: 700 },
};

export function fontCss(font: FrameFont, sizePx: number): string {
  const f = FRAME_FONTS[font];
  return `${f.weight} ${sizePx}px ${f.family}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function measureText(text: string, font: FrameFont, sizePx: number): number {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
    if (!measureCtx) return text.length * sizePx * 0.6;
  }
  measureCtx.font = fontCss(font, sizePx);
  return measureCtx.measureText(text).width;
}
