import { describe, expect, it } from '@jest/globals';

import type { Transaction } from '@/data/types';

import { likelyDuplicates } from '../import/duplicates';
import { findMoney, parseLocaleNumber } from '../import/money';
import { parseNotification, type RawNotification } from '../import/notification';
import { parseCsv, parseStatementDate, statementToCandidates } from '../import/statement';

const notif = (text: string, title = '', pkg = 'com.google.android.apps.messaging'): RawNotification => ({
  id: 'n1',
  package: pkg,
  title,
  text,
  postedAt: new Date(2026, 10, 26, 10, 30).getTime(),
});

describe('parseLocaleNumber', () => {
  it.each([
    ['15 000', 15000],
    ['15.000', 15000],
    ['1,500,000', 1500000],
    ['1,250.50', 1250.5],
    ['1 500,50', 1500.5],
    ['50.00', 50],
    ['2500', 2500],
  ])('"%s" -> %d', (raw, expected) => expect(parseLocaleNumber(raw)).toBe(expected));
});

describe('findMoney', () => {
  it('trouve montant et devise, devise avant ou après', () => {
    expect(findMoney('Vous avez reçu 15 000 FCFA de AWA')).toEqual([{ amount: 15000, currency: 'XOF', index: 15 }]);
    expect(findMoney('Payment of GHS 1,250.50 to KOFI')[0]).toMatchObject({ amount: 1250.5, currency: 'GHS' });
    expect(findMoney('GH₵50.00 sent')[0]).toMatchObject({ amount: 50, currency: 'GHS' });
  });
});

describe('parseNotification', () => {
  it('reconnaît un dépôt Orange Money en FCFA', () => {
    const c = parseNotification(
      notif('Vous avez reçu 25 000 FCFA de 0707070707. Nouveau solde : 40 500 FCFA.', 'OrangeMoney')
    );
    expect(c).toMatchObject({ type: 'income', amount: 25000, currency: 'XOF', provider: 'orange_money', source: 'notification' });
    expect(c?.externalId).toMatch(/^notif:/);
  });

  it('reconnaît un paiement MoMo au Ghana et ignore le solde', () => {
    const c = parseNotification(
      notif('Your balance is GHS 300.00. Payment made for GHS 45.50 to SHOPRITE. Fee GHS 0.50', 'MobileMoney')
    );
    // "Your balance is" est considéré comme du bruit -> ignoré entièrement
    expect(c).toBeNull();
    const ok = parseNotification(notif('Payment made for GHS 45.50 to SHOPRITE. Fee charged: GHS 0.50.', 'MobileMoney'));
    expect(ok).toMatchObject({ type: 'expense', amount: 45.5, currency: 'GHS', provider: 'mtn_momo' });
  });

  it('reconnaît un envoi Wave', () => {
    const c = parseNotification(notif('Vous avez envoyé 5.000F à KONAN (07 00 00 00 00).', 'Wave', 'com.wave.personal'));
    expect(c).toMatchObject({ type: 'expense', amount: 5000, currency: 'XOF', provider: 'wave' });
  });

  it('ignore codes OTP et messages sans sens clair', () => {
    expect(parseNotification(notif('Votre code de vérification est 123456'))).toBeNull();
    expect(parseNotification(notif('Promo : 1 000 FCFA de bonus offert'))).toBeNull();
    expect(parseNotification(notif('Transaction 15 000 FCFA'))).toBeNull();
  });
});

describe('import CSV', () => {
  it('lit séparateur point-virgule, guillemets et BOM', () => {
    expect(parseCsv('﻿Date;Libellé;Montant\r\n26/11/2026;"Achat; marché";-2 500\r\n')).toEqual([
      ['Date', 'Libellé', 'Montant'],
      ['26/11/2026', 'Achat; marché', '-2 500'],
    ]);
  });

  it('comprend les dates jour/mois', () => {
    expect(new Date(parseStatementDate('26/11/2026')!).getMonth()).toBe(10);
    expect(new Date(parseStatementDate('2026-11-26 14:30')!).getHours()).toBe(14);
    expect(parseStatementDate('31/13/2026')).toBeNull();
  });

  it('convertit un relevé avec colonne montant signée', () => {
    const r = statementToCandidates('Date;Libellé;Montant\n26/11/2026;Salaire;350 000\n27/11/2026;Loyer;-120 000\n;vide;\n');
    expect(r.missingColumns).toEqual([]);
    expect(r.skipped).toBe(1);
    expect(r.candidates.map((c) => [c.type, c.amount, c.description])).toEqual([
      ['income', 350000, 'Salaire'],
      ['expense', 120000, 'Loyer'],
    ]);
  });

  it('convertit un relevé anglais avec colonnes Debit / Credit', () => {
    const r = statementToCandidates('Transaction Date,Details,Debit,Credit\n2026-11-02,Airtime,"10.00",\n2026-11-03,Cash in,,"200.00"\n');
    expect(r.candidates.map((c) => [c.type, c.amount])).toEqual([
      ['expense', 10],
      ['income', 200],
    ]);
  });

  it('signale les colonnes manquantes', () => {
    expect(statementToCandidates('Nom,Ville\nAwa,Abidjan').missingColumns).toEqual(['date', 'amount']);
  });
});

describe('likelyDuplicates', () => {
  it('repère une opération déjà saisie (même sens, montant, à un jour près)', () => {
    const [c] = statementToCandidates('Date;Libellé;Montant\n26/11/2026;Loyer;-120 000').candidates;
    const existing: Transaction = {
      id: 't',
      type: 'expense',
      account_id: 'a',
      amount: 120000,
      to_account_id: null,
      to_amount: null,
      category_id: null,
      title: 'Loyer',
      note: null,
      occurred_at: new Date(2026, 10, 25, 18).toISOString(),
    };
    expect(likelyDuplicates([c], [existing]).has(c.externalId)).toBe(true);
    expect(likelyDuplicates([c], [{ ...existing, amount: 100000 }]).size).toBe(0);
  });
});
