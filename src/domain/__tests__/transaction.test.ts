import { describe, expect, it } from '@jest/globals';

import type { AccountWithBalance } from '@/data/types';

import { monthSummary, totalBalance } from '../balance';
import type { Rates } from '../currency';
import { validateTransaction, type TransactionDraft } from '../transaction';

const rates: Rates = { USD: 1, XOF: 600, GHS: 12, EUR: 0.9147 };

const account = (id: string, currency: AccountWithBalance['currency'], balance = 0): AccountWithBalance => ({
  id,
  name: id,
  currency,
  initial_balance: 0,
  color: '#000',
  include_in_balance: true,
  balance,
  provider: 'cash',
});

const cash = account('cash', 'XOF', 60000);
const bank = account('bank', 'USD', 100);

const draft = (overrides: Partial<TransactionDraft>): TransactionDraft => ({
  type: 'expense',
  amountText: '1500',
  from: cash,
  to: undefined,
  categoryId: null,
  title: '',
  ...overrides,
});

describe('validateTransaction', () => {
  it('accepte une dépense valide et nettoie le titre', () => {
    const result = validateTransaction(draft({ title: '  Marché  ', categoryId: 'food' }), rates);
    expect(result).toEqual({
      ok: true,
      value: {
        type: 'expense',
        account_id: 'cash',
        amount: 1500,
        to_account_id: null,
        to_amount: null,
        category_id: 'food',
        title: 'Marché',
      },
    });
  });

  it('refuse un montant nul ou invalide', () => {
    expect(validateTransaction(draft({ amountText: '0' }), rates)).toMatchObject({ ok: false });
    expect(validateTransaction(draft({ amountText: 'abc' }), rates)).toMatchObject({ ok: false });
  });

  it('refuse sans compte', () => {
    expect(validateTransaction(draft({ from: undefined }), rates)).toEqual({
      ok: false,
      error: 'errNoAccount',
    });
  });

  it('refuse un virement sans destination ou vers le même compte', () => {
    expect(validateTransaction(draft({ type: 'transfer' }), rates)).toMatchObject({ ok: false });
    expect(validateTransaction(draft({ type: 'transfer', to: cash }), rates)).toMatchObject({ ok: false });
  });

  it('convertit un virement entre devises et ignore la catégorie', () => {
    const result = validateTransaction(
      draft({ type: 'transfer', amountText: '6000', to: bank, categoryId: 'food' }),
      rates
    );
    expect(result).toMatchObject({
      ok: true,
      value: { to_account_id: 'bank', to_amount: 10, category_id: null },
    });
  });
});

describe('balance', () => {
  it('additionne les soldes convertis dans la devise de base', () => {
    // 60 000 FCFA + 100 $ (= 60 000 FCFA)
    expect(totalBalance([cash, bank], 'XOF', rates)).toBe(120000);
  });

  it('exclut les comptes hors solde', () => {
    expect(totalBalance([cash, { ...bank, include_in_balance: false }], 'XOF', rates)).toBe(60000);
  });

  it('résume le mois courant sans compter les virements ni le mois précédent', () => {
    const now = new Date(2026, 10, 26);
    const t = (type: 'income' | 'expense' | 'transfer', amount: number, date: Date, accountId = 'cash') => ({
      id: `${type}-${amount}`,
      type,
      account_id: accountId,
      amount,
      to_account_id: type === 'transfer' ? 'bank' : null,
      to_amount: null,
      category_id: null,
      title: null,
      note: null,
      occurred_at: date.toISOString(),
    });
    const summary = monthSummary(
      [
        t('income', 100000, new Date(2026, 10, 2)),
        t('expense', 2500, new Date(2026, 10, 20)),
        t('expense', 10, new Date(2026, 10, 21), 'bank'), // 10 $ = 6 000 FCFA
        t('transfer', 9999, new Date(2026, 10, 22)),
        t('expense', 7777, new Date(2026, 9, 30)), // mois précédent
      ],
      [cash, bank],
      'XOF',
      rates,
      now
    );
    expect(summary).toEqual({ income: 100000, expense: 8500 });
  });
});
