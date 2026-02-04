# Refonte Mime - Jeu Multijoueur

> Document de spécification pour transformer le jeu Mime local en jeu multijoueur avec système de rooms.

---

## 1. RÉSUMÉ DU PROJET

### Objectif
Transformer le jeu Mime (actuellement local, sans Firebase) en un jeu multijoueur avec :
- Système de rooms (comme Quiz Buzzer et Alibi)
- Mode Party par défaut (tous les joueurs participent)
- Rotation des mimeurs
- Système de buzzer pour deviner
- Timer de 30 secondes par mot

### Ce qui est conservé
- **MimeCard** : Le composant de carte avec swipe-to-reveal
- **Données des mots** : Les 5 thèmes existants (~500+ mots)
- **Design neon vert** : Couleurs et style visuel

### Ce qui change
- Passage de local à Firebase
- Ajout du système de buzz
- Ajout du timer
- Ajout du scoring compétitif
- Rotation automatique des mimeurs

---

## 2. RÈGLES DU JEU

### Déroulement d'un tour

```
1. Un joueur est désigné comme MIMEUR
2. Il voit une carte avec le mot caché
3. Il swipe pour révéler le mot (lui seul le voit)
4. Le TIMER de 30 secondes démarre
5. Il mime le mot aux autres joueurs
6. Les DEVINEURS peuvent BUZZER quand ils pensent savoir
7. Si buzz :
   - Timer PAUSE
   - Le devineur donne sa réponse à voix haute
   - Le mimeur valide (Correct/Faux)
8. Si correct → points attribués, mot suivant
9. Si faux → pénalité, timer reprend
10. Si timeout → on passe, mimeur suivant
```

### Scoring

| Action | Points |
|--------|--------|
| **Mimeur** fait trouver son mot | **+50 pts** |
| **Devineur** trouve le mot | **+100 pts** |
| **Mauvaise réponse** | **-25 pts** |
| **Pénalité temps** | **8 secondes** de blocage |
| **Timeout** (personne trouve) | 0 pts pour tous |

### Fin de partie

**~30 mots par partie** avec rotation équitable :
- Chaque joueur mime le même nombre de fois
- Le nombre total s'ajuste pour être un multiple du nombre de joueurs
- Minimum 2 tours par joueur

| Joueurs | Mots/joueur | Total |
|---------|-------------|-------|
| 3 | 10 | **30** |
| 4 | 8 | **32** |
| 5 | 6 | **30** |
| 6 | 5 | **30** |
| 7 | 4 | **28** |
| 8 | 4 | **32** |
| 9 | 3 | **27** |
| 10 | 3 | **30** |
| 11 | 3 | **33** |
| 12 | 3 | **36** |
| 13 | 2 | **26** |
| 14 | 2 | **28** |
| 15 | 2 | **30** |
| 16 | 2 | **32** |
| 17 | 2 | **34** |
| 18 | 2 | **36** |
| 19 | 2 | **38** |
| 20 | 2 | **40** |

Le total varie entre **26 et 40 mots** (équité garantie : chacun mime le même nombre de fois).

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Structure Firebase

```
rooms_mime/{code}/
├── meta/
│   ├── code: "ABC123"
│   ├── createdAt: timestamp
│   ├── expiresAt: timestamp (+12h)
│   ├── hostUid: "uid_host"
│   ├── hostName: "Alice"
│   ├── closed: false
│   └── selectedThemes: ["general", "disney", "animaux"]
│
├── state/
│   ├── phase: "lobby" | "playing" | "ended"
│   │
│   │  # Gestion des mots
│   ├── wordPool: ["mot1", "mot2", ...] (shuffled)
│   ├── currentIndex: 0
│   ├── totalWords: 30 (ajusté pour équité)
│   ├── wordsPerPlayer: 5 (mots par joueur)
│   │
│   │  # État du tour actuel
│   ├── revealed: false
│   ├── revealedAt: null (timestamp début timer 30s)
│   ├── pausedAt: null (timestamp pause)
│   ├── elapsedAcc: 0 (ms accumulées avant pauses)
│   │
│   │  # Système de buzz
│   ├── lockUid: null
│   ├── lockedAt: null
│   ├── buzzBanner: ""
│   ├── pendingBuzzes: { uid: { adjustedTime, name } }
│   │
│   │  # Rotation des mimeurs
│   ├── currentMimeUid: "uid123"
│   ├── mimeRotation: ["uid1", "uid2", "uid3"]
│   └── mimeIndex: 0
│
├── players/{uid}/
│   ├── uid: "uid123"
│   ├── name: "Bob"
│   ├── score: 0
│   ├── blockedUntil: 0
│   ├── status: "active" | "disconnected" | "left"
│   ├── activityStatus: "active" | "inactive"
│   └── joinedAt: timestamp
│
└── presence/{uid}/
    ├── at: timestamp
    └── name: "Bob"
```

