import { describe, expect, it } from '@jest/globals';

import type { AccountWithBalance, Category, Transaction } from '@/data/types';
import { toAccounts, toTransaction } from '@/data/mappers';
import { en } from '@/i18n/en';
import { fr } from '@/i18n/fr';

import { toTransactionRowViewState } from '../transaction-view-state';

const accounts = new Map<string, AccountWithBalance>([
  ['cash', { id: 'cash', name: 'Espèces', currency: 'XOF', initial_balance: 0, color: '#12B880', include_in_balance: true, balance: 0, provider: 'cash' }],
  ['momo', { id: 'momo', name: 'MoMo', currency: 'GHS', initial_balance: 0, color: '#3193F5', include_in_balance: true, balance: 0, provider: 'cash' }],
]);
const categories = new Map<string, Category>([
  ['food', { id: 'food', name: 'Alimentation', color: '#F57A3D', key: 'food', is_religious: false }],
]);

const base: Transaction = {
  id: 't1',
  type: 'expense',
  account_id: 'cash',
  amount: 2500,
  to_account_id: null,
  to_amount: null,
  category_id: 'food',
  title: null,
  note: null,
  occurred_at: new Date(2026, 10, 26, 12).toISOString(),
};

describe('toTransactionRowViewState', () => {
  it('utilise la catégorie comme titre et formate le montant signé', () => {
    expect(toTransactionRowViewState(base, accounts, categories, fr, 'fr')).toEqual({
      id: 't1',
      title: 'Alimentation',
      subtitle: 'Espèces · 26/11/2026',
      amountText: '-2 500 FCFA',
      tone: 'expense',
      dotColor: '#F57A3D',
    });
  });

  it('décrit un virement par son compte destination', () => {
    const row = toTransactionRowViewState(
      { ...base, type: 'transfer', category_id: null, to_account_id: 'momo' },
      accounts,
      categories,
      fr,
      'fr'
    );
    expect(row.title).toBe('Virement vers MoMo');
    expect(row.amountText).toBe('2 500 FCFA');
    expect(row.tone).toBe('transfer');
  });

  it('traduit catégorie, date et montant en anglais', () => {
    expect(toTransactionRowViewState({ ...base, amount: 1250000 }, accounts, categories, en, 'en')).toMatchObject({
      title: 'Food',
      subtitle: 'Espèces · 11/26/2026',
      amountText: '-1,250,000 FCFA',
    });
  });
});

describe('mappers', () => {
  it('convertit les numeric Postgres (string) en number', () => {
    const t = toTransaction({ ...base, amount: '2500.00', to_amount: null });
    expect(t.amount).toBe(2500);
  });

  it('associe à chaque compte son solde calculé, sinon son solde initial', () => {
    const [withBalance, withoutBalance] = toAccounts(
      [
        { id: 'a', name: 'A', currency: 'XOF', initial_balance: '1000', color: '#000', include_in_balance: true, provider: 'cash' },
        { id: 'b', name: 'B', currency: 'USD', initial_balance: '5.50', color: '#000', include_in_balance: true, provider: 'cash' },
      ],
      [{ account_id: 'a', balance: '4000' }]
    );
    expect(withBalance.balance).toBe(4000);
    expect(withoutBalance.balance).toBe(5.5);
  });
});
