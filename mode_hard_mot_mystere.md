# Mode Hard — Mot Mystère (6 lettres)

> Plan d'implémentation complet pour ajouter un mode difficile au jeu quotidien Mot Mystère.
> Statut : en discussion, pas encore implémenté.

## Concept

- **Normal** : 5 lettres, 6 tentatives (existant)
- **Hard** : 6 lettres, 6 tentatives (nouveau)
- Le mode Hard se **déverrouille uniquement si le joueur a résolu le mot du jour en mode normal** (`solved: true`)

---

## Architecture actuelle (rappel complet)

### Fichiers principaux

| Fichier | Rôle | Lignes |
|---------|------|--------|
| `app/daily/motmystere/page.jsx` | Page complète (grid, clavier, result, stats, leaderboard) | ~1384 |
| `lib/hooks/useDailyGame.js` | Hook partagé (state, streak, stats, Firebase sync) | ~359 |
| `lib/config/dailyGames.js` | Config des jeux daily (id, route, firebaseNode) | ~30 |
| `app/api/daily/wordle/check/route.js` | API validation guess (feedback + isWin) | ~93 |
| `app/api/daily/wordle/alternative/route.js` | API anti-cheat mot alternatif | ~169 |
| `lib/components/DailyCard.jsx` | Carte sur la page d'accueil | ~73 |
| `components/home/DailyGamesSection.jsx` | Section "Défis Quotidiens" sur home | ~47 |

### Constantes actuelles (page.jsx)

```javascript
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const AZERTY_ROWS = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  ['W', 'X', 'C', 'V', 'B', 'N', '⌫'],
];
```

### Word lists

| Fichier | Contenu | Usage |
|---------|---------|-------|
| `public/data/wordle_targets.txt` | 589 mots, 5 lettres | Pool de mots cibles quotidiens |
| `public/data/wordle_words.txt` | 5037 mots, 5 lettres | Validation des guesses (Set lookup) |

### Persistance

| Donnée | localStorage | Firebase |
|--------|-------------|---------|
| Partie du jour | `daily_motmystere_{date}_{uid}` | `users/{uid}/daily/motmystere/{date}` |
| Streak | `daily_streak_motmystere_{uid}` | `users/{uid}/game_data/motmystere/streak` |
| Stats | `daily_stats_motmystere_{uid}` | `users/{uid}/game_data/motmystere/stats` |
| Leaderboard | — | `daily/wordle/{date}/leaderboard/{uid}` |
| Anti-cheat alt | `mot_alt_{date}_{uid}` | — |
| Unranked flag | `mot_unranked_{date}_{uid}` | — |

### Hook `useDailyGame(gameId)`

Le hook prend un `gameId` string et construit toutes les clés automatiquement :
```javascript
const storageKey = `daily_${gameId}_${todayDate}_${uid}`;
const streakKey  = `daily_streak_${gameId}_${uid}`;
const statsKey   = `daily_stats_${gameId}_${uid}`;
// Firebase: users/{uid}/daily/{gameId}/{date}
// Firebase: users/{uid}/game_data/{gameId}/streak
// Firebase: users/{uid}/game_data/{gameId}/stats
```

Le hook est **déjà prêt** pour supporter un nouveau gameId — il suffit de l'appeler avec `'motmystere_hard'`.

### Score

```javascript
function computeScore(attempts, timeMs) {
  const attemptBase = (7 - attempts) * 1000;    // 6000 à 1000 selon tentatives
  const timeBonus = Math.round(999 * Math.exp(-timeMs / 173287));  // décroissance exponentielle
  return attemptBase + timeBonus;
}
// Score max théorique : 6000 + 999 = 6999 (1er essai, instantané)
// Score min (win) : 1000 + ~0 = ~1000 (6ème essai, lent)
```

### Sélection du mot quotidien

```
1. L'admin écrit le mot dans Firebase : daily/wordle/{date}/word
2. L'API /check le lit à chaque guess
3. Fallback si absent : sélection déterministe par dayIndex % 10
```

### Flow complet d'une partie

