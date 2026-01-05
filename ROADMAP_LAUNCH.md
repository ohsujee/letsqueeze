# ROADMAP LANCEMENT - LetsQueeze

> **Date**: 2026-01-05
> **Status**: Pre-launch - En attente Apple/Google Developer

---

## CRITIQUES - Bloquants pour lancement

| Probleme | Impact | Action | Status |
|----------|--------|--------|--------|
| RevenueCat API Keys placeholder | Paiements impossibles | Remplacer `appl_XXX` / `goog_XXX` dans `lib/revenuecat.js` | [ ] En attente comptes dev |
| AdMob IDs manquants | Pas de revenus pub | Creer ads interstitielles dans AdMob Console | [ ] En attente |
| PaywallModal = alert() | Bouton "Pro" fait rien | Connecter a RevenueCat | [ ] En attente |
| ~~Webhook RevenueCat sans secret~~ | ~~Faille critique~~ | ~~Rendre le secret obligatoire~~ | [x] FAIT |
| ~~Firebase `/admins` lisible~~ | ~~Info leak~~ | ~~Changer `.read: false`~~ | [x] FAIT |

---

## IMPORTANT - A corriger rapidement

| Probleme | Impact | Status |
|----------|--------|--------|
| ~~Console.log debug (44 fichiers)~~ | ~~Mauvais UX~~ | [x] Logger conditionnel cree |
| URLs Ngrok dans .env.local | Breaks apres 8h | [ ] User: Mettre URLs prod sur Vercel |
| ~~Game history retourne `[]`~~ | ~~Feature cassee~~ | [x] Feature future (pas utilisee) |
| ~~Pas de timeout sur fetch~~ | ~~UI peut geler~~ | [x] fetchWithTimeout implemente |
| Validation timestamps RevenueCat | Dates invalides possibles | [ ] A verifier |

---

## OK - Deja fait

### Securite
- [x] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] Rate limiting Upstash Redis
- [x] Spotify tokens httpOnly cookies
- [x] Firebase rules subscription bloques (write: false)
- [x] Firebase `/admins` bloques en lecture (`.read: false`)
- [x] RevenueCat webhook STRICT (rejette si pas de secret)
- [x] Firebase Admin SDK configure

### Production Readiness
- [x] Logger conditionnel (`lib/logger.js`) - logs en dev seulement
- [x] Timeouts sur fetch critiques (`lib/fetchWithTimeout.js`)
- [x] Account linking (invite -> Google/Apple) preserve les stats
- [x] Founders/Admins en variables d'environnement
- [x] RevenueCat webhook endpoint cree
- [x] `.npmrc` avec `legacy-peer-deps=true` pour Vercel

### Spotify
- [x] Spotify keep-alive ameliore (15s au lieu de 30s)
- [x] Auto-reconnexion si state null
- [x] Retry automatique sur echec connexion

---

## A FAIRE PAR L'UTILISATEUR

### Vercel / Production
- [ ] Configurer `NEXT_PUBLIC_APP_URL` avec URL production
- [ ] Configurer `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` avec URL production
- [ ] Verifier toutes les variables d'environnement sur Vercel

### Spotify Dashboard
- [ ] Ajouter URI de redirect production dans Spotify Developer Dashboard

### Variables d'environnement a configurer sur Vercel
```env
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://votre-domaine.com/games/blind-test/callback
NEXT_PUBLIC_FOUNDER_UIDS=uid1,uid2
NEXT_PUBLIC_FOUNDER_EMAILS=email1@test.com,email2@test.com
```

---

## APPLE - Quand le compte Developer sera pret

### Pre-requis
- [ ] Apple Developer Account (99 EUR/an)
- [ ] Team ID recupere

