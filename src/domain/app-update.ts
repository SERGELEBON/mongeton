/**
 * Mise à jour de l'APK : compare la version installée à la dernière Release GitHub.
 * Fonctions pures, sans réseau (testées).
 */

/** Transforme « v1.4.0 » ou « 1.4.0 » en [1, 4, 0] ; null si le format est inconnu. */
export function parseVersion(raw: string | null | undefined): number[] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec((raw ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Vrai si `latest` est strictement plus récente que `current`. */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export type AvailableUpdate = { version: string; apkUrl: string; pageUrl: string };

type GithubRelease = {
  tag_name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name?: string; browser_download_url?: string }[];
};

/** Extrait la mise à jour proposée d'une réponse « releases/latest » de GitHub, ou null. */
export function pickUpdate(release: GithubRelease, currentVersion: string): AvailableUpdate | null {
  if (!release.tag_name || release.draft || release.prerelease) return null;
  if (!isNewerVersion(release.tag_name, currentVersion)) return null;
  const apk = release.assets?.find((a) => a.name?.toLowerCase().endsWith('.apk'));
  if (!apk?.browser_download_url) return null;
  return {
    version: release.tag_name.replace(/^v/, ''),
    apkUrl: apk.browser_download_url,
    pageUrl: release.html_url ?? apk.browser_download_url,
  };
}
