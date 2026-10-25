import { AlertTriangle, CheckCircle2, Loader2, Move, Sparkles, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useDesign } from '../../hooks/useDesign';
import { useElementWidth } from '../../hooks/useElementWidth';
import { useQrPreview } from '../../hooks/useQrPreview';
import { useToast } from '../../hooks/useToast';
import { analyzeContrast } from '../../lib/qr/contrast';
import { optimizeDesign } from '../../lib/qr/optimize';
import type { RenderJob } from '../../lib/qr/render';
import type { ScanSizeResult } from '../../lib/qr/scan';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

interface PreviewPanelProps {
  job: RenderJob | null;
  ready: boolean;
  emptyMessage: string | null;
  /** Tells the parent whether the current content fits in a QR code. */
  onError: (error: string | null) => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  /** CSS px per 1% offset. */
  pxPerPct: number;
}

export function PreviewPanel({ job, ready, emptyMessage, onError }: PreviewPanelProps) {
  const { design, setDesign, update } = useDesign();
  const { show } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const cssWidth = useElementWidth(boxRef);
  const dpr = typeof window === 'undefined' ? 1 : Math.min(2.5, window.devicePixelRatio || 1);
  const renderWidth = Math.max(240, Math.min(1400, Math.round(cssWidth * dpr)));
  const { state, sceneRef } = useQrPreview(canvasRef, job, cssWidth > 0 ? renderWidth : 0, ready);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => onError(state.error), [state.error, onError]);

  const hasImage = Boolean(design.background.src);
  const contrast = useMemo(() => analyzeContrast(design, hasImage), [design, hasImage]);
  const canDrag = hasImage && Boolean(job) && !state.error;

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>): void => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!canDrag || !scene || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const k = rect.width / scene.width;
    const { code } = scene.layout;
    const x = (e.clientX - rect.left) / k;
    const y = (e.clientY - rect.top) / k;
    if (x < code.x || y < code.y || x > code.x + code.w || y > code.y + code.h) return;
    canvas.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: design.background.offsetX,
      offsetY: design.background.offsetY,
      pxPerPct: (code.w * k) / 100,
    };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>): void => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const clamp = (v: number): number => Math.max(-100, Math.min(100, Math.round(v)));
    update('background', {
      offsetX: clamp(d.offsetX + (e.clientX - d.startX) / d.pxPerPct),
      offsetY: clamp(d.offsetY + (e.clientY - d.startY) / d.pxPerPct),
    });
  };

  const endDrag = (e: PointerEvent<HTMLCanvasElement>): void => {
    if (drag.current?.pointerId === e.pointerId) {
      drag.current = null;
      setDragging(false);
    }
  };

  const runOptimize = async (): Promise<void> => {
    if (!job) return;
    setOptimizing('Testing…');
    try {
      const result = await optimizeDesign(job, (attempt, label) => setOptimizing(`Try ${attempt}: ${label}`));
      if (result.ok && result.changes.length === 0) show('Already scannable — nothing to change.', 'success');
      else if (result.ok) {
        setDesign(result.design);
        show(`Scannable now. Changed: ${result.changes.join(', ')}.`, 'success');
      } else {
        show('No setting combination made this scannable. Try a calmer image, a smaller logo or shorter content.', 'error');
      }
    } finally {
      setOptimizing(null);
    }
  };

  const status = state.error ? 'error' : state.scan === 'idle' ? 'pending' : state.scan;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
        <div className="stage relative px-6 pb-6 pt-7 sm:px-10">
          <div ref={boxRef} className="relative mx-auto w-full max-w-[440px]">
            <div className={cx('relative overflow-hidden rounded-md', design.colors.transparent && 'checker', (!job || state.error) && 'hidden')}>
              <canvas
                ref={canvasRef}
                aria-label="QR code preview"
                data-testid="qr-canvas"
                className={cx('block h-auto w-full touch-none select-none', canDrag && (dragging ? 'cursor-grabbing' : 'cursor-grab'))}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
              {status === 'ok' && !state.checking ? (
                <div key={state.decoded ?? ''} aria-hidden="true" className="scan-line pointer-events-none absolute inset-x-0 top-0 h-[10%]">
                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-accent shadow-[0_0_14px_2px_var(--accent)]" />
                </div>
              ) : null}
            </div>
            {!job || state.error ? (
              <div className="grid aspect-square w-full place-items-center rounded-xl border border-dashed border-line-strong bg-surface/60 p-8 text-center">
                <p className="max-w-[16rem] text-sm text-ink-3">{state.error ?? emptyMessage ?? 'Add content to see your QR code.'}</p>
              </div>
            ) : null}
          </div>
          {canDrag ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3">
              <Move size={13} /> Drag the image to reposition it
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <ScanBadge status={status} checking={state.checking} />
            <SizeStrip sizes={state.sizes} dim={state.checking || status === 'pending' || status === 'error'} />
          </div>
          <p className="-mt-1 text-xs leading-relaxed text-ink-3" data-testid="scan-detail" title={state.decoded ?? undefined}>
            {status === 'ok'
              ? `Read by both test scanners at all ${state.sizes.length} camera sizes, small screen to large print.`
              : status === 'partial'
                ? `Reads at ${state.sizes.filter((x) => x.passed).length} of ${state.sizes.length} camera sizes${
                    state.sizes[0] && !state.sizes[0].passed ? ', but not when small (a phone scanning a small on-screen preview or print)' : ''
                  }. Phones may fail. Press Optimize to fix.`
                : status === 'fail'
                  ? state.decoded && state.decoded !== job?.payload
                    ? 'Decodes to different content.'
                    : 'No test scanner could read this design.'
                  : state.version
                    ? `Version ${state.version}, ${state.modules}×${state.modules} modules. Checking…`
                    : ''}
          </p>
          {contrast.message ? (
            <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn" data-testid="contrast-warning">
              <AlertTriangle size={14} className="mt-px shrink-0" />
              {contrast.message}
            </p>
          ) : null}
          <Button
            variant={status === 'fail' || status === 'partial' ? 'primary' : 'secondary'}
            onClick={() => void runOptimize()}
            disabled={!job || Boolean(optimizing) || Boolean(state.error)}
            icon={optimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            data-testid="optimize"
          >
            {optimizing ?? 'Optimize for scanning'}
          </Button>
        </div>
      </div>
    </div>
  );
}

