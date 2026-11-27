/**
 * Écran « bête » : affiche `uiState` et renvoie des événements au ViewModel.
 */
import { useLocalSearchParams } from 'expo-router';

import { AppText, Button, ChipGroup, Input, Loading, Screen } from '@/components/ui';
import type { TransactionType } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

import { useNewTransactionViewModel } from './new-transaction-view-model';

const isType = (v: unknown): v is TransactionType => v === 'expense' || v === 'income' || v === 'transfer';

export function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; categoryId?: string }>();
  const { t } = useI18n();
  const c = useTheme();
  const { uiState: s, onEvent } = useNewTransactionViewModel(
    isType(params.type) ? params.type : 'expense',
    typeof params.categoryId === 'string' ? params.categoryId : null
  );

  if (s.loading) return <Loading />;

  const types: { value: TransactionType; label: string; color: string }[] = [
    { value: 'expense', label: t.types.expense, color: c.expense },
    { value: 'income', label: t.types.income, color: c.income },
    { value: 'transfer', label: t.types.transfer, color: c.transfer },
  ];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ChipGroup options={types} value={s.type} onChange={(value) => onEvent({ type: 'TypeChanged', value })} />

      <Input
        label={s.amountLabel}
        value={s.amountText}
        onChangeText={(value) => onEvent({ type: 'AmountChanged', value })}
        keyboardType="decimal-pad"
        placeholder="0"
        autoFocus
      />

      <ChipGroup
        label={s.fromLabel}
        options={s.accountOptions}
        value={s.selectedAccountId}
        onChange={(id) => onEvent({ type: 'AccountSelected', id })}
      />

      {s.isTransfer ? (
        <>
          <ChipGroup
            label={t.transaction.toAccount}
            options={s.toAccountOptions}
            value={s.selectedToAccountId}
            onChange={(id) => onEvent({ type: 'ToAccountSelected', id })}
          />
          {s.conversionHint ? <AppText tone="textSecondary">{s.conversionHint}</AppText> : null}
        </>
      ) : (
        <ChipGroup
          label={`${t.transaction.category} (${t.common.optional})`}
          options={s.categoryOptions}
          value={s.selectedCategoryId}
          onChange={(id) => onEvent({ type: 'CategoryToggled', id })}
        />
      )}

      <Input
        label={`${t.transaction.label} (${t.common.optional})`}
        value={s.title}
        onChangeText={(value) => onEvent({ type: 'TitleChanged', value })}
        placeholder={t.transaction.labelHint}
      />

      {s.error ? (
        <AppText tone="expense" accessibilityRole="alert">
          {s.error}
        </AppText>
      ) : null}
      <Button label={t.common.save} onPress={() => onEvent({ type: 'Save' })} loading={s.saving} />
    </Screen>
  );
}
