# LetsQueeze - Préparation Release Mobile

> Guide complet pour préparer l'application iOS et Android pour publication.
> Inclut: Configuration, RevenueCat, AdMob, Signing, Build

---

## 🎯 PROGRESS TRACKER

> Mis à jour: 2026-02-04

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
- [x] Subscription: gigglz_pro_monthly (4,99€/mois)
- [x] Subscription: gigglz_pro_annual (29,99€/an)

### Phase 5: Configuration iOS ✅ (Via Codemagic)
- [x] GoogleService-Info.plist téléchargé
- [x] Codemagic CI/CD configuré
- [x] Certificat iOS Distribution créé
- [x] Provisioning Profile créé
- [x] Build iOS uploadé sur TestFlight
- [x] Testeurs internes configurés

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
- [x] npx cap sync
- [ ] Test iOS Simulator
- [ ] Test Android Emulator
- [ ] Test sur device iOS réel
- [ ] Test sur device Android réel
- [ ] Test achat sandbox iOS
- [ ] Test achat sandbox Android
- [x] Archive iOS pour TestFlight (via Codemagic)
- [x] Bundle AAB pour Play Store (Internal Testing)

### Phase 9: Deep Linking & Partage ⏳
- [ ] Custom URL Scheme (`gigglz://`) configuré iOS
- [ ] Custom URL Scheme (`gigglz://`) configuré Android
- [ ] Landing page web `/join` avec détection plateforme
- [ ] Onboarding guard (vérifie pseudo avant /join)
- [ ] App Links Android (`assetlinks.json`) - après upload Play Console
- [ ] Universal Links iOS (`apple-app-site-association`) - après TestFlight
- [ ] Smart App Banner iOS (meta tag)
- [ ] Test deep link Android
- [ ] Test deep link iOS
- [ ] Test fallback web → store redirect

### Phase 10: Blocage Web Public ⏳
- [ ] Middleware Next.js: bloquer accès web sauf localhost
- [ ] Page "Télécharger l'app" pour visiteurs web
- [ ] Conserver accès API routes (`/api/*`)
- [ ] Exception localhost pour développement

### Phase 11: V2 - Bundle Local (Performance) ⏳
> Actuellement l'app charge depuis Vercel (remote URL). La v2 bundlera le code localement pour un chargement instantané.

- [ ] Configurer Next.js pour export statique (`output: 'export'`)
- [ ] Adapter les routes dynamiques (`[code]`) pour export statique
- [ ] Mettre à jour `capacitor.config.ts`: retirer `server.url`, mettre `webDir: 'out'`
- [ ] Les API routes restent sur Vercel (appelées via fetch)
- [ ] Firebase Realtime Database pour les données temps réel (inchangé)
- [ ] Test de performance (temps de chargement)
- [ ] Workflow de déploiement: build → cap sync → upload stores

**Avantages v2:**
- Chargement instantané (pas de latence réseau pour le code)
- Mode offline partiel possible
- Expérience plus "native"

**Inconvénients v2:**
- Chaque mise à jour nécessite upload sur les stores
- Review Apple/Google pour chaque changement

---

## Résumé Exécutif

> Mis à jour: 2026-02-05

| Élément | Android | iOS |
|---------|---------|-----|
| **Config Capacitor** | ✅ Production URL | ✅ Production URL |
| **Firebase Config** | ✅ google-services.json | ✅ GoogleService-Info.plist |
| **Firebase Auth** | ✅ Google natif | ✅ Google + Apple natif |
| **AdMob App ID** | ✅ Configuré | ✅ Configuré |
| **AdMob Interstitial** | ✅ Configuré | ✅ Configuré |
| **AdMob Rewarded** | ✅ Configuré | ✅ Configuré |
| **RevenueCat** | ✅ Configuré | ✅ Configuré |
| **Signing** | ✅ Keystore configuré | ✅ Via Codemagic |
| **Build CI/CD** | ✅ Codemagic | ✅ Codemagic |
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

# PHASE 9: DEEP LINKING & PARTAGE

## Objectif

Quand un utilisateur scanne le QR code ou clique sur un lien de partage:
1. **Si app installée** → Ouvre l'app directement sur `/join?code=XXX`
2. **Si app non installée** → Redirige vers le store approprié (iOS/Android)
3. **Si desktop** → Affiche page "Téléchargez l'application"

