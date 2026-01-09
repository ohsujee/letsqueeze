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
| **Trouve la Règle** | `/trouveregle/room/[code]` | `rooms_trouveregle/` | Complet |

---

## Hooks Unifiés

### Obligatoires pour chaque jeu multiplayer

| Hook | Fichier | Utilisation |
|------|---------|-------------|
| `useInterstitialAd` | Room pages | Pub au chargement du lobby |
| `usePlayers` | Room + Play + End | Liste des joueurs |
| `usePlayerCleanup` | Play pages | Nettoyage déconnexion |
| `useInactivityDetection` | Play pages | Détection inactivité (30s) |
| `useRoomGuard` | Play + End pages | Détection fermeture room |
| `useGameCompletion` | End pages | Comptage parties terminées |

### Vérification par jeu

```
Quiz:
  ✓ Room: useInterstitialAd, usePlayers, usePlayerCleanup
  ✓ Play: usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert
  ✓ End: useGameCompletion, usePlayers

BlindTest:
  ✓ Room: useInterstitialAd, usePlayers, usePlayerCleanup
  ✓ Play: usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert
  ✓ End: useGameCompletion, usePlayers

DeezTest:
  ✓ Room: useInterstitialAd, usePlayers, usePlayerCleanup
  ✓ Play: usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert
  ✓ End: useGameCompletion, usePlayers

Alibi:
  ✓ Room: useInterstitialAd, usePlayers, usePlayerCleanup
  ✓ Play: usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert
  ✓ End: useGameCompletion, usePlayers

TrouveRegle:
  ✓ Room: useInterstitialAd, usePlayers, usePlayerCleanup, useRoomGuard
  ✓ Play: usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert
  ✓ Investigate: usePlayers, useRoomGuard, usePlayerCleanup, useInactivityDetection, DisconnectAlert
  ✓ End: useGameCompletion, usePlayers, useRoomGuard

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

## Système de Status Joueurs

### Vue d'ensemble

Le système gère 3 types de status pour chaque joueur:

| Status | Champ Firebase | Déclencheur | Icône |
|--------|----------------|-------------|-------|
| **Actif** | `status: 'active'` | Connexion normale | - |
| **Déconnecté** | `status: 'disconnected'` | Perte connexion WebSocket | WifiOff (rouge) |
| **Inactif** | `activityStatus: 'inactive'` | 30s sans interaction | Moon (orange) |
| **Parti** | `status: 'left'` | Quitte volontairement en jeu | WifiOff (rouge) |

### Structure Firebase Player

```
players/{uid}/
├── uid, name, score, teamId
├── status: "active" | "disconnected" | "left"
├── activityStatus: "active" | "inactive"
├── disconnectedAt: timestamp (si déconnecté)
├── lastActivityAt: timestamp
└── joinedAt: timestamp
```

---

### Hook: `usePlayerCleanup`

**Fichier:** `lib/hooks/usePlayerCleanup.js`

Gère la déconnexion selon la phase de jeu:

| Phase | Comportement à la déconnexion |
|-------|-------------------------------|
| `lobby` | Joueur **supprimé** de la room |
| `playing` | Joueur **marqué** `status: 'disconnected'` (score préservé) |
| `ended` | Aucun cleanup |

**Usage:**
```jsx
const { leaveRoom, markActive } = usePlayerCleanup({
  roomCode: code,
  roomPrefix: 'rooms_mygame',
  playerUid: myUid,
  phase: 'playing'  // 'lobby' | 'playing' | 'ended'
});

// leaveRoom() - Quitter proprement (bouton exit)
// markActive() - Remettre status à 'active' (reconnexion)
```

**Détection automatique:**
- Utilise `onDisconnect()` de Firebase (WebSocket)
- `markActive()` appelé automatiquement au mount et visibility change

---

### Hook: `useInactivityDetection`

**Fichier:** `lib/hooks/useInactivityDetection.js`

Détecte l'inactivité utilisateur (pas d'interaction UI).

**Événements surveillés:**
- `mousedown`, `mousemove`, `click`
- `touchstart`, `touchmove`
- `keydown`, `scroll`
- `visibilitychange`

**Usage:**
```jsx
useInactivityDetection({
  roomCode: code,
  roomPrefix: 'rooms_mygame',
  playerUid: myUid,
  inactivityTimeout: 30000  // 30 secondes
});
```

**Comportement:**
1. Timer reset à chaque interaction
2. Après 30s sans interaction → `activityStatus: 'inactive'`
3. Dès interaction → `activityStatus: 'active'`

---

### Composant: `DisconnectAlert`

**Fichier:** `components/game/DisconnectAlert.jsx`

Overlay plein écran quand le joueur est marqué déconnecté.

**Props:**
```jsx
<DisconnectAlert
  roomCode={code}
  roomPrefix="rooms_mygame"
  playerUid={myUid}
  onReconnect={markActive}  // Fonction du hook usePlayerCleanup
