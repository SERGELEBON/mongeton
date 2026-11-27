/**
 * Pays pris en charge : chaque pays fixe ses valeurs par défaut (devise, langue)
 * et la liste des moyens de paiement proposés (Mobile Money locaux en tête).
 */
import type { CurrencyCode, Language } from './currency';

export type CountryCode = 'CI' | 'GH' | 'OTHER';

export type ProviderId =
  | 'cash'
  | 'bank'
  | 'visa'
  | 'mtn_momo'
  | 'telecel_cash'
  | 'orange_money'
  | 'moov_money'
  | 'wave';

export type ProviderKind = 'mobile_money' | 'card' | 'bank' | 'cash';

export const PROVIDER_KIND: Record<ProviderId, ProviderKind> = {
  cash: 'cash',
  bank: 'bank',
  visa: 'card',
  mtn_momo: 'mobile_money',
  telecel_cash: 'mobile_money',
  orange_money: 'mobile_money',
  moov_money: 'mobile_money',
  wave: 'mobile_money',
};

type CountryInfo = {
  code: CountryCode;
  flag: string;
  currency: CurrencyCode;
  language: Language;
  /** Moyens de paiement proposés, dans l'ordre d'affichage. */
  providers: ProviderId[];
};

export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  CI: {
    code: 'CI',
    flag: '🇨🇮',
    currency: 'XOF',
    language: 'fr',
    providers: ['orange_money', 'mtn_momo', 'moov_money', 'wave', 'visa', 'bank', 'cash'],
  },
  GH: {
    code: 'GH',
    flag: '🇬🇭',
    currency: 'GHS',
    language: 'en',
    providers: ['mtn_momo', 'telecel_cash', 'visa', 'bank', 'cash'],
  },
  OTHER: {
    code: 'OTHER',
    flag: '🌍',
    currency: 'XOF',
    language: 'fr',
    providers: ['visa', 'bank', 'cash'],
  },
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

export function providersFor(country: CountryCode | null | undefined): ProviderId[] {
  return COUNTRIES[country ?? 'OTHER'].providers;
}

/** Pays déduit de la région du téléphone (CI / GH), sinon null. */
export function countryFromRegion(region: string | null | undefined): CountryCode | null {
  return region === 'CI' || region === 'GH' ? region : null;
}
