import { useEffect, useState } from 'react';
import { CreditCard, Loader2, CheckCircle2, XCircle, Nfc, KeyRound } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import type { CardPaymentType } from '../../types';

type Stage = 'connecting' | 'approved' | 'manual-reference';

interface CardPaymentModalProps {
  total: number;
  integratedTerminalEnabled: boolean;
  onConfirm: (reference: string, cardPaymentType: CardPaymentType) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const CONNECT_SIMULATION_MS = 1800;
const APPROVED_PAUSE_MS = 700;

function generateSimulatedAuth(): string {
  return `SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function CardPaymentModal({
  total,
  integratedTerminalEnabled,
  onConfirm,
  onCancel,
  isSubmitting,
}: CardPaymentModalProps) {
  // Terminal integrada: simula la conexión y aprueba sola.
  // Terminal manual: no hay nada que "esperar" del sistema, se captura
  // directo el número de voucher que ya imprimió la terminal física.
  const [stage, setStage] = useState<Stage>(integratedTerminalEnabled ? 'connecting' : 'manual-reference');
  const [reference, setReference] = useState('');
  const [simulatedAuth, setSimulatedAuth] = useState('');

  useEffect(() => {
    if (stage !== 'connecting') return;
    const timeout = setTimeout(() => {
      setSimulatedAuth(generateSimulatedAuth());
      setStage('approved');
    }, CONNECT_SIMULATION_MS);
    return () => clearTimeout(timeout);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'approved') return;
    const timeout = setTimeout(() => {
      onConfirm(simulatedAuth, 'INTEGRATED');
    }, APPROVED_PAUSE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, simulatedAuth]);

  function handleManualConfirm() {
    onConfirm(reference.trim(), 'MANUAL');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-panel p-6 shadow-panel">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand-hover">
            <CreditCard className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-ink">Pago con tarjeta</p>
            <p className="text-xs text-ink/40">Total a cobrar: {formatCurrency(total)}</p>
          </div>
        </div>

        {stage === 'connecting' && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute h-16 w-16 animate-ping rounded-full bg-brand/20" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-hover">
                <Nfc className="h-5 w-5" />
              </span>
            </div>
            <p className="text-sm font-medium text-ink">Esperando respuesta de la terminal…</p>
            <p className="text-xs text-ink/40">Inserta, desliza o acerca la tarjeta al pinpad.</p>
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 text-xs font-medium text-ink/40 underline-offset-2 hover:text-danger hover:underline"
            >
              Cancelar cobro
            </button>
          </div>
        )}

        {stage === 'approved' && (
          <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-hover">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-ink">Pago aprobado</p>
            <p className="text-xs text-ink/40">Autorización {simulatedAuth}</p>
          </div>
        )}

        {stage === 'manual-reference' && (
          <div className="mt-5">
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-soft px-3 py-2.5 text-sm text-ink/70">
              <KeyRound className="h-4 w-4 shrink-0 text-amber" />
              Terminal manual: captura el folio o número de autorización impreso en el voucher.
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Número de autorización / referencia
              </span>
              <input
                autoFocus
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. 004521"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <span className="mt-1.5 block text-[11px] text-ink/40">
                Terminal física independiente no conectada al sistema (Clip, Mercado Pago
                Smart, etc.). Actívala como "integrada" en Configuración si en cambio quieres que
                el sistema simule el cobro automáticamente.
              </span>
            </label>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-sm font-medium text-ink/60 transition hover:bg-surface disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleManualConfirm}
                disabled={isSubmitting || reference.trim().length === 0}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isSubmitting ? 'Procesando…' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
