# Hooks

Hooks React personnalisés partagés entre tous les jeux.

## Hooks Obligatoires par Page

| Hook | Room | Play | Host | End |
|------|:----:|:----:|:----:|:---:|
| `useInterstitialAd` | ✓ | | | |
| `usePlayers` | ✓ | ✓ | ✓ | ✓ |
| `usePlayerCleanup` | ✓ | ✓ | | |
| `useInactivityDetection` | | ✓ | ✓ | |
| `useRoomGuard` | ✓ | ✓ | ✓ | ✓ |
| `useHostDisconnect` | | | ✓ | |
| `useWakeLock` | ✓ | ✓ | ✓ | |
| `useGameCompletion` | | | | ✓ |

## Hooks Principaux

### Gestion des joueurs
- `usePlayers.js` - Liste des joueurs en temps réel
- `usePlayerCleanup.js` - Nettoyage à la déconnexion
- `useInactivityDetection.js` - Détection inactivité (30s)

### Gestion de la room
- `useRoomGuard.js` - Détection fermeture room + grace period host
- `useHostDisconnect.js` - Suivi déconnexion host
- `useTeamMode.js` - Logique mode équipes

### Mode Party
- `useAskerRotation.js` - Rotation du poseur de questions

### Audio/Visuel
- `useBuzzerAudio.js` - Sons du buzzer
- `useGameAudio.js` - Audio général
- `useWakeLock.js` - Empêcher veille écran

### Business
- `useGameLimits.js` - Limites version gratuite
- `useInterstitialAd.js` - Publicités interstitielles
- `useGameCompletion.js` - Comptage parties jouées
- `useSubscription.js` - État abonnement Pro

### UI
- `useFitText.js` - Texte auto-adaptatif
- `useServerTime.js` - Synchronisation temps serveur

## Règle d'or

**Un hook = une responsabilité**

Si un hook fait trop de choses, le découper en plusieurs hooks.