```
Page load
  → useEffect: fetch serverTimeOffset → serverDate
  → useDailyGame('motmystere', { forceDate: serverDate })
    → Load Firebase + localStorage → merge (Firebase wins if more advanced)
    → todayState: 'loading' | 'unplayed' | 'inprogress' | 'completed'
  → useEffect: load validWords from /data/wordle_words.txt → Set<string>
  → useEffect: restore state if inprogress/completed, startGame() if unplayed

Guess flow
  → handleKey(letter) → build currentGuess (max WORD_LENGTH chars)
  → handleKey('ENTER')
    → Validate length (< WORD_LENGTH → shake + "Mot trop court")
    → Validate word (not in Set → shake + "Mot non reconnu")
    → POST /api/daily/wordle/check { guess, date, attemptNumber }
    → Response: { feedback[], isWin, revealedWord? }
    → Update guesses[], feedbacks[], letterStates
    → saveProgress() → localStorage + Firebase
    → If win/loss:
      → computeScore()
      → If suspicious (win attempt 1) → SuspiciousResultModal → rewarded ad → alt word
      → Else → completeGame() → streak + stats + leaderboard
      → freshCompletionRef → trigger GameEndTransition → switch to leaderboard tab

Grid rendering
  → WordleGrid: 6 rows × WORD_LENGTH columns
  → Each cell: letter + state (correct/present/absent/filled/empty)
  → Completed rows: 3D flip animation (rotateX, delay per column)
  → Current row: shake animation on invalid guess

Keyboard rendering
  → WordleKeyboard: 3 AZERTY rows + "Valider" button
  → Each key colored by letterStates (correct=green, present=yellow, absent=gray)
  → ⌫ = Backspace icon

Result rendering (after game over)
  → WordleResultBanner: score, attempts, time, stats summary, CTA buttons
  → WordleStatsModal: played, won%, streak, distribution histogram
  → WordleLeaderboard: today tab (realtime), week tab (aggregated), day navigation (7 days back)
```

---

## Plan d'implémentation détaillé

### 1. Nouvelles word lists (6 lettres)

Créer deux fichiers :
- `public/data/wordle_targets_hard.txt` — mots cibles 6 lettres
- `public/data/wordle_words_hard.txt` — mots valides 6 lettres (set plus large pour validation)

**Format :** un mot par ligne, minuscules, sans accents (ex: `maison`, `jardin`, `cheval`).

**Constitution possible :**
- Source : dictionnaire français filtré (Lexique.org, GLAWI, ou liste libre)
- Critères de filtrage :
  - Exactement 6 lettres
  - Noms communs uniquement (pas de noms propres)
  - Pas de mots obscurs / archaïques
  - Pas d'accents dans le fichier (normalisé NFD → stripped)
- Taille cible : ~500-800 mots cibles, ~5000-8000 mots valides
- Vérifier qu'aucun mot n'est offensant

**Mot quotidien Hard :** stocké dans Firebase à `daily/wordle_hard/{date}/word`, même système que le normal. L'admin écrit le mot, l'API le lit.

### 2. Même page, mode conditionnel

Approche : la page `app/daily/motmystere/page.jsx` gère les deux modes dans le même composant.

#### Nouveau state

```javascript
const [mode, setMode] = useState('normal');  // 'normal' | 'hard'
const WORD_LENGTH_FOR_MODE = mode === 'hard' ? 6 : 5;
```

#### Deux instances du hook `useDailyGame`

```javascript
// State normal (toujours chargé — nécessaire pour le gate)
const normalGame = useDailyGame('motmystere', { forceDate: serverDate });

// State hard (chargé en parallèle)
const hardGame = useDailyGame('motmystere_hard', { forceDate: serverDate });

// Active game selon le mode
const activeGame = mode === 'hard' ? hardGame : normalGame;
```

#### Gate de déverrouillage

```javascript
const normalSolved = normalGame.todayState === 'completed' && normalGame.progress?.solved === true;
const hardUnlocked = normalSolved;

// Si on essaie de passer en hard sans avoir résolu le normal
const switchToHard = () => {
  if (!hardUnlocked) return;  // bouton grisé
  setMode('hard');
  // Reset les states locaux du jeu (guesses, feedbacks, etc.)
  // Charger les word lists 6 lettres si pas encore fait
};
```

#### Chargement des word lists conditionnel

