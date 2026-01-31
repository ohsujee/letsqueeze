# LetsQueeze - Préparation Release Mobile

> Guide complet pour préparer l'application iOS et Android pour publication.
> Inclut: Configuration, RevenueCat, AdMob, Signing, Build

---

## 🎯 PROGRESS TRACKER

> Mis à jour: 2026-01-30

### Phase 1: Comptes & Accès ✅
- [x] Apple Developer Account actif (99€/an)
- [x] Google Play Developer Account actif (25€ one-time)
- [x] RevenueCat account créé (gratuit)
- [x] AdMob account actif

### Phase 2: RevenueCat Dashboard ✅
- [x] Projet "Gigglz" créé dans RevenueCat
- [x] App iOS ajoutée (Bundle ID: com.gigglz.app)
- [x] App Android ajoutée (Package: com.gigglz.app)
- [x] Entitlement "Gigglz Pro" créé
- [x] Offering "default" créé
- [x] API Key iOS récupérée (appl_xxx)
- [x] API Key Android récupérée (goog_xxx)

### Phase 3: App Store Connect (iOS) ✅
- [x] App créée dans App Store Connect
- [x] Groupe d'abonnement "Gigglz Pro" créé
- [x] IAP: gigglz_pro_monthly (4,99€/mois)
- [x] IAP: gigglz_pro_annual (29,99€/an)
- [x] P8 Key configurée dans RevenueCat (remplace Shared Secret)

### Phase 4: Google Play Console (Android)
- [x] App créée dans Play Console
- [x] Service Account créé (Google Cloud)
- [x] Service Account JSON uploadé dans RevenueCat
- [ ] Subscription: gigglz_pro_monthly (4,99€/mois) ⏳ Nécessite APK uploadé
- [ ] Subscription: gigglz_pro_annual (29,99€/an) ⏳ Nécessite APK uploadé

### Phase 5: Configuration iOS ⏳ (Nécessite Mac ou Codemagic)
- [x] GoogleService-Info.plist téléchargé
- [ ] GoogleService-Info.plist ajouté au projet Xcode
- [ ] Info.plist: GADApplicationIdentifier ajouté
- [ ] Info.plist: NSUserTrackingUsageDescription ajouté
- [ ] Info.plist: CFBundleURLTypes ajouté
- [ ] Info.plist: LSApplicationQueriesSchemes ajouté
- [ ] Info.plist: armv7 → arm64
- [ ] Xcode: Team sélectionné
- [ ] Xcode: Signing configuré

### Phase 6: Configuration Android ✅
- [x] Keystore créé (gigglz-release.keystore)
- [x] keystore.properties créé
- [x] build.gradle: signingConfigs ajouté
- [x] SHA-1 release ajouté dans Firebase
- [ ] google-services.json mis à jour (optionnel - re-télécharger si besoin)
- [x] AndroidManifest: Intent filters ajoutés
- [x] .gitignore mis à jour

### Phase 7: Code & Config ✅
- [x] capacitor.config.ts: URL production (app.gigglz.fun)
- [x] lib/admob.js: Interstitial iOS ID
- [x] lib/admob.js: Interstitial Android ID
- [x] lib/revenuecat.js: API Key iOS
- [x] lib/revenuecat.js: API Key Android
- [x] .env.production: REVENUECAT_WEBHOOK_SECRET (Vercel)
- [x] Webhook configuré dans RevenueCat

### Phase 8: Build & Test
- [ ] npx cap sync
- [ ] Test iOS Simulator
- [ ] Test Android Emulator
- [ ] Test sur device iOS réel
- [ ] Test sur device Android réel
- [ ] Test achat sandbox iOS
- [ ] Test achat sandbox Android
- [ ] Archive iOS pour App Store
- [ ] Bundle AAB pour Play Store

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

---

# ⚠️ PROBLÈME CRITIQUE: BlindTest/Spotify

Le Spotify Web Playback SDK **ne fonctionne PAS sur mobile**.

