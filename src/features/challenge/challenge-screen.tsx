import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Loading, Screen } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

import { useChallengeViewModel, type ChallengeCardState, type ChallengeEvent } from './challenge-view-model';

export function ChallengeScreen() {
  const { t } = useI18n();
  const c = useTheme();
  const { uiState: s, onEvent } = useChallengeViewModel();
  if (s.loading) return <Loading />;

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <AppText variant="title">{t.challenge.title}</AppText>
        <AppText tone="textSecondary">{t.challenge.subtitle}</AppText>
      </View>

      {/* Messages d'alerte dans l'app */}
      {s.alertMessages.length ? (
        <Card style={{ borderColor: c.expense, gap: Spacing.sm }}>
          {s.alertMessages.map((a) => (
            <View key={a.id} style={styles.alertRow}>
              <Ionicons name={a.level === 'exceeded' ? 'alert-circle' : 'warning'} size={20} color={c.expense} />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontFamily: Fonts.semiBold }}>{a.title}</AppText>
                <AppText variant="caption" tone="textSecondary">
                  {a.body}
                </AppText>
              </View>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => onEvent({ type: 'DismissAlerts' })} hitSlop={8}>
            <AppText variant="caption" tone="primary" style={{ textAlign: 'right' }}>
              OK
            </AppText>
          </Pressable>
        </Card>
      ) : null}

      {s.showNotificationHint ? (
        <Card style={{ borderColor: c.accent }}>
          <AppText variant="caption" tone="textSecondary">
            {t.challenge.notificationsOff}
          </AppText>
          <Button
            label={t.challenge.enableNotifications}
            variant="outline"
            icon={<Ionicons name="notifications-outline" size={18} color={c.primary} />}
            onPress={() => onEvent({ type: 'EnableNotifications' })}
          />
        </Card>
      ) : null}

      {s.cards.length ? (
        s.cards.map((card) => <ChallengeCard key={card.id} card={card} onEvent={onEvent} />)
      ) : (
        <Card style={styles.empty}>
          <Ionicons name="trophy-outline" size={44} color={c.accent} />
          <AppText tone="textSecondary" style={{ textAlign: 'center' }}>
            {t.challenge.empty}
          </AppText>
        </Card>
      )}

      {s.error ? <AppText tone="expense">{s.error}</AppText> : null}

      <Button
        label={t.challenge.new}
        icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
        onPress={() => onEvent({ type: 'New' })}
      />
    </Screen>
  );
}

function ChallengeCard({ card, onEvent }: { card: ChallengeCardState; onEvent: (e: ChallengeEvent) => void }) {
  const { t } = useI18n();
  const c = useTheme();
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const color = !card.active ? c.textSecondary : card.status === 'ok' ? c.income : card.status === 'warning' ? c.accent : c.expense;

  return (
    <Card style={{ gap: Spacing.sm, opacity: card.active ? 1 : 0.7 }}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" numberOfLines={1}>
            {card.name}
          </AppText>
          <AppText variant="caption" tone="textSecondary">
            {card.periodLabel} · {card.scopeLabel}
          </AppText>
        </View>
        <AppText style={{ fontFamily: Fonts.bold, fontSize: 20, color }}>{card.percentText}</AppText>
      </View>

      <View
        style={[styles.track, { backgroundColor: c.border }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(card.progress * 100) }}>
        <View style={[styles.fill, { width: `${card.progress * 100}%`, backgroundColor: color }]} />
        {/* Repère du seuil d'alerte à 80 % */}
        <View style={[styles.marker, { left: '80%', backgroundColor: c.text }]} />
      </View>

      <View style={styles.row}>
        <AppText variant="caption">{card.spentOfText}</AppText>
        <AppText variant="caption" style={{ fontFamily: Fonts.semiBold, color }}>
          {card.remainingText}
        </AppText>
      </View>

      <View style={[styles.status, { backgroundColor: c.background }]}>
        <Ionicons
          name={card.status === 'ok' ? 'checkmark-circle' : card.status === 'warning' ? 'warning' : 'alert-circle'}
          size={16}
          color={color}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" style={{ color }}>
            {card.statusText}
          </AppText>
          {card.perDayText ? <AppText variant="caption" tone="textSecondary">{card.perDayText}</AppText> : null}
          {card.projectionText ? <AppText variant="caption" tone="expense">{card.projectionText}</AppText> : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onEvent({ type: 'Toggle', id: card.id, active: !card.active })}>
          <AppText variant="caption" tone="primary">
            {card.active ? t.challenge.pause : t.challenge.resume}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => (confirming ? onEvent({ type: 'Delete', id: card.id }) : setConfirming(true))}>
          <AppText variant="caption" tone={confirming ? 'expense' : 'textSecondary'}>
            {confirming ? t.common.confirm : t.challenge.delete}
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  alertRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  marker: { position: 'absolute', width: 2, top: 0, bottom: 0, opacity: 0.35 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.xs },
});
