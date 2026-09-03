import { useEffect, useMemo, useState } from 'react';
import { Loader2, Ban, Receipt } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { SaleDetailModal } from '../components/sales/SaleDetailModal';
import { ExportButtons } from '../components/shared/ExportButtons';
import { salesApi } from '../api/sales';
import { getErrorMessage } from '../api/client';
import { formatCurrency } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import type { Sale } from '../types';

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const canCancel = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showCancelledOnly, setShowCancelledOnly] = useState(false);

  async function loadSales() {
    setIsLoading(true);
    setError(null);
    try {
      setSales(await salesApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el historial de ventas'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  async function handleCancelSale(saleId: number) {
    const updated = await salesApi.cancel(saleId);
    setSales((prev) => prev.map((s) => (s.id === saleId ? updated : s)));
    setSelectedSale(updated);
  }

  const visibleSales = showCancelledOnly ? sales.filter((s) => s.cancelled) : sales;

  const exportRows = useMemo(
    () =>
      visibleSales.map((sale) => ({
        folio: sale.folio,
        date: new Date(sale.createdAt).toLocaleString('es-MX'),
        cashier: sale.user?.name ?? '—',
        payment: PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod,
        total: formatCurrency(sale.total),
        status: sale.cancelled ? 'Cancelada' : 'Completada',
      })),
    [visibleSales],
  );

  return (
    <AppShell>
      <div className="h-full overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">Historial de ventas</h1>
              <p className="mt-1 text-sm text-ink/50">Consulta tickets emitidos y cancela si es necesario.</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                title="Historial de ventas"
                subtitle={showCancelledOnly ? 'Filtro: solo canceladas' : undefined}
                filename="ventas-pos-aura"
                columns={[
                  { header: 'Folio', key: 'folio' },
                  { header: 'Fecha', key: 'date' },
                  { header: 'Cajero', key: 'cashier' },
                  { header: 'Pago', key: 'payment' },
                  { header: 'Total', key: 'total' },
                  { header: 'Estado', key: 'status' },
                ]}
                rows={exportRows}
              />
              <button
                type="button"
                onClick={() => setShowCancelledOnly((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition ${
                  showCancelledOnly
                    ? 'border-danger/30 bg-danger-soft text-danger'
                    : 'border-line text-ink/60 hover:bg-surface'
                }`}
              >
                <Ban className="h-4 w-4" />
                Solo canceladas
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>
          )}

          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-panel">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink/40">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando ventas…
              </div>
            ) : visibleSales.length === 0 ? (
              <div className="py-16 text-center text-sm text-ink/40">No hay ventas que mostrar.</div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Folio</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Cajero</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleSales.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="cursor-pointer border-t border-line/70 hover:bg-surface"
                    >
                      <td className="px-4 py-3 font-medium text-ink">{sale.folio}</td>
                      <td className="px-4 py-3 text-ink/60">
                        {new Date(sale.createdAt).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 text-ink/60">{sale.user?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink/60">
                        {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
                      </td>
                      <td className="px-4 py-3 text-right font-display font-semibold tabular-nums text-ink">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="px-4 py-3">
                        {sale.cancelled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                            Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-hover">
                            Completada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink/30">
                        <Receipt className="h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          canCancel={canCancel}
          onCancel={handleCancelSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </AppShell>
  );
}
