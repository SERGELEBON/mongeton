import { describe, expect, it } from '@jest/globals';

import { categoryLabel } from '../categories';
import { en } from '../en';
import { fr } from '../fr';
import { interpolate } from '../index';

/** Liste toutes les clés "a.b.c" d'un dictionnaire. */
function keysOf(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keysOf(v as object, `${prefix}${k}.`)
  );
}

describe('dictionnaires', () => {
  it('ont exactement les mêmes clés en français et en anglais', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(fr).sort());
  });

  it('gardent les mêmes {variables} dans chaque traduction', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    const get = (d: object, path: string) => path.split('.').reduce<any>((o, k) => o[k], d) as string;
    for (const key of keysOf(fr)) expect([key, vars(get(en, key))]).toEqual([key, vars(get(fr, key))]);
  });
});

describe('interpolate', () => {
  it('remplace les variables', () => {
    expect(interpolate(fr.home.greeting, { name: 'Awa' })).toBe('Bonjour Awa');
    expect(interpolate(en.giving.titheRemaining, { amount: '€5.00' })).toBe('Left to give: €5.00');
  });
});

describe('categoryLabel', () => {
  it('traduit les catégories par défaut et garde le nom des catégories personnelles', () => {
    expect(categoryLabel({ key: 'tithe', name: 'Dîme' }, en)).toBe('Tithe');
    expect(categoryLabel({ key: 'thanksgiving', name: 'Action de grâce' }, fr)).toBe('Action de grâce');
    expect(categoryLabel({ key: null, name: 'Tontine' }, en)).toBe('Tontine');
  });
});
