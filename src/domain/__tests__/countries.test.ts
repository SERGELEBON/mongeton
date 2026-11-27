import { describe, expect, it } from '@jest/globals';

import { COUNTRIES, countryFromRegion, providersFor } from '../countries';

describe('pays', () => {
  it('propose les Mobile Money ivoiriens en Côte d’Ivoire, en FCFA et en français', () => {
    expect(providersFor('CI')).toEqual(['orange_money', 'mtn_momo', 'moov_money', 'wave', 'visa', 'bank', 'cash']);
    expect(COUNTRIES.CI).toMatchObject({ currency: 'XOF', language: 'fr' });
  });

  it('propose MTN MoMo et Telecel Cash au Ghana, en cedi et en anglais', () => {
    expect(providersFor('GH')).toEqual(['mtn_momo', 'telecel_cash', 'visa', 'bank', 'cash']);
    expect(COUNTRIES.GH).toMatchObject({ currency: 'GHS', language: 'en' });
  });

  it('se rabat sur carte, banque et espèces sans pays connu', () => {
    expect(providersFor(null)).toEqual(['visa', 'bank', 'cash']);
  });

  it('déduit le pays de la région du téléphone', () => {
    expect(countryFromRegion('GH')).toBe('GH');
    expect(countryFromRegion('CI')).toBe('CI');
    expect(countryFromRegion('FR')).toBeNull();
    expect(countryFromRegion(undefined)).toBeNull();
  });
});
