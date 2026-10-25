import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cx } from './cx';

interface SectionProps {
  title: string;
  icon?: ReactNode;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Collapsible group of controls inside the design card. */
export function Section({ title, icon, summary, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-t border-line first:border-t-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="group flex w-full items-center gap-3 px-5 py-4 text-left"
        >
          <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors', open ? 'bg-accent-soft text-accent' : 'bg-sunken text-ink-3 group-hover:text-ink')}>
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{title}</span>
            {summary ? <span className="block truncate text-xs text-ink-3">{summary}</span> : null}
          </span>
          <ChevronDown size={18} className={cx('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} />
        </button>
      </h3>
      <div id={id} hidden={!open} className="px-5 pb-5">
        {children}
      </div>
    </section>
  );
}

/** Standard two-column grid for controls inside a section. */
export function ControlGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2', className)}>{children}</div>;
}
