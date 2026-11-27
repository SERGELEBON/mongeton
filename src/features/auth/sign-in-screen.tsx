import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Logo } from '@/components/logo';
import { AppText, Button, Card, ErrorText, Input, PasswordInput, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { signInWithGoogle } from '@/data/auth';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/providers/preferences';

export function SignInScreen() {
  const { t } = useI18n();
  const c = useTheme();
  const prefs = usePreferences();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setInfo(null);
    if (!email.trim() || password.length < 6) return setError(t.auth.invalid);

    setLoading(true);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            // Le trigger d'inscription crée le profil avec ces choix de l'écran d'ouverture.
            options: {
              data: {
                language: prefs.language,
                currency: prefs.currency,
                religious_enabled: prefs.religiousEnabled,
                country: prefs.country,
              },
            },
          });
    setLoading(false);
    if (error) return setError(error.message);
    // Supabase confirme les emails par défaut : pas de session tant que ce n'est pas fait.
    if (mode === 'signUp' && !data.session) {
      setInfo(t.auth.checkEmail);
      setMode('signIn');
    }
    // Avec une session, la garde du layout bascule automatiquement vers l'accueil.
  }

  async function google() {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGoogleLoading(false);
    }
  }

  const busy = loading || googleLoading;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.lg }}>
        <Logo size="small" />

        <Card style={{ gap: Spacing.md }}>
          <Input
            label={t.auth.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t.auth.emailHint}
          />
          <PasswordInput
            label={t.auth.password}
            showLabel={t.auth.showPassword}
            hideLabel={t.auth.hidePassword}
            value={password}
            onChangeText={setPassword}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            placeholder={t.auth.passwordHint}
            onSubmitEditing={submit}
          />
          <ErrorText error={error} />
          {info ? <AppText tone="income">{info}</AppText> : null}
          <Button
            label={mode === 'signIn' ? t.auth.signIn : t.auth.signUp}
            onPress={submit}
            loading={loading}
            disabled={googleLoading}
          />
          <Button
            variant="outline"
            label={mode === 'signIn' ? t.auth.toSignUp : t.auth.toSignIn}
            onPress={() => {
              setError(null);
              setInfo(null);
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            }}
            disabled={busy}
          />
        </Card>

        <AppText variant="caption" tone="textSecondary" style={{ textAlign: 'center' }}>
          {t.common.or}
        </AppText>
        <Button
          variant="outline"
          tone="text"
          label={t.auth.google}
          icon={<Ionicons name="logo-google" size={18} color={c.text} />}
          onPress={google}
          loading={googleLoading}
          disabled={loading}
        />
      </View>
    </Screen>
  );
}
