/**
 * Transforme une notification (SMS de confirmation, app Mobile Money) en opération.
 * Prudent par conception : si le sens (reçu / payé) n'est pas clair, on ignore.
 */
import type { ProviderId } from '../countries';

import { findMoney, fingerprint } from './money';
import type { ImportCandidate } from './types';

export type RawNotification = { id: string; package: string; title: string; text: string; postedAt: number };

/**
 * `\b` de JavaScript ignore les lettres accentuées (é, ç) : on construit nos propres
 * limites de mot pour que « envoyé », « reçu », « débité » soient bien reconnus.
 */
const LETTER = 'a-zà-öø-ÿ';
const words = (alternatives: string) => new RegExp(`(?:^|[^${LETTER}])(?:${alternatives})(?![${LETTER}])`, 'i');

const INCOME = words(
  're[çc]u|received|cr[ée]dit[ée]?|credited|d[ée]p[oô]t|deposit|cash[\\s-]?in|you have received|vous avez re[çc]u|transfert re[çc]u'
);
const EXPENSE = words(
  'envoy[ée]|sent|pay[ée]|paid|payment|paiement|retrait|withdraw(?:al|n)?|d[ée]bit[ée]?|debited|achat|purchase|cash[\\s-]?out|transf[ée]r[ée]? (?:vers|à|to)|transferred to|you have sent|vous avez envoy[ée]'
);
/** Messages à ignorer : codes, promos, soldes seuls. */
const NOISE = words('otp|code de v[ée]rification|verification code|promo|bonus offert|votre solde est|your balance is');

const PROVIDER_PATTERNS: { re: RegExp; id: ProviderId }[] = [
  { re: /orange\s?money|orangemoney|\borange\b/i, id: 'orange_money' },
  { re: /\bwave\b/i, id: 'wave' },
  { re: /\bmoov\b|flooz/i, id: 'moov_money' },
  { re: /telecel|vodafone\s?cash/i, id: 'telecel_cash' },
  { re: /\bmomo\b|mobile\s?money|\bmtn\b/i, id: 'mtn_momo' },
  { re: /\bvisa\b/i, id: 'visa' },
];

export function detectProvider(...texts: string[]): ProviderId | null {
  const all = texts.join(' ');
  return PROVIDER_PATTERNS.find((p) => p.re.test(all))?.id ?? null;
}

export function parseNotification(n: RawNotification): ImportCandidate | null {
  const content = `${n.title} ${n.text}`.replace(/\s+/g, ' ').trim();
  if (!content || NOISE.test(content)) return null;

  const income = INCOME.exec(content);
  const expense = EXPENSE.exec(content);
  if (!income && !expense) return null;
  // Les deux mots présents : on retient celui qui apparaît en premier.
  const type: 'income' | 'expense' =
    income && expense ? (income.index < expense.index ? 'income' : 'expense') : income ? 'income' : 'expense';

  // Premier montant après le mot-clé de sens (évite "Solde : …" placé avant), sinon le premier tout court.
  const keywordIndex = (type === 'income' ? income : expense)?.index ?? 0;
  const money = findMoney(content);
  const main = money.find((m) => m.index >= keywordIndex) ?? money[0];
  if (!main) return null;

  return {
    externalId: `notif:${fingerprint(`${n.package}|${n.postedAt}|${content}`)}`,
    source: 'notification',
    type,
    amount: main.amount,
    currency: main.currency,
    occurredAt: new Date(n.postedAt).toISOString(),
    description: content.length > 120 ? `${content.slice(0, 117)}…` : content,
    provider: detectProvider(n.package, n.title, n.text),
    notificationId: n.id,
  };
}
