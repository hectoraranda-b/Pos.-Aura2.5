import { useEffect, useRef, useState } from 'react';
import { ScanBarcode, PackageX, Loader2 } from 'lucide-react';
import { productsApi } from '../../api/products';
import { formatCurrency } from '../../lib/format';
import type { Product } from '../../types';

interface ProductSearchProps {
  onAddProduct: (product: Product) => void;
}

export function ProductSearch({ onAddProduct }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Búsqueda con debounce mientras el cajero escribe (nombre o SKU parcial)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const products = await productsApi.search(query.trim());
        setResults(products);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function selectProduct(product: Product) {
    onAddProduct(product);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  // Un lector de código de barras "escribe" el código muy rápido y termina con Enter.
  // Si hay una única coincidencia exacta de SKU, la agregamos directo sin esperar al clic.
  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !query.trim()) return;
    e.preventDefault();

    const exact = results.find((p) => p.sku.toLowerCase() === query.trim().toLowerCase());
    if (exact) {
      selectProduct(exact);
      return;
    }

    // Si aún no ha llegado la respuesta del debounce, consulta directo por el código exacto
    const fresh = await productsApi.search(query.trim());
    const freshExact = fresh.find((p) => p.sku.toLowerCase() === query.trim().toLowerCase());
    if (freshExact) {
      selectProduct(freshExact);
    } else if (fresh.length === 1) {
      selectProduct(fresh[0]);
    } else {
      setResults(fresh);
      setIsOpen(true);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <ScanBarcode className="h-5 w-5 shrink-0 text-ink/40" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Escanea un código de barras o busca por nombre / SKU…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
          autoFocus
        />
        {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink/30" />}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1.5 max-h-80 w-full overflow-auto rounded-xl border border-line bg-white shadow-panel">
          {results.length === 0 && !isLoading && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-ink/40">
              <PackageX className="h-4 w-4" />
              Sin resultados para "{query}"
            </div>
          )}
          {results.map((product) => {
            const stock = product.inventory?.quantity ?? 0;
            const outOfStock = stock <= 0;
            return (
              <button
                key={product.id}
                type="button"
                disabled={outOfStock}
                onClick={() => selectProduct(product)}
                className="flex w-full items-center justify-between gap-3 border-b border-line/70 px-4 py-3 text-left last:border-b-0 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                  <p className="text-xs text-ink/40">
                    SKU {product.sku} · {outOfStock ? 'Sin stock' : `${stock} disponibles`}
                  </p>
                </div>
                <span className="shrink-0 font-display text-sm font-semibold text-ink">
                  {formatCurrency(product.price)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
