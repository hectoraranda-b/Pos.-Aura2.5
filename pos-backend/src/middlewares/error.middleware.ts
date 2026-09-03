import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

// Middleware para rutas no encontradas (404)
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Middleware global de errores. Debe registrarse al FINAL, después de las rutas.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) {
  // Errores de negocio controlados
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // Errores conocidos de Prisma (violación de unique, FK, registro no encontrado, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const statusMap: Record<string, number> = {
      P2002: 409, // unique constraint
      P2003: 409, // foreign key constraint
      P2025: 404, // registro no encontrado
    };
    const status = statusMap[err.code] ?? 400;
    return res.status(status).json({
      success: false,
      message: mapPrismaError(err),
      code: err.code,
    });
  }

  // Error no controlado
  console.error('[ERROR NO CONTROLADO]', err);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    stack: env.isProd ? undefined : (err as Error)?.stack,
  });
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): string {
  switch (err.code) {
    case 'P2002':
      return `Ya existe un registro con ese valor único (${(err.meta?.target as string[])?.join(', ')})`;
    case 'P2003':
      return 'Violación de llave foránea: el recurso relacionado no existe';
    case 'P2025':
      return 'Registro no encontrado';
    default:
      return 'Error de base de datos';
  }
}
