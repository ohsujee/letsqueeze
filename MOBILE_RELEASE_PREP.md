# LetsQueeze - Préparation Release Mobile

> Guide complet pour préparer l'application iOS et Android pour publication.
> Généré le 2026-01-09

---

## Résumé Exécutif

| Élément | Android | iOS |
|---------|---------|-----|
| **Config Capacitor** | 🔴 IP dev hardcodée | 🔴 IP dev hardcodée |
| **Firebase Config** | ✅ google-services.json OK | 🔴 GoogleService-Info.plist MANQUANT |
| **AdMob App ID** | ✅ Configuré | 🔴 GADApplicationIdentifier MANQUANT |
| **AdMob Interstitial** | 🔴 Placeholder | 🔴 Placeholder |
| **AdMob Rewarded** | ✅ Configuré | ✅ Configuré |
| **RevenueCat** | 🔴 Clé placeholder | 🔴 Clé placeholder |
| **OAuth/Deep Links** | 🔴 Intent filter manquant | 🔴 URL schemes manquants |
| **Signing** | 🔴 Non configuré | 🔴 Non configuré |
| **BlindTest (Spotify)** | 🔴 NE FONCTIONNE PAS | 🔴 NE FONCTIONNE PAS |
| **DeezTest** | ✅ Fonctionne | ✅ Fonctionne |
| **Permissions** | ✅ OK | 🟠 Incomplètes |

---

# PROBLÈME CRITIQUE: BlindTest/Spotify

## Le Spotify Web Playback SDK ne fonctionne PAS sur mobile

| Plateforme | BlindTest | DeezTest | Raison |
|------------|-----------|----------|--------|
| iOS Safari | ❌ | ✅ | Apple bloque le SDK |
| iOS App (Capacitor) | ❌ | ✅ | WebView = Safari |
| Android Chrome | ✅ | ✅ | Chrome supporte le SDK |
| Android App (Capacitor) | ❌ | ✅ | WebView ≠ Chrome |
| Desktop Chrome/Edge | ✅ | ✅ | Support complet |

### Solution Recommandée

**Option A (Rapide):** Désactiver BlindTest sur mobile
```javascript
// Dans lib/config/games.js ou composant BlindTest
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();
// Si isNativeApp, masquer BlindTest ou afficher message
```

**Option B (Long terme):** Utiliser le SDK Spotify natif (iOS/Android)
- Nécessite développement natif
- Plugins Capacitor à créer

---

# SECTION 1: CONFIGURATION COMMUNE

## 1.1 Capacitor Config - URL Serveur

**Fichier:** `capacitor.config.ts`

### Actuel (DEV) ❌
```typescript
server: {
  url: 'http://192.168.1.141:3000',
  cleartext: true,
}
```

### Production ✅
```typescript
server: {
  // Supprimer url pour utiliser le build local
  // OU pointer vers votre domaine de production:
  // url: 'https://letsqueeze.app',
  androidScheme: 'https',
  iosScheme: 'https',
}
```

**Important:** Après modification, exécuter:
```bash
npx cap sync
```

---

## 1.2 AdMob - Créer les Interstitials

**Fichier:** `lib/admob.js`

### Actuel ❌
```javascript
const AD_UNIT_IDS = {
  ios: {
    interstitial: 'ca-app-pub-1140758415112389/XXXXXXXXXX',  // TODO
    rewarded: 'ca-app-pub-1140758415112389/5594671010',      // OK
  },
  android: {
    interstitial: 'ca-app-pub-1140758415112389/XXXXXXXXXX',  // TODO
    rewarded: 'ca-app-pub-1140758415112389/6397628551',      // OK
  }
};
```

