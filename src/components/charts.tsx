/**
 * Graphiques SVG légers (sans dépendance lourde) aux couleurs de Mongeton :
 * histogramme revenus/dépenses, courbe du solde cumulé, anneau par catégorie.
 */
import { memo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };

function useWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  return { width, onLayout };
}

/** N'affiche qu'environ 6 étiquettes sur l'axe pour rester lisible. */
const showLabel = (i: number, count: number) => count <= 7 || i % Math.ceil(count / 6) === 0 || i === count - 1;

export type BarDatum = { label: string; income: number; expense: number };

export const BarChart = memo(function BarChart({ data, accessibilityLabel }: { data: BarDatum[]; accessibilityLabel: string }) {
  const c = useTheme();
  const { width, onLayout } = useWidth();
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = data.length ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(14, slot * 0.36));

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke={c.border} />
          {data.map((d, i) => {
            const x = PAD.left + i * slot + slot / 2;
            const hi = (d.income / max) * innerH;
            const he = (d.expense / max) * innerH;
            return (
              <G key={i}>
                {d.income > 0 && (
                  <Rect x={x - barW - 1} y={PAD.top + innerH - hi} width={barW} height={hi} rx={barW / 3} fill={c.income} />
                )}
                {d.expense > 0 && (
                  <Rect x={x + 1} y={PAD.top + innerH - he} width={barW} height={he} rx={barW / 3} fill={c.expense} />
                )}
                {showLabel(i, data.length) && (
                  <SvgText x={x} y={HEIGHT - 6} fontSize={10} fill={c.textSecondary} textAnchor="middle">
                    {d.label}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
});

export type LineDatum = { label: string; value: number };

export const LineChart = memo(function LineChart({ data, accessibilityLabel }: { data: LineDatum[]; accessibilityLabel: string }) {
  const c = useTheme();
  const { width, onLayout } = useWidth();
  const values = data.map((d) => d.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - ((v - min) / span) * innerH;
  const zeroY = y(0);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = data.length ? `${line} L${x(data.length - 1).toFixed(1)},${zeroY} L${x(0).toFixed(1)},${zeroY} Z` : '';
  const positive = (values.at(-1) ?? 0) >= 0;
  const stroke = positive ? c.primary : c.expense;

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {width > 0 && data.length > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Line x1={PAD.left} x2={width - PAD.right} y1={zeroY} y2={zeroY} stroke={c.border} strokeDasharray="4 4" />
          <Path d={area} fill="url(#area)" />
          <Path d={line} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={x(data.length - 1)} cy={y(values.at(-1) ?? 0)} r={4.5} fill={c.accent} stroke={c.card} strokeWidth={2} />
          {data.map((d, i) =>
            showLabel(i, data.length) ? (
              <SvgText key={i} x={x(i)} y={HEIGHT - 6} fontSize={10} fill={c.textSecondary} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null
          )}
        </Svg>
      )}
    </View>
  );
});

export type DonutSlice = { label: string; value: number; color: string; share: number; amountText: string };

export const DonutChart = memo(function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const c = useTheme();
  const size = 180;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // Position de départ de chaque segment, calculée sans mutation pendant le rendu.
  const arcs = slices.map((s, i) => ({
    slice: s,
    length: s.share * circumference,
    offset: slices.slice(0, i).reduce((sum, prev) => sum + prev.share * circumference, 0),
  }));

  return (
    <View style={styles.donutWrap}>
      <View accessible accessibilityRole="image" accessibilityLabel={`${centerLabel} ${centerValue}`}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            {arcs.map(({ slice, length, offset }, i) => (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={slice.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
                strokeDashoffset={-offset}
              />
            ))}
          </G>
          <SvgText x={size / 2} y={size / 2 - 4} fontSize={11} fill={c.textSecondary} textAnchor="middle">
            {centerLabel}
          </SvgText>
          <SvgText x={size / 2} y={size / 2 + 16} fontSize={15} fontFamily={Fonts.bold} fill={c.text} textAnchor="middle">
            {centerValue}
          </SvgText>
        </Svg>
      </View>
      <View style={styles.legend}>
        {slices.slice(0, 6).map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <AppText style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
              {s.label}
            </AppText>
            <AppText variant="caption" tone="textSecondary">
              {Math.round(s.share * 100)} %
            </AppText>
            <AppText style={{ fontFamily: Fonts.semiBold, fontSize: 14, minWidth: 90, textAlign: 'right' }}>
              {s.amountText}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  donutWrap: { alignItems: 'center', gap: Spacing.md },
  legend: { alignSelf: 'stretch', gap: Spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
