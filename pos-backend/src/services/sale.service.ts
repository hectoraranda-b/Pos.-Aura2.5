import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface SaleItemInput {
  productId: number;
  quantity: number;
}

interface CreateSaleInput {
  userId: number;
  customerId?: number;
  paymentMethod: string;
  cardReference?: string;
  cardPaymentType?: 'INTEGRATED' | 'MANUAL';
  taxRate: number;
  items: SaleItemInput[];
}

function generateFolio(): string {
  // Folio legible y único: TICKET-<timestamp>-<random>
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TCK-${ts}-${rand}`;
}

const saleInclude = {
  user: { select: { id: true as const, name: true as const } },
  customer: true,
  details: { include: { product: true } },
};

export const saleService = {
  async findAll(
    filters: {
      userId?: number;
      customerId?: number;
      from?: Date;
      to?: Date;
      cancelled?: boolean;
    } = {},
  ) {
    return prisma.sale.findMany({
      where: {
        userId: filters.userId,
        customerId: filters.customerId,
        cancelled: filters.cancelled,
        createdAt:
          filters.from || filters.to
            ? { gte: filters.from, lte: filters.to }
            : undefined,
      },
      include: saleInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: number) {
    const sale = await prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!sale) throw ApiError.notFound('Venta no encontrada');
    return sale;
  },

  /**
   * Registra una venta completa de forma ATÓMICA:
   * 1. Valida stock disponible de cada producto.
   * 2. Descuenta el stock del inventario (con protección ante condiciones de carrera).
   * 3. Crea la cabecera (Sale) y el detalle (SalesDetail) del ticket.
   *
   * Si CUALQUIER paso falla (ej. stock insuficiente en un producto a mitad
   * del proceso), Prisma revierte TODOS los cambios automáticamente:
   * no se descuenta stock parcialmente ni se genera un ticket incompleto.
   */
  async create(input: CreateSaleInput) {
    if (input.items.length === 0) {
      throw ApiError.badRequest('La venta debe incluir al menos un producto');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Traer productos vigentes involucrados en la venta
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });

      if (products.length !== productIds.length) {
        throw ApiError.badRequest('Uno o más productos no existen o no están activos');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = new Prisma.Decimal(0);
      const detailsData: {
        productId: number;
        quantity: number;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }[] = [];

      // 2. Descontar stock de cada línea de forma atómica y segura ante concurrencia.
      //    updateMany con condición "quantity >= cantidad solicitada" garantiza que,
      //    si dos ventas intentan tomar el último stock al mismo tiempo, solo una
      //    tendrá éxito; la otra hará que la transacción completa se revierta.
      for (const item of input.items) {
        const product = productMap.get(item.productId)!;

        const stockUpdate = await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            quantity: { gte: item.quantity },
          },
          data: {
            quantity: { decrement: item.quantity },
            lastMovementAt: new Date(),
          },
        });

        if (stockUpdate.count === 0) {
          // O no existe inventario para el producto, o no hay stock suficiente
          throw ApiError.badRequest(
            `Stock insuficiente para el producto "${product.name}" (SKU: ${product.sku})`,
          );
        }

        const unitPrice = product.price;
        const lineSubtotal = unitPrice.mul(item.quantity);
        subtotal = subtotal.add(lineSubtotal);

        detailsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        });
      }

      const tax = subtotal.mul(input.taxRate);
      const total = subtotal.add(tax);

      // 3. Crear la cabecera de la venta (ticket)
      const sale = await tx.sale.create({
        data: {
          folio: generateFolio(),
          userId: input.userId,
          customerId: input.customerId,
          subtotal,
          tax,
          total,
          paymentMethod: input.paymentMethod,
          cardReference: input.paymentMethod === 'CARD' ? input.cardReference : undefined,
          cardPaymentType: input.paymentMethod === 'CARD' ? input.cardPaymentType : undefined,
          status: 'COMPLETED',
          cancelled: false,
        },
      });

      // 4. Crear el detalle del ticket, ligado a la venta recién creada
      await tx.salesDetail.createMany({
        data: detailsData.map((d) => ({ ...d, saleId: sale.id })),
      });

      // 5. Devolver el ticket completo con su detalle
      return tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: saleInclude });
    });
  },

  /**
   * Cancela una venta existente y repone el stock, también de forma atómica.
   */
  async cancel(saleId: number) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { details: true },
      });

      if (!sale) throw ApiError.notFound('Venta no encontrada');
      if (sale.status !== 'COMPLETED') {
        throw ApiError.badRequest('Solo se pueden cancelar ventas completadas');
      }

      // Reponer stock de cada producto vendido
      for (const detail of sale.details) {
        await tx.inventory.update({
          where: { productId: detail.productId },
          data: { quantity: { increment: detail.quantity }, lastMovementAt: new Date() },
        });
      }

      return tx.sale.update({
        where: { id: saleId },
        data: { status: 'CANCELLED', cancelled: true },
        include: saleInclude,
      });
    });
  },
};
