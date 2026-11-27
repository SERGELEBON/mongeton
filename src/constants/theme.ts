/**
 * Design system Mongeton — couleurs issues du logo :
 * vert profond (#164C28), or (#CCB068) et fond crème (#F6F4F0).
 */
export const Brand = {
  green: '#164C28',
  greenLight: '#2E7D4A',
  gold: '#CCB068',
  goldLight: '#E8D28E',
  goldDark: '#A8843A',
  cream: '#F6F4F0',
} as const;

export const Colors = {
  light: {
    text: '#14211A',
    textSecondary: '#5F6B63',
    background: Brand.cream,
    card: '#FFFFFF',
    border: '#E6E1D6',
    primary: Brand.green,
    onPrimary: '#FFFFFF',
    accent: Brand.goldDark,
    accentSoft: '#F3EBD3',
    income: '#2E9E5B',
    expense: '#C8413B',
    transfer: '#3B7DD8',
  },
  dark: {
    text: '#F2EFE8',
    textSecondary: '#A3ADA6',
    background: '#0F1712',
    card: '#18231C',
    border: '#26352B',
    primary: '#4FA36E',
    onPrimary: '#FFFFFF',
    accent: Brand.gold,
    accentSoft: '#2A2717',
    income: '#5CC98A',
    expense: '#EF6B64',
    transfer: '#6FA6EE',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

/** Montserrat (proche de la typographie du logo) pour titres, montants et boutons. */
export const Fonts = {
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const MaxContentWidth = 640;
