/**
 * Import de relevé CSV (export MoMo, Wave, banque, Excel…).
 * Détecte automatiquement le séparateur et les colonnes (en français ou en anglais).
 */
import { fingerprint, parseLocaleNumber } from './money';
import type { ImportCandidate } from './types';

/** Lecture CSV robuste : guillemets, séparateur , ; ou tabulation, fins de ligne Windows. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [';', '\t', ','].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

const ALIASES = {
  date: ['date', 'datedoperation', 'dateoperation', 'transactiondate', 'datetime', 'dateheure', 'valuedate', 'datevaleur'],
  description: ['description', 'libelle', 'details', 'detail', 'narration', 'motif', 'reference', 'beneficiaire', 'counterparty', 'name', 'nom'],
  amount: ['amount', 'montant', 'valeur', 'value', 'somme'],
  debit: ['debit', 'retrait', 'withdrawal', 'sortie', 'out', 'moneyout', 'paidout'],
  credit: ['credit', 'depot', 'deposit', 'entree', 'in', 'moneyin', 'paidin'],
  type: ['type', 'sens', 'direction', 'nature', 'transactiontype'],
} as const;

type Column = keyof typeof ALIASES;

function findColumns(header: string[]): Partial<Record<Column, number>> {
  const cols: Partial<Record<Column, number>> = {};
  header.forEach((h, i) => {
    const n = normalize(h);
    for (const key of Object.keys(ALIASES) as Column[]) {
      if (cols[key] === undefined && (ALIASES[key] as readonly string[]).includes(n)) cols[key] = i;
    }
  });
  return cols;
}

/** "2026-11-26", "26/11/2026", "26-11-2026 14:30", "26.11.26" -> ISO. Jour avant mois (usage local). */
export function parseStatementDate(raw: string): string | null {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/.exec(s);
  if (iso) {
    const [, y, m, d, hh = '12', mm = '00'] = iso;
    return new Date(+y, +m - 1, +d, +hh, +mm).toISOString();
  }
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(s);
  if (dmy) {
    const [, d, m, y, hh = '12', mm = '00'] = dmy;
    const year = y.length === 2 ? 2000 + +y : +y;
    if (+m < 1 || +m > 12 || +d < 1 || +d > 31) return null;
    return new Date(year, +m - 1, +d, +hh, +mm).toISOString();
  }
  return null;
}

const signedAmount = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const negative = /^\s*-|\(.*\)/.test(raw);
  const n = parseLocaleNumber(raw.replace(/[^\d.,\s]/g, '').trim());
  return n === null ? null : negative ? -n : n;
};

export type StatementResult = { candidates: ImportCandidate[]; skipped: number; missingColumns: Column[] };

export function statementToCandidates(text: string): StatementResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { candidates: [], skipped: 0, missingColumns: ['date', 'amount'] };

  const cols = findColumns(rows[0]);
  const hasAmount = cols.amount !== undefined || cols.debit !== undefined || cols.credit !== undefined;
  const missing: Column[] = [];
  if (cols.date === undefined) missing.push('date');
  if (!hasAmount) missing.push('amount');
  if (missing.length) return { candidates: [], skipped: rows.length - 1, missingColumns: missing };

  const candidates: ImportCandidate[] = [];
  let skipped = 0;
  rows.slice(1).forEach((r, index) => {
    const occurredAt = parseStatementDate(r[cols.date!] ?? '');
    const debit = signedAmount(cols.debit !== undefined ? r[cols.debit] : undefined);
    const credit = signedAmount(cols.credit !== undefined ? r[cols.credit] : undefined);
    let value = signedAmount(cols.amount !== undefined ? r[cols.amount] : undefined);
    if (credit) value = Math.abs(credit);
    else if (debit) value = -Math.abs(debit);
    // Colonne "type/sens" explicite : elle prime sur le signe.
    const typeCell = cols.type !== undefined ? normalize(r[cols.type] ?? '') : '';
    if (value !== null && /debit|retrait|sortie|out|paiement|payment|envoi|sent/.test(typeCell)) value = -Math.abs(value);
    if (value !== null && /credit|depot|entree|in|recu|received/.test(typeCell)) value = Math.abs(value);

    if (!occurredAt || !value) {
      skipped++;
      return;
    }
    const description = (cols.description !== undefined ? r[cols.description] : '') || '';
    candidates.push({
      externalId: `stmt:${fingerprint(`${occurredAt}|${value}|${description}|${index}`)}`,
      source: 'statement',
      type: value > 0 ? 'income' : 'expense',
      amount: Math.abs(value),
      currency: null,
      occurredAt,
      description: description.slice(0, 120),
      provider: null,
    });
  });
  return { candidates, skipped, missingColumns: [] };
}
