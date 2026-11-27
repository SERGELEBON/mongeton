<p align="center">
  <img src="assets/images/og-fr.png" alt="Mongeton — Gestion financière individuelle" width="520" />
</p>

# Mongeton

Application mobile de gestion financière individuelle pour la Côte d'Ivoire et le Ghana :
comptes Mobile Money (Orange Money, MTN MoMo, Wave, Moov, Telecel Cash), Visa, banque et espèces,
en **FCFA, cedi, dollar ou euro**, en **français ou anglais**, avec un suivi des **dons religieux**
(dîme, offrande, action de grâce).

Version simplifiée inspirée de l'architecture d'[Ivy Wallet](https://github.com/Ivy-Apps/ivy-wallet),
reconstruite en React Native (Expo) + Supabase.

## Fonctionnalités

- Comptes multi-devises avec logos des opérateurs du pays choisi
- Dépenses, revenus, virements entre comptes (conversion de devise)
- Solde total et résumé du mois dans la devise principale
- Dons religieux : dîme conseillée (10 % des revenus), offrandes, actions de grâce
- **Import de relevé CSV** (MoMo, Wave, banque, Excel) avec détection automatique des colonnes
- **Détection Mobile Money** : lecture des notifications / SMS de confirmation (Android, avec autorisation)
- Validation de chaque opération importée, anti-doublons côté base
- Connexion email ou Google, données protégées par Row Level Security

## Architecture

Mêmes couches qu'Ivy Wallet : **Data → Domain → UI**.

| Dossier | Rôle |
|---|---|
| `src/data/` | Accès Supabase (repository), mappers, hooks React Query |
| `src/domain/` | Logique métier pure et testée (devises, soldes, dons, pays, import) |
| `src/features/` | Écrans par fonctionnalité, ViewModels `uiState` / `onEvent` |
| `src/app/` | Routes Expo Router (fines, pointent vers `features/`) |
| `src/components/` | Design system (couleurs du logo, Montserrat) |
| `src/i18n/` | Traductions FR / EN typées |
| `modules/mongeton-notifications/` | Module Android natif (lecture des notifications) |
| `supabase/migrations/` | Schéma SQL, RLS, droits |
| `plugins/` | Plugin Expo de signature release |

## Démarrer en local

Prérequis : Node.js ≥ 22.13, Android SDK (pour l'émulateur / les builds).

```bash
npm install
cp .env.example .env.local   # puis renseigner l'URL et la clé publishable Supabase
npx expo start               # Expo Go (sans la détection Mobile Money)
npm test                     # tests unitaires
npm run typecheck && npx expo lint
```

Base de données : exécuter les fichiers de `supabase/migrations/` dans l'ordre (SQL Editor de Supabase).

## Publication et mises à jour automatiques

Chaque **tag `vX.Y.Z`** déclenche [GitHub Actions](.github/workflows/release-android.yml) :
tests → APK signé → **GitHub Release**. Sur le téléphone, l'app gratuite
[Obtainium](https://github.com/ImranR98/Obtainium) suit ces Releases et installe les mises à jour.

### Configuration unique (Settings → Secrets and variables → Actions)

| Type | Nom | Valeur |
|---|---|---|
| Secret | `ANDROID_KEYSTORE_BASE64` | `base64 -w0 ~/.mongeton/mongeton-release.jks` |
| Secret | `MONGETON_KEYSTORE_PASSWORD` | dans `~/.mongeton/release-signing.env` |
| Secret | `MONGETON_KEY_PASSWORD` | dans `~/.mongeton/release-signing.env` |
| Variable | `MONGETON_KEY_ALIAS` | `mongeton` |
| Variable | `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| Variable | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé *publishable* (publique par conception) |

> La clé de signature (`~/.mongeton/`) ne doit **jamais** être commitée ni perdue :
> sans elle, les téléphones refuseront les mises à jour. Garde une copie de sauvegarde.

### Publier une nouvelle version

Une seule commande (vérifie types / lint / tests, incrémente `version` et `versionCode`,
commit, tag et push) :

```bash
npm run release            # correctif : 1.2.0 -> 1.2.1
npm run release -- minor   # nouveautés : 1.2.0 -> 1.3.0
npm run release -- major   # 1.2.0 -> 2.0.0
```

GitHub Actions construit alors l'APK signé et publie la Release ; Obtainium la propose aux téléphones.

### Installer et recevoir les mises à jour (téléphone Android)

1. Installer **Obtainium** (depuis ses Releases GitHub ou F-Droid).
2. *Add App* → URL : `https://github.com/SERGELEBON/mongeton` → *Add*.
3. Obtainium installe Mongeton puis vérifie les nouvelles versions en arrière-plan.

### Build local signé

```bash
set -a; . ~/.mongeton/release-signing.env; set +a
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

## Licence

Projet privé — tous droits réservés.
