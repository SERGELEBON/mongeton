/**
 * Sources d'import : fichier CSV choisi par l'utilisateur, notifications Mobile Money captées.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { parseNotification } from '@/domain/import/notification';
import { statementToCandidates, type StatementResult } from '@/domain/import/statement';
import {
  getPendingNotifications,
  isAccessGranted,
  isNotificationCaptureAvailable,
} from '../../../modules/mongeton-notifications';

import type { ImportSession } from './import-session';

/** Ouvre le sélecteur de fichiers et lit le relevé. `null` si l'utilisateur annule. */
export async function pickStatement(): Promise<StatementResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const text = await new File(result.assets[0].uri).text();
  return statementToCandidates(text);
}

/** Notifications en attente transformées en opérations (les autres sont listées à part). */
export function notificationSession(): ImportSession {
  const pending = getPendingNotifications();
  const candidates = [];
  const unparsed: string[] = [];
  for (const n of pending) {
    const c = parseNotification(n);
    if (c) candidates.push(c);
    else unparsed.push(n.id);
  }
  return { source: 'notification', candidates, skipped: 0, unparsedNotificationIds: unparsed };
}

/** État de la détection, rafraîchi à chaque retour au premier plan de l'app. */
export function useNotificationDetection() {
  const read = useCallback(
    () => ({
      available: isNotificationCaptureAvailable,
      granted: isAccessGranted(),
      count: notificationSession().candidates.length,
    }),
    []
  );
  const [state, setState] = useState(read);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setState(read());
    });
    return () => sub.remove();
  }, [read]);

  return { ...state, refresh: () => setState(read()) };
}
