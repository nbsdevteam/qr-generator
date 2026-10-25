import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

export const controlClass =
  'w-full rounded-[var(--radius-control)] border border-line bg-raised px-3 text-sm text-ink placeholder:text-ink-3 ' +
  'transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus-visible:outline-none ' +
  'focus:ring-2 focus:ring-accent/25 disabled:opacity-50';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
  aside?: ReactNode;
}

export function Field({ label, hint, children, className, aside }: FieldProps) {
  const id = useId();
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {aside}
      </div>
      {children(id)}
      {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Small action shown next to the label. */
  aside?: ReactNode;
}

export function TextInput({ label, hint, value, onChange, className, aside, ...rest }: TextInputProps) {
  return (
    <Field label={label} hint={hint} className={className} aside={aside}>
      {(id) => (
        <input id={id} className={cx(controlClass, 'h-10')} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      )}
    </Field>
  );
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
}

export function TextArea({ label, hint, value, onChange, className, rows = 3, ...rest }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <textarea
          id={id}
          rows={rows}
          className={cx(controlClass, 'resize-y py-2 leading-relaxed')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      )}
    </Field>
  );
}

interface SelectProps<T extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange, className, ...rest }: SelectProps<T>) {
  return (
    <Field label={label} className={className}>
      {(id) => (
        <select
          id={id}
          className={cx(controlClass, 'h-10 cursor-pointer')}
          value={value}
          onChange={(e) => {
            const found = options.find((o) => o.value === e.target.value);
            if (found) onChange(found.value);
          }}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
