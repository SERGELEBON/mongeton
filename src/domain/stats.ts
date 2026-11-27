/**
 * Statistiques (logique pure) : séries revenus / dépenses, solde cumulé,
 * répartition des dépenses par catégorie. Tout est converti dans la devise principale.
 */
import type { AccountWithBalance, Category, Transaction } from '@/data/types';

import { convert, type CurrencyCode, type Rates } from './currency';
import { buckets, type DateRange, type Period } from './periods';

export type SeriesPoint = { start: Date; income: number; expense: number; net: number; cumulative: number };

export type CategorySlice = { categoryId: string | null; name: string; color: string; amount: number; share: number };

export type StatsSummary = {
  income: number;
  expense: number;
  net: number;
  /** Variation des dépenses vs période précédente (0.12 = +12 %), null si pas de base. */
  expenseChange: number | null;
  series: SeriesPoint[];
  categories: CategorySlice[];
};

type Ctx = { accounts: AccountWithBalance[]; base: CurrencyCode; rates: Rates };

function valueIn(t: Transaction, ctx: Ctx, currencyOf: Map<string, CurrencyCode>) {
  return convert(t.amount, currencyOf.get(t.account_id) ?? ctx.base, ctx.base, ctx.rates);
}

function within(t: Transaction, range: DateRange) {
  const time = new Date(t.occurred_at).getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}

export function totalsIn(transactions: Transaction[], range: DateRange, ctx: Ctx) {
  const currencyOf = new Map(ctx.accounts.map((a) => [a.id, a.currency]));
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'transfer' || !within(t, range)) continue;
    const v = valueIn(t, ctx, currencyOf);
    if (t.type === 'income') income += v;
    else expense += v;
  }
  return { income, expense };
}

export function buildStats(
  transactions: Transaction[],
  categories: Category[],
  period: Period,
  range: DateRange,
  previous: DateRange,
  ctx: Ctx,
  uncategorized: { name: string; color: string }
): StatsSummary {
  const currencyOf = new Map(ctx.accounts.map((a) => [a.id, a.currency]));
  const inRange = transactions.filter((t) => t.type !== 'transfer' && within(t, range));

  // Séries par tranche + solde cumulé.
  let cumulative = 0;
  const series: SeriesPoint[] = buckets(period, range).map((b) => {
    let income = 0;
    let expense = 0;
    for (const t of inRange) {
      if (!within(t, b)) continue;
      const v = valueIn(t, ctx, currencyOf);
      if (t.type === 'income') income += v;
      else expense += v;
    }
    cumulative += income - expense;
    return { start: b.start, income, expense, net: income - expense, cumulative };
  });

  // Répartition des dépenses par catégorie (triée, part en %).
  const byCategory = new Map<string | null, number>();
  for (const t of inRange) {
    if (t.type !== 'expense') continue;
    byCategory.set(t.category_id, (byCategory.get(t.category_id) ?? 0) + valueIn(t, ctx, currencyOf));
  }
  const totals = totalsIn(transactions, range, ctx);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const slices: CategorySlice[] = [...byCategory.entries()]
    .map(([id, amount]) => {
      const c = id ? catById.get(id) : undefined;
      return {
        categoryId: id,
        name: c?.name ?? uncategorized.name,
        color: c?.color ?? uncategorized.color,
        amount,
        share: totals.expense > 0 ? amount / totals.expense : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const prev = totalsIn(transactions, previous, ctx);
  return {
    income: totals.income,
    expense: totals.expense,
    net: totals.income - totals.expense,
    expenseChange: prev.expense > 0 ? (totals.expense - prev.expense) / prev.expense : null,
    series,
    categories: slices,
  };
}
