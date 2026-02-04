# LetsQueeze - Guide de Développement

> Documentation optimisée pour Claude. Chaque système documenté UNE seule fois.

---

## 0. RÈGLES DE TRAVAIL (OBLIGATOIRE)

**Avant TOUT changement de code (Edit, Write, création de fichier):**

1. **Expliquer** de manière concise ce qui va être modifié
2. **Attendre** la confirmation explicite de l'utilisateur ("go", "ok", "fais-le", "oui")
3. **Seulement après validation** → effectuer le changement

**Pourquoi:** Éviter les modifications non comprises ou non souhaitées.

**Exception:** Les commandes de lecture (Read, Glob, Grep) ne nécessitent pas de confirmation.

---

**Après TOUT changement UI/CSS (styles, layout, composants visuels):**

1. **NE PAS** prendre de screenshots pour auto-vérifier
2. **Laisser l'utilisateur** vérifier le rendu et donner son feedback
3. **Attendre** les instructions de l'utilisateur avant de corriger

**Pourquoi:** L'analyse automatique des screenshots n'est pas fiable et crée des problèmes supplémentaires. L'utilisateur voit le rendu en temps réel et peut donner un feedback précis.

---

**JAMAIS lancer le serveur de développement:**

- Ne **JAMAIS** exécuter `npm run dev`, `npm start` ou équivalent
- C'est à l'utilisateur de gérer le serveur de développement
- Si le serveur n'est pas accessible, **demander** à l'utilisateur de le lancer

**Pourquoi:** Éviter les conflits de ports et les processus zombies.

---

**TOUJOURS centraliser les fonctionnalités réutilisables:**

- Si plusieurs jeux utilisent (ou pourraient utiliser) une fonctionnalité → **en faire un composant/hook partagé**
- Placer les hooks partagés dans `lib/hooks/`
- Placer les composants partagés dans `components/game/`
- Éviter la duplication de logique entre les jeux

**Exemples:**
- Système de buzz → hooks partagés (`usePlayers`, `useRoomGuard`, etc.)
- Banners de connexion → `GameStatusBanners` (wrapper réutilisable)
- Gestion des joueurs → `PlayerManager`, `Leaderboard`

**Pourquoi:** Maintenance simplifiée, comportement cohérent entre les jeux, moins de bugs.

---

## 1. ARCHITECTURE RAPIDE

### Jeux & Routes

| Jeu | Route Lobby | Firebase Prefix | Type |
|-----|-------------|-----------------|------|
| Quiz (Buzzer) | `/room/[code]` | `rooms/` | Multiplayer |
| DeezTest (Deezer) | `/deeztest/room/[code]` | `rooms_deeztest/` | Multiplayer |
| Alibi | `/alibi/room/[code]` | `rooms_alibi/` | Multiplayer |
| La Loi | `/laloi/room/[code]` | `rooms_laloi/` | Multiplayer |
| Mime | `/mime` | Aucun (local) | Local |

### Structure Pages (Multiplayer)

```
app/{game}/
├── room/[code]/page.jsx      # Lobby
└── game/[code]/
    ├── host/page.jsx         # Vue host (si différente)
    ├── play/page.jsx         # Vue player
    └── end/page.jsx          # Résultats
```

### Structure Firebase (Standard)

```
{prefix}/{code}/
├── meta/
│   ├── hostUid, code, createdAt
│   ├── closed              # true → redirect tous les players
│   └── mode                # "individuel" | "équipes"
├── state/
│   ├── phase               # "lobby" | "playing" | "ended"
│   └── ...                 # État spécifique au jeu
└── players/{uid}/
    ├── uid, name, score, teamId
    ├── status              # "active" | "disconnected" | "left"
    ├── activityStatus      # "active" | "inactive"
    └── joinedAt
```

---

## 2. HOOKS OBLIGATOIRES

### Matrice par Page

