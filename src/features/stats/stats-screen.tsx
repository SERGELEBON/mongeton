import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { BarChart, DonutChart, LineChart } from '@/components/charts';
import { AppText, Card, Loading, Screen, Segmented } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import type { Period } from '@/domain/periods';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

import { useStatsViewModel, type ChartKind } from './stats-view-model';

export function StatsScreen() {
  const { t } = useI18n();
  const c = useTheme();
  const { uiState: s, onEvent } = useStatsViewModel();

  if (s.loading) return <Loading />;

  return (
    <Screen>
      <AppText variant="title">{t.stats.title}</AppText>

      <Segmented<Period>
        options={[
          { value: 'week', label: t.periods.week },
          { value: 'month', label: t.periods.month },
          { value: 'quarter', label: t.periods.quarter },
        ]}
        value={s.period}
        onChange={(period) => onEvent({ type: 'PeriodChanged', period })}
      />

      {/* Résumé chiffré de la période */}
      <View style={styles.kpis}>
        <Kpi icon="arrow-down" tone="income" label={t.stats.income} value={s.incomeText} />
        <Kpi icon="arrow-up" tone="expense" label={t.stats.expense} value={s.expenseText} />
        <Kpi icon="wallet" tone={s.netNegative ? 'expense' : 'primary'} label={t.stats.net} value={s.netText} />
      </View>
      {s.changeText ? (
        <AppText variant="caption" tone={s.changeIsBad ? 'expense' : 'income'} style={{ textAlign: 'center' }}>
          {s.changeText}
        </AppText>
      ) : null}

      <Segmented<ChartKind>
        options={[
          { value: 'bars', label: t.stats.bars },
          { value: 'line', label: t.stats.line },
          { value: 'categories', label: t.stats.categories },
        ]}
        value={s.chart}
        onChange={(chart) => onEvent({ type: 'ChartChanged', chart })}
      />

      <Card style={{ gap: Spacing.md }}>
        {s.empty ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={40} color={c.textSecondary} />
            <AppText tone="textSecondary" style={{ textAlign: 'center' }}>
              {t.stats.empty}
            </AppText>
          </View>
        ) : s.chart === 'bars' ? (
          <>
            <AppText variant="heading">{t.stats.barsTitle}</AppText>
            <BarChart data={s.bars} accessibilityLabel={`${t.stats.barsTitle} : ${s.incomeText}, ${s.expenseText}`} />
            <View style={styles.legend}>
              <Legend color={c.income} label={t.stats.legendIncome} />
              <Legend color={c.expense} label={t.stats.legendExpense} />
            </View>
          </>
        ) : s.chart === 'line' ? (
          <>
            <AppText variant="heading">{t.stats.lineTitle}</AppText>
            <LineChart data={s.line} accessibilityLabel={`${t.stats.lineTitle} : ${s.netText}`} />
          </>
        ) : (
          <>
            <AppText variant="heading">{t.stats.categoriesTitle}</AppText>
            <DonutChart slices={s.slices} centerLabel={t.stats.totalSpent} centerValue={s.totalSpentText} />
          </>
        )}
      </Card>

      {s.error ? <AppText tone="expense">{s.error}</AppText> : null}
    </Screen>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
}: {
  icon: 'arrow-down' | 'arrow-up' | 'wallet';
  tone: 'income' | 'expense' | 'primary';
  label: string;
  value: string;
}) {
  const c = useTheme();
  return (
    <View style={[styles.kpi, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.kpiIcon, { backgroundColor: c[tone] }]}>
        <Ionicons name={icon} size={14} color="#FFFFFF" />
      </View>
      <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
      <AppText style={{ fontFamily: Fonts.bold, fontSize: 15 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="caption" tone="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', gap: Spacing.sm },
  kpi: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, gap: 4 },
  kpiIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
