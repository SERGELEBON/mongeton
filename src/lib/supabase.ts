// Doit rester le PREMIER import : installe `localStorage` sur iOS/Android
// (sur le web, le localStorage du navigateur est utilisé).
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Variables manquantes : EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (voir .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE : flux OAuth recommandé pour les apps mobiles et SPA (pas de jeton dans l'URL).
    flowType: 'pkce',
    // Sur le web, Supabase lit lui-même le `?code=` au retour de Google.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Sur mobile, rafraîchir le jeton uniquement quand l'app est au premier plan.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
