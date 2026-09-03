import { useEffect, useState } from 'react';
import { Loader2, Sparkles, TrendingDown, PackageX, AlertTriangle, RefreshCw } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { aiAnalyticsApi } from '../api/aiAnalytics';
import { getErrorMessage } from '../api/client';
import type { AiInsights, StockRiskLevel } from '../types';

const RISK_STYLE: Record<StockRiskLevel, string> = {
  critical: 'bg-danger-soft text-danger',
  warning: 'bg-amber-soft text-ink/70',
  ok: 'bg-brand-soft text-brand-hover',
  unknown: 'bg-surface text-ink/40',
};

const RISK_LABEL: Record<StockRiskLevel, string> = {
  critical: 'Crítico',
  warning: 'Atención',
  ok: 'Saludable',
  unknown: 'Sin datos',
};

export default function AnalyticsPage() {
  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setInsights(await aiAnalyticsApi.getInsights());
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el análisis'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Ordena mostrando primero lo más urgente
  const forecastSorted = insights?.stockForecast
    ? [...insights.stockForecast].sort((a, b) => riskOrder(a.riskLevel) - riskOrder(b.riskLevel))
    : [];

  return (
    <AppShell>
      <div className="h-full overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                <Sparkles className="h-5 w-5 text-brand" />
                Asistente de inventario
              </h1>
              <p className="mt-1 text-sm text-ink/50">
                Análisis basado en reglas sobre tus ventas e inventario reales (velocidad de venta y
                antigüedad de movimiento) — no es texto generado por un modelo externo.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-surface disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>
          )}

          {isLoading || !insights ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando datos…
            </div>
          ) : (
            <>
              {/* Resumen ejecutivo */}
              <div className="mt-5 rounded-xl bg-register-bg p-5 text-white/85">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-register-dim">
                  <Sparkles className="h-3.5 w-3.5" />
                  Resumen ejecutivo
                </div>
                <p className="mt-2 text-sm leading-relaxed">{insights.executiveSummary}</p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Predicción de stock */}
                <section className="rounded-xl border border-line bg-panel p-5">
                  <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                    <TrendingDown className="h-4 w-4 text-ink/40" />
                    Días de stock restante
                  </h2>
                  <p className="mt-1 text-xs text-ink/45">
                    Estimado con la velocidad de venta de los últimos 30 días.
                  </p>

                  <div className="mt-3 max-h-96 space-y-2 overflow-auto">
                    {forecastSorted.length === 0 ? (
                      <p className="py-6 text-center text-sm text-ink/35">Sin productos activos.</p>
                    ) : (
                      forecastSorted.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-line/70 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                            <p className="text-xs text-ink/40">
                              Stock: {item.currentStock} · Venta: {item.avgDailyVelocity}/día
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${RISK_STYLE[item.riskLevel]}`}
                            >
                              {RISK_LABEL[item.riskLevel]}
                            </span>
                            <p className="mt-1 text-xs text-ink/40">
                              {item.daysRemaining !== null ? `${item.daysRemaining} días` : 'Sin ventas'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Productos hueso */}
                <section className="rounded-xl border border-line bg-panel p-5">
                  <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                    <PackageX className="h-4 w-4 text-ink/40" />
                    Productos "hueso" (sin movimiento)
                  </h2>
                  <p className="mt-1 text-xs text-ink/45">
                    Más de 30 días sin venderse, con sugerencia de descuento para liberar capital.
                  </p>

                  <div className="mt-3 max-h-96 space-y-2 overflow-auto">
                    {insights.deadStock.length === 0 ? (
                      <p className="py-6 text-center text-sm text-ink/35">
                        No se detectó inventario estancado. 🎉
                      </p>
                    ) : (
                      insights.deadStock.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-line/70 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                            <p className="flex items-center gap-1 text-xs text-ink/40">
                              <AlertTriangle className="h-3 w-3" />
                              {item.daysSinceLastSale !== null
                                ? `${item.daysSinceLastSale} días sin venderse`
                                : 'Nunca se ha vendido'}
                              {' · '}
                              {item.currentStock} en stock
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-ink/70">
                            -{item.suggestedDiscountPct}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function riskOrder(risk: StockRiskLevel): number {
  return { critical: 0, warning: 1, unknown: 2, ok: 3 }[risk];
}
