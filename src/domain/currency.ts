/**
 * Devises supportées et règles de formatage / conversion.
 * FCFA (XOF) est la devise par défaut.
 */
export type CurrencyCode = 'XOF' | 'GHS' | 'USD' | 'EUR';
export type Language = 'fr' | 'en';

export const DEFAULT_CURRENCY: CurrencyCode = 'XOF';

type CurrencyInfo = {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
  /** Position du symbole selon la langue (usage typographique local). */
  position: Record<Language, 'before' | 'after'>;
};

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  XOF: { code: 'XOF', symbol: 'FCFA', decimals: 0, position: { fr: 'after', en: 'after' } },
  GHS: { code: 'GHS', symbol: 'GH₵', decimals: 2, position: { fr: 'before', en: 'before' } },
  USD: { code: 'USD', symbol: '$', decimals: 2, position: { fr: 'after', en: 'before' } },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, position: { fr: 'after', en: 'before' } },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

const NNBSP = ' ';

/**
 * Formatage manuel (indépendant du support Intl du moteur JS) :
 *   fr : "1 250 000 FCFA", "12,50 €", "GH₵ 12,50"
 *   en : "1,250,000 FCFA", "€12.50", "GH₵ 12.50"
 */
export function formatMoney(amount: number, currency: CurrencyCode, lang: Language = 'fr'): string {
  const { symbol, decimals, position } = CURRENCIES[currency];
  const sign = amount < 0 ? '-' : '';
  const [int, dec] = Math.abs(amount).toFixed(decimals).split('.');
  const groupSep = lang === 'fr' ? NNBSP : ',';
  const decimalSep = lang === 'fr' ? ',' : '.';
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
  const number = dec ? `${grouped}${decimalSep}${dec}` : grouped;
  if (position[lang] === 'after') return `${sign}${number} ${symbol}`;
  // Symboles alphabétiques (GH₵) séparés par une espace, symboles courts ($, €) collés en anglais.
  const glue = symbol.length > 1 || lang === 'fr' ? ' ' : '';
  return `${sign}${symbol}${glue}${number}`;
}

/** "1 500,50" | "1500.5" | "1,500" (en) -> nombre ; null si invalide ou <= 0. */
export function parseAmount(input: string): number | null {
  let s = input.replace(/[\s ]/g, '');
  // "1,500.50" (en) : la virgule est un séparateur de milliers.
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  s = s.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const value = Number(s);
  return value > 0 ? value : null;
}

/** Taux = unités de la devise pour 1 USD. */
export type Rates = Record<CurrencyCode, number>;

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: Rates): number {
  if (from === to) return amount;
  return (amount / rates[from]) * rates[to];
}

/** Arrondi au nombre de décimales de la devise (ex. 0 pour le FCFA). */
export function roundFor(amount: number, currency: CurrencyCode): number {
  const factor = 10 ** CURRENCIES[currency].decimals;
  return Math.round(amount * factor) / factor;
}
