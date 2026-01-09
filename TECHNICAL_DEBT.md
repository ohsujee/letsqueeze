# LetsQueeze - Dette Technique & Feuille de Route

> Document généré le 2026-01-09 suite à une analyse multi-agent complète du codebase.
> Ce fichier liste tous les problèmes identifiés à corriger, organisés par priorité.

---

## Légende des Priorités

| Priorité | Signification | Action |
|----------|---------------|--------|
| 🔴 **CRITIQUE** | Bugs actifs, sécurité, config production manquante | Corriger immédiatement |
| 🟠 **MAJEUR** | Vulnérabilités, incohérences importantes | Corriger rapidement |
| 🟡 **MOYEN** | Robustesse, gestion d'erreurs | Planifier correction |
| 🟢 **MINEUR** | Nettoyage, optimisations | Corriger si temps disponible |

---

# PHASE 2 - AUDIT PRÉ-PUBLICATION (2026-01-09)

> Nouveaux problèmes identifiés lors de l'audit de sécurité et configuration avant publication.

---

## 🔴 CRITIQUE - Configuration Production

### P1. Secrets exposés dans .env.local

**Impact:** Clés API et secrets visibles dans le repository si commité par erreur

- **Fichier:** `.env.local`
- **Problème:** Contient des vraies clés Firebase, Spotify, etc.
- **Risque:** Si commité par erreur = fuite de credentials
- **Solutions:**
  1. Vérifier que `.env.local` est bien dans `.gitignore`
  2. Utiliser un gestionnaire de secrets pour production (Vercel env vars, etc.)
  3. Créer `.env.example` avec placeholders documentés
  4. Audit: vérifier l'historique git pour d'éventuelles fuites passées

---

### P2. Capacitor config avec IP de développement

**Impact:** App mobile pointe vers localhost en production

- **Fichier:** `capacitor.config.ts`
- **Problème:** URL du serveur contient potentiellement une IP locale (192.168.x.x ou localhost)
- **Vérification requise:**
```typescript
// Vérifier que server.url pointe vers production
server: {
  url: "https://letsqueeze.app", // PAS une IP locale!
  cleartext: true
}
```
- **Solution:**
  1. Créer `capacitor.config.production.ts` séparé
  2. Ou utiliser des variables d'environnement pour l'URL
  3. Script de build qui vérifie l'absence d'IPs locales

---

### P3. AdMob - IDs interstitial non configurés

**Impact:** Aucune pub interstitielle ne sera affichée en production

- **Fichier:** `lib/admob.js`
- **Problème:** Les IDs interstitiel sont des placeholders ou IDs de test
- **Code à vérifier:**
```javascript
AD_UNIT_IDS = {
  ios: {
    interstitial: '???', // Vérifier si c'est un vrai ID
    rewarded: '5594671010'  // Celui-ci semble OK
  },
  android: {
    interstitial: '???', // Vérifier si c'est un vrai ID
    rewarded: '6397628551'  // Celui-ci semble OK
  }
}
```
- **Solution:** Créer les unités interstitiel dans AdMob console et mettre les vrais IDs

---

### P4. RevenueCat - Clé API à vérifier

**Impact:** Achats in-app ne fonctionneront pas

- **Fichier:** `lib/revenuecat.js`
- **Vérification requise:**
  1. La clé API est-elle une clé de production?
  2. Les produits `gigglz_pro_monthly` et `gigglz_pro_annual` existent-ils dans App Store Connect / Play Console?
  3. L'entitlement `pro` est-il configuré dans RevenueCat dashboard?
- **Solution:** Documenter le checklist de configuration RevenueCat

---

### P5. Spotify redirect URI = ngrok (dev)

**Impact:** OAuth Spotify cassé en production

- **Fichier:** `lib/spotify/auth.js` ou `.env.local`
- **Problème:** URI de callback pointe vers ngrok tunnel (développement)
- **Vérification requise:**
```javascript
// Doit pointer vers le domaine de production
SPOTIFY_REDIRECT_URI = "https://letsqueeze.app/blindtest/spotify-callback"
// PAS: "https://xxxx.ngrok.io/..."
```
- **Solutions:**
  1. Configurer le vrai redirect URI dans Spotify Developer Dashboard
  2. Ajouter le domaine de production à la whitelist Spotify
  3. Variable d'environnement différente dev/prod

---

## 🟠 MAJEUR - Sécurité

### P6. SSRF potentielle dans proxy Deezer

**Impact:** Un attaquant pourrait faire des requêtes à des serveurs internes