/>
```

**Affichage:**
- Écoute `players/{uid}/status` en temps réel
- S'affiche si `status === 'disconnected'` ou `status === 'left'`
- Bouton "Revenir dans la partie" → appelle `markActive()`

**Ajouté aux pages:**
- `/game/[code]/play` (Quiz)
- `/blindtest/game/[code]/play`
- `/deeztest/game/[code]/play`
- `/alibi/game/[code]/play`
- `/trouveregle/game/[code]/play`

---

### Composant: `LobbySettings`

**Fichier:** `components/game/LobbySettings.jsx`

Modal settings dans le header (bouton roue crantée).

**Affichage des status:**
| Status joueur | Apparence |
|---------------|-----------|
| Actif | Normal |
| Inactif | Opacité 0.7, icône Moon orange |
| Déconnecté | Opacité 0.5, icône WifiOff rouge |

**Badge sur le bouton:**
- Point rouge si au moins 1 joueur déconnecté/inactif

---

### Composant: `RejoinBanner`

**Fichier:** `components/ui/RejoinBanner.jsx`

Banner sur la page `/home` pour rejoindre une partie en cours.

**Flux:**
1. `lq_last_game` stocké en localStorage au join
2. `useActiveGameCheck` vérifie si partie existe et joueur dedans
3. Si oui → Banner vert "Partie en cours - Rejoindre"

**Hook associé:** `useActiveGameCheck` (dans `usePlayerCleanup.js`)

---

### Tableau récapitulatif des déclencheurs

| Événement | Status | Visible pour l'hôte | Action joueur |
|-----------|--------|---------------------|---------------|
| Perte WiFi/réseau | `disconnected` | WifiOff rouge | DisconnectAlert → "Revenir" |
| Fermeture onglet | `disconnected` | WifiOff rouge | RejoinBanner sur /home |
| 30s sans interaction | `inactive` | Moon orange | Juste indicateur |
| Clic bouton Exit en jeu | `left` | WifiOff rouge | Retour home |

---

### Implémentation dans une page Play

```jsx
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import DisconnectAlert from "@/components/game/DisconnectAlert";

export default function PlayPage() {
  // ... autres hooks

  // Cleanup déconnexion
  const { markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_mygame',
    playerUid: myUid,
    phase: 'playing'
  });

  // Détection inactivité
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_mygame',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  return (
    <div>
      {/* ... contenu du jeu */}

      {/* Alert de déconnexion */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_mygame"
        playerUid={myUid}
        onReconnect={markActive}
      />
    </div>
  );
}
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

## Guide Complet: Créer un Nouveau Jeu

### Deux formats de jeux

| Type | Exemple | Caractéristiques |
|------|---------|------------------|
| **Lobby-based** | Quiz, BlindTest, Alibi | Room Firebase, code à 6 chiffres, host/players, multiplayer |
| **Local** | Mime | Pas de room, un seul appareil, state local |

---

### FORMAT 1: Jeu avec Lobby (Multiplayer)

#### Étape 1: Configuration

**`lib/config/games.js`** - Ajouter la game card:
```javascript
{
  id: 'mygame',
  name: 'Mon Jeu',
  Icon: GamepadIcon,        // Lucide icon
  image: '/images/mygame.png',
  minPlayers: 2,
  available: true,
  local: false,             // Important: false pour lobby
}
```

**`lib/config/rooms.js`** - Ajouter le type de room:
```javascript
{
  id: 'mygame',
  prefix: 'rooms_mygame',   // Préfixe Firebase
  path: '/mygame/room',     // Route du lobby
  playerSchema: (uid, name) => ({
    uid,
    name,
    score: 0,
    teamId: "",
    joinedAt: Date.now()
  })
}
```

#### Étape 2: Structure des dossiers

```
app/mygame/
├── room/[code]/page.jsx     ← Lobby (host configure, players attendent)
└── game/[code]/
    ├── host/page.jsx        ← Vue host pendant le jeu
    ├── play/page.jsx        ← Vue player pendant le jeu
    └── end/page.jsx         ← Résultats (podium, leaderboard)
```

#### Étape 3: Page Lobby (`room/[code]/page.jsx`)

**Header obligatoire:**
```jsx
<header className="lobby-header mygame">
  <div className="header-left">
    <ExitButton
      variant="header"
      onExit={handleExit}
      confirmMessage="Voulez-vous vraiment quitter ?"
    />
    <div className="header-title-row">
      <span className="game-emoji">🎮</span>
      <h1 className="lobby-title">Mon Jeu</h1>
    </div>
  </div>
  <div className="header-right">
    {isHost && (
      <PlayerManager
        players={players}
        roomCode={code}
        roomPrefix="rooms_mygame"
        hostUid={meta?.hostUid}
        variant="mygame"
        phase="lobby"
      />
    )}
    <ShareModal roomCode={code} />
  </div>
</header>
```

**Hooks obligatoires:**
```jsx
// Pub interstitielle au chargement
useInterstitialAd({ context: 'MyGame' });

// Liste des joueurs en temps réel
const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_mygame' });

// Nettoyage si déconnexion en lobby
usePlayerCleanup({
  roomCode: code,
  roomPrefix: 'rooms_mygame',
  playerUid: myUid,
  isHost,
  phase: 'lobby'
});

// Détection fermeture room par host
useRoomGuard({
  roomCode: code,
  roomPrefix: 'rooms_mygame',
  playerUid: myUid,
  isHost
});
```

**Listeners Firebase:**
```jsx
useEffect(() => {
  // Écouter les changements de meta
  const metaUnsub = onValue(ref(db, `rooms_mygame/${code}/meta`), snap => {
    const data = snap.val();
    if (!data || data.closed) {
      // Host a quitté → redirection
      router.push('/home');
    }
    setMeta(data);
  });

  // Écouter les changements de phase
  const stateUnsub = onValue(ref(db, `rooms_mygame/${code}/state`), snap => {
    const state = snap.val();
    if (state?.phase === 'playing') {
      // Redirection automatique host/player
      router.push(isHost
        ? `/mygame/game/${code}/host`
        : `/mygame/game/${code}/play`
      );
    }
  });

  return () => { metaUnsub(); stateUnsub(); };
}, [code, isHost]);
```

**Lancement du jeu (host only):**
```jsx
const handleStart = async () => {
  await update(ref(db, `rooms_mygame/${code}/state`), {
    phase: 'playing',
    currentIndex: 0,
    // ... autres états initiaux
  });
};
```

