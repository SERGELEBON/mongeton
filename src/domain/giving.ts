/**
 * Dons religieux : dîme, offrande, action de grâce.
 * Logique pure (testable) : totaux du mois et dîme conseillée (10 % des revenus).
 */
import type { AccountWithBalance, Category, CategoryKey, Transaction } from '@/data/types';

import { convert, roundFor, type CurrencyCode, type Rates } from './currency';

export const GIVING_KEYS = ['tithe', 'offering', 'thanksgiving'] as const satisfies readonly CategoryKey[];
export type GivingKey = (typeof GIVING_KEYS)[number];

export const TITHE_RATE = 0.1;

export type GivingSummary = {
  totals: Record<GivingKey, number>;
  monthIncome: number;
  titheTarget: number;
  titheRemaining: number;
};

const isGivingKey = (key: CategoryKey | null): key is GivingKey =>
  key !== null && (GIVING_KEYS as readonly string[]).includes(key);

export function givingSummary(
  transactions: Transaction[],
  accounts: AccountWithBalance[],
  categories: Category[],
  base: CurrencyCode,
  rates: Rates,
  now = new Date()
): GivingSummary {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  const keyOf = new Map(categories.map((c) => [c.id, c.key]));
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  const totals: Record<GivingKey, number> = { tithe: 0, offering: 0, thanksgiving: 0 };
  let monthIncome = 0;

  for (const t of transactions) {
    const time = new Date(t.occurred_at).getTime();
    if (time < start || time >= end || t.type === 'transfer') continue;
    const value = convert(t.amount, currencyOf.get(t.account_id) ?? base, base, rates);
    if (t.type === 'income') {
      monthIncome += value;
      continue;
    }
    const key = t.category_id ? keyOf.get(t.category_id) ?? null : null;
    if (isGivingKey(key)) totals[key] += value;
  }

  const titheTarget = roundFor(monthIncome * TITHE_RATE, base);
  return {
    totals,
    monthIncome,
    titheTarget,
    titheRemaining: Math.max(0, roundFor(titheTarget - totals.tithe, base)),
  };
}