## Flux Utilisateur

```
Scan QR Code → https://app.gigglz.fun/join?code=ABC123
                         ↓
                [Détection plateforme]
                    ↓         ↓           ↓
              iOS App    Android App    Desktop/Web
                ↓              ↓             ↓
         [Universal     [App Link]    [Page "Télécharger"]
          Link]              ↓             ↓
              ↓         Ouvre app    Store buttons
         Ouvre app           ↓
              ↓         [Onboarding OK?]
         [Onboarding         ↓    ↓
          OK?]             Oui   Non
           ↓    ↓           ↓     ↓
          Oui   Non      /join  /onboarding
           ↓     ↓                  ↓
        /join  /onboarding    puis /join
                  ↓
             puis /join
```

## 9.1 Custom URL Scheme (Fonctionne sans store)

### iOS - Info.plist

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.gigglz.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>gigglz</string>
        </array>
    </dict>
</array>
```

### Android - AndroidManifest.xml

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="gigglz" />
</intent-filter>
```

**Test:** `gigglz://join?code=ABC123`

## 9.2 Universal Links (iOS) - Après TestFlight

### Fichier: `public/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.gigglz.app",
        "paths": ["/join", "/join/*", "/join?*"]
      }
    ]
  }
}
```

**Remplacer `TEAM_ID` par ton Apple Team ID**

### Info.plist - Associated Domains

```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:app.gigglz.fun</string>
</array>
```

## 9.3 App Links (Android) - Après Play Console Upload

### Fichier: `public/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.gigglz.app",
    "sha256_cert_fingerprints": ["SHA256_FINGERPRINT_HERE"]
  }
}]
```

**Obtenir SHA256:**
```bash
keytool -list -v -keystore android/app/gigglz-release.keystore -alias gigglz | grep SHA256
```

### AndroidManifest.xml - Intent Filter

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="app.gigglz.fun" android:pathPrefix="/join" />
</intent-filter>
```

## 9.4 Landing Page Web Intelligente

### Fichier: `app/join/page.jsx` (ou middleware)

```javascript
// Détection plateforme
const userAgent = request.headers.get('user-agent') || '';
const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
const isAndroid = /Android/i.test(userAgent);
const isMobile = isIOS || isAndroid;

// URLs des stores
const IOS_STORE_URL = 'https://apps.apple.com/app/gigglz/idXXXXXXXXX';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gigglz.app';

// Si mobile sans app → redirect store
// Si desktop → page "téléchargez l'app"
```

## 9.5 Onboarding Guard

Dans l'app, vérifier avant d'accéder à `/join`:

```javascript
// lib/hooks/useDeepLinkGuard.js
const hasCompletedOnboarding = () => {
  // Vérifie si:
  // 1. User connecté (Google/Apple) OU
  // 2. Guest avec pseudo défini
  return !!user || !!localStorage.getItem('guestPseudo');
};

// Si deep link arrive et onboarding pas fait:
// 1. Sauvegarder le code dans sessionStorage
// 2. Redirect vers /onboarding
// 3. Après onboarding, redirect vers /join?code=XXX
```

## 9.6 Store URLs (à remplir après publication)

| Plateforme | URL |
|------------|-----|
| iOS App Store | `https://apps.apple.com/app/gigglz/id__________` |
| Google Play | `https://play.google.com/store/apps/details?id=com.gigglz.app` |

---

# PHASE 10: BLOCAGE WEB PUBLIC

## Objectif

- `app.gigglz.fun` ne doit PAS être utilisable comme site web
- Seuls les appels API (`/api/*`) doivent fonctionner
- Exception: `localhost` pour le développement

## Middleware Next.js

```javascript
// middleware.js
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Toujours autoriser localhost
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return NextResponse.next();
  }

  // Toujours autoriser les API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Autoriser les fichiers well-known (deep links)
  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  // Autoriser /join pour le smart redirect
  if (pathname.startsWith('/join')) {
    return NextResponse.next();
  }

  // Bloquer tout le reste → page "Téléchargez l'app"
  return NextResponse.redirect(new URL('/download-app', request.url));
}
```

## Page Download App

