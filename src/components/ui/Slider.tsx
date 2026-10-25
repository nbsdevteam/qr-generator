import { useId, type CSSProperties } from 'react';
import { cx } from './cx';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

export function Slider({ label, value, min, max, step = 1, onChange, format, disabled, hint, className }: SliderProps) {
  const id = useId();
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const style = { '--fill': `${Math.max(0, Math.min(100, pct))}%` } as CSSProperties;
  return (
    <div className={cx('flex flex-col gap-1', disabled && 'opacity-60', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="text-xs tabular-nums text-ink-3">
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        style={style}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}