### 3.2 Structure des Pages

```
app/mime/
├── page.tsx                    # SUPPRIMER (ancien jeu local)
│
├── room/[code]/
│   └── page.jsx               # Lobby
│
└── game/[code]/
    ├── play/page.jsx          # Vue unifiée (mimeur OU devineur)
    └── end/page.jsx           # Résultats
```

### 3.3 Composants

```
components/
├── game/
│   ├── MimeHostView.jsx       # CRÉER - Vue du mimeur
│   └── MimeCard.tsx           # EXISTANT - Garder tel quel
│
└── game-mime/
    ├── MimeGame.tsx           # SUPPRIMER (remplacé par pages)
    └── MimeCard.tsx           # DÉPLACER vers components/game/
```

---

## 4. CONFIGURATION

### 4.1 `lib/config/games.js`

```javascript
{
  id: 'mime',
  name: 'Mime',
  Icon: Theater,
  image: '/images/mime-game.png',
  minPlayers: 3,        // 1 mime + 2 devineurs minimum
  maxPlayers: 20,       // Maximum 20 joueurs
  addedAt: '2024-08-01',
  local: false,         // CHANGÉ: false (était true)
  available: true,
}
```

### 4.2 `lib/config/rooms.js`

Ajouter dans `ROOM_TYPES` :

```javascript
{
  id: 'mime',
  prefix: 'rooms_mime',
  path: '/mime/room',
  supportsPartyMode: false,  // Toujours Party Mode, pas de choix
  navigateBeforeCreate: true,

  playerSchema: (uid, name) => ({
    uid,
    name,
    score: 0,
    blockedUntil: 0,
    joinedAt: Date.now(),
    status: 'active',
    activityStatus: 'active'
  }),

  createMeta: ({ code, now, hostUid, hostName }) => ({
    code,
    createdAt: now,
    expiresAt: now + 12 * 60 * 60 * 1000,
    hostUid,
    hostName,
    closed: false,
    selectedThemes: []
  }),

  createState: () => ({
    phase: 'lobby',
    wordPool: [],
    currentIndex: 0,
    totalWords: 0,
    wordsPerPlayer: 0,
    revealed: false,
    revealedAt: null,
    pausedAt: null,
    elapsedAcc: 0,
    lockUid: null,
    lockedAt: null,
    buzzBanner: '',
    currentMimeUid: null,
    mimeRotation: [],
    mimeIndex: 0
  })
}
```

### 4.3 `lib/config/constants.js`

Ajouter les constantes Mime :

```javascript
export const MIME_CONFIG = {
  // Timer
  TIMER_DURATION_MS: 30000,      // 30 secondes par mot
  MIME_GRACE_PERIOD_MS: 10000,   // 10s grace si mimeur déconnecte

  // Scoring
  CORRECT_GUESSER_POINTS: 100,   // +100 pour le devineur
  CORRECT_MIME_POINTS: 50,       // +50 pour le mimeur
  WRONG_ANSWER_PENALTY: 25,      // -25 points
  LOCKOUT_MS: 8000,              // 8 secondes de pénalité

  // Buzz
  BUZZ_WINDOW_MS: 150,           // Fenêtre de buzz (comme Quiz)

  // Équité (comme Party Mode)
  TARGET_WORDS: 30,              // Cible de mots par partie
  MIN_WORDS_PER_PLAYER: 2,       // Minimum 2 tours par joueur

  // Limites
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 20
};
```

