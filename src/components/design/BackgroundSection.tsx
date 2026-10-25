import { ImageIcon, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useDesign } from '../../hooks/useDesign';
import { useToast } from '../../hooks/useToast';
import { DEFAULT_DESIGN } from '../../lib/defaults';
import { ImageReadError, prepareImage } from '../../lib/image';
import { ColorField } from '../ui/ColorField';
import { ImageUpload } from '../ui/ImageUpload';
import { ControlGrid, Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

export function BackgroundSection() {
  const { design, setDesign, update } = useDesign();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const bg = design.background;

  const onFile = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const { dataUrl } = await prepareImage(file, 1600, 'photo');
      const firstImage = !design.background.src;
      setDesign((d) => ({
        ...d,
        ecc: 'H',
        dots: firstImage && d.dots.scale > 0.8 ? { ...d.dots, scale: 0.6, lightDots: true } : d.dots,
        background: { ...d.background, src: dataUrl, offsetX: 0, offsetY: 0, zoom: 1, rotation: 0 },
      }));
      show(firstImage ? 'Image added. Error correction set to H and dots shrunk to 60% so the image shows through.' : 'Image replaced.', 'success');
    } catch (err) {
      show(err instanceof ImageReadError ? err.message : 'This image could not be loaded.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetAdjustments = (): void => {
    const { src, ...defaults } = DEFAULT_DESIGN.background;
    void src;
    update('background', defaults);
  };

  return (
    <Section title="Background image" icon={<ImageIcon size={17} />} summary={bg.src ? 'Image behind the dots' : 'Put a photo or artwork behind the code'} defaultOpen>
      <div className="flex flex-col gap-5">
        <ImageUpload
          label={bg.src ? 'Background image' : 'Add an image'}
          hint="PNG, JPG or WebP. Stays in your browser."
          value={bg.src}
          busy={busy}
          onFile={(f) => void onFile(f)}
          onRemove={() => update('background', { src: null })}
        />
        {bg.src ? (
          <>
            <p className="-mt-2 text-xs text-ink-3">Tip: drag the image in the preview to reposition it.</p>
            <Segmented
              label="Fit"
              value={bg.fit}
              options={[
                { value: 'cover', label: 'Cover' },
                { value: 'contain', label: 'Contain' },
              ]}
              onChange={(fit) => update('background', { fit })}
            />
            <ControlGrid>
              <Slider label="Position X" min={-100} max={100} value={bg.offsetX} onChange={(offsetX) => update('background', { offsetX })} format={(v) => `${v}%`} />
              <Slider label="Position Y" min={-100} max={100} value={bg.offsetY} onChange={(offsetY) => update('background', { offsetY })} format={(v) => `${v}%`} />
              <Slider label="Zoom" min={50} max={400} value={Math.round(bg.zoom * 100)} onChange={(v) => update('background', { zoom: v / 100 })} format={(v) => `${v}%`} />
              <Slider label="Rotation" min={-180} max={180} value={bg.rotation} onChange={(rotation) => update('background', { rotation })} format={(v) => `${v}°`} />
              <Slider label="Opacity" min={0} max={100} value={Math.round(bg.opacity * 100)} onChange={(v) => update('background', { opacity: v / 100 })} format={(v) => `${v}%`} />
              <Slider label="Blur" min={0} max={30} value={bg.blur} onChange={(blur) => update('background', { blur })} />
              <Slider label="Brightness" min={20} max={200} value={bg.brightness} onChange={(brightness) => update('background', { brightness })} format={(v) => `${v}%`} />
              <Slider label="Contrast" min={20} max={200} value={bg.contrast} onChange={(contrast) => update('background', { contrast })} format={(v) => `${v}%`} />
            </ControlGrid>
            <Slider
              label="Module contrast"
              min={0}
              max={80}
              value={Math.round(bg.moduleTint * 100)}
              onChange={(v) => update('background', { moduleTint: v / 100 })}
              format={(v) => `${v}%`}
              hint="Darkens the image under dark modules and lightens it under light ones. The most image-friendly way to fix scanning."
            />
            <ControlGrid>
              <Toggle label="Grayscale" checked={bg.grayscale} onChange={(grayscale) => update('background', { grayscale })} />
              <Toggle
                label="Solid quiet zone"
                hint="A clean light margin around the code. Most reliable for print."
                checked={bg.solidQuietZone}
                onChange={(solidQuietZone) => update('background', { solidQuietZone })}
              />
            </ControlGrid>
            <div className="rounded-xl border border-line bg-raised p-4">
              <p className="mb-3 text-[13px] font-semibold text-ink">Overlay tint</p>
              <ControlGrid>
                <ColorField label="Tint color" value={bg.overlayColor} onChange={(overlayColor) => update('background', { overlayColor })} />
                <Slider
                  label="Tint strength"
                  min={0}
                  max={90}
                  value={Math.round(bg.overlayOpacity * 100)}
                  onChange={(v) => update('background', { overlayOpacity: v / 100 })}
                  format={(v) => `${v}%`}
                  hint="A light tint behind dark dots improves contrast."
                />
              </ControlGrid>
            </div>
            <button type="button" onClick={resetAdjustments} className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-accent hover:underline">
              <RotateCcw size={13} /> Reset image adjustments
            </button>
          </>
        ) : null}
      </div>
    </Section>
  );
}
