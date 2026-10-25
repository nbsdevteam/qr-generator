import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContentPanel } from '../content/ContentPanel';
import { BackgroundSection } from '../design/BackgroundSection';
import { ColorsSection } from '../design/ColorsSection';
import { CornersSection } from '../design/CornersSection';
import { DotsSection } from '../design/DotsSection';
import { EccSection } from '../design/EccSection';
import { FrameSection } from '../design/FrameSection';
import { LogoSection } from '../design/LogoSection';
import { PatternsSection } from '../design/PatternsSection';
import { SpacingSection } from '../design/SpacingSection';
import { TemplatesPanel } from '../design/TemplatesPanel';
import { ExportPanel } from '../preview/ExportPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { Button } from '../ui/Button';
import { DesignContext, type DesignApi, type ObjectSectionKey } from '../../hooks/useDesign';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useImageElement } from '../../hooks/useImageElement';
import { useToast } from '../../hooks/useToast';
import { DEFAULT_DESIGN, withImages } from '../../lib/defaults';
import { DEFAULT_CONTENT, encodeContent } from '../../lib/payload';
import { BUILT_IN_TEMPLATES } from '../../lib/presets';
import { getMatrix, type RenderJob } from '../../lib/qr/render';
import type { SceneAssets } from '../../lib/qr/scene';
import {
  KEYS,
  loadContent,
  loadDesign,
  loadTemplates,
  saveDesignTo,
  saveTemplates,
  writeJson,
} from '../../lib/storage';
import type { ContentState } from '../../types/content';
import type { DesignTemplate, QrDesign } from '../../types/design';

