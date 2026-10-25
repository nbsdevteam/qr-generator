import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarcodeDesignContext, type BarcodeDesignApi, type BarcodeSectionKey } from '../../hooks/useBarcodeDesign';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../hooks/useToast';
import {
  BARCODE_PRESETS,
  DEFAULT_BARCODE_DESIGN,
  loadBarcodeContent,
  loadBarcodeDesign,
  loadBarcodeTemplates,
  saveBarcodeContent,
  saveBarcodeDesign,
  saveBarcodeTemplates,
} from '../../lib/barcode/defaults';
import type { BarcodeJob, PreparedBarcode } from '../../lib/barcode/render';
import { symbologyInfo } from '../../lib/barcode/symbologies';
import type { BarcodeContent, BarcodeDesign, BarcodeTemplate } from '../../types/barcode';
import { Button } from '../ui/Button';
import { BarcodeDataPanel } from './BarcodeDataPanel';
import { BarcodeExport } from './BarcodeExport';
import { BarcodePreview } from './BarcodePreview';
import { BarsSection, CaptionsSection, FrameSection, RotationSection, SizeSection, TextSection } from './BarcodeSections';
import { BarcodeTemplates } from './BarcodeTemplates';

const newId = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `b${Date.now()}${Math.random()}`);

/** The barcode generator page. */
export function BarcodePage({ active }: { active: boolean }) {
  const { show } = useToast();
  const [design, setDesignState] = useState<BarcodeDesign>(loadBarcodeDesign);
  const [content, setContent] = useState<BarcodeContent>(loadBarcodeContent);
  const [templates, setTemplates] = useState<BarcodeTemplate[]>(loadBarcodeTemplates);
  const [prepared, setPrepared] = useState<PreparedBarcode | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const onPrepared = useCallback((p: PreparedBarcode | null, error: string | null) => {
    setPrepared(p);
    setInputError(error);
  }, []);

  const setDesign = useCallback((next: BarcodeDesign | ((d: BarcodeDesign) => BarcodeDesign)) => setDesignState(next), []);
  const update = useCallback(<K extends BarcodeSectionKey>(key: K, patch: Partial<BarcodeDesign[K]>) => {
    setDesignState((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }, []);
  const set = useCallback(<K extends keyof BarcodeDesign>(key: K, value: BarcodeDesign[K]) => {
    setDesignState((d) => ({ ...d, [key]: value }));
  }, []);
  const api = useMemo<BarcodeDesignApi>(() => ({ design, setDesign, update, set }), [design, setDesign, update, set]);

  // Redraw once web fonts are ready so text measures correctly.
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    void document.fonts?.ready.then(() => setFontTick((t) => t + 1));
  }, []);
  const job = useMemo<BarcodeJob>(
    () => ({ design, content }),
    // fontTick: redraw after fonts load.
    [design, content, fontTick],
  );

  // Persistence.
  const savedDesign = useDebouncedValue(design, 400);
  useEffect(() => {
    saveBarcodeDesign(savedDesign);
  }, [savedDesign]);
  const savedContent = useDebouncedValue(content, 400);
  useEffect(() => {
    saveBarcodeContent(savedContent);
  }, [savedContent]);

  const persistTemplates = (next: BarcodeTemplate[]): void => {
    setTemplates(next);
    if (!saveBarcodeTemplates(next)) show('Could not save templates: browser storage is full or blocked.', 'error');
  };

  const info = symbologyInfo(content.symbology);
  const humanText = prepared?.encoded.humanText ?? '';

  return (
    <BarcodeDesignContext.Provider value={api}>
      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-7 lg:py-8">
        <section aria-labelledby="bc-step-data" className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card sm:p-6 lg:col-start-1">
          <h2 id="bc-step-data" className="mb-1 font-display text-lg font-semibold text-ink">
            <span className="mr-2 text-accent">1</span>Barcode type & data
          </h2>
          <p className="mb-5 text-sm text-ink-3">Pick the barcode your shop, warehouse or printer expects, then enter its value.</p>
          <BarcodeDataPanel content={content} onChange={setContent} error={inputError} />
        </section>

        <aside aria-label="Barcode preview and export" className="flex flex-col gap-4 lg:sticky lg:top-[88px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <BarcodePreview job={job} active={active} onPrepared={onPrepared} />
          <div className="hidden lg:block">
            <BarcodeExport job={prepared ? job : null} prepared={prepared} />
          </div>
        </aside>

        <section aria-labelledby="bc-step-design" className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card lg:col-start-1">
          <div className="flex items-start justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
            <div>
              <h2 id="bc-step-design" className="mb-1 font-display text-lg font-semibold text-ink">
                <span className="mr-2 text-accent">2</span>Design
              </h2>
              <p className="text-sm text-ink-3">Size it for print, then style every part.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={() => {
                setDesignState(DEFAULT_BARCODE_DESIGN);
                show('Barcode style reset.', 'info');
              }}
            >
              Reset style
            </Button>
          </div>
          <div className="px-5 pb-5 sm:px-6">
            <BarcodeTemplates
              builtIn={BARCODE_PRESETS}
              saved={templates}
              content={content}
              active={active}
              onApply={(t) => {
                setDesignState({ ...t.design, dpi: design.dpi });
                show(`Applied “${t.name}”.`, 'success');
              }}
              onSave={(name) => {
                persistTemplates([...templates, { id: newId(), name, design, builtIn: false, createdAt: Date.now() }]);
                show(`Saved “${name}”.`, 'success');
              }}
              onRename={(id, name) => persistTemplates(templates.map((t) => (t.id === id ? { ...t, name } : t)))}
              onDelete={(id) => {
                const t = templates.find((x) => x.id === id);
                persistTemplates(templates.filter((x) => x.id !== id));
                if (t) show(`Deleted “${t.name}”.`, 'info');
              }}
            />
          </div>
          <div className="border-t border-line">
            <SizeSection info={info} />
            <BarsSection info={info} />
            <TextSection info={info} humanText={humanText} />
            <CaptionsSection />
            <FrameSection info={info} />
            <RotationSection />
          </div>
        </section>

        <div className="lg:hidden">
          <BarcodeExport job={prepared ? job : null} prepared={prepared} />
        </div>
      </main>
      <footer className="mx-auto max-w-[1240px] px-4 pb-10 text-xs text-ink-3 sm:px-6">
        Retail barcodes (EAN, UPC) need numbers registered with GS1 to be sold in shops. Everything here runs in your browser.
      </footer>
    </BarcodeDesignContext.Provider>
  );
}
