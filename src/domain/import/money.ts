/**
 * Lecture des montants tels qu'ils apparaissent dans les SMS / relevés :
 * "15 000 FCFA", "15.000 F CFA", "GHS 1,250.50", "GH₵50", "XOF 2500".
 */
import type { CurrencyCode } from '../currency';

/** "15 000" | "15.000" | "15,000.50" | "1 500,50" | "2500" -> nombre. */
export function parseLocaleNumber(raw: string): number | null {
  let s = raw.replace(/[\s  ]/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // Les deux présents : le dernier est le séparateur décimal.
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    s = s.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? ',' : '.';
    const parts = s.split(sep);
    // "15.000" ou "1,500,000" : groupes de 3 chiffres => séparateur de milliers.
    const isThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
    s = isThousands ? parts.join('') : parts.join('.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const CURRENCY_TOKENS: { re: RegExp; code: CurrencyCode }[] = [
  { re: /^(f\s?cfa|fcfa|xof|cfa|f)$/i, code: 'XOF' },
  { re: /^(ghs|gh₵|ghc|cedis?|gh¢)$/i, code: 'GHS' },
  { re: /^(usd|\$)$/i, code: 'USD' },
  { re: /^(eur|€)$/i, code: 'EUR' },
];

export function currencyFromToken(token: string): CurrencyCode | null {
  const t = token.trim();
  return CURRENCY_TOKENS.find((c) => c.re.test(t))?.code ?? null;
}

const NUMBER = String.raw`\d{1,3}(?:[\s  .,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const CUR = String.raw`f\s?cfa|fcfa|xof|cfa|ghs|gh₵|ghc|gh¢|cedis?|usd|eur|€|\$`;
/** Après un nombre, un « F » seul vaut FCFA (« 5.000F », usage Wave / Orange). */
const CUR_AFTER = String.raw`${CUR}|f`;
/** Montant + devise (devise avant ou après). */
const MONEY_RE = new RegExp(
  String.raw`(?:(${CUR})\s?(${NUMBER}))|(?:(${NUMBER})\s?(${CUR_AFTER})(?![a-z]))`,
  'gi'
);

export type MoneyMatch = { amount: number; currency: CurrencyCode | null; index: number };

export function findMoney(text: string): MoneyMatch[] {
  const out: MoneyMatch[] = [];
  for (const m of text.matchAll(MONEY_RE)) {
    const [curBefore, numAfter, numBefore, curAfter] = [m[1], m[2], m[3], m[4]];
    const amount = parseLocaleNumber((numAfter ?? numBefore ?? '').trim());
    if (amount === null || amount <= 0) continue;
    out.push({ amount, currency: currencyFromToken(curBefore ?? curAfter ?? ''), index: m.index ?? 0 });
  }
  return out;
}

/** Empreinte courte et stable (FNV-1a 32 bits) pour l'anti-doublon. */
export function fingerprint(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
