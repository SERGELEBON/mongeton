import type { Transaction } from '@/data/types';

import type { ImportCandidate } from './types';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Opérations probablement déjà saisies (même sens, même montant, à un jour près) :
 * proposées décochées à l'écran de validation, l'utilisateur garde la main.
 */
export function likelyDuplicates(candidates: ImportCandidate[], existing: Transaction[]): Set<string> {
  const dupes = new Set<string>();
  for (const c of candidates) {
    const time = new Date(c.occurredAt).getTime();
    const match = existing.some(
      (t) =>
        t.type === c.type &&
        Math.abs(t.amount - c.amount) < 0.005 &&
        Math.abs(new Date(t.occurred_at).getTime() - time) <= DAY
    );
    if (match) dupes.add(c.externalId);
  }
  return dupes;
}
