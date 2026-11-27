import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  useAccounts,
  useCategories,
  useChallenges,
  useDeleteChallenge,
  useMarkAlertsRead,
  useProfile,
  useRates,
  useToggleChallenge,
  useTransactionsSince,
  useUnreadAlerts,
} from '@/data/hooks';
import { challengeProgress, type ChallengeStatus } from '@/domain/challenges';
import { DEFAULT_CURRENCY } from '@/domain/currency';
import { statsFromIso } from '@/features/stats/stats-view-model';
import { useI18n } from '@/i18n';
import { categoryLabel } from '@/i18n/categories';
import { notificationsGranted, requestNotificationPermission } from '@/lib/notifications';

export type ChallengeCardState = {
  id: string;
  name: string;
  periodLabel: string;
  scopeLabel: string;
  active: boolean;
  status: ChallengeStatus;
  /** 0..1 pour la barre (plafonné). */
  progress: number;
  percentText: string;
  spentOfText: string;
  remainingText: string;
  perDayText: string | null;
  projectionText: string | null;
  statusText: string;
};

export type ChallengeEvent =
  | { type: 'New' }
  | { type: 'Toggle'; id: string; active: boolean }
  | { type: 'Delete'; id: string }
  | { type: 'EnableNotifications' }
  | { type: 'DismissAlerts' };

export function useChallengeViewModel() {
  const { t, money, fmt } = useI18n();
  const fromIso = useMemo(() => statsFromIso(), []);
  const profile = useProfile();
  const accounts = useAccounts();
  const categories = useCategories();
  const rates = useRates();
  const challenges = useChallenges();
  const transactions = useTransactionsSince(fromIso);
  const alerts = useUnreadAlerts();
  const toggle = useToggleChallenge();
  const remove = useDeleteChallenge();
  const markRead = useMarkAlertsRead();
  const [notifOn, setNotifOn] = useState(true);

  useEffect(() => {
    notificationsGranted().then(setNotifOn);
  }, []);

  const base = profile.data?.base_currency ?? DEFAULT_CURRENCY;

  const cards: ChallengeCardState[] = useMemo(() => {
    if (!challenges.data || !transactions.data || !accounts.data || !rates.data) return [];
    const catById = new Map((categories.data ?? []).map((c) => [c.id, c]));
    return challenges.data.map((c) => {
      const p = challengeProgress(c, transactions.data, accounts.data, base, rates.data);
      const cat = c.category_id ? catById.get(c.category_id) : undefined;
      return {
        id: c.id,
        name: c.name,
        periodLabel: t.periods[c.period],
        scopeLabel: cat ? categoryLabel(cat, t) : t.challenge.allExpenses,
        active: c.active,
        status: p.status,
        progress: Math.min(1, p.ratio),
        percentText: `${Math.round(p.ratio * 100)} %`,
        spentOfText: fmt(t.challenge.spentOf, { spent: money(p.spent, base), amount: money(c.amount, base) }),
        remainingText: fmt(t.challenge.remaining, { amount: money(p.remaining, base) }),
        perDayText:
          p.status === 'exceeded' ? null : fmt(t.challenge.perDay, { amount: money(p.dailyAllowance, base), days: p.daysLeft }),
        projectionText:
          p.onTrackToExceed && p.status !== 'exceeded'
            ? fmt(t.challenge.projection, { amount: money(p.projected, base) })
            : null,
        statusText: !c.active
          ? t.challenge.paused
          : p.status === 'exceeded'
            ? t.challenge.exceeded
            : p.status === 'warning'
              ? t.challenge.warning
              : t.challenge.onTrack,
      };
    });
  }, [challenges.data, transactions.data, accounts.data, rates.data, categories.data, base, t, money, fmt]);

  // Message dans l'app pour les alertes non lues (en plus de la notification et de l'email).
  const alertMessages = useMemo(() => {
    const byId = new Map((challenges.data ?? []).map((c) => [c.id, c]));
    return (alerts.data ?? []).flatMap((a) => {
      const c = byId.get(a.challenge_id);
      if (!c) return [];
      const vars = {
        name: c.name,
        percent: Math.round((a.spent / c.amount) * 100),
        spent: money(a.spent, base),
        amount: money(c.amount, base),
        remaining: money(Math.max(0, c.amount - a.spent), base),
      };
      return [
        {
          id: a.id,
          level: a.level,
          title: fmt(t.challenge.alertTitle, vars),
          body: fmt(a.level === 'exceeded' ? t.challenge.alertExceeded : t.challenge.alertWarning, vars),
        },
      ];
    });
  }, [alerts.data, challenges.data, base, t, money, fmt]);

  function onEvent(e: ChallengeEvent) {
    switch (e.type) {
      case 'New':
        return router.push('/challenge/new');
      case 'Toggle':
        return toggle.mutate({ id: e.id, active: e.active });
      case 'Delete':
        return remove.mutate(e.id);
      case 'EnableNotifications':
        return void requestNotificationPermission().then(setNotifOn);
      case 'DismissAlerts':
        return markRead.mutate(alertMessages.map((a) => a.id));
    }
  }

  const queries = [profile, accounts, rates, challenges, transactions];
  return {
    uiState: {
      loading: queries.some((q) => q.isPending),
      error: (queries.find((q) => q.error)?.error ?? toggle.error ?? remove.error)?.message ?? null,
      cards,
      alertMessages,
      showNotificationHint: !notifOn && cards.length > 0,
    },
    onEvent,
  };
}