| Hook/Composant | Room | Play | Host | End |
|----------------|:----:|:----:|:----:|:---:|
| `useInterstitialAd` | ✓ | | | |
| `usePlayers` | ✓ | ✓ | ✓ | ✓ |
| `usePlayerCleanup` | ✓ (lobby) | ✓ (playing) | | |
| `usePresence` | ✓ | | | |
| `useInactivityDetection` | | ✓ | ✓ | |
| `useRoomGuard` | ✓ | ✓ | ✓ | ✓ |
| `useHostDisconnect` | | | ✓ | |
| `useWakeLock` | ✓ | ✓ | ✓ | |
| `useGameCompletion` | | | | ✓ |
| `DisconnectAlert` | | ✓ | | |
| `GameStatusBanners` | | ✓ | ✓ | |

### Signatures

```javascript
// Liste joueurs temps réel
const { players, me, activePlayers } = usePlayers({
  roomCode, roomPrefix, sort: 'score' | 'joinedAt'
});

// Cleanup déconnexion
const { leaveRoom, markActive } = usePlayerCleanup({
  roomCode, roomPrefix, playerUid,
  phase: 'lobby' | 'playing' | 'ended'
  // lobby → supprime joueur | playing → marque disconnected (score préservé)
});

// Présence temps réel (lobby uniquement, pour TOUS les joueurs y compris host)
const { isConnected, forceReconnect } = usePresence({
  roomCode, roomPrefix, playerUid,
  heartbeatInterval: 15000,
  enabled: !!myUid  // IMPORTANT: inclure le host (pas !isHost)
});

// Inactivité (30s sans interaction)
useInactivityDetection({
  roomCode, roomPrefix, playerUid,
  inactivityTimeout: 30000
});

// Détection kick/fermeture room + grace period hôte
const { markVoluntaryLeave, closeRoom, isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
  roomCode, roomPrefix, playerUid, isHost
});

// Empêcher l'écran de se verrouiller (lobby, play, host)
useWakeLock({ enabled: true });

// Comptage parties (page END uniquement)
useGameCompletion({ gameType: 'quiz', roomCode });

// Pub interstitielle (page ROOM uniquement)
useInterstitialAd({ context: 'Quiz' });
```

### Composant DisconnectAlert

```jsx
// Ajouter dans toutes les pages Play (pour les joueurs)
<DisconnectAlert
  roomCode={code}
  roomPrefix="rooms_mygame"
  playerUid={myUid}
  onReconnect={markActive}  // du hook usePlayerCleanup
/>
```

### Composant GameStatusBanners

```jsx
// Ajouter dans toutes les pages Host et Play
import GameStatusBanners from '@/components/game/GameStatusBanners';

const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({...});

<GameStatusBanners
  isHost={isHost}
  isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
  hostDisconnectedAt={hostDisconnectedAt}
/>
```

---

## 3. SYSTÈME DE STATUS JOUEURS

### États Possibles

| Status | Champ | Déclencheur | Icône Host |
|--------|-------|-------------|------------|
| Actif | `status: 'active'` | Normal | - |
| Déconnecté | `status: 'disconnected'` | Perte WebSocket | WifiOff rouge |
| Parti | `status: 'left'` | Bouton Exit en jeu | WifiOff rouge |
| Inactif | `activityStatus: 'inactive'` | 30s sans interaction | Moon orange |

### Comportement par Phase

| Phase | Déconnexion | Score | TeamId |
|-------|-------------|-------|--------|
| `lobby` | Joueur **marqué disconnected** | - | Préservé |
| `playing` | Joueur **marqué disconnected** | Préservé | Préservé |
| `ended` | Aucun cleanup | - | - |

### Grace Period Hôte

L'hôte bénéficie d'une **grace period de 2 minutes** avant que la room soit considérée fermée :

- Déconnexion hôte → `hostDisconnectedAt` écrit (pas `closed = true`)
- Hôte revient (visibilitychange/reconnexion) → `hostDisconnectedAt` supprimé
- Si hôte absent > 2 min → room considérée fermée

**Permet:** Switch d'app, changement réseau WiFi→5G, micro-coupures sans fermer la partie.

### Composants Associés

