import { useMemo, useState } from 'react';

import type { BarDatum, DonutSlice, LineDatum } from '@/components/charts';
import { useAccounts, useCategories, useProfile, useRates, useTransactionsSince } from '@/data/hooks';
import { DEFAULT_CURRENCY } from '@/domain/currency';
import { periodRange, previousRange, type Period } from '@/domain/periods';
import { buildStats } from '@/domain/stats';
import { useI18n } from '@/i18n';
import { categoryLabel } from '@/i18n/categories';

export type ChartKind = 'bars' | 'line' | 'categories';

const WEEKDAYS = { fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] } as const;

/** Début du trimestre précédent : couvre toutes les périodes affichées et leurs comparaisons. */
export function statsFromIso(now = new Date()): string {
  return previousRange('quarter', now).start.toISOString();
}

export type StatsEvent = { type: 'PeriodChanged'; period: Period } | { type: 'ChartChanged'; chart: ChartKind };

export function useStatsViewModel() {
  const { t, lang, money, fmt } = useI18n();
  const [period, setPeriod] = useState<Period>('month');
  const [chart, setChart] = useState<ChartKind>('bars');

  const fromIso = useMemo(() => statsFromIso(), []);
  const profile = useProfile();
  const accounts = useAccounts();
  const categories = useCategories();
  const rates = useRates();
  const transactions = useTransactionsSince(fromIso);
  const base = profile.data?.base_currency ?? DEFAULT_CURRENCY;

  const stats = useMemo(() => {
    if (!transactions.data || !accounts.data || !categories.data || !rates.data) return null;
    const translated = categories.data.map((c) => ({ ...c, name: categoryLabel(c, t) }));
    return buildStats(
      transactions.data,
      translated,
      period,
      periodRange(period),
      previousRange(period),
      { accounts: accounts.data, base, rates: rates.data },
      { name: t.stats.uncategorized, color: '#9AA39D' }
    );
  }, [transactions.data, accounts.data, categories.data, rates.data, period, base, t]);

  const label = (d: Date, i: number) =>
    period === 'week'
      ? WEEKDAYS[lang][i % 7]
      : period === 'month'
        ? String(d.getDate())
        : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  const bars: BarDatum[] = stats?.series.map((p, i) => ({ label: label(p.start, i), income: p.income, expense: p.expense })) ?? [];
  const line: LineDatum[] = stats?.series.map((p, i) => ({ label: label(p.start, i), value: p.cumulative })) ?? [];
  const slices: DonutSlice[] =
    stats?.categories.map((s) => ({
      label: s.name,
      value: s.amount,
      color: s.color,
      share: s.share,
      amountText: money(s.amount, base),
    })) ?? [];

  const change = stats?.expenseChange;
  const queries = [profile, accounts, categories, rates, transactions];

  return {
    uiState: {
      loading: queries.some((q) => q.isPending),
      error: queries.find((q) => q.error)?.error?.message ?? null,
      period,
      chart,
      incomeText: money(stats?.income ?? 0, base),
      expenseText: money(stats?.expense ?? 0, base),
      netText: money(stats?.net ?? 0, base),
      netNegative: (stats?.net ?? 0) < 0,
      changeText:
        change === null || change === undefined
          ? null
          : fmt(t.stats.vsPrevious, { change: `${change > 0 ? '+' : ''}${Math.round(change * 100)} %` }),
      changeIsBad: (change ?? 0) > 0,
      empty: !stats || (stats.income === 0 && stats.expense === 0),
      bars,
      line,
      slices,
      totalSpentText: money(stats?.expense ?? 0, base),
    },
    onEvent: (e: StatsEvent) => (e.type === 'PeriodChanged' ? setPeriod(e.period) : setChart(e.chart)),
  };
}