#### Étape 4: Page Play (`game/[code]/play/page.jsx`)

**Hooks obligatoires:**
```jsx
const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_mygame' });

// IMPORTANT: phase = 'playing' (pas 'lobby')
usePlayerCleanup({
  roomCode: code,
  roomPrefix: 'rooms_mygame',
  playerUid: myUid,
  isHost,
  phase: 'playing'  // ← Préserve le score si déconnexion
});

useRoomGuard({
  roomCode: code,
  roomPrefix: 'rooms_mygame',
  playerUid: myUid,
  isHost
});
```

#### Étape 5: Page End (`game/[code]/end/page.jsx`)

**Hooks obligatoires:**
```jsx
const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_mygame' });

// CRITIQUE: Comptage des parties terminées
useGameCompletion({ gameType: 'mygame', roomCode: code });

useRoomGuard({
  roomCode: code,
  roomPrefix: 'rooms_mygame',
  playerUid: myUid,
  isHost: false
});
```

**Bouton retour intelligent:**
```jsx
const isHost = myUid && meta?.hostUid === myUid;
const hostPresent = roomExists && meta && !meta.closed;

<button onClick={() => {
  if (!hostPresent) {
    router.push('/home');  // Host parti → accueil
  } else if (isHost) {
    handleBackToLobby();   // Host → nouvelle partie
  } else {
    router.push(`/mygame/room/${code}`);  // Player → lobby
  }
}}>
  {!hostPresent ? "Retour à l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
</button>
```

**Reset pour nouvelle partie (host):**
```jsx
const handleBackToLobby = async () => {
  const updates = {};

  // Reset scores joueurs
  players.forEach(p => {
    updates[`rooms_mygame/${code}/players/${p.uid}/score`] = 0;
  });

  // Reset état
  updates[`rooms_mygame/${code}/state/phase`] = 'lobby';
  updates[`rooms_mygame/${code}/state/currentIndex`] = 0;

  await update(ref(db), updates);
  router.push(`/mygame/room/${code}`);
};
```

#### Étape 6: Structure Firebase

```
rooms_mygame/{code}/
├── meta/
│   ├── code: "ABC123"
│   ├── hostUid: "user123"
│   ├── createdAt: timestamp
│   ├── closed: false          ← true quand host quitte
│   ├── mode: "individuel"     ← ou "équipes"
│   └── ... config spécifique
├── state/
│   ├── phase: "lobby"         ← "lobby" | "playing" | "ended"
│   └── ... état du jeu
└── players/
    └── {uid}/
        ├── uid, name, score
        ├── teamId: ""
        ├── status: "active"   ← "active" | "disconnected" | "left"
        └── joinedAt: timestamp
```

---

### FORMAT 2: Jeu Local (comme Mime)

**`lib/config/games.js`:**
```javascript
{
  id: 'mygame',
  name: 'Mon Jeu Local',
  local: true,  // ← Important!
}
```

**Une seule page: `app/mygame/page.tsx`**

```jsx
export default function MyGamePage() {
  const [phase, setPhase] = useState('lobby'); // 'lobby' | 'playing'

  // Pub interstitielle
  useInterstitialAd({ context: 'MyGame' });

  // Limites de parties (3/jour)
  const { isPro } = useSubscription(auth.currentUser);
  const { recordGamePlayed } = useGameLimits('mygame', isPro);

  // Enregistrer quand on quitte le jeu
  const handleBackToLobby = () => {
    recordGamePlayed();
    storage.set('returnedFromGame', true);
    setPhase('lobby');
  };

  // Pas de Firebase, pas de room code
  // Tout est en state local
}
```

---

### Checklist Finale: Nouveau Jeu Multiplayer

#### Config
- [ ] `lib/config/games.js` - game card avec `local: false`
- [ ] `lib/config/rooms.js` - ROOM_TYPES avec prefix et playerSchema

#### Pages
- [ ] `room/[code]/page.jsx` - Lobby
- [ ] `game/[code]/host/page.jsx` - Vue host (si différente de player)
- [ ] `game/[code]/play/page.jsx` - Vue player
- [ ] `game/[code]/end/page.jsx` - Résultats

#### Headers
- [ ] ExitButton avec confirmMessage
- [ ] PlayerManager pour kick (host only)
- [ ] ShareModal pour partager le code
- [ ] Titre du jeu + emoji

#### Hooks par page
```
Room:  useInterstitialAd, usePlayers, usePlayerCleanup(lobby), useRoomGuard
Play:  usePlayers, usePlayerCleanup(playing), useInactivityDetection, useRoomGuard, DisconnectAlert
Host:  usePlayers, useRoomGuard
End:   usePlayers, useGameCompletion, useRoomGuard
```

#### Firebase listeners
- [ ] meta → détecter `closed` pour redirect
- [ ] state.phase → redirect auto lobby→playing→ended
- [ ] players → affichage temps réel

#### End page
- [ ] Podium (PodiumPremium)
- [ ] Leaderboard
- [ ] Bouton intelligent (hostPresent check)
- [ ] Reset scores pour nouvelle partie

#### Join flow
- [ ] Vérifier que `/join?code=XXX` fonctionne (automatique via ROOM_TYPES)

#### Tests
- [ ] Créer room en tant que host
- [ ] Rejoindre via code en tant que player
- [ ] Kick un joueur
- [ ] Host quitte → tous redirigés
- [ ] Player se déconnecte en lobby → retiré
- [ ] Player se déconnecte en jeu → marqué "disconnected" (score préservé)
- [ ] Fin de partie → scores affichés
- [ ] Nouvelle partie → scores reset

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
lib/hooks/useInactivityDetection.js
lib/hooks/useRoomGuard.js
```

### Composants à vérifier
```
components/game/DisconnectAlert.jsx
components/game/LobbySettings.jsx
components/game/LobbyHeader.jsx
components/ui/RejoinBanner.jsx
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

