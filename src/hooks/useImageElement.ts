import { useEffect, useState } from 'react';
import { loadImage } from '../lib/image';

/** Decodes a data URL into an <img> for canvas drawing. Null while loading or when src is null. */
export function useImageElement(src: string | null): HTMLImageElement | null {
  const [state, setState] = useState<{ src: string; img: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadImage(src)
      .then((img) => {
        if (!cancelled) setState({ src, img });
      })
      .catch(() => {
        if (!cancelled) setState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return src && state?.src === src ? state.img : null;
}
