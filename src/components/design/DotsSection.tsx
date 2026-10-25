import { Grip } from 'lucide-react';
import { useDesign } from '../../hooks/useDesign';
import { ControlGrid, Section } from '../ui/Section';
import { ShapePicker } from '../ui/ShapePicker';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { DOT_SHAPES } from './shapeOptions';

export function DotsSection({ hasImage }: { hasImage: boolean }) {
  const { design, update } = useDesign();
  const { dots, imageColor } = design;
  return (
    <Section
      title="Dots & detail level"
      icon={<Grip size={17} />}
      summary={`${DOT_SHAPES.find((s) => s.value === dots.shape)?.label ?? ''} dots at ${Math.round(dots.scale * 100)}%`}
      defaultOpen
    >
      <div className="flex flex-col gap-5">
        <ShapePicker label="Dot shape" value={dots.shape} options={DOT_SHAPES} onChange={(shape) => update('dots', { shape })} />
        <Slider
          label="Detail level (dot size)"
          min={20}
          max={100}
          value={Math.round(dots.scale * 100)}
          onChange={(v) => update('dots', { scale: v / 100 })}
          format={(v) => `${v}%`}
          hint={hasImage ? 'Smaller dots let more of your image show through.' : 'Smaller dots look lighter. Add a background image to see it through the gaps.'}
        />
        <ControlGrid>
          <Toggle
            label="Light dots over image"
            hint="Draws the light modules too, so the code reads on dark areas."
            checked={dots.lightDots}
            disabled={!hasImage}
            onChange={(lightDots) => update('dots', { lightDots })}
          />
          <Toggle
            label="Dots take image color"
            hint="Each dot samples the image beneath it."
            checked={imageColor.enabled}
            disabled={!hasImage}
            onChange={(enabled) => update('imageColor', { enabled })}
          />
        </ControlGrid>
        {imageColor.enabled && hasImage ? (
          <Slider
            label="Image color contrast boost"
            min={0}
            max={100}
            value={imageColor.contrast}
            onChange={(contrast) => update('imageColor', { contrast })}
            hint="Darkens dark dots and lightens light dots so the code still scans."
          />
        ) : null}
      </div>
    </Section>
  );
}