- **Fichier:** `app/api/deezer/route.js` (ou similaire)
- **Problème:** Le proxy fait des requêtes vers des URLs potentiellement contrôlées par l'utilisateur
- **Vérification requise:**
```javascript
// L'URL cible doit être validée
const allowedHosts = ['api.deezer.com'];
const targetUrl = new URL(userProvidedUrl);
if (!allowedHosts.includes(targetUrl.host)) {
  return Response.json({ error: 'Invalid host' }, { status: 400 });
}
```
- **Solution:** Whitelist stricte des domaines autorisés pour le proxy

---

### P7. CSRF non vérifié pour Spotify OAuth

**Impact:** Attaques CSRF possibles sur le flow OAuth

- **Fichier:** `app/blindtest/spotify-callback/page.jsx`
- **Problème:** Le paramètre `state` du callback OAuth n'est peut-être pas vérifié
- **Flow sécurisé:**
```javascript
// 1. Avant redirect vers Spotify
const state = crypto.randomUUID();
sessionStorage.setItem('spotify_oauth_state', state);

// 2. Dans callback
const returnedState = searchParams.get('state');
const savedState = sessionStorage.getItem('spotify_oauth_state');
if (returnedState !== savedState) {
  // Rejet - possible CSRF
  throw new Error('State mismatch');
}
```
- **Solution:** Implémenter la vérification du state si absente

---

## 🟡 MOYEN - Robustesse

### P8. Firebase operations sans gestion d'erreurs (~40 instances)

**Impact:** Erreurs silencieuses, UX dégradée, bugs difficiles à diagnostiquer

- **Fichiers concernés:** Toutes les pages jeu (room, play, host, end)
- **Pattern problématique:**
```javascript
// ❌ Pas de gestion d'erreur
await update(ref(db, `rooms/${code}/state`), { phase: 'playing' });

// ✅ Avec gestion
try {
  await update(ref(db, `rooms/${code}/state`), { phase: 'playing' });
} catch (error) {
  console.error('[StartGame] Firebase error:', error);
  toast.error('Erreur de connexion. Réessayez.');
}
```
- **Estimation:** ~40 opérations `update()`, `set()`, `remove()` sans try/catch
- **Solution:** Audit de toutes les opérations Firebase et ajout de try/catch avec feedback utilisateur

---

### P9. Pas de détection mode hors-ligne

**Impact:** App semble bugguée sans internet au lieu d'afficher un message clair

- **Problème:** Aucune détection de `navigator.onLine` ou événements `online`/`offline`
- **Solution proposée:**
```javascript
// Hook useOnlineStatus
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// + Composant OfflineBanner
```
- **Fichiers à créer:**
  1. `lib/hooks/useOnlineStatus.js`
  2. `components/ui/OfflineBanner.jsx`

---

### P10. ErrorBoundary non utilisé dans root layout

**Impact:** Erreurs JS crashent l'app entière au lieu d'afficher un fallback

- **Fichier:** `app/layout.jsx` (ou `app/layout.tsx`)
- **Problème:** Pas d'ErrorBoundary React qui wrappe l'application
- **Solution:**
```jsx
// components/ErrorBoundary.jsx
'use client';
import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    // Optionnel: envoyer à un service de monitoring
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h1>Oups, une erreur est survenue</h1>
          <button onClick={() => window.location.reload()}>
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dans layout.jsx
<ErrorBoundary>
  <AppShell>{children}</AppShell>
</ErrorBoundary>
```

---

## 🟢 MINEUR - Améliorations

### P11. Logs de debug en production

**Impact:** Console polluée, légère fuite d'informations

- **Problème:** Beaucoup de `console.log()` dans le code de production
- **Solution:**
```javascript
// lib/utils/logger.js
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => isDev && console.log(...args),
  warn: (...args) => console.warn(...args), // Garder warnings
  error: (...args) => console.error(...args), // Garder erreurs
};
```
- **Migration:** Remplacer `console.log` par `logger.log` progressivement

---

### P12. Images non optimisées

**Impact:** Temps de chargement, bande passante

- **Vérification requise:**
  1. Les images dans `/public/images/` sont-elles compressées?
  2. Utilise-t-on `next/image` pour l'optimisation automatique?
  3. Y a-t-il des images > 500KB?
- **Solution:**
  1. Compresser les images avec TinyPNG ou similaire
  2. Convertir en WebP quand possible
  3. Utiliser `<Image>` de Next.js au lieu de `<img>`

---

## Statistiques Pré-Publication

