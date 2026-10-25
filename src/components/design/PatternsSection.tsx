import { Blend, Loader2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useDesign } from '../../hooks/useDesign';
import { useToast } from '../../hooks/useToast';
import { autoCornerBlend } from '../../lib/qr/optimize';
import type { RenderJob } from '../../lib/qr/render';
import { Button } from '../ui/Button';
import { ControlGrid, Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';

interface PatternsSectionProps {
  hasImage: boolean;
  job: RenderJob | null;
}

/** Controls how the fixed QR patterns (timing band, corner backings) blend with the image. */
export function PatternsSection({ hasImage, job }: PatternsSectionProps) {
  const { design, update } = useDesign();
  const { show } = useToast();
  const [searching, setSearching] = useState<number | null>(null);
  const p = design.patterns;

  const runAuto = async (): Promise<void> => {
    if (!job) return;
    setSearching(0.9);
    try {
      const result = await autoCornerBlend(job, (b) => setSearching(b));
      update('patterns', { cornerBlend: result.blend });
      if (!result.ok) show('This design is not reliable even with solid corners, so the corners are not the problem. Try Optimize for scanning.', 'error');
      else if (result.blend === 0) show('Corners need a solid backing on this image to scan reliably.', 'info');
      else show(`Corner blend set to ${Math.round(result.blend * 100)}%, the most see-through setting that scans with a safety margin.`, 'success');
    } finally {
      setSearching(null);
    }
  };

  return (
    <Section
      title="Blend patterns with image"
      icon={<Blend size={17} />}
      summary={
        hasImage
          ? `${p.style === 'dots' ? 'Timing band as dots' : 'Solid timing band'}, corners ${Math.round(p.cornerBlend * 100)}% blended${p.alignment === 'dots' ? ', small marker as dots' : ''}`
          : 'Used when a background image is added'
      }
    >
      <div className="flex flex-col gap-5">
        {!hasImage ? (
          <p className="rounded-lg bg-sunken px-3 py-2 text-xs text-ink-3">
            These settings shape how the code sits on a background image. Add an image to use them.
          </p>
        ) : null}

        <div className={hasImage ? 'flex flex-col gap-5' : 'pointer-events-none flex flex-col gap-5 opacity-50'}>
          <div className="flex flex-col gap-3">
            <Segmented
              label="Timing and format squares"
              value={p.style}
              options={[
                { value: 'dots', label: 'Dots, like the rest' },
                { value: 'solid', label: 'Solid strip' },
              ]}
              onChange={(style) => update('patterns', { style })}
            />
            <Slider
              label="Their dot size"
              min={30}
              max={100}
              value={Math.round(p.dotScale * 100)}
              disabled={p.style !== 'dots'}
              onChange={(v) => update('patterns', { dotScale: v / 100 })}
              format={(v) => `${v}%`}
              hint="These dots help scanners measure the grid. Keep them a little bigger than your other dots."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Segmented
              label="Small fourth marker (alignment)"
              value={p.alignment}
              options={[
                { value: 'marker', label: 'Marker, blended' },
                { value: 'dots', label: 'Dots, like the rest' },
              ]}
              onChange={(alignment) => update('patterns', { alignment })}
            />
            <p className="text-xs text-ink-3">
              {p.alignment === 'marker'
                ? 'Keeps its marker shape and gets the same see-through backing as the corners (Corner blend below).'
                : 'Disappears into the pattern, but scanners use it to correct for angle, so codes get harder to read. Check the scan badge.'}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-raised p-4">
            <p className="mb-1 text-[13px] font-semibold text-ink">Corner markers</p>
            <p className="mb-4 text-xs text-ink-3">
              Scanners find a code by its three corners, so they sit on a light backing. Blend lets your image show through it.
            </p>
            <ControlGrid>
              <Slider
                label="Corner blend"
                min={0}
                max={95}
                value={Math.round(p.cornerBlend * 100)}
                onChange={(v) => update('patterns', { cornerBlend: v / 100 })}
                format={(v) => (v === 0 ? 'Solid' : `${v}%`)}
                hint="0% is solid. Higher shows more of the image — watch the scan badge."
              />
              <Segmented
                label="Backing shape"
                value={p.backingShape}
                options={[
                  { value: 'follow', label: 'Follow marker' },
                  { value: 'square', label: 'Square' },
                ]}
                onChange={(backingShape) => update('patterns', { backingShape })}
              />
            </ControlGrid>
            <Button
              className="mt-4"
              variant="secondary"
              size="sm"
              disabled={!job || searching !== null}
              onClick={() => void runAuto()}
              icon={searching !== null ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            >
              {searching !== null ? `Testing ${Math.round(searching * 100)}%…` : 'Auto: most see-through that scans'}
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
