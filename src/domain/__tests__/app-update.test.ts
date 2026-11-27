import { describe, expect, it } from '@jest/globals';

import { isNewerVersion, parseVersion, pickUpdate } from '../app-update';

describe('parseVersion', () => {
  it('accepte avec ou sans v', () => {
    expect(parseVersion('v1.4.0')).toEqual([1, 4, 0]);
    expect(parseVersion('2.10.3')).toEqual([2, 10, 3]);
  });
  it('refuse les formats inconnus', () => {
    expect(parseVersion('1.4')).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
  });
});

describe('isNewerVersion', () => {
  it('compare numériquement chaque partie', () => {
    expect(isNewerVersion('v1.10.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('v1.4.1', '1.4.0')).toBe(true);
    expect(isNewerVersion('v1.4.0', '1.4.0')).toBe(false);
    expect(isNewerVersion('v1.3.9', '1.4.0')).toBe(false);
    expect(isNewerVersion('bad', '1.4.0')).toBe(false);
  });
});

describe('pickUpdate', () => {
  const release = {
    tag_name: 'v1.5.0',
    html_url: 'https://github.com/x/y/releases/tag/v1.5.0',
    assets: [
      { name: 'Mongeton-v1.5.0.apk.sha256', browser_download_url: 'https://dl/sha' },
      { name: 'Mongeton-v1.5.0.apk', browser_download_url: 'https://dl/apk' },
    ],
  };
  it('propose l’APK d’une version plus récente', () => {
    expect(pickUpdate(release, '1.4.0')).toEqual({
      version: '1.5.0',
      apkUrl: 'https://dl/apk',
      pageUrl: 'https://github.com/x/y/releases/tag/v1.5.0',
    });
  });
  it('ignore la même version, les brouillons et les releases sans APK', () => {
    expect(pickUpdate(release, '1.5.0')).toBeNull();
    expect(pickUpdate({ ...release, prerelease: true }, '1.4.0')).toBeNull();
    expect(pickUpdate({ ...release, assets: [] }, '1.4.0')).toBeNull();
  });
});
