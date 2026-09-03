import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export const inventoryService = {
  async findAll(lowStockOnly = false) {
    const inventory = await prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { productId: 'asc' },
    });

    if (!lowStockOnly) return inventory;
    return inventory.filter((i) => i.quantity <= i.minStock);
  },

  async findByProduct(productId: number) {
    const inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) throw ApiError.notFound('Registro de inventario no encontrado');
    return inventory;
  },

  // Ajuste manual de stock (entrada por compra, merma, conteo físico, etc.)
  // Se usa una transacción con verificación para evitar condiciones de carrera
  // y evitar dejar el stock en negativo.
  async adjustStock(productId: number, delta: number) {
    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { productId } });
      if (!inventory) throw ApiError.notFound('Registro de inventario no encontrado');

      const newQuantity = inventory.quantity + delta;
      if (newQuantity < 0) {
        throw ApiError.badRequest('El ajuste dejaría el stock en negativo');
      }

      return tx.inventory.update({
        where: { productId },
        data: { quantity: newQuantity, lastMovementAt: new Date() },
      });
    });
  },
};
