/**
 * Logo Mongeton en vectoriel (net à toutes les tailles, aucun PNG à charger) :
 * anneau doré en dégradé + wordmark vert + slogan traduit.
 */
import { memo, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Brand, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/i18n';

export const LogoMark = memo(function LogoMark({ size = 64 }: { size?: number }) {
  const gradientId = `gold-${useId().replace(/:/g, '')}`;
  const stroke = size * 0.085;
  const r = (size - stroke) / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden>
      <Defs>
        {/* Clair en haut à droite, plus sombre en bas à gauche, comme le logo. */}
        <LinearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Brand.goldLight} />
          <Stop offset="0.5" stopColor={Brand.gold} />
          <Stop offset="1" stopColor={Brand.goldDark} />
        </LinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${gradientId})`} strokeWidth={stroke} fill="none" />
    </Svg>
  );
});

export function Logo({ size = 'large', showTagline = true }: { size?: 'large' | 'small'; showTagline?: boolean }) {
  const { t } = useI18n();
  const dark = useColorScheme() === 'dark';
  const large = size === 'large';
  const green = dark ? '#7CC496' : Brand.green;
  return (
    <View style={styles.wrap} accessible accessibilityRole="image" accessibilityLabel={`Mongeton — ${t.brand.tagline}`}>
      <LogoMark size={large ? 96 : 40} />
      <Text style={[styles.word, { color: green, fontSize: large ? 34 : 18, letterSpacing: large ? 4 : 2 }]}>
        MONGETON
      </Text>
      {showTagline ? (
        <Text style={[styles.tagline, { color: green, fontSize: large ? 11 : 9 }]}>
          {t.brand.tagline.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  word: { fontFamily: Fonts.semiBold, marginTop: 6 },
  tagline: { fontFamily: Fonts.semiBold, letterSpacing: 1.8, marginTop: -4 },
});