---

# DOCUMENTATION DÉTAILLÉE PAR JEU

---

## Quiz (Buzzer) - Détails Techniques

### Structure des fichiers
```
app/room/[code]/page.jsx          (682 lignes) - Lobby
app/game/[code]/play/page.jsx     (652 lignes) - Vue joueur
app/game/[code]/host/page.jsx     (1190 lignes) - Vue host
app/end/[code]/page.jsx           (432 lignes) - Résultats
```

### Firebase Structure Complète
```
rooms/{code}/
├── meta/
│   ├── hostUid, code, createdAt, closed
│   ├── mode: "individuel" | "équipes"
│   ├── teamCount: 2-4
│   ├── teams/{teamId}: { name, color, score }
│   └── quizSelection: { themeIds[], categoryName, categoryEmoji, themes[] }
├── state/
│   ├── phase, currentIndex, revealed
│   ├── lockUid (qui a buzzé)
│   ├── pausedAt, lockedAt, elapsedAcc, lastRevealAt
│   ├── buzzBanner (notification)
│   ├── buzz: { uid, at }
│   └── pendingBuzzes/{uid}: { uid, name, localTime, adjustedTime, receivedAt }
├── quiz: { id, title, items[] }
└── players/{uid}/
    ├── uid, name, score, teamId
    ├── status, activityStatus
    ├── blockedUntil (penalty timer)
    └── joinedAt, disconnectedAt, lastActivityAt
```

### Système de Buzz (150ms Window)
Le host résout les buzzes dans une fenêtre de 150ms pour compenser la latence réseau:

1. Joueur clique buzz → écrit dans `pendingBuzzes[uid]` avec `adjustedTime`
2. Host attend 150ms (collecte tous les buzzes)
3. Host sélectionne le buzz avec le plus petit `adjustedTime`
4. `lockUid` est défini, `pendingBuzzes` supprimées

**Calcul latence:** `adjustedTime = localTime + serverOffset` (via `.info/serverTimeOffset`)

**Note Firebase `.info/serverTimeOffset`:**
- Valeur estimée par Firebase pour compenser la différence entre l'horloge client et serveur
- Accès via `ref(db, '.info/serverTimeOffset')` avec `onValue`
- Utilisé dans: Quiz buzzer, BlindTest/DeezTest pour timing précis

### Scoring Config (`public/config/scoring.json`)
```json
{
  "normal": { "start": 100, "floor": 50, "durationMs": 20000 },
  "difficile": { "start": 200, "floor": 100, "durationMs": 20000 },
  "lockoutMs": 8000,
  "wrongAnswerPenalty": 25
}
```

**Formule points:**
```javascript
ratio = 1 - (elapsedTime / durationMs)
points = floor(start + (start - floor) × ratio)
```

### États du Buzzer
| État | Couleur | Condition |
|------|---------|-----------|
| `active` | Rouge | Peut buzzer |
| `pending` | Jaune | Buzz envoyé, attente résolution |
| `success` | Vert | A gagné le buzz |
| `blocked` | Gris | Quelqu'un d'autre a buzzé |
| `penalty` | Orange | Cooldown 8s après mauvaise réponse |

### Hue Scénarios
| Événement | Scénario |
|-----------|----------|
| Fin de partie | `victory` |
| Question révélée | `roundStart` |
| Buzz détecté | `buzz` |
| Temps écoulé | `timeUp` |
| Bonne réponse | `goodAnswer` |
| Mauvaise réponse | `badAnswer` |

### Auto-Rejoin (Lobby)
Si un joueur refresh pendant le lobby et `onDisconnect` se déclenche:
1. Détecte joueur absent de la liste
2. Tente auto-rejoin (1 seule fois via `rejoinAttemptedRef`)
3. Si erreur "permission denied" → joueur a été kick

---

## BlindTest (Spotify) - Détails Techniques

### Structure des fichiers
```
app/blindtest/room/[code]/page.jsx
app/blindtest/game/[code]/play/page.jsx
app/blindtest/game/[code]/host/page.jsx
app/blindtest/game/[code]/end/page.jsx
app/blindtest/spotify-callback/page.jsx
lib/spotify/auth.js
lib/spotify/api.js
lib/spotify/player.js
lib/constants/blindtest.js
```

### Intégration Spotify

**Authentification PKCE:**
1. Génère `code_verifier` + `code_challenge` (SHA-256)
2. Stocke dans sessionStorage
3. Redirect vers `accounts.spotify.com/authorize`
4. Callback échange code contre token

**Scopes requis:**
- `streaming` - Web Playback SDK
- `user-read-playback-state`, `user-modify-playback-state`
- `playlist-read-private`, `playlist-read-collaborative`
- `user-read-private`, `user-read-email`

**Tokens:** Stockés en cookies httpOnly (sécurisé, anti-XSS)

### Firebase Structure
```
rooms_blindtest/{code}/
├── meta/
│   ├── hostUid, code, createdAt, closed
│   ├── mode: "individuel" | "équipes"
│   ├── playlist: { id, name, imageUrl, trackCount }
│   └── playlistsUsed: number (compteur pour limite free users)
├── state/
│   ├── phase: "lobby" | "playing" | "ended"
│   ├── currentIndex, snippetLevel
│   └── revealed, playing, paused
└── players/{uid}/
    └── uid, name, score, teamId, status, activityStatus
```

### Niveaux de Snippets (`lib/constants/blindtest.js`)
| Level | Durée | Points (start) | Points (floor) |
|-------|-------|----------------|----------------|
| 0 | 1.5s | 200 | 150 |
| 1 | 3s | 150 | 100 |
| 2 | 10s | 100 | 75 |
| 3 | Full | 50 | 25 |

