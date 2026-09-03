import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Info, Loader2, Download, AlertCircle } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { LogoUploader } from '../components/settings/LogoUploader';
import { CloudBackupSection } from '../components/settings/CloudBackupSection';
import { useSettings } from '../context/SettingsContext';
import { backupApi } from '../api/backup';
import { getErrorMessage } from '../api/client';
import type { StoreSettings } from '../types';

type FormState = Omit<StoreSettings, 'id' | 'updatedAt' | 'salesGoal'> & { salesGoal: string };

function toFormState(settings: StoreSettings): FormState {
  return { ...settings, salesGoal: settings.salesGoal };
}

export default function SettingsPage() {
  const { settings, isLoading, updateSettings, refresh } = useSettings();
  const [form, setForm] = useState<FormState | null>(settings ? toFormState(settings) : null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  // Sincroniza el formulario cuando llega la configuración del backend (o cambia externamente)
  useEffect(() => {
    if (settings) setForm(toFormState(settings));
  }, [settings]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setIsSaving(true);
    try {
      // Envío explícito: solo los campos editables del formulario. Los campos
      // de solo-estado (cloudConnected, cloudAccountLabel, cloudLastSyncAt,
      // cloudLastSyncStatus, cloudAccessTokenSet) NO se mandan aquí — esos los
      // actualizan sus propias acciones (vincular/sincronizar/desvincular).
      await updateSettings({
        businessName: form.businessName,
        taxId: form.taxId,
        address: form.address,
        phone: form.phone,
        ticketMessage: form.ticketMessage,
        logoDataUrl: form.logoDataUrl,
        defaultBreakdownTax: form.defaultBreakdownTax,
        integratedTerminalEnabled: form.integratedTerminalEnabled,
        salesGoal: Number(form.salesGoal) || 0,
        cloudProvider: form.cloudProvider,
        cloudAutoSyncEnabled: form.cloudAutoSyncEnabled,
        cloudSyncFrequency: form.cloudSyncFrequency,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la configuración'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBackup() {
    setBackupError(null);
    setIsBackingUp(true);
    try {
      await backupApi.downloadExport();
    } catch (err) {
      setBackupError(getErrorMessage(err, 'No se pudo generar el respaldo'));
    } finally {
      setIsBackingUp(false);
    }
  }

  if (isLoading || !form || !settings) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="h-full overflow-auto p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl pb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">Configuración</h1>
              <p className="mt-1 text-sm text-ink/50">
                Datos de la tienda, ticket, terminal de pago, meta de ventas y respaldos.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </button>
          </div>

          {savedAt && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm text-brand-hover">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Configuración guardada.
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface px-3.5 py-2.5 text-xs text-ink/50">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Esta configuración es compartida por todas las terminales conectadas al mismo backend.
          </div>

          {/* Datos de la tienda */}
          <section className="mt-6 rounded-xl border border-line bg-panel p-5">
            <h2 className="font-display text-sm font-semibold text-ink">Datos de la tienda</h2>

            <div className="mt-4">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Logo
              </span>
              <LogoUploader
                value={form.logoDataUrl}
                onChange={(v) => handleChange('logoDataUrl', v)}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                  Nombre de la tienda
                </span>
                <input
                  required
                  value={form.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                  RFC
                </span>
                <input
                  value={form.taxId}
                  onChange={(e) => handleChange('taxId', e.target.value.toUpperCase())}
                  placeholder="XAXX010101000"
                  className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm uppercase text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Dirección
              </span>
              <input
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Calle, número, colonia, ciudad"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Teléfono
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="55 1234 5678"
                className="w-full max-w-xs rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          </section>

          {/* Ticket */}
          <section className="mt-4 rounded-xl border border-line bg-panel p-5">
            <h2 className="font-display text-sm font-semibold text-ink">Ticket</h2>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Mensaje al pie del ticket
              </span>
              <textarea
                value={form.ticketMessage}
                onChange={(e) => handleChange('ticketMessage', e.target.value)}
                rows={2}
                placeholder="¡Gracias por su compra!"
                className="w-full resize-none rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          </section>

          {/* Preferencias del POS */}
          <section className="mt-4 rounded-xl border border-line bg-panel p-5">
            <h2 className="font-display text-sm font-semibold text-ink">Preferencias del punto de venta</h2>

            <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Desglosar IVA por defecto</p>
                <p className="mt-0.5 text-xs text-ink/45">
                  Abre cada nueva venta en modo "Facturado" en vez de "Público general".
                </p>
              </div>
              <ToggleInput
                checked={form.defaultBreakdownTax}
                onChange={(v) => handleChange('defaultBreakdownTax', v)}
              />
            </label>

            <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Terminal de tarjeta integrada</p>
                <p className="mt-0.5 text-xs text-ink/45">
                  Activada: el pago con tarjeta se simula automáticamente. Desactivada: se pide
                  el número de referencia/voucher de una terminal física independiente (Clip,
                  Mercado Pago Smart, etc.).
                </p>
              </div>
              <ToggleInput
                checked={form.integratedTerminalEnabled}
                onChange={(v) => handleChange('integratedTerminalEnabled', v)}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Meta de ventas (por periodo consultado en Reportes)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.salesGoal}
                onChange={(e) => handleChange('salesGoal', e.target.value)}
                className="w-full max-w-xs rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          </section>

          {/* Backup manual */}
          <section className="mt-4 rounded-xl border border-line bg-panel p-5">
            <h2 className="font-display text-sm font-semibold text-ink">Respaldo de datos</h2>
            <p className="mt-1 text-xs text-ink/45">
              Descarga un archivo <code className="rounded bg-surface px-1 py-0.5">.json</code> con
              todo el estado actual de la base de datos (productos, inventario, ventas, clientes y
              configuración).
            </p>
            {backupError && (
              <p className="mt-2 text-xs font-medium text-danger">{backupError}</p>
            )}
            <button
              type="button"
              onClick={handleBackup}
              disabled={isBackingUp}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBackingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isBackingUp ? 'Generando respaldo…' : 'Descargar respaldo (.json)'}
            </button>
          </section>

          {/* Respaldo en la nube */}
          <CloudBackupSection
            settings={settings}
            provider={form.cloudProvider}
            autoSyncEnabled={form.cloudAutoSyncEnabled}
            syncFrequency={form.cloudSyncFrequency}
            onChangeProvider={(v) => handleChange('cloudProvider', v)}
            onChangeAutoSync={(v) => handleChange('cloudAutoSyncEnabled', v)}
            onChangeFrequency={(v) => handleChange('cloudSyncFrequency', v)}
            onSettingsRefreshed={refresh}
          />
        </form>
      </div>
    </AppShell>
  );
}

function ToggleInput({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:bg-brand checked:before:translate-x-4"
    />
  );
}