```javascript
// Normal : chargé au mount (existant)
useEffect(() => {
  fetch('/data/wordle_words.txt').then(...)
}, []);

// Hard : chargé quand on passe en mode hard (lazy)
const [validWordsHard, setValidWordsHard] = useState(null);
useEffect(() => {
  if (mode !== 'hard' || validWordsHard) return;
  fetch('/data/wordle_words_hard.txt').then(res => res.text()).then(text => {
    const set = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length === 6));
    setValidWordsHard(set);
  });
}, [mode]);

// Active word list
const activeValidWords = mode === 'hard' ? validWordsHard : validWords;
```

#### WordleGrid adapté

```javascript
// Le composant accepte wordLength en prop
function WordleGrid({ guesses, feedbacks, currentGuess, attempts, shake, wordLength = 5 }) {
  return (
    <div className="wordle-grid" data-word-length={wordLength}>
      {rows.map((_, rowIdx) => (
        <div className="wordle-row">
          {Array(wordLength).fill(null).map((_, colIdx) => (
            // ... cells
          ))}
        </div>
      ))}
    </div>
  );
}

// Utilisation
<WordleGrid wordLength={WORD_LENGTH_FOR_MODE} ... />
```

#### CSS pour 6 colonnes

```css
/* Existant : 5 colonnes */
.wordle-grid {
  display: grid;
  gap: 6px;
}

.wordle-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

/* Hard mode : 6 colonnes */
.wordle-grid[data-word-length="6"] .wordle-row {
  grid-template-columns: repeat(6, 1fr);
}

/* Cellules légèrement plus petites pour 6 lettres */
.wordle-grid[data-word-length="6"] .wordle-cell {
  font-size: clamp(1.2rem, 5vw, 1.6rem);
}
```

#### computeFeedback adapté

```javascript
// Le WORD_LENGTH est actuellement hardcodé dans computeFeedback
// Modifier pour accepter la longueur en paramètre
function computeFeedback(guess, target, wordLength = 5) {
  const g = normalize(guess).split('');
  const t = normalize(target).split('');
  const result = Array(wordLength).fill('absent');
  const targetUsed = Array(wordLength).fill(false);
  // ... même logique
}
```

#### handleKey adapté

```javascript
// Remplacer WORD_LENGTH par WORD_LENGTH_FOR_MODE
if (currentGuess.length < WORD_LENGTH_FOR_MODE) { ... }
if (/^[A-Za-zÀ-ÿ]$/.test(key) && currentGuess.length < WORD_LENGTH_FOR_MODE) { ... }

// API call avec mode
const res = await fetch('/api/daily/wordle/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guess: currentGuess,
    date: todayDate,
    attemptNumber: newAttempts,
    mode: mode  // 'normal' | 'hard'
  }),
});
```

### 3. UI — Toggle Normal/Hard

#### Option A : bouton dans le result banner (après victoire normal)

Quand le joueur gagne le mode normal, le `WordleResultBanner` affiche un bouton supplémentaire :

```jsx
{solved && !hardCompleted && (
  <motion.button
    className="wres-btn hard-mode"
    onClick={switchToHard}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.5 }}
  >
    <span className="hard-badge">HARD</span>
    <span>Tenter le 6 lettres</span>
  </motion.button>
)}
```

#### Option B : onglets en haut de page (si hard débloqué)

```jsx
{hardUnlocked && (
  <div className="mode-tabs">
    <button
      className={`mode-tab ${mode === 'normal' ? 'active' : ''}`}
      onClick={() => setMode('normal')}
    >
      Normal
      {normalGame.todayState === 'completed' && <CheckCircle size={14} />}
    </button>
    <button
      className={`mode-tab ${mode === 'hard' ? 'active' : ''}`}
      onClick={() => setMode('hard')}
    >
      Hard
      {hardGame.todayState === 'completed' && <CheckCircle size={14} />}
    </button>
  </div>
)}
```

#### Option C : les deux

- Result banner affiche "Tenter le Hard" après victoire
- Une fois le hard débloqué, des onglets apparaissent pour naviguer entre les deux
- Permet de revoir ses résultats normal même après être passé en hard

**Recommandation : Option C** — le bouton dans le result banner est le CTA principal (découverte), et les onglets permettent la navigation libre après.

### 4. API — `POST /api/daily/wordle/check`

#### Modifications

