/**
 * Liaison du compte Telegram : l'app demande un code à usage unique, ouvre le bot
 * Mongeton avec ce code, puis le webhook relie le chat au profil.
 */
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ErrorText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { keys, useProfile } from '@/data/hooks';
import { createTelegramLinkCode, unlinkTelegram } from '@/data/repository';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/** Nom public du bot (ex. MongetonAlertesBot), sans @. Absent = carte masquée. */
const BOT = process.env.EXPO_PUBLIC_TELEGRAM_BOT;
const TELEGRAM_BLUE = '#229ED9';

export function TelegramCard() {
  const { t } = useI18n();
  const c = useTheme();
  const qc = useQueryClient();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const linked = !!profile.data?.telegram_chat_id;

  // Au retour de Telegram, on relit le profil pour afficher « Relié ».
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') qc.invalidateQueries({ queryKey: keys.profile });
    });
    return () => sub.remove();
  }, [qc]);

  if (!BOT) return null;

  async function link() {
    setError(null);
    setBusy(true);
    try {
      const code = await createTelegramLinkCode();
      await Linking.openURL(`https://t.me/${BOT}?start=${code}`);
      setWaiting(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setError(null);
    setBusy(true);
    try {
      await unlinkTelegram();
      await qc.invalidateQueries({ queryKey: keys.profile });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: Spacing.sm }}>
      <View style={styles.header}>
        <Ionicons name="paper-plane" size={18} color={TELEGRAM_BLUE} />
        <AppText variant="heading" style={{ flex: 1 }}>
          {t.telegram.title}
        </AppText>
        <View style={[styles.status, { backgroundColor: linked ? c.income : c.border }]}>
          <AppText variant="caption" style={{ color: linked ? '#FFFFFF' : c.textSecondary }}>
            {linked ? t.telegram.linked : t.telegram.notLinked}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" tone="textSecondary">
        {t.telegram.hint}
      </AppText>
      {waiting && !linked ? (
        <AppText variant="caption" tone="accent">
          {t.telegram.waiting}
        </AppText>
      ) : null}
      <ErrorText error={error} />
      {linked ? (
        <Button label={t.telegram.unlink} variant="outline" tone="textSecondary" onPress={unlink} loading={busy} />
      ) : (
        <Button
          label={t.telegram.link}
          icon={<Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />}
          onPress={link}
          loading={busy}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  status: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
});
