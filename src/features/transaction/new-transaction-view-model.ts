/**
 * ViewModel de l'écran « Nouvelle transaction ».
 * Même contrat que `ComposeViewModel<UiState, UiEvent>` d'Ivy :
 *   - `uiState` : état déjà formaté, prêt à afficher ;
 *   - `onEvent(event)` : seul point d'entrée des actions de l'utilisateur.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { useAccounts, useCategories, useCreateTransaction, useProfile, useRates } from '@/data/hooks';
import type { TransactionType } from '@/data/types';
import {
  transferToAmount,
  validateTransaction,
  type TransactionDraft,
  type TransactionError,
} from '@/domain/transaction';
import { useI18n } from '@/i18n';
import { categoryLabel } from '@/i18n/categories';

export type ChipOption = { value: string; label: string; color?: string };

export type NewTransactionUiState = {
  loading: boolean;
  saving: boolean;
  type: TransactionType;
  amountText: string;
  amountLabel: string;
  fromLabel: string;
  accountOptions: ChipOption[];
  selectedAccountId: string | null;
  isTransfer: boolean;
  toAccountOptions: ChipOption[];
  selectedToAccountId: string | null;
  conversionHint: string | null;
  categoryOptions: ChipOption[];
  selectedCategoryId: string | null;
  title: string;
  error: string | null;
};

export type NewTransactionEvent =
  | { type: 'TypeChanged'; value: TransactionType }
  | { type: 'AmountChanged'; value: string }
  | { type: 'AccountSelected'; id: string }
  | { type: 'ToAccountSelected'; id: string }
  | { type: 'CategoryToggled'; id: string }
  | { type: 'TitleChanged'; value: string }
  | { type: 'Save' };

export function useNewTransactionViewModel(initialType: TransactionType, initialCategoryId: string | null) {
  const { t, money, fmt } = useI18n();
  const profile = useProfile();
  const accounts = useAccounts();
  const categories = useCategories();
  const rates = useRates();
  const create = useCreateTransaction();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState<TransactionError | null>(null);

  const accountList = accounts.data ?? [];
  // Compte par défaut : le premier (comme `defaultAccountId` dans Ivy).
  const fromId = accountId ?? accountList[0]?.id ?? null;
  const draft: TransactionDraft = {
    type,
    amountText,
    from: accountList.find((a) => a.id === fromId),
    to: accountList.find((a) => a.id === toAccountId),
    categoryId,
    title,
  };
  const toAmount = transferToAmount(draft, rates.data);

  const accountOptions = accountList.map((a) => ({
    value: a.id,
    label: `${a.name} · ${a.currency}`,
    color: a.color,
  }));

  // Les catégories religieuses n'apparaissent que si l'option est activée
  // (ou si l'une d'elles a été présélectionnée depuis la carte « Dons »).
  const religious = profile.data?.religious_enabled ?? false;
  const categoryOptions = (categories.data ?? [])
    .filter((c) => religious || !c.is_religious || c.id === categoryId)
    .map((c) => ({ value: c.id, label: categoryLabel(c, t), color: c.color }));

  const uiState: NewTransactionUiState = {
    loading: accounts.isPending || categories.isPending || rates.isPending,
    saving: create.isPending,
    type,
    amountText,
    amountLabel: `${t.transaction.amount}${draft.from ? ` (${draft.from.currency})` : ''}`,
    fromLabel: type === 'transfer' ? t.transaction.fromAccount : t.transaction.account,
    accountOptions,
    selectedAccountId: fromId,
    isTransfer: type === 'transfer',
    toAccountOptions: accountOptions.filter((o) => o.value !== fromId),
    selectedToAccountId: toAccountId,
    conversionHint:
      toAmount !== null && draft.to
        ? fmt(t.transaction.credited, { amount: money(toAmount, draft.to.currency) })
        : null,
    categoryOptions,
    selectedCategoryId: categoryId,
    title,
    error: (formError ? t.transaction[formError] : null) ?? create.error?.message ?? accounts.error?.message ?? null,
  };

  async function save() {
    setFormError(null);
    const result = validateTransaction(draft, rates.data);
    if (!result.ok) return setFormError(result.error);
    try {
      await create.mutateAsync(result.value);
      router.back();
    } catch {
      // Message déjà exposé via `create.error` : l'utilisateur reste sur l'écran.
    }
  }

  function onEvent(event: NewTransactionEvent) {
    switch (event.type) {
      case 'TypeChanged':
        return setType(event.value);
      case 'AmountChanged':
        return setAmountText(event.value);
      case 'AccountSelected':
        return setAccountId(event.id);
      case 'ToAccountSelected':
        return setToAccountId(event.id);
      case 'CategoryToggled':
        return setCategoryId((current) => (current === event.id ? null : event.id));
      case 'TitleChanged':
        return setTitle(event.value);
      case 'Save':
        return void save();
    }
  }

  return { uiState, onEvent };
}
