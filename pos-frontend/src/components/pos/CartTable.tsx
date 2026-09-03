import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { formatCurrency, toNumber } from '../../lib/format';
import type { CartLine } from '../../types';

interface CartTableProps {
  lines: CartLine[];
  onChangeQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

export function CartTable({ lines, onChangeQuantity, onRemove }: CartTableProps) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-white/60 py-20 text-center">
        <ShoppingCart className="h-8 w-8 text-ink/25" />
        <div>
          <p className="text-sm font-medium text-ink/60">La venta actual está vacía</p>
          <p className="text-xs text-ink/40">Escanea o busca un producto para agregarlo aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-line bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-ink/45">
          <tr>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium">Cantidad</th>
            <th className="px-4 py-3 text-right font-medium">Precio</th>
            <th className="px-4 py-3 text-right font-medium">Subtotal</th>
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {lines.map(({ product, quantity }) => {
            const stock = product.inventory?.quantity ?? Infinity;
            const lineSubtotal = toNumber(product.price) * quantity;
            return (
              <tr key={product.id} className="border-t border-line/70">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{product.name}</p>
                  <p className="text-xs text-ink/40">SKU {product.sku}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(product.id, Math.max(1, quantity - 1))}
                      className="flex h-8 w-8 items-center justify-center text-ink/60 hover:bg-surface"
                      aria-label={`Disminuir cantidad de ${product.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center font-display text-sm font-semibold tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(product.id, Math.min(stock, quantity + 1))}
                      disabled={quantity >= stock}
                      className="flex h-8 w-8 items-center justify-center text-ink/60 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Aumentar cantidad de ${product.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {quantity >= stock && (
                    <p className="mt-1 text-[11px] font-medium text-amber">Stock máximo alcanzado</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink/70">
                  {formatCurrency(product.price)}
                </td>
                <td className="px-4 py-3 text-right font-display font-semibold tabular-nums text-ink">
                  {formatCurrency(lineSubtotal)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(product.id)}
                    className="rounded-lg p-1.5 text-ink/35 transition hover:bg-danger-soft hover:text-danger"
                    aria-label={`Quitar ${product.name} de la venta`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
