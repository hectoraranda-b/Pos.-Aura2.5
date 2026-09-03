import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, ShoppingBag } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ProductSearch } from '../components/pos/ProductSearch';
import { CartTable } from '../components/pos/CartTable';
import { SaleSummary } from '../components/pos/SaleSummary';
import { PaymentPanel } from '../components/pos/PaymentPanel';
import { SaleSuccessModal } from '../components/pos/SaleSuccessModal';
import { CardPaymentModal } from '../components/pos/CardPaymentModal';
import { SaleModeToggle, type SaleMode } from '../components/pos/SaleModeToggle';
import { useSettings } from '../context/SettingsContext';
import { salesApi } from '../api/sales';
import { getErrorMessage } from '../api/client';
import { toNumber } from '../lib/format';
import type { CardPaymentType, CartLine, PaymentMethod, Product, Sale } from '../types';

// Tasa de impuesto aplicada a la venta. En un proyecto real esto podría venir
// de la configuración del negocio; aquí se deja como constante ajustable.
const TAX_RATE = 0.16;

export default function POSPage() {
  const { settings } = useSettings();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [saleMode, setSaleMode] = useState<SaleMode>('PUBLIC');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [isCharging, setIsCharging] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // La configuración llega de forma asíncrona (viene del backend); en cuanto
  // está disponible, se aplica la preferencia de desglose de IVA por defecto.
  useEffect(() => {
    if (settings) setSaleMode(settings.defaultBreakdownTax ? 'INVOICE' : 'PUBLIC');
  }, [settings]);

  // Los precios de los productos ya incluyen IVA (precio neto al público).
  // El total que paga el cliente SIEMPRE es la suma directa de los productos,
  // sin importar el modo: el switch solo cambia cómo se desglosa en pantalla
  // y en el comprobante, nunca el monto a cobrar.
  const grossTotal = useMemo(
    () => lines.reduce((sum, l) => sum + toNumber(l.product.price) * l.quantity, 0),
    [lines],
  );

  const { subtotal, tax, total } = useMemo(() => {
    if (saleMode === 'PUBLIC') {
      // Venta pública / neto: no se desglosa el IVA, el total es la suma directa.
      return { subtotal: grossTotal, tax: 0, total: grossTotal };
    }
    // Facturado: se desglosa el IVA a partir del total (Total / 1.16), pero el
    // total a cobrar se mantiene idéntico al de venta pública.
    const invoiceSubtotal = grossTotal / (1 + TAX_RATE);
    return { subtotal: invoiceSubtotal, tax: grossTotal - invoiceSubtotal, total: grossTotal };
  }, [grossTotal, saleMode]);

  const received = parseFloat(cashReceived || '0');
  const canCharge =
    lines.length > 0 && !isCharging && (paymentMethod !== 'CASH' || received >= total);

  function addProduct(product: Product) {
    setError(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const stock = product.inventory?.quantity ?? Infinity;

      if (existing) {
        if (existing.quantity >= stock) return prev; // no exceder stock disponible
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: number, quantity: number) {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  function removeLine(productId: number) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function resetSale() {
    setLines([]);
    setCashReceived('');
    setPaymentMethod('CASH');
    setError(null);
  }

  async function handleCharge(cardReference?: string, cardPaymentType?: CardPaymentType) {
    setError(null);
    setIsCharging(true);
    try {
      // El backend calcula subtotal/IVA/total a partir de taxRate sobre el precio
      // de cada producto. Como aquí el precio ya incluye el IVA (Neto) y el monto
      // a cobrar debe ser siempre la suma directa de los productos —sin importar
      // el modo de desglose elegido en pantalla—, se envía taxRate: 0 para que el
      // total registrado en el backend coincida exactamente con lo cobrado.
      const sale = await salesApi.create({
        paymentMethod,
        taxRate: 0,
        cardReference: cardReference || undefined,
        cardPaymentType,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      setShowCardModal(false);
      setCompletedSale(sale);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar la venta'));
    } finally {
      setIsCharging(false);
    }
  }

  // Efectivo: cobra directo. Tarjeta: primero pasa por el flujo de la terminal
  // (integrada = simulación automática, manual = captura de referencia).
  function handleChargeClick() {
    if (paymentMethod === 'CARD') {
      setError(null);
      setShowCardModal(true);
      return;
    }
    handleCharge();
  }

  return (
    <AppShell>
      <div className="flex h-full gap-5 overflow-hidden p-5">
        {/* Columna principal: búsqueda + carrito */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <ProductSearch onAddProduct={addProduct} />
          <CartTable lines={lines} onChangeQuantity={changeQuantity} onRemove={removeLine} />
        </div>

        {/* Columna lateral: resumen, pago y cobro */}
        <div className="flex w-[380px] shrink-0 flex-col gap-4">
          <SaleModeToggle mode={saleMode} onChange={setSaleMode} />

          <SaleSummary
            mode={saleMode}
            subtotal={subtotal}
            tax={tax}
            total={total}
            taxRatePct={TAX_RATE * 100}
          />

          <div className="flex-1 overflow-auto rounded-xl border border-line bg-panel p-5">
            <PaymentPanel
              method={paymentMethod}
              onChangeMethod={setPaymentMethod}
              cashReceived={cashReceived}
              onChangeCashReceived={setCashReceived}
              total={total}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleChargeClick}
            disabled={!canCharge}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-semibold text-white shadow-panel transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/40 disabled:shadow-none"
          >
            {isCharging ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShoppingBag className="h-5 w-5" />
            )}
            {isCharging ? 'Procesando…' : 'Cobrar'}
          </button>
        </div>
      </div>

      {showCardModal && (
        <CardPaymentModal
          total={total}
          integratedTerminalEnabled={settings?.integratedTerminalEnabled ?? false}
          isSubmitting={isCharging}
          onConfirm={(reference, cardPaymentType) => handleCharge(reference, cardPaymentType)}
          onCancel={() => setShowCardModal(false)}
        />
      )}

      {completedSale && (
        <SaleSuccessModal
          sale={completedSale}
          onClose={() => {
            setCompletedSale(null);
            resetSale();
          }}
        />
      )}
    </AppShell>
  );
}