- `LobbySettings` - Affiche status dans modal settings (badge rouge si problème)
- `RejoinBanner` - Banner sur `/home` pour rejoindre partie en cours
- `DisconnectAlert` - Overlay plein écran pour se reconnecter
- `GameStatusBanners` - Wrapper pour les banners de connexion (host + players)
- `ConnectionLostBanner` - Banner rouge quand connexion Firebase perdue
- `HostDisconnectedBanner` - Banner orange pour joueurs quand hôte temporairement absent

---

## 4. SYSTÈME DE PUBS (AdMob)

### Flags de Skip

| Flag | Storage | Quand |
|------|---------|-------|
| `returnedFromGame` | localStorage | Skip si revient d'une partie |
| `adShownDuringJoin` | localStorage | Skip si vue pendant join |
| `rewardedAdWatched` | sessionStorage | Skip après rewarded ad |

### Logique `useInterstitialAd`

Skip pub si: User Pro OU `returnedFromGame` OU `rewardedAdWatched` OU `adShownDuringJoin`

### Flux Rewarded Ads

```
3 parties épuisées → Modal GameLimitModal
  → watchAdForExtraGame() → sessionStorage.set('rewardedAdWatched')
  → Prochaine room: skip interstitial
```

### Config (`lib/admob.js`)

```javascript
AD_UNIT_IDS = {
  ios: { interstitial: '...', rewarded: '5594671010' },
  android: { interstitial: '...', rewarded: '6397628551' }
}
```

---

## 5. SYSTÈME D'ABONNEMENT

### Limites Free

```javascript
FREE_LIMITS = {
  quiz: { packs: 3, maxGamesPerDay: 10 },
  alibi: { scenarios: 3, maxGamesPerDay: 5 },
  buzzer: { unlimited: true }
}
```

### Fonctions Clés

```javascript
const { isPro, tier } = useSubscription(user);
const { canPlayFree, recordGamePlayed, watchAdForExtraGame } = useGameLimits(gameType, isPro);
```

### Founders/Admins

Variables env: `NEXT_PUBLIC_FOUNDER_UIDS`, `NEXT_PUBLIC_FOUNDER_EMAILS` → Pro permanent

---

## 6. SPÉCIFICITÉS PAR JEU

### Quiz - Système de Buzz

**Fenêtre 150ms** pour compenser latence réseau:
1. Joueur buzz → écrit `pendingBuzzes[uid]` avec `adjustedTime`
2. Host attend 150ms
3. Host sélectionne `min(adjustedTime)`
4. `lockUid` défini, `pendingBuzzes` supprimées

**Calcul latence:** `adjustedTime = localTime + serverOffset` (Firebase `.info/serverTimeOffset`)

**États Buzzer:** `active` (rouge) → `pending` (jaune) → `success` (vert) / `blocked` (gris) / `penalty` (orange, 8s)

**Scoring:** `points = floor + (start - floor) × (1 - elapsed/duration)`

### DeezTest (Deezer)

- Pas d'auth (API publique)
- HTML5 `<audio>` avec preview 30s
- URLs expirent ~24h → `refreshTrackUrls()` si erreur
- Proxy CORS via `/api/deezer`

### Alibi

**Phases:** `lobby` → `prep` (90s) → `interrogation` (10 questions) → `end`

**Rôles:** `inspectors` vs `suspects`

**Scoring:** Suspects gagnent si ≥50% cohérent

**Formats:** Old (scenario markdown) vs New (accused_document HTML + DOMPurify)

### La Loi

**Phases:** `lobby` → `choosing` → `playing` → `guessing` → `reveal` → `ended`

**Modes:** `meme_piece` (présentiel) vs `a_distance` (filtre `onlineCompatible`)

**Scoring:** +10 (1ère tentative), +7 (2ème), +4 (3ème) / Joueurs +5 si enquêteurs échouent

### Mime

- **Jeu local** - pas de Firebase, pas de room
- State local uniquement
- Hooks: `useInterstitialAd`, `useGameLimits`
- Drag-to-reveal avec Framer Motion

---

## 7. SYSTÈME PARTY MODE / GAME MASTER MODE

Système universel permettant deux modes de jeu pour les jeux multijoueurs avec buzzer.

