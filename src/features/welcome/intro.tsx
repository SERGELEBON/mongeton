/**
 * Écran d'introduction : uniquement le logo, animé, pendant 5 secondes.
 * L'anneau apparaît, puis le nom, puis le slogan ; fondu de sortie à la fin.
 */
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { Brand, Fonts } from '@/constants/theme';
import { useI18n } from '@/i18n';

export const INTRO_DURATION_MS = 5000;
const FADE_OUT_MS = 450;

export function Intro({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const ring = useState(() => new Animated.Value(0))[0];
  const word = useState(() => new Animated.Value(0))[0];
  const tagline = useState(() => new Animated.Value(0))[0];
  const exit = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const entrance = Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 900, easing: ease, useNativeDriver: true }),
      Animated.timing(word, { toValue: 1, duration: 700, easing: ease, useNativeDriver: true }),
      Animated.timing(tagline, { toValue: 1, duration: 600, easing: ease, useNativeDriver: true }),
    ]);
    entrance.start();
    const timer = setTimeout(() => {
      Animated.timing(exit, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }).start(() => onDone());
    }, INTRO_DURATION_MS - FADE_OUT_MS);
    return () => {
      clearTimeout(timer);
      entrance.stop();
    };
  }, [ring, word, tagline, exit, onDone]);

  const rise = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  });

  return (
    <Animated.View
      style={[styles.root, { opacity: exit }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Mongeton — ${t.brand.tagline}`}>
      <Animated.View
        style={{
          opacity: ring,
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }}>
        <LogoMark size={128} />
      </Animated.View>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 28 }}>
        <Animated.Text style={[styles.word, rise(word)]}>MONGETON</Animated.Text>
        <Animated.Text style={[styles.tagline, rise(tagline)]}>{t.brand.tagline.toUpperCase()}</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.cream },
  word: { fontFamily: Fonts.semiBold, fontSize: 36, letterSpacing: 5, color: Brand.green },
  tagline: { fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 2, color: Brand.green },
});
