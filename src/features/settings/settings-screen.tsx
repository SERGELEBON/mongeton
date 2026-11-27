import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Logo } from '@/components/logo';
import { AppText, Button, Card, ErrorText, Loading, Screen, Segmented, SwitchRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProfile, useRates, useUpdateProfile } from '@/data/hooks';
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from '@/domain/countries';
import { CURRENCY_CODES, DEFAULT_CURRENCY, type CurrencyCode, type Language } from '@/domain/currency';
import { DetectionCard } from '@/features/import/import-entry';
import { TelegramCard } from '@/features/settings/telegram-card';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';

export function SettingsScreen() {
  const { t, money, fmt } = useI18n();
  const c = useTheme();
  const { session } = useAuth();
  const prefs = usePreferences();
  const profile = useProfile();
  const rates = useRates();
  const updateProfile = useUpdateProfile();

  if (profile.isPending || rates.isPending) return <Loading />;
  const base = profile.data?.base_currency ?? DEFAULT_CURRENCY;

  // Chaque réglage est appliqué localement (immédiat) ET enregistré dans le profil (multi-appareils).
  const setLanguage = (language: Language) => {
    prefs.update({ language });
    updateProfile.mutate({ language });
  };
  const setCurrency = (currency: CurrencyCode) => {
    prefs.update({ currency });
    updateProfile.mutate({ base_currency: currency });
  };
  const setCountry = (country: CountryCode) => {
    prefs.update({ country });
    updateProfile.mutate({ country });
  };
  const setReligious = (religiousEnabled: boolean) => {
    prefs.update({ religiousEnabled });
    updateProfile.mutate({ religious_enabled: religiousEnabled });
  };

  return (
    <Screen>
      <AppText variant="title">{t.settings.title}</AppText>

      <Card style={{ gap: Spacing.lg }}>
        <Segmented<CountryCode>
          label={t.settings.country}
          options={COUNTRY_CODES.map((code) => ({ value: code, label: `${COUNTRIES[code].flag} ${t.countries[code]}` }))}
          value={profile.data?.country ?? prefs.country}
          onChange={setCountry}
        />
        <Segmented<Language>
          label={t.settings.language}
          options={[
            { value: 'fr', label: t.languages.fr },
            { value: 'en', label: t.languages.en },
          ]}
          value={prefs.language}
          onChange={setLanguage}
        />
        <View style={{ gap: Spacing.xs }}>
          <Segmented<CurrencyCode>
            label={t.settings.currency}
            options={[
              { value: 'XOF', label: 'FCFA' },
              { value: 'GHS', label: 'GH₵' },
              { value: 'USD', label: '$ USD' },
              { value: 'EUR', label: '€ EUR' },
            ]}
            value={base}
            onChange={setCurrency}
          />
          <AppText variant="caption" tone="textSecondary">
            {t.settings.currencyHint}
          </AppText>
        </View>
        <SwitchRow
          label={t.settings.religious}
          hint={t.settings.religiousHint}
          value={profile.data?.religious_enabled ?? false}
          onChange={setReligious}
        />
        <ErrorText error={updateProfile.error ?? profile.error} />
      </Card>

      <DetectionCard />

      <TelegramCard />

      <Card>
        <AppText variant="heading">{t.settings.rates}</AppText>
        {rates.data
          ? CURRENCY_CODES.filter((code) => code !== 'USD').map((code) => (
              <AppText key={code}>
                {money(1, 'USD')} = {money(rates.data[code], code)}
              </AppText>
            ))
          : null}
        <ErrorText error={rates.error} />
      </Card>

      <Card>
        <AppText tone="textSecondary">{fmt(t.settings.signedInAs, { email: session?.user.email ?? '' })}</AppText>
        <Button
          label={t.settings.signOut}
          variant="outline"
          tone="expense"
          icon={<Ionicons name="log-out-outline" size={18} color={c.expense} />}
          onPress={() => supabase.auth.signOut()}
        />
      </Card>

      <View style={{ paddingVertical: Spacing.lg, opacity: 0.9 }}>
        <Logo size="small" />
      </View>
    </Screen>
  );
}