**Scoring:** Basé sur `highestSnippetLevel` atteint, pas le niveau actuel.

### Spotify Player (`lib/spotify/player.js`)
```javascript
initializePlayer({ onReady, onStateChange, onError })
playSnippet(trackUri, durationMs)  // Auto-pause après durée
playTrack(trackUri, positionMs)
preloadTrack(trackUri)             // Précharge silencieux
pause() / resume() / seek() / setVolume()
```

**Keep-alive:** Ping toutes les 15s pour éviter timeout device.

### Limites Free Users
- Max 3 playlists par session
- Compté dans `meta.playlistsUsed`
- Pro users: illimité

---

## DeezTest (Deezer) - Détails Techniques

### Structure des fichiers
```
app/deeztest/room/[code]/page.jsx
app/deeztest/game/[code]/play/page.jsx
app/deeztest/game/[code]/host/page.jsx
app/deeztest/game/[code]/end/page.jsx
lib/deezer/api.js
lib/deezer/player.js
```

### Firebase Structure
```
rooms_deeztest/{code}/
├── meta/
│   ├── hostUid, code, createdAt, closed
│   ├── mode: "individuel" | "équipes"
│   ├── playlist: { id, name, imageUrl, trackCount }
│   └── playlistsUsed: number (compteur pour limite free users)
├── state/
│   ├── phase: "lobby" | "playing" | "ended"
│   ├── currentIndex, snippetLevel
│   └── revealed, playing, paused
├── tracks: [{ id, title, artist, album, albumArt, previewUrl }]
└── players/{uid}/
    └── uid, name, score, teamId, status, activityStatus
```

### Différences vs BlindTest
| Feature | DeezTest | BlindTest |
|---------|----------|-----------|
| Source | Deezer public API | Spotify Web API |
| Auth | Aucune (public) | OAuth requis |
| Audio | HTML5 `<audio>` | Spotify Web Playback SDK |
| Durée | 30s preview | Track complet |
| Start offset | 5s skip | Aucun |
| Preview URL | Expire ~24h | Persistant |

### Deezer API (`lib/deezer/api.js`)
Toutes les fonctions passent par `/api/deezer` proxy (CORS).

```javascript
searchPlaylists(query, limit)
getFeaturedPlaylists(limit)
getPlaylistTracks(playlistId, limit)
getRandomTracksFromPlaylist(playlistId, count)
formatTracksForGame(tracks)
```

**Track Object:**
```javascript
{ id, title, artist, album, albumArt, previewUrl, duration }
```

### Deezer Player (`lib/deezer/player.js`)
```javascript
initializePlayer({ onReady, onStateChange, onError, onEnded })
loadPreview(url)
playSnippet(url, durationMs)  // Auto-stop
pause() / resume() / seek() / setVolume()
preloadPreview(url)           // Browser cache
```

**PREVIEW_START_OFFSET_SEC = 5** (skip intro)

### Refresh URLs
Les preview URLs Deezer expirent après ~24h. Le host:
1. Détecte erreur de lecture
2. Appelle `refreshTrackUrls()`
3. Fetche nouvelles URLs depuis Deezer
4. Met à jour Firebase atomiquement

---

## Alibi - Détails Techniques

### Structure des fichiers
```
app/alibi/room/[code]/page.jsx        (742 lignes) - Lobby + rôles
app/alibi/game/[code]/prep/page.jsx   (1086 lignes) - Préparation
app/alibi/game/[code]/play/page.jsx   (1380 lignes) - Interrogatoire
app/alibi/game/[code]/end/page.jsx    (873 lignes) - Résultats
components/alibi/AlibiSelectorModal.jsx
components/alibi/AlibiPhaseTransition.jsx
components/alibi/VerdictTransition.jsx
```

### Phases du Jeu
```
LOBBY → PREP (90s) → INTERROGATION (10 questions) → END
```

### Firebase Structure
```
rooms_alibi/{code}/
├── meta/
│   ├── hostUid, code, createdAt, closed
│   └── alibiId
├── state/
│   ├── phase: "lobby" | "prep" | "interrogation" | "end"
│   ├── currentQuestion: 0-9
│   ├── prepTimeLeft, prepPaused
│   ├── questionTimeLeft, allAnswered
│   └── [...]
├── players/{uid}/
│   └── team: "inspectors" | "suspects" | null
├── alibi/
│   ├── title, context, accused_document (HTML)
│   ├── inspector_summary, inspector_questions[]
│   └── isNewFormat: boolean
├── questions[] (10 questions avec hints)
├── interrogation/
│   ├── currentQuestion, state, timeLeft
│   ├── responses/{suspect_uid}: { answer, uid, name }
│   └── verdict: null | "correct" | "incorrect" | "timeout"
└── score/
    ├── correct: 0-10
    └── total: 10
```

### Deux Formats d'Alibi
**OLD FORMAT:**
```json
{
  "title": "...",
  "scenario": "Markdown avec **bold**",
  "predefinedQuestions": [7 questions]
  // + 3 questions custom par inspecteurs
}
```

**NEW FORMAT:**
```json
{
  "title": "...",
  "context": "Accusation",
  "accused_document": "<p>HTML sanitisé</p>",
  "inspector_summary": "Faits clés",
  "inspector_questions": [
    { "text": "Question?", "hint": "Indice pour vérifier" }
  ] // 10 questions, pas de custom
}
```

### Scoring
- **Suspects gagnent** si >= 50% cohérent
- **Inspecteurs gagnent** si < 50%
- Points par tentative: 10 (1ère), 7 (2ème), 4 (3ème)
- Wrong answer penalty: -25 pts

