import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const VELOCITY_WINDOW_DAYS = 30;
const DEAD_STOCK_THRESHOLD_DAYS = 30;

interface StockForecastItem {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  avgDailyVelocity: number;
  daysRemaining: number | null; // null = sin ventas recientes, no se puede estimar
  riskLevel: 'critical' | 'warning' | 'ok' | 'unknown';
}

interface DeadStockItem {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  daysSinceLastSale: number | null; // null = nunca se ha vendido
  suggestedDiscountPct: number;
}

/**
 * Módulo de analítica basado en REGLAS DETERMINÍSTICAS sobre los datos de
 * ventas e inventario (velocidad de venta, antigüedad de movimiento, etc.).
 * No invoca un modelo de lenguaje: "IA" aquí se refiere al tipo de insight
 * (predictivo/sugerido), no a una llamada externa a un LLM. El resumen
 * ejecutivo se arma con una plantilla de texto a partir de los mismos
 * números. Si más adelante quieres redactarlo con un LLM real (p. ej. la
 * API de Claude), este service ya deja los datos agregados listos para
 * pasárselos como contexto a ese prompt.
 */
export const aiAnalyticsService = {
  async stockForecast(): Promise<StockForecastItem[]> {
    const since = new Date();
    since.setDate(since.getDate() - VELOCITY_WINDOW_DAYS);

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { inventory: true },
    });

    // Cantidad vendida por producto en la ventana de análisis (solo ventas no canceladas)
    const soldGroups = await prisma.salesDetail.groupBy({
      by: ['productId'],
      where: { sale: { cancelled: false, createdAt: { gte: since } } },
      _sum: { quantity: true },
    });
    const soldMap = new Map(soldGroups.map((g) => [g.productId, g._sum.quantity ?? 0]));

    return products.map((product) => {
      const currentStock = product.inventory?.quantity ?? 0;
      const soldLastWindow = soldMap.get(product.id) ?? 0;
      const avgDailyVelocity = soldLastWindow / VELOCITY_WINDOW_DAYS;

      let daysRemaining: number | null = null;
      let riskLevel: StockForecastItem['riskLevel'] = 'unknown';

      if (avgDailyVelocity > 0) {
        daysRemaining = Math.round(currentStock / avgDailyVelocity);
        if (daysRemaining <= 7) riskLevel = 'critical';
        else if (daysRemaining <= 14) riskLevel = 'warning';
        else riskLevel = 'ok';
      }

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        currentStock,
        avgDailyVelocity: Number(avgDailyVelocity.toFixed(2)),
        daysRemaining,
        riskLevel,
      };
    });
  },

  async deadStock(): Promise<DeadStockItem[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - DEAD_STOCK_THRESHOLD_DAYS);

    const products = await prisma.product.findMany({
      where: { isActive: true, inventory: { quantity: { gt: 0 } } },
      include: {
        inventory: true,
        saleDetails: {
          include: { sale: true },
          orderBy: { id: 'desc' },
        },
      },
    });

    const result: DeadStockItem[] = [];

    for (const product of products) {
      const lastSaleDetail = product.saleDetails.find((d) => !d.sale.cancelled);
      const lastSaleDate = lastSaleDetail?.sale.createdAt ?? null;
      const daysSinceLastSale = lastSaleDate
        ? Math.floor((Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const isDead = daysSinceLastSale === null || daysSinceLastSale > DEAD_STOCK_THRESHOLD_DAYS;
      if (!isDead) continue;

      result.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        currentStock: product.inventory?.quantity ?? 0,
        daysSinceLastSale,
        suggestedDiscountPct: suggestDiscount(daysSinceLastSale),
      });
    }

    // Prioriza primero los que nunca se han vendido, luego los más antiguos
    return result.sort((a, b) => (b.daysSinceLastSale ?? Infinity) - (a.daysSinceLastSale ?? Infinity));
  },

  /**
   * Resumen ejecutivo de una línea/párrafo corto, redactado con una plantilla
   * a partir de los mismos indicadores (no es texto generado por un LLM).
   */
  async executiveSummary() {
    const [forecast, dead, revenueLast30] = await Promise.all([
      this.stockForecast(),
      this.deadStock(),
      revenueForLastNDays(30),
    ]);

    const critical = forecast.filter((f) => f.riskLevel === 'critical');
    const warning = forecast.filter((f) => f.riskLevel === 'warning');

    const parts: string[] = [];
    parts.push(
      `En los últimos 30 días la tienda vendió ${formatMXN(revenueLast30)} en total.`,
    );

    if (critical.length > 0) {
      parts.push(
        `${critical.length} producto(s) tienen menos de 7 días de stock estimado: ${critical
          .slice(0, 3)
          .map((p) => p.name)
          .join(', ')}${critical.length > 3 ? ', entre otros' : ''}. Conviene reabastecerlos pronto.`,
      );
    } else if (warning.length > 0) {
      parts.push(
        `${warning.length} producto(s) tienen entre 7 y 14 días de stock restante; vale la pena programar su reabasto.`,
      );
    } else {
      parts.push('No hay productos en riesgo inminente de agotarse.');
    }

    if (dead.length > 0) {
      parts.push(
        `Hay ${dead.length} producto(s) sin movimiento en más de 30 días acumulando stock; considera aplicarles un descuento para liberar capital de trabajo.`,
      );
    } else {
      parts.push('No se detectó inventario estancado ("hueso") en este momento.');
    }

    return parts.join(' ');
  },
};

function suggestDiscount(daysSinceLastSale: number | null): number {
  if (daysSinceLastSale === null) return 30; // nunca se ha vendido: descuento agresivo
  if (daysSinceLastSale > 90) return 30;
  if (daysSinceLastSale > 60) return 20;
  return 15; // 30-60 días sin venderse
}

async function revenueForLastNDays(days: number): Promise<Prisma.Decimal> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sales = await prisma.sale.findMany({
    where: { cancelled: false, createdAt: { gte: since } },
    select: { total: true },
  });
  return sales.reduce((sum, s) => sum.add(s.total), new Prisma.Decimal(0));
}

function formatMXN(value: Prisma.Decimal): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    value.toNumber(),
  );
}
