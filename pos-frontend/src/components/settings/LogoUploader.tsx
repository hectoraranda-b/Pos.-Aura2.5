import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

interface LogoUploaderProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB, suficiente para un logo de ticket

export function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      alert('El logo debe pesar menos de 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface">
        {value ? (
          <img src={value} alt="Logo de la tienda" className="h-full w-full object-contain" />
        ) : (
          <ImagePlus className="h-6 w-6 text-ink/25" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:bg-surface"
        >
          {value ? 'Cambiar logo' : 'Subir logo'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-xs font-medium text-ink/40 hover:text-danger"
          >
            <Trash2 className="h-3 w-3" />
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}
