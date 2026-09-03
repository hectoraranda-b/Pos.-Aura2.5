import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { backupService } from '../services/backup.service';

export const backupController = {
  // Descarga directa del respaldo completo en formato .json.
  // El mismo payload puede reutilizarse para sincronizar con almacenamiento
  // en la nube (Google Drive, S3, etc.) agregando ahí la subida correspondiente.
  export: asyncHandler(async (req: Request, res: Response) => {
    const backup = await backupService.exportAll();
    const filename = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  }),
};