### Composants Spéciaux
- **AlibiPhaseTransition:** Overlay 3.5s entre phases
- **VerdictTransition:** Affichage verdict (correct/incorrect/timeout)
- **DOMPurify:** Sanitisation HTML pour `accused_document`

---

## Mime - Détails Techniques

### Structure des fichiers
```
app/mime/page.tsx                     (201 lignes)
components/mime/MimeGame.tsx          (255 lignes)
components/mime/MimeCard.tsx          (163 lignes)
data/mime-words.ts                    (212 lignes)
```

### Caractéristiques
- **Pas de Firebase** - Tout en state local
- **Pas de room code** - Jeu solo/local
- **Pas de timer** - Jeu libre
- **Pas d'équipes** - Organisation naturelle des joueurs

### Thèmes de Mots
| Thème | Emoji | Mots |
|-------|-------|------|
| Général | 🎯 | 139 |
| Disney | 🏰 | 66 |
| Métiers | 👷 | 92 |
| Animaux | 🦁 | 128 |
| Objets | 📦 | 75 |

### MimeCard - Drag to Reveal
```javascript
const y = useMotionValue(0);
dragConstraints={{ top: -180, bottom: 0 }}
dragElastic={0.05}
// Spring back: stiffness 400, damping 30
```

Le joueur glisse la carte vers le haut pour révéler le mot.

### Couleurs Mime
```javascript
MIME_COLORS = {
  primary: '#00ff66',     // Neon green
  secondary: '#00cc52',
  dark: '#00802f',
}
```

### Hooks Utilisés
- `useInterstitialAd` - Pub au chargement
- `useGameLimits` - 3 parties gratuites/jour
- `useSubscription` - Vérification Pro

---

## Trouve la Règle - Détails Techniques

### Structure des fichiers
```
app/trouveregle/room/[code]/page.jsx       (1046 lignes)
app/trouveregle/game/[code]/play/page.jsx  (1113 lignes)
app/trouveregle/game/[code]/investigate/page.jsx (872 lignes)
app/trouveregle/game/[code]/end/page.jsx   (485 lignes)
data/trouveregle-rules.ts                  (309 lignes)
```

### Phases du Jeu
```
LOBBY → CHOOSING → PLAYING → GUESSING → REVEAL → ENDED
```

### Firebase Structure
```
rooms_trouveregle/{code}/
├── meta/
│   ├── hostUid, code, createdAt, closed
│   ├── mode: "meme_piece" | "a_distance"
│   └── timerMinutes: 3 | 5 | 7 | 10
├── state/
│   ├── phase
│   ├── currentRule: { id, text, category, difficulty }
│   ├── ruleOptions: [3 règles]
│   ├── investigatorUids: []
│   ├── votes: { uid: ruleId }
│   ├── guesses: []
│   ├── guessAttempts: number
│   ├── guessVotes: { uid: boolean }
│   ├── rerollsUsed: number
│   ├── foundByInvestigators: boolean
│   ├── timerEndAt
│   └── playedRuleIds: []
└── players/{uid}/
    └── role: "player" | "investigator"
```

### Base de Règles (201 règles)
**Catégories:**
- Physical (26) - Gestes, postures
- Visual (9) - Regard, position
- Conversational (45) - Mots, phrases
- Relational (9) - Interactions
- Troll (20) - Décalées/chaos

**Difficultés:** Easy ⭐, Medium ⭐⭐, Hard ⭐⭐⭐, Expert ⭐⭐⭐⭐

**Mode "À distance":** Filtre `onlineCompatible: true`

### Scoring
```
Enquêteurs trouvent:
  - 1ère tentative: +10 pts
  - 2ème tentative: +7 pts
  - 3ème tentative: +4 pts

Enquêteurs échouent (3 wrong):
  - Joueurs: +5 pts chacun
```

### Status Implementation ✅
```
Room:       ✅ useInterstitialAd, usePlayers, usePlayerCleanup, useRoomGuard
Play:       ✅ usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert
Investigate: ✅ usePlayers, useRoomGuard, usePlayerCleanup, useInactivityDetection, DisconnectAlert
End:        ✅ usePlayers, useRoomGuard, useGameCompletion
```

---

---

# COMPOSANTS UI PARTAGÉS

---

## Boutons Interactifs (`components/ui/InteractiveButton.jsx`)

| Composant | Effet |
|-----------|-------|
| `RippleButton` | Ripple Material Design au clic |
| `ShineButton` | Shine gradient au hover |
| `GlowButton` | Pulsing glow animation |
| `InteractiveCard` | Lift + shadow au hover |
| `FlipButton` | Rotation 3D au hover |
| `BounceBadge` | Spring bounce au mount |
| `AnimatedInput` | Focus glow ring |
| `AnimatedCheckbox` | Checkmark animé |

## JuicyButton (`components/ui/JuicyButton.jsx`)
- Particules au clic (8 particules)
- Sons: `button-click`, `button-hover`
- Vibration haptique
- Animations hover/tap

## Modals

### SelectorModal
- Grid de sélection (quiz, alibi)
- Lock Pro au-delà de `freeLimit`
- Variants: `'quiz'` (purple), `'alibi'` (orange)

### PaywallModal
- Two-stage: Guest → Connected
- Pricing: Monthly vs Annual
- Benefits list

### GameLimitModal
- 3 parties gratuites épuisées
- Watch ad / Upgrade / Later

### GuestAccountPromptModal
- Apparaît après 3 parties pour guests
- Cooldown 24h ou 3 parties

### GuestWarningModal
- Bloque création room pour guests
- Sign-in Google/Apple

## Loaders (`components/ui/GameLoader.jsx`)

