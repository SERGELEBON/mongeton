/**
 * Plugin de configuration Expo : signe les builds release avec la clé Mongeton
 * quand les variables d'environnement sont fournies (GitHub Actions ou poste local).
 * Sans ces variables, le build release retombe sur la clé de debug (tests seulement).
 *
 *   MONGETON_KEYSTORE_FILE      chemin absolu du fichier .jks
 *   MONGETON_KEYSTORE_PASSWORD  mot de passe du keystore
 *   MONGETON_KEY_ALIAS          alias de la clé
 *   MONGETON_KEY_PASSWORD       mot de passe de la clé
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// mongeton-release-signing';

const RELEASE_SIGNING = `
        release { ${MARKER}
            if (System.getenv('MONGETON_KEYSTORE_FILE')) {
                storeFile file(System.getenv('MONGETON_KEYSTORE_FILE'))
                storePassword System.getenv('MONGETON_KEYSTORE_PASSWORD')
                keyAlias System.getenv('MONGETON_KEY_ALIAS')
                keyPassword System.getenv('MONGETON_KEY_PASSWORD')
            }
        }`;

function addReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  // 1. Déclare la configuration de signature « release » après la « debug ».
  const signingBlock = /signingConfigs\s*\{\s*debug\s*\{[^}]*\}/;
  if (!signingBlock.test(gradle)) throw new Error('with-release-signing: bloc signingConfigs introuvable');
  gradle = gradle.replace(signingBlock, (match) => match + RELEASE_SIGNING);

  // 2. Le buildType release l'utilise si le keystore est fourni.
  const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseType.test(gradle)) throw new Error('with-release-signing: buildType release introuvable');
  return gradle.replace(
    releaseType,
    "$1signingConfig System.getenv('MONGETON_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug"
  );
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.addReleaseSigning = addReleaseSigning;
