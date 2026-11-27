/**
 * Challenges : plafond de dépenses par période, avec suivi « intelligent »
 * (budget journalier restant, projection de fin de période, alerte à 80 %).
 */
import type { AccountWithBalance, Transaction } from '@/data/types';

import { convert, roundFor, type CurrencyCode, type Rates } from './currency';
import { daysBetween, periodRange, toDateKey, type Period } from './periods';

/** Alerte quand il ne reste que 20 % du budget. */
export const WARNING_THRESHOLD = 0.8;

export type Challenge = {
  id: string;
  name: string;
  period: Period;
  amount: number;
  category_id: string | null;
  active: boolean;
};

export type ChallengeStatus = 'ok' | 'warning' | 'exceeded';

export type ChallengeProgress = {
  challenge: Challenge;
  periodStart: string;
  spent: number;
  remaining: number;
  /** Part consommée (0..n, 1 = 100 %). */
  ratio: number;
  status: ChallengeStatus;
  daysLeft: number;
  /** Budget par jour pour finir la période sans dépasser. */
  dailyAllowance: number;
  /** Dépense estimée en fin de période au rythme actuel. */
  projected: number;
  /** Au rythme actuel, le plafond sera-t-il dépassé ? */
  onTrackToExceed: boolean;
};

export function challengeProgress(
  challenge: Challenge,
  transactions: Transaction[],
  accounts: AccountWithBalance[],
  base: CurrencyCode,
  rates: Rates,
  now = new Date()
): ChallengeProgress {
  const range = periodRange(challenge.period, now);
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  let spent = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (challenge.category_id && t.category_id !== challenge.category_id) continue;
    const time = new Date(t.occurred_at).getTime();
    if (time < range.start.getTime() || time >= range.end.getTime()) continue;
    spent += convert(t.amount, currencyOf.get(t.account_id) ?? base, base, rates);
  }
  spent = roundFor(spent, base);

  const totalDays = Math.max(1, daysBetween(range.start, range.end));
  const elapsedDays = Math.min(totalDays, Math.max(1, daysBetween(range.start, now) + 1));
  const daysLeft = Math.max(1, totalDays - elapsedDays + 1);
  const remaining = Math.max(0, challenge.amount - spent);
  const ratio = spent / challenge.amount;
  const projected = roundFor((spent / elapsedDays) * totalDays, base);

  return {
    challenge,
    periodStart: toDateKey(range.start),
    spent,
    remaining: roundFor(remaining, base),
    ratio,
    status: ratio >= 1 ? 'exceeded' : ratio >= WARNING_THRESHOLD ? 'warning' : 'ok',
    daysLeft,
    dailyAllowance: roundFor(remaining / daysLeft, base),
    projected,
    onTrackToExceed: projected > challenge.amount,
  };
}

/** Alertes à émettre (une par niveau franchi) — l'unicité en base évite les doublons. */
export function alertsToRaise(progress: ChallengeProgress[]): { progress: ChallengeProgress; level: 'warning' | 'exceeded' }[] {
  const out: { progress: ChallengeProgress; level: 'warning' | 'exceeded' }[] = [];
  for (const p of progress) {
    if (!p.challenge.active) continue;
    if (p.ratio >= WARNING_THRESHOLD) out.push({ progress: p, level: 'warning' });
    if (p.ratio >= 1) out.push({ progress: p, level: 'exceeded' });
  }
  return out;
}
