/**
 * ViewStateMapper (comme `SomethingViewStateMapper` dans Ivy) :
 * modèle de domaine -> données formatées prêtes à afficher. Pur et testable.
 */
import type { AccountWithBalance, Category, Transaction } from '@/data/types';
import { formatMoney, type Language } from '@/domain/currency';
import { categoryLabel } from '@/i18n/categories';
import type { Dictionary } from '@/i18n/fr';

export type AmountTone = 'income' | 'expense' | 'transfer';

export type TransactionRowViewState = {
  id: string;
  title: string;
  subtitle: string;
  amountText: string;
  tone: AmountTone;
  dotColor: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** fr : 26/11/2026 — en : 11/26/2026 */
export function formatDate(iso: string, lang: Language = 'fr'): string {
  const d = new Date(iso);
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  return lang === 'en' ? `${month}/${day}/${d.getFullYear()}` : `${day}/${month}/${d.getFullYear()}`;
}

export function toTransactionRowViewState(
  t: Transaction,
  accounts: Map<string, AccountWithBalance>,
  categories: Map<string, Category>,
  dict: Dictionary,
  lang: Language
): TransactionRowViewState {
  const account = accounts.get(t.account_id);
  const toAccount = t.to_account_id ? accounts.get(t.to_account_id) : undefined;
  const category = t.category_id ? categories.get(t.category_id) : undefined;
  const categoryName = category ? categoryLabel(category, dict) : undefined;

  const title =
    t.title ||
    (t.type === 'transfer'
      ? dict.transaction.transferTo.replace('{name}', toAccount?.name ?? '?')
      : categoryName) ||
    dict.types[t.type];

  const subtitle = [account?.name, categoryName && t.title ? categoryName : null, formatDate(t.occurred_at, lang)]
    .filter(Boolean)
    .join(' · ');

  const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '';

  return {
    id: t.id,
    title,
    subtitle,
    amountText: `${sign}${formatMoney(t.amount, account?.currency ?? 'XOF', lang)}`,
    tone: t.type,
    dotColor: category?.color ?? account?.color ?? '#74747A',
  };
}
