import type { ProviderId } from '../countries';
import type { CurrencyCode } from '../currency';

export type ImportSource = 'statement' | 'notification';

/** Opération détectée, à valider par l'utilisateur avant enregistrement. */
export type ImportCandidate = {
  /** Empreinte stable de la ligne / notification d'origine (anti-doublon en base). */
  externalId: string;
  source: ImportSource;
  type: 'income' | 'expense';
  amount: number;
  currency: CurrencyCode | null;
  occurredAt: string;
  description: string;
  provider: ProviderId | null;
  /** Identifiant natif de la notification (pour la retirer de la file une fois traitée). */
  notificationId?: string;
};
