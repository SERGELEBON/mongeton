/**
 * Couche Domain : logique métier pure (testable sans Supabase).
 */
import type { AccountWithBalance, Transaction } from '@/data/types';

import { convert, type CurrencyCode, type Rates } from './currency';

/** Solde total dans la devise de base, en ne comptant que les comptes inclus. */
export function totalBalance(accounts: AccountWithBalance[], base: CurrencyCode, rates: Rates): number {
  return accounts
    .filter((a) => a.include_in_balance)
    .reduce((sum, a) => sum + convert(a.balance, a.currency, base, rates), 0);
}

/** Revenus et dépenses du mois en cours, convertis dans la devise de base. Les virements sont ignorés. */
export function monthSummary(
  transactions: Transaction[],
  accounts: AccountWithBalance[],
  base: CurrencyCode,
  rates: Rates,
  now = new Date()
): { income: number; expense: number } {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (new Date(t.occurred_at).getTime() < start || t.type === 'transfer') continue;
    const value = convert(t.amount, currencyOf.get(t.account_id) ?? base, base, rates);
    if (t.type === 'income') income += value;
    else expense += value;
  }
  return { income, expense };
}
