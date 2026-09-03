import fs from 'fs';
import path from 'path';
import { backupService } from './backup.service';
import { settingsService } from './settings.service';
import { ApiError } from '../utils/ApiError';

type CloudProvider = 'LOCAL' | 'GOOGLE_DRIVE' | 'DROPBOX';

const LOCAL_BACKUP_DIR = path.join(process.cwd(), 'backups');

export const cloudBackupService = {
  /**
   * "Vincula" la cuenta: no es un OAuth2 completo (eso requiere registrar una
   * app en Google Cloud Console / Dropbox App Console con tu propio client_id
   * y una pantalla de consentimiento — ver nota en el README). Aquí se valida
   * un access token generado manualmente, llamando al endpoint "quién soy" de
   * cada proveedor para confirmar que es válido y obtener la cuenta asociada.
   */
  async testConnection(
    provider: Extract<CloudProvider, 'GOOGLE_DRIVE' | 'DROPBOX'>,
    accessToken: string,
  ): Promise<{ accountLabel: string }> {
    if (provider === 'GOOGLE_DRIVE') {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw ApiError.badRequest(
          `Google Drive rechazó el token (HTTP ${res.status}). Verifica que sea válido y tenga el scope "drive.file".`,
        );
      }
      const data = (await res.json()) as { user?: { emailAddress?: string } };
      if (!data.user?.emailAddress) {
        throw ApiError.badRequest('Google Drive no devolvió una cuenta válida para este token.');
      }
      return { accountLabel: data.user.emailAddress };
    }

    // DROPBOX
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw ApiError.badRequest(`Dropbox rechazó el token (HTTP ${res.status}). Verifica que sea válido.`);
    }
    const data = (await res.json()) as { email?: string };
    if (!data.email) {
      throw ApiError.badRequest('Dropbox no devolvió una cuenta válida para este token.');
    }
    return { accountLabel: data.email };
  },

  /** Genera el respaldo actual y lo sube al destino configurado en StoreSettings. */
  async syncNow(): Promise<{ provider: CloudProvider; syncedAt: string }> {
    const settings = await settingsService.getInternal();
    const backup = await backupService.exportAll();
    const filename = `pos-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const content = JSON.stringify(backup, null, 2);

    try {
      if (settings.cloudProvider === 'LOCAL') {
        this.uploadLocal(filename, content);
      } else if (settings.cloudProvider === 'GOOGLE_DRIVE') {
        if (!settings.cloudAccessToken) {
          throw ApiError.badRequest('No hay una cuenta de Google Drive vinculada.');
        }
        await this.uploadToGoogleDrive(settings.cloudAccessToken, filename, content);
      } else {
        if (!settings.cloudAccessToken) {
          throw ApiError.badRequest('No hay una cuenta de Dropbox vinculada.');
        }
        await this.uploadToDropbox(settings.cloudAccessToken, filename, content);
      }

      await settingsService.patchInternal({ cloudLastSyncAt: new Date(), cloudLastSyncStatus: 'success' });
      return { provider: settings.cloudProvider, syncedAt: new Date().toISOString() };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      await settingsService.patchInternal({
        cloudLastSyncAt: new Date(),
        cloudLastSyncStatus: `error: ${message}`,
      });
      throw err;
    }
  },

  uploadLocal(filename: string, content: string) {
    // Único destino que se puede probar sin credenciales externas: escribe el
    // respaldo a disco, en la carpeta `backups/` del propio servidor.
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_BACKUP_DIR, filename), content, 'utf-8');
  },

  async uploadToGoogleDrive(accessToken: string, filename: string, content: string) {
    const boundary = 'pos_aura_backup_boundary';
    const metadata = { name: filename, mimeType: 'application/json' };
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      `${content}\r\n` +
      `--${boundary}--`;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw ApiError.badRequest(`Google Drive rechazó la subida (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
  },

  async uploadToDropbox(accessToken: string, filename: string, content: string) {
    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: `/PosAura/${filename}`,
          mode: 'add',
          autorename: true,
          mute: true,
        }),
      },
      body: content,
    });
    if (!res.ok) {
      const text = await res.text();
      throw ApiError.badRequest(`Dropbox rechazó la subida (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
  },
};
