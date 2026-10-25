import { useCallback, useEffect, useState } from 'react';

export type Page = 'qr' | 'barcode';

const fromHash = (): Page => (window.location.hash.replace(/^#\/?/, '') === 'barcode' ? 'barcode' : 'qr');

/** Current page, kept in the URL hash so reloads and bookmarks land on the same page. */
export function usePage(): { page: Page; go: (page: Page) => void } {
  const [page, setPage] = useState<Page>(fromHash);

  useEffect(() => {
    const onHash = (): void => setPage(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((next: Page) => {
    window.location.hash = next === 'qr' ? '/' : '/barcode';
    setPage(next);
    window.scrollTo({ top: 0 });
  }, []);

  return { page, go };
}
