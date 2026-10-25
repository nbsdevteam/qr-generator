import { Square } from 'lucide-react';
import { useDesign } from '../../hooks/useDesign';
import { ColorField } from '../ui/ColorField';
import { ControlGrid, Section } from '../ui/Section';
import { Slider } from '../ui/Slider';

export function SpacingSection() {
  const { design, update, set } = useDesign();
  const b = design.border;
  return (
    <Section title="Quiet zone & border" icon={<Square size={17} />} summary={`${design.quietZone}-module quiet zone${b.width > 0 ? `, ${b.width}% border` : ''}`}>
      <ControlGrid>
        <Slider
          label="Quiet zone (padding)"
          min={0}
          max={8}
          value={design.quietZone}
          onChange={(v) => set('quietZone', v)}
          format={(v) => `${v} modules`}
          hint={design.quietZone < 2 ? 'Some scanners need at least 2 modules of space.' : undefined}
        />
        <Slider label="Border width" min={0} max={10} step={0.5} value={b.width} onChange={(width) => update('border', { width })} format={(v) => `${v}%`} />
        <ColorField label="Border color" value={b.color} onChange={(color) => update('border', { color })} />
        <Slider label="Corner radius" min={0} max={30} value={b.radius} onChange={(radius) => update('border', { radius })} format={(v) => `${v}%`} />
      </ControlGrid>
    </Section>
  );
}
