/**
 * Périodes de suivi : semaine (lundi -> dimanche), mois, trimestre civil.
 */
export type Period = 'week' | 'month' | 'quarter';

export type DateRange = { start: Date; end: Date };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Période en cours contenant `now` ; `end` est exclusif. */
export function periodRange(period: Period, now = new Date()): DateRange {
  if (period === 'week') {
    const day = (now.getDay() + 6) % 7; // lundi = 0
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - day));
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
  }
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }
  const q = Math.floor(now.getMonth() / 3) * 3;
  return { start: new Date(now.getFullYear(), q, 1), end: new Date(now.getFullYear(), q + 3, 1) };
}

/** Période précédente (pour comparer « ce mois vs le mois dernier »). */
export function previousRange(period: Period, now = new Date()): DateRange {
  const current = periodRange(period, now);
  return periodRange(period, new Date(current.start.getTime() - 1));
}

const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

/** Date locale au format YYYY-MM-DD (clé de période en base). */
export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type Bucket = { start: Date; end: Date };

/**
 * Découpage pour les graphiques :
 *   semaine -> 7 jours ; mois -> jours du mois ; trimestre -> semaines.
 */
export function buckets(period: Period, range: DateRange): Bucket[] {
  const out: Bucket[] = [];
  const stepDays = period === 'quarter' ? 7 : 1;
  let cursor = new Date(range.start);
  while (cursor < range.end) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + stepDays);
    out.push({ start: cursor, end: next < range.end ? next : range.end });
    cursor = next;
  }
  return out;
}
