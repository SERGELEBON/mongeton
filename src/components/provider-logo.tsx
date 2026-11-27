/**
 * Logo d'un moyen de paiement (Mobile Money, Visa) ou icône pour banque / espèces.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';
import type { ProviderId } from '@/domain/countries';

const LOGOS: Partial<Record<ProviderId, number>> = {
  mtn_momo: require('@/assets/providers/mtn-momo.png'),
  telecel_cash: require('@/assets/providers/telecel-cash.png'),
  orange_money: require('@/assets/providers/orange-money.png'),
  moov_money: require('@/assets/providers/moov-money.png'),
  wave: require('@/assets/providers/wave.png'),
  visa: require('@/assets/providers/visa.png'),
};

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  cash: 'Cash',
  bank: 'Bank',
  visa: 'Visa',
  mtn_momo: 'MTN MoMo',
  telecel_cash: 'Telecel Cash',
  orange_money: 'Orange Money',
  moov_money: 'Moov Money',
  wave: 'Wave',
};

/** Couleur de marque utilisée comme couleur du compte. */
export const PROVIDER_COLORS: Record<ProviderId, string> = {
  cash: Brand.green,
  bank: '#3B5B7A',
  visa: '#1A5BC4',
  mtn_momo: '#E6B800',
  telecel_cash: '#E1251B',
  orange_money: '#FF7900',
  moov_money: '#F07E1A',
  wave: '#1DC3EE',
};

export const ProviderLogo = memo(function ProviderLogo({
  provider,
  size = 40,
}: {
  provider: ProviderId;
  size?: number;
}) {
  const logo = LOGOS[provider];
  const radius = size * 0.24;
  if (logo) {
    return (
      <Image
        source={logo}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Ionicons name={provider === 'bank' ? 'business' : 'cash'} size={size * 0.5} color="#FFFFFF" />
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: { backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
});