---

## 5. FIREBASE RULES

Ajouter dans `firebase.rules.json` :

```json
"rooms_mime": {
  "$code": {
    ".read": "auth != null",

    "meta": {
      ".write": "auth.uid == data.child('hostUid').val() || !data.exists()",
      "closed": {
        ".write": "auth.uid == data.parent().child('hostUid').val()"
      }
    },

    "state": {
      ".write": "auth.uid == root.child('rooms_mime/'+$code+'/meta/hostUid').val() || auth.uid == data.child('currentMimeUid').val()",

      "pendingBuzzes": {
        "$uid": {
          ".write": "auth.uid == $uid || auth.uid == root.child('rooms_mime/'+$code+'/meta/hostUid').val() || auth.uid == root.child('rooms_mime/'+$code+'/state/currentMimeUid').val()"
        }
      },

      "lockUid": {
        ".write": "auth.uid == root.child('rooms_mime/'+$code+'/meta/hostUid').val() || auth.uid == root.child('rooms_mime/'+$code+'/state/currentMimeUid').val() || (data.val() == null && newData.val() == auth.uid)"
      }
    },

    "players": {
      "$uid": {
        ".write": "auth.uid == $uid || auth.uid == root.child('rooms_mime/'+$code+'/meta/hostUid').val() || auth.uid == root.child('rooms_mime/'+$code+'/state/currentMimeUid').val()"
      }
    },

    "presence": {
      "$uid": {
        ".write": "auth.uid == $uid"
      }
    }
  }
}
```

---

## 6. HOOKS À CRÉER/ADAPTER

### 6.1 `useMimeRotation.js` (nouveau)

Adapté de `useAskerRotation.js` :

```javascript
export function useMimeRotation({ roomCode, meta, state, players }) {
  const isCurrentMime = useCallback((uid) => {
    return state?.currentMimeUid === uid;
  }, [state?.currentMimeUid]);

  const canBuzz = useCallback((uid) => {
    // Ne peut pas buzzer si c'est le mimeur
    if (state?.currentMimeUid === uid) return false;
    // Ne peut pas buzzer si bloqué
    const player = players.find(p => p.uid === uid);
    if (player?.blockedUntil > Date.now()) return false;
    return true;
  }, [state?.currentMimeUid, players]);

  const currentMime = useMemo(() => {
    const uid = state?.currentMimeUid;
    const player = players.find(p => p.uid === uid);
    return player ? { uid, name: player.name } : null;
  }, [state?.currentMimeUid, players]);

  // Note: advanceToNextMime est géré par advanceToNextWord()
  // Le mimeur change automatiquement à chaque mot (rotation simple)

  return {
    currentMime,
    currentMimeUid: state?.currentMimeUid,
    isCurrentMime,
    canBuzz
  };
}
```

### 6.2 `useMimeTimer.js` (nouveau)

```javascript
export function useMimeTimer({ state, serverTime }) {
  const [timeLeft, setTimeLeft] = useState(30000);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!state?.revealed || !state?.revealedAt) {
      setTimeLeft(30000);
      setIsRunning(false);
      return;
    }

    // Timer pausé si quelqu'un a buzzé
    if (state?.pausedAt || state?.lockUid) {
      setIsRunning(false);
      return;
    }

    setIsRunning(true);

    const interval = setInterval(() => {
      const elapsed = state.elapsedAcc + (serverTime - state.revealedAt);
      const remaining = Math.max(0, 30000 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        // Timeout - géré par le mimeur
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state, serverTime]);

  return { timeLeft, isRunning, isTimeout: timeLeft <= 0 };
}
```

---

## 7. COMPOSANTS À CRÉER

### 7.1 `MimeHostView.jsx`

Vue du mimeur avec :
- MimeCard (swipe-to-reveal)
- Timer visible
- Modal de validation quand quelqu'un buzz
- Bouton "Passer" (skip)
- Score actuel

