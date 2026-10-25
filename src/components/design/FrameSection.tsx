import { Frame } from 'lucide-react';
import { useDesign } from '../../hooks/useDesign';
import { FRAME_FONTS } from '../../lib/qr/fonts';
import type { FrameFont, FrameStyle } from '../../types/design';
import { cx } from '../ui/cx';
import { ColorField } from '../ui/ColorField';
import { Select, TextInput } from '../ui/Field';
import { ControlGrid, Section } from '../ui/Section';
import { Slider } from '../ui/Slider';

const STYLES: ReadonlyArray<{ value: FrameStyle; label: string; art: string }> = [
  { value: 'none', label: 'None', art: 'M5 5h14v14H5z' },
  { value: 'banner-bottom', label: 'Banner below', art: 'M3 2h18v20H3zM6 5v10h12V5z' },
  { value: 'banner-top', label: 'Banner above', art: 'M3 2h18v20H3zM6 9v10h12V9z' },
  { value: 'pill', label: 'Pill label', art: 'M4 2h16v14H4zM6 4v10h12V4zM7 18h10a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4z' },
  { value: 'bubble', label: 'Speech bubble', art: 'M4 2h16v13H4zM6 4v9h12V4zM4 18h7l1-1.5 1 1.5h7v4H4z' },
  { value: 'outline', label: 'Outline', art: 'M3 2h18v20H3zM4.5 3.5v17h15v-17zM7 6h10v9H7z' },
];

export function FrameSection() {
  const { design, update } = useDesign();
  const fr = design.frame;
  const active = fr.style !== 'none';
  return (
    <Section title="Frame & call to action" icon={<Frame size={17} />} summary={active ? `${STYLES.find((s) => s.value === fr.style)?.label ?? ''}: “${fr.text}”` : 'No frame'}>
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Frame style" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={fr.style === s.value}
              onClick={() => update('frame', { style: s.value })}
              className={cx(
                'flex flex-col items-center gap-1 rounded-xl border px-1 pb-1.5 pt-2 text-[11px] font-medium transition-colors',
                fr.style === s.value ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-raised text-ink-3 hover:border-line-strong hover:text-ink',
              )}
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                <path d={s.art} fill="currentColor" fillRule="evenodd" opacity={s.value === 'none' ? 0.35 : 1} />
              </svg>
              {s.label}
            </button>
          ))}
        </div>
        {active ? (
          <>
            <TextInput label="Text" value={fr.text} maxLength={40} onChange={(text) => update('frame', { text })} placeholder="Scan me" />
            <div className="-mt-3 flex flex-wrap gap-1.5">
              {['Scan me', 'Scan to visit', 'Scan for menu', 'Join our Wi-Fi', 'Chat with us'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update('frame', { text: t })}
                  className={cx('rounded-full border px-2.5 py-0.5 text-xs transition-colors', fr.text === t ? 'border-accent text-accent' : 'border-line text-ink-3 hover:text-ink')}
                >
                  {t}
                </button>
              ))}
            </div>
            <ControlGrid>
              <ColorField label="Frame color" value={fr.color} onChange={(color) => update('frame', { color })} />
              <ColorField label="Text color" value={fr.textColor} disabled={fr.style === 'outline'} onChange={(textColor) => update('frame', { textColor })} />
              <Slider label="Text size" min={4} max={16} step={0.5} value={fr.textSize} onChange={(textSize) => update('frame', { textSize })} />
              <Select<FrameFont>
                label="Font"
                value={fr.font}
                options={(Object.keys(FRAME_FONTS) as FrameFont[]).map((k) => ({ value: k, label: FRAME_FONTS[k].label }))}
                onChange={(font) => update('frame', { font })}
              />
              <Slider label="Frame width" min={0.5} max={10} step={0.5} value={fr.width} onChange={(width) => update('frame', { width })} />
              <Slider label="Frame corner radius" min={0} max={30} value={fr.radius} onChange={(radius) => update('frame', { radius })} />
            </ControlGrid>
            {fr.style === 'outline' ? <p className="-mt-2 text-xs text-ink-3">The outline style uses the frame color for its text.</p> : null}
          </>
        ) : null}
      </div>
    </Section>
  );
}