```javascript
// route.js
const MODES = {
  normal: { wordLength: 5, targetsFile: null, wordsFile: null, firebaseNode: 'daily/wordle' },
  hard:   { wordLength: 6, targetsFile: null, wordsFile: null, firebaseNode: 'daily/wordle_hard' },
};

export async function POST(request) {
  const { guess, date, attemptNumber, mode = 'normal' } = await request.json();

  const config = MODES[mode] || MODES.normal;
  const WORD_LENGTH = config.wordLength;

  // Validation longueur
  if (typeof guess !== 'string' || guess.length !== WORD_LENGTH) {
    return Response.json({ error: 'Mot invalide' }, { status: 400 });
  }

  // Récupérer le mot du jour depuis Firebase
  const snap = await db.ref(`${config.firebaseNode}/${date}/word`).get();
  let word;
  if (snap.exists()) {
    word = snap.val().toLowerCase();
  } else {
    // Fallback pour le mode hard (à définir)
    const hardFallback = ['maison', 'jardin', 'cheval', 'mouton', 'fleurs', 'soleil', 'nuages', 'rivage', 'voyage', 'temple'];
    const dayIndex = Math.floor(new Date(date).getTime() / 86400000);
    word = mode === 'hard'
      ? hardFallback[dayIndex % hardFallback.length]
      : normalFallback[dayIndex % normalFallback.length];
  }

  // computeFeedback avec la bonne longueur
  const feedback = computeFeedback(guess, word);  // fonctionne déjà car basé sur .split('')
  const isWin = normalize(guess) === normalize(word);
  const isLoss = !isWin && attemptNumber >= MAX_ATTEMPTS;

  return Response.json({ feedback, isWin, revealedWord: isLoss ? word : null });
}
```

**Note :** `computeFeedback` côté serveur utilise déjà `WORD_LENGTH` pour créer les arrays, il faudra aussi le rendre dynamique.

### 5. API — Alternative (anti-cheat)

#### Fichier : `app/api/daily/wordle/alternative/route.js`

Mêmes modifications :
- Accepter `mode` dans le GET (query param) et POST (body)
- Utiliser le bon firebaseNode et la bonne word list
- localStorage key : `mot_alt_hard_{date}_{uid}` pour le mode hard

### 6. Persistance complète

#### Firebase structure

```
daily/
  wordle/                          # Normal
    {date}/
      word: "magie"
      leaderboard/
        {uid}: { name, score, attempts, solved, timeMs, completedAt }
  wordle_hard/                     # Hard (nouveau)
    {date}/
      word: "jardin"
      leaderboard/
        {uid}: { name, score, attempts, solved, timeMs, completedAt }

users/{uid}/
  daily/
    motmystere/{date}: { guesses, feedbacks, attempts, score, solved, ... }
    motmystere_hard/{date}: { guesses, feedbacks, attempts, score, solved, ... }
  game_data/
    motmystere/
      streak: { count, lastPlayedDate }
      stats: { played, won, distribution }
    motmystere_hard/
      streak: { count, lastPlayedDate }
      stats: { played, won, distribution }
```

#### localStorage keys

| Clé | Mode |
|-----|------|
| `daily_motmystere_{date}_{uid}` | Normal |
| `daily_motmystere_hard_{date}_{uid}` | Hard |
| `daily_streak_motmystere_{uid}` | Normal |
| `daily_streak_motmystere_hard_{uid}` | Hard |
| `daily_stats_motmystere_{uid}` | Normal |
| `daily_stats_motmystere_hard_{uid}` | Hard |
| `mot_alt_{date}_{uid}` | Normal anti-cheat |
| `mot_alt_hard_{date}_{uid}` | Hard anti-cheat |
| `mot_unranked_{date}_{uid}` | Normal |
| `mot_unranked_hard_{date}_{uid}` | Hard |

### 7. Config — `dailyGames.js`

