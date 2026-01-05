# ROADMAP LANCEMENT - LetsQueeze

> **Date**: 2026-01-05
> **Status**: Pre-launch audit

---

## CRITIQUES - Bloquants pour lancement

| Probleme | Impact | Action | Status |
|----------|--------|--------|--------|
| RevenueCat API Keys placeholder | Paiements impossibles | Remplacer `appl_XXX` / `goog_XXX` dans `lib/revenuecat.js` | [ ] |
| AdMob IDs manquants | Pas de revenus pub | Creer ads interstitielles dans AdMob Console | [ ] |
| PaywallModal = alert() | Bouton "Pro" fait rien | Connecter a RevenueCat | [ ] |
| Webhook RevenueCat sans secret = continue | Faille critique | Rendre le secret obligatoire | [ ] |
| Firebase `/admins` lisible par tous | Info leak | Changer `.read: false` | [ ] |

---

## IMPORTANT - A corriger rapidement

| Probleme | Impact | Status |
|----------|--------|--------|
| Console.log debug (44 fichiers) | Mauvais UX, logs pollues | [ ] |
| URLs Ngrok dans .env.local | Breaks apres 8h | [ ] |
| Game history retourne `[]` | Feature cassee | [ ] |
| Pas de timeout sur fetch | UI peut geler | [ ] |
| Validation timestamps RevenueCat | Dates invalides possibles | [ ] |

---

## OK - Deja fait

- [x] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] Rate limiting Upstash Redis
- [x] Spotify tokens httpOnly cookies
- [x] Firebase rules subscription bloques (write: false)
- [x] Account linking (invite -> Google/Apple)
- [x] Founders/Admins en variables d'environnement
- [x] RevenueCat webhook endpoint cree
- [x] Firebase Admin SDK configure

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

## Gestion des erreurs - Ameliorations futures

| Fichier | Probleme | Priorite |
|---------|----------|----------|
| `/api/webhooks/revenuecat` | admin.database() sans check init | HIGH |
| `/lib/spotify/player.js` | SDK loading sans timeout | MEDIUM |
| `/lib/spotify/auth.js` | fetch sans timeout | MEDIUM |
| `/lib/hooks/useQuiz.js` | Pas de fallback si fetch fail | LOW |
| `/lib/hooks/useGameRoom.js` | Pas de retry sur erreur Firebase | LOW |

---

## Checklist Pre-Deploy Production

### Code
- [ ] Pas de secrets hardcodes
- [ ] Console.log supprimes
- [ ] TODO/FIXME resolus
- [ ] npm audit sans vulnerabilites critiques

### Configuration
- [ ] Variables d'environnement production sur Vercel
- [ ] URLs production (pas Ngrok)
- [ ] REVENUECAT_WEBHOOK_SECRET obligatoire
- [ ] Firebase Admin credentials configures

### Firebase
- [ ] Rules deployees
- [ ] `/admins` non lisible
- [ ] Teste avec Emulator

### Tests
- [ ] Acces sans auth -> 401
- [ ] Rate limiting -> 429
- [ ] Webhook RevenueCat avec mauvais secret -> 401
- [ ] Verifier headers (securityheaders.com)

---

**Derniere mise a jour**: 2026-01-05