type BadgeStatus = 'ok' | 'partial' | 'fail' | 'pending' | 'error';

function ScanBadge({ status, checking }: { status: BadgeStatus; checking: boolean }) {
  const map = {
    ok: { label: 'Scannable', icon: <CheckCircle2 size={15} />, cls: 'bg-ok-soft text-ok' },
    partial: { label: 'Unreliable', icon: <AlertTriangle size={15} />, cls: 'bg-warn-soft text-warn' },
    fail: { label: 'Not scannable', icon: <XCircle size={15} />, cls: 'bg-bad-soft text-bad' },
    pending: { label: 'Checking', icon: <Loader2 size={15} className="animate-spin" />, cls: 'bg-sunken text-ink-3' },
    error: { label: 'No code', icon: <XCircle size={15} />, cls: 'bg-sunken text-ink-3' },
  } as const;
  const m = map[status];
  return (
    <span
      data-testid="scan-status"
      data-status={status}
      data-checking={checking ? 'true' : 'false'}
      className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity', m.cls, checking && status !== 'pending' && 'opacity-60')}
    >
      {checking && status !== 'pending' ? <Loader2 size={15} className="animate-spin" /> : m.icon}
      {m.label}
    </span>
  );
}

const SIZE_LABELS = ['Small screen', 'Phone screen', 'Monitor', 'Print', 'Large print'];

/** One mark per simulated camera size: filled when both scanners read the code. */
function SizeStrip({ sizes, dim }: { sizes: ScanSizeResult[]; dim: boolean }) {
  if (!sizes.length) return null;
  return (
    <div className={cx('ml-auto flex items-end gap-1 transition-opacity', dim && 'opacity-50')} aria-label="Scan results by camera size">
      {sizes.map((s, i) => (
        <span
          key={s.width}
          title={`${SIZE_LABELS[i] ?? `${s.width} px`}: ${s.passed ? 'reads' : s.jsqr || s.zxing ? 'only one scanner reads it' : 'does not read'}`}
          className={cx('w-2 rounded-sm', s.passed ? 'bg-ok' : s.jsqr || s.zxing ? 'bg-warn' : 'bg-bad')}
          style={{ height: `${8 + i * 3}px` }}
        />
      ))}
    </div>
  );
}