Simple page statique avec:
- Logo Gigglz
- "Gigglz est disponible sur mobile uniquement"
- Bouton App Store
- Bouton Google Play

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
| La Règle - partie complète | [ ] | [ ] |
| Pub interstitielle affichée | [ ] | [ ] |
| Pub rewarded fonctionne | [ ] | [ ] |
| Achat abonnement | [ ] | [ ] |
| Restauration achat | [ ] | [ ] |
| Deep link depuis QR code | [ ] | [ ] |
| Deep link sans onboarding → redirect | [ ] | [ ] |
| Fallback web → store redirect | [ ] | [ ] |

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

# PHASE 12: PUBLICATION SUR LES STORES

## 12.1 Informations de base

| Élément | Valeur | Status |
|---------|--------|--------|
| **Nom de l'app** | Gigglz | ✅ |
| **Bundle ID** | com.gigglz.app | ✅ |
| **Version** | 1.0.1 | ✅ |
| **Build iOS** | 5 | ✅ |
| **Développeur** | À définir | ⏳ |
| **Email support** | À définir | ⏳ |
| **Site web** | https://gigglz.fun | ✅ |

## 12.2 Textes Store Listing

### App Store (iOS)

| Élément | Limite | Status | Contenu |
|---------|--------|--------|---------|
| **Nom** | 30 car. | ✅ | Gigglz - Jeux de Soirée |
| **Sous-titre** | 30 car. | ✅ | Quiz, Blindtest & Party Games |
| **Description** | 4000 car. | ✅ | Voir section "CONTENU STORE LISTING" |
| **Mots-clés** | 100 car. | ✅ | Voir section "CONTENU STORE LISTING" |
| **What's New** | 4000 car. | ✅ | Voir section "CONTENU STORE LISTING" |
| **URL Support** | - | ⏳ | |
| **URL Confidentialité** | - | ✅ | https://app.gigglz.fun/privacy |
| **Catégorie principale** | - | ✅ | Jeux |
| **Catégorie secondaire** | - | ✅ | Jeux de société / Trivia |

### Google Play (Android)

| Élément | Limite | Status | Contenu |
|---------|--------|--------|---------|
| **Titre** | 50 car. | ✅ | Gigglz - Jeux de Soirée |
| **Description courte** | 80 car. | ✅ | Voir section "CONTENU STORE LISTING" |
| **Description complète** | 4000 car. | ✅ | Voir section "CONTENU STORE LISTING" |
| **Catégorie** | - | ✅ | Jeux > Casual / Trivia |

## 12.3 Visuels

### Icônes

| Élément | Dimensions | Format | Status |
|---------|------------|--------|--------|
| **Icône iOS** | 1024x1024 | PNG (pas de transparence) | ⏳ |
| **Icône Android** | 512x512 | PNG | ⏳ |

### Tailles Screenshots (2025-2026)

**iOS - Obligatoires:**
| Device | Dimensions | Status |
|--------|------------|--------|
| **iPhone 6.9"** (15 Pro Max) | 1320 x 2868 | ⏳ |
| **iPad 13"** | 2064 x 2752 | ⏳ |

> Note: Les anciennes tailles (5.5", 6.5") ne sont plus obligatoires en 2026.

**Android:**
| Type | Dimensions | Status |
|------|------------|--------|
| **Téléphone** | 1080 x 1920+ | ⏳ |

### Bannières

| Élément | Dimensions | Status |
|---------|------------|--------|
| **Feature Graphic Android** | 1024 x 500 | ⏳ |
| **App Store Preview** (vidéo) | Optionnel | ⏳ |

---

## 12.4 Stratégie Screenshots (Best Practices ASO 2026)

### Règles clés

| Règle | Détail |
|-------|--------|
| ⏱️ **7 secondes** | Temps pour convaincre l'utilisateur |
| 📊 **90% ne scrollent pas** | Au-delà du 3ème screenshot |
| 🎯 **Feature excitante d'abord** | Pas de login, pas de tutorial, pas d'onboarding |
| 🐙 **Mascotte = branding** | Utiliser Giggly sur tous les screenshots |
| ✍️ **Texte court** | 3-5 mots max, format "Verbe + Bénéfice" |

### ❌ Ce qu'il NE FAUT PAS montrer

