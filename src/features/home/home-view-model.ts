import { router } from 'expo-router';
import { useMemo } from 'react';

import {
  useAccounts,
  useCategories,
  useDeleteTransaction,
  useProfile,
  useRates,
  useTransactions,
} from '@/data/hooks';
import type { TransactionType } from '@/data/types';
import { monthSummary, totalBalance } from '@/domain/balance';
import { DEFAULT_CURRENCY } from '@/domain/currency';
import { GIVING_KEYS, givingSummary, type GivingKey } from '@/domain/giving';
import { useI18n } from '@/i18n';

import { toTransactionRowViewState, type TransactionRowViewState } from './transaction-view-state';

export type GivingItemViewState = { key: GivingKey; label: string; amountText: string; categoryId: string | null };

export type GivingViewState = {
  items: GivingItemViewState[];
  titheTargetText: string;
  titheStatusText: string;
  titheDone: boolean;
  /** Progression de la dîme du mois, entre 0 et 1. */
  titheProgress: number;
};

export type HomeUiState = {
  loading: boolean;
  error: string | null;
  greeting: string;
  totalLabel: string;
  totalText: string;
  totalIsNegative: boolean;
  monthIncomeText: string;
  monthExpenseText: string;
  giving: GivingViewState | null;
  rows: TransactionRowViewState[];
};

export type HomeEvent =
  | { type: 'AddTransaction'; transactionType: TransactionType; categoryId?: string }
  | { type: 'DeleteTransaction'; id: string };

export function useHomeViewModel() {
  const { t, lang, money, fmt } = useI18n();
  const profile = useProfile();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const rates = useRates();
  const deleteTrn = useDeleteTransaction();

  const base = profile.data?.base_currency ?? DEFAULT_CURRENCY;

  const rows = useMemo(() => {
    const accountMap = new Map((accounts.data ?? []).map((a) => [a.id, a]));
    const categoryMap = new Map((categories.data ?? []).map((c) => [c.id, c]));
    return (transactions.data ?? []).map((tr) => toTransactionRowViewState(tr, accountMap, categoryMap, t, lang));
  }, [accounts.data, categories.data, transactions.data, t, lang]);

  const giving = useMemo((): GivingViewState | null => {
    if (!profile.data?.religious_enabled || !transactions.data || !accounts.data || !categories.data || !rates.data) {
      return null;
    }
    const s = givingSummary(transactions.data, accounts.data, categories.data, base, rates.data);
    const idOf = (key: GivingKey) => categories.data.find((c) => c.key === key)?.id ?? null;
    return {
      items: GIVING_KEYS.map((key) => ({
        key,
        label: t.giving[key],
        amountText: money(s.totals[key], base),
        categoryId: idOf(key),
      })),
      titheTargetText: fmt(t.giving.titheTarget, { amount: money(s.titheTarget, base) }),
      titheDone: s.titheTarget > 0 && s.titheRemaining === 0,
      titheStatusText:
        s.titheTarget > 0 && s.titheRemaining === 0
          ? t.giving.titheDone
          : fmt(t.giving.titheRemaining, { amount: money(s.titheRemaining, base) }),
      titheProgress: s.titheTarget > 0 ? Math.min(1, s.totals.tithe / s.titheTarget) : 0,
    };
  }, [profile.data, transactions.data, accounts.data, categories.data, rates.data, base, t, money, fmt]);

  const queries = [profile, accounts, categories, transactions, rates];
  const total = accounts.data && rates.data ? totalBalance(accounts.data, base, rates.data) : 0;
  const month =
    transactions.data && accounts.data && rates.data
      ? monthSummary(transactions.data, accounts.data, base, rates.data)
      : { income: 0, expense: 0 };

  const uiState: HomeUiState = {
    loading: queries.some((q) => q.isPending),
    error: (queries.find((q) => q.error)?.error ?? deleteTrn.error)?.message ?? null,
    greeting: fmt(t.home.greeting, { name: profile.data?.display_name ?? '' }),
    totalLabel: `${t.home.totalBalance} · ${base}`,
    totalText: money(total, base),
    totalIsNegative: total < 0,
    monthIncomeText: money(month.income, base),
    monthExpenseText: money(month.expense, base),
    giving,
    rows,
  };

  function onEvent(event: HomeEvent) {
    switch (event.type) {
      case 'AddTransaction':
        return router.push({
          pathname: '/transaction/new',
          params: { type: event.transactionType, ...(event.categoryId ? { categoryId: event.categoryId } : {}) },
        });
      case 'DeleteTransaction':
        return deleteTrn.mutate(event.id);
    }
  }

  return { uiState, onEvent };
}