### Modes Disponibles

| Mode | Description | Qui pose les questions |
|------|-------------|------------------------|
| `gamemaster` | Mode classique | L'hôte anime, ne joue pas |
| `party` | Tout le monde joue | Rotation entre joueurs |

### Configuration

**`lib/config/rooms.js`** - Activer pour un jeu:
```javascript
{
  id: 'mygame',
  prefix: 'rooms_mygame',
  supportsPartyMode: true,  // Active le choix du mode à la création
  // ...
}
```

**Firebase `meta/`**:
```javascript
gameMasterMode: 'gamemaster' | 'party'
hostName: 'Pseudo'  // Nom de l'hôte (affiché dans "X lit la question...")
```

**Firebase `state/`** (Party Mode uniquement):
```javascript
currentAskerUid: 'uid123'      // Qui pose la question actuellement
currentAskerTeamId: 'team1'    // En mode équipes: quelle équipe pose
askerRotation: [...]           // Ordre pré-calculé (UIDs ou teamIds)
askerIndex: 0                  // Position dans la rotation
```

### Éléments Réutilisables

| Élément | Fichier | Usage |
|---------|---------|-------|
| `GameModeSelector` | `components/ui/GameModeSelector.jsx` | Modal choix mode à la création |
| `useAskerRotation` | `lib/hooks/useAskerRotation.js` | Hook logique rotation |
| `AskerTransition` | `components/game/AskerTransition.jsx` | Animation changement d'asker |
| `*HostView` | `components/game/QuizHostView.jsx`, etc. | Vue partagée host/asker |

### Hook `useAskerRotation`

```javascript
const {
  isPartyMode,           // true si gameMasterMode === 'party'
  currentAsker,          // { uid, name, teamId } du joueur qui pose
  currentAskerUid,       // UID du joueur qui pose
  isCurrentAsker,        // (uid) => boolean - suis-je l'asker ?
  canBuzz,               // (uid, teamId) => boolean - puis-je buzzer ?
  advanceToNextAsker     // async () => avance au prochain asker
} = useAskerRotation({
  roomCode, roomPrefix, meta, state, players
});
```

### Pattern Composant `*HostView`

Créer un composant partagé contenant TOUTE la logique host:

```jsx
// components/game/MyGameHostView.jsx
export default function MyGameHostView({ code, isActualHost = true, onAdvanceAsker }) {
  // canControl = true si actual host OU si Party Mode asker
  const canControl = isActualHost || (meta?.gameMasterMode === 'party' && state?.currentAskerUid === myUid);

  // ... toute la logique host (buzz resolution, actions, UI)

  // Après validate/skip, avancer au prochain asker:
  if (onAdvanceAsker) {
    await onAdvanceAsker();
  }
}
```

**Page host simplifiée:**
```jsx
// app/mygame/game/[code]/host/page.jsx
export default function HostPage() {
  const { code } = useParams();
  return <MyGameHostView code={code} isActualHost={true} />;
}
```

**Page play avec rendu conditionnel:**
```jsx
// app/mygame/game/[code]/play/page.jsx
const amIAsker = isPartyMode && isCurrentAsker(myUid);

if (amIAsker) {
  return (
    <>
      <AskerTransition show={showTransition} asker={currentAsker} isMe={true} />
      <MyGameHostView code={code} isActualHost={false} onAdvanceAsker={advanceToNextAsker} />
    </>
  );
}
// Sinon: vue player avec buzzer
```

### Checklist Ajouter Party Mode à un Nouveau Jeu

1. **Config**
   - [ ] `lib/config/rooms.js` → `supportsPartyMode: true`

2. **Création Room** (`app/(main)/home/page.jsx`)
   - [ ] Ajouter `gameMasterMode` dans les meta
   - [ ] Ajouter `hostName` dans les meta

3. **Lobby** (`room/[code]/page.jsx`)
   - [ ] Badge Party Mode: `{meta?.gameMasterMode === 'party' && <div className="game-mode-badge party">...`
   - [ ] `handleStartGame`: initialiser `askerRotation`, `currentAskerUid`, etc.
   - [ ] Countdown: rediriger tout le monde vers `/play` en Party Mode

