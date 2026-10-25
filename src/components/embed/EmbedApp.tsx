import { Link2, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RecentColorsContext, type RecentColorsApi } from '../../hooks/useRecentColors';
import { normalizeHex } from '../../lib/color';
import { DEFAULT_DESIGN, mergeDeep } from '../../lib/defaults';
import { isInitMessage, postToHost, type EmbedParams, type EmbedResult } from '../../lib/embed';
import { KEYS, loadRecentColors, writeJson } from '../../lib/storage';
import type { QrDesign } from '../../types/design';
import { QrPage } from '../qr/QrPage';
import { Button } from '../ui/Button';

/** How long to wait for the host's saved style before opening with this app's own. */
const INIT_WAIT_MS = 1500;

/** The QR designer as shown inside the NBS portal. */
export function EmbedApp({ params }: { params: EmbedParams }) {
  const [initial, setInitial] = useState<{ design: QrDesign | null } | null>(null);

  // Theme comes from the host so the frame matches it; it is not saved.
  useEffect(() => {
    if (params.theme) document.documentElement.classList.toggle('dark', params.theme === 'dark');
  }, [params.theme]);

  useEffect(() => {
    const onMessage = (e: MessageEvent): void => {
      if (!isInitMessage(e, params)) return;
      const raw = e.data.design;
      setInitial((cur) => cur ?? { design: raw && typeof raw === 'object' ? mergeDeep(DEFAULT_DESIGN, raw) : null });
    };
    window.addEventListener('message', onMessage);
    postToHost(params, { type: 'ready' });
    const timer = window.setTimeout(() => setInitial((cur) => cur ?? { design: null }), INIT_WAIT_MS);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, [params]);

  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
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

  const cancel = (): void => postToHost(params, { type: 'cancel' });
  const use = (result: EmbedResult): void => postToHost(params, { type: 'done', result });

  // Esc closes the designer, like any dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) postToHost(params, { type: 'cancel' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [params]);

  return (
    <RecentColorsContext.Provider value={recent}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[17px] font-bold leading-tight text-ink">QR code{params.name ? ` for ${params.name}` : ''}</p>
              <p className="flex min-w-0 items-center gap-1 truncate text-xs text-ink-3">
                <Link2 size={12} className="shrink-0" />
                <span className="truncate">{params.data}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={cancel} icon={<X size={15} />}>
              Cancel
            </Button>
          </div>
        </header>
        {initial ? (
          <QrPage embed={{ payload: params.data, initialDesign: initial.design, onUse: use, onCancel: cancel }} />
        ) : (
          <p className="flex items-center justify-center gap-2 px-6 py-24 text-sm text-ink-3">
            <Loader2 size={16} className="animate-spin" /> Loading the saved style…
          </p>
        )}
      </div>
    </RecentColorsContext.Provider>
  );
}

/** Shown when #/embed is opened with missing or unsafe parameters. */
export function EmbedError() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-display text-lg font-semibold text-ink">This designer link is incomplete.</p>
      <p className="mt-2 text-sm text-ink-3">Open the QR designer from the portal again.</p>
    </div>
  );
}
