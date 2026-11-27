import { describe, expect, it } from '@jest/globals';

import type { AccountWithBalance, Category, Transaction } from '@/data/types';

import { alertsToRaise, challengeProgress, type Challenge } from '../challenges';
import type { Rates } from '../currency';
import { buckets, periodRange, previousRange, toDateKey } from '../periods';
import { buildStats } from '../stats';

const rates: Rates = { USD: 1, XOF: 600, GHS: 12, EUR: 0.9147 };
const accounts: AccountWithBalance[] = [
  { id: 'cash', name: 'Cash', currency: 'XOF', initial_balance: 0, color: '#000', include_in_balance: true, balance: 0, provider: 'cash' },
  { id: 'usd', name: 'USD', currency: 'USD', initial_balance: 0, color: '#000', include_in_balance: true, balance: 0, provider: 'visa' },
];
const categories: Category[] = [
  { id: 'food', name: 'Alimentation', color: '#D9822B', key: 'food', is_religious: false },
  { id: 'transport', name: 'Transport', color: '#3B7DD8', key: 'transport', is_religious: false },
];
let seq = 0;
const t = (type: Transaction['type'], amount: number, date: Date, category_id: string | null = null, account_id = 'cash'): Transaction => ({
  id: `t${++seq}`, type, account_id, amount, to_account_id: null, to_amount: null, category_id, title: null, note: null,
  occurred_at: date.toISOString(),
});

describe('périodes', () => {
  const now = new Date(2026, 10, 26, 15); // jeudi 26 novembre 2026
  it('semaine du lundi au dimanche', () => {
    const r = periodRange('week', now);
    expect(toDateKey(r.start)).toBe('2026-11-23');
    expect(toDateKey(r.end)).toBe('2026-11-30');
  });
  it('mois et trimestre civils', () => {
    expect(toDateKey(periodRange('month', now).start)).toBe('2026-11-01');
    expect(toDateKey(periodRange('quarter', now).start)).toBe('2026-10-01');
    expect(toDateKey(periodRange('quarter', now).end)).toBe('2027-01-01');
    expect(toDateKey(previousRange('month', now).start)).toBe('2026-10-01');
  });
  it('découpe en jours (semaine, mois) et en semaines (trimestre)', () => {
    expect(buckets('week', periodRange('week', now))).toHaveLength(7);
    expect(buckets('month', periodRange('month', now))).toHaveLength(30);
    expect(buckets('quarter', periodRange('quarter', now))).toHaveLength(14);
  });
});

describe('buildStats', () => {
  it('calcule totaux, séries, cumul et répartition par catégorie', () => {
    const now = new Date(2026, 10, 26);
    const txs = [
      t('income', 300000, new Date(2026, 10, 2)),
      t('expense', 60000, new Date(2026, 10, 3), 'food'),
      t('expense', 30000, new Date(2026, 10, 3), 'transport'),
      t('expense', 50, new Date(2026, 10, 10), 'food', 'usd'), // 50 $ = 30 000 FCFA
      t('expense', 100000, new Date(2026, 9, 15), 'food'), // octobre (période précédente)
    ];
    const s = buildStats(txs, categories, 'month', periodRange('month', now), previousRange('month', now),
      { accounts, base: 'XOF', rates }, { name: 'Autres', color: '#999' });
    expect(s.income).toBe(300000);
    expect(s.expense).toBe(120000);
    expect(s.net).toBe(180000);
    expect(s.expenseChange).toBeCloseTo(0.2);
    expect(s.series[2]).toMatchObject({ expense: 90000, cumulative: 210000 });
    expect(s.series.at(-1)?.cumulative).toBe(180000);
    expect(s.categories.map((c) => [c.name, c.amount])).toEqual([['Alimentation', 90000], ['Transport', 30000]]);
    expect(s.categories[0].share).toBeCloseTo(0.75);
  });
});

describe('challenges', () => {
  const challenge: Challenge = { id: 'c1', name: 'Mois serré', period: 'month', amount: 100000, category_id: null, active: true };

  it('suit le budget restant, le budget journalier et la projection', () => {
    const now = new Date(2026, 10, 10, 12); // 10e jour sur 30
    const p = challengeProgress(challenge, [
      t('expense', 50000, new Date(2026, 10, 5)),
      t('income', 999999, new Date(2026, 10, 6)), // les revenus ne comptent pas
      t('expense', 7777, new Date(2026, 9, 30)), // hors période
    ], accounts, 'XOF', rates, now);
    expect(p).toMatchObject({ spent: 50000, remaining: 50000, status: 'ok', daysLeft: 21 });
    expect(p.dailyAllowance).toBe(2381);
    expect(p.projected).toBe(150000);
    expect(p.onTrackToExceed).toBe(true);
  });

  it('passe en alerte à 80 % puis en dépassement, filtré par catégorie', () => {
    const now = new Date(2026, 10, 20);
    const food: Challenge = { ...challenge, id: 'c2', amount: 50000, category_id: 'food' };
    const txs = [t('expense', 42000, new Date(2026, 10, 18), 'food'), t('expense', 90000, new Date(2026, 10, 18), 'transport')];
    const p = challengeProgress(food, txs, accounts, 'XOF', rates, now);
    expect(p.status).toBe('warning');
    expect(alertsToRaise([p]).map((a) => a.level)).toEqual(['warning']);

    const over = challengeProgress(food, [...txs, t('expense', 9000, new Date(2026, 10, 19), 'food')], accounts, 'XOF', rates, now);
    expect(over.status).toBe('exceeded');
    expect(over.remaining).toBe(0);
    expect(alertsToRaise([over]).map((a) => a.level)).toEqual(['warning', 'exceeded']);
  });
});
