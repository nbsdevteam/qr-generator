import type { Paint, PaintableScene, SceneNode } from './scene';
import { n } from './shapes';

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Serializes a scene to a standalone SVG. The background raster is embedded as base64 PNG. */
export function sceneToSvg(scene: PaintableScene): string {
  const defs: string[] = [];
  let id = 0;
  const nextId = (prefix: string): string => {
    id += 1;
    return `${prefix}${id}`;
  };

  const fillOf = (paint: Paint): string => {
    switch (paint.kind) {
      case 'solid':
        return paint.color;
      case 'linear': {
        const gid = nextId('g');
        const stops = paint.stops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('');
        defs.push(
          `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${n(paint.x1)}" y1="${n(paint.y1)}" x2="${n(paint.x2)}" y2="${n(paint.y2)}">${stops}</linearGradient>`,
        );
        return `url(#${gid})`;
      }
      case 'radial': {
        const gid = nextId('g');
        const stops = paint.stops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('');
        defs.push(
          `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n(paint.cx)}" cy="${n(paint.cy)}" r="${n(paint.r)}">${stops}</radialGradient>`,
        );
        return `url(#${gid})`;
      }
    }
  };

  const render = (node: SceneNode): string => {
    switch (node.kind) {
      case 'path':
        if (!node.d) return '';
        return `<path d="${node.d}" fill="${fillOf(node.paint)}"${node.evenOdd ? ' fill-rule="evenodd"' : ''}${
          node.opacity !== undefined && node.opacity < 1 ? ` fill-opacity="${n(node.opacity)}"` : ''
        }/>`;
      case 'raster':
        return `<image x="${n(node.x)}" y="${n(node.y)}" width="${n(node.w)}" height="${n(node.h)}" preserveAspectRatio="none" href="${node.canvas.toDataURL('image/png')}"/>`;
      case 'image': {
        const img = `<image x="${n(node.x)}" y="${n(node.y)}" width="${n(node.w)}" height="${n(node.h)}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(node.href)}"/>`;
        if (!node.clip) return img;
        const cid = nextId('c');
        defs.push(`<clipPath id="${cid}"><path d="${node.clip}"/></clipPath>`);
        return `<g clip-path="url(#${cid})">${img}</g>`;
      }
      case 'text':
        return `<text x="${n(node.x)}" y="${n(node.y)}" text-anchor="${
          node.align === 'left' ? 'start' : node.align === 'right' ? 'end' : 'middle'
        }"${node.baseline === 'alphabetic' ? '' : ' dominant-baseline="central"'} font-family="${escapeXml(node.family)}" font-weight="${node.weight}" font-size="${n(node.size)}" fill="${node.color}">${escapeXml(node.text)}</text>`;
      case 'clip': {
        const cid = nextId('c');
        defs.push(`<clipPath id="${cid}"><path d="${node.d}"/></clipPath>`);
        return `<g clip-path="url(#${cid})">${node.children.map(render).join('')}</g>`;
      }
    }
  };

  const rotation = scene.rotation ?? 0;
  const swap = rotation === 90 || rotation === 270;
  const w = n(swap ? scene.height : scene.width);
  const h = n(swap ? scene.width : scene.height);
  const transform =
    rotation === 90
      ? `matrix(0 1 -1 0 ${w} 0)`
      : rotation === 180
        ? `matrix(-1 0 0 -1 ${w} ${h})`
        : rotation === 270
          ? `matrix(0 -1 1 0 0 ${h})`
          : '';
  const inner = scene.nodes.map(render).join('');
  const body = transform ? `<g transform="${transform}">${inner}</g>` : inner;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    body +
    `</svg>`
  );
}
