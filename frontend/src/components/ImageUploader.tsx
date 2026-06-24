import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { resolveImg } from '../utils/format';

interface Props {
  onSelect: (file: File | null) => void;
  initialUrl?: string | null;
  label?: string;
}

// Selector de imagen con previsualización (no sube por sí solo; entrega el File al padre)
export function ImageUploader({ onSelect, initialUrl, label = 'Imagen' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ? resolveImg(initialUrl) : null);

  const handle = (file: File | null) => {
    onSelect(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-ink-50/40 p-4 text-center transition hover:border-gold/50"
      >
        {preview ? (
          <img src={preview} alt="preview" className="h-32 w-full rounded-lg object-cover" />
        ) : (
          <>
            <ImagePlus className="h-7 w-7 text-gray-500" />
            <p className="text-xs text-gray-400">Haz clic para seleccionar una imagen</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0] || null)}
        />
      </div>
      {preview && (
        <button
          type="button"
          onClick={() => { setPreview(null); onSelect(null); if (inputRef.current) inputRef.current.value = ''; }}
          className="mt-2 text-xs text-red-300 hover:underline"
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
}
