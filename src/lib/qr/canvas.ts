import type { Paint, PaintableScene, SceneNode } from './scene';

function toFill(ctx: CanvasRenderingContext2D, paint: Paint): string | CanvasGradient {
  switch (paint.kind) {
    case 'solid':
      return paint.color;
    case 'linear': {
      const g = ctx.createLinearGradient(paint.x1, paint.y1, paint.x2, paint.y2);
      for (const s of paint.stops) g.addColorStop(s.offset, s.color);
      return g;
    }
    case 'radial': {
      const g = ctx.createRadialGradient(paint.cx, paint.cy, 0, paint.cx, paint.cy, paint.r);
      for (const s of paint.stops) g.addColorStop(s.offset, s.color);
      return g;
    }
  }
}

function drawNode(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  switch (node.kind) {
    case 'path':
      if (!node.d) return;
      ctx.fillStyle = toFill(ctx, node.paint);
      ctx.globalAlpha = node.opacity ?? 1;
      ctx.fill(new Path2D(node.d), node.evenOdd ? 'evenodd' : 'nonzero');
      ctx.globalAlpha = 1;
      return;
    case 'raster':
      ctx.drawImage(node.canvas, node.x, node.y, node.w, node.h);
      return;
    case 'image':
      ctx.save();
      if (node.clip) ctx.clip(new Path2D(node.clip));
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(node.image, node.x, node.y, node.w, node.h);
      ctx.restore();
      return;
    case 'text':
      ctx.fillStyle = node.color;
      ctx.font = `${node.weight} ${node.size}px ${node.family}`;
      ctx.textAlign = node.align ?? 'center';
      ctx.textBaseline = node.baseline ?? 'middle';
      ctx.fillText(node.text, node.x, node.y);
      return;
    case 'clip':
      ctx.save();
      ctx.clip(new Path2D(node.d));
      for (const child of node.children) drawNode(ctx, child);
      ctx.restore();
      return;
  }
}

/** Clears the canvas, resizes it to the scene and paints every layer in order. */
export function paintScene(canvas: HTMLCanvasElement, scene: PaintableScene): void {
  const rotation = scene.rotation ?? 0;
  const swap = rotation === 90 || rotation === 270;
  const w = Math.max(1, Math.round(swap ? scene.height : scene.width));
  const h = Math.max(1, Math.round(swap ? scene.width : scene.height));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  if (rotation === 90) ctx.setTransform(0, 1, -1, 0, w, 0);
  else if (rotation === 180) ctx.setTransform(-1, 0, 0, -1, w, h);
  else if (rotation === 270) ctx.setTransform(0, -1, 1, 0, 0, h);
  for (const node of scene.nodes) drawNode(ctx, node);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
