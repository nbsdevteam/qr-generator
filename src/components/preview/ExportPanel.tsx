import { Copy, Download, FileCode2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useDesign } from '../../hooks/useDesign';
import { useToast } from '../../hooks/useToast';
import { downloadBlob, exportPngBlob, exportSvgString, type RenderJob } from '../../lib/qr/render';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { Slider } from '../ui/Slider';

const QUICK_SIZES = [512, 1024, 2048, 4096] as const;

export function ExportPanel({ job, fileStem }: { job: RenderJob | null; fileStem: string }) {
  const { design, set } = useDesign();
  const { show } = useToast();
  const [busy, setBusy] = useState<'png' | 'svg' | 'copy' | null>(null);
  const size = design.exportSize;

  const run = async (kind: 'png' | 'svg' | 'copy'): Promise<void> => {
    if (!job) return;
    setBusy(kind);
    // Let the spinner paint before heavy rendering. (Not for copy: Safari needs the
    // clipboard call to happen synchronously inside the click.)
    if (kind !== 'copy') await new Promise<void>((r) => window.setTimeout(r, 16));
    try {
      if (kind === 'png') {
        downloadBlob(await exportPngBlob(job), `${fileStem}.png`);
        show(`PNG downloaded (${size} px wide).`, 'success');
      } else if (kind === 'svg') {
        downloadBlob(new Blob([exportSvgString(job)], { type: 'image/svg+xml' }), `${fileStem}.svg`);
        show('SVG downloaded.', 'success');
      } else {
        if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
          show('This browser cannot copy images. Download the PNG instead.', 'error');
          return;
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': exportPngBlob(job) })]);
        show('PNG copied to the clipboard.', 'success');
      }
    } catch (err) {
      const denied = err instanceof DOMException && err.name === 'NotAllowedError';
      show(denied ? 'Clipboard access was blocked by the browser.' : 'Export failed. Try a smaller export size.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const spin = <Loader2 size={16} className="animate-spin" />;

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          <span className="mr-2 text-accent">3</span>Export
        </h2>
        <span className="text-xs tabular-nums text-ink-3">{size} px wide</span>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {QUICK_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => set('exportSize', s)}
            className={cx(
              'rounded-lg border py-1.5 text-xs font-semibold tabular-nums transition-colors',
              size === s ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <Slider label="Custom size" min={256} max={4096} step={64} value={size} onChange={(v) => set('exportSize', v)} format={(v) => `${v} px`} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="primary" size="lg" disabled={!job || busy !== null} onClick={() => void run('png')} icon={busy === 'png' ? spin : <Download size={17} />} data-testid="download-png">
          PNG
        </Button>
        <Button variant="secondary" size="lg" disabled={!job || busy !== null} onClick={() => void run('svg')} icon={busy === 'svg' ? spin : <FileCode2 size={17} />} data-testid="download-svg">
          SVG
        </Button>
        <Button variant="ghost" className="col-span-2" disabled={!job || busy !== null} onClick={() => void run('copy')} icon={busy === 'copy' ? spin : <Copy size={16} />}>
          Copy PNG to clipboard
        </Button>
      </div>
    </div>
  );
}
