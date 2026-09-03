import { useState, type FormEvent } from 'react';
import { X, PackagePlus, PackageMinus, Loader2, AlertCircle } from 'lucide-react';
import type { Product } from '../../types';
import { getErrorMessage } from '../../api/client';

type Direction = 'IN' | 'OUT';

interface StockAdjustModalProps {
  product: Product;
  onSubmit: (delta: number) => Promise<void>;
  onClose: () => void;
}

export function StockAdjustModal({ product, onSubmit, onClose }: StockAdjustModalProps) {
  const [direction, setDirection] = useState<Direction>('IN');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStock = product.inventory?.quantity ?? 0;
  const parsedAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const resultingStock = direction === 'IN' ? currentStock + parsedAmount : currentStock - parsedAmount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (parsedAmount <= 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(direction === 'IN' ? parsedAmount : -parsedAmount);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo ajustar el stock'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-panel p-6 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">Ajustar stock</h3>
            <p className="mt-0.5 text-sm text-ink/50">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/40 hover:bg-surface"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection('IN')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition ${
              direction === 'IN'
                ? 'border-brand bg-brand-soft text-brand-hover'
                : 'border-line text-ink/60 hover:bg-surface'
            }`}
          >
            <PackagePlus className="h-4 w-4" />
            Entrada
          </button>
          <button
            type="button"
            onClick={() => setDirection('OUT')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition ${
              direction === 'OUT'
                ? 'border-danger bg-danger-soft text-danger'
                : 'border-line text-ink/60 hover:bg-surface'
            }`}
          >
            <PackageMinus className="h-4 w-4" />
            Salida / merma
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Cantidad
          </span>
          <input
            type="number"
            autoFocus
            required
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface px-3.5 py-2.5 text-sm">
          <span className="text-ink/50">Stock resultante</span>
          <span
            className={`font-display font-semibold tabular-nums ${
              resultingStock < 0 ? 'text-danger' : 'text-ink'
            }`}
          >
            {currentStock} → {resultingStock}
          </span>
        </div>
        {resultingStock < 0 && (
          <p className="mt-1.5 text-xs font-medium text-danger">El stock no puede quedar en negativo.</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line py-2.5 text-sm font-medium text-ink/60 transition hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || parsedAmount <= 0 || resultingStock < 0}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </form>
    </div>
  );
}
