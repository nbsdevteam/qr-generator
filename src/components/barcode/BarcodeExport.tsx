import { Copy, Download, FileCode2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { downloadBlob } from '../../lib/qr/render';
import { exportBarcodePng, exportBarcodeSvg, type BarcodeJob, type PreparedBarcode } from '../../lib/barcode/render';
import { printPxPerModule } from '../../lib/barcode/scene';
import { Button } from '../ui/Button';

interface BarcodeExportProps {
  job: BarcodeJob | null;
  prepared: PreparedBarcode | null;
}

const fileStem = (job: BarcodeJob): string => {
  const value = job.content.values[job.content.symbology].trim().replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(0, 40);
  return `barcode-${job.content.symbology}-${value || 'code'}`;
};

export function BarcodeExport({ job, prepared }: BarcodeExportProps) {
  const { show } = useToast();
  const [busy, setBusy] = useState<'png' | 'svg' | 'copy' | null>(null);
  const ready = Boolean(job && prepared);

  const k = job ? printPxPerModule(job.design) : 1;
  const swap = job ? job.design.rotation === 90 || job.design.rotation === 270 : false;
  const pxW = prepared ? Math.round((swap ? prepared.layout.box.h : prepared.layout.box.w) * k) : 0;
  const pxH = prepared ? Math.round((swap ? prepared.layout.box.w : prepared.layout.box.h) * k) : 0;

  const run = async (kind: 'png' | 'svg' | 'copy'): Promise<void> => {
    if (!job) return;
    setBusy(kind);
    if (kind !== 'copy') await new Promise<void>((r) => window.setTimeout(r, 16));
    try {
      if (kind === 'png') {
        downloadBlob(await exportBarcodePng(job), `${fileStem(job)}.png`);
        show(`PNG downloaded (${pxW} × ${pxH} px at ${job.design.dpi} dpi).`, 'success');
      } else if (kind === 'svg') {
        downloadBlob(new Blob([exportBarcodeSvg(job)], { type: 'image/svg+xml' }), `${fileStem(job)}.svg`);
        show('SVG downloaded, sized in millimetres.', 'success');
      } else {
        if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
          show('This browser cannot copy images. Download the PNG instead.', 'error');
          return;
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': exportBarcodePng(job) })]);
        show('PNG copied to the clipboard.', 'success');
      }
    } catch (err) {
      const denied = err instanceof DOMException && err.name === 'NotAllowedError';
      show(denied ? 'Clipboard access was blocked by the browser.' : 'Export failed.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const spin = <Loader2 size={16} className="animate-spin" />;
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          <span className="mr-2 text-accent">3</span>Export
        </h2>
        {ready ? <span className="text-xs tabular-nums text-ink-3">{pxW} × {pxH} px</span> : null}
      </div>
      <p className="mb-4 text-xs text-ink-3">PNG bars are snapped to whole pixels at the print resolution, so they print crisp. SVG is vector and sized in mm.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" size="lg" disabled={!ready || busy !== null} onClick={() => void run('png')} icon={busy === 'png' ? spin : <Download size={17} />} data-testid="barcode-png">
          PNG
        </Button>
        <Button variant="secondary" size="lg" disabled={!ready || busy !== null} onClick={() => void run('svg')} icon={busy === 'svg' ? spin : <FileCode2 size={17} />} data-testid="barcode-svg">
          SVG
        </Button>
        <Button variant="ghost" className="col-span-2" disabled={!ready || busy !== null} onClick={() => void run('copy')} icon={busy === 'copy' ? spin : <Copy size={16} />}>
          Copy PNG to clipboard
        </Button>
      </div>
    </div>
  );
}
