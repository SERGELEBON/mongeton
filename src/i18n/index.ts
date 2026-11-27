import { useMemo } from 'react';

import { formatMoney, type CurrencyCode, type Language } from '@/domain/currency';
import { usePreferences } from '@/providers/preferences';

import { en } from './en';
import { fr, type Dictionary } from './fr';

export const dictionaries: Record<Language, Dictionary> = { fr, en };

/** Remplace les `{variables}` d'un message traduit. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function useI18n() {
  const { language } = usePreferences();
  return useMemo(
    () => ({
      lang: language,
      t: dictionaries[language],
      fmt: interpolate,
      money: (amount: number, currency: CurrencyCode) => formatMoney(amount, currency, language),
    }),
    [language]
  );
}

export type I18n = ReturnType<typeof useI18n>;
