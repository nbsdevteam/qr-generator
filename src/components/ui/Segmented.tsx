import type { ReactNode } from 'react';
import { cx } from './cx';

interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode; /** Accessible name when the label is empty. */ title?: string }>;
  onChange: (value: T) => void;
  className?: string;
}

export function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label ? <span className="text-[13px] font-medium text-ink-2">{label}</span> : null}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-line bg-sunken p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={o.title ? `${label ?? ''} ${o.title}`.trim() : undefined}
              title={o.title}
              onClick={() => onChange(o.value)}
              className={cx(
                'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-3px)] px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                active ? 'bg-surface text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-3 hover:text-ink',
              )}
            >
              {o.icon}
              {o.label ? <span className="truncate">{o.label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