### Configuration Apple Developer Portal
- [ ] Creer App ID avec Bundle ID: `com.gigglz.app`
- [ ] Activer "Sign in with Apple"
- [ ] Activer "In-App Purchase"
- [ ] Creer Service ID pour Sign in with Apple
- [ ] Generer cle privee (.p8)
- [ ] Recuperer: Key ID, Team ID, Client ID

### Certificats & Provisioning
- [ ] Development Certificate (iOS App Development)
- [ ] Distribution Certificate (iOS App Store)
- [ ] Development Provisioning Profile
- [ ] App Store Distribution Provisioning Profile

### Configuration Xcode
- [ ] Importer certificats
- [ ] Configurer signing & capabilities
- [ ] Ajouter "Sign in with Apple" capability
- [ ] Mettre a jour Info.plist avec CFBundleURLTypes

### Variables d'environnement a ajouter
```env
NEXT_PUBLIC_APPLE_CLIENT_ID=com.gigglz.app.signin
NEXT_PUBLIC_APPLE_REDIRECT_URL=https://circuitbreak.co/auth/apple/callback
NEXT_PUBLIC_APPLE_TEAM_ID=XXXXXXXXX
REVENUECAT_IOS_KEY=appl_XXXXXXXX
```

### App Store Connect
- [ ] Creer app dans App Store Connect
- [ ] Configurer In-App Purchase:
  - `gigglz_pro_monthly` - 3.99 EUR/mois
  - `gigglz_pro_annual` - 29.99 EUR/an
- [ ] Creer Subscription Group "gigglz_pro"
- [ ] Configurer RevenueCat avec App Store Connect API

### Code Updates
- [ ] Mettre a jour `lib/revenuecat.js` avec vraies API Keys
- [ ] Mettre a jour `capacitor.config.ts` - ajouter 'apple.com' aux providers
- [ ] Tester RevenueCat Sandbox
- [ ] Tester Apple Sign-In sur device

### Submission
- [ ] Screenshots avec Sign in with Apple visible
- [ ] Privacy Policy a jour
- [ ] Soumettre TestFlight
- [ ] Soumettre App Store Review

---

## ANDROID - Configuration

### Google Play Console
- [ ] Creer app dans Google Play Console
- [ ] Configurer In-App Products (memes IDs que iOS)
- [ ] Configurer RevenueCat avec Google Play

### Variables d'environnement
```env
REVENUECAT_ANDROID_KEY=goog_XXXXXXXX
```

---

## Gestion des erreurs - Status

| Fichier | Probleme | Status |
|---------|----------|--------|
| `/api/webhooks/revenuecat` | admin.database() sans check init | [x] OK - Firebase Admin init au demarrage |
| `/lib/spotify/player.js` | SDK loading sans timeout | [x] Keep-alive + auto-reconnect |
| `/lib/spotify/auth.js` | fetch sans timeout | [x] fetchWithTimeout implemente |
| `/lib/hooks/useQuiz.js` | Pas de fallback si fetch fail | LOW - A faire si besoin |
| `/lib/hooks/useGameRoom.js` | Pas de retry sur erreur Firebase | LOW - A faire si besoin |

---

## Checklist Pre-Deploy Production

### Code
- [x] Pas de secrets hardcodes (founders en env vars)
- [x] Console.log conditionnel (logger.js)
- [ ] TODO/FIXME resolus
- [ ] npm audit sans vulnerabilites critiques

### Configuration
- [ ] Variables d'environnement production sur Vercel
- [ ] URLs production (pas Ngrok)
- [x] REVENUECAT_WEBHOOK_SECRET obligatoire (503 si absent)
- [x] Firebase Admin credentials configures

### Firebase
- [x] Rules deployees
- [x] `/admins` non lisible publiquement
- [ ] Teste avec Emulator

### Tests
- [ ] Acces sans auth -> 401
- [x] Rate limiting -> 429
- [x] Webhook RevenueCat avec mauvais secret -> 401
- [ ] Verifier headers (securityheaders.com)

---

**Derniere mise a jour**: 2026-01-05
