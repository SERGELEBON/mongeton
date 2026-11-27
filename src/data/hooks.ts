/**
 * Hooks React Query : cache + rechargement automatique après chaque écriture.
 * Équivalent simplifié des ViewModels d'Ivy.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth';

import * as repo from './repository';
import type { NewAccount, NewChallenge, NewTransaction, Profile, ProfilePatch } from './types';

export const keys = {
  profile: ['profile'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: ['transactions'] as const,
  rates: ['rates'] as const,
  challenges: ['challenges'] as const,
  alerts: ['challenge-alerts'] as const,
};

export const useProfile = (options: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: keys.profile, queryFn: repo.getProfile, enabled: options.enabled ?? true });
export const useAccounts = () => useQuery({ queryKey: keys.accounts, queryFn: repo.listAccounts });
export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: repo.listCategories });
export const useTransactions = () =>
  useQuery({ queryKey: keys.transactions, queryFn: () => repo.listTransactions() });
/** Opérations depuis le début de la période précédente du trimestre (stats + challenges). */
export const useTransactionsSince = (fromIso: string) =>
  useQuery({ queryKey: [...keys.transactions, 'since', fromIso], queryFn: () => repo.listTransactionsSince(fromIso) });

export const useChallenges = () => useQuery({ queryKey: keys.challenges, queryFn: repo.listChallenges });
export const useUnreadAlerts = () => useQuery({ queryKey: keys.alerts, queryFn: repo.listUnreadAlerts });

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewChallenge) => repo.createChallenge(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.challenges }),
  });
}

export function useToggleChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => repo.setChallengeActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.challenges }),
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: repo.deleteChallenge,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.challenges }),
  });
}

export function useMarkAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: repo.markAlertsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

export const useRates = () =>
  useQuery({ queryKey: keys.rates, queryFn: repo.getRates, staleTime: 60 * 60 * 1000 });

/** Une transaction modifie les soldes : on invalide aussi les comptes. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.transactions }),
      qc.invalidateQueries({ queryKey: keys.accounts }),
    ]);
}

export function useCreateTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (input: NewTransaction) => repo.createTransaction(input),
    onSuccess: invalidate,
  });
}

export function useImportTransactions() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: repo.importTransactions, onSuccess: invalidate });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: repo.deleteTransaction, onSuccess: invalidate });
}

export function useCreateAccount() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (input: NewAccount) => repo.createAccount(input), onSuccess: invalidate });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: repo.deleteAccount, onSuccess: invalidate });
}

/** Mise à jour optimiste : l'écran change immédiatement, annulée si Supabase refuse. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => {
      if (!session) throw new Error('Not signed in');
      return repo.updateProfile(session.user.id, patch);
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: keys.profile });
      const previous = qc.getQueryData<Profile>(keys.profile);
      if (previous) qc.setQueryData<Profile>(keys.profile, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) qc.setQueryData(keys.profile, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
}
