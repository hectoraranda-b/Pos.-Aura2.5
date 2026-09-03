import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Wallet, Receipt, Target, PiggyBank } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ExportButtons } from '../components/shared/ExportButtons';
import { reportsApi } from '../api/reports';
import { getErrorMessage } from '../api/client';
import { formatCurrency, toNumber } from '../lib/format';
import type { ReportPeriod, ReportSummary } from '../types';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual', label: 'Anual' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    reportsApi
      .summary(period)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'No se pudo cargar el reporte'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const goalProgress = summary?.goalProgressPct;
  const goalPct = goalProgress !== null && goalProgress !== undefined ? Math.min(goalProgress, 100) : null;

  return (
    <AppShell>
      <div className="h-full overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">Balances y metas</h1>
              <p className="mt-1 text-sm text-ink/50">
                Ventas, costos, ganancia neta e IVA por periodo.
              </p>
            </div>
            {summary && (
              <ExportButtons
                title="Balances y metas"
                subtitle={`Periodo: ${PERIODS.find((p) => p.value === period)?.label}`}
                filename={`reporte-${period}-pos-aura`}
                columns={[
                  { header: 'Métrica', key: 'metric' },
                  { header: 'Valor', key: 'value' },
                ]}
                rows={[
                  { metric: 'Periodo', value: PERIODS.find((p) => p.value === period)?.label ?? period },
                  { metric: 'Tickets', value: summary.salesCount },
                  { metric: 'Ventas totales', value: formatCurrency(summary.totalRevenue) },
                  { metric: 'Subtotal', value: formatCurrency(summary.totalSubtotal) },
                  { metric: 'IVA cobrado', value: formatCurrency(summary.totalTax) },
                  { metric: 'Costo total', value: formatCurrency(summary.totalCost) },
                  { metric: 'Ganancia neta', value: formatCurrency(summary.netProfit) },
                  { metric: 'Ticket promedio', value: formatCurrency(summary.averageTicket) },
                  { metric: 'Meta de ventas', value: formatCurrency(summary.salesGoal) },
                  {
                    metric: 'Avance de meta',
                    value: summary.goalProgressPct !== null ? `${summary.goalProgressPct.toFixed(1)}%` : '—',
                  },
                ]}
              />
            )}
          </div>

          <div className="mt-5 grid grid-cols-5 gap-1 rounded-xl border border-line bg-surface p-1">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  period === value ? 'bg-panel text-ink shadow-sm ring-1 ring-line' : 'text-ink/50 hover:bg-panel/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>
          )}

          {isLoading || !summary ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando reporte…
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryCard
                  icon={TrendingUp}
                  label="Ventas totales"
                  value={formatCurrency(summary.totalRevenue)}
                  hint={`${summary.salesCount} ticket(s)`}
                />
                <SummaryCard
                  icon={Wallet}
                  label="Costo total"
                  value={formatCurrency(summary.totalCost)}
                  hint="Costo de productos vendidos"
                />
                <SummaryCard
                  icon={PiggyBank}
                  label="Ganancia neta"
                  value={formatCurrency(summary.netProfit)}
                  hint="Subtotal − costo"
                  tone={toNumber(summary.netProfit) >= 0 ? 'positive' : 'negative'}
                />
                <SummaryCard
                  icon={Receipt}
                  label="IVA cobrado"
                  value={formatCurrency(summary.totalTax)}
                  hint={`Subtotal: ${formatCurrency(summary.totalSubtotal)}`}
                />
              </div>

              <div className="mt-4 rounded-xl border border-line bg-panel p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-ink/40" />
                    <h2 className="font-display text-sm font-semibold text-ink">Meta de ventas</h2>
                  </div>
                  <span className="text-sm text-ink/50">
                    {formatCurrency(summary.totalRevenue)} de {formatCurrency(summary.salesGoal)}
                  </span>
                </div>

                {toNumber(summary.salesGoal) > 0 ? (
                  <>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (goalPct ?? 0) >= 100 ? 'bg-brand' : 'bg-brand/70'
                        }`}
                        style={{ width: `${goalPct ?? 0}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-ink/45">
                      {(goalProgress ?? 0).toFixed(1)}% de la meta alcanzada
                      {(goalProgress ?? 0) >= 100 && ' — ¡meta cumplida! 🎉'}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-ink/40">
                    No has configurado una meta de ventas todavía. Puedes hacerlo en Configuración.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink/45">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p
        className={`mt-2 font-display text-2xl font-semibold tabular-nums ${
          tone === 'positive' ? 'text-brand-hover' : tone === 'negative' ? 'text-danger' : 'text-ink'
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </div>
  );
}
