import { useId } from 'react';
import { cx } from './cx';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ label, checked, onChange, hint, disabled, className }: ToggleProps) {
  const id = useId();
  return (
    <div className={cx('flex items-start justify-between gap-3', disabled && 'opacity-50', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-sunken',
        )}
      >
        <span
          className={cx(
            'inline-block h-3.5 w-3.5 rounded-full shadow transition-transform',
            checked ? 'translate-x-[18px] bg-accent-ink' : 'translate-x-[3px] bg-ink-3',
          )}
        />
      </button>
    </div>
  );
}
