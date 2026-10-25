import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import type { EmbedResult } from '../../lib/embed';
import { exportPngBlob, exportSvgString, type RenderJob } from '../../lib/qr/render';
import type { PreviewStatus } from '../preview/PreviewPanel';
import { Button } from '../ui/Button';

const SEND_SIZE = 1024;

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Could not read the image.'));
    r.readAsDataURL(blob);
  });

interface EmbedPanelProps {
  job: RenderJob | null;
  status: PreviewStatus;
  onUse: (result: EmbedResult) => void;
  onCancel: () => void;
}

/** Replaces the export panel in embed mode: hands the finished code back to the portal. */
export function EmbedPanel({ job, status, onUse, onCancel }: EmbedPanelProps) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const usable = job !== null && (status === 'ok' || status === 'partial');

  const use = async (): Promise<void> => {
    if (!job || !usable) return;
    setBusy(true);
    await new Promise<void>((r) => window.setTimeout(r, 16));
    try {
      const sized: RenderJob = { ...job, design: { ...job.design, exportSize: SEND_SIZE } };
      const png = await blobToDataUrl(await exportPngBlob(sized));
      onUse({ payload: job.payload, svg: exportSvgString(sized), png, design: job.design, scan: status === 'ok' ? 'ok' : 'partial' });
    } catch {
      show('Could not create the image. Try a smaller logo or background image.', 'error');
      setBusy(false);
    }
  };

  const note =
    status === 'ok'
      ? null
      : status === 'partial'
        ? { warn: true, text: 'Scans up close but may fail from a distance. You can still use it.' }
        : status === 'fail'
          ? { warn: false, text: 'Not scannable yet. Press Optimize under the preview, or simplify the design.' }
          : status === 'error'
            ? { warn: false, text: 'This link does not fit in a QR code with the current settings.' }
            : { warn: true, text: 'Checking that the code scans…' };

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-1 font-display text-lg font-semibold text-ink">
        <span className="mr-2 text-accent">3</span>Save to the card
      </h2>
      <p className="mb-4 text-sm text-ink-3">The code and its style are saved with this employee, so you can edit it later.</p>
      {note ? (
        <p className={`mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${note.warn ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad'}`}>
          {status === 'pending' ? <Loader2 size={14} className="mt-px shrink-0 animate-spin" /> : <AlertTriangle size={14} className="mt-px shrink-0" />}
          {note.text}
        </p>
      ) : null}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button variant="primary" size="lg" disabled={!usable || busy} onClick={() => void use()} icon={busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} data-testid="embed-use">
          Use this QR
        </Button>
        <Button variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