```jsx
// Structure simplifiée
export default function MimeHostView({ code, onWordComplete }) {
  // États et hooks...

  return (
    <div className="mime-host-view">
      {/* Header avec timer */}
      <MimeTimer timeLeft={timeLeft} isRunning={isRunning} />

      {/* Carte à mimer */}
      <MimeCard
        word={currentWord}
        onReveal={handleReveal}
        disabled={revealed}
      />

      {/* Progression */}
      <div className="progress">
        Mot {currentIndex + 1} / {totalWords}
      </div>

      {/* Modal de validation si buzz */}
      {lockUid && (
        <BuzzValidationModal
          buzzerName={buzzerName}
          word={currentWord}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
        />
      )}

      {/* Bouton passer */}
      <button onClick={handleSkip}>Passer ce mot</button>
    </div>
  );
}
```

### 7.2 `MimeGuesserView.jsx`

Vue des devineurs avec :
- Indication "X est en train de mimer..."
- Timer visible
- Buzzer
- Leaderboard
- État du buzz (pending, blocked, etc.)

### 7.3 `MimeTimer.jsx`

Composant de timer circulaire ou barre de progression :
- Affiche les secondes restantes
- Change de couleur selon le temps (vert → orange → rouge)
- Animation de pause quand buzz

### 7.4 `BuzzValidationModal.jsx`

Modal pour le mimeur quand quelqu'un buzz :
- Nom du buzzeur
- Le mot à faire deviner (rappel)
- Bouton "Correct" (vert)
- Bouton "Faux" (rouge)

---

## 8. PAGES À CRÉER

### 8.1 `app/mime/room/[code]/page.jsx`

**Lobby avec :**
- Sélection des thèmes (UI existante réutilisée)
- Liste des joueurs (avec compteur min 3)
- Bouton démarrer (host only, actif si thèmes sélectionnés + min 3 joueurs)

**Hooks requis :**
```javascript
useInterstitialAd({ context: 'MimeRoom' })
usePlayers({ roomCode: code, roomPrefix: 'rooms_mime' })
usePlayerCleanup({ phase: 'lobby', ... })
usePresence({ enabled: !!myUid })
useRoomGuard({ ... })
useWakeLock({ enabled: true })
```

### 8.2 `app/mime/game/[code]/play/page.jsx`

**Vue unifiée :**
```jsx
export default function MimePlayPage() {
  const { isCurrentMime } = useMimeRotation(...);

  // Si je suis le mimeur
  if (isCurrentMime(myUid)) {
    return (
      <>
        <MimeTransition show={showTransition} mime={currentMime} isMe={true} />
        <MimeHostView code={code} onWordComplete={handleWordComplete} />
      </>
    );
  }

  // Sinon, vue devineur
  return (
    <>
      <MimeTransition show={showTransition} mime={currentMime} isMe={false} />
      <MimeGuesserView code={code} />
    </>
  );
}
```

**Hooks requis :**
```javascript
usePlayers({ roomCode: code, roomPrefix: 'rooms_mime' })
usePlayerCleanup({ phase: 'playing', ... })
useInactivityDetection({ ... })
useRoomGuard({ ... })
useMimeRotation({ ... })
useMimeTimer({ ... })
useServerTime({ tick: 100 })
useWakeLock({ enabled: true })
```

### 8.3 `app/mime/game/[code]/end/page.jsx`

**Page de résultats :**
- Podium animé (réutiliser `PodiumPremium`)
- Leaderboard complet
- Stats de la partie
- Boutons : Rejouer / Retour home

**Hooks requis :**
```javascript
usePlayers({ roomCode: code, roomPrefix: 'rooms_mime' })
useRoomGuard({ ... })
useGameCompletion({ gameType: 'mime', roomCode: code })
```

---

## 9. FLUX DE DONNÉES

### 9.1 Démarrage de partie (handleStartGame)

