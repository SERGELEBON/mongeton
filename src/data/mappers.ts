/**
 * Mappers : lignes brutes Supabase (raw model) -> modèles de l'app (domain model).
 * Équivalent du `TransactionMapper` d'Ivy. Postgres `numeric` arrive en string
 * via l'API : la conversion en number se fait ici et nulle part ailleurs.
 */
import type { CurrencyCode, Rates } from '@/domain/currency';

import type { Account, AccountWithBalance, Transaction, TransactionType } from './types';

type Numeric = number | string | null;

export type AccountRow = Omit<Account, 'initial_balance'> & { initial_balance: Numeric };
export type BalanceRow = { account_id: string; balance: Numeric };
export type TransactionRow = Omit<Transaction, 'amount' | 'to_amount' | 'type'> & {
  type: TransactionType;
  amount: Numeric;
  to_amount: Numeric;
};
export type RateRow = { currency: CurrencyCode; rate: Numeric };

const toNumber = (v: Numeric) => Number(v ?? 0);

export function toAccounts(rows: AccountRow[], balances: BalanceRow[]): AccountWithBalance[] {
  const balanceById = new Map(balances.map((b) => [b.account_id, toNumber(b.balance)]));
  return rows.map((row) => {
    const initial = toNumber(row.initial_balance);
    return { ...row, initial_balance: initial, balance: balanceById.get(row.id) ?? initial };
  });
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    ...row,
    amount: toNumber(row.amount),
    to_amount: row.to_amount === null ? null : toNumber(row.to_amount),
  };
}

export function toRates(rows: RateRow[]): Rates {
  const rates: Rates = { USD: 1, XOF: 1, GHS: 1, EUR: 1 };
  for (const r of rows) rates[r.currency] = toNumber(r.rate);
  return rates;
}
