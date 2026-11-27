/**
 * Couche Data : seul endroit qui parle à Supabase (rôle des DAO + Repository d'Ivy).
 * La conversion brute -> modèle est déléguée aux mappers.
 * Chaque fonction lève une Error lisible en cas d'échec (pas d'échec silencieux,
 * contrairement au `getOrNull()` d'Ivy).
 */
import type { Rates } from '@/domain/currency';
import { supabase } from '@/lib/supabase';

import {
  toAccounts,
  toRates,
  toTransaction,
  type AccountRow,
  type BalanceRow,
  type RateRow,
  type TransactionRow,
} from './mappers';
import type {
  AccountWithBalance,
  Category,
  ImportedTransaction,
  NewAccount,
  NewTransaction,
  Profile,
  ProfilePatch,
  Transaction,
} from './types';

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Aucune donnée reçue');
  return result.data;
}

function checkWrite(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}

// ---------- Profil ----------
export async function getProfile(): Promise<Profile> {
  return check(
    await supabase
      .from('profiles')
      .select('id, display_name, base_currency, language, religious_enabled, country')
      .single<Profile>()
  );
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  checkWrite(await supabase.from('profiles').update(patch).eq('id', userId));
}

// ---------- Comptes ----------
export async function listAccounts(): Promise<AccountWithBalance[]> {
  const [accounts, balances] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, currency, initial_balance, color, include_in_balance, provider')
      .order('created_at')
      .returns<AccountRow[]>(),
    supabase.from('account_balances').select('account_id, balance').returns<BalanceRow[]>(),
  ]);
  return toAccounts(check(accounts), check(balances));
}

export async function createAccount(input: NewAccount): Promise<void> {
  checkWrite(await supabase.from('accounts').insert(input));
}

export async function deleteAccount(id: string): Promise<void> {
  checkWrite(await supabase.from('accounts').delete().eq('id', id));
}

// ---------- Catégories ----------
export async function listCategories(): Promise<Category[]> {
  return check(
    await supabase
      .from('categories')
      .select('id, name, color, key, is_religious')
      .order('created_at')
      .returns<Category[]>()
  );
}

// ---------- Transactions ----------
export async function listTransactions(limit = 100): Promise<Transaction[]> {
  const rows = check(
    await supabase
      .from('transactions')
      .select('id, type, account_id, amount, to_account_id, to_amount, category_id, title, note, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(limit)
      .returns<TransactionRow[]>()
  );
  return rows.map(toTransaction);
}

export async function createTransaction(input: NewTransaction): Promise<void> {
  checkWrite(await supabase.from('transactions').insert(input));
}

/**
 * Insertion groupée d'opérations importées. Les doublons (même external_id déjà
 * en base pour cet utilisateur) sont ignorés silencieusement par Postgres.
 * Renvoie le nombre de lignes réellement ajoutées.
 */
export async function importTransactions(rows: ImportedTransaction[]): Promise<number> {
  if (!rows.length) return 0;
  const { data, error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function deleteTransaction(id: string): Promise<void> {
  checkWrite(await supabase.from('transactions').delete().eq('id', id));
}

// ---------- Taux de change ----------
export async function getRates(): Promise<Rates> {
  return toRates(check(await supabase.from('exchange_rates').select('currency, rate').returns<RateRow[]>()));
}