```javascript
async function handleStartGame() {
  const activePlayers = players.filter(p => p.status === 'active');
  const playerCount = activePlayers.length;

  // 1. Calculer le nombre de mots (équité comme Party Mode)
  const { totalWords, wordsPerPlayer } = calculateMimeWords(playerCount);

  // 2. Créer le pool de mots shuffled
  const wordPool = createWordPool(meta.selectedThemes);
  const shuffledWords = shuffleArray(wordPool);
  const wordsToUse = shuffledWords.slice(0, totalWords);

  // 3. Créer la rotation des mimeurs (shuffled)
  const shuffledPlayers = shuffleArray([...activePlayers]);
  const mimeRotation = shuffledPlayers.map(p => p.uid);

  // 4. Écrire dans Firebase
  await update(ref(db, `rooms_mime/${code}`), {
    'state/phase': 'playing',
    'state/wordPool': wordsToUse,
    'state/totalWords': totalWords,
    'state/wordsPerPlayer': wordsPerPlayer,
    'state/currentIndex': 0,
    'state/mimeRotation': mimeRotation,
    'state/mimeIndex': 0,
    'state/currentMimeUid': mimeRotation[0],
    'state/revealed': false
  });
}

/**
 * Calcule le nombre de mots pour une partie équitable
 * Chaque joueur mime le même nombre de fois
 */
function calculateMimeWords(playerCount, target = 30) {
  if (playerCount <= 1) return { totalWords: target, wordsPerPlayer: target };

  // Minimum 2 mots par joueur
  const wordsPerPlayer = Math.max(2, Math.round(target / playerCount));
  const totalWords = wordsPerPlayer * playerCount;

  return { totalWords, wordsPerPlayer };
}
```

### 9.2 Révélation de carte (handleReveal)

```javascript
async function handleReveal() {
  await update(ref(db, `rooms_mime/${code}/state`), {
    revealed: true,
    revealedAt: serverTimestamp(),
    elapsedAcc: 0,
    pausedAt: null
  });
}
```

### 9.3 Résolution de buzz

```javascript
async function resolveBuzz(winnerUid, winnerName) {
  await update(ref(db, `rooms_mime/${code}/state`), {
    lockUid: winnerUid,
    lockedAt: serverTimestamp(),
    pausedAt: serverTimestamp(),
    buzzBanner: `🔔 ${winnerName} pense savoir !`
  });

  // Nettoyer pendingBuzzes
  await remove(ref(db, `rooms_mime/${code}/state/pendingBuzzes`));
}
```

### 9.4 Validation réponse correcte

```javascript
async function handleCorrect() {
  const guesserUid = state.lockUid;
  const mimeUid = state.currentMimeUid;

  // 1. Attribuer les points
  await runTransaction(ref(db, `rooms_mime/${code}/players/${guesserUid}/score`),
    (cur) => (cur || 0) + 100
  );
  await runTransaction(ref(db, `rooms_mime/${code}/players/${mimeUid}/score`),
    (cur) => (cur || 0) + 50
  );

  // 2. Passer au mot/mimeur suivant
  await advanceToNextWord();
}
```

### 9.5 Validation réponse fausse

```javascript
async function handleWrong() {
  const guesserUid = state.lockUid;
  const serverNow = Date.now() + serverOffset;

  // 1. Déduire points + bloquer
  await update(ref(db, `rooms_mime/${code}/players/${guesserUid}`), {
    score: increment(-25),
    blockedUntil: serverNow + 8000
  });

  // 2. Reprendre le timer
  const alreadyElapsed = state.elapsedAcc + (state.pausedAt - state.revealedAt);

  await update(ref(db, `rooms_mime/${code}/state`), {
    lockUid: null,
    lockedAt: null,
    pausedAt: null,
    buzzBanner: '',
    elapsedAcc: alreadyElapsed,
    revealedAt: serverTimestamp()  // Reset pour calcul
  });
}
```

### 9.6 Passage au mot suivant

