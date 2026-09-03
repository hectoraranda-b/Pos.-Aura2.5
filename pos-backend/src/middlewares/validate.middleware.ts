import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

interface ValidationSchemas {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

// Valida req.body / req.params / req.query contra esquemas de Zod.
// Uso: router.post('/', validate({ body: createProductSchema }), controller.create)
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as any;
      if (schemas.query) req.query = schemas.query.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(ApiError.badRequest('Datos de entrada inválidos', error.flatten()));
      }
      next(error);
    }
  };
}
