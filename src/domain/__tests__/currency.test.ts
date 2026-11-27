import { describe, expect, it } from '@jest/globals';

import { convert, formatMoney, parseAmount, roundFor, type Rates } from '../currency';

const NNBSP = ' ';
const rates: Rates = { USD: 1, XOF: 600, GHS: 12, EUR: 600 / 655.957 };

describe('formatMoney — français', () => {
  it('formate le FCFA sans décimales, symbole après', () => {
    expect(formatMoney(1250000, 'XOF', 'fr')).toBe(`1${NNBSP}250${NNBSP}000 FCFA`);
  });
  it('place € et $ après le montant, GH₵ avant', () => {
    expect(formatMoney(12.5, 'EUR', 'fr')).toBe('12,50 €');
    expect(formatMoney(1999.99, 'USD', 'fr')).toBe(`1${NNBSP}999,99 $`);
    expect(formatMoney(12.5, 'GHS', 'fr')).toBe('GH₵ 12,50');
  });
  it('garde le signe des montants négatifs', () => {
    expect(formatMoney(-500, 'XOF', 'fr')).toBe('-500 FCFA');
  });
});

describe('formatMoney — anglais', () => {
  it('utilise la virgule pour les milliers et le point décimal', () => {
    expect(formatMoney(1250000, 'XOF', 'en')).toBe('1,250,000 FCFA');
    expect(formatMoney(1999.99, 'USD', 'en')).toBe('$1,999.99');
    expect(formatMoney(12.5, 'EUR', 'en')).toBe('€12.50');
    expect(formatMoney(12.5, 'GHS', 'en')).toBe('GH₵ 12.50');
  });
});

describe('parseAmount', () => {
  it.each([
    ['1500', 1500],
    ['1 500', 1500],
    ['1500,50', 1500.5],
    ['1500.5', 1500.5],
    ['1,500.50', 1500.5],
  ])('"%s" -> %d', (input, expected) => expect(parseAmount(input)).toBe(expected));

  it.each(['', '0', 'abc', '-5', '1,2,3'])('rejette "%s"', (input) => expect(parseAmount(input)).toBeNull());
});

describe('convert / roundFor', () => {
  it('convertit en passant par le dollar', () => {
    expect(convert(600, 'XOF', 'USD', rates)).toBe(1);
    expect(convert(1, 'GHS', 'XOF', rates)).toBe(50);
  });
  it('respecte la parité fixe FCFA / euro', () => {
    expect(roundFor(convert(1, 'EUR', 'XOF', rates), 'XOF')).toBe(656);
    expect(roundFor(convert(655957, 'XOF', 'EUR', rates), 'EUR')).toBe(1000);
  });
  it('ne touche pas un montant dans la même devise', () => {
    expect(convert(123, 'XOF', 'XOF', rates)).toBe(123);
  });
  it('arrondit selon les décimales de la devise', () => {
    expect(roundFor(1234.56, 'XOF')).toBe(1235);
    expect(roundFor(12.345, 'EUR')).toBe(12.35);
  });
});
