import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { useAccounts, useImportTransactions, useTransactions } from '@/data/hooks';
import type { ImportedTransaction } from '@/data/types';
import { roundFor } from '@/domain/currency';
import { likelyDuplicates } from '@/domain/import/duplicates';
import { useI18n } from '@/i18n';
import { formatDate } from '@/features/home/transaction-view-state';

import { removePendingNotifications } from '../../../modules/mongeton-notifications';
import { setImportSession, useImportSession } from './import-session';

export type ReviewRow = {
  id: string;
  selected: boolean;
  duplicate: boolean;
  currencyMismatch: boolean;
  dateText: string;
  description: string;
  amountText: string;
  tone: 'income' | 'expense';
};

export type ImportReviewEvent =
  | { type: 'Toggle'; id: string }
  | { type: 'ToggleAll' }
  | { type: 'AccountSelected'; id: string }
  | { type: 'Import' }
  | { type: 'IgnoreAll' }
  | { type: 'Close' };

export function useImportReviewViewModel() {
  const { t, lang, money, fmt } = useI18n();
  const session = useImportSession();
  const accounts = useAccounts();
  const transactions = useTransactions();
  const importMutation = useImportTransactions();

  const candidates = useMemo(() => session?.candidates ?? [], [session]);
  const duplicates = useMemo(
    () => likelyDuplicates(candidates, transactions.data ?? []),
    [candidates, transactions.data]
  );

  // Compte par défaut : celui du même fournisseur (ex. notification Wave -> compte Wave), sinon le premier.
  const defaultAccountId = useMemo(() => {
    const list = accounts.data ?? [];
    const provider = candidates.find((c) => c.provider)?.provider;
    return list.find((a) => a.provider === provider)?.id ?? list[0]?.id ?? null;
  }, [accounts.data, candidates]);

  const [accountId, setAccountId] = useState<string | null>(null);
  const [deselected, setDeselected] = useState<Set<string> | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  const selectedAccountId = accountId ?? defaultAccountId;
  const account = accounts.data?.find((a) => a.id === selectedAccountId);
  // Par défaut : tout est coché sauf les doublons probables.
  const excluded = deselected ?? duplicates;
  const isSelected = (id: string) => !excluded.has(id);
  const selectedCount = candidates.filter((c) => isSelected(c.externalId)).length;

  const rows: ReviewRow[] = candidates.map((c) => ({
    id: c.externalId,
    selected: isSelected(c.externalId),
    duplicate: duplicates.has(c.externalId),
    currencyMismatch: !!c.currency && !!account && c.currency !== account.currency,
    dateText: formatDate(c.occurredAt, lang),
    description: c.description || t.types[c.type],
    amountText: `${c.type === 'income' ? '+' : '-'}${money(c.amount, account?.currency ?? c.currency ?? 'XOF')}`,
    tone: c.type,
  }));

  function finish() {
    if (session?.source === 'notification') {
      // Retire de la file native tout ce qui a été présenté (importé, ignoré ou illisible).
      removePendingNotifications([
        ...candidates.map((c) => c.notificationId).filter((id): id is string => !!id),
        ...session.unparsedNotificationIds,
      ]);
    }
    setImportSession(null);
    router.back();
  }

  async function runImport() {
    if (!account) return;
    const payload: ImportedTransaction[] = candidates
      .filter((c) => isSelected(c.externalId))
      .map((c) => ({
        type: c.type,
        account_id: account.id,
        amount: roundFor(c.amount, account.currency),
        title: c.description || null,
        occurred_at: c.occurredAt,
        source: c.source,
        external_id: c.externalId,
      }));
    try {
      setDoneCount(await importMutation.mutateAsync(payload));
    } catch {
      // erreur exposée via importMutation.error
    }
  }

  function onEvent(event: ImportReviewEvent) {
    switch (event.type) {
      case 'Toggle': {
        const next = new Set(excluded);
        if (next.has(event.id)) next.delete(event.id);
        else next.add(event.id);
        return setDeselected(next);
      }
      case 'ToggleAll':
        return setDeselected(selectedCount === candidates.length ? new Set(candidates.map((c) => c.externalId)) : new Set());
      case 'AccountSelected':
        return setAccountId(event.id);
      case 'Import':
        return void runImport();
      case 'IgnoreAll':
      case 'Close':
        return finish();
    }
  }

  return {
    uiState: {
      loading: accounts.isPending || transactions.isPending,
      hasSession: !!session,
      empty: candidates.length === 0,
      skippedText: session?.skipped ? fmt(t.imports.skipped, { count: session.skipped }) : null,
      accountOptions: (accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}`, color: a.color })),
      selectedAccountId,
      rows,
      allSelected: selectedCount === candidates.length && candidates.length > 0,
      importLabel: fmt(t.imports.importCount, { count: selectedCount }),
      canImport: selectedCount > 0 && !!account,
      importing: importMutation.isPending,
      error: importMutation.error?.message ?? null,
      doneText: doneCount === null ? null : fmt(t.imports.done, { count: doneCount }),
    },
    onEvent,
  };
}
