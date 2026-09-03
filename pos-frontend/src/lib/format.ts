const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

// Acepta string (como llegan los Decimal de Prisma) o number
export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return currencyFormatter.format(Number.isFinite(num) ? num : 0);
}

export function toNumber(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}
