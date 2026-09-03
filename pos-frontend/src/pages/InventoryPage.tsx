import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, PackageSearch, Loader2, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ProductFormModal, type ProductFormValues } from '../components/inventory/ProductFormModal';
import { StockAdjustModal } from '../components/inventory/StockAdjustModal';
import { ExportButtons } from '../components/shared/ExportButtons';
import { productsApi } from '../api/products';
import { categoriesApi } from '../api/categories';
import { inventoryApi } from '../api/inventory';
import { getErrorMessage } from '../api/client';
import { formatCurrency } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import type { Category, Product } from '../types';

export default function InventoryPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canDeactivate = user?.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [productList, categoryList] = await Promise.all([productsApi.list(), categoriesApi.list()]);
      setProducts(productList);
      setCategories(categoryList);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el inventario'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const isLow = (p.inventory?.quantity ?? 0) <= (p.inventory?.minStock ?? 0);
      return matchesSearch && (!lowStockOnly || isLow);
    });
  }, [products, search, lowStockOnly]);

  const lowStockCount = useMemo(
    () => products.filter((p) => (p.inventory?.quantity ?? 0) <= (p.inventory?.minStock ?? 0)).length,
    [products],
  );

  const exportRows = useMemo(
    () =>
      filtered.map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category?.name ?? '—',
        cost: formatCurrency(p.cost),
        price: formatCurrency(p.price),
        stock: p.inventory?.quantity ?? 0,
        minStock: p.inventory?.minStock ?? 0,
      })),
    [filtered],
  );

  async function handleSubmitProduct(values: ProductFormValues) {
    const payload = {
      sku: values.sku,
      name: values.name,
      description: values.description || undefined,
      price: Number(values.price),
      cost: Number(values.cost),
      categoryId: Number(values.categoryId),
      minStock: Number(values.minStock),
    };

    if (editingProduct) {
      const updated = await productsApi.update(editingProduct.id, payload);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await productsApi.create({
        ...payload,
        initialStock: Number(values.initialStock),
      });
      setProducts((prev) => [...prev, created]);
    }
    setEditingProduct(undefined);
  }

  async function handleAdjustStock(delta: number) {
    if (!adjustingProduct) return;
    await inventoryApi.adjust(adjustingProduct.id, delta);
    await loadAll();
    setAdjustingProduct(null);
  }

  async function handleDeactivate(product: Product) {
    if (!confirm(`¿Desactivar "${product.name}"? Ya no aparecerá disponible en el POS.`)) return;
    await productsApi.remove(product.id);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: false } : p)));
  }

  return (
    <AppShell>
      <div className="h-full overflow-auto p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">Inventario</h1>
              <p className="mt-1 text-sm text-ink/50">Productos, precios, costos y niveles de stock.</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                <Plus className="h-4 w-4" />
                Nuevo producto
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2.5">
              <PackageSearch className="h-4 w-4 text-ink/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
              />
            </div>

            <button
              type="button"
              onClick={() => setLowStockOnly((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition ${
                lowStockOnly
                  ? 'border-amber bg-amber-soft text-ink/80'
                  : 'border-line text-ink/60 hover:bg-surface'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Stock bajo {lowStockCount > 0 && `(${lowStockCount})`}
            </button>

            <div className="ml-auto">
              <ExportButtons
                title="Inventario"
                subtitle={lowStockOnly ? 'Filtro: solo stock bajo' : undefined}
                filename="inventario-pos-aura"
                columns={[
                  { header: 'SKU', key: 'sku' },
                  { header: 'Nombre', key: 'name' },
                  { header: 'Categoría', key: 'category' },
                  { header: 'Costo', key: 'cost' },
                  { header: 'Precio', key: 'price' },
                  { header: 'Stock', key: 'stock' },
                  { header: 'Stock mínimo', key: 'minStock' },
                ]}
                rows={exportRows}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>
          )}

          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-panel">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink/40">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando inventario…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-ink/40">Sin productos que coincidan.</div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 text-right font-medium">Costo</th>
                    <th className="px-4 py-3 text-right font-medium">Precio</th>
                    <th className="px-4 py-3 text-right font-medium">Stock</th>
                    {canManage && <th className="w-28 px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const stock = product.inventory?.quantity ?? 0;
                    const minStock = product.inventory?.minStock ?? 0;
                    const isLow = stock <= minStock;
                    return (
                      <tr key={product.id} className="border-t border-line/70">
                        <td className="px-4 py-3">
                          <p className={`font-medium ${product.isActive ? 'text-ink' : 'text-ink/35 line-through'}`}>
                            {product.name}
                          </p>
                          <p className="text-xs text-ink/40">SKU {product.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-ink/60">{product.category?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink/60">
                          {formatCurrency(product.cost)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-display font-semibold tabular-nums ${
                              isLow ? 'text-danger' : 'text-ink'
                            }`}
                          >
                            {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                            {stock}
                          </span>
                          <span className="ml-1 text-xs text-ink/35">/ mín. {minStock}</span>
                        </td>
                        {canManage && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setAdjustingProduct(product)}
                                className="rounded-lg p-1.5 text-ink/40 transition hover:bg-surface hover:text-ink"
                                aria-label={`Ajustar stock de ${product.name}`}
                                title="Ajustar stock"
                              >
                                <SlidersHorizontal className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProduct(product)}
                                className="rounded-lg p-1.5 text-ink/40 transition hover:bg-surface hover:text-ink"
                                aria-label={`Editar ${product.name}`}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {canDeactivate && product.isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(product)}
                                  className="rounded-lg px-2 py-1 text-xs font-medium text-ink/40 transition hover:bg-danger-soft hover:text-danger"
                                  title="Desactivar"
                                >
                                  Desactivar
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editingProduct !== undefined && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onSubmit={handleSubmitProduct}
          onClose={() => setEditingProduct(undefined)}
        />
      )}

      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          onSubmit={handleAdjustStock}
          onClose={() => setAdjustingProduct(null)}
        />
      )}
    </AppShell>
  );
}
