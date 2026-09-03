import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export const categoryService = {
  async findAll() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },

  async findById(id: number) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw ApiError.notFound('Categoría no encontrada');
    return category;
  },

  async create(data: { name: string; description?: string }) {
    return prisma.category.create({ data });
  },

  async update(id: number, data: { name?: string; description?: string; isActive?: boolean }) {
    await this.findById(id);
    return prisma.category.update({ where: { id }, data });
  },

  async remove(id: number) {
    await this.findById(id);
    // Baja lógica en lugar de borrado físico para preservar historial de productos
    return prisma.category.update({ where: { id }, data: { isActive: false } });
  },
};
