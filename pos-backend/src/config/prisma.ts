import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Patrón singleton para evitar múltiples instancias del cliente en desarrollo
// (hot-reload de ts-node/nodemon puede crear varias conexiones si no se controla)
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

if (!env.isProd) {
  global.__prisma__ = prisma;
}
