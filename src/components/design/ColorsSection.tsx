import { Palette } from 'lucide-react';
import { useDesign } from '../../hooks/useDesign';
import { ColorField } from '../ui/ColorField';
import { ControlGrid, Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

export function ColorsSection({ hasImage }: { hasImage: boolean }) {
  const { design, update } = useDesign();
  const c = design.colors;
  const g = c.gradient;
  return (
    <Section title="Colors" icon={<Palette size={17} />} summary={`${c.foreground.toUpperCase()} on ${c.transparent ? 'transparent' : c.background.toUpperCase()}`}>
      <div className="flex flex-col gap-5">
        <ControlGrid>
          <ColorField label="Dots (foreground)" value={c.foreground} onChange={(foreground) => update('colors', { foreground })} />
          <ColorField
            label={hasImage ? 'Light modules' : 'Background'}
            value={c.background}
            onChange={(background) => update('colors', { background })}
          />
        </ControlGrid>
        <Toggle
          label="Transparent background"
          hint={hasImage ? 'Removes the solid color under your image.' : 'Exports with no background fill. The scan check assumes a white surface.'}
          checked={c.transparent}
          onChange={(transparent) => update('colors', { transparent })}
        />
        <Segmented
          label="Dot fill"
          value={g.type}
          options={[
            { value: 'none', label: 'Solid' },
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' },
          ]}
          onChange={(type) => update('colors', { gradient: { ...g, type } })}
        />
        {g.type !== 'none' ? (
          <ControlGrid>
            <ColorField label="Gradient end color" value={g.color2} onChange={(color2) => update('colors', { gradient: { ...g, color2 } })} />
            {g.type === 'linear' ? (
              <Slider label="Angle" min={0} max={360} value={g.angle} onChange={(angle) => update('colors', { gradient: { ...g, angle } })} format={(v) => `${v}°`} />
            ) : (
              <p className="self-end text-xs text-ink-3">Radial fills run from the center outwards.</p>
            )}
          </ControlGrid>
        ) : null}
      </div>
    </Section>
  );
}