4. **Composant HostView**
   - [ ] Créer `components/game/MyGameHostView.jsx`
   - [ ] Props: `code`, `isActualHost`, `onAdvanceAsker`
   - [ ] `canControl` = isActualHost OU currentAskerUid === myUid

5. **Pages**
   - [ ] `host/page.jsx`: utiliser `<MyGameHostView isActualHost={true} />`
   - [ ] `play/page.jsx`: utiliser `useAskerRotation` + rendu conditionnel

6. **Firebase Rules**
   - [ ] Permettre au `currentAskerUid` de modifier `state`, `lockUid`, etc.

### Firebase Rules Pattern

```json
"state": {
  ".write": "auth.uid == root.child('rooms_mygame/'+$code+'/meta/hostUid').val() ||
             (root.child('rooms_mygame/'+$code+'/meta/gameMasterMode').val() == 'party' &&
              auth.uid == root.child('rooms_mygame/'+$code+'/state/currentAskerUid').val())"
}
```

### Jeux Supportant Party Mode

| Jeu | Supporté | Composant HostView |
|-----|:--------:|-------------------|
| Quiz | ✓ | `QuizHostView.jsx` |
| DeezTest | ✓ | `DeezTestHostView.jsx` |

---

## 8. SYSTÈME "À VENIR" (Coming Soon)

### Configuration dans `lib/config/games.js`

Pour marquer un jeu comme "à venir":

```javascript
{
  id: 'nouveaujeu',
  name: 'Nouveau Jeu',
  // ... autres propriétés
  comingSoon: true,           // OBLIGATOIRE - Active le mode "à venir"
  available: false,           // OBLIGATOIRE - Empêche l'accès au jeu
  releaseDate: '2025-02-12T00:00:00+01:00',  // OPTIONNEL - Active le countdown
  themeColor: '#06b6d4',      // OPTIONNEL - Couleur pour le futur
}
```

### Format de Date

Le `releaseDate` doit être en **ISO 8601 avec timezone**:
- `2025-02-12T00:00:00+01:00` → 12 février 2025 à minuit heure française
- `2025-03-15T18:00:00+01:00` → 15 mars 2025 à 18h heure française

### Comportement Visuel (`GameCard.jsx` + `globals.css`)

| Élément | Comportement |
|---------|--------------|
| Carte | Grisée (grayscale 60%, brightness 70%, opacity 80%) |
| Hover | Légèrement moins grisé |
| Badge "À VENIR" | Centré sous le titre, plus grand et visible |
| Countdown | Affiché au-dessus du titre si `releaseDate` défini |
| Bouton favori | Masqué |
| Click | Pas de navigation (card non cliquable) |

### Countdown Automatique

Si `releaseDate` est défini et dans le futur:
- Affiche "Disponible dans Xj Xh" ou "Xh Xmin" ou "Xmin"
- Se met à jour toutes les minutes
- Disparaît automatiquement quand la date est passée

### Fichiers Impliqués

```
lib/config/games.js       # Configuration des jeux (comingSoon, releaseDate)
lib/components/GameCard.jsx   # Logique countdown + affichage conditionnel
app/globals.css           # Styles .coming-soon, .countdown-badge
```

### Checklist Lancement d'un Jeu

Quand un jeu passe de "à venir" à "disponible":

1. [ ] Retirer `comingSoon: true` dans `games.js`
2. [ ] Mettre `available: true` dans `games.js`
3. [ ] Retirer `releaseDate` (optionnel, ignoré si pas comingSoon)
4. [ ] Vérifier que les routes du jeu sont prêtes
5. [ ] Tester le parcours complet (création room → fin de partie)

---

## 9. COMPOSANTS PARTAGÉS

### Headers Lobby

```jsx
<header className="lobby-header {game}">
  <div className="header-left">
    <ExitButton variant="header" onExit={handleExit} confirmMessage="..." />
    <div className="header-title-row">
      <span className="game-emoji">🎮</span>
      <h1 className="lobby-title">Nom du Jeu</h1>
    </div>
  </div>
  <div className="header-right">
    {isHost && <PlayerManager players={players} roomCode={code} roomPrefix="..." hostUid={meta?.hostUid} />}
    <ShareModal roomCode={code} />
  </div>
</header>
```

