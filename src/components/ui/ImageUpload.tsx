import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { cx } from './cx';

interface ImageUploadProps {
  label: string;
  hint: string;
  value: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  busy?: boolean;
  checker?: boolean;
}

/** Drop zone / picker. Files never leave the browser. */
export function ImageUpload({ label, hint, value, onFile, onRemove, busy, checker }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cx(
        'flex items-center gap-3 rounded-xl border border-dashed p-3 transition-colors',
        over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-raised',
      )}
    >
      <div className={cx('grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-line', checker ? 'checker' : 'bg-sunken')}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={22} className="text-ink-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-3">{busy ? 'Processing…' : hint}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent-hover"
          >
            {value ? 'Replace' : 'Upload'}
          </button>
          {value ? (
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-bad hover:bg-bad-soft">
              <Trash2 size={13} /> Remove
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