- Écran de login/onboarding
- Écrans de paramètres
- Pages vides ou de chargement
- Trop de texte

### ✅ Plan des 6 Screenshots

| # | Contenu | Texte overlay | Objectif |
|---|---------|---------------|----------|
| **1** | 🎯 **HÉRO** - Giggly excité + aperçu des 4 jeux | "Tous vos jeux de soirée" | Accroche, montre la variété |
| **2** | 🔴 **QUIZ BUZZER** - Écran de jeu avec buzzer rouge visible | "Buzzez le premier !" | Jeu phare, action visible |
| **3** | 🎵 **BLINDTEST** - Écran avec waveform/musique en cours | "Devinez la chanson" | Différenciant, musical |
| **4** | 🕵️ **ALIBI** - Interrogatoire ou cartes suspect/inspecteur | "Bluffez vos amis" | Intrigue, unique |
| **5** | 👥 **LOBBY** - Joueurs connectés + QR code visible | "Rejoignez en 2 sec" | Facilité, aspect social |
| **6** | 🏆 **PODIUM** - Écran de fin avec classement + confettis | "Qui sera champion ?" | Récompense, motivation |

### 🐙 Utilisation de Giggly (Mascotte)

| Placement | Usage |
|-----------|-------|
| **Screenshot 1 (héro)** | Giggly en grand, excité, présentant les jeux |
| **Coins/badges** | Petit Giggly qui réagit (content, surpris, etc.) |
| **Cohérence** | Même style graphique sur tous les screenshots |

**Objectif:** Créer une identité visuelle forte et reconnaissable (comme Duolingo avec son hibou).

### Checklist Screenshots

- [ ] Screenshot 1: Héro avec Giggly + jeux
- [ ] Screenshot 2: Quiz Buzzer en action
- [ ] Screenshot 3: BlindTest musical
- [ ] Screenshot 4: Alibi/enquête
- [ ] Screenshot 5: Lobby avec joueurs
- [ ] Screenshot 6: Podium/classement
- [ ] Tous les textes en français
- [ ] Giggly présent sur chaque image
- [ ] Export aux bonnes dimensions (iOS + Android)

## 12.5 Classification & Age Rating

### Questionnaire (identique iOS/Android)

| Question | Réponse |
|----------|---------|
| Violence | Non |
| Contenu sexuel | Non |
| Langage grossier | Non |
| Substances contrôlées | Non |
| Jeux d'argent simulés | Non |
| Contenu généré par utilisateurs | Oui (pseudos) |
| Partage de localisation | Non |
| Achats intégrés | Oui (abonnement) |
| Publicités | Oui |

**Résultat attendu:** 4+ (iOS) / PEGI 3 ou Everyone (Android)

## 12.6 Informations légales

| Document | URL | Status |
|----------|-----|--------|
| **Politique de confidentialité** | https://app.gigglz.fun/privacy | ✅ |
| **Conditions d'utilisation** | https://app.gigglz.fun/terms | ✅ |
| **Mentions légales** | https://app.gigglz.fun/legal | ✅ |

## 12.7 Checklist Publication

### Pré-soumission

- [ ] Tous les textes rédigés et validés
- [ ] Icônes créées aux bonnes dimensions
- [ ] Captures d'écran créées pour tous les devices
- [ ] Feature Graphic Android créée
- [ ] Age rating complété
- [ ] Informations de contact renseignées
- [ ] Build uploadé et validé par Apple/Google

### App Store (iOS)

- [ ] App Information complétée
- [ ] Pricing and Availability configuré (Gratuit)
- [ ] In-App Purchases liés (gigglz_pro_monthly, gigglz_pro_annual)
- [ ] App Privacy (Data Collection) renseigné
- [ ] App Review Information (contact, notes pour reviewer)
- [ ] Soumission pour review

### Google Play (Android)

- [ ] Store Listing complété
- [ ] Content Rating questionnaire complété
- [ ] Target Audience défini
- [ ] App Content (Data Safety) renseigné
- [ ] Countries/Regions sélectionnés
- [ ] Pricing (Gratuit)
- [ ] Internal Testing → Closed Testing → Open Testing → Production

---

# CONTENU STORE LISTING

## Nom & Sous-titre ✅

