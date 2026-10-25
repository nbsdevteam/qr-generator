import { Info, Sparkles } from 'lucide-react';
import { checkDigitNote } from '../../lib/barcode/encode';
import { GROUP_ORDER, SYMBOLOGIES, symbologyInfo } from '../../lib/barcode/symbologies';
import type { BarcodeContent, Symbology } from '../../types/barcode';
import { cx } from '../ui/cx';
import { TextArea, TextInput } from '../ui/Field';
import { Toggle } from '../ui/Toggle';

interface BarcodeDataPanelProps {
  content: BarcodeContent;
  onChange: (next: BarcodeContent) => void;
  error: string | null;
}

export function BarcodeDataPanel({ content, onChange, error }: BarcodeDataPanelProps) {
  const info = symbologyInfo(content.symbology);
  const value = content.values[content.symbology];
  const setValue = (v: string): void => onChange({ ...content, values: { ...content.values, [content.symbology]: v } });
  const setType = (symbology: Symbology): void => onChange({ ...content, symbology });
  const note = checkDigitNote(content);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Barcode type">
        {GROUP_ORDER.map((group) => (
          <div key={group} className="grid grid-cols-[88px_1fr] items-start gap-3">
            <span className="pt-2 text-xs font-medium text-ink-3">{group}</span>
            <div className="flex flex-wrap gap-1.5">
              {SYMBOLOGIES.filter((s) => s.group === group).map((s) => {
                const active = s.id === content.symbology;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={s.use}
                    onClick={() => setType(s.id)}
                    className={cx(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition-colors',
                      active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-raised text-ink-2 hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="-mt-1 rounded-lg bg-sunken px-3 py-2 text-xs text-ink-3">
        <span className="font-semibold text-ink-2">{info.label}:</span> {info.use}.
        {!info.verify ? ' This type can’t be checked in the browser, so test it with a scanner or phone app.' : ''}
      </p>

      <div className="flex flex-col gap-4">
        {info.kind === '2d' ? (
          <TextArea label="Data" rows={3} value={value} onChange={setValue} hint={info.hint} spellCheck={false} />
        ) : (
          <TextInput
            label="Data"
            value={value}
            onChange={setValue}
            hint={info.hint}
            spellCheck={false}
            inputMode={/digits|number/i.test(info.hint) && !/letters/i.test(info.hint) ? 'numeric' : undefined}
            aside={
              <button type="button" onClick={() => setValue(info.sample)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                <Sparkles size={12} /> Example
              </button>
            }
          />
        )}
        {note ? <p className="-mt-2 text-xs text-ink-2">{note}</p> : null}

        {info.supportsAddon ? (
          <TextInput
            label="Add-on (optional)"
            value={content.addon}
            onChange={(addon) => onChange({ ...content, addon })}
            inputMode="numeric"
            maxLength={5}
            placeholder="2 or 5 digits"
            hint="A small extra barcode on the right, used for magazine issues or book prices."
          />
        ) : null}

        {info.supportsCheck ? (
          <Toggle
            label="Add a check digit"
            hint="An extra character scanners use to catch misreads. Only turn on if your system expects it."
            checked={content.includeCheck}
            onChange={(includeCheck) => onChange({ ...content, includeCheck })}
          />
        ) : null}
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad" data-testid="barcode-error">
          <Info size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