```javascript
export const DAILY_GAMES = [
  {
    id: 'motmystere',
    name: 'Mot Mystère',
    description: 'Trouve le mot en 6 essais',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    glowColor: '#10b981',
    icon: '🟩',
    image: '/images/daily/motmystere.webp',
    route: '/daily/motmystere',
    firebaseNode: 'daily/wordle',
  },
  // Le mode hard n'apparaît PAS comme un jeu séparé sur la home
  // Il est intégré dans la page motmystere
  // Mais on a besoin de sa config pour le leaderboard
  {
    id: 'motmystere_hard',
    name: 'Mot Mystère Hard',
    description: 'Trouve le mot de 6 lettres',
    gradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
    glowColor: '#ef4444',
    icon: '🟥',
    image: null,
    route: '/daily/motmystere',  // même route
    firebaseNode: 'daily/wordle_hard',
    hidden: true,  // ne pas afficher comme carte séparée sur home
  },
  {
    id: 'semantique',
    // ... inchangé
  },
];
```

**Note :** `DailyGamesSection` devra filtrer les jeux `hidden` pour ne pas afficher le hard comme carte séparée.

### 8. Home — DailyCard mise à jour

La carte Mot Mystère sur la page d'accueil peut afficher un indicateur de progression hard :

```jsx
// DailyCard.jsx — après le badge "Fait !"
{loaded && todayState === 'completed' && hardState === 'completed' && (
  <div className="daily-hard-done-pill">
    <Star weight="fill" size={12} />
    Hard
  </div>
)}
{loaded && todayState === 'completed' && hardState !== 'completed' && (
  <div className="daily-hard-available-pill">
    HARD dispo
  </div>
)}
```

Le `DailyCard` doit donc aussi appeler `useDailyGame('motmystere_hard')` pour connaître l'état du hard.

### 9. Leaderboard — onglets Normal/Hard

Le `WordleLeaderboard` existant lit `daily/wordle/{date}/leaderboard`. Pour le hard :

```jsx
function WordleLeaderboard({ todayDate, mode = 'normal' }) {
  const firebaseNode = mode === 'hard' ? 'daily/wordle_hard' : 'daily/wordle';

  // Tous les refs Firebase utilisent firebaseNode au lieu de 'daily/wordle' hardcodé
  const unsub = onValue(ref(db, `${firebaseNode}/${todayDate}/leaderboard`), ...);
  // ...
}
```

Dans la page, des onglets au-dessus du leaderboard :

```jsx
{activeTab === 'leaderboard' && (
  <>
    {hardUnlocked && (
      <div className="lb-mode-tabs">
        <button onClick={() => setLbMode('normal')} className={lbMode === 'normal' ? 'active' : ''}>
          Normal
        </button>
        <button onClick={() => setLbMode('hard')} className={lbMode === 'hard' ? 'active' : ''}>
          Hard
        </button>
      </div>
    )}
    <WordleLeaderboard todayDate={todayDate} mode={lbMode} />
  </>
)}
```

### 10. Stats — distribution à 6 buckets

La distribution des stats est un array de 6 éléments (tentatives 1-6). Comme le mode hard a aussi 6 tentatives max, **le format est identique**. Le hook `useDailyGame` gère ça automatiquement via le `gameId` séparé.

Le `WordleStatsModal` peut avoir un toggle Normal/Hard si le hard est débloqué :

```jsx
<WordleStatsModal
  stats={mode === 'hard' ? hardGame.stats : normalGame.stats}
  streak={mode === 'hard' ? hardGame.streak : normalGame.streak}
  // ...
/>
```

### 11. Anti-cheat

Le système anti-cheat existant (win en 1 tentative → SuspiciousResultModal → rewarded ad → mot alternatif) s'applique **identiquement** au mode hard :

- Détection : `isWin && newAttempts === 1` (inchangé)
- API alternative : `GET /api/daily/wordle/alternative?date=...&uid=...&mode=hard`
- Token et session alt stockés sous `mot_alt_hard_{date}_{uid}`
- Le flag unranked : `mot_unranked_hard_{date}_{uid}`

### 12. Streaks

Chaque mode a son propre streak (via le `gameId` séparé dans `useDailyGame`). Comportement :

- Streak normal : jouer et gagner chaque jour en mode normal
- Streak hard : jouer et gagner chaque jour en mode hard
- Les deux sont indépendants
- Le streak hard nécessite implicitement de gagner le normal d'abord (gate), donc le streak hard implique aussi un streak normal

### 13. Pubs

Le système de pubs existant :
- `usePostGameAd` : pub interstitielle après completion → switch vers leaderboard
- Se déclenche via `triggerPostGameAd(callback, { delay })` au premier clic sur "Classement"

