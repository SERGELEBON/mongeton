/**
 * Moteur d'alertes des challenges, monté une fois l'utilisateur connecté.
 * À chaque changement des opérations : calcule la progression, enregistre en base
 * les seuils franchis (80 % / 100 %) et, pour les NOUVELLES alertes seulement,
 * envoie une notification sur le téléphone et demande l'email.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { keys, useAccounts, useChallenges, useProfile, useRates, useTransactionsSince } from '@/data/hooks';
import { raiseChallengeAlerts, requestAlertEmail } from '@/data/repository';
import { alertsToRaise, challengeProgress } from '@/domain/challenges';
import { DEFAULT_CURRENCY } from '@/domain/currency';
import { statsFromIso } from '@/features/stats/stats-view-model';
import { useI18n } from '@/i18n';
import { notifyNow } from '@/lib/notifications';

export function ChallengeEngine() {
  const { t, money, fmt } = useI18n();
  const qc = useQueryClient();
  const fromIso = useMemo(() => statsFromIso(), []);
  const profile = useProfile();
  const accounts = useAccounts();
  const rates = useRates();
  const challenges = useChallenges();
  const transactions = useTransactionsSince(fromIso);
  const lastSignature = useRef('');

  useEffect(() => {
    if (!profile.data || !accounts.data || !rates.data || !challenges.data || !transactions.data) return;
    const base = profile.data.base_currency ?? DEFAULT_CURRENCY;
    const progress = challenges.data
      .filter((c) => c.active)
      .map((c) => challengeProgress(c, transactions.data, accounts.data, base, rates.data));
    const toRaise = alertsToRaise(progress);
    const signature = toRaise.map((a) => `${a.progress.challenge.id}:${a.progress.periodStart}:${a.level}`).join('|');
    if (!signature || signature === lastSignature.current) return;
    lastSignature.current = signature;

    (async () => {
      try {
        const created = await raiseChallengeAlerts(
          toRaise.map((a) => ({
            challenge_id: a.progress.challenge.id,
            period_start: a.progress.periodStart,
            level: a.level,
            spent: a.progress.spent,
          }))
        );
        for (const alert of created) {
          const p = toRaise.find((a) => a.progress.challenge.id === alert.challenge_id && a.level === alert.level)?.progress;
          if (!p) continue;
          const vars = {
            name: p.challenge.name,
            percent: Math.round(p.ratio * 100),
            spent: money(p.spent, base),
            amount: money(p.challenge.amount, base),
            remaining: money(p.remaining, base),
          };
          await notifyNow(
            fmt(t.challenge.alertTitle, vars),
            fmt(alert.level === 'exceeded' ? t.challenge.alertExceeded : t.challenge.alertWarning, vars)
          );
          // Email : best effort (nécessite la fonction serveur et la clé Resend).
          requestAlertEmail(alert.id).catch(() => undefined);
        }
        if (created.length) qc.invalidateQueries({ queryKey: keys.alerts });
      } catch {
        lastSignature.current = ''; // réessaiera au prochain changement
      }
    })();
  }, [profile.data, accounts.data, rates.data, challenges.data, transactions.data, money, fmt, t, qc]);

  return null;
}
