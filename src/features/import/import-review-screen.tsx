import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ChipGroup, Loading, Screen } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

import { useImportReviewViewModel, type ReviewRow } from './import-review-view-model';

export function ImportReviewScreen() {
  const { t } = useI18n();
  const c = useTheme();
  const { uiState: s, onEvent } = useImportReviewViewModel();

  if (s.loading) return <Loading />;

  // Import terminé : confirmation puis retour.
  if (s.doneText) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
          <Ionicons name="checkmark-circle" size={56} color={c.income} />
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {s.doneText}
          </AppText>
          <Button label="OK" onPress={() => onEvent({ type: 'Close' })} />
        </Card>
      </Screen>
    );
  }

  if (!s.hasSession || s.empty) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <AppText tone="textSecondary">{s.hasSession ? t.imports.empty : t.imports.noneDetected}</AppText>
        {s.skippedText ? <AppText variant="caption" tone="textSecondary">{s.skippedText}</AppText> : null}
        <Button label="OK" variant="outline" onPress={() => onEvent({ type: 'Close' })} />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ChipGroup
        label={t.imports.account}
        options={s.accountOptions}
        value={s.selectedAccountId}
        onChange={(id) => onEvent({ type: 'AccountSelected', id })}
      />

      <Card style={{ gap: 0, paddingVertical: Spacing.xs }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: s.allSelected }}
          onPress={() => onEvent({ type: 'ToggleAll' })}
          style={styles.selectAll}>
          <Ionicons name={s.allSelected ? 'checkbox' : 'square-outline'} size={22} color={c.primary} />
          <AppText style={{ fontFamily: Fonts.semiBold }}>{t.imports.selectAll}</AppText>
        </Pressable>
        {s.rows.map((row) => (
          <Row key={row.id} row={row} onToggle={() => onEvent({ type: 'Toggle', id: row.id })} />
        ))}
      </Card>

      {s.skippedText ? <AppText variant="caption" tone="textSecondary">{s.skippedText}</AppText> : null}
      {s.error ? <AppText tone="expense" accessibilityRole="alert">{s.error}</AppText> : null}

      <Button
        label={s.importLabel}
        onPress={() => onEvent({ type: 'Import' })}
        loading={s.importing}
        disabled={!s.canImport}
      />
      <Button label={t.imports.ignoreAll} variant="outline" tone="textSecondary" onPress={() => onEvent({ type: 'IgnoreAll' })} />
    </Screen>
  );
}

function Row({ row, onToggle }: { row: ReviewRow; onToggle: () => void }) {
  const { t } = useI18n();
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: row.selected }}
      onPress={onToggle}
      style={[styles.row, { borderTopColor: c.border }]}>
      <Ionicons name={row.selected ? 'checkbox' : 'square-outline'} size={22} color={c.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2} style={{ fontSize: 14 }}>
          {row.description}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="caption" tone="textSecondary">
            {row.dateText}
          </AppText>
          {row.duplicate ? <Badge text={t.imports.duplicate} color={c.accent} /> : null}
          {row.currencyMismatch ? <Badge text={t.imports.otherCurrency} color={c.expense} /> : null}
        </View>
      </View>
      <AppText tone={row.tone} style={{ fontFamily: Fonts.semiBold }}>
        {row.amountText}
      </AppText>
    </Pressable>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <AppText variant="caption" style={{ color, fontSize: 11 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 1 },
});
