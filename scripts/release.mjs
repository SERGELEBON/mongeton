#!/usr/bin/env node
/**
 * Publie une nouvelle version de Mongeton en une commande :
 *   npm run release            -> 1.2.0 -> 1.2.1 (correctif)
 *   npm run release -- minor   -> 1.2.0 -> 1.3.0 (nouveautés)
 *   npm run release -- major   -> 1.2.0 -> 2.0.0
 *   npm run release -- 1.4.0   -> version exacte
 *
 * Étapes : vérifications -> app.json (version + versionCode) -> commit -> tag vX.Y.Z -> push.
 * GitHub Actions construit alors l'APK signé et publie la Release ; Obtainium la propose aux téléphones.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

// 1. Pré-requis : branche main, à jour, sans modification en cours.
if (out('git branch --show-current') !== 'main') fail('Publie depuis la branche main.');
if (out('git status --porcelain')) fail('Des modifications ne sont pas commitées. Commit ou annule-les d’abord.');
run('git fetch --quiet origin main');
if (out('git rev-list --count HEAD..origin/main') !== '0') fail('La branche main est en retard sur GitHub : fais git pull.');

// 2. Calcul de la nouvelle version.
const appJson = JSON.parse(readFileSync('app.json', 'utf8'));
const current = appJson.expo.version;
const [maj, min, pat] = current.split('.').map(Number);
const arg = process.argv[2] ?? 'patch';
const next =
  arg === 'major' ? `${maj + 1}.0.0`
  : arg === 'minor' ? `${maj}.${min + 1}.0`
  : arg === 'patch' ? `${maj}.${min}.${pat + 1}`
  : /^\d+\.\d+\.\d+$/.test(arg) ? arg
  : fail(`Argument inconnu « ${arg} » (patch | minor | major | X.Y.Z).`);
const tag = `v${next}`;
if (out(`git tag -l ${tag}`)) fail(`Le tag ${tag} existe déjà.`);

// 3. Vérifications qualité avant de publier.
console.log(`\n▶ Vérifications (types, lint, tests) avant ${tag}…`);
run('npx tsc --noEmit');
run('npx expo lint');
run('npx jest --ci --silent');

// 4. Mise à jour d'app.json : la versionCode Android doit toujours augmenter.
appJson.expo.version = next;
appJson.expo.android.versionCode = (appJson.expo.android.versionCode ?? 0) + 1;
writeFileSync('app.json', `${JSON.stringify(appJson, null, 2)}\n`);

// 5. Commit, tag et envoi : GitHub Actions prend le relais.
run('git add app.json');
run(`git commit -m "Mongeton ${next}"`);
run(`git tag -a ${tag} -m "Mongeton ${next}"`);
run('git push origin main');
run(`git push origin ${tag}`);

console.log(`\n✔ ${current} -> ${next} (versionCode ${appJson.expo.android.versionCode}) publié.`);
console.log('  Suivi du build : https://github.com/SERGELEBON/mongeton/actions');
console.log('  Release        : https://github.com/SERGELEBON/mongeton/releases\n');
