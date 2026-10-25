import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDesign } from '../../hooks/useDesign';
import { withImages } from '../../lib/defaults';
import { renderOffscreen } from '../../lib/qr/render';
import type { SceneAssets } from '../../lib/qr/scene';
import type { DesignTemplate } from '../../types/design';
import { Button } from '../ui/Button';
import { controlClass } from '../ui/Field';
import { cx } from '../ui/cx';

interface TemplatesPanelProps {
  builtIn: DesignTemplate[];
  saved: DesignTemplate[];
  payload: string;
  assets: SceneAssets;
  onApply: (t: DesignTemplate) => void;
  onSave: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function useThumbnails(templates: DesignTemplate[], payload: string, assets: SceneAssets, current: DesignTemplate['design']): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const key = useDebouncedValue(`${payload}|${templates.map((t) => t.id + t.name).join(',')}`, 350);
  const debouncedAssets = useDebouncedValue(assets, 350);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const next: Record<string, string> = {};
      for (const t of templates) {
        if (cancelled) return;
        try {
          const design = withImages(t.design, current);
          next[t.id] = renderOffscreen({ design, payload, assets: debouncedAssets }, 132).toDataURL('image/png');
        } catch {
          /* content too long — skip thumbnail */
        }
      }
      if (!cancelled) setThumbs(next);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
    // `current` only matters for its images, which `debouncedAssets` already tracks.
  }, [key, debouncedAssets]);

  return thumbs;
}

export function TemplatesPanel({ builtIn, saved, payload, assets, onApply, onSave, onRename, onDelete }: TemplatesPanelProps) {
  const { design } = useDesign();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const thumbs = useThumbnails([...builtIn, ...saved], payload, assets, design);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  };

  const tile = (t: DesignTemplate) => (
    <button
      key={t.id}
      type="button"
      onClick={() => onApply(t)}
      className="group flex w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-line bg-raised p-2 text-center transition-colors hover:border-accent"
      title={`Apply ${t.name}`}
    >
      <span className="checker grid h-[76px] w-[76px] place-items-center overflow-hidden rounded-lg">
        {thumbs[t.id] ? <img src={thumbs[t.id]} alt="" className="max-h-full max-w-full" /> : null}
      </span>
      <span className="w-full truncate text-xs font-medium text-ink-2 group-hover:text-ink">{t.name}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-2">Starting points</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{builtIn.map(tile)}</div>
        <p className="mt-1.5 text-xs text-ink-3">Styles keep your uploaded image and logo.</p>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-2">Your templates</p>
        {saved.length ? (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
            {saved.map((t) => (
              <li key={t.id} className="flex items-center gap-3 bg-raised px-3 py-2">
                <span className="checker grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md">
                  {thumbs[t.id] ? <img src={thumbs[t.id]} alt="" className="max-h-full max-w-full" /> : null}
                </span>
                {editing?.id === t.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editing.name.trim()) onRename(t.id, editing.name.trim());
                      setEditing(null);
                    }}
                  >
                    <input
                      autoFocus
                      aria-label="Template name"
                      className={cx(controlClass, 'h-8')}
                      value={editing.name}
                      onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                    />
                    <Button size="sm" variant="ghost" type="submit" aria-label="Save name" icon={<Check size={15} />} />
                    <Button size="sm" variant="ghost" aria-label="Cancel" onClick={() => setEditing(null)} icon={<X size={15} />} />
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{t.name}</span>
                    <Button size="sm" variant="secondary" onClick={() => onApply(t)}>
                      Apply
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Rename ${t.name}`} onClick={() => setEditing({ id: t.id, name: t.name })} icon={<Pencil size={14} />} />
                    <Button size="sm" variant="danger" aria-label={`Delete ${t.name}`} onClick={() => onDelete(t.id)} icon={<Trash2 size={14} />} />
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-ink-3">Save the current style to reuse it later.</p>
        )}
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input aria-label="New template name" placeholder="Template name" className={cx(controlClass, 'h-10')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!name.trim()} icon={<Plus size={16} />}>
            Save template
          </Button>
        </form>
      </div>
    </div>
  );
}
