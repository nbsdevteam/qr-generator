import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Frame, Grip, Heading, RotateCw, Ruler, Type } from 'lucide-react';
import type { ReactNode } from 'react';
import { useBarcodeDesign } from '../../hooks/useBarcodeDesign';
import { FRAME_FONTS } from '../../lib/qr/fonts';
import type { SymbologyInfo } from '../../lib/barcode/symbologies';
import type { BearerStyle, CaptionSettings, Rotation, TextAlign } from '../../types/barcode';
import type { FrameFont } from '../../types/design';
import { DOT_SHAPES } from '../design/shapeOptions';
import { ColorField } from '../ui/ColorField';
import { cx } from '../ui/cx';
import { Select, TextInput } from '../ui/Field';
import { ControlGrid, Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { ShapePicker } from '../ui/ShapePicker';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

const FONT_OPTIONS = (Object.keys(FRAME_FONTS) as FrameFont[]).map((k) => ({ value: k, label: FRAME_FONTS[k].label }));
const mm = (v: number, digits = 2): string => `${v.toFixed(digits)} mm`;

/** EAN/UPC "magnification": 100% = 0.33 mm bars. */
const MAGNIFICATIONS = [
  { label: '80%', x: 0.264 },
  { label: '100%', x: 0.33 },
  { label: '150%', x: 0.495 },
  { label: '200%', x: 0.66 },
] as const;

export function SizeSection({ info }: { info: SymbologyInfo }) {
  const { design, update, set } = useBarcodeDesign();
  const s = design.size;
  const linear = info.kind === 'linear';
  return (
    <Section title="Size & print" icon={<Ruler size={17} />} summary={`${mm(s.xDimMm)} bars${linear ? `, ${mm(s.barHeightMm, 1)} tall` : ''}, ${design.dpi} dpi`} defaultOpen>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Slider
            label={linear ? 'Bar width (X-dimension)' : 'Module size'}
            min={0.15}
            max={1.2}
            step={0.005}
            value={s.xDimMm}
            onChange={(xDimMm) => update('size', { xDimMm, barHeightMm: linear ? Math.round((s.barHeightMm * xDimMm) / s.xDimMm * 10) / 10 : s.barHeightMm })}
            format={(v) => mm(v, 3)}
            hint={
              linear
                ? 'The narrowest bar. Height scales with it so proportions stay the same. Smaller than about 0.25 mm gets hard to print and scan.'
                : 'The size of one square. Smaller than about 0.25 mm gets hard to print and scan.'
            }
          />
          {info.retailText ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-3">Retail size:</span>
              {MAGNIFICATIONS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => update('size', { xDimMm: m.x, barHeightMm: Math.round(22.85 * (m.x / 0.33) * 100) / 100 })}
                  className={cx(
                    'rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                    Math.abs(s.xDimMm - m.x) < 0.002 ? 'border-accent text-accent' : 'border-line text-ink-3 hover:text-ink',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <ControlGrid>
          {linear ? (
            <Slider label="Bar height" min={3} max={80} step={0.5} value={s.barHeightMm} onChange={(barHeightMm) => update('size', { barHeightMm })} format={(v) => mm(v, 1)} />
          ) : null}
          {linear ? (
            <Slider
              label="Quiet zone (each side)"
              min={0}
              max={20}
              value={s.quietZone}
              onChange={(quietZone) => update('size', { quietZone })}
              format={(v) => `${v} bars`}
              hint={s.quietZone < 10 ? 'Most scanners need about 10 bar-widths of empty space each side.' : undefined}
            />
          ) : (
            <Slider
              label="Quiet zone"
              min={0}
              max={8}
              value={s.quietZone2d}
              onChange={(quietZone2d) => update('size', { quietZone2d })}
              format={(v) => `${v} modules`}
              hint={s.quietZone2d < 1 ? 'Leave at least one module of space around 2D codes.' : undefined}
            />
          )}
          <Slider label="Padding above & below" min={0} max={10} step={0.5} value={s.paddingMm} onChange={(paddingMm) => update('size', { paddingMm })} format={(v) => mm(v, 1)} />
        </ControlGrid>
        <Segmented
          label="Print resolution"
          value={String(design.dpi)}
          options={[
            { value: '300', label: '300 dpi' },
            { value: '600', label: '600 dpi' },
            { value: '1200', label: '1200 dpi' },
          ]}
          onChange={(v) => set('dpi', Number(v))}
        />
      </div>
    </Section>
  );
}

export function BarsSection({ info }: { info: SymbologyInfo }) {
  const { design, update } = useBarcodeDesign();
  const b = design.bars;
  const g = b.gradient;
  const linear = info.kind === 'linear';
  return (
    <Section title={linear ? 'Bars' : 'Modules'} icon={<Grip size={17} />} summary={`${b.color.toUpperCase()}${g.type !== 'none' ? ' gradient' : ''}${linear && b.roundness ? `, ${b.roundness}% rounded` : ''}`}>
      <div className="flex flex-col gap-5">
        <ControlGrid>
          <ColorField label={linear ? 'Bar color' : 'Module color'} value={b.color} onChange={(color) => update('bars', { color })} />
          <Segmented
            label="Fill"
            value={g.type}
            options={[
              { value: 'none', label: 'Solid' },
              { value: 'linear', label: 'Linear' },
              { value: 'radial', label: 'Radial' },
            ]}
            onChange={(type) => update('bars', { gradient: { ...g, type } })}
          />
        </ControlGrid>
        {g.type !== 'none' ? (
          <ControlGrid>
            <ColorField label="Gradient end color" value={g.color2} onChange={(color2) => update('bars', { gradient: { ...g, color2 } })} />
            {g.type === 'linear' ? (
              <Slider label="Angle" min={0} max={360} value={g.angle} onChange={(angle) => update('bars', { gradient: { ...g, angle } })} format={(v) => `${v}°`} />
            ) : null}
          </ControlGrid>
        ) : null}
        {linear ? (
          <ControlGrid>
            <Slider
              label="Rounded bar ends"
              min={0}
              max={50}
              value={b.roundness}
              onChange={(roundness) => update('bars', { roundness })}
              format={(v) => `${v}%`}
            />
            <Slider
              label="Bar width reduction"
              min={0}
              max={30}
              value={b.reduction}
              onChange={(reduction) => update('bars', { reduction })}
              format={(v) => `${v}%`}
              hint="Printers spread ink and fatten bars. Ask your printer; 0–15% is typical."
            />
          </ControlGrid>
        ) : (
          <>
            <ShapePicker label="Module shape" value={b.moduleShape} options={DOT_SHAPES} onChange={(moduleShape) => update('bars', { moduleShape })} />
            <Slider
              label="Dot size"
              min={40}
              max={100}
              value={Math.round(b.moduleScale * 100)}
              onChange={(v) => update('bars', { moduleScale: v / 100 })}
              format={(v) => `${v}%`}
              hint="Smaller modules with gaps look lighter but scan less reliably."
            />
          </>
        )}
      </div>
    </Section>
  );
}

const ALIGN_ICONS: Record<TextAlign, ReactNode> = {
  left: <AlignLeft size={14} />,
  center: <AlignCenter size={14} />,
  right: <AlignRight size={14} />,
  justify: <AlignJustify size={14} />,
};

export function TextSection({ info, humanText }: { info: SymbologyInfo; humanText: string }) {
  const { design, update } = useBarcodeDesign();
  const t = design.text;
  const is2d = info.kind === '2d';
  const shown = is2d ? t.show2d : t.show;
  return (
    <Section title="Readable text" icon={<Type size={17} />} summary={shown ? `${FRAME_FONTS[t.font].label}, ${t.sizePt} pt${info.retailText ? '' : `, ${t.position}`}` : 'Hidden'}>
      <div className="flex flex-col gap-5">
        <Toggle
          label={is2d ? 'Show the data as text' : 'Show the code as text'}
          hint={is2d ? 'Off by default for 2D codes, where the text is often wider than the code.' : undefined}
          checked={shown}
          onChange={(v) => update('text', is2d ? { show2d: v } : { show: v })}
        />
        {shown ? (
          <>
            {!info.retailText ? (
              <>
                <TextInput
                  label="Custom text (optional)"
                  value={t.override}
                  onChange={(override) => update('text', { override })}
                  placeholder={humanText}
                  hint="Leave empty to show the encoded data. This only changes the printed text, not what scanners read."
                />
                <ControlGrid>
                  <Segmented
                    label="Position"
                    value={t.position}
                    options={[
                      { value: 'below', label: 'Below' },
                      { value: 'above', label: 'Above' },
                    ]}
                    onChange={(position) => update('text', { position })}
                  />
                  <Segmented
                    label="Alignment"
                    value={t.align}
                    options={(['left', 'center', 'right', 'justify'] as const).map((a) => ({ value: a, label: '', title: a, icon: ALIGN_ICONS[a] }))}
                    onChange={(align) => update('text', { align })}
                  />
                </ControlGrid>
              </>
            ) : (
              <p className="-mt-2 text-xs text-ink-3">Retail codes place the digits in their standard positions under the bars.</p>
            )}
            <ControlGrid>
              <Select<FrameFont> label="Font" value={t.font} options={FONT_OPTIONS} onChange={(font) => update('text', { font })} />
              <ColorField label="Text color" value={t.color} onChange={(color) => update('text', { color })} />
              <Slider label="Text size" min={4} max={24} step={0.5} value={t.sizePt} onChange={(sizePt) => update('text', { sizePt })} format={(v) => `${v} pt`} />
              <Slider label="Gap from bars" min={0} max={4} step={0.1} value={t.gapMm} onChange={(gapMm) => update('text', { gapMm })} format={(v) => mm(v, 1)} />
              {!info.retailText ? (
                <Slider
                  label="Letter spacing"
                  min={0}
                  max={3}
                  step={0.05}
                  value={t.letterSpacingMm}
                  onChange={(letterSpacingMm) => update('text', { letterSpacingMm })}
                  format={(v) => mm(v, 2)}
                />
              ) : null}
            </ControlGrid>
            <ControlGrid>
              <Toggle label="Bold" checked={t.bold} onChange={(bold) => update('text', { bold })} />
              {info.retailText ? (
                <Toggle
                  label="Quiet-zone marks"
                  hint="Small > (and <) marks that show how much empty space to keep."
                  checked={t.guardMarks}
                  onChange={(guardMarks) => update('text', { guardMarks })}
                />
              ) : null}
            </ControlGrid>
          </>
        ) : null}
      </div>
    </Section>
  );
}

function CaptionFields({ which, label }: { which: 'top' | 'bottom'; label: string }) {
  const { design, update } = useBarcodeDesign();
  const c: CaptionSettings = design[which];
  const patch = (p: Partial<CaptionSettings>): void => update(which, p);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-raised p-4">
      <TextInput label={label} value={c.text} onChange={(text) => patch({ text })} placeholder={which === 'top' ? 'e.g. product or brand name' : 'e.g. 50 ml · Eau de Parfum'} maxLength={80} />
      {c.text.trim() ? (
        <ControlGrid>
          <Select<FrameFont> label="Font" value={c.font} options={FONT_OPTIONS} onChange={(font) => patch({ font })} />
          <ColorField label="Color" value={c.color} onChange={(color) => patch({ color })} />
          <Slider label="Size" min={4} max={28} step={0.5} value={c.sizePt} onChange={(sizePt) => patch({ sizePt })} format={(v) => `${v} pt`} />
          <Segmented
            label="Alignment"
            value={c.align}
            options={(['left', 'center', 'right'] as const).map((a) => ({ value: a, label: '', title: a, icon: ALIGN_ICONS[a] }))}
            onChange={(align) => patch({ align })}
          />
          <Toggle label="Bold" checked={c.bold} onChange={(bold) => patch({ bold })} />
        </ControlGrid>
      ) : null}
    </div>
  );
}

export function CaptionsSection() {
  const { design } = useBarcodeDesign();
  const used = [design.top.text, design.bottom.text].filter((t) => t.trim()).length;
  return (
    <Section title="Label text" icon={<Heading size={17} />} summary={used ? `${used} line${used > 1 ? 's' : ''}` : 'Add a product name, price or size'}>
      <div className="flex flex-col gap-3">
        <CaptionFields which="top" label="Line above" />
        <CaptionFields which="bottom" label="Line below" />
      </div>
    </Section>
  );
}

export function FrameSection({ info }: { info: SymbologyInfo }) {
  const { design, update } = useBarcodeDesign();
  const c = design.card;
  return (
    <Section title="Background & frame" icon={<Frame size={17} />} summary={`${c.transparent ? 'Transparent' : c.background.toUpperCase()}${c.borderWidthMm ? ', bordered' : ''}${c.bearer !== 'none' ? ', bearer bars' : ''}`}>
      <div className="flex flex-col gap-5">
        <ControlGrid>
          <ColorField label="Background" value={c.background} disabled={c.transparent} onChange={(background) => update('card', { background })} />
          <Toggle label="Transparent background" checked={c.transparent} onChange={(transparent) => update('card', { transparent })} />
          <Slider label="Border width" min={0} max={5} step={0.1} value={c.borderWidthMm} onChange={(borderWidthMm) => update('card', { borderWidthMm })} format={(v) => mm(v, 1)} />
          <ColorField label="Border color" value={c.borderColor} disabled={c.borderWidthMm <= 0} onChange={(borderColor) => update('card', { borderColor })} />
          <Slider label="Corner radius" min={0} max={12} step={0.5} value={c.radiusMm} onChange={(radiusMm) => update('card', { radiusMm })} format={(v) => mm(v, 1)} />
        </ControlGrid>
        {info.kind === 'linear' ? (
          <div className="flex flex-col gap-3">
            <Segmented<BearerStyle>
              label="Bearer bars"
              value={c.bearer}
              options={[
                { value: 'none', label: 'None' },
                { value: 'topbottom', label: 'Top & bottom' },
                { value: 'box', label: 'Box' },
              ]}
              onChange={(bearer) => update('card', { bearer })}
            />
            {c.bearer !== 'none' ? (
              <Slider label="Bearer thickness" min={1} max={10} step={0.2} value={c.bearerWidth} onChange={(bearerWidth) => update('card', { bearerWidth })} format={(v) => `${v} bars`} />
            ) : (
              <p className="text-xs text-ink-3">
                {info.id === 'itf14' ? 'ITF-14 cartons normally use a bearer box; it protects the code from partial scans.' : 'Thick lines that frame the bars, common on shipping cartons.'}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

export function RotationSection() {
  const { design, set } = useBarcodeDesign();
  return (
    <Section title="Rotation" icon={<RotateCw size={17} />} summary={`${design.rotation}°`}>
      <Segmented<`${Rotation}`>
        value={`${design.rotation}`}
        options={[
          { value: '0', label: '0°' },
          { value: '90', label: '90°' },
          { value: '180', label: '180°' },
          { value: '270', label: '270°' },
        ]}
        onChange={(v) => set('rotation', Number(v) as Rotation)}
      />
      <p className="mt-2 text-xs text-ink-3">Rotation is applied to the preview and to downloaded files.</p>
    </Section>
  );
}

