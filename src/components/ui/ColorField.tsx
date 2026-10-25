import { History } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useRecentColors } from '../../hooks/useRecentColors';
import { isHexColor, normalizeHex } from '../../lib/color';
import { cx } from './cx';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Swatch (native picker) + hex input + recent colors. Picked colors are added to the recent list. */
export function ColorField({ label, value, onChange, disabled, className }: ColorFieldProps) {
  const id = useId();
  const { colors: recentColors, push: pushRecentColor } = useRecentColors();
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const touched = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  // Remember a color once the user settles on it.
  useEffect(() => {
    if (!touched.current) return;
    const t = window.setTimeout(() => {
      pushRecentColor(value);
      touched.current = false;
    }, 900);
    return () => window.clearTimeout(t);
  }, [value, pushRecentColor]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (next: string): void => {
    if (!isHexColor(next)) return;
    touched.current = true;
    onChange(normalizeHex(next));
  };

  return (
    <div ref={wrapRef} className={cx('relative flex flex-col gap-1.5', disabled && 'pointer-events-none opacity-50', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="flex h-10 items-center gap-1 rounded-[var(--radius-control)] border border-line bg-raised pl-1 pr-1 transition-colors focus-within:border-accent hover:border-line-strong">
        <input
          type="color"
          aria-label={`${label} picker`}
          className="swatch-input h-7 w-8 shrink-0 rounded-md ring-1 ring-line-strong"
          value={normalizeHex(value)}
          onChange={(e) => commit(e.target.value)}
        />
        <input
          id={id}
          className="h-full min-w-0 flex-1 bg-transparent px-1.5 font-mono text-[13px] uppercase text-ink focus:outline-none"
          value={draft}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            setDraft(e.target.value);
            if (isHexColor(e.target.value) && e.target.value.length === 7) commit(e.target.value);
          }}
          onBlur={() => {
            if (isHexColor(draft)) commit(draft);
            else setDraft(value);
          }}
        />
        <button
          type="button"
          aria-label="Recent colors"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink', open && 'bg-sunken text-ink')}
        >
          <History size={15} />
        </button>
      </div>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-line bg-surface p-3 shadow-card">
          <p className="mb-2 text-xs font-medium text-ink-3">Recent colors</p>
          {recentColors.length ? (
            <div className="grid grid-cols-7 gap-1.5">
              {recentColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={`Use ${c}`}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={cx('h-6 w-6 rounded-md ring-1 ring-line-strong transition-transform hover:scale-110', c === value && 'ring-2 ring-accent')}
                  style={{ background: c }}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-3">Colors you pick will show up here.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
