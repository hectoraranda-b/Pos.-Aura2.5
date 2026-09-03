import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  categoryId: number;
  initialStock?: number;
  minStock?: number;
}

export const productService = {
  async findAll(filters: { categoryId?: number; search?: string } = {}) {
    return prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: filters.categoryId,
        name: filters.search ? { contains: filters.search, mode: 'insensitive' } : undefined,
      },
      include: { category: true, inventory: true },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, inventory: true },
    });
    if (!product) throw ApiError.notFound('Producto no encontrado');
    return product;
  },

  // Crear producto + registro de inventario inicial de forma atómica
  async create(data: CreateProductInput) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description,
          price: data.price,
          cost: data.cost ?? 0,
          categoryId: data.categoryId,
        },
      });

      const inventory = await tx.inventory.create({
        data: {
          productId: product.id,
          quantity: data.initialStock ?? 0,
          minStock: data.minStock ?? 0,
        },
      });

      return { ...product, inventory };
    });
  },

  async update(id: number, data: Partial<CreateProductInput>) {
    await this.findById(id);
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description,
          price: data.price,
          cost: data.cost,
          categoryId: data.categoryId,
        },
      });

      if (data.minStock !== undefined) {
        await tx.inventory.update({ where: { productId: id }, data: { minStock: data.minStock } });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { category: true, inventory: true },
      });
    });
  },

  async remove(id: number) {
    await this.findById(id);
    // Baja lógica: conserva historial de ventas asociado al producto
    return prisma.product.update({ where: { id }, data: { isActive: false } });
  },
};
