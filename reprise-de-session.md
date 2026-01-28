# Reprise de Session - LetsQueeze

---

## Session 2026-01-23 : Optimisation Animations & Performance

**Statut:** ✅ COMPLÉTÉ

### Contexte

Saccades/jank observées sur l'écran de fin (podium, leaderboard) et au lancement de partie (countdown). Analyse code complète effectuée pour identifier les causes.

### Causes identifiées

| Cause | Impact | Fichier |
|-------|--------|---------|
| requestAnimationFrame loops multiples (particles) | Élevé | ParticleEffects.jsx |
| setInterval 40ms pour animation scores | Élevé | Leaderboard.jsx |
| 6 animations infinies Framer Motion simultanées | Moyen-Élevé | PodiumPremium.jsx |
| 36 animations CSS hexagones Frost | Moyen | Leaderboard.jsx |
| Import dynamique canvas-confetti au mount | Moyen | ParticleEffects.jsx |
| Fetch Lottie JSON au mount (toujours) | Moyen | Leaderboard.jsx |
| 14 Audio preloads simultanés | Moyen | useGameAudio.js |
| Flash joueurs→équipes au chargement | Visible | Leaderboard.jsx |

### Optimisations appliquées

#### 1. PodiumPremium.jsx
- [x] Particles différés de 800ms (au lieu de 0ms)
- [x] Fireworks différés de 3s (au lieu de 2s)
- [x] Stagger delays augmentés : 0/0.5/1.0s (au lieu de 0/0.3/0.6s)
- [x] useEffect avec `[]` au lieu de `[audio]` (évite appels multiples)
- [x] Prop `disableAnimations` ajoutée (pour usage futur)

#### 2. Leaderboard.jsx
- [x] Score animation : 80ms/8 steps (au lieu de 40ms/15 steps) → ~60% moins de re-renders
- [x] Lottie lazy loaded seulement quand team Blaze/Venom est leader
- [x] Hexagones Frost : 16 éléments (au lieu de 36) → ~55% moins d'animations CSS
- [x] Fix flash joueurs→équipes :
  - useState initialisé avec la bonne valeur selon `hasTeams`
  - useLayoutEffect pour switch synchrone avant paint
  - skipAnimationRef pour désactiver animation au switch auto
  - userHasToggledRef pour ne pas override choix manuel utilisateur

#### 3. useGameAudio.js
- [x] Retour stabilisé avec useMemo (objet stable entre renders)

#### 4. GameLaunchCountdown.jsx
- [x] 8 particules par step (au lieu de 12) → ~33% moins de motion.div

### Bug fix
- [x] `ReferenceError: Cannot access 'teamsArray' before initialization` - réorganisation des useMemo

### Fichiers modifiés
```
components/ui/PodiumPremium.jsx
components/game/Leaderboard.jsx
components/transitions/GameLaunchCountdown.jsx
lib/hooks/useGameAudio.js
```

### Notes
- Les optimisations s'appliquent à Quiz, BlindTest et DeezTest (composants partagés)
- L'écran de fin utilise `env(safe-area-inset-bottom)` pour iOS/Android
- `viewportFit: 'cover'` configuré dans layout.js

---

## Session 2026-01-22 : Système de Présence Joueurs

**Statut:** ✅ COMPLÉTÉ (Phases 1-5)

---

## Contexte & Problématique

### Problèmes identifiés

1. **Joueurs fantômes dans le lobby** : Quand un joueur verrouille son téléphone, il disparaît de la vue host après 30-60s (timeout Firebase), mais quand il revient, il pense être toujours connecté alors qu'il ne l'est plus.

2. **Pas de feedback** : Le joueur n'a aucune indication qu'il a été déconnecté du lobby.

3. **Auto-rejoin cassé** : Le mécanisme ne s'exécute qu'une fois au mount, pas au wake-up.

4. **Confusion visibilitychange ≠ déconnexion réseau** : Le code actuel appelle `markActive()` dès que l'onglet est caché, ce qui interfère avec la logique de déconnexion.

5. **`usePresence` existe mais n'est jamais utilisé** : Le hook est désactivé par un flag.

### Comportement Firebase

| Situation | Délai avant onDisconnect() |
|-----------|---------------------------|
| Déconnexion propre (app fermée) | Immédiat |
| Perte réseau soudaine | 30-120 secondes |
| Mode avion | Jusqu'à 30 minutes |
| Téléphone verrouillé (sleep) | ~60 secondes |

---

## Architecture Cible

### Nouvelle structure Firebase