| Variant | Animation |
|---------|-----------|
| `dots` | 3 dots bouncing |
| `pulse` | Pulsing circle |
| `spinner` | Rotating ring |
| `bars` | 5-bar equalizer |

## PodiumPremium (`components/ui/PodiumPremium.jsx`)
- Layout 3D perspective
- Médailles animées (🥇🥈🥉)
- Particle effects (stars, fireworks)
- Sons de victoire

## Toast System (`components/shared/Toast.jsx`)
- Types: success, error, warning, info
- Portal-based (top center)
- Auto-dismiss
- Backdrop blur

## Confetti (`components/shared/Confetti.jsx`)
```javascript
triggerConfetti('success')   // 100 particles, green
triggerConfetti('reward')    // 150 particles, rainbow
triggerConfetti('victory')   // 200 particles, explosive
triggerConfetti('team', teamColor)
triggerConfettiBurst(count, delay)
```

---

---

# HOOKS ET UTILITAIRES

---

## Hooks de Jeu

### usePlayers
```javascript
const { players, me, activePlayers, playersMap, isLoading } = usePlayers({
  roomCode,
  roomPrefix: 'rooms',
  sort: 'score' | 'joinedAt' | null
});
```

### usePlayerCleanup
```javascript
const { leaveRoom, markActive } = usePlayerCleanup({
  roomCode,
  roomPrefix,
  playerUid,
  phase: 'lobby' | 'playing' | 'ended'
});
// lobby → supprime joueur
// playing → marque disconnected (préserve score)
// ended → rien
```

### useInactivityDetection
```javascript
useInactivityDetection({
  roomCode,
  roomPrefix,
  playerUid,
  inactivityTimeout: 30000,
  enabled: true
});
// Events: mousedown, mousemove, click, touchstart, touchmove, keydown, scroll, visibilitychange
// Throttle: 1 update/sec max
```

### useRoomGuard
```javascript
const { markVoluntaryLeave, closeRoom } = useRoomGuard({
  roomCode,
  roomPrefix,
  playerUid,
  isHost
});
// Détecte: kick, host exit, room closure
```

### useGameCompletion
```javascript
const { recorded } = useGameCompletion({
  gameType: 'quiz',
  roomCode
});
// Appelé sur page END, 1 seule fois
```

### useGameLimits
```javascript
const {
  gamesPlayed, freeGamesRemaining, totalGamesRemaining,
  canPlayFree, canWatchAdForGame, isBlocked,
  recordGamePlayed, watchAdForExtraGame, checkCanPlay
} = useGameLimits(gameType, isPro);
// Free: 3 games/day
// Rewarded: unlimited via ads
```

## Hooks Audio

### useSound
```javascript
const play = useSound('/sounds/buzz.mp3', { volume: 0.6 });
play();
```

### useBuzzerAudio
```javascript
const { playSound } = useBuzzerAudio();
playSound('buzz');    // quiz-buzzer.wav
playSound('success'); // quiz-good answer.wav
playSound('error');   // quiz-bad-answer.wav
```

### useGameAudio
```javascript
const { play, playSequence, playMusic, stopMusic } = useGameAudio();
play('correct');
playSequence(['buzz', 'correct'], 500);
playMusic('lobby', { loop: true });
```

## Hooks User

### useSubscription
```javascript
const { isLoading, isPro, isAdmin, tier } = useSubscription(user);
```

### useUserProfile
```javascript
const {
  user, profile, stats, subscription, settings,
  isLoggedIn, isPro, level, xp, displayName
} = useUserProfile();
```

## Hooks UI

### useFitText
```javascript
const { containerRef, textRef, fontSize } = useFitText({
  minFontSize: 12,
  maxFontSize: 32,
  step: 1,
  text: 'Hello'
});
```

### useToast
```javascript
const { addToast, removeToast } = useToast();
addToast({ type: 'success', message: 'Done!' });
```

## Hooks Data

### useGameRoom
```javascript
const {
  state, meta, players, loading, error,
  playerCount, teams, teamCount, isTeamMode
} = useGameRoom(roomCode, { roomType: 'rooms' });
```

### useRoomSubscription
```javascript
const { meta, players, isHost, handleHostExit, loading } = useRoomSubscription(
  code,
  'rooms',
  { onMetaUpdate, onPlayersUpdate, onStateUpdate }
);
```

---

## Utilitaires

### Storage (`lib/utils/storage.js`)
```javascript
storage.set('key', value)      // Préfixe 'lq_'
storage.get('key')
storage.remove('key')
storage.has('key')
storage.getOrDefault('key', default)
```

### Code Generation (`lib/utils.js`)
```javascript
genCode(len = 6)               // A-Z, 2-9 (no O/I/0/1)
isCodeUsed(code)               // Check all room types
genUniqueCode(len, maxAttempts)
sleep(ms)
```

### Rate Limiting (`lib/rate-limit.js`)
```javascript
RATE_LIMIT_CONFIGS = {
  api: { requests: 100, window: '1m' },
  createRoom: { requests: 10, window: '1h' },
  joinRoom: { requests: 20, window: '1m' },
  buzz: { requests: 5, window: '1s' },
  auth: { requests: 10, window: '15m' }
}
checkRateLimit(identifier, action)
```

---

---

# SYSTÈME DE PUBS (AdMob)

---

## Configuration (`lib/admob.js`)

```javascript
AD_UNIT_IDS = {
  ios: { interstitial: '...', rewarded: '5594671010' },
  android: { interstitial: '...', rewarded: '6397628551' }
}

APP_IDS = {
  ios: 'ca-app-pub-1140758415112389~9949860754',
  android: 'ca-app-pub-1140758415112389~6606152744'
}
```

