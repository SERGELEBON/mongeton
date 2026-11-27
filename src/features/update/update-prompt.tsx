/**
 * Vérifie au lancement (Android uniquement) s'il existe une Release GitHub plus récente
 * que l'APK installé, et propose de la télécharger. « Plus tard » masque cette version-là.
 */
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { pickUpdate, type AvailableUpdate } from '@/domain/app-update';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const LATEST_RELEASE = 'https://api.github.com/repos/SERGELEBON/mongeton/releases/latest';
const SKIP_KEY = 'mongeton.update.skipped';

function skippedVersion(): string | null {
  try {
    return localStorage.getItem(SKIP_KEY);
  } catch {
    return null;
  }
}

export function UpdatePrompt() {
  const { t } = useI18n();
  const c = useTheme();
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);

  useEffect(() => {
    // En développement (Expo Go / Metro), pas de vérification : seul l'APK publié compte.
    if (Platform.OS !== 'android' || __DEV__) return;
    const current = Constants.expoConfig?.version;
    if (!current) return;
    let cancelled = false;
    fetch(LATEST_RELEASE, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((release) => {
        if (cancelled || !release) return;
        const found = pickUpdate(release, current);
        if (found && found.version !== skippedVersion()) setUpdate(found);
      })
      .catch(() => {
        // Hors ligne ou GitHub indisponible : on réessaiera au prochain lancement.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  const later = () => {
    try {
      localStorage.setItem(SKIP_KEY, update.version);
    } catch {}
    setUpdate(null);
  };
  const install = () => {
    Linking.openURL(update.apkUrl).catch(() => Linking.openURL(update.pageUrl));
    setUpdate(null);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={later}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.icon, { backgroundColor: c.primary }]}>
            <Ionicons name="cloud-download-outline" size={26} color={c.onPrimary} />
          </View>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {t.update.title}
          </AppText>
          <AppText variant="body" tone="textSecondary" style={{ textAlign: 'center' }}>
            {t.update.body.replace('{version}', update.version)}
          </AppText>
          <AppText variant="caption" tone="textSecondary" style={{ textAlign: 'center' }}>
            {t.update.hint}
          </AppText>
          <View style={{ alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <Button label={t.update.install} onPress={install} />
            <Button label={t.update.later} variant="outline" tone="textSecondary" onPress={later} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
});
