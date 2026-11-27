import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { AppText, Card, Loading, Screen } from '@/components/ui';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import type { TransactionType } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { DetectedBanner } from '@/features/import/import-entry';
import { useI18n } from '@/i18n';

import { useHomeViewModel, type GivingViewState, type HomeEvent } from './home-view-model';
import { TransactionRow } from './transaction-row';

type IconName = ComponentProps<typeof Ionicons>['name'];

const QUICK_ACTIONS: { type: TransactionType; icon: IconName; tone: 'expense' | 'income' | 'transfer' }[] = [
  { type: 'expense', icon: 'arrow-up', tone: 'expense' },
  { type: 'income', icon: 'arrow-down', tone: 'income' },
  { type: 'transfer', icon: 'swap-horizontal', tone: 'transfer' },
];

export function HomeScreen() {
  const { uiState: s, onEvent } = useHomeViewModel();
  const { t } = useI18n();
  const c = useTheme();
  if (s.loading) return <Loading />;

  return (
    <Screen>
      <View style={styles.header}>
        <LogoMark size={34} />
        <View style={{ flex: 1 }}>
          <AppText variant="overline" tone="accent">
            Mongeton
          </AppText>
          <AppText variant="heading" numberOfLines={1}>
            {s.greeting}
          </AppText>
        </View>
      </View>

      {/* Carte solde aux couleurs de la marque : fond vert profond, accents dorés. */}
      <View style={[styles.balance, { backgroundColor: Brand.green }]}>
        <View style={styles.balanceRing} pointerEvents="none">
          <LogoMark size={180} />
        </View>
        <AppText variant="overline" style={{ color: Brand.goldLight }}>
          {s.totalLabel}
        </AppText>
        <AppText variant="amount" style={{ color: '#FFFFFF' }} adjustsFontSizeToFit numberOfLines={1}>
          {s.totalText}
        </AppText>
        <View style={styles.monthRow}>
          <MonthStat icon="arrow-down" label={t.home.income} value={s.monthIncomeText} />
          <MonthStat icon="arrow-up" label={t.home.expense} value={s.monthExpenseText} />
        </View>
        <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {t.home.thisMonth}
        </AppText>
      </View>

      <View style={styles.actions}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.type}
            accessibilityRole="button"
            accessibilityLabel={t.types[a.type]}
            onPress={() => onEvent({ type: 'AddTransaction', transactionType: a.type })}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.actionIcon, { backgroundColor: c[a.tone] }]}>
              <Ionicons name={a.icon} size={18} color="#FFFFFF" />
            </View>
            <AppText style={{ fontFamily: Fonts.semiBold, fontSize: 14 }}>{t.types[a.type]}</AppText>
          </Pressable>
        ))}
      </View>

      <DetectedBanner />

      {s.giving ? <GivingCard giving={s.giving} onEvent={onEvent} /> : null}

      {s.error ? (
        <AppText tone="expense" accessibilityRole="alert">
          {s.error}
        </AppText>
      ) : null}

      <Card>
        <AppText variant="heading">{t.home.recent}</AppText>
        {s.rows.length ? (
          s.rows.map((row) => (
            <TransactionRow
              key={row.id}
              row={row}
              onDelete={() => onEvent({ type: 'DeleteTransaction', id: row.id })}
            />
          ))
        ) : (
          <AppText tone="textSecondary">{t.home.empty}</AppText>
        )}
      </Card>
    </Screen>
  );
}

function MonthStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.monthStat}>
      <View style={styles.monthIcon}>
        <Ionicons name={icon} size={14} color={Brand.green} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {label}
        </AppText>
        <AppText style={{ color: '#FFFFFF', fontFamily: Fonts.semiBold }} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function GivingCard({ giving, onEvent }: { giving: GivingViewState; onEvent: (e: HomeEvent) => void }) {
  const { t } = useI18n();
  const c = useTheme();
  return (
    <Card style={{ borderColor: c.accent, gap: Spacing.md }}>
      <View style={styles.givingHeader}>
        <Ionicons name="heart" size={18} color={c.accent} />
        <AppText variant="heading">{t.giving.title}</AppText>
      </View>

      <View style={styles.givingItems}>
        {giving.items.map((item) => (
          <View key={item.key} style={[styles.givingItem, { backgroundColor: c.accentSoft }]}>
            <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
              {item.label}
            </AppText>
            <AppText style={{ fontFamily: Fonts.semiBold }} numberOfLines={1} adjustsFontSizeToFit>
              {item.amountText}
            </AppText>
            {item.categoryId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t.giving.give} — ${item.label}`}
                hitSlop={6}
                onPress={() =>
                  onEvent({ type: 'AddTransaction', transactionType: 'expense', categoryId: item.categoryId! })
                }>
                <AppText variant="caption" tone="accent">
                  + {t.giving.give}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={{ gap: Spacing.xs }}>
        <AppText variant="caption" tone="textSecondary">
          {giving.titheTargetText}
        </AppText>
        <View
          style={[styles.progressTrack, { backgroundColor: c.accentSoft }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(giving.titheProgress * 100) }}>
          <View style={[styles.progressFill, { width: `${giving.titheProgress * 100}%`, backgroundColor: c.accent }]} />
        </View>
        <AppText variant="caption" tone={giving.titheDone ? 'income' : 'text'}>
          {giving.titheStatusText}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  balance: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, overflow: 'hidden' },
  balanceRing: { position: 'absolute', right: -50, top: -50, opacity: 0.35 },
  monthRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  monthStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  monthIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Brand.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  givingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  givingItems: { flexDirection: 'row', gap: Spacing.sm },
  givingItem: { flex: 1, borderRadius: Radius.sm, padding: Spacing.sm, gap: 2 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
});
