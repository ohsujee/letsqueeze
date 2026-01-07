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
| **Trouve la Règle** | `/trouveregle/room/[code]` | `rooms_trouveregle/` | En cours |

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
  ○ Room: useInterstitialAd, usePlayers, usePlayerCleanup, useRoomGuard
  ○ Play: usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, DisconnectAlert
  ○ Investigate: usePlayers, useRoomGuard
  ○ End: useGameCompletion, usePlayers, useRoomGuard

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

## Dernière mise à jour

**Date:** 2026-01-07
**Contexte:** Système complet de status joueurs (déconnexion, inactivité, rejoin)
