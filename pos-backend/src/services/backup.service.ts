import { prisma } from '../config/prisma';

/**
 * Exporta el estado completo de la base de datos a un objeto plano,
 * listo para serializarse como JSON (descarga directa o, más adelante,
 * subida a un proveedor de almacenamiento en la nube como Google Drive).
 *
 * Las contraseñas (`passwordHash`) de los usuarios se excluyen a propósito:
 * un backup no debe contener credenciales, aunque estén hasheadas.
 */
export const backupService = {
  async exportAll() {
    const [users, categories, products, inventory, customers, sales, salesDetails, settings] =
      await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.category.findMany(),
        prisma.product.findMany(),
        prisma.inventory.findMany(),
        prisma.customer.findMany(),
        prisma.sale.findMany(),
        prisma.salesDetail.findMany(),
        prisma.storeSettings.findUnique({ where: { id: 1 } }),
      ]);

    return {
      meta: {
        exportedAt: new Date().toISOString(),
        source: 'pos-backend',
        version: 1,
      },
      users,
      categories,
      products,
      inventory,
      customers,
      sales,
      salesDetails,
      settings,
    };
  },
};