const newId = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t${Date.now()}${Math.random()}`);

/** The QR code generator page. */
export function QrPage() {
  const { show } = useToast();

  const [design, setDesignState] = useState<QrDesign>(() => loadDesign() ?? DEFAULT_DESIGN);
  const [content, setContent] = useState<ContentState>(() => loadContent() ?? DEFAULT_CONTENT);
  const [templates, setTemplates] = useState<DesignTemplate[]>(loadTemplates);

  // ---------- design API shared through context ----------
  const setDesign = useCallback((next: QrDesign | ((d: QrDesign) => QrDesign)) => setDesignState(next), []);
  const update = useCallback(<K extends ObjectSectionKey>(key: K, patch: Partial<QrDesign[K]>) => {
    setDesignState((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }, []);
  const set = useCallback(<K extends keyof QrDesign>(key: K, value: QrDesign[K]) => {
    setDesignState((d) => ({ ...d, [key]: value }));
  }, []);
  const api = useMemo<DesignApi>(() => ({ design, setDesign, update, set }), [design, setDesign, update, set]);

  // ---------- content → payload ----------
  const { payload, error: payloadError } = useMemo(() => encodeContent(content), [content]);

  // ---------- images ----------
  const bgImg = useImageElement(design.background.src);
  const logoImg = useImageElement(design.logo.src);
  const assets = useMemo<SceneAssets>(() => ({ background: bgImg, logo: logoImg }), [bgImg, logoImg]);
  const ready = (!design.background.src || Boolean(bgImg)) && (!design.logo.src || Boolean(logoImg));

  const version = useMemo(() => {
    if (!payload) return null;
    try {
      return getMatrix(payload, design).version;
    } catch {
      return null;
    }
  }, [payload, design]);

  // Re-render once web fonts arrive so frame text uses the right face.
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    void document.fonts?.ready.then(() => setFontTick((t) => t + 1));
  }, []);

  const job = useMemo<RenderJob | null>(
    () => (payload ? { design, payload, assets } : null),
    // fontTick: redraw once web fonts finish loading.
    [design, payload, assets, fontTick],
  );

  // ---------- persistence ----------
  const savedDesign = useDebouncedValue(design, 500);
  const warnedImages = useRef<string>('');
  useEffect(() => {
    const outcome = saveDesignTo(KEYS.design, savedDesign);
    const imageKey = `${savedDesign.background.src?.length ?? 0}|${savedDesign.logo.src?.length ?? 0}`;
    if (outcome === 'saved-without-images' && warnedImages.current !== imageKey) {
      warnedImages.current = imageKey;
      show('Your image is too large to keep after a reload. Everything else is saved.', 'info');
    } else if (outcome === 'failed' && warnedImages.current !== 'failed') {
      warnedImages.current = 'failed';
      show('Browser storage is full or blocked, so changes will not survive a reload.', 'error');
    }
  }, [savedDesign, show]);

  const savedContent = useDebouncedValue(content, 400);
  useEffect(() => {
    writeJson(KEYS.content, savedContent);
  }, [savedContent]);

  const persistTemplates = useCallback(
    (next: DesignTemplate[]) => {
      setTemplates(next);
      const outcome = saveTemplates(next);
      if (outcome === 'saved-without-images') show('Templates saved without their images — browser storage is full.', 'info');
      if (outcome === 'failed') show('Could not save templates: browser storage is full or blocked.', 'error');
    },
    [show],
  );

  // ---------- template actions ----------
  /** Logos and background images need the highest error correction to stay readable. */
  const withSafeEcc = (d: QrDesign): QrDesign => (d.logo.src || d.background.src ? { ...d, ecc: 'H' } : d);

  const applyTemplate = (t: DesignTemplate): void => {
    setDesignState((d) => withSafeEcc({ ...withImages(t.design, d), exportSize: d.exportSize }));
    show(`Applied “${t.name}”.`, 'success');
  };
  const saveTemplate = (name: string): void => {
    persistTemplates([...templates, { id: newId(), name, design, builtIn: false, createdAt: Date.now() }]);
    show(`Saved “${name}”.`, 'success');
  };
  const renameTemplate = (id: string, name: string): void =>
    persistTemplates(templates.map((t) => (t.id === id ? { ...t, name } : t)));
  const deleteTemplate = (id: string): void => {
    const t = templates.find((x) => x.id === id);
    persistTemplates(templates.filter((x) => x.id !== id));
    if (t) show(`Deleted “${t.name}”.`, 'info');
  };
  const resetStyle = (): void => {
    setDesignState((d) => withSafeEcc(withImages({ ...DEFAULT_DESIGN, exportSize: d.exportSize }, d)));
    show('Style reset. Your images were kept.', 'info');
  };

  const [renderError, setRenderError] = useState<string | null>(null);
  const exportJob = renderError ? null : job;
  const fileStem = `qr-${content.type}`;
  const hasImage = Boolean(design.background.src);

  return (
    <DesignContext.Provider value={api}>
      <div>
        <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-7 lg:py-8">
          {/* Step 1 — content */}
          <section aria-labelledby="step-content" className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card sm:p-6 lg:col-start-1">
            <h2 id="step-content" className="mb-1 font-display text-lg font-semibold text-ink">
              <span className="mr-2 text-accent">1</span>Content
            </h2>
            <p className="mb-5 text-sm text-ink-3">What should the code open? The destination is baked into the code, so it works offline and forever.</p>
            <ContentPanel content={content} onChange={setContent} error={payloadError} />
          </section>

          {/* Live preview + export (sticky on desktop) */}
          <aside aria-label="Preview and export" className="flex flex-col gap-4 lg:sticky lg:top-[88px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <PreviewPanel job={job} ready={ready} emptyMessage={payloadError} onError={setRenderError} />
            {/* On desktop export sits under the sticky preview; on phones it follows the design step. */}
            <div className="hidden lg:block">
              <ExportPanel job={exportJob} fileStem={fileStem} />
            </div>
          </aside>

          {/* Step 2 — design */}
          <section aria-labelledby="step-design" className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card lg:col-start-1">
            <div className="flex items-start justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
              <div>
                <h2 id="step-design" className="mb-1 font-display text-lg font-semibold text-ink">
                  <span className="mr-2 text-accent">2</span>Design
                </h2>
                <p className="text-sm text-ink-3">Start from a style, then fine-tune every part.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetStyle} icon={<RotateCcw size={14} />}>
                Reset style
              </Button>
            </div>
            <div className="px-5 pb-5 sm:px-6">
              <TemplatesPanel
                builtIn={BUILT_IN_TEMPLATES}
                saved={templates}
                payload={payload}
                assets={assets}
                onApply={applyTemplate}
                onSave={saveTemplate}
                onRename={renameTemplate}
                onDelete={deleteTemplate}
              />
            </div>
            <div className="border-t border-line">
              <BackgroundSection />
              <DotsSection hasImage={hasImage} />
              <CornersSection />
              <PatternsSection hasImage={hasImage} job={exportJob} />
              <ColorsSection hasImage={hasImage} />
              <LogoSection />
              <FrameSection />
              <SpacingSection />
              <EccSection version={version} />
            </div>
          </section>

          <div className="lg:hidden">
            <ExportPanel job={exportJob} fileStem={fileStem} />
          </div>
        </main>
        <footer className="mx-auto max-w-[1240px] px-4 pb-10 text-xs text-ink-3 sm:px-6">
          Static QR codes only: no tracking, no accounts, no uploads. QR Code is a registered trademark of DENSO WAVE INCORPORATED.
        </footer>
      </div>
    </DesignContext.Provider>
  );
}
