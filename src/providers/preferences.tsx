/**
 * Préférences locales (avant même la connexion) : langue, devise, option religieuse,
 * onboarding terminé. Stockées de façon synchrone dans `localStorage`
 * (expo-sqlite sur mobile, navigateur sur le web) : aucun clignotement au démarrage.
 */
import 'expo-sqlite/localStorage/install';

import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { COUNTRIES, countryFromRegion, type CountryCode } from '@/domain/countries';
import { DEFAULT_CURRENCY, type CurrencyCode, type Language } from '@/domain/currency';

export type Preferences = {
  country: CountryCode | null;
  language: Language;
  currency: CurrencyCode;
  religiousEnabled: boolean;
  onboarded: boolean;
  /** Choix faits à l'accueil, à recopier dans le profil Supabase à la première connexion. */
  pendingProfileSync: boolean;
};

const STORAGE_KEY = 'mongeton.preferences.v1';

function deviceLocale(): { language: Language; country: CountryCode | null } {
  try {
    const locale = getLocales()[0];
    const country = countryFromRegion(locale?.regionCode);
    // Un pays reconnu impose sa langue par défaut (Ghana -> anglais, Côte d'Ivoire -> français).
    const language: Language = country ? COUNTRIES[country].language : locale?.languageCode === 'en' ? 'en' : 'fr';
    return { language, country };
  } catch {
    return { language: 'fr', country: null };
  }
}

function load(): Preferences {
  const device = deviceLocale();
  const defaults: Preferences = {
    country: device.country,
    language: device.language,
    currency: device.country ? COUNTRIES[device.country].currency : DEFAULT_CURRENCY,
    religiousEnabled: false,
    onboarded: false,
    pendingProfileSync: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Preferences>) } : defaults;
  } catch {
    return defaults;
  }
}

type PreferencesContextValue = Preferences & {
  update: (patch: Partial<Preferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Stockage indisponible : les préférences restent valables pour la session.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...prefs, update }), [prefs, update]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences doit être utilisé dans <PreferencesProvider>');
  return ctx;
}
