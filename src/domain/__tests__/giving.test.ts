import { describe, expect, it } from '@jest/globals';

import type { AccountWithBalance, Category, Transaction } from '@/data/types';

import type { Rates } from '../currency';
import { givingSummary } from '../giving';

const rates: Rates = { USD: 1, XOF: 600, GHS: 12, EUR: 0.9147 };
const now = new Date(2026, 10, 26);

const accounts: AccountWithBalance[] = [
  { id: 'cash', name: 'Cash', currency: 'XOF', initial_balance: 0, color: '#000', include_in_balance: true, balance: 0, provider: 'cash' },
  { id: 'usd', name: 'USD', currency: 'USD', initial_balance: 0, color: '#000', include_in_balance: true, balance: 0, provider: 'cash' },
];
const categories: Category[] = [
  { id: 'c-tithe', name: 'Dîme', color: '#000', key: 'tithe', is_religious: true },
  { id: 'c-offering', name: 'Offrande', color: '#000', key: 'offering', is_religious: true },
  { id: 'c-thanks', name: 'Action de grâce', color: '#000', key: 'thanksgiving', is_religious: true },
  { id: 'c-food', name: 'Alimentation', color: '#000', key: 'food', is_religious: false },
];

let seq = 0;
const trn = (
  type: Transaction['type'],
  amount: number,
  date: Date,
  category_id: string | null = null,
  account_id = 'cash'
): Transaction => ({
  id: `t${++seq}`,
  type,
  account_id,
  amount,
  to_account_id: type === 'transfer' ? 'usd' : null,
  to_amount: null,
  category_id,
  title: null,
  note: null,
  occurred_at: date.toISOString(),
});

describe('givingSummary', () => {
  it('additionne dîme, offrande et action de grâce du mois et calcule la dîme conseillée', () => {
    const s = givingSummary(
      [
        trn('income', 500000, new Date(2026, 10, 1)),
        trn('income', 100, new Date(2026, 10, 3), null, 'usd'), // 100 $ = 60 000 FCFA
        trn('expense', 20000, new Date(2026, 10, 5), 'c-tithe'),
        trn('expense', 5000, new Date(2026, 10, 10), 'c-offering'),
        trn('expense', 2000, new Date(2026, 10, 12), 'c-offering'),
        trn('expense', 10000, new Date(2026, 10, 20), 'c-thanks'),
        trn('expense', 15000, new Date(2026, 10, 21), 'c-food'), // pas un don
        trn('expense', 9999, new Date(2026, 9, 30), 'c-tithe'), // mois précédent
        trn('transfer', 1000, new Date(2026, 10, 22)), // ignoré
      ],
      accounts,
      categories,
      'XOF',
      rates,
      now
    );
    expect(s.totals).toEqual({ tithe: 20000, offering: 7000, thanksgiving: 10000 });
    expect(s.monthIncome).toBe(560000);
    expect(s.titheTarget).toBe(56000);
    expect(s.titheRemaining).toBe(36000);
  });

  it('ne descend jamais sous zéro quand la dîme dépasse la cible', () => {
    const s = givingSummary(
      [trn('income', 100000, new Date(2026, 10, 1)), trn('expense', 15000, new Date(2026, 10, 2), 'c-tithe')],
      accounts,
      categories,
      'XOF',
      rates,
      now
    );
    expect(s.titheTarget).toBe(10000);
    expect(s.titheRemaining).toBe(0);
  });

  it('renvoie des zéros sans revenus ni dons', () => {
    const s = givingSummary([], accounts, categories, 'XOF', rates, now);
    expect(s).toEqual({
      totals: { tithe: 0, offering: 0, thanksgiving: 0 },
      monthIncome: 0,
      titheTarget: 0,
      titheRemaining: 0,
    });
  });
});
