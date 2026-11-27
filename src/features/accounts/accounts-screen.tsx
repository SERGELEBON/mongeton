import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PROVIDER_NAMES, ProviderLogo } from '@/components/provider-logo';
import { AppText, Button, Card, ErrorText, Loading, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAccounts, useDeleteAccount } from '@/data/hooks';
import { StatementImportButton } from '@/features/import/import-entry';
import { useI18n } from '@/i18n';

export function AccountsScreen() {
  const { t, money } = useI18n();
  const accounts = useAccounts();
  const remove = useDeleteAccount();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (accounts.isPending) return <Loading />;

  return (
    <Screen>
      <AppText variant="title">{t.accounts.title}</AppText>
      <ErrorText error={accounts.error ?? remove.error} />

      {(accounts.data ?? []).map((a) => {
        const providerName =
          a.provider === 'cash' || a.provider === 'bank' ? t.providers[a.provider] : PROVIDER_NAMES[a.provider];
        return (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <ProviderLogo provider={a.provider} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading" numberOfLines={1}>
                  {a.name}
                </AppText>
                <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
                  {providerName} · {a.currency}
                  {a.include_in_balance ? '' : ` · ${t.accounts.excluded}`}
                </AppText>
              </View>
              <AppText variant="heading" tone={a.balance < 0 ? 'expense' : 'text'}>
                {money(a.balance, a.currency)}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => (confirmId === a.id ? remove.mutate(a.id) : setConfirmId(a.id))}>
              <AppText variant="caption" tone={confirmId === a.id ? 'expense' : 'textSecondary'}>
                {confirmId === a.id ? t.accounts.deleteConfirm : t.accounts.deleteOne}
              </AppText>
            </Pressable>
          </Card>
        );
      })}

      <Button
        label={t.accounts.add}
        icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
        onPress={() => router.push('/account/new')}
      />
      <StatementImportButton />
    </Screen>
  );
}
