import { Banknote, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import type { PaymentMethod } from '../../types';

interface PaymentPanelProps {
  method: PaymentMethod;
  onChangeMethod: (method: PaymentMethod) => void;
  cashReceived: string;
  onChangeCashReceived: (value: string) => void;
  total: number;
}

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'CASH', label: 'Efectivo', icon: Banknote },
  { value: 'CARD', label: 'Tarjeta', icon: CreditCard },
];

export function PaymentPanel({
  method,
  onChangeMethod,
  cashReceived,
  onChangeCashReceived,
  total,
}: PaymentPanelProps) {
  const received = parseFloat(cashReceived || '0');
  const change = received - total;
  const isCash = method === 'CASH';

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">
          Método de pago
        </p>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map(({ value, label, icon: Icon }) => {
            const active = method === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChangeMethod(value)}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition ${
                  active
                    ? 'border-brand bg-brand-soft text-brand-hover'
                    : 'border-line text-ink/60 hover:bg-surface'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isCash && (
        <div className="rounded-lg border border-line bg-surface/60 p-3.5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/45">
              Efectivo recibido
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={cashReceived}
              onChange={(e) => onChangeCashReceived(e.target.value)}
              placeholder="0.00"
              className="no-spinner w-full rounded-lg border border-line bg-white px-3.5 py-2.5 font-display text-lg font-semibold tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink/50">Cambio</span>
            <span
              className={`font-display text-lg font-semibold tabular-nums ${
                change < 0 ? 'text-danger' : 'text-brand-hover'
              }`}
            >
              {formatCurrency(Math.max(change, change < 0 ? change : 0))}
            </span>
          </div>
          {received > 0 && change < 0 && (
            <p className="mt-1 text-xs font-medium text-danger">
              Faltan {formatCurrency(Math.abs(change))} para cubrir el total
            </p>
          )}
        </div>
      )}
    </div>
  );
}
