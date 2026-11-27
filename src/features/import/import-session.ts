/**
 * Session d'import en mémoire : opérations détectées en attente de validation.
 * Partagée entre l'écran qui lance l'import et l'écran de validation.
 */
import { useSyncExternalStore } from 'react';

import type { ImportCandidate, ImportSource } from '@/domain/import/types';

export type ImportSession = {
  source: ImportSource;
  candidates: ImportCandidate[];
  /** Lignes illisibles ignorées (relevé) — affiché à titre d'information. */
  skipped: number;
  /** Notifications captées mais non reconnues : retirées de la file une fois l'écran fermé. */
  unparsedNotificationIds: string[];
};

let session: ImportSession | null = null;
const listeners = new Set<() => void>();

export function setImportSession(next: ImportSession | null) {
  session = next;
  listeners.forEach((l) => l());
}

export function getImportSession(): ImportSession | null {
  return session;
}

export function useImportSession(): ImportSession | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => session
  );
}