| Élément | Contenu | Caractères |
|---------|---------|------------|
| **Nom (iOS & Android)** | `Gigglz - Jeux de Soirée` | 22/30 ✅ |
| **Sous-titre iOS** | `Quiz, Blindtest & Party Games` | 27/30 ✅ |
| **Description courte Android** | `Quiz buzzer, blindtest musical, alibi... Vos jeux de soirée préférés, en multijoueur !` | 79/80 ✅ |

## Mots-clés iOS ✅

```
quiz,blindtest,amis,buzzer,musique,mime,équipe,multijoueur,culture,trivia,groupe,fête,apéro
```
*89/100 caractères*

> Note: "jeux", "soirée", "party", "games" retirés car déjà dans le titre/sous-titre (Apple combine tout).

## Description complète (iOS & Android) ✅

```
Gigglz est l'application ultime qui transforme vos soirées en véritables shows télé ! Quiz buzzer, blindtest musical, jeu d'enquête et mime – tous vos jeux de soirée préférés réunis dans une seule app multijoueur.

Créez une partie, partagez le code et jouez ensemble en temps réel. Chacun sur son téléphone, comme dans un vrai jeu TV !

🎮 Tous les meilleurs jeux de soirée dans une seule app

• Quiz Buzzer – Le plus rapide au buzzer gagne le droit de répondre ! Des dizaines de thèmes : cinéma, musique, sport, histoire, sciences et plus encore. Le jeu de culture générale parfait pour tester vos connaissances entre amis.

• BlindTest Musical – Devinez les chansons le plus vite possible. Des milliers de titres de tous les styles : pop, rock, rap, années 80, Disney... Qui sera le meilleur oreille musicale du groupe ?

• Alibi – Un crime a été commis et vous êtes suspects ! Inventez un alibi cohérent pendant que les inspecteurs cherchent la faille. Un jeu de bluff et de déduction pour les soirées mémorables.

• Mime – Faites deviner des mots uniquement avec des gestes. Le classique indémodable des jeux de groupe, parfait pour les fous rires garantis.

• Et d'autres jeux à venir...

✨ Pourquoi Gigglz est l'app idéale pour vos soirées

• Multijoueur en temps réel – Chacun joue sur son propre téléphone, comme un vrai quiz TV.
• 2 à 20 joueurs – Parfait pour les petits groupes comme les grandes soirées.
• Mode équipes – Formez des équipes et affrontez-vous !
• Rejoignez en 2 secondes – Code ou QR code, c'est ultra simple.
• Classements en direct – Suivez les scores en temps réel.
• Pas besoin de compte – Jouez immédiatement en tant qu'invité.

👑 Gigglz Pro

Passez Pro pour une expérience sans limites :
• Parties illimitées
• Tous les packs de questions débloqués
• Aucune publicité
• Nouvelles fonctionnalités en avant-première

Que ce soit pour un anniversaire, un apéro, une soirée jeux ou un voyage entre amis, Gigglz a toujours un jeu prêt pour animer le groupe. Téléchargez et lancez votre première partie !

📄 Conditions d'utilisation : https://app.gigglz.fun/terms
📄 Politique de confidentialité : https://app.gigglz.fun/privacy
```

## What's New (Notes de version 1.0.1) ✅

```
🎉 Première version publique de Gigglz !

• Quiz Buzzer - Testez vos connaissances
• BlindTest Musical - Devinez les chansons
• Alibi - Jeu d'enquête et de bluff
• Mime - Faites deviner sans parler
• Mode équipes disponible
• Abonnement Pro pour une expérience sans limites
```

## Catégories recommandées

| Store | Catégorie principale | Catégorie secondaire |
|-------|---------------------|---------------------|
| **App Store** | Jeux | Jeux de société / Trivia |
| **Google Play** | Jeux | Casual / Trivia |

## Classification d'âge

| Question | Réponse |
|----------|---------|
| Violence | Non |
| Contenu sexuel | Non |
| Langage grossier | Non |
| Substances contrôlées | Non |
| Jeux d'argent simulés | Non |
| Contenu généré par utilisateurs | Oui (pseudos) |
| Achats intégrés | Oui (abonnement) |
| Publicités | Oui |

**Résultat attendu:** 4+ (iOS) / PEGI 3 (Android)

---

*Dernière mise à jour: 2026-02-05*