| Métrique | Valeur |
|----------|--------|
| Issues critiques (config) | 5 |
| Issues majeures (sécurité) | 2 |
| Issues moyennes (robustesse) | 3 |
| Issues mineures | 2 |
| **Total nouvelles issues** | **12** |

---

## Ordre de Priorité Recommandé (Phase 2)

1. **Jour 1:** P1-P5 (Configuration production - BLOQUANT pour release)
2. **Jour 2:** P6-P7 (Sécurité)
3. **Jour 3:** P8 (Firebase error handling - au moins les opérations critiques)
4. **Jour 4:** P9-P10 (Robustesse UX)
5. **Post-release:** P11-P12 (Optimisations)

---

---

# PHASE 1 - DETTE TECHNIQUE INITIALE (COMPLÉTÉE)

> Tous les problèmes ci-dessous ont été corrigés le 2026-01-09.

## Historique des Corrections (21 fixes)

| ID | Correction | Statut |
|----|------------|--------|
| C1.1 | useActiveGameCheck: Remplacé listeners imbriqués par `get()` async | ✅ |
| C1.2 | Alibi Play: Séparé listeners Firebase dans useEffects avec cleanup | ✅ |
| C2 | Alibi Prep: Ajouté usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert | ✅ |
| C3.1 | Supprimé `app/design-tokens.css` (369 lignes, jamais importé) | ✅ |
| C3.2 | Supprimé `app/styles/components.css` (206 lignes, jamais importé) | ✅ |
| M2.1 | Supprimé `useQuiz.js` (hook jamais utilisé) | ✅ |
| M2.2+M3 | Supprimé `usePackAccess`, `useGameLimits` v1, export default de `useSubscription.js` | ✅ |
| M2.3 | Supprimé fonctions inutilisées de `rooms.js` (getAllRoomPrefixes, getRoomTypeById, getRoomTypeByPrefix) | ✅ |
| M2.4 | Supprimé `isGameAvailable()` de `games.js` | ✅ |
| M2.5 | Supprimé fonctions AdMob inutilisées (prepareRewardedAd, prepareInterstitialAd, isRewardedAdReady) | ✅ |
| M4.1 | Ajouté `useRoomGuard` et `useInactivityDetection` à BlindTest Host | ✅ |
| M4.2 | Ajouté `useRoomGuard` et `useInactivityDetection` à DeezTest Host | ✅ |
| M5 | Ajouté `usePlayers` à Alibi End + corrigé listeners imbriqués (fuite mémoire) | ✅ |
| Y3 | Créé `components/icons/GoogleIcon.jsx` et `AppleIcon.jsx`, remplacé SVG inline | ✅ |
| Y4 | Supprimé @keyframes spin dupliqués dans globals.css et animations.css | ✅ |
| Y5 | Documenté Firebase Structure BlindTest/DeezTest et serverTimeOffset dans CLAUDE.md | ✅ |
| Y6 | Ajouté validation `playlist` et `playlistsUsed` dans firebase.rules.json | ✅ |
| V1 | Supprimé `lib/hooks/index.js` (inutilisé) | ✅ |
| V7 | Supprimé dossier `hooks/` racine redondant, mis à jour imports | ✅ |
| V4 | Supprimé export default inutiles dans `lib/admob.js` et `lib/subscription.js` | ✅ |
| V5+V6 | useGameLimits: ajouté constante FREE_GAMES_BEFORE_AD, migré vers storage utility | ✅ |
| V2 | Standardisé paramètre `roomPrefix` dans useGameRoom et useRoomSubscription | ✅ |
| V3 | Ajouté `useRoomGuard` à DeezTest End pour cohérence | ✅ |

---

## Issues Différées (Non Bloquantes pour Publication)

Les issues suivantes sont des opportunités d'amélioration mais ne bloquent pas la publication:

### Consolidation Future (Backlog)

| ID | Description | Impact |
|----|-------------|--------|
| M1.1 | Consolider 3 hooks audio en 1 (useSound, useBuzzerAudio, useGameAudio) | Maintenance |
| M1.2 | Fusionner useGameRoom et useRoomSubscription | Simplification |
| M1.3 | Unifier usePlayerCleanup et usePresence | Simplification |
| M1.4 | Supprimer useKickDetection (duplique useRoomGuard) | Nettoyage |
| Y1 | Factoriser pages Lobby/Play/End (4400+ lignes dupliquées) | Maintenance |
| Y2 | Consolider composants UI dupliqués (Buzzer, Modals, Particules) | Bundle size |

---

*Dernière mise à jour: 2026-01-09*
