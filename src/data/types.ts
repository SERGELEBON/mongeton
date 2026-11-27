import type { CountryCode, ProviderId } from '@/domain/countries';
import type { CurrencyCode, Language } from '@/domain/currency';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type Profile = {
  id: string;
  display_name: string | null;
  base_currency: CurrencyCode;
  language: Language;
  religious_enabled: boolean;
  country: CountryCode | null;
};

export type ProfilePatch = Partial<Pick<Profile, 'base_currency' | 'language' | 'religious_enabled' | 'country'>>;

export type Account = {
  id: string;
  name: string;
  currency: CurrencyCode;
  initial_balance: number;
  color: string;
  include_in_balance: boolean;
  provider: ProviderId;
};

/** Compte enrichi de son solde (vue `account_balances`). */
export type AccountWithBalance = Account & { balance: number };

/** Clés des catégories par défaut : leur nom affiché est traduit. */
export type CategoryKey =
  | 'food'
  | 'transport'
  | 'housing'
  | 'health'
  | 'leisure'
  | 'salary'
  | 'other'
  | 'tithe'
  | 'offering'
  | 'thanksgiving';

export type Category = {
  id: string;
  name: string;
  color: string;
  key: CategoryKey | null;
  is_religious: boolean;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  account_id: string;
  amount: number;
  to_account_id: string | null;
  to_amount: number | null;
  category_id: string | null;
  title: string | null;
  note: string | null;
  occurred_at: string;
};

export type NewTransaction = Omit<Transaction, 'id' | 'occurred_at' | 'note'> & {
  occurred_at?: string;
  note?: string | null;
};

/** Opération importée (relevé ou notification), prête à être insérée. */
export type ImportedTransaction = {
  type: 'income' | 'expense';
  account_id: string;
  amount: number;
  title: string | null;
  occurred_at: string;
  source: 'statement' | 'notification';
  external_id: string;
};

export type NewAccount = Pick<Account, 'name' | 'currency' | 'initial_balance' | 'color' | 'provider'>;
