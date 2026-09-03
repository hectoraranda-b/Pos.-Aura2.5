import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export const customerService = {
  async findAll(search?: string) {
    return prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: number) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw ApiError.notFound('Cliente no encontrado');
    return customer;
  },

  async create(data: { name: string; email?: string; phone?: string; document?: string }) {
    return prisma.customer.create({ data });
  },

  async update(id: number, data: Partial<{ name: string; email: string; phone: string; document: string }>) {
    await this.findById(id);
    return prisma.customer.update({ where: { id }, data });
  },

  async remove(id: number) {
    await this.findById(id);
    return prisma.customer.delete({ where: { id } });
  },
};
