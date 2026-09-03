import { useState } from 'react';
import { X, Ban, Loader2, AlertCircle, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { getErrorMessage } from '../../api/client';
import type { Sale } from '../../types';

interface SaleDetailModalProps {
  sale: Sale;
  canCancel: boolean;
  onCancel: (saleId: number) => Promise<void>;
  onClose: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export function SaleDetailModal({ sale, canCancel, onCancel, onClose }: SaleDetailModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function handleCancel() {
    setError(null);
    setIsCancelling(true);
    try {
      await onCancel(sale.id);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cancelar la venta'));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-panel p-6 shadow-panel">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">Ticket {sale.folio}</h3>
            <p className="mt-0.5 text-xs text-ink/45">
              {new Date(sale.createdAt).toLocaleString('es-MX')} · {sale.user?.name ?? 'Cajero'}
            </p>
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

        <div className="mt-3">
          {sale.cancelled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
              <Ban className="h-3 w-3" />
              Venta cancelada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-hover">
              Completada
            </span>
          )}
        </div>

        <div className="mt-4 divide-y divide-line rounded-lg border border-line">
          {sale.details.map((detail) => (
            <div key={detail.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{detail.product.name}</p>
                <p className="text-xs text-ink/40">
                  {detail.quantity} × {formatCurrency(detail.unitPrice)}
                </p>
              </div>
              <span className="shrink-0 font-display font-semibold tabular-nums text-ink">
                {formatCurrency(detail.subtotal)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 rounded-lg bg-surface px-3.5 py-3 text-sm">
          <div className="flex items-center justify-between text-ink/60">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-ink/60">
            <span>IVA</span>
            <span className="tabular-nums">{formatCurrency(sale.tax)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-1.5 font-display text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(sale.total)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 text-sm">
          <span className="flex items-center gap-1.5 text-ink/60">
            {sale.paymentMethod === 'CARD' ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <Banknote className="h-4 w-4" />
            )}
            {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
          </span>
          {sale.paymentMethod === 'CARD' && (
            <span className="text-xs text-ink/45">
              {sale.cardReference || 'Sin referencia'}
              {sale.cardPaymentType && (
                <> · {sale.cardPaymentType === 'INTEGRATED' ? 'Integrada' : 'Manual'}</>
              )}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {canCancel && !sale.cancelled && (
          <div className="mt-5">
            {!confirmingCancel ? (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-danger/30 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-soft"
              >
                <Ban className="h-4 w-4" />
                Cancelar venta
              </button>
            ) : (
              <div className="rounded-lg border border-danger/30 bg-danger-soft p-3.5">
                <p className="text-sm text-danger">
                  Esto repondrá el stock de los productos vendidos. ¿Confirmas la cancelación?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={isCancelling}
                    className="rounded-lg border border-line bg-white py-2 text-sm font-medium text-ink/60 hover:bg-surface"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-danger py-2 text-sm font-semibold text-white hover:bg-danger-hover disabled:opacity-60"
                  >
                    {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                    Sí, cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
