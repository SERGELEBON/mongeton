/**
 * Garde les préférences locales et le profil Supabase alignés :
 * - première connexion après l'accueil : on pousse les choix de l'accueil vers le profil ;
 * - sinon (ex. nouvel appareil) : on adopte la langue et l'option religieuse du profil.
 */
import { useEffect, useRef } from 'react';

import { useProfile, useUpdateProfile } from '@/data/hooks';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';

export function ProfileSync() {
  const { session } = useAuth();
  const prefs = usePreferences();
  const profile = useProfile({ enabled: !!session });
  const updateProfile = useUpdateProfile();
  const done = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !profile.data || done.current === userId) return;
    done.current = userId;

    if (prefs.pendingProfileSync) {
      updateProfile.mutate({
        language: prefs.language,
        base_currency: prefs.currency,
        religious_enabled: prefs.religiousEnabled,
        country: prefs.country,
      });
      prefs.update({ pendingProfileSync: false });
    } else {
      prefs.update({
        language: profile.data.language,
        religiousEnabled: profile.data.religious_enabled,
        currency: profile.data.base_currency,
        country: profile.data.country,
      });
    }
  }, [session?.user.id, profile.data, prefs, updateProfile]);

  return null;
}
