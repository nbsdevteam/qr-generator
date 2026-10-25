import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { useDesign } from '../../hooks/useDesign';
import { useToast } from '../../hooks/useToast';
import { ImageReadError, prepareImage } from '../../lib/image';
import { ColorField } from '../ui/ColorField';
import { ImageUpload } from '../ui/ImageUpload';
import { ControlGrid, Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

export function LogoSection() {
  const { design, setDesign, update } = useDesign();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const logo = design.logo;

  const onFile = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const { dataUrl } = await prepareImage(file, 800, 'logo');
      setDesign((d) => ({ ...d, ecc: 'H', logo: { ...d.logo, src: dataUrl } }));
      show('Logo added. Error correction set to H.', 'success');
    } catch (err) {
      show(err instanceof ImageReadError ? err.message : 'This logo could not be loaded.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Center logo" icon={<BadgeCheck size={17} />} summary={logo.src ? `Logo at ${logo.size}%` : 'Optional'}>
      <div className="flex flex-col gap-5">
        <ImageUpload
          label={logo.src ? 'Logo' : 'Add a logo'}
          hint="Transparent PNG or SVG works best."
          value={logo.src}
          busy={busy}
          checker
          onFile={(f) => void onFile(f)}
          onRemove={() => update('logo', { src: null })}
        />
        {logo.src ? (
          <>
            <ControlGrid>
              <Slider
                label="Logo size"
                min={8}
                max={34}
                value={logo.size}
                onChange={(size) => update('logo', { size })}
                format={(v) => `${v}%`}
                hint={logo.size > 28 ? 'Large logos can stop the code from scanning.' : undefined}
              />
              <Slider label="Padding" min={0} max={40} value={logo.padding} onChange={(padding) => update('logo', { padding })} format={(v) => `${v}%`} />
              <Slider label="Corner rounding" min={0} max={50} value={logo.radius} onChange={(radius) => update('logo', { radius })} format={(v) => `${v}%`} />
              <ColorField label="Logo background" value={logo.background} disabled={!logo.showBackground} onChange={(background) => update('logo', { background })} />
            </ControlGrid>
            <ControlGrid>
              <Toggle label="Background behind logo" checked={logo.showBackground} onChange={(showBackground) => update('logo', { showBackground })} />
              <Toggle
                label="Clear dots behind logo"
                hint="Keeps the logo area clean."
                checked={logo.clearModules}
                onChange={(clearModules) => update('logo', { clearModules })}
              />
            </ControlGrid>
          </>
        ) : null}
      </div>
    </Section>
  );
}
