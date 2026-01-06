# LetsQueeze - Guide de Développement

> Ce fichier est lu par Claude au début de chaque session pour maintenir le contexte du projet.

## Jeux Disponibles

| Jeu | Route | Firebase | Statut |
|-----|-------|----------|--------|
| **Quiz** (Buzzer) | `/room/[code]` | `rooms/` | Complet |
| **Blind Test** (Spotify) | `/blindtest/room/[code]` | `rooms_blindtest/` | Complet |
| **DeezTest** (Deezer) | `/deeztest/room/[code]` | `rooms_deeztest/` | Complet |
| **Alibi** | `/alibi/room/[code]` | `rooms_alibi/` | Complet |
| **Mime** | `/mime` | Local (pas de room) | Complet |

---

## Hooks Unifiés

### Obligatoires pour chaque jeu multiplayer

| Hook | Fichier | Utilisation |
|------|---------|-------------|
| `useInterstitialAd` | Room pages | Pub au chargement du lobby |
| `usePlayers` | Room + Play + End | Liste des joueurs |
| `usePlayerCleanup` | Play pages | Nettoyage déconnexion |
| `useRoomGuard` | Play + End pages | Détection fermeture room |
| `useGameCompletion` | End pages | Comptage parties terminées |

### Vérification par jeu

```
Quiz:
  ✓ Room: useInterstitialAd, usePlayers
  ✓ Play: usePlayers, usePlayerCleanup, useRoomGuard
  ✓ End: useGameCompletion, usePlayers

BlindTest:
  ✓ Room: useInterstitialAd, usePlayers
  ✓ Play: usePlayers, usePlayerCleanup, useRoomGuard
  ✓ End: useGameCompletion, usePlayers

DeezTest:
  ✓ Room: useInterstitialAd, usePlayers
  ✓ Play: usePlayers, usePlayerCleanup, useRoomGuard
  ✓ End: useGameCompletion, usePlayers

Alibi:
  ✓ Room: useInterstitialAd, usePlayers
  ✓ Play: usePlayers, usePlayerCleanup, useRoomGuard
  ✓ End: useGameCompletion, usePlayers

Mime:
  ✓ Lobby: useInterstitialAd, useGameLimits
  ✓ Exit: recordGamePlayed() dans handleBackToLobby/handleBackToHome
```

---

## Système de Pubs (AdMob)

### Flags importants

| Flag | Storage | Effet |
|------|---------|-------|
| `returnedFromGame` | localStorage | Skip pub si revient d'une partie |
| `adShownDuringJoin` | localStorage | Skip pub si vue pendant join |
| `rewardedAdWatched` | sessionStorage | Skip pub après rewarded ad |

### Logique de `useInterstitialAd`

```javascript
// Skip si l'une de ces conditions est vraie:
1. User est Pro
2. returnedFromGame === true (puis reset)
3. rewardedAdWatched === true (puis reset)
4. adShownDuringJoin === true (puis reset)
```

### Flux rewarded ads (parties gratuites)

```
User épuise 3 parties/jour
  → Modal "Regarder une pub pour continuer"
  → watchAdForExtraGame() dans useGameLimits
  → sessionStorage.setItem('rewardedAdWatched', 'true')
  → Prochaine room: skip interstitial
```

---

## Architecture

### AppShell (`components/layout/AppShell.jsx`)

Gestion viewport mobile. Règles CSS:
- `height: var(--app-height)` sur body (PAS 100vh)
- `flex: 1; min-height: 0;` pour les pages
- PAS de `padding-top: env(safe-area-inset-top)`

### Storage Utility (`lib/utils/storage.js`)

```javascript
storage.set('key', value)  // Préfixe automatique 'lq_'
storage.get('key')
storage.remove('key')
```

### Firebase Room Structure

```
{prefix}/{code}/
├── meta/
│   ├── hostUid, code, createdAt
│   ├── closed (boolean - déclenche redirect)
│   ├── mode ("individuel" | "équipes")
│   └── teams/
├── state/
│   ├── phase ("lobby" | "playing" | "ended")
│   └── currentIndex, revealed, etc.
└── players/
    └── {uid}/ { name, score, teamId, status }
```

---

## Checklist: Nouveau Jeu

Quand on ajoute un nouveau jeu:

### 1. Config
- [ ] Ajouter dans `lib/config/rooms.js` (ROOM_TYPES)
- [ ] Créer le préfixe Firebase (`rooms_newgame/`)

### 2. Pages
- [ ] `/app/newgame/room/[code]/page.jsx` - Lobby
- [ ] `/app/newgame/game/[code]/play/page.jsx` - Jeu
- [ ] `/app/newgame/game/[code]/end/page.jsx` - Résultats

### 3. Hooks obligatoires
- [ ] Room: `useInterstitialAd({ context: 'NewGame' })`
- [ ] Play: `usePlayers`, `usePlayerCleanup`, `useRoomGuard`
- [ ] End: `useGameCompletion({ gameType: 'newgame', roomCode })`

### 4. Bouton retour (End page)
- [ ] Check `hostPresent` pour le texte du bouton
- [ ] Si host absent → "Retour à l'accueil" → `/home`

---

## Checklist: Modification Transversale

Quand on modifie une feature qui existe dans plusieurs jeux:

### Vérifier tous les fichiers
```
Quiz:      app/room/[code], app/game/[code]/{play,host}, app/end/[code]
BlindTest: app/blindtest/room/[code], game/[code]/{play,host,end}
DeezTest:  app/deeztest/room/[code], game/[code]/{play,host,end}
Alibi:     app/alibi/room/[code], game/[code]/{prep,play,end}
Mime:      app/mime/page.tsx
```

### Hooks à vérifier
```
lib/hooks/useInterstitialAd.js
lib/hooks/useGameCompletion.js
lib/hooks/usePlayers.js
lib/hooks/usePlayerCleanup.js
lib/hooks/useRoomGuard.js
```

---

## Problèmes Connus

### Attention

- Les flags de pub (returnedFromGame, etc.) doivent être reset après lecture
- `rewardedAdWatched` est en sessionStorage → perdu si refresh
- Mime n'a pas de rewarded ad pour débloquer des parties

---

## Commandes Utiles

```bash
# Dev
npm run dev

# Build
npm run build

# Capacitor (mobile)
npx cap sync
npx cap open ios
npx cap open android
```

---

## Dernière mise à jour

**Date:** 2025-01-06
**Contexte:** Unification système de pubs + tracking game completion