### Modals Importantes

| Modal | Usage |
|-------|-------|
| `SelectorModal` | Sélection quiz/alibi avec lock Pro |
| `PaywallModal` | Upgrade Pro (Guest → Connected) |
| `GameLimitModal` | 3 parties épuisées |
| `GuestWarningModal` | Bloque création room guests |

### UI Components

| Composant | Fichier |
|-----------|---------|
| `JuicyButton` | Particules + son + haptic |
| `PodiumPremium` | Podium 3D animé |
| `GameLoader` | Variantes: dots, pulse, spinner, bars |
| `Confetti` | `triggerConfetti('victory')` |

---

## 10. UTILITAIRES

### Storage

```javascript
import { storage } from '@/lib/utils/storage';
storage.set('key', value)  // Préfixe auto 'lq_'
storage.get('key')
storage.remove('key')
```

### Code Generation

```javascript
import { genUniqueCode } from '@/lib/utils';
const code = await genUniqueCode(6);  // A-Z, 2-9 (pas O/I/0/1)
```

### Audio

```javascript
const { playSound } = useBuzzerAudio();
playSound('buzz');     // quiz-buzzer.wav
playSound('success');  // quiz-good-answer.wav
playSound('error');    // quiz-bad-answer.wav
```

---

## 11. DESIGN SYSTEM

### Couleurs par Jeu

```css
--quiz-primary: #8b5cf6;        /* Purple */
--alibi-primary: #f59e0b;       /* Orange */
--deeztest-primary: #A238FF;    /* Magenta */
--mime-primary: #00ff66;        /* Neon Green */
--laloi-primary: #06b6d4; /* Cyan */
```

### Classes Boutons

`.btn` `.btn-primary` `.btn-accent` `.btn-success` `.btn-danger` `.btn-outline` `.btn-sm` `.btn-lg`

### Z-Index

`z-9999`: Toast, DisconnectAlert, Modals | `z-9998`: Backdrops

### Fonts

`--font-title: 'Bungee'` | `--font-display: 'Space Grotesk'` | `--font-body: 'Inter'`

---

## 12. CHECKLISTS

### Modification Transversale

Quand on modifie une feature partagée, vérifier:

```
Pages:
  Quiz:       app/room/[code], app/game/[code]/{play,host}, app/end/[code]
  DeezTest:   app/deeztest/room/[code], game/[code]/{play,host,end}
  Alibi:      app/alibi/room/[code], game/[code]/{prep,play,end}
  LaLoi: app/laloi/room/[code], game/[code]/{play,investigate,end}
  Mime:       app/mime/page.tsx

Hooks:        lib/hooks/use{Players,PlayerCleanup,InactivityDetection,RoomGuard,GameCompletion,InterstitialAd}.js
Composants:   components/game/{DisconnectAlert,LobbySettings,LobbyHeader}.jsx
```

### Nouveau Jeu Multiplayer

1. **Config**
   - [ ] `lib/config/games.js` - game card avec `local: false`
   - [ ] `lib/config/rooms.js` - ROOM_TYPES avec prefix et playerSchema

2. **Pages**
   - [ ] `room/[code]/page.jsx` - Lobby avec hooks: useInterstitialAd, usePlayers, usePlayerCleanup(lobby), useRoomGuard, usePresence(`enabled: !!myUid`)
   - [ ] `game/[code]/play/page.jsx` - avec hooks: usePlayers, usePlayerCleanup(playing), useInactivityDetection, useRoomGuard + DisconnectAlert
   - [ ] `game/[code]/end/page.jsx` - avec hooks: usePlayers, useGameCompletion, useRoomGuard

3. **Firebase Listeners**
   - [ ] `meta.closed` → redirect /home
   - [ ] `state.phase` → redirect auto entre pages