### Actions requises:
1. Aller sur [AdMob Console](https://admob.google.com)
2. Apps → Gigglz iOS → Ad units → Create ad unit → Interstitial
3. Apps → Gigglz Android → Ad units → Create ad unit → Interstitial
4. Copier les IDs et remplacer les `XXXXXXXXXX`

---

## 1.3 RevenueCat - Configurer les Clés API

**Fichier:** `lib/revenuecat.js`

### Actuel ❌
```javascript
const REVENUECAT_API_KEYS = {
  ios: 'appl_XXXXXXXXXXXXXXXX',     // TODO
  android: 'goog_XXXXXXXXXXXXXXXX'  // TODO
};
```

### Actions requises:
1. Aller sur [RevenueCat Dashboard](https://app.revenuecat.com)
2. Project Settings → API Keys
3. Copier iOS Public API Key (commence par `appl_`)
4. Copier Android Public API Key (commence par `goog_`)

### Produits à créer:

**App Store Connect (iOS):**
| Product ID | Type | Prix |
|------------|------|------|
| `gigglz_pro_monthly` | Auto-Renewable Subscription | 3,99 €/mois |
| `gigglz_pro_annual` | Auto-Renewable Subscription | 29,99 €/an |

**Google Play Console (Android):**
| Product ID | Type | Prix |
|------------|------|------|
| `gigglz_pro_monthly` | Subscription | 3,99 €/mois |
| `gigglz_pro_annual` | Subscription | 29,99 €/an |

---

## 1.4 Spotify - URL de Callback Production

**Fichier:** `.env.local` ou `.env.production`

### Actuel (DEV) ❌
```
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://ja-subloral-estella.ngrok-free.dev/api/spotify/callback
```

### Production ✅
```
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://letsqueeze.app/api/spotify/callback
```

**Aussi dans Spotify Developer Dashboard:**
1. [Spotify Developer](https://developer.spotify.com/dashboard)
2. App → Settings → Redirect URIs
3. Ajouter: `https://letsqueeze.app/api/spotify/callback`
4. Ajouter: `https://letsqueeze.app/blindtest/spotify-callback`

---

# SECTION 2: iOS

## 2.1 GoogleService-Info.plist (OBLIGATOIRE)

**Status:** ❌ MANQUANT

### Actions:
1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Your apps → iOS app
3. Télécharger `GoogleService-Info.plist`
4. Dans Xcode: Glisser le fichier dans `ios/App/App/`
5. Cocher "Copy items if needed"

---

## 2.2 Info.plist - Modifications Requises

**Fichier:** `ios/App/App/Info.plist`

### Ajouter ces clés (avant `</dict></plist>`):

```xml
<!-- 1. AdMob App ID (OBLIGATOIRE pour que les pubs marchent) -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-1140758415112389~9949860754</string>

<!-- 2. Permissions utilisateur -->
<key>NSUserTrackingUsageDescription</key>
<string>Cette autorisation permet d'afficher des publicités personnalisées.</string>

<!-- 3. URL Schemes pour OAuth callbacks -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.gigglz.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.gigglz.app</string>
            <string>gigglz</string>
        </array>
    </dict>
</array>

<!-- 4. Apps externes autorisées (pour ouvrir Spotify, etc.) -->
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>spotify</string>
    <string>googlechrome</string>
    <string>comgoogleusercontent.apps.1027748327177-qaiocif72fo1ddgvl2n5h89pq78tdm9g</string>
</array>

<!-- 5. App Transport Security (si besoin de HTTP en dev) -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

### Modifier cette clé existante:

```xml
<!-- AVANT (obsolète) -->
<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>armv7</string>
</array>

<!-- APRÈS (iOS moderne) -->
<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arm64</string>
</array>
```

---

## 2.3 iOS Signing (Xcode)

### Actions dans Xcode:

1. Ouvrir le projet:
   ```bash
   npx cap open ios
   ```

2. Dans Xcode:
   - Sélectionner le projet "App" dans le navigator
   - Target "App" → Signing & Capabilities
   - Team: Sélectionner votre Apple Developer Team
   - Bundle Identifier: `com.gigglz.app`
   - Cocher "Automatically manage signing"

3. Pour distribution App Store:
   - Product → Archive
   - Distribute App → App Store Connect

---

## 2.4 Checklist iOS

```
CONFIGURATION:
[ ] GoogleService-Info.plist ajouté dans Xcode
[ ] GADApplicationIdentifier dans Info.plist
[ ] URL Schemes configurés dans Info.plist
[ ] LSApplicationQueriesSchemes configurés
[ ] armv7 → arm64 dans UIRequiredDeviceCapabilities
[ ] NSUserTrackingUsageDescription ajouté

ADMOB:
[ ] Interstitial iOS créé dans AdMob Console
[ ] ID copié dans lib/admob.js

REVENUECAT:
[ ] Clé API iOS récupérée
[ ] Produits créés dans App Store Connect
[ ] Shared Secret configuré dans RevenueCat

SIGNING:
[ ] Apple Developer Account actif
[ ] Team sélectionné dans Xcode
[ ] Provisioning profiles générés
[ ] Certificat de distribution créé

BUILD:
[ ] Capacitor sync: npx cap sync ios
[ ] Build test sur device/simulateur
[ ] Archive pour App Store
```

---

# SECTION 3: Android

## 3.1 AndroidManifest.xml - Intent Filters

**Fichier:** `android/app/src/main/AndroidManifest.xml`

### Ajouter dans `<activity>` (après l'intent-filter LAUNCHER existant):

```xml
<!-- Deep linking pour OAuth callbacks -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.gigglz.app" />
</intent-filter>

<!-- Deep linking HTTPS (si domaine vérifié) -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="letsqueeze.app"
        android:pathPrefix="/api/spotify/callback" />
</intent-filter>
```

---

## 3.2 Android Signing - Keystore

### Créer un keystore de release:

```bash
cd android/app

keytool -genkey -v \
  -keystore gigglz-release.keystore \
  -alias gigglz \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**IMPORTANT:**
- Sauvegarder le keystore et les mots de passe en lieu sûr
- NE JAMAIS commiter le keystore dans git
- Ajouter `*.keystore` au `.gitignore`

### Créer `android/keystore.properties`:

```properties
storePassword=VOTRE_MOT_DE_PASSE_STORE
keyPassword=VOTRE_MOT_DE_PASSE_KEY
keyAlias=gigglz
storeFile=gigglz-release.keystore
```

**Ajouter au `.gitignore`:**
```
android/keystore.properties
android/app/*.keystore
```

### Modifier `android/app/build.gradle`:

```gradle
// Au début du fichier, après "apply plugin"
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }

    buildTypes {
        release {
            minifyEnabled true  // Activer pour production
            signingConfig signingConfigs.release
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 3.3 Firebase - Mettre à jour le Certificate Hash

Après création du keystore de release:

```bash
# Obtenir le SHA-1 du keystore de release
keytool -list -v -keystore android/app/gigglz-release.keystore -alias gigglz
```

1. Copier le SHA-1 (sans les `:`)
2. Aller sur Firebase Console → Project Settings → Your apps → Android
3. Ajouter le SHA-1 fingerprint
4. Re-télécharger `google-services.json`
5. Remplacer `android/app/google-services.json`

---

## 3.4 Checklist Android

```
CONFIGURATION:
[ ] Intent filters ajoutés dans AndroidManifest.xml
[ ] google-services.json à jour avec SHA-1 de release
[ ] URL de production dans capacitor.config.ts

ADMOB:
[ ] Interstitial Android créé dans AdMob Console
[ ] ID copié dans lib/admob.js
[ ] APPLICATION_ID vérifié dans AndroidManifest.xml (déjà OK)

REVENUECAT:
[ ] Clé API Android récupérée
[ ] Produits créés dans Google Play Console
[ ] Licence key configurée dans RevenueCat

SIGNING:
[ ] Keystore créé (gigglz-release.keystore)
[ ] keystore.properties créé
[ ] build.gradle configuré avec signingConfigs
[ ] SHA-1 ajouté dans Firebase Console
[ ] google-services.json mis à jour

BUILD:
[ ] Capacitor sync: npx cap sync android
[ ] Build debug test: npx cap run android
[ ] Build release: cd android && ./gradlew assembleRelease
[ ] Test APK release sur device
[ ] Bundle AAB pour Play Store: ./gradlew bundleRelease
```

---

# SECTION 4: Commandes de Build

## Development

```bash
# Sync les changements vers les projets natifs
npx cap sync

# Lancer sur Android
npx cap run android

# Lancer sur iOS
npx cap run ios

# Ouvrir dans l'IDE
npx cap open android
npx cap open ios
```

## Production

### Android

```bash
# Build le projet Next.js
npm run build

# Sync vers Android
npx cap sync android

# Build APK release
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk

# Build AAB pour Play Store
./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS

```bash
# Build le projet Next.js
npm run build

# Sync vers iOS
npx cap sync ios

# Ouvrir Xcode
npx cap open ios

# Dans Xcode:
# Product → Archive
# Window → Organizer → Distribute App
```

---

# SECTION 5: Tests Pré-Publication

## Tests Fonctionnels

| Test | Android | iOS |
|------|---------|-----|
| Création de compte Google | [ ] | [ ] |
| Création de compte Apple | N/A | [ ] |
| Création room Quiz | [ ] | [ ] |
| Rejoindre room Quiz | [ ] | [ ] |
| Jouer partie Quiz complète | [ ] | [ ] |
| DeezTest - création room | [ ] | [ ] |
| DeezTest - lecture audio | [ ] | [ ] |
| BlindTest - message "non supporté" | [ ] | [ ] |
| Alibi - partie complète | [ ] | [ ] |
| Mime - partie locale | [ ] | [ ] |
| Trouve la Règle - partie complète | [ ] | [ ] |
| Pub interstitielle affichée | [ ] | [ ] |
| Pub rewarded fonctionne | [ ] | [ ] |
| Achat abonnement | [ ] | [ ] |
| Restauration achat | [ ] | [ ] |

## Tests de Robustesse

| Test | Android | iOS |
|------|---------|-----|
| App en arrière-plan pendant jeu | [ ] | [ ] |
| Perte de connexion WiFi | [ ] | [ ] |
| Rotation écran | [ ] | [ ] |
| Notification pendant jeu | [ ] | [ ] |
| Multitâche (switch app) | [ ] | [ ] |

---

# SECTION 6: Résumé des Fichiers à Modifier

## Fichiers Communs
- [ ] `capacitor.config.ts` - URL serveur
- [ ] `lib/admob.js` - IDs interstitial
- [ ] `lib/revenuecat.js` - Clés API
- [ ] `.env.production` - URLs Spotify

## Fichiers iOS
- [ ] `ios/App/App/Info.plist` - Permissions, URL schemes, AdMob ID
- [ ] `ios/App/App/GoogleService-Info.plist` - À télécharger

## Fichiers Android
- [ ] `android/app/src/main/AndroidManifest.xml` - Intent filters
- [ ] `android/app/build.gradle` - Signing config
- [ ] `android/keystore.properties` - À créer
- [ ] `android/app/google-services.json` - À mettre à jour avec SHA-1

---

# SECTION 7: Contacts & Ressources

## Consoles

| Service | URL |
|---------|-----|
| Firebase Console | https://console.firebase.google.com |
| AdMob Console | https://admob.google.com |
| RevenueCat Dashboard | https://app.revenuecat.com |
| Spotify Developer | https://developer.spotify.com/dashboard |
| Apple Developer | https://developer.apple.com |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |

## Documentation

| Sujet | Lien |
|-------|------|
| Capacitor iOS | https://capacitorjs.com/docs/ios |
| Capacitor Android | https://capacitorjs.com/docs/android |
| AdMob Capacitor | https://github.com/capacitor-community/admob |
| RevenueCat Capacitor | https://docs.revenuecat.com/docs/capacitor |

---

*Dernière mise à jour: 2026-01-09*
