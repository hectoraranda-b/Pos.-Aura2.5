import { formatCurrency } from '../../lib/format';
import type { SaleMode } from './SaleModeToggle';

interface SaleSummaryProps {
  mode: SaleMode;
  subtotal: number;
  tax: number;
  total: number;
  taxRatePct: number;
}

export function SaleSummary({ mode, subtotal, tax, total, taxRatePct }: SaleSummaryProps) {
  const isPublic = mode === 'PUBLIC';

  return (
    <div className="rounded-xl bg-register-bg p-5">
      <div className="space-y-1.5 text-sm text-white/50">
        {isPublic ? (
          <div className="flex items-center justify-between">
            <span>IVA</span>
            <span className="tabular-nums text-white/40">Incluido en el precio</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums text-white/80">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>IVA ({taxRatePct}%)</span>
              <span className="tabular-nums text-white/80">{formatCurrency(tax)}</span>
            </div>
          </>
        )}
      </div>

      <div className="my-4 h-px bg-white/10" />

      <div className="flex items-end justify-between">
        <span className="pb-1 text-xs font-medium uppercase tracking-[0.2em] text-register-dim">
          Total a cobrar
        </span>
        <span className="font-display text-4xl font-semibold tabular-nums text-register-glow">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
