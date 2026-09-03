import { Users, ReceiptText } from 'lucide-react';

export type SaleMode = 'PUBLIC' | 'INVOICE';

interface SaleModeToggleProps {
  mode: SaleMode;
  onChange: (mode: SaleMode) => void;
}

const OPTIONS: { value: SaleMode; label: string; hint: string; icon: typeof Users }[] = [
  { value: 'PUBLIC', label: 'Público general', hint: 'Precio neto, IVA incluido', icon: Users },
  { value: 'INVOICE', label: 'Facturado', hint: 'Desglosa el IVA (16%)', icon: ReceiptText },
];

// Segmented control: el precio final nunca cambia entre modos, solo cómo se
// desglosa en el resumen y en el comprobante impreso.
export function SaleModeToggle({ mode, onChange }: SaleModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
      {OPTIONS.map(({ value, label, hint, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={`flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition ${
              active ? 'bg-panel shadow-sm ring-1 ring-line' : 'hover:bg-panel/60'
            }`}
          >
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                active ? 'text-ink' : 'text-ink/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
            <span className={`text-[11px] ${active ? 'text-ink/50' : 'text-ink/35'}`}>{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
