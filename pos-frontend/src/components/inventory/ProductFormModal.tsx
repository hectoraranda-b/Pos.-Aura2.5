import { useEffect, useState, type FormEvent } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import type { Category, Product } from '../../types';
import { getErrorMessage } from '../../api/client';

export interface ProductFormValues {
  sku: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  categoryId: string;
  minStock: string;
  initialStock: string;
}

interface ProductFormModalProps {
  product: Product | null; // null = creación
  categories: Category[];
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onClose: () => void;
}

function emptyValues(): ProductFormValues {
  return {
    sku: '',
    name: '',
    description: '',
    price: '',
    cost: '',
    categoryId: '',
    minStock: '5',
    initialStock: '0',
  };
}

function valuesFromProduct(product: Product): ProductFormValues {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    price: product.price,
    cost: product.cost,
    categoryId: String(product.categoryId),
    minStock: String(product.inventory?.minStock ?? 0),
    initialStock: String(product.inventory?.quantity ?? 0),
  };
}

export function ProductFormModal({ product, categories, onSubmit, onClose }: ProductFormModalProps) {
  const isEditing = Boolean(product);
  const [values, setValues] = useState<ProductFormValues>(
    product ? valuesFromProduct(product) : emptyValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(product ? valuesFromProduct(product) : emptyValues());
  }, [product]);

  function handleChange<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el producto'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const margin =
    values.price && values.cost && Number(values.price) > 0
      ? (((Number(values.price) - Number(values.cost)) / Number(values.price)) * 100).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-panel p-6 shadow-panel"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h3>
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

        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="col-span-2 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Nombre
            </span>
            <input
              required
              autoFocus
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              SKU / código de barras
            </span>
            <input
              required
              value={values.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Categoría
            </span>
            <select
              required
              value={values.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Descripción (opcional)
            </span>
            <input
              value={values.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Costo (compra)
            </span>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={values.cost}
              onChange={(e) => handleChange('cost', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Precio (venta)
            </span>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={values.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {margin && (
            <p className="col-span-2 -mt-2 text-xs text-ink/40">
              Margen estimado: <span className="font-medium text-ink/60">{margin}%</span>
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Stock mínimo
            </span>
            <input
              type="number"
              required
              min={0}
              value={values.minStock}
              onChange={(e) => handleChange('minStock', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {!isEditing && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Stock inicial
              </span>
              <input
                type="number"
                required
                min={0}
                value={values.initialStock}
                onChange={(e) => handleChange('initialStock', e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          )}
        </div>

        {isEditing && (
          <p className="mt-3 text-xs text-ink/40">
            Para ajustar el stock actual usa el botón "Ajustar stock" en la tabla, no este formulario.
          </p>
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
            disabled={isSubmitting}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
