import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/layout/Header';
import { QrPage } from './components/qr/QrPage';
import { usePage } from './hooks/usePage';
import { RecentColorsContext, type RecentColorsApi } from './hooks/useRecentColors';
import { useTheme } from './hooks/useTheme';
import { normalizeHex } from './lib/color';
import { KEYS, loadRecentColors, writeJson } from './lib/storage';

// The barcode encoder is large, so its page loads the first time it is opened.
const BarcodePage = lazy(() => import('./components/barcode/BarcodePage').then((m) => ({ default: m.BarcodePage })));

export function App() {
  const { theme, toggle } = useTheme();
  const { page, go } = usePage();
  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
  const [barcodeOpened, setBarcodeOpened] = useState(page === 'barcode');
  useEffect(() => {
    if (page === 'barcode') setBarcodeOpened(true);
  }, [page]);

  const pushRecentColor = useCallback((color: string) => {
    setRecentColors((list) => {
      const c = normalizeHex(color);
      if (list[0] === c) return list;
      const next = [c, ...list.filter((x) => x !== c)].slice(0, 14);
      writeJson(KEYS.recentColors, next);
      return next;
    });
  }, []);
  const recent = useMemo<RecentColorsApi>(() => ({ colors: recentColors, push: pushRecentColor }), [recentColors, pushRecentColor]);

  return (
    <RecentColorsContext.Provider value={recent}>
      <div className="min-h-screen">
        <Header theme={theme} onToggleTheme={toggle} page={page} onNavigate={go} />
        {/* Both pages stay mounted so switching keeps each page's work in progress. */}
        <div hidden={page !== 'qr'}>
          <QrPage />
        </div>
        <div hidden={page !== 'barcode'}>
          {barcodeOpened ? (
            <Suspense fallback={<p className="px-6 py-16 text-center text-sm text-ink-3">Loading the barcode generator…</p>}>
              <BarcodePage active={page === 'barcode'} />
            </Suspense>
          ) : null}
        </div>
      </div>
    </RecentColorsContext.Provider>
  );
}
