import { router } from 'expo-router';
import { useState } from 'react';

import { Button, ChipGroup, ErrorText, Input, Screen, Segmented } from '@/components/ui';
import { useCategories, useCreateChallenge, useProfile } from '@/data/hooks';
import { DEFAULT_CURRENCY, parseAmount } from '@/domain/currency';
import type { Period } from '@/domain/periods';
import { useI18n } from '@/i18n';
import { categoryLabel } from '@/i18n/categories';
import { requestNotificationPermission } from '@/lib/notifications';

const ALL = '__all__';

export function NewChallengeScreen() {
  const { t, fmt } = useI18n();
  const profile = useProfile();
  const categories = useCategories();
  const create = useCreateChallenge();
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  const [amountText, setAmountText] = useState('');
  const [scope, setScope] = useState<string>(ALL);
  const [formError, setFormError] = useState<string | null>(null);

  const base = profile.data?.base_currency ?? DEFAULT_CURRENCY;

  async function save() {
    setFormError(null);
    if (!name.trim()) return setFormError(t.challenge.errName);
    const amount = parseAmount(amountText);
    if (!amount) return setFormError(t.challenge.errAmount);
    try {
      await create.mutateAsync({ name: name.trim(), period, amount, category_id: scope === ALL ? null : scope });
      // Première création : on propose d'activer les notifications d'alerte.
      await requestNotificationPermission();
      router.back();
    } catch {
      // affiché via create.error
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Input label={t.challenge.name} value={name} onChangeText={setName} placeholder={t.challenge.nameHint} autoFocus />
      <Segmented<Period>
        label={t.challenge.period}
        options={[
          { value: 'week', label: t.periods.week },
          { value: 'month', label: t.periods.month },
          { value: 'quarter', label: t.periods.quarter },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <Input
        label={fmt(t.challenge.amount, { currency: base })}
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="0"
      />
      <ChipGroup
        label={t.challenge.scope}
        options={[
          { value: ALL, label: t.challenge.allExpenses },
          ...(categories.data ?? [])
            .filter((c) => c.key !== 'salary')
            .map((c) => ({ value: c.id, label: categoryLabel(c, t), color: c.color })),
        ]}
        value={scope}
        onChange={setScope}
      />
      <ErrorText error={formError ?? create.error} />
      <Button label={t.challenge.create} onPress={save} loading={create.isPending} />
    </Screen>
  );
}
