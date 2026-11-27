/**
 * Authentification (couche Data) : email/mot de passe et Google OAuth via Supabase.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** Extrait un paramètre de requête sans dépendre de l'implémentation de URL du moteur JS. */
function queryParam(url: string, name: string): string | null {
  const match = url.match(new RegExp(`[?&#]${name}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Connexion Google.
 * - Web : redirection complète vers Google, Supabase échange le code au retour.
 * - Mobile : navigateur intégré, puis échange du code PKCE contre une session.
 * Renvoie `false` si l'utilisateur a annulé.
 */
export async function signInWithGoogle(): Promise<boolean> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
    return true;
  }

  // exp://…/--/auth/callback dans Expo Go, mongeton://auth/callback en build.
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;

  const oauthError = queryParam(result.url, 'error_description');
  if (oauthError) throw new Error(oauthError.replace(/\+/g, ' '));

  const code = queryParam(result.url, 'code');
  if (!code) throw new Error('Réponse Google invalide : code manquant.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error(exchangeError.message);
  return true;
}
