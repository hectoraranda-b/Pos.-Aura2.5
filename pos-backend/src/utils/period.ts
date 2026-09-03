export type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

const VALID_PERIODS: PeriodKey[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];

export function isValidPeriod(value: string): value is PeriodKey {
  return VALID_PERIODS.includes(value as PeriodKey);
}

/**
 * Calcula el rango [from, to] correspondiente a un periodo relativo a "ahora".
 * - daily: desde las 00:00 de hoy
 * - weekly: últimos 7 días
 * - monthly: desde el día 1 del mes actual
 * - quarterly: últimos 3 meses
 * - annual: desde el 1 de enero del año actual
 */
export function getPeriodRange(period: PeriodKey, now: Date = new Date()): { from: Date; to: Date } {
  const to = now;
  const from = new Date(now);

  switch (period) {
    case 'daily':
      from.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      from.setDate(from.getDate() - 7);
      break;
    case 'monthly':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'quarterly':
      from.setMonth(from.getMonth() - 3);
      break;
    case 'annual':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
  }

  return { from, to };
}