```
/rooms/{code}/
├── meta/           (existant - inchangé)
├── state/          (existant - inchangé)
├── players/{uid}/  (existant - données joueur)
│   ├── uid, name, score, teamId
│   ├── status: "active" | "disconnected" | "left"
│   ├── activityStatus: "active" | "inactive"
│   └── joinedAt
│
└── presence/{uid}/ (NOUVEAU - statut temps réel)
    ├── online: boolean
    ├── lastSeen: timestamp (ServerValue.TIMESTAMP)
    └── lastHeartbeat: timestamp
```

**Pourquoi séparer presence de players ?**
- Écritures fréquentes (heartbeat toutes les 15s) isolées
- Listeners sur `players/` ne sont pas pollués
- Nettoyage indépendant possible
- Pattern recommandé par Firebase

---

## Plan d'Implémentation

### Phase 1 : Refonte du hook usePresence

**Fichier:** `lib/hooks/usePresence.js`

**Fonctionnalités:**
- [x] Utiliser `.info/connected` pour détecter la vraie connexion Firebase
- [x] Configurer `onDisconnect()` AVANT de set online (éviter race condition)
- [x] Re-enregistrer onDisconnect à chaque reconnexion (single-use)
- [x] Heartbeat configurable (défaut: 15s pour lobby, désactivé pour play)
- [x] Exposer `isConnected`, `lastHeartbeat`, `forceReconnect()`

**API proposée:**
```javascript
const {
  isConnected,      // boolean - vraie connexion Firebase
  forceReconnect,   // () => void - force goOffline/goOnline
  lastHeartbeat     // number - timestamp dernier heartbeat
} = usePresence({
  roomCode: code,
  roomPrefix: 'rooms',
  playerUid: myUid,
  heartbeatInterval: 15000,  // 0 = désactivé
  enabled: true
});
```

---

### Phase 2 : Refonte du hook usePlayerCleanup

**Fichier:** `lib/hooks/usePlayerCleanup.js`

**Modifications:**
- [x] Supprimer l'appel à `markActive()` sur visibilitychange hidden
- [x] Utiliser `goOffline(db)` quand l'onglet devient hidden
- [x] Utiliser `goOnline(db)` quand l'onglet redevient visible
- [x] Ajouter auto-rejoin sur visibilitychange (pas juste au mount)
- [x] Intégrer avec le nouveau usePresence

**Comportement visibilitychange:**
```javascript
// AVANT (problématique)
hidden → markActive() → empêche onDisconnect de fonctionner

// APRÈS (correct)
hidden → goOffline(db) → onDisconnect() déclenché immédiatement
visible → goOnline(db) → re-register presence + auto-rejoin si nécessaire
```

---

### Phase 3 : DisconnectAlert dans le Lobby

**Fichier:** `components/game/LobbyDisconnectAlert.jsx` (nouveau)

**Fonctionnalités:**
- [x] Overlay plein écran quand le joueur n'est plus dans Firebase
- [x] Message clair : "Vous avez été déconnecté"
- [x] Bouton "Rejoindre à nouveau" qui tente auto-rejoin
- [x] Bouton "Retour à l'accueil" si rejoin échoue
- [x] Animation subtile (pas trop anxiogène)

**Déclenchement:**
- Écouter `players/{uid}` - si devient null → afficher alert
- Ou si `presence/{uid}/online` devient false et timeout dépassé

---

### Phase 4 : Indicateur de présence côté Host

**Fichier:** Modifier `components/game/LobbySettings.jsx` ou créer `PlayerPresenceIndicator.jsx`

**Fonctionnalités:**
- [x] Indicateur visuel par joueur :
  - 🟢 Vert : online + heartbeat < 20s
  - 🟡 Jaune : online mais heartbeat > 20s (connexion incertaine)
  - 🔴 Rouge : offline ou heartbeat > 30s
- [x] Tooltip avec "Dernière activité il y a Xs"
- [x] Host peut voir qui est vraiment présent avant de lancer

**Logique:**
```javascript
const getPresenceStatus = (presence) => {
  if (!presence?.online) return 'offline';
  const age = Date.now() - (presence.lastHeartbeat || 0);
  if (age < 20000) return 'online';
  if (age < 30000) return 'uncertain';
  return 'stale';
};
```

---

### Phase 5 : Intégration dans toutes les pages Lobby

**Fichiers à modifier:**
- [x] `app/room/[code]/page.jsx` (Quiz)
- [x] `app/blindtest/room/[code]/page.jsx`
- [x] `app/deeztest/room/[code]/page.jsx`
- [x] `app/alibi/room/[code]/page.jsx`
- [x] `app/laloi/room/[code]/page.jsx`

