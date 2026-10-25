import { Barcode, Moon, QrCode, Sun } from 'lucide-react';
import type { Page } from '../../hooks/usePage';
import type { Theme } from '../../hooks/useTheme';
import { cx } from '../ui/cx';

function BrandMark() {
  // Original mark: one finder pattern with a halftone tail.
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <path d="M7 7h11v11H7zM9.5 9.5v6h6v-6z" fillRule="evenodd" className="fill-accent-ink" />
      <rect x="11" y="11" width="3" height="3" className="fill-accent-ink" />
      <circle cx="22.5" cy="9" r="1.9" className="fill-accent-ink" />
      <circle cx="22.5" cy="16" r="1.5" className="fill-accent-ink" />
      <circle cx="22.5" cy="22.5" r="2.2" className="fill-accent-ink" />
      <circle cx="16" cy="22.5" r="1.5" className="fill-accent-ink" />
      <circle cx="9" cy="22.5" r="1.1" className="fill-accent-ink" />
    </svg>
  );
}

const TABS: ReadonlyArray<{ page: Page; label: string; icon: typeof QrCode }> = [
  { page: 'qr', label: 'QR code', icon: QrCode },
  { page: 'barcode', label: 'Barcode', icon: Barcode },
];

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  page: Page;
  onNavigate: (page: Page) => void;
}

export function Header({ theme, onToggleTheme, page, onNavigate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <BrandMark />
        <div className="hidden min-w-0 md:block">
          <p className="font-display text-[19px] font-bold leading-none tracking-tight text-ink">QR Atelier</p>
          <p className="mt-1 truncate text-xs text-ink-3">Codes designed in your browser. Nothing is uploaded.</p>
        </div>
        <nav aria-label="Generators" className="mx-auto flex rounded-full border border-line bg-sunken p-1 md:mx-0 md:ml-6">
          {TABS.map(({ page: p, label, icon: Icon }) => (
            <button
              key={p}
              type="button"
              aria-current={page === p ? 'page' : undefined}
              onClick={() => onNavigate(p)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                page === p ? 'bg-surface text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-3 hover:text-ink',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent md:ml-auto"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </header>
  );
}
