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
  Challenge,
  ChallengeAlert,
  ImportedTransaction,
  NewChallenge,
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
      .select('id, display_name, base_currency, language, religious_enabled, country, telegram_chat_id')
      .single<Profile>()
  );
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  checkWrite(await supabase.from('profiles').update(patch).eq('id', userId));
}

/** Code à usage unique (30 min) pour relier Telegram via le bot. */
export async function createTelegramLinkCode(): Promise<string> {
  const { data, error } = await supabase.rpc('create_telegram_link_code');
  if (error) throw new Error(error.message);
  return data as string;
}

export async function unlinkTelegram(): Promise<void> {
  const { error } = await supabase.rpc('unlink_telegram');
  if (error) throw new Error(error.message);
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

/** Toutes les opérations depuis une date (stats, challenges) — plafonné à 5 000 lignes. */
export async function listTransactionsSince(fromIso: string): Promise<Transaction[]> {
  const rows = check(
    await supabase
      .from('transactions')
      .select('id, type, account_id, amount, to_account_id, to_amount, category_id, title, note, occurred_at')
      .gte('occurred_at', fromIso)
      .order('occurred_at', { ascending: false })
      .limit(5000)
      .returns<TransactionRow[]>()
  );
  return rows.map(toTransaction);
}

// ---------- Challenges ----------
type ChallengeRow = Omit<Challenge, 'amount'> & { amount: number | string };

export async function listChallenges(): Promise<Challenge[]> {
  const rows = check(
    await supabase
      .from('challenges')
      .select('id, name, period, amount, category_id, active')
      .order('created_at')
      .returns<ChallengeRow[]>()
  );
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function createChallenge(input: NewChallenge): Promise<void> {
  checkWrite(await supabase.from('challenges').insert(input));
}

export async function setChallengeActive(id: string, active: boolean): Promise<void> {
  checkWrite(await supabase.from('challenges').update({ active }).eq('id', id));
}

export async function deleteChallenge(id: string): Promise<void> {
  checkWrite(await supabase.from('challenges').delete().eq('id', id));
}

/**
 * Enregistre les alertes franchies. Grâce à la contrainte unique (challenge, période, niveau),
 * seules les NOUVELLES alertes sont renvoyées : ce sont elles qu'on notifie.
 */
export async function raiseChallengeAlerts(
  rows: { challenge_id: string; period_start: string; level: 'warning' | 'exceeded'; spent: number }[]
): Promise<ChallengeAlert[]> {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from('challenge_alerts')
    .upsert(rows, { onConflict: 'challenge_id,period_start,level', ignoreDuplicates: true })
    .select('id, challenge_id, period_start, level, spent, created_at, read_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as ChallengeAlert[];
}

export async function listUnreadAlerts(): Promise<ChallengeAlert[]> {
  return check(
    await supabase
      .from('challenge_alerts')
      .select('id, challenge_id, period_start, level, spent, created_at, read_at')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(20)
      .returns<ChallengeAlert[]>()
  );
}

export async function markAlertsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  checkWrite(await supabase.from('challenge_alerts').update({ read_at: new Date().toISOString() }).in('id', ids));
}

/** Demande l'envoi de l'email d'alerte (fonction serveur Supabase « challenge-alert-email »). */
export async function requestAlertEmail(alertId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('challenge-alert-email', { body: { alertId } });
  if (error) throw new Error(error.message);
}

// ---------- Taux de change ----------
export async function getRates(): Promise<Rates> {
  return toRates(check(await supabase.from('exchange_rates').select('currency, rate').returns<RateRow[]>()));
}