```javascript
async function advanceToNextWord() {
  const nextIndex = state.currentIndex + 1;

  // Vérifier si fin de partie
  if (nextIndex >= state.totalWords) {
    await update(ref(db, `rooms_mime/${code}/state`), {
      phase: 'ended'
    });
    return;
  }

  // Rotation simple : le mimeur change à chaque mot
  // mimeIndex = currentIndex % rotation.length
  const newMimeIndex = nextIndex % state.mimeRotation.length;
  const newMimeUid = state.mimeRotation[newMimeIndex];

  await update(ref(db, `rooms_mime/${code}/state`), {
    currentIndex: nextIndex,
    revealed: false,
    revealedAt: null,
    pausedAt: null,
    elapsedAcc: 0,
    lockUid: null,
    lockedAt: null,
    buzzBanner: '',
    currentMimeUid: newMimeUid,
    mimeIndex: newMimeIndex
  });
}
```

---

## 10. CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Configuration
- [ ] Mettre à jour `lib/config/games.js` (local: false, minPlayers: 3)
- [ ] Ajouter entrée dans `lib/config/rooms.js`
- [ ] Ajouter constantes dans `lib/config/constants.js`
- [ ] Ajouter rules dans `firebase.rules.json`
- [ ] Déployer les rules : `firebase deploy --only database`

### Phase 2 : Hooks
- [ ] Créer `lib/hooks/useMimeRotation.js`
- [ ] Créer `lib/hooks/useMimeTimer.js`
- [ ] Tester les hooks isolément

### Phase 3 : Composants
- [ ] Déplacer `MimeCard.tsx` vers `components/game/`
- [ ] Créer `components/game/MimeHostView.jsx`
- [ ] Créer `components/game/MimeGuesserView.jsx`
- [ ] Créer `components/game/MimeTimer.jsx`
- [ ] Créer `components/game/BuzzValidationModal.jsx`

### Phase 4 : Pages
- [ ] Créer `app/mime/room/[code]/page.jsx` (lobby)
- [ ] Créer `app/mime/game/[code]/play/page.jsx`
- [ ] Créer `app/mime/game/[code]/end/page.jsx`
- [ ] Supprimer `app/mime/page.tsx` (ancien jeu local)
- [ ] Supprimer `components/game-mime/MimeGame.tsx`

### Phase 5 : Intégration Home
- [ ] Vérifier que le clic sur Mime crée une room
- [ ] Vérifier la navigation vers `/mime/room/[code]`

### Phase 6 : Tests
- [ ] Test création de room
- [ ] Test rejoindre une room
- [ ] Test sélection de thèmes
- [ ] Test démarrage de partie
- [ ] Test rotation des mimeurs
- [ ] Test reveal de carte
- [ ] Test timer 30s
- [ ] Test buzz + validation
- [ ] Test mauvaise réponse (pénalité)
- [ ] Test timeout
- [ ] Test fin de partie
- [ ] Test déconnexion joueur
- [ ] Test déconnexion mimeur (skip auto)

### Phase 7 : Polish
- [ ] Animations de transition mimeur
- [ ] Sons (buzz, correct, wrong)
- [ ] Confetti sur bonne réponse
- [ ] Écran de fin avec podium

---

## 11. DÉCISIONS PRISES

| Question | Décision |
|----------|----------|
| **Nombre de mots** | 30 mots par partie (ajusté pour équité) |
| **Rotation** | Obligatoire, chaque joueur mime le même nombre de fois |
| **Max joueurs** | 20 joueurs maximum |
| **Déconnexion mimeur** | Grace period de 10s, puis skip au suivant |
| **Mode équipes** | Non, individuel uniquement |
| **Timer** | 30s à partir de la révélation du mot |
| **Scoring** | +100 devineur, +50 mimeur, -25 erreur |

---

## 12. DÉPENDANCES

### NPM (déjà installés)
- `framer-motion` - Animations
- `firebase` - Backend
- `lucide-react` - Icônes

### Composants réutilisés
- `Buzzer` - Bouton de buzz
- `Leaderboard` - Affichage scores
- `LobbyHeader` - Header du lobby
- `GamePlayHeader` - Header en jeu
- `DisconnectAlert` - Reconnexion
- `AskerTransition` - Transition (adapté pour Mime)
- `PodiumPremium` - Podium fin de partie
- `MimeCard` - Carte swipe-to-reveal

---

*Document créé le 2026-02-03*
*Dernière mise à jour : 2026-02-03*
