import { useState } from 'react';
import {
  Cloud,
  HardDrive,
  Link2,
  Unlink,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cloudBackupApi } from '../../api/cloudBackup';
import { getErrorMessage } from '../../api/client';
import type { CloudProvider, StoreSettings, SyncFrequency } from '../../types';

interface CloudBackupSectionProps {
  settings: StoreSettings;
  // Provider/autosync/frecuencia viven en el form del padre y se guardan
  // junto con el resto de la configuración al pulsar "Guardar cambios".
  provider: CloudProvider;
  autoSyncEnabled: boolean;
  syncFrequency: SyncFrequency;
  onChangeProvider: (provider: CloudProvider) => void;
  onChangeAutoSync: (enabled: boolean) => void;
  onChangeFrequency: (frequency: SyncFrequency) => void;
  // Tras vincular/desvincular/sincronizar, refresca `settings` en el contexto
  onSettingsRefreshed: () => Promise<void>;
}

const PROVIDERS: { value: CloudProvider; label: string; icon: typeof Cloud }[] = [
  { value: 'LOCAL', label: 'Local', icon: HardDrive },
  { value: 'GOOGLE_DRIVE', label: 'Google Drive', icon: Cloud },
  { value: 'DROPBOX', label: 'Dropbox', icon: Cloud },
];

const FREQUENCIES: { value: SyncFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Diaria' },
  { value: 'WEEKLY', label: 'Semanal' },
];

export function CloudBackupSection({
  settings,
  provider,
  autoSyncEnabled,
  syncFrequency,
  onChangeProvider,
  onChangeAutoSync,
  onChangeFrequency,
  onSettingsRefreshed,
}: CloudBackupSectionProps) {
  const [accessToken, setAccessToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const requiresToken = provider === 'GOOGLE_DRIVE' || provider === 'DROPBOX';
  const isConnected = settings.cloudConnected && settings.cloudProvider === provider;

  async function handleTestConnection() {
    if (provider === 'LOCAL' || !accessToken.trim()) return;
    setError(null);
    setIsTesting(true);
    try {
      await cloudBackupApi.testConnection(provider, accessToken.trim());
      setAccessToken('');
      await onSettingsRefreshed();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo validar la conexión'));
    } finally {
      setIsTesting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setIsDisconnecting(true);
    try {
      await cloudBackupApi.disconnect();
      await onSettingsRefreshed();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo desvincular la cuenta'));
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handleSyncNow() {
    setError(null);
    setSyncNotice(null);
    setIsSyncing(true);
    try {
      const { result } = await cloudBackupApi.syncNow();
      setSyncNotice(`Respaldo enviado correctamente a ${providerLabel(result.provider)}.`);
      await onSettingsRefreshed();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo sincronizar el respaldo'));
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
        <Cloud className="h-4 w-4 text-ink/40" />
        Nube / Copias de seguridad
      </h2>
      <p className="mt-1 text-xs text-ink/45">
        Además de la descarga manual de arriba, puedes vincular una cuenta para respaldar
        automáticamente.
      </p>

      {/* Selector de proveedor */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {PROVIDERS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChangeProvider(value)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition ${
              provider === value
                ? 'border-brand bg-brand-soft text-brand-hover'
                : 'border-line text-ink/60 hover:bg-surface'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Estado de conexión */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm">
          {provider === 'LOCAL' ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span className="text-ink/70">Guardando en el servidor local (carpeta `backups/`)</span>
            </>
          ) : isConnected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
              <span className="text-ink/70">
                Conectado a {providerLabel(provider)} como:{' '}
                <span className="font-medium text-ink">{settings.cloudAccountLabel}</span>
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-ink/30" />
              <span className="text-ink/45">Desconectado</span>
            </>
          )}
        </span>

        {provider !== 'LOCAL' && isConnected && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="flex items-center gap-1 text-xs font-medium text-ink/40 hover:text-danger disabled:opacity-50"
          >
            {isDisconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
            Desvincular
          </button>
        )}
      </div>

      {/* Vinculación por token (Google Drive / Dropbox) */}
      {requiresToken && !isConnected && (
        <div className="mt-3 rounded-lg border border-line px-3.5 py-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Token de acceso ({providerLabel(provider)})
            </span>
            <div className="flex gap-2">
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Pega aquí tu access token"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !accessToken.trim()}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Vincular
              </button>
            </div>
          </label>
          <p className="mt-1.5 text-[11px] text-ink/40">
            {provider === 'GOOGLE_DRIVE'
              ? 'Genera un token OAuth2 con el scope "drive.file" (p. ej. desde OAuth Playground) — la vinculación con botón "Conectar con Google" con flujo OAuth completo requiere registrar la app en Google Cloud Console.'
              : 'Genera un access token desde tu App Console de Dropbox (App permissions → Generated access token).'}
          </p>
        </div>
      )}
      {settings.cloudAccessTokenSet && provider !== 'LOCAL' && !isConnected && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber">
          <AlertCircle className="h-3.5 w-3.5" />
          Hay un token guardado para otro proveedor distinto al seleccionado; vincula uno para "
          {providerLabel(provider)}" o cambia de proveedor.
        </p>
      )}

      {/* Sincronización automática */}
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Sincronización automática de respaldos</p>
          <p className="mt-0.5 text-xs text-ink/45">Genera y sube un respaldo (.json) periódicamente.</p>
        </div>
        <input
          type="checkbox"
          checked={autoSyncEnabled}
          onChange={(e) => onChangeAutoSync(e.target.checked)}
          className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:bg-brand checked:before:translate-x-4"
        />
      </label>

      {autoSyncEnabled && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/50">Frecuencia</span>
          <div className="flex gap-1.5">
            {FREQUENCIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChangeFrequency(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  syncFrequency === value
                    ? 'bg-ink text-white'
                    : 'bg-surface text-ink/50 hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sincronizar ahora + último resultado */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-xs text-ink/45">
          {settings.cloudLastSyncAt ? (
            <>
              Último respaldo:{' '}
              <span className="font-medium text-ink/70">
                {new Date(settings.cloudLastSyncAt).toLocaleString('es-MX')}
              </span>{' '}
              —{' '}
              {settings.cloudLastSyncStatus?.startsWith('error') ? (
                <span className="text-danger">falló</span>
              ) : (
                <span className="text-brand-hover">exitoso</span>
              )}
            </>
          ) : (
            'Aún no se ha ejecutado ningún respaldo.'
          )}
        </div>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={isSyncing || (requiresToken && !isConnected)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-xs font-medium text-ink/70 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sincronizar ahora
        </button>
      </div>

      {settings.cloudLastSyncStatus?.startsWith('error') && (
        <p className="mt-1.5 text-[11px] text-danger">{settings.cloudLastSyncStatus}</p>
      )}
      {syncNotice && <p className="mt-2 text-xs font-medium text-brand-hover">{syncNotice}</p>}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

function providerLabel(provider: CloudProvider): string {
  return { LOCAL: 'Local', GOOGLE_DRIVE: 'Google Drive', DROPBOX: 'Dropbox' }[provider];
}
