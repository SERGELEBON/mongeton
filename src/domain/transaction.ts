/**
 * Règles métier d'une transaction — équivalent de `validTransaction()` (ViewModel)
 * + des `ensure {}` du `TransactionMapper` d'Ivy, réunis dans une fonction pure.
 */
import type { AccountWithBalance, NewTransaction, TransactionType } from '@/data/types';

import { convert, parseAmount, roundFor, type Rates } from './currency';
import { err, ok, type Result } from './result';

export type TransactionDraft = {
  type: TransactionType;
  amountText: string;
  from: AccountWithBalance | undefined;
  to: AccountWithBalance | undefined;
  categoryId: string | null;
  title: string;
};

/** Montant crédité sur le compte destination d'un virement entre devises différentes. */
export function transferToAmount(draft: TransactionDraft, rates: Rates | undefined): number | null {
  const amount = parseAmount(draft.amountText);
  const { from, to } = draft;
  if (draft.type !== 'transfer' || !from || !to || !amount || !rates || from.currency === to.currency) {
    return null;
  }
  return roundFor(convert(amount, from.currency, to.currency, rates), to.currency);
}

/** Codes d'erreur (traduits par l'UI) plutôt que des phrases : le domaine reste indépendant de la langue. */
export type TransactionError = 'errNoAccount' | 'errAmount' | 'errNoDestination' | 'errSameAccount';

export function validateTransaction(
  draft: TransactionDraft,
  rates: Rates | undefined
): Result<TransactionError, NewTransaction> {
  const { type, from, to } = draft;
  if (!from) return err('errNoAccount');

  const amount = parseAmount(draft.amountText);
  if (!amount) return err('errAmount');

  if (type === 'transfer') {
    if (!to) return err('errNoDestination');
    if (to.id === from.id) return err('errSameAccount');
  }

  return ok({
    type,
    account_id: from.id,
    amount: roundFor(amount, from.currency),
    to_account_id: type === 'transfer' ? to!.id : null,
    to_amount: type === 'transfer' ? transferToAmount(draft, rates) : null,
    category_id: type === 'transfer' ? null : draft.categoryId,
    title: draft.title.trim() || null,
  });
}