| Plateforme | BlindTest | DeezTest | Raison |
|------------|-----------|----------|--------|
| iOS Safari | ❌ | ✅ | Apple bloque le SDK |
| iOS App (Capacitor) | ❌ | ✅ | WebView = Safari |
| Android Chrome | ✅ | ✅ | Chrome supporte le SDK |
| Android App (Capacitor) | ❌ | ✅ | WebView ≠ Chrome |
| Desktop Chrome/Edge | ✅ | ✅ | Support complet |

**Solution:** Désactiver BlindTest sur mobile ou afficher message "Desktop Only"

```javascript
import { Capacitor } from '@capacitor/core';
const isNativeApp = Capacitor.isNativePlatform();
// Si isNativeApp → masquer BlindTest ou afficher message
```

---

# PHASE 1: COMPTES & ACCÈS

## 1.1 Apple Developer Account (99€/an)

1. Aller sur [developer.apple.com](https://developer.apple.com)
2. S'inscrire au Apple Developer Program
3. Payer 99€/an
4. Attendre validation (24-48h)

**Vérification:** Accès à [App Store Connect](https://appstoreconnect.apple.com)

## 1.2 Google Play Developer Account (25€ one-time)

1. Aller sur [play.google.com/console](https://play.google.com/console)
2. Créer un compte développeur
3. Payer 25€ (une seule fois)

**Vérification:** Accès à Google Play Console

## 1.3 RevenueCat Account (Gratuit)

1. Aller sur [revenuecat.com](https://www.revenuecat.com)
2. Créer un compte (gratuit jusqu'à 2500$/mois de revenus)
3. Créer un nouveau projet nommé "Gigglz"

**Vérification:** Projet visible dans le dashboard

## 1.4 AdMob Account

1. Aller sur [admob.google.com](https://admob.google.com)
2. Se connecter avec compte Google
3. Vérifier que les apps Gigglz iOS/Android existent

**App IDs existants:**
- iOS: `ca-app-pub-1140758415112389~9949860754`
- Android: `ca-app-pub-1140758415112389~6606152744`

---

# PHASE 2: REVENUECAT DASHBOARD

## 2.1 Créer le projet

1. RevenueCat Dashboard → Projects → New Project
2. Nom: `Gigglz`

## 2.2 Ajouter l'app iOS

1. Project → Apps → + New App
2. Platform: **App Store**
3. App name: `Gigglz iOS`
4. Bundle ID: `com.gigglz.app`

## 2.3 Ajouter l'app Android

1. Project → Apps → + New App
2. Platform: **Play Store**
3. App name: `Gigglz Android`
4. Package name: `com.gigglz.app`

## 2.4 Créer l'Entitlement

1. Project → Entitlements → + New
2. Identifier: `pro`
3. Description: `Accès Pro complet - Tous les jeux, pas de pubs, pas de limites`

## 2.5 Créer l'Offering

1. Project → Offerings → + New
2. Identifier: `default`
3. Description: `Offre standard`

## 2.6 Récupérer les API Keys

1. Project → API Keys
2. Copier **Public API Key** pour iOS (commence par `appl_`)
3. Copier **Public API Key** pour Android (commence par `goog_`)

**⚠️ GARDER CES CLÉS** - On les ajoutera dans le code à la Phase 7

---

# PHASE 3: APP STORE CONNECT (iOS)

## 3.1 Créer l'app

1. [App Store Connect](https://appstoreconnect.apple.com) → Apps → "+"
2. **New App**
3. Platforms: iOS
4. Name: `Gigglz`
5. Primary Language: French
6. Bundle ID: `com.gigglz.app`
7. SKU: `gigglz-app`
8. User Access: Full Access

## 3.2 Créer le groupe d'abonnement

1. App → Features → In-App Purchases → Manage
2. Subscription Groups → "+"
3. Reference Name: `Gigglz Pro`

## 3.3 Créer l'abonnement mensuel

1. Dans le groupe "Gigglz Pro" → "+"
2. Type: **Auto-Renewable Subscription**
3. Reference Name: `Gigglz Pro Mensuel`
4. Product ID: `gigglz_pro_monthly`
5. Subscription Duration: 1 Month
6. Subscription Prices → Add Price:
   - Country: France
   - Price: 4,99 €
7. App Store Localization:
   - Display Name: `Gigglz Pro Mensuel`
   - Description: `Accès illimité à tous les jeux, sans publicités`

## 3.4 Créer l'abonnement annuel

1. Dans le groupe "Gigglz Pro" → "+"
2. Type: **Auto-Renewable Subscription**
3. Reference Name: `Gigglz Pro Annuel`
4. Product ID: `gigglz_pro_annual`
5. Subscription Duration: 1 Year
6. Subscription Prices → Add Price:
   - Country: France
   - Price: 29,99 €
7. App Store Localization:
   - Display Name: `Gigglz Pro Annuel`
   - Description: `Accès illimité à tous les jeux, sans publicités - Économisez 37%`

## 3.5 Générer le Shared Secret

1. App Store Connect → Users and Access → Keys
2. In-App Purchase → Generate
3. Copier le **App-Specific Shared Secret**

## 3.6 Connecter à RevenueCat

1. RevenueCat → Project → iOS App → App Store Connect
2. Coller le **App-Specific Shared Secret**
3. Save

---

# PHASE 4: GOOGLE PLAY CONSOLE (Android)

## 4.1 Créer l'app

1. [Google Play Console](https://play.google.com/console) → All apps → Create app
2. App name: `Gigglz`
3. Default language: French
4. App or game: Game
5. Free or paid: Free
6. Declarations: Accept all

## 4.2 Créer un Service Account

Pour que RevenueCat puisse vérifier les achats:

1. [Google Cloud Console](https://console.cloud.google.com)
2. IAM & Admin → Service Accounts → Create
3. Name: `revenuecat-gigglz`
4. Role: None (on configure dans Play Console)
5. Create Key → JSON → Download

## 4.3 Lier le Service Account à Play Console

1. Google Play Console → Users and permissions → Invite new users
2. Email: `revenuecat-gigglz@[project].iam.gserviceaccount.com`
3. Permissions:
   - View app information and download bulk reports
   - View financial data, orders, and cancellation survey responses
   - Manage orders and subscriptions
4. Add user

## 4.4 Connecter à RevenueCat

1. RevenueCat → Project → Android App → Play Store Credentials
2. Upload le fichier JSON du Service Account
3. Save

## 4.5 Créer l'abonnement mensuel

1. Play Console → App → Monetize → Products → Subscriptions → Create
2. Product ID: `gigglz_pro_monthly`
3. Name: `Gigglz Pro Mensuel`
4. Description: `Accès illimité à tous les jeux, sans publicités`
5. Benefits: (optionnel)
6. Base plans → Create base plan:
   - ID: `monthly`
   - Billing period: 1 month
   - Price: 4,99 €

## 4.6 Créer l'abonnement annuel

1. Create subscription
2. Product ID: `gigglz_pro_annual`
3. Name: `Gigglz Pro Annuel`
4. Description: `Accès illimité à tous les jeux - Économisez 37%`
5. Base plans → Create base plan:
   - ID: `annual`
   - Billing period: 1 year
   - Price: 29,99 €

## 4.7 Configurer les produits dans RevenueCat

1. RevenueCat → Offerings → `default`
2. Add Package:
   - Identifier: `$rc_monthly`
   - Product: iOS `gigglz_pro_monthly` + Android `gigglz_pro_monthly`
3. Add Package:
   - Identifier: `$rc_annual`
   - Product: iOS `gigglz_pro_annual` + Android `gigglz_pro_annual`
4. Assign to Entitlement `pro`

---

# PHASE 5: CONFIGURATION iOS

## 5.1 GoogleService-Info.plist (OBLIGATOIRE)

**Status actuel:** ❌ MANQUANT

1. [Firebase Console](https://console.firebase.google.com) → Project Settings
2. Your apps → iOS app (com.gigglz.app)
3. Download `GoogleService-Info.plist`
4. Ouvrir Xcode: `npx cap open ios`
5. Drag & drop dans `ios/App/App/`
6. Cocher "Copy items if needed"
7. Target: App

## 5.2 Info.plist - Modifications

**Fichier:** `ios/App/App/Info.plist`

Ajouter avant `</dict></plist>`:

```xml
<!-- 1. AdMob App ID (OBLIGATOIRE) -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-1140758415112389~9949860754</string>

<!-- 2. Permission tracking publicitaire -->
<key>NSUserTrackingUsageDescription</key>
<string>Cette autorisation permet d'afficher des publicités personnalisées.</string>

<!-- 3. URL Schemes pour OAuth -->
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

<!-- 4. Apps externes (Spotify, Chrome, Google) -->
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>spotify</string>
    <string>googlechrome</string>
    <string>comgoogleusercontent.apps.1027748327177-qaiocif72fo1ddgvl2n5h89pq78tdm9g</string>
</array>
```

Modifier cette clé existante:

```xml
<!-- AVANT -->
<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>armv7</string>
</array>

<!-- APRÈS -->
<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arm64</string>
</array>
```

## 5.3 iOS Signing (Xcode)

1. Ouvrir Xcode: `npx cap open ios`
2. Sélectionner le projet "App" dans le navigator
3. Target "App" → Signing & Capabilities
4. Team: Sélectionner votre Apple Developer Team
5. Bundle Identifier: `com.gigglz.app`
6. Cocher "Automatically manage signing"

---

# PHASE 6: CONFIGURATION ANDROID

## 6.1 Créer le Keystore

```bash
cd android/app

keytool -genkey -v \
  -keystore gigglz-release.keystore \
  -alias gigglz \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Répondre aux questions:**
- Mot de passe keystore: (choisir et NOTER)
- Prénom/Nom: Votre nom
- Organisation: Gigglz
- Ville, Province, Pays: Vos infos

**⚠️ SAUVEGARDER LE KEYSTORE ET LES MOTS DE PASSE EN LIEU SÛR**

## 6.2 Créer keystore.properties

**Fichier:** `android/keystore.properties`

```properties
storePassword=VOTRE_MOT_DE_PASSE_STORE
keyPassword=VOTRE_MOT_DE_PASSE_KEY
keyAlias=gigglz
storeFile=gigglz-release.keystore
```

## 6.3 Configurer build.gradle

**Fichier:** `android/app/build.gradle`

Ajouter au début du fichier (après `apply plugin`):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Ajouter dans le bloc `android { }`:

```gradle
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
            minifyEnabled true
            signingConfig signingConfigs.release
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 6.4 Mettre à jour .gitignore

Ajouter au `.gitignore`:

```
# Android signing
android/keystore.properties
android/app/*.keystore
```

## 6.5 Ajouter SHA-1 dans Firebase

1. Obtenir le SHA-1 du keystore de release:
```bash
keytool -list -v -keystore android/app/gigglz-release.keystore -alias gigglz
```

2. Copier le SHA-1 (format: `XX:XX:XX:...`)
3. Firebase Console → Project Settings → Android app
4. Add fingerprint → Coller le SHA-1
5. Re-télécharger `google-services.json`
6. Remplacer `android/app/google-services.json`

## 6.6 AndroidManifest - Intent Filters

**Fichier:** `android/app/src/main/AndroidManifest.xml`

Ajouter dans `<activity>` (après l'intent-filter LAUNCHER existant):

```xml
<!-- Deep linking pour OAuth callbacks -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.gigglz.app" />
</intent-filter>

<!-- Deep linking HTTPS -->
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

# PHASE 7: CODE & CONFIG

## 7.1 Capacitor Config - URL Production

**Fichier:** `capacitor.config.ts`

```typescript
// ACTUEL (DEV) ❌
server: {
  url: 'http://192.168.1.141:3000',
  cleartext: true,
}

// PRODUCTION ✅
server: {
  // Supprimer url pour utiliser le build local
  // OU pointer vers le domaine de production:
  // url: 'https://letsqueeze.app',
  androidScheme: 'https',
  iosScheme: 'https',
}
```

## 7.2 AdMob - IDs Interstitial

**Fichier:** `lib/admob.js`

1. [AdMob Console](https://admob.google.com) → Apps → Gigglz iOS
2. Ad units → Create ad unit → **Interstitial**
3. Copier l'ID

4. Apps → Gigglz Android → Ad units → Create → **Interstitial**
5. Copier l'ID

```javascript
const AD_UNIT_IDS = {
  ios: {
    interstitial: 'ca-app-pub-1140758415112389/XXXXXXXXXX',  // ← Remplacer
    rewarded: 'ca-app-pub-1140758415112389/5594671010',      // OK
  },
  android: {
    interstitial: 'ca-app-pub-1140758415112389/XXXXXXXXXX',  // ← Remplacer
    rewarded: 'ca-app-pub-1140758415112389/6397628551',      // OK
  }
};
```

## 7.3 RevenueCat - API Keys

**Fichier:** `lib/revenuecat.js`

```javascript
const REVENUECAT_API_KEYS = {
  ios: 'appl_XXXXXXXXXXXXXXXX',     // ← Clé de la Phase 2.6
  android: 'goog_XXXXXXXXXXXXXXXX'  // ← Clé de la Phase 2.6
};
```

## 7.4 RevenueCat Webhook

1. RevenueCat → Project → Integrations → Webhooks
2. Add endpoint: `https://letsqueeze.app/api/webhooks/revenuecat`
3. Events: All subscription events
4. Authorization header: `Bearer VOTRE_SECRET`

5. Créer `.env.production`:
```
REVENUECAT_WEBHOOK_SECRET=VOTRE_SECRET
```

## 7.5 Spotify Redirect URI

**Fichier:** `.env.production`

```
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://letsqueeze.app/api/spotify/callback
```

Dans [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
1. App → Settings → Redirect URIs
2. Ajouter: `https://letsqueeze.app/api/spotify/callback`

---

# PHASE 8: BUILD & TEST

## 8.1 Sync Capacitor

```bash
npm run build
npx cap sync
```

## 8.2 Test iOS

```bash
# Simulateur
npx cap run ios

# Ouvrir Xcode pour device réel
npx cap open ios
# Sélectionner device → Run
```

## 8.3 Test Android

```bash
# Emulateur
npx cap run android

# Ouvrir Android Studio
npx cap open android
# Sélectionner device → Run
```

## 8.4 Test Achats Sandbox

### iOS Sandbox

1. App Store Connect → Users and Access → Sandbox
2. Create Sandbox Tester (email différent de votre compte)
3. Sur device iOS: Settings → App Store → Sign out
4. Dans l'app: Tenter un achat → Login avec sandbox tester

### Android Test

1. Play Console → App → Testing → Internal testing
2. Create track → Add testers (emails)
3. Publier l'AAB en internal testing
4. Les testeurs peuvent acheter sans être facturés

## 8.5 Build Production

### iOS - Archive

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Dans Xcode:
1. Product → Archive
2. Window → Organizer
3. Distribute App → App Store Connect

### Android - AAB

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

L'AAB est dans: `android/app/build/outputs/bundle/release/app-release.aab`

---

# TESTS PRÉ-PUBLICATION

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
| La Loi - partie complète | [ ] | [ ] |
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

# RESSOURCES & LIENS

| Service | URL |
|---------|-----|
| Firebase Console | https://console.firebase.google.com |
| AdMob Console | https://admob.google.com |
| RevenueCat Dashboard | https://app.revenuecat.com |
| Spotify Developer | https://developer.spotify.com/dashboard |
| Apple Developer | https://developer.apple.com |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |
| Google Cloud Console | https://console.cloud.google.com |

## Documentation

| Sujet | Lien |
|-------|------|
| Capacitor iOS | https://capacitorjs.com/docs/ios |
| Capacitor Android | https://capacitorjs.com/docs/android |
| AdMob Capacitor | https://github.com/capacitor-community/admob |
| RevenueCat Capacitor | https://docs.revenuecat.com/docs/capacitor |
| RevenueCat Webhooks | https://docs.revenuecat.com/docs/webhooks |

---

*Dernière mise à jour: 2026-01-30*