**Ajouts par page:**
```jsx
// Import
import { usePresence } from "@/lib/hooks/usePresence";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";

// Hook
const { isConnected, forceReconnect } = usePresence({
  roomCode: code,
  roomPrefix: 'rooms_xxx',
  playerUid: myUid,
  heartbeatInterval: 15000
});

// Render
<LobbyDisconnectAlert
  roomCode={code}
  roomPrefix="rooms_xxx"
  playerUid={myUid}
  onReconnect={forceReconnect}
/>
```

---

### Phase 6 : Nettoyage automatique (optionnel)

**Option A : Cloud Function (recommandé si scaling)**
```javascript
// functions/cleanupStalePresence.js
exports.cleanupStalePresence = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    // Supprimer les joueurs avec lastHeartbeat > 60s
  });
```

**Option B : Côté Host (plus simple)**
```javascript
// Dans la page lobby host
useEffect(() => {
  const interval = setInterval(() => {
    // Vérifier presence de chaque joueur
    // Si lastHeartbeat > 45s → remove du lobby
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## Ordre de Priorité

| Phase | Priorité | Impact | Effort |
|-------|----------|--------|--------|
| Phase 1 : usePresence | 🔴 Critique | Haut | Moyen |
| Phase 2 : usePlayerCleanup | 🔴 Critique | Haut | Moyen |
| Phase 3 : LobbyDisconnectAlert | 🟠 Haute | Haut | Faible |
| Phase 4 : Indicateur Host | 🟡 Moyenne | Moyen | Faible |
| Phase 5 : Intégration pages | 🟠 Haute | Haut | Moyen |
| Phase 6 : Nettoyage auto | 🟢 Basse | Moyen | Moyen |

---

## Fichiers Concernés

### Hooks à modifier/créer
```
lib/hooks/
├── usePresence.js        # REFONTE MAJEURE
├── usePlayerCleanup.js   # MODIFIER
├── useRoomGuard.js       # Inchangé (fonctionne bien)
└── useInactivityDetection.js  # Inchangé
```

### Composants à créer
```
components/game/
├── LobbyDisconnectAlert.jsx   # NOUVEAU
└── PlayerPresenceIndicator.jsx # NOUVEAU (optionnel)
```

### Pages à modifier
```
app/room/[code]/page.jsx
app/blindtest/room/[code]/page.jsx
app/deeztest/room/[code]/page.jsx
app/alibi/room/[code]/page.jsx
app/laloi/room/[code]/page.jsx
```

---

## Tests à Effectuer

### Scénarios de test

1. **Verrouillage téléphone en lobby**
   - [ ] Joueur verrouille → disparaît de la liste host en < 5s
   - [ ] Joueur déverrouille → voit LobbyDisconnectAlert
   - [ ] Clic "Rejoindre" → réapparaît dans la liste host

2. **Perte réseau**
   - [ ] Couper wifi → joueur marqué offline en < 30s
   - [ ] Rétablir wifi → auto-reconnexion

3. **Fermeture app**
   - [ ] Swipe-kill l'app → joueur retiré immédiatement
   - [ ] Rouvrir l'app → LobbyDisconnectAlert avec option rejoin

4. **Host quitte**
   - [ ] Host ferme la room → tous les joueurs redirigés /home
   - [ ] (Déjà fonctionnel via useRoomGuard)

5. **Indicateur host**
   - [ ] Joueur actif → indicateur vert
   - [ ] Joueur verrouille téléphone → indicateur passe jaune puis rouge

---

## Références

### Documentation Firebase
- [Offline Capabilities](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Build Presence System](https://firebase.blog/posts/2013/06/how-to-build-presence-system/)
- [Firestore Presence](https://firebase.google.com/docs/firestore/solutions/presence)

### Code existant
- `lib/hooks/usePresence.js` - Hook existant (désactivé)
- `lib/hooks/usePlayerCleanup.js` - Logique actuelle
- `components/game/DisconnectAlert.jsx` - Référence pour le design

---

## Notes Techniques

### goOffline/goOnline
```javascript
import { getDatabase, goOffline, goOnline } from "firebase/database";

// Forcer déconnexion (déclenche onDisconnect immédiatement)
goOffline(db);

// Forcer reconnexion
goOnline(db);
```

### ServerValue.TIMESTAMP
```javascript
import { serverTimestamp } from "firebase/database";

// Utiliser pour lastSeen/lastHeartbeat
set(ref(db, `presence/${uid}`), {
  online: true,
  lastSeen: serverTimestamp()
});
```

### Pattern onDisconnect correct
```javascript
// TOUJOURS dans cet ordre :
onDisconnect(presenceRef).set({ online: false, lastSeen: serverTimestamp() });
// PUIS
set(presenceRef, { online: true, lastSeen: serverTimestamp() });
```

---

*Dernière mise à jour : 2026-01-21*
