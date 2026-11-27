import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PROVIDER_COLORS, PROVIDER_NAMES, ProviderLogo } from '@/components/provider-logo';
import { AppText, Button, ErrorText, Input, Screen, Segmented } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useCreateAccount, useProfile } from '@/data/hooks';
import { COUNTRIES, providersFor, type ProviderId } from '@/domain/countries';
import { DEFAULT_CURRENCY, parseAmount, type CurrencyCode } from '@/domain/currency';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/providers/preferences';

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'XOF', label: 'FCFA' },
  { value: 'GHS', label: 'GH₵' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
];

export function NewAccountScreen() {
  const { t } = useI18n();
  const c = useTheme();
  const prefs = usePreferences();
  const profile = useProfile();
  const create = useCreateAccount();

  const country = profile.data?.country ?? prefs.country;
  const providers = providersFor(country);
  const countryCurrency = country ? COUNTRIES[country].currency : null;

  const [provider, setProvider] = useState<ProviderId>(providers[0]);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode | null>(null);
  const [initial, setInitial] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const providerName = (p: ProviderId) => (p === 'cash' || p === 'bank' ? t.providers[p] : PROVIDER_NAMES[p]);
  // Mobile Money -> devise du pays ; sinon devise principale de l'utilisateur.
  const selectedCurrency =
    currency ?? countryCurrency ?? profile.data?.base_currency ?? DEFAULT_CURRENCY;

  async function save() {
    setFormError(null);
    const finalName = name.trim() || providerName(provider);
    const initialBalance = initial.trim() ? parseAmount(initial) : 0;
    if (initialBalance === null) return setFormError(t.accounts.errInitial);
    try {
      await create.mutateAsync({
        name: finalName,
        currency: selectedCurrency,
        initial_balance: initialBalance,
        color: PROVIDER_COLORS[provider],
        provider,
      });
      router.back();
    } catch {
      // affiché via create.error
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" tone="textSecondary">
          {t.accounts.provider}
        </AppText>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {providers.map((p) => {
            const selected = p === provider;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={providerName(p)}
                onPress={() => setProvider(p)}
                style={[
                  styles.tile,
                  { backgroundColor: c.card, borderColor: selected ? c.primary : c.border },
                  selected && styles.tileSelected,
                ]}>
                <ProviderLogo provider={p} size={44} />
                <AppText numberOfLines={1} style={styles.tileText}>
                  {providerName(p)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" tone="textSecondary">
          {t.accounts.providerHint}
        </AppText>
      </View>

      <Input
        label={t.accounts.name}
        value={name}
        onChangeText={setName}
        placeholder={providerName(provider)}
      />
      <Segmented<CurrencyCode>
        label={t.accounts.currency}
        options={CURRENCY_OPTIONS}
        value={selectedCurrency}
        onChange={setCurrency}
      />
      <Input
        label={`${t.accounts.initialBalance} (${selectedCurrency})`}
        value={initial}
        onChangeText={setInitial}
        keyboardType="decimal-pad"
        placeholder="0"
      />
      <ErrorText error={formError ?? create.error} />
      <Button label={t.accounts.create} onPress={save} loading={create.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  tileSelected: { borderWidth: 2.5 },
  tileText: { fontFamily: Fonts.semiBold, fontSize: 12 },
});
