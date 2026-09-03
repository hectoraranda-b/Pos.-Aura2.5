import { settingsService } from '../services/settings.service';
import { cloudBackupService } from '../services/cloudBackup.service';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // revisa cada hora si ya toca sincronizar
const FREQUENCY_MS: Record<'DAILY' | 'WEEKLY', number> = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Scheduler simple dentro del propio proceso del backend: mientras el
 * servidor esté corriendo, revisa cada hora si ya se cumplió la frecuencia
 * configurada (Diaria/Semanal) desde el último respaldo exitoso y, de ser
 * así, dispara una sincronización.
 *
 * Limitación a tener presente: esto NO es un cron real. Si el proceso se
 * reinicia justo antes de que tocara sincronizar, ese ciclo se pierde (se
 * retoma en el siguiente chequeo). Para garantías más fuertes en producción
 * (múltiples instancias, backend serverless, etc.) esto debería moverse a un
 * cron del sistema operativo o a una cola con persistencia (BullMQ, Agenda)
 * que llame a `POST /api/v1/backup/cloud/sync`.
 */
export function startCloudBackupScheduler() {
  setInterval(async () => {
    try {
      const settings = await settingsService.get();
      if (!settings.cloudAutoSyncEnabled) return;
      if (settings.cloudProvider !== 'LOCAL' && !settings.cloudConnected) return;

      const lastSync = settings.cloudLastSyncAt ? new Date(settings.cloudLastSyncAt).getTime() : 0;
      const dueInMs = FREQUENCY_MS[settings.cloudSyncFrequency];
      if (Date.now() - lastSync < dueInMs) return;

      console.log(`[cloud-backup] Ejecutando sincronización automática (${settings.cloudProvider})…`);
      await cloudBackupService.syncNow();
      console.log('[cloud-backup] Sincronización automática completada.');
    } catch (err) {
      console.error('[cloud-backup] Error en sincronización automática:', err);
    }
  }, CHECK_INTERVAL_MS);
}
