import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Changement d'utilisateur : on vide le cache pour ne jamais afficher les données du précédent.
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') queryClient.clear();
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
