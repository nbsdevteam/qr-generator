import { Scan } from 'lucide-react';
import { useDesign } from '../../hooks/useDesign';
import { isWeakFinderCombo } from '../../lib/qr/scene';
import { ColorField } from '../ui/ColorField';
import { ControlGrid, Section } from '../ui/Section';
import { ShapePicker } from '../ui/ShapePicker';
import { EYE_SHAPES, FRAME_SHAPES } from './shapeOptions';

export function CornersSection() {
  const { design, update } = useDesign();
  const f = design.finders;
  return (
    <Section title="Corner markers" icon={<Scan size={17} />} summary="Shape and color of the three finder patterns">
      <div className="flex flex-col gap-5">
        <ShapePicker label="Outer frame" value={f.frameShape} options={FRAME_SHAPES} onChange={(frameShape) => update('finders', { frameShape })} />
        <ShapePicker label="Inner eye" value={f.eyeShape} options={EYE_SHAPES} onChange={(eyeShape) => update('finders', { eyeShape })} />
        {isWeakFinderCombo(f.frameShape, f.eyeShape) ? (
          <p className="-mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            This frame and eye pair is harder for some scanners to find. Check the scan badge before printing.
          </p>
        ) : null}
        <ControlGrid>
          <ColorField label="Frame color" value={f.frameColor} onChange={(frameColor) => update('finders', { frameColor })} />
          <ColorField label="Eye color" value={f.eyeColor} onChange={(eyeColor) => update('finders', { eyeColor })} />
        </ControlGrid>
        <button
          type="button"
          className="self-start text-xs font-semibold text-accent hover:underline"
          onClick={() => update('finders', { frameColor: design.colors.foreground, eyeColor: design.colors.foreground })}
        >
          Match the dot color
        </button>
      </div>
    </Section>
  );
}
