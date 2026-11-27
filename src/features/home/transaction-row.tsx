import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

import type { TransactionRowViewState } from './transaction-view-state';

/** Composant « bête » : n'affiche que le view-state déjà formaté. Mémoïsé pour les longues listes. */
export const TransactionRow = memo(function TransactionRow({
  row,
  onDelete,
}: {
  row: TransactionRowViewState;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const c = useTheme();
  // Suppression en deux temps (Alert.alert ne fonctionne pas sur le web).
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: row.dotColor }]} />
      <View style={{ flex: 1 }}>
        <AppText numberOfLines={1} style={{ fontFamily: Fonts.semiBold, fontSize: 15 }}>
          {row.title}
        </AppText>
        <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
          {row.subtitle}
        </AppText>
      </View>
      <AppText tone={row.tone} style={{ fontFamily: Fonts.semiBold, fontVariant: ['tabular-nums'] }}>
        {row.amountText}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={confirming ? t.common.confirm : t.common.delete}
        hitSlop={10}
        onPress={() => (confirming ? onDelete() : setConfirming(true))}>
        {confirming ? (
          <AppText tone="expense" variant="caption">
            {t.common.confirm}
          </AppText>
        ) : (
          <Ionicons name="trash-outline" size={18} color={c.textSecondary} />
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
