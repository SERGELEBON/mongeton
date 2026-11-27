/**
 * Écran d'ouverture (premier lancement) :
 *   1. Intro : logo seul, animé, 5 secondes ;
 *   2. Choix du pays, de la langue, de la devise et de l'option religieuse, puis « Commencer ».
 * Écran fixe (non défilant) : tout tient sur une page.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { AppText, Button, Card, Segmented, SwitchRow } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from '@/domain/countries';
import { type CurrencyCode, type Language } from '@/domain/currency';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/providers/preferences';

import { Intro } from './intro';

/** Libellés courts, sur une seule ligne. */
const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'XOF', label: 'FCFA' },
  { value: 'GHS', label: 'GH₵' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
];

export function WelcomeScreen() {
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  return introDone ? <FadeIn><WelcomeForm /></FadeIn> : <Intro onDone={finishIntro} />;
}

/** Fondu d'entrée : enchaîne en douceur après la sortie de l'intro. */
function FadeIn({ children }: { children: ReactNode }) {
  const opacity = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}

function WelcomeForm() {
  const prefs = usePreferences();
  const { t } = useI18n();
  const c = useTheme();
  const [religious, setReligious] = useState(prefs.religiousEnabled);

  // Choisir un pays adapte la langue et la devise (modifiables ensuite).
  const selectCountry = (country: CountryCode) => {
    const info = COUNTRIES[country];
    prefs.update({ country, language: info.language, currency: info.currency });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Logo size="small" />
        </View>

        <View style={styles.titleBlock}>
          <AppText variant="title">{t.welcome.title}</AppText>
          <AppText tone="textSecondary" style={styles.subtitle} numberOfLines={2}>
            {t.welcome.subtitle}
          </AppText>
        </View>

        <Card style={styles.card}>
          <Segmented<CountryCode>
            label={t.welcome.country}
            options={COUNTRY_CODES.map((code) => ({
              value: code,
              label: `${COUNTRIES[code].flag} ${t.countries[code]}`,
            }))}
            value={prefs.country}
            onChange={selectCountry}
          />
          <Segmented<Language>
            label={t.welcome.language}
            options={[
              { value: 'fr', label: t.languages.fr },
              { value: 'en', label: t.languages.en },
            ]}
            value={prefs.language}
            onChange={(language) => prefs.update({ language })}
          />
          <Segmented<CurrencyCode>
            label={t.welcome.currency}
            options={CURRENCY_OPTIONS}
            value={prefs.currency}
            onChange={(currency) => prefs.update({ currency })}
          />
          <SwitchRow
            label={t.welcome.religious}
            hint={t.welcome.religiousHint}
            value={religious}
            onChange={setReligious}
          />
        </Card>

        <Button
          label={t.welcome.start}
          disabled={!prefs.country}
          onPress={() =>
            prefs.update({ religiousEnabled: religious, onboarded: true, pendingProfileSync: true })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  header: { alignItems: 'center' },
  titleBlock: { alignItems: 'center', gap: Spacing.xs },
  subtitle: { textAlign: 'center', fontSize: 14 },
  card: { gap: Spacing.md },
});
