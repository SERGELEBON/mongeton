/**
 * Points d'entrée de l'import : bouton « relevé CSV », carte de détection Mobile Money,
 * bandeau « N opérations détectées » sur l'accueil.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

import { openAccessSettings } from '../../../modules/mongeton-notifications';
import { setImportSession } from './import-session';
import { notificationSession, pickStatement, useNotificationDetection } from './import-sources';

function openNotificationReview() {
  setImportSession(notificationSession());
  router.push('/import/review');
}

export function StatementImportButton() {
  const { t, fmt } = useI18n();
  const c = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setBusy(true);
    try {
      const result = await pickStatement();
      if (!result) return;
      if (result.missingColumns.length) {
        return setError(fmt(t.imports.missingColumns, { columns: result.missingColumns.join(', ') }));
      }
      setImportSession({
        source: 'statement',
        candidates: result.candidates,
        skipped: result.skipped,
        unparsedNotificationIds: [],
      });
      router.push('/import/review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: Spacing.xs }}>
      <Button
        label={t.imports.statementButton}
        variant="outline"
        icon={<Ionicons name="document-text-outline" size={18} color={c.primary} />}
        onPress={run}
        loading={busy}
      />
      <AppText variant="caption" tone="textSecondary">
        {t.imports.statementHint}
      </AppText>
      {error ? <AppText tone="expense" accessibilityRole="alert">{error}</AppText> : null}
    </View>
  );
}

export function DetectionCard() {
  const { t, fmt } = useI18n();
  const c = useTheme();
  const d = useNotificationDetection();

  return (
    <Card style={{ gap: Spacing.sm }}>
      <View style={styles.titleRow}>
        <Ionicons name="notifications-outline" size={18} color={c.primary} />
        <AppText variant="heading" style={{ flex: 1 }}>
          {t.imports.detectTitle}
        </AppText>
        {d.available ? (
          <View style={[styles.status, { backgroundColor: d.granted ? c.income : c.border }]}>
            <AppText variant="caption" style={{ color: d.granted ? '#FFFFFF' : c.textSecondary }}>
              {d.granted ? t.imports.detectOn : t.imports.detectOff}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="caption" tone="textSecondary">
        {t.imports.detectHint}
      </AppText>
      {!d.available ? (
        <AppText variant="caption" tone="accent">
          {t.imports.unavailable}
        </AppText>
      ) : (
        <>
          <Button
            label={d.granted ? t.imports.manage : t.imports.enable}
            variant={d.granted ? 'outline' : 'solid'}
            onPress={openAccessSettings}
          />
          {d.granted ? (
            <Button
              label={d.count ? `${t.imports.review} (${d.count})` : t.imports.noneDetected}
              variant="outline"
              disabled={!d.count}
              onPress={openNotificationReview}
            />
          ) : null}
        </>
      )}
      {d.count ? (
        <AppText variant="caption" tone="textSecondary">
          {fmt(t.imports.detected, { count: d.count })}
        </AppText>
      ) : null}
    </Card>
  );
}

/** Bandeau d'accueil, affiché seulement s'il y a des opérations détectées. */
export function DetectedBanner() {
  const { t, fmt } = useI18n();
  const c = useTheme();
  const d = useNotificationDetection();
  if (!d.available || !d.count) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={openNotificationReview}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: c.accentSoft, borderColor: c.accent, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Ionicons name="flash" size={18} color={c.accent} />
      <AppText style={{ flex: 1, fontFamily: Fonts.semiBold, fontSize: 14 }}>
        {fmt(t.imports.detected, { count: d.count })}
      </AppText>
      <AppText tone="accent" style={{ fontFamily: Fonts.semiBold, fontSize: 14 }}>
        {t.imports.review} ›
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  status: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
