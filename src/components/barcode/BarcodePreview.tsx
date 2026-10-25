import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBarcodeDesign } from '../../hooks/useBarcodeDesign';
import { useBarcodePreview } from '../../hooks/useBarcodePreview';
import { useElementWidth } from '../../hooks/useElementWidth';
import { useToast } from '../../hooks/useToast';
import { optimizeBarcode } from '../../lib/barcode/optimize';
import { barcodeColorWarnings, type BarcodeJob, type PreparedBarcode } from '../../lib/barcode/render';
import type { BarcodeSizeResult } from '../../lib/barcode/scan';
import { printSizeMm } from '../../lib/barcode/scene';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

interface BarcodePreviewProps {
  job: BarcodeJob;
  active: boolean;
  onPrepared: (prepared: PreparedBarcode | null, error: string | null) => void;
}

const SIZE_LABELS = ['Small / far', 'Phone at arm’s length', 'Close up', 'Very close'];

export function BarcodePreview({ job, active, onPrepared }: BarcodePreviewProps) {
  const { setDesign } = useBarcodeDesign();
  const { show } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const cssWidth = useElementWidth(boxRef);
  const { prepared, error, state } = useBarcodePreview(canvasRef, job, cssWidth, 360, active);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const warnings = useMemo(() => barcodeColorWarnings(job.design), [job.design]);

  // Let the page know (for exports and the readable-text placeholder).
  useEffect(() => onPrepared(prepared, error), [prepared, error, onPrepared]);

  const size = prepared ? printSizeMm(job.design, prepared.layout) : null;
  const verdict = error ? 'error' : state.verdict === 'idle' ? 'pending' : state.verdict;

  const runOptimize = async (): Promise<void> => {
    setOptimizing('Testing…');
    try {
      const r = await optimizeBarcode(job, (label) => setOptimizing(label));
      if (r.ok && !r.changes.length) show('Already scannable — nothing to change.', 'success');
      else if (r.ok) {
        setDesign(r.design);
        show(`Scannable now. Changed: ${r.changes.join(', ')}.`, 'success');
      } else show('No style change made this scannable. Try larger bars, a calmer style or shorter data.', 'error');
    } finally {
      setOptimizing(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
      <div className="stage px-5 pb-5 pt-6 sm:px-8">
        <div ref={boxRef} className="mx-auto flex min-h-[180px] w-full items-center justify-center">
          <div className={cx('max-w-full', job.design.card.transparent && 'checker', (error || !prepared) && 'hidden')}>
            <canvas ref={canvasRef} data-testid="barcode-canvas" aria-label="Barcode preview" className="block h-auto max-w-full" />
          </div>
          {error ? <p className="max-w-[18rem] text-center text-sm text-ink-3">{error}</p> : null}
        </div>
        {size ? (
          <p className="mt-3 text-center text-xs tabular-nums text-ink-3" data-testid="barcode-size">
            Prints at {size.w.toFixed(1)} × {size.h.toFixed(1)} mm with {size.xDim.toFixed(3)} mm bars at {job.design.dpi} dpi
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <VerdictBadge verdict={verdict} checking={state.checking} />
          <SizeStrip sizes={state.sizes} dim={state.checking || verdict === 'pending'} />
        </div>
        <p className="-mt-1 text-xs leading-relaxed text-ink-3" data-testid="barcode-scan-detail">
          {verdict === 'ok'
            ? `Read correctly by the test scanner at all ${state.sizes.length} camera distances.`
            : verdict === 'partial'
              ? `Reads at ${state.sizes.filter((s) => s.passed).length} of ${state.sizes.length} camera distances${
                  state.sizes[0] && !state.sizes[0].passed ? ', but not small or far away' : ''
                }. Scanners may struggle. Press Optimize, or make the bars wider.`
              : verdict === 'fail'
                ? 'The test scanner could not read this design.'
                : verdict === 'unverifiable'
                  ? 'This barcode type can’t be read by the browser’s test scanner. Check it with a scanner or phone app before printing.'
                  : ''}
        </p>
        {warnings.map((w) => (
          <p key={w.message} className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-xs', w.level === 'error' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn')}>
            <AlertTriangle size={14} className="mt-px shrink-0" />
            {w.message}
          </p>
        ))}
        <Button
          variant={verdict === 'fail' || verdict === 'partial' ? 'primary' : 'secondary'}
          onClick={() => void runOptimize()}
          disabled={Boolean(error) || Boolean(optimizing) || verdict === 'unverifiable'}
          icon={optimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          data-testid="barcode-optimize"
        >
          {optimizing ?? 'Optimize for scanning'}
        </Button>
      </div>
    </div>
  );
}

type Verdict = 'ok' | 'partial' | 'fail' | 'unverifiable' | 'pending' | 'error';

function VerdictBadge({ verdict, checking }: { verdict: Verdict; checking: boolean }) {
  const map = {
    ok: { label: 'Scannable', icon: <CheckCircle2 size={15} />, cls: 'bg-ok-soft text-ok' },
    partial: { label: 'Unreliable', icon: <AlertTriangle size={15} />, cls: 'bg-warn-soft text-warn' },
    fail: { label: 'Not scannable', icon: <XCircle size={15} />, cls: 'bg-bad-soft text-bad' },
    unverifiable: { label: 'Can’t verify', icon: <HelpCircle size={15} />, cls: 'bg-sunken text-ink-2' },
    pending: { label: 'Checking', icon: <Loader2 size={15} className="animate-spin" />, cls: 'bg-sunken text-ink-3' },
    error: { label: 'Invalid data', icon: <XCircle size={15} />, cls: 'bg-sunken text-ink-3' },
  } as const;
  const m = map[verdict];
  const spinning = checking && verdict !== 'pending' && verdict !== 'error';
  return (
    <span
      data-testid="barcode-status"
      data-status={verdict}
      data-checking={checking ? 'true' : 'false'}
      className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity', m.cls, spinning && 'opacity-60')}
    >
      {spinning ? <Loader2 size={15} className="animate-spin" /> : m.icon}
      {m.label}
    </span>
  );
}

function SizeStrip({ sizes, dim }: { sizes: BarcodeSizeResult[]; dim: boolean }) {
  if (!sizes.length) return null;
  return (
    <div className={cx('ml-auto flex items-end gap-1 transition-opacity', dim && 'opacity-50')} aria-label="Scan results by camera distance">
      {sizes.map((s, i) => (
        <span
          key={s.pxPerModule}
          title={`${SIZE_LABELS[i] ?? ''}: ${s.passed ? 'reads' : 'does not read'}`}
          className={cx('w-2 rounded-sm', s.passed ? 'bg-ok' : 'bg-bad')}
          style={{ height: `${8 + i * 3}px` }}
        />
      ))}
    </div>
  );
}
