import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

const SALT_ROUNDS = 10;

export const userService = {
  async findAll() {
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) throw ApiError.notFound('Usuario no encontrado');
    return user;
  },

  async create(data: { name: string; email: string; password: string; role?: 'ADMIN' | 'MANAGER' | 'CASHIER' }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw ApiError.conflict('Ya existe un usuario con ese correo');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: data.role ?? 'CASHIER' },
    });

    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  },

  async update(id: number, data: Partial<{ name: string; email: string; role: 'ADMIN' | 'MANAGER' | 'CASHIER'; isActive: boolean }>) {
    await this.findById(id);
    const user = await prisma.user.update({ where: { id }, data });
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  },

  async remove(id: number) {
    await this.findById(id);
    // Baja lógica: preserva integridad referencial con ventas ya registradas
    const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw ApiError.unauthorized('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Credenciales inválidas');

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
    );

    const { passwordHash: _omit, ...safeUser } = user;
    return { token, user: safeUser };
  },
};
