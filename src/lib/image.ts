export class ImageReadError extends Error {}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageReadError('This file could not be opened as an image.'));
    img.src = src;
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new ImageReadError('Could not read the file.')));
    reader.onerror = () => reject(new ImageReadError('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Reads an uploaded image entirely in the browser and downsizes it so previews stay fast
 * and the data URL has a chance of fitting in localStorage. SVGs are kept as vectors.
 */
export async function prepareImage(file: File, maxDim: number, kind: 'photo' | 'logo'): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new ImageReadError('Choose an image file (PNG, JPG, WebP, SVG or GIF).');
  if (file.size > 25 * 1024 * 1024) throw new ImageReadError('Images must be under 25 MB.');

  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const w = img.naturalWidth || 512;
  const h = img.naturalHeight || 512;

  if (file.type === 'image/svg+xml' && original.length < 400_000) return { dataUrl: original, width: w, height: h };

  const k = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * k));
  const th = Math.max(1, Math.round(h * k));
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: original, width: w, height: h };
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, tw, th);

  const mayHaveAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif' || file.type === 'image/svg+xml';
  let dataUrl: string;
  if (kind === 'logo' || mayHaveAlpha) {
    dataUrl = canvas.toDataURL('image/webp', 0.92);
    if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/png');
  } else {
    dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  }
  if (k === 1 && original.length < dataUrl.length) dataUrl = original;
  return { dataUrl, width: tw, height: th };
}