4. **Tests**
   - [ ] Créer/rejoindre room
   - [ ] Host quitte → tous redirigés
   - [ ] Player déconnecte lobby → retiré
   - [ ] Player déconnecte jeu → marqué disconnected (score préservé)
   - [ ] Fin de partie → scores affichés
   - [ ] Nouvelle partie → scores reset

---

## 13. COMMANDES

```bash
npm run dev          # Dev server
npm run build        # Production build
npx cap sync         # Sync Capacitor
npx cap open ios     # Xcode
npx cap open android # Android Studio
```

---

## 14. OUTILS DE DÉVELOPPEMENT (MCP)

### Authentification Dev

Pour tester avec un UID spécifique via MCP Chrome DevTools:

```
GET /dev/signin?uid=USER_UID
```

**Exemple:** `http://localhost:3000/dev/signin?uid=gIimzElcsZZeJrBcM6V2IM0aV1N2`

Cette page:
1. Récupère un token Firebase custom pour l'UID
2. Connecte automatiquement l'utilisateur
3. Redirige vers `/home`

**Important:** Le MCP contrôle une seule instance Chrome. Tous les onglets partagent les mêmes cookies/session. Pour avoir deux users différents (host + player), l'utilisateur doit rejoindre manuellement depuis un autre appareil/navigateur.

### Simulation de Joueurs

**API:** `POST /api/dev/seed-players`

```javascript
// Ajouter 5 faux joueurs avec scores aléatoires
{ "roomCode": "ABC123", "prefix": "rooms", "action": "seed", "count": 5 }

// Ajouter des joueurs spécifiques
{ "roomCode": "ABC123", "prefix": "rooms", "action": "seed",
  "players": [
    { "name": "Alice", "score": 120 },
    { "name": "Bob", "score": 85 }
  ]
}

// Modifier le score d'un joueur
{ "roomCode": "ABC123", "prefix": "rooms", "action": "updateScore",
  "playerUid": "fake_alice", "score": 200 }

// Simuler une déconnexion
{ "roomCode": "ABC123", "prefix": "rooms", "action": "disconnect",
  "playerUid": "fake_bob" }

// Reconnecter un joueur
{ "roomCode": "ABC123", "prefix": "rooms", "action": "reconnect",
  "playerUid": "fake_bob" }

// Marquer comme inactif
{ "roomCode": "ABC123", "prefix": "rooms", "action": "inactive",
  "playerUid": "fake_charlie" }

// Supprimer tous les faux joueurs
{ "roomCode": "ABC123", "prefix": "rooms", "action": "clear" }

// Lister les joueurs
{ "roomCode": "ABC123", "prefix": "rooms", "action": "list" }
```

**Prefixes disponibles:** `rooms` (Quiz), `rooms_deeztest`, `rooms_alibi`, `rooms_laloi`

**Sécurité:** Ces APIs ne fonctionnent qu'en `NODE_ENV=development` et depuis localhost.

### Workflow de Test Visuel

1. Se connecter: `http://localhost:3000/dev/signin?uid=HOST_UID`
2. Créer une room (cliquer sur un jeu)
3. L'utilisateur rejoint depuis un autre appareil
4. Seed des faux joueurs via l'API
5. Tester les interactions (scores, déconnexions, etc.)
6. Prendre des screenshots pour valider les changements UI

---

## 15. RÈGLES IMPORTANTES

### AppShell & Viewport

- Utiliser `height: var(--app-height)` (PAS 100vh)
- `flex: 1; min-height: 0;` pour les pages
- PAS de `padding-top/bottom: env(safe-area-inset-*)` dans les composants
- L'AppShell gère automatiquement les safe-areas (top ET bottom) via `globals.css`

### Flags Pub

- Toujours reset les flags après lecture
- `rewardedAdWatched` en sessionStorage → perdu si refresh

### Firebase `.info/serverTimeOffset`

Utilisé pour synchroniser les timestamps entre clients (buzzer, timing).

```javascript
onValue(ref(db, '.info/serverTimeOffset'), snap => {
  const offset = snap.val() || 0;
  const serverTime = Date.now() + offset;
});
```

---

*Dernière mise à jour: 2026-01-27*