## Fonctions
```javascript
initAdMob()              // Init Capacitor AdMob
showInterstitialAd()     // Affiche interstitial
showRewardedAd()         // Retourne { success, reward }
isAdsAvailable()         // true si native platform
```

## Web Simulation
- Interstitials: Skip (success simulé)
- Rewarded: Success avec reward simulé

---

---

# SYSTÈME D'ABONNEMENT

---

## Tiers (`lib/subscription.js`)

```javascript
SUBSCRIPTION_TIERS = { FREE: 'free', PRO: 'pro' }

FREE_LIMITS = {
  quiz: { packs: 3, maxGamesPerDay: 10 },
  alibi: { scenarios: 3, maxGamesPerDay: 5 },
  buzzer: { unlimited: true }
}

PRO_PRICING = {
  monthly: { price: 3.99, currency: 'EUR' },
  annual: { price: 29.99, currency: 'EUR', savings: 37 }
}
```

## Fonctions
```javascript
isPro(user)
canAccessPack(user, gameType, packIndex)
canPlayGame(user, gameType, gamesPlayedToday)
getUserTier(user)
getRemainingGames(user, gameType, gamesPlayedToday)
```

## Founders/Admins
- Configuré via env: `NEXT_PUBLIC_FOUNDER_UIDS`, `NEXT_PUBLIC_FOUNDER_EMAILS`
- Accès Pro permanent sans paiement

---

---

# SYSTÈME DE PROFIL UTILISATEUR

---

## Schema Firebase (`lib/userProfile.js`)

```
users/{uid}/
├── profile/
│   ├── displayName, email, photoURL, pseudo
│   └── createdAt, lastLoginAt
├── stats/
│   ├── gamesPlayed, wins, totalScore
│   ├── quizGamesPlayed, alibiGamesPlayed
│   └── level (1-50), xp
├── subscription/
│   ├── tier ('free'|'pro')
│   ├── expiresAt, subscriptionId
└── settings/
    ├── theme ('light'|'dark')
    ├── soundEnabled, vibrationEnabled
```

## Levels (XP)
```
Level 1: 0 XP
Level 2: 100 XP
Level 3: 250 XP
Level 4: 450 XP
Level 5: 700 XP
Level 6-50: 1000 + (level-5)*200 XP
```

---

---

# ANALYTICS (`lib/analytics.js`)

---

```javascript
initAnalytics()
logEvent(eventName, eventParams)
trackSignup(method, uid)      // 'google' | 'apple' | 'anonymous'
trackLogin(method, uid)
trackRoomCreated(mode, code, uid)
trackRoomJoined(mode, code, uid, role)
trackGameStarted(mode, code, playerCount, contentId)
trackGameCompleted(mode, code, duration, score, winnerId, completed)
trackPaywallShown(contentType, contentName, uid)
trackPaywallConversion(contentType, uid, pricingTier)
trackSubscriptionPurchase(uid, tier, price, currency)
trackFeatureUsage(featureName, params)
trackPageView(pagePath, pageTitle)
trackError(errorType, errorMessage, location)
```

---

---

# IN-APP PURCHASES (RevenueCat)

---

## Configuration (`lib/revenuecat.js`)

```javascript
PRODUCT_IDS = {
  MONTHLY: 'gigglz_pro_monthly',
  ANNUAL: 'gigglz_pro_annual'
}
ENTITLEMENT_ID = 'pro'
```

## Fonctions
```javascript
initRevenueCat(userId)
checkProStatus()
getOfferings()
purchaseSubscription('monthly' | 'annual')
restorePurchases()
getCustomerInfo()
openManageSubscriptions()
```

---

---

# INTÉGRATION HUE

---

## Fichiers (`lib/hue-module/`)
- `HueConnection` - Connexion au bridge
- `HueGameConfig` - Config par jeu
- `HueLightSelector` - Sélection lampes
- `HueSettingsSection` - UI settings
- `hueScenariosService` - Déclenchement scénarios
- `hueService` - API Hue

## Scénarios Disponibles
```javascript
'victory', 'defeat', 'roundStart', 'buzz',
'timeUp', 'goodAnswer', 'badAnswer'
```

---

---

# DESIGN SYSTEM

---

## Variables CSS (`app/theme.css`)

### Couleurs par Jeu
```css
--quiz-primary: #8b5cf6;      /* Purple */
--alibi-primary: #f59e0b;     /* Orange */
--blindtest-primary: #10b981; /* Green */
--deeztest-primary: #A238FF;  /* Magenta */
--mime-primary: #00ff66;      /* Neon Green */
--trouveregle-primary: #06b6d4; /* Cyan */
```

### Couleurs Sémantiques
```css
--success: #22c55e;
--danger: #ef4444;
--warning: #f59e0b;
--info: #3b82f6;
```

### Fonts
```css
--font-title: 'Bungee';       /* Gros titres */
--font-display: 'Space Grotesk'; /* UI labels */
--font-body: 'Inter';         /* Body text */
--font-mono: 'Roboto Mono';   /* Codes, nombres */
```

## Classes Button
```css
.btn              /* Base glassmorphism */
.btn-primary      /* Purple gradient */
.btn-accent       /* Orange gradient */
.btn-success      /* Green gradient */
.btn-danger       /* Red gradient */
.btn-purple       /* Purple variant */
.btn-outline      /* White + border */
.btn-sm, .btn-lg  /* Sizes */
```

## Z-Index Layers
```css
z-9999: Toast, DisconnectAlert, Modals
z-9998: Backdrops
z-1: Base content
```

---

## Dernière mise à jour

**Date:** 2026-01-09
**Contexte:** Documentation complète multi-agent (Quiz, BlindTest, DeezTest, Alibi, Mime, TrouveRegle, UI, Hooks)
