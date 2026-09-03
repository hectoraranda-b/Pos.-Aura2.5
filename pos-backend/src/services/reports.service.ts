import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { settingsService } from './settings.service';
import { getPeriodRange, type PeriodKey } from '../utils/period';

export const reportsService = {
  /**
   * Resumen financiero de un periodo: ventas totales, costo total (a partir del
   * costo unitario registrado en cada producto), ganancia neta, IVA cobrado y
   * el avance respecto a la meta de ventas configurada en StoreSettings.
   */
  async summary(period: PeriodKey, customFrom?: Date, customTo?: Date) {
    const { from, to } = customFrom || customTo
      ? { from: customFrom ?? new Date(0), to: customTo ?? new Date() }
      : getPeriodRange(period);

    // Solo ventas completadas (no canceladas) cuentan para el reporte financiero
    const sales = await prisma.sale.findMany({
      where: { cancelled: false, createdAt: { gte: from, lte: to } },
      include: { details: { include: { product: true } } },
    });

    let totalRevenue = new Prisma.Decimal(0); // total cobrado (incluye IVA)
    let totalTax = new Prisma.Decimal(0);
    let totalSubtotal = new Prisma.Decimal(0); // ingreso sin IVA
    let totalCost = new Prisma.Decimal(0); // costo de los productos vendidos

    const byPaymentMethod: Record<string, number> = {};

    for (const sale of sales) {
      totalRevenue = totalRevenue.add(sale.total);
      totalTax = totalTax.add(sale.tax);
      totalSubtotal = totalSubtotal.add(sale.subtotal);
      byPaymentMethod[sale.paymentMethod] = (byPaymentMethod[sale.paymentMethod] ?? 0) + 1;

      for (const detail of sale.details) {
        const lineCost = detail.product.cost.mul(detail.quantity);
        totalCost = totalCost.add(lineCost);
      }
    }

    const netProfit = totalSubtotal.sub(totalCost);
    const settings = await settingsService.get();
    const salesGoal = settings.salesGoal;
    const goalProgressPct = salesGoal.gt(0)
      ? totalRevenue.div(salesGoal).mul(100).toNumber()
      : null;

    return {
      period,
      from,
      to,
      salesCount: sales.length,
      totalRevenue,
      totalSubtotal,
      totalTax,
      totalCost,
      netProfit,
      averageTicket: sales.length > 0 ? totalRevenue.div(sales.length) : new Prisma.Decimal(0),
      salesGoal,
      goalProgressPct,
      byPaymentMethod,
    };
  },
};
