import { cx } from './cx';

export interface ShapeOption<T extends string> {
  value: T;
  label: string;
  /** SVG path data in a 0–24 box. */
  d: string;
  evenOdd?: boolean;
}

interface ShapePickerProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<ShapeOption<T>>;
  onChange: (value: T) => void;
}

/** Visual tile picker; the previews are drawn with the same shape code as the QR renderer. */
export function ShapePicker<T extends string>({ label, value, options, onChange }: ShapePickerProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.label}
              onClick={() => onChange(o.value)}
              className={cx(
                'flex flex-col items-center gap-1 rounded-xl border px-1 pb-1.5 pt-2 text-[11px] font-medium transition-colors',
                active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-raised text-ink-3 hover:border-line-strong hover:text-ink',
              )}
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                <path d={o.d} fill="currentColor" fillRule={o.evenOdd ? 'evenodd' : 'nonzero'} />
              </svg>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
