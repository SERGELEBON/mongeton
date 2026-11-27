/**
 * Mini design system de Mongeton : composants réutilisables branchés sur
 * la palette du logo (`constants/theme.ts`) et la police Montserrat.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Radius, Spacing, type Palette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = keyof Palette;

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const c = useTheme();
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'amount' | 'overline';

export function AppText({
  tone = 'text',
  variant = 'body',
  style,
  ...rest
}: TextProps & { tone?: Tone; variant?: TextVariant }) {
  const c = useTheme();
  return <Text style={[{ color: c[tone] }, textStyles[variant], style]} {...rest} />;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>
  );
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  variant = 'solid',
  loading = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  variant?: 'solid' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const c = useTheme();
  const solid = variant === 'solid';
  const inactive = disabled || loading;
  const fg = solid ? c.onPrimary : c[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: solid ? c[tone] : 'transparent',
          borderColor: solid ? c[tone] : c.border,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={[textStyles.button, { color: fg }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Input({ label, ...props }: TextInputProps & { label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: Spacing.xs }}>
      <AppText variant="caption" tone="textSecondary">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textSecondary}
        style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.border }]}
        {...props}
      />
    </View>
  );
}

/** Sélecteur sous forme de pastilles (type, compte, catégorie, devise, langue…). */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string; color?: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: Spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? (
        <AppText variant="caption" tone="textSecondary">
          {label}
        </AppText>
      ) : null}
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o.value === value;
          const color = o.color ?? c.primary;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={[
                styles.chip,
                { borderColor: selected ? color : c.border, backgroundColor: selected ? color : c.card },
              ]}>
              <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : c.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Ligne de réglage avec interrupteur. */
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.semiBold }}>{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="textSecondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.primary, false: c.border }}
        thumbColor={value ? c.accent : '#FFFFFF'}
      />
    </View>
  );
}

/**
 * Sélecteur segmenté : toutes les options sur UNE seule ligne, de largeur égale,
 * texte réduit automatiquement si besoin (jamais de retour à la ligne).
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: Spacing.xs }}>
      {label ? (
        <AppText variant="caption" tone="textSecondary">
          {label}
        </AppText>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.segmented, { backgroundColor: c.background, borderColor: c.border }]}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={[styles.segment, selected && { backgroundColor: c.primary }]}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.segmentText, { color: selected ? c.onPrimary : c.text }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Champ mot de passe avec bouton « œil » pour afficher / masquer la saisie. */
export function PasswordInput({
  label,
  showLabel,
  hideLabel,
  ...props
}: TextInputProps & { label: string; showLabel: string; hideLabel: string }) {
  const c = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: Spacing.xs }}>
      <AppText variant="caption" tone="textSecondary">
        {label}
      </AppText>
      <View style={[styles.passwordWrap, { backgroundColor: c.card, borderColor: c.border }]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={c.textSecondary}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.passwordInput, { color: c.text }]}
          {...props}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? hideLabel : showLabel}
          hitSlop={10}
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={c.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

export function Loading() {
  const c = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <ActivityIndicator color={c.primary} size="large" />
    </View>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <AppText tone="expense" accessibilityRole="alert">
      {message}
    </AppText>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  button: {
    minHeight: 50,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: {
    minHeight: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  segmented: { flexDirection: 'row', borderRadius: Radius.full, borderWidth: 1, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segmentText: { fontFamily: Fonts.semiBold, fontSize: 14 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.sm, borderWidth: 1 },
  passwordInput: { flex: 1, minHeight: 48, paddingHorizontal: Spacing.md, fontSize: 16 },
  eye: { paddingHorizontal: Spacing.md, minHeight: 48, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
});

const textStyles = StyleSheet.create({
  title: { fontFamily: Fonts.bold, fontSize: 26, letterSpacing: 0.2 },
  heading: { fontFamily: Fonts.semiBold, fontSize: 17 },
  body: { fontSize: 16 },
  caption: { fontSize: 13, fontWeight: '600' },
  overline: { fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  amount: { fontFamily: Fonts.bold, fontSize: 34, fontVariant: ['tabular-nums'] },
  button: { fontFamily: Fonts.semiBold, fontSize: 16 },
});