Pour le hard :
- La pub se déclenche une seule fois par session (normal OU hard, pas les deux)
- `adTriggered.current` (ref) empêche les doublons
- Pas de changement nécessaire

### 14. Transition animée Normal → Hard

Quand le joueur clique "Tenter le Hard" :

```jsx
const switchToHard = () => {
  if (!hardUnlocked) return;

  // Animation de transition
  setShowModeTransition(true);

  setTimeout(() => {
    setMode('hard');
    // Reset states locaux
    setCurrentGuess('');
    setShake(false);
    setWordError('');
    setShowResult(false);
    setGameOver(false);
    setSolved(false);
    setShowModeTransition(false);

    // Restaurer l'état hard si déjà en cours/complété
    // (géré par le useEffect existant qui écoute todayState)
  }, 500);
};
```

Animation possible : flash de couleur rouge (hard color), grid qui se transforme de 5 à 6 colonnes.

---

## Résumé des modifications par fichier

| Fichier | Modifications | Complexité |
|---------|--------------|:----------:|
| `app/daily/motmystere/page.jsx` | State `mode`, deux instances `useDailyGame`, `WORD_LENGTH_FOR_MODE`, toggle UI, gate, grid 6 colonnes, leaderboard onglets, stats par mode | Haute |
| `app/api/daily/wordle/check/route.js` | Param `mode`, `WORD_LENGTH` dynamique, `firebaseNode` conditionnel | Basse |
| `app/api/daily/wordle/alternative/route.js` | Param `mode`, word lists conditionnelles | Basse |
| `lib/hooks/useDailyGame.js` | **Aucune modification** — déjà paramétré par `gameId` | Aucune |
| `lib/config/dailyGames.js` | Ajouter config `motmystere_hard` avec `hidden: true` | Basse |
| `lib/components/DailyCard.jsx` | Badge hard progression (optionnel) | Basse |
| `components/home/DailyGamesSection.jsx` | Filtrer `hidden` games (si ajouté dans config) | Basse |
| `public/data/wordle_targets_hard.txt` | **Nouveau fichier** — mots cibles 6 lettres | Curation |
| `public/data/wordle_words_hard.txt` | **Nouveau fichier** — mots valides 6 lettres | Curation |
| `app/globals.css` | Styles grid 6 colonnes, mode tabs, hard badge | Basse |

---

## Edge cases à gérer

| Scénario | Comportement attendu |
|----------|---------------------|
| Joueur ouvre la page sans avoir joué le normal | Mode normal affiché, pas de toggle hard visible |
| Joueur a perdu le normal (pas solved) | Hard verrouillé, message "Résous le mot d'abord" |
| Joueur a gagné le normal, pas encore joué le hard | Bouton "Tenter le Hard" dans le result + onglets visibles |
| Joueur switch d'appareil mid-game hard | Firebase sync via `useDailyGame` — restauration automatique |
| Joueur revient le lendemain | Tout reset (date change), normal non joué → hard verrouillé |
| Hard en cours, joueur refresh la page | Restauration depuis localStorage/Firebase, mode hard ré-activé |
| Hard en cours, joueur navigue vers home puis revient | Idem, state restauré |
| Admin oublie de mettre le mot hard dans Firebase | Fallback déterministe (comme le normal) |
| Joueur gagne le normal via mode alternatif (anti-cheat) | `solved: true` dans la game data → hard débloqué |
| Joueur décline l'anti-cheat (unranked) | `solved: true` quand même (il a trouvé) → hard débloqué |

---

## Questions ouvertes

1. **Constitution des word lists 6 lettres** : quelle source ? filtrage automatisé ou curation manuelle ?
2. **Qui place le mot hard quotidien ?** : même admin que le normal ? script automatique ?
3. **Score hard vs normal** : même formule ou bonus pour le hard ? (ex: multiplicateur ×1.5)
4. **Leaderboard combiné** : faut-il un leaderboard qui cumule normal+hard pour la semaine ?
5. **DailyGamesSection** : le compteur "2/2" sur home doit-il compter le hard ? (passerait à "3/3" ou rester "2/2" avec un indicateur séparé)
6. **Partage** : bouton de partage avec grid emoji (comme Wordle) — faut-il un format séparé pour le hard ?

---

*Créé le 2026-03-19 — en attente de validation avant implémentation.*
