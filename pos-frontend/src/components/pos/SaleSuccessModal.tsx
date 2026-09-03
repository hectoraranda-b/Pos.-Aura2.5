import { CheckCircle2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import type { Sale } from '../../types';

interface SaleSuccessModalProps {
  sale: Sale;
  onClose: () => void;
}

export function SaleSuccessModal({ sale, onClose }: SaleSuccessModalProps) {
  const { settings } = useSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-panel p-6 shadow-panel">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-hover">
            <CheckCircle2 className="h-5 w-5" />
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

        <h3 className="mt-4 font-display text-lg font-semibold text-ink">Venta cobrada</h3>
        <p className="mt-0.5 text-sm text-ink/50">Ticket {sale.folio}</p>

        <div className="mt-4 rounded-lg bg-surface px-4 py-3">
          <div className="flex items-center justify-between text-sm text-ink/60">
            <span>Total cobrado</span>
            <span className="font-display text-xl font-semibold tabular-nums text-ink">
              {formatCurrency(sale.total)}
            </span>
          </div>
          {sale.paymentMethod === 'CARD' && (
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs text-ink/50">
              <span>Referencia de terminal</span>
              <span className="font-medium text-ink/70">
                {sale.cardReference || 'No proporcionada'}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          Nueva venta
        </button>

        {settings?.ticketMessage && (
          <p className="mt-4 text-center text-xs text-ink/35">{settings.ticketMessage}</p>
        )}
      </div>
    </div>
  );
}
