import {
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';

import { Colors, Fonts } from '@/constants/theme';
import { ChallengeEngine } from '@/features/challenge/challenge-engine';
import { UpdatePrompt } from '@/features/update/update-prompt';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/i18n';
import { AuthProvider, useAuth } from '@/providers/auth';
import { PreferencesProvider, usePreferences } from '@/providers/preferences';
import { ProfileSync } from '@/providers/profile-sync';

SplashScreen.preventAutoHideAsync();

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, loading } = useAuth();
  const { onboarded } = usePreferences();
  const { t } = useI18n();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const ready = fontsReady && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const modal = (title: string) =>
    ({ presentation: 'modal', headerShown: true, title }) as const;

  return (
    <>
      <ProfileSync />
      {session ? <ChallengeEngine /> : null}
      <UpdatePrompt />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.primary,
          headerTitleStyle: { fontFamily: Fonts.semiBold, color: c.text },
          contentStyle: { backgroundColor: c.background },
        }}>
        {/* 1. Écran d'ouverture : langue, devise, option religieuse. */}
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        {/* 2. Connexion / inscription. */}
        <Stack.Protected guard={onboarded && !session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        {/* 3. Application. */}
        <Stack.Protected guard={onboarded && !!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transaction/new" options={modal(t.transaction.title)} />
          <Stack.Screen name="account/new" options={modal(t.accounts.newTitle)} />
          <Stack.Screen name="import/review" options={modal(t.imports.title)} />
          <Stack.Screen name="challenge/new" options={modal(t.challenge.new)} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [fontsLoaded, fontError] = useFonts({ Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold });
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })
  );

  // Thème de navigation aux couleurs de la marque (fond crème / vert profond).
  const navTheme: Theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const c = Colors[scheme];
    return {
      ...base,
      colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border },
    };
  }, [scheme]);

  return (
    <PreferencesProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            {/* Si la police échoue, on continue avec la police système plutôt que de bloquer. */}
            <RootNavigator fontsReady={fontsLoaded || !!fontError} />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PreferencesProvider>
  );
}
