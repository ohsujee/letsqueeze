# LetsQueeze - Plan de Refactoring Complet

> Document généré le 2026-01-21 après analyse multi-agent exhaustive.
> Couvre 100% des pages, composants, hooks, routes API et styles.

---

## Table des Matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Couleurs & Thèmes](#2-couleurs--thèmes)
3. [Constantes Hardcodées](#3-constantes-hardcodées)
4. [Hooks à Créer](#4-hooks-à-créer)
5. [Composants à Créer/Fusionner](#5-composants-à-créerfusionner)
6. [CSS à Centraliser](#6-css-à-centraliser)
7. [Routes API](#7-routes-api)
8. [Pages par Zone](#8-pages-par-zone)
9. [Plan d'Implémentation](#9-plan-dimplémentation)
10. [Checklist Finale](#10-checklist-finale)

---

## 1. Résumé Exécutif

### Statistiques Globales

| Métrique | Valeur |
|----------|--------|
| Pages analysées | 37 |
| Composants analysés | 45+ |
| Lignes dupliquées identifiées | ~6900 |
| Réduction potentielle | ~35% |
| Hooks à créer | 8 |
| Composants à créer | 15 |
| Fichiers config à créer | 4 |

### Impact par Zone

| Zone | Duplication | Priorité |
|------|-------------|----------|
| Pages Lobby (5) | 550 lignes | Haute |
| Pages Play (5) | 1900 lignes | Haute |
| Pages End/Host (8) | 800 lignes | Moyenne |
| Pages Profil/Auth (8) | 930 lignes | Haute |
| Pages Join (4) | 300 lignes | Moyenne |
| Pages Spéciales (3) | 600 lignes | Moyenne |
| Composants | 1200 lignes | Haute |
| Routes API (4) | 230 lignes | Basse |
| CSS (animations inline) | 400 lignes | Haute |

---

## 2. Couleurs & Thèmes

### 2.1 Couleurs Hardcodées à Centraliser

**Fichier à créer: `lib/config/colors.js`**

```javascript
export const GAME_COLORS = {
  quiz: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    dark: '#6d28d9',
    glow: '#a78bfa',
    rgba: {
      light: 'rgba(139, 92, 246, 0.25)',
      medium: 'rgba(139, 92, 246, 0.4)',
      dark: 'rgba(139, 92, 246, 0.6)',
    }
  },
  alibi: {
    primary: '#f59e0b',
    secondary: '#d97706',
    dark: '#b45309',
    glow: '#fbbf24',
    rgba: {
      light: 'rgba(245, 158, 11, 0.1)',
      medium: 'rgba(245, 158, 11, 0.25)',
      dark: 'rgba(245, 158, 11, 0.5)',
    }
  },
  blindtest: {
    primary: '#10b981',
    secondary: '#059669',
    dark: '#047857',
    glow: '#34d399',
    rgba: {
      light: 'rgba(16, 185, 129, 0.15)',
      medium: 'rgba(16, 185, 129, 0.3)',
      dark: 'rgba(16, 185, 129, 0.5)',
    }
  },
  deeztest: {
    primary: '#A238FF',
    secondary: '#FF0092',
    tertiary: '#C574FF',
    glow: 'rgba(162, 56, 255, 0.5)',
    rgba: {
      light: 'rgba(162, 56, 255, 0.15)',
      medium: 'rgba(162, 56, 255, 0.3)',
      dark: 'rgba(162, 56, 255, 0.5)',
    }
  },
  laloi: {
    primary: '#06b6d4',
    secondary: '#0891b2',
    dark: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.5)',
    rgba: {
      light: 'rgba(6, 182, 212, 0.15)',
      medium: 'rgba(6, 182, 212, 0.3)',
      dark: 'rgba(6, 182, 212, 0.5)',
    }
  },
  mime: {
    primary: '#00ff66',
    secondary: '#00cc52',
    glow: 'rgba(0, 255, 102, 0.6)',
  },
  // Couleurs sémantiques
  semantic: {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#fbbf24',
    info: '#3b82f6',
  },
  // Médailles
  medals: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  },
  // UI généraux
  ui: {
    background: '#0a0a0f',
    card: 'rgba(20, 20, 30, 0.8)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.5)',
    }
  }
};
```

### 2.2 Fichiers Impactés

| Fichier | Couleurs hardcodées | Lignes |
|---------|---------------------|--------|
| `app/deeztest/game/[code]/play/page.jsx` | `#A238FF`, `#FF0092`, `#C574FF` | 19-21 |
| `app/deeztest/game/[code]/host/page.jsx` | Mêmes | 22-24 |
| `app/deeztest/game/[code]/end/page.jsx` | Mêmes | 19-21 |
| `app/deeztest/room/[code]/page.jsx` | Mêmes | Multiples |
| `app/deeztest/join/page.jsx` | `#A238FF` | 11 |
| `components/game/LobbySettings.jsx` | 5 couleurs par jeu | 11-17 |
| `components/ui/JuicyButton.jsx` | `#a78bfa`, `#8b5cf6` | Inline |
| `components/ui/GameLoader.jsx` | Dictionnaire colors | 15-25 |
| `components/ui/PodiumPremium.jsx` | Or/Argent/Bronze | Inline |
| `components/game/Leaderboard.jsx` | `rgba(139, 92, 246, ...)` | 8+ fois |
| `components/ui/PaywallModal.jsx` | 15+ couleurs | Inline |
| `components/ui/DisconnectAlert.jsx` | `#ef4444` | 6+ fois |

### 2.3 Variables CSS à Ajouter

**Ajouter dans `app/theme.css`:**

```css
:root {
  /* DeezTest (manquantes) */
  --deeztest-primary: #A238FF;
  --deeztest-secondary: #FF0092;
  --deeztest-tertiary: #C574FF;
  --deeztest-glow: rgba(162, 56, 255, 0.5);

  /* BlindTest (manquantes) */
  --blindtest-primary: #10b981;
  --blindtest-secondary: #059669;
  --blindtest-glow: rgba(16, 185, 129, 0.5);

  /* LaLoi (harmoniser) */
  --laloi-primary: #06b6d4;
  --laloi-secondary: #0891b2;
  --laloi-glow: rgba(6, 182, 212, 0.5);

  /* Shadows par jeu */
  --shadow-glow-quiz: 0 0 20px var(--quiz-glow), 0 4px 15px rgba(139, 92, 246, 0.4);
  --shadow-glow-alibi: 0 0 20px var(--alibi-glow), 0 4px 15px rgba(245, 158, 11, 0.4);
  --shadow-glow-deeztest: 0 0 20px var(--deeztest-glow), 0 4px 15px rgba(162, 56, 255, 0.4);
  --shadow-glow-blindtest: 0 0 20px var(--blindtest-glow), 0 4px 15px rgba(16, 185, 129, 0.4);
  --shadow-glow-laloi: 0 0 20px var(--laloi-glow), 0 4px 15px rgba(6, 182, 212, 0.4);
}
```

---

## 3. Constantes Hardcodées

### 3.1 Timings

**Fichier à créer: `lib/config/constants.js`**

```javascript
export const TIMINGS = {
  // Inactivité
  inactivityTimeout: 30000,      // 30s - utilisé dans 5+ fichiers
  activityThrottle: 1000,        // 1s

  // Buzzer
  buzzWindow: 150,               // 150ms - fenêtre de buzz
  lockoutMs: 8000,               // 8s après mauvaise réponse

  // Animations
  animationFast: 200,
  animationNormal: 300,
  animationSlow: 500,
  transitionDefault: 300,

  // Jeux spécifiques
  alibiPrepTime: 90,             // 90s
  laloiTimerOptions: [3, 5, 7, 10], // minutes

  // API
  spotifyKeepAlive: 15000,       // 15s
  apiTimeout: 10000,             // 10s
  cacheManifestDuration: 300000, // 5 min
  tokenMaxAge: 86400,            // 24h

  // UI
  toastDuration: 3000,
  debounceDelay: 300,
};

export const LIMITS = {
  // Free tier
  quiz: {
    packsFree: 3,
    maxGamesPerDay: 10,
  },
  alibi: {
    scenariosFree: 3,
    maxGamesPerDay: 5,
  },
  blindtest: {
    maxPlaylistsFree: 3,
  },
  deeztest: {
    maxPlaylistsFree: 3,
  },
  laloi: {
    maxRerolls: 3,
    maxGuessAttempts: 3,
  },
  global: {
    freeGamesBeforeAd: 3,
    guestPromptCooldownHours: 24,
    guestGamesBeforePrompt: 3,
  }
};

export const SCORING = {
  laloi: {
    firstAttempt: 10,
    secondAttempt: 7,
    thirdAttempt: 4,
    investigatorsFailed: 5,
  },
  blindtest: {
    wrongPenalty: 25,
    snippetLevels: [
      { duration: 1500, label: '1.5s', start: 150, floor: 150 },
      { duration: 3000, label: '3s', start: 150, floor: 100 },
      { duration: 10000, label: '10s', start: 100, floor: 75 },
      { duration: null, label: 'Full', start: 50, floor: 25 }
    ]
  }
};

export const Z_INDEX = {
  background: 0,
  content: 1,
  header: 10,
  footer: 10,
  dropdown: 100,
  modal: 9999,
  modalBackdrop: 9998,
  toast: 10000,
};

export const SIZES = {
  maxContentWidth: '500px',
  maxModalWidth: {
    sm: '340px',
    md: '400px',
    lg: '500px',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  avatar: {
    sm: '32px',
    md: '44px',
    lg: '64px',
    xl: '100px',
  }
};
```

### 3.2 Fichiers Impactés par les Timings

| Constante | Valeur | Fichiers utilisant |
|-----------|--------|-------------------|
| `inactivityTimeout` | 30000 | `useInactivityDetection.js`, 5 pages play |
| `buzzWindow` | 150 | Quiz host, BlindTest host, DeezTest host |
| `lockoutMs` | 8000 | `constants/blindtest.js`, 3 pages host |
| `alibiPrepTime` | 90 | `alibi/game/[code]/prep/page.jsx` |
| `maxPlaylistsFree` | 3 | BlindTest room, DeezTest room |
| `maxGuessAttempts` | 3 | LaLoi investigate |

### 3.3 Textes & Messages à Centraliser

**Fichier à créer: `lib/config/messages.js`**

```javascript
export const MESSAGES = {
  auth: {
    loginSuccess: 'Connexion réussie !',
    loginError: 'Erreur de connexion',
    accountCreated: 'Compte créé avec succès !',
    continueWithGoogle: 'Continuer avec Google',
    continueWithApple: 'Continuer avec Apple',
    continueAsGuest: 'Continuer en invité',
    signOut: 'Déconnexion',
  },
  game: {
    waitingPlayers: 'En attente de joueurs...',
    hostLeft: "L'hôte a quitté la partie",
    connectionLost: 'Connexion perdue',
    reconnecting: 'Reconnexion...',
    gameStarting: 'La partie commence !',
    gameEnded: 'Partie terminée',
  },
  room: {
    invalidCode: '❌ Code invalide ! Aucune partie trouvée avec ce code.',
    gameAlreadyStarted: 'La partie a déjà commencé',
    roomClosed: 'La room a été fermée',
  },
  validation: {
    pseudoTooShort: 'Le pseudo doit faire au moins 2 caractères',
    pseudoTooLong: 'Le pseudo ne peut pas dépasser 16 caractères',
    pseudoInvalid: 'Le pseudo contient des caractères invalides',
  },
  exit: {
    confirmLeave: 'Voulez-vous vraiment quitter ?',
    confirmLeaveGame: 'Quitter la partie ?',
  }
};
```

---

## 4. Hooks à Créer

### 4.1 `useAuthProtect` - Protection des pages authentifiées

**Fichier: `lib/hooks/useAuthProtect.js`**

**Problème:** Pattern répété dans 6+ pages pour vérifier l'auth et rediriger.

**Avant (répété 6 fois):**
```javascript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) {
      router.push('/login');
    } else if (currentUser.isAnonymous) {
      router.push('/profile');
    } else {
      setUser(currentUser);
      setLoading(false);
    }
  });
  return () => unsubscribe();
}, [router]);
```

**Après:**
```javascript
// lib/hooks/useAuthProtect.js
export function useAuthProtect({ allowGuests = false, redirectTo = '/login' } = {}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push(redirectTo);
      } else if (currentUser.isAnonymous && !allowGuests) {
        router.push('/profile');
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, allowGuests, redirectTo]);

  return { user, loading };
}

// Usage:
const { user, loading } = useAuthProtect({ allowGuests: false });
```

**Fichiers impactés:**
- `app/profile/page.jsx` (lignes 55-78)
- `app/profile/hue/page.jsx` (lignes 69-83)
- `app/profile/spotify/page.jsx` (lignes 31-44)
- `app/profile/stats/page.jsx` (lignes 18-33)
- `app/subscribe/page.jsx` (lignes 45-60)
- `app/login/page.jsx` (lignes 20-38)

---

### 4.2 `useGameAuth` - Auth pour pages de jeu

**Fichier: `lib/hooks/useGameAuth.js`**

**Problème:** Pattern identique dans 15+ pages de jeu.

**Avant (répété 15 fois):**
```javascript
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) {
      setMyUid(user.uid);
      storage.set('last_game', {
        roomCode: code,
        roomPrefix: 'rooms_X',
        joinedAt: Date.now()
      });
    } else {
      signInAnonymously(auth).catch(() => {});
    }
  });
  return () => unsub();
}, [code]);
```

**Après:**
```javascript
// lib/hooks/useGameAuth.js
export function useGameAuth(roomCode, roomPrefix) {
  const [myUid, setMyUid] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        storage.set('last_game', { roomCode, roomPrefix, joinedAt: Date.now() });
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [roomCode, roomPrefix]);

  return myUid;
}

// Usage:
const myUid = useGameAuth(code, 'rooms_blindtest');
```

**Fichiers impactés:** Toutes les pages play, host, end, room (15+ fichiers)

---

### 4.3 `useGameListeners` - Firebase listeners

**Fichier: `lib/hooks/useGameListeners.js`**

**Problème:** Pattern de listeners Firebase répété dans toutes les pages de jeu.

**Après:**
```javascript
// lib/hooks/useGameListeners.js
export function useGameListeners({
  roomCode,
  roomPrefix,
  onMeta,
  onState,
  onPlayers,
  onPhaseChange,
}) {
  useEffect(() => {
    if (!roomCode) return;

    const unsubscribers = [];

    // Meta listener
    if (onMeta) {
      const metaUnsub = onValue(ref(db, `${roomPrefix}/${roomCode}/meta`), (snap) => {
        onMeta(snap.val());
      });
      unsubscribers.push(metaUnsub);
    }

    // State listener
    if (onState || onPhaseChange) {
      const stateUnsub = onValue(ref(db, `${roomPrefix}/${roomCode}/state`), (snap) => {
        const state = snap.val();
        onState?.(state);
        if (state?.phase) {
          onPhaseChange?.(state.phase);
        }
      });
      unsubscribers.push(stateUnsub);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [roomCode, roomPrefix]);
}

// Usage:
useGameListeners({
  roomCode: code,
  roomPrefix: 'rooms_blindtest',
  onMeta: setMeta,
  onState: setState,
  onPhaseChange: (phase) => {
    if (phase === 'ended') router.replace('/blindtest/game/' + code + '/end');
  }
});
```

---

### 4.4 `useGameTimer` - Timer avec pause

**Fichier: `lib/hooks/useGameTimer.js`**

**Problème:** Logique de timer dupliquée entre Alibi prep et LaLoi.

**Après:**
```javascript
// lib/hooks/useGameTimer.js
export function useGameTimer({
  initialTime,
  isPaused = false,
  enabled = true,
  onTick,
  onComplete,
}) {
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (!enabled || isPaused || timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeLeft <= 0 && enabled) onComplete?.();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        onTick?.(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, isPaused, enabled]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const reset = useCallback((newTime) => {
    setTimeLeft(newTime ?? initialTime);
  }, [initialTime]);

  return { timeLeft, formatTime, reset, isUrgent: timeLeft <= 15 };
}
```

**Fichiers impactés:**
- `app/alibi/game/[code]/prep/page.jsx` (lignes 180-216)
- `app/laloi/game/[code]/investigate/page.jsx` (lignes 223-254)

---

### 4.5 `usePseudoEdit` - Edition de pseudo

**Fichier: `lib/hooks/usePseudoEdit.js`**

**Problème:** Logique de validation/sauvegarde pseudo dupliquée.

**Fichiers impactés:**
- `app/onboarding/page.jsx` (lignes 129-154)
- `app/profile/page.jsx` (lignes 174-193)

---

### 4.6 `useServiceConnection` - Connexion services externes

**Fichier: `lib/hooks/useServiceConnection.js`**

**Problème:** Pattern de vérification connexion (Spotify, Hue) dupliqué.

**Fichiers impactés:**
- `app/profile/spotify/page.jsx`
- `app/profile/hue/page.jsx`

---

### 4.7 `useRevealSequence` - Animations de révélation

**Fichier: `lib/hooks/useRevealSequence.js`**

**Problème:** Séquence d'animations complexe dans LaLoi.

**Fichier impacté:**
- `app/laloi/game/[code]/investigate/page.jsx` (lignes 177-220)

---

### 4.8 `useAutoTransition` - Transitions automatiques

**Fichier: `lib/hooks/useAutoTransition.js`**

**Problème:** Auto-confirm quand conditions remplies (votes, etc.)

---

## 5. Composants à Créer/Fusionner

### 5.1 `LoadingScreen` - Écran de chargement

**Problème:** Même spinner dupliqué dans 5+ pages.

**Fichier: `components/ui/LoadingScreen.jsx`**

```jsx
export function LoadingScreen({ color = '#8b5cf6' }) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" style={{ '--spinner-color': color }} />
    </div>
  );
}
```

**Fichiers impactés:**
- `app/profile/page.jsx` (lignes 195-221)
- `app/profile/hue/page.jsx` (lignes 332-358)
- `app/profile/spotify/page.jsx` (lignes 88-94)
- `app/profile/stats/page.jsx` (lignes 70-97)
- `app/subscribe/page.jsx` (lignes 128-155)

---

### 5.2 `AuthButtons` - Boutons d'authentification

**Problème:** Boutons Google/Apple/Guest répétés dans 4 pages.

**Fichiers à créer:**
- `components/auth/GoogleButton.jsx`
- `components/auth/AppleButton.jsx`
- `components/auth/GuestButton.jsx`
- `components/auth/AuthButtons.jsx` (groupe)

**Fichiers impactés:**
- `app/login/page.jsx` (lignes 157-209)
- `app/onboarding/page.jsx` (lignes 324-415)
- `app/profile/page.jsx` (lignes 394-417)

---

### 5.3 `HeroSection` - Section hero avec icône

**Problème:** Pattern Hero (icône + titre + description) répété.

```jsx
export function HeroSection({ icon: Icon, title, subtitle, size = 40, color }) {
  return (
    <section className="hero-section">
      <div className="hero-icon" style={{ '--hero-color': color }}>
        <Icon size={size} />
      </div>
      <div className="hero-content">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  );
}
```

**Fichiers impactés:**
- `app/profile/hue/page.jsx` (lignes 389-397)
- `app/profile/spotify/page.jsx` (lignes 121-129)
- `app/subscribe/page.jsx` (lignes 231-242)

---

### 5.4 `ConnectedServiceCard` - Carte service connecté

**Problème:** Pattern de card "connecté" avec déconnexion répété.

**Fichiers impactés:**
- `app/profile/hue/page.jsx` (lignes 438-451)
- `app/profile/spotify/page.jsx` (lignes 142-190)

---

### 5.5 `GamePlayHeader` - Header unifié pour pages de jeu

**Problème:** Header quasi-identique dans toutes les pages play/host.

```jsx
export function GamePlayHeader({
  progress,
  title,
  score,
  onExit,
  variant = 'quiz', // quiz | blindtest | deeztest | alibi | laloi
}) {
  return (
    <header className={`game-header ${variant}`}>
      <div className="game-header-content">
        <div className="game-header-left">
          <div className="game-header-progress">{progress}</div>
          <div className="game-header-title">{title}</div>
        </div>
        <div className="game-header-right">
          {score !== undefined && (
            <div className="my-score-badge">
              <span className="my-score-value">{score}</span>
              <span className="my-score-label">pts</span>
            </div>
          )}
          <ExitButton variant="header" onExit={onExit} />
        </div>
      </div>
    </header>
  );
}
```

**Fichiers impactés:** Toutes les pages play et host (10+ fichiers)

---

### 5.6 `BaseButton` - Fusion des systèmes de boutons

**Problème:** 3 systèmes de boutons différents (JuicyButton, InteractiveButton, boutons inline).

**Action:** Fusionner en un seul composant avec variantes.

**Fichiers à fusionner:**
- `components/ui/JuicyButton.jsx` (45 lignes)
- `components/ui/InteractiveButton.jsx` (264 lignes)

---

### 5.7 `Leaderboard` - Fusion des 3 versions

**Problème:** 3 composants Leaderboard similaires.

**Fichiers à fusionner:**
- `components/game/Leaderboard.jsx` (262 lignes)
- `components/game/PremiumLeaderboard.jsx` (108 lignes)
- `components/game/AnimatedLeaderboard.jsx` (180 lignes)

**Total:** 550 lignes → ~200 lignes après fusion

---

### 5.8 `BaseModal` - Template de modal

**Problème:** Structure de modal répétée avec variations mineures.

**Fichiers impactés:**
- `components/ui/PaywallModal.jsx`
- `components/ui/GameLimitModal.jsx`
- `components/ui/HowToPlayModal.jsx`
- `components/ui/GuestWarningModal.jsx`

---

### 5.9 `JoinPage` - Page de join générique

**Problème:** 4 pages de join quasi-identiques.

**Fichiers impactés:**
- `app/join/page.client.jsx` (155 lignes)
- `app/blindtest/join/page.client.jsx` (107 lignes)
- `app/alibi/join/page.client.jsx` (105 lignes)
- `app/deeztest/join/page.jsx` (292 lignes)

**Total:** 659 lignes → ~150 lignes avec composant générique

---

### 5.10 `TimerDisplay` - Affichage timer

**Fichier: `components/game/TimerDisplay.jsx`**

---

### 5.11 `PauseOverlay` - Overlay de pause

**Fichier: `components/game/PauseOverlay.jsx`**

---

### 5.12 `ProgressBar` - Barre de progression animée

**Fichier: `components/game/ProgressBar.jsx`**

---

### 5.13 `BuzzNotification` - Notification de buzz

**Problème:** Composant identique dans Quiz, BlindTest, DeezTest play.

---

### 5.14 `PlayerChip` - Chip de joueur

**Problème:** Pattern répété dans lobbies et pages de jeu.

---

### 5.15 `InstructionsCard` - Carte d'instructions

**Problème:** Pattern "Comment jouer" répété.

---

## 6. CSS à Centraliser

### 6.1 Animations @keyframes à Déplacer

**Fichier à créer/enrichir: `app/styles/animations-games.css`**

| Animation | Définie dans | À déplacer |
|-----------|--------------|------------|
| `dot-bounce` | 4 fichiers JSX | ✅ |
| `equalizer` | 2 fichiers JSX | ✅ |
| `buzz-ring` | 2 fichiers JSX | ✅ |
| `latency-pulse` | 2 fichiers JSX | ✅ |
| `buzz-icon-pulse` | 2 fichiers JSX | ✅ |
| `next-pulse` | 2 fichiers JSX | ✅ |
| `fill-line` | BlindTest host | ✅ |
| `snippet-progress` | BlindTest host | ✅ |
| `interro-shimmer` | Alibi play | ✅ |
| `interro-pulse-text` | Alibi play | ✅ |
| `blink` | Alibi prep | ✅ |
| `urgency-pulse` | Alibi prep | ✅ |
| `bell-ring` | Quiz host | ✅ |

**Animations en doublon à supprimer des JSX:**
- `spin` (définie ligne 897 globals.css)
- `shimmer` (définie ligne 92 animations.css)
- `glow-pulse` (définie ligne 39 animations.css)
- `bounce` (définie ligne 138 animations.css)

```css
/* app/styles/animations-games.css */

/* Dots de chargement */
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1.2); opacity: 1; }
}

/* Equalizer audio */
@keyframes equalizer {
  0%, 100% { height: 8px; }
  50% { height: 24px; }
}

/* Ring de buzz */
@keyframes buzz-ring {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2); opacity: 0; }
}

/* Pulse de latence */
@keyframes latency-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Pulse d'icône buzz */
@keyframes buzz-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Pulse suivant */
@keyframes next-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
}

/* Fill line */
@keyframes fill-line {
  from { width: 0; }
  to { width: 100%; }
}

/* Progress snippet */
@keyframes snippet-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Shimmer interrogation */
@keyframes interro-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Pulse texte */
@keyframes interro-pulse-text {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* Blink */
@keyframes blink {
  0%, 50%, 100% { opacity: 1; }
  25%, 75% { opacity: 0.3; }
}

/* Urgency */
@keyframes urgency-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* Bell ring */
@keyframes bell-ring {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(15deg); }
  75% { transform: rotate(-15deg); }
}
```

### 6.2 Gradients à Centraliser

**Fichier à créer: `app/styles/gradients.css`**

```css
/* Gradients par jeu */
.gradient-quiz { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.gradient-alibi { background: linear-gradient(135deg, #f59e0b, #d97706); }
.gradient-blindtest { background: linear-gradient(135deg, #10b981, #059669); }
.gradient-deeztest { background: linear-gradient(135deg, #A238FF, #FF0092); }
.gradient-laloi { background: linear-gradient(135deg, #06b6d4, #0891b2); }
.gradient-mime { background: linear-gradient(135deg, #00ff66, #00cc52); }

/* Gradients sémantiques */
.gradient-success { background: linear-gradient(135deg, #22c55e, #16a34a); }
.gradient-danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
.gradient-warning { background: linear-gradient(135deg, #fbbf24, #f59e0b); }

/* Radial backgrounds */
.bg-radial-quiz { background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%); }
.bg-radial-alibi { background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%); }
.bg-radial-success { background: radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%); }
.bg-radial-danger { background: radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%); }
```

### 6.3 Effects & Transforms

**Fichier à créer: `app/styles/effects.css`**

```css
/* Hover transforms */
.hover-lift { transition: transform 0.2s ease; }
.hover-lift:hover { transform: translateY(-2px); }

.hover-scale { transition: transform 0.2s ease; }
.hover-scale:hover { transform: scale(1.02); }

.hover-lift-scale { transition: transform 0.2s ease; }
.hover-lift-scale:hover { transform: translateY(-2px) scale(1.02); }

/* Active states */
.active-shrink:active { transform: scale(0.98); }
.active-push:active { transform: translateY(2px); }

/* Glassmorphism */
.glass {
  background: rgba(20, 20, 30, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-light {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* Text glow */
.text-glow-quiz { text-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
.text-glow-alibi { text-shadow: 0 0 20px rgba(245, 158, 11, 0.6); }
.text-glow-success { text-shadow: 0 0 20px rgba(34, 197, 94, 0.6); }

/* Box shadows */
.shadow-glow-quiz {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), 0 4px 15px rgba(139, 92, 246, 0.3);
}
.shadow-glow-alibi {
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4), 0 4px 15px rgba(245, 158, 11, 0.3);
}

/* 3D button shadows */
.shadow-3d-quiz {
  box-shadow:
    0 4px 0 #6d28d9,
    0 8px 15px rgba(139, 92, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```

### 6.4 CSS Join Pages à Fusionner

**800+ lignes dupliquées dans globals.css:**
- `.join-container` (lignes 3769-3980)
- `.alibi-join-container` (lignes 3986-4176)
- `.blindtest-join-container` (lignes 4938-5093)
- `.deeztest-join-container` (lignes 5819-5968)

**Action:** Créer une classe `.join-page` générique avec variantes par couleur.

---

## 7. Routes API

### 7.1 Problèmes Identifiés

| Problème | Routes impactées | Solution |
|----------|-----------------|----------|
| Error handling non standardisé | 4/4 | Créer `lib/api/responseHandler.js` |
| Rate limiting non utilisé | 4/4 | Appliquer `lib/rate-limit.js` existant |
| Validation manquante | 3/4 | Créer `lib/api/validation.js` |
| Logging inconsistant | 4/4 | Standardiser préfixes |

### 7.2 Fichiers à Créer

**`lib/api/responseHandler.js`**

```javascript
import { NextResponse } from 'next/server';

export function apiSuccess(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message, status = 500, details = null) {
  return NextResponse.json({
    success: false,
    error: message,
    ...(details && { details })
  }, { status });
}

export async function apiTry(fn, context = 'API') {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return apiError('Internal server error', 500);
  }
}
```

**`lib/api/validation.js`**

```javascript
export function requireEnv(...keys) {
  const missing = keys.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export function validateParams(searchParams, required) {
  const missing = required.filter(key => !searchParams.get(key));
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  return { valid: true };
}
```

### 7.3 Fichiers Impactés

- `app/api/deezer/route.js` (55 lignes)
- `app/api/spotify/token/route.js` (232 lignes)
- `app/api/spotify/callback/route.js` (42 lignes)
- `app/api/webhooks/revenuecat/route.js` (248 lignes)

---

## 8. Pages par Zone

### 8.1 Pages Lobby (5)

| Page | Fichier | Lignes | Actions |
|------|---------|--------|---------|
| Quiz | `app/room/[code]/page.jsx` | ~700 | Utiliser config colors, useGameAuth |
| BlindTest | `app/blindtest/room/[code]/page.jsx` | ~800 | Idem + Spotify spécifique |
| DeezTest | `app/deeztest/room/[code]/page.jsx` | ~750 | Idem + Deezer spécifique |
| Alibi | `app/alibi/room/[code]/page.jsx` | ~600 | Idem |
| LaLoi | `app/laloi/room/[code]/page.jsx` | ~1000 | Idem |

**Patterns communs à extraire:**
- Auth init (useGameAuth)
- Firebase listeners (useGameListeners)
- Mode toggle (équipes/individuel)
- Exit handlers
- CSS layout

### 8.2 Pages Play (5)

| Page | Fichier | Lignes | Actions |
|------|---------|--------|---------|
| Quiz | `app/game/[code]/play/page.jsx` | ~650 | GamePlayHeader, useGameAuth |
| BlindTest | `app/blindtest/game/[code]/play/page.jsx` | ~550 | Idem |
| DeezTest | `app/deeztest/game/[code]/play/page.jsx` | ~550 | Idem |
| Alibi | `app/alibi/game/[code]/play/page.jsx` | ~1400 | Idem + Role views |
| LaLoi | `app/laloi/game/[code]/play/page.jsx` | ~2000 | Idem + Timer |

### 8.3 Pages Host (3)

| Page | Fichier | Lignes | Actions |
|------|---------|--------|---------|
| Quiz | `app/game/[code]/host/page.jsx` | ~1250 | Centraliser buzz logic |
| BlindTest | `app/blindtest/game/[code]/host/page.jsx` | ~1870 | Idem |
| DeezTest | `app/deeztest/game/[code]/host/page.jsx` | ~1860 | Idem |

**Pattern commun:** Buzz resolution (150ms window) identique dans les 3.

### 8.4 Pages End (5)

| Page | Fichier | Lignes | Actions |
|------|---------|--------|---------|
| Quiz | `app/end/[code]/page.jsx` | ~420 | useEndPageAd ✅ (déjà fait) |
| BlindTest | `app/blindtest/game/[code]/end/page.jsx` | ~350 | Idem ✅ |
| DeezTest | `app/deeztest/game/[code]/end/page.jsx` | ~350 | Idem ✅ |
| Alibi | `app/alibi/game/[code]/end/page.jsx` | ~500 | À faire |
| LaLoi | `app/laloi/game/[code]/end/page.jsx` | ~400 | À faire |

### 8.5 Pages Join (4)

| Page | Fichier | Lignes | Actions |
|------|---------|--------|---------|
| Quiz | `app/join/page.client.jsx` | 155 | Créer JoinPage générique |
| BlindTest | `app/blindtest/join/page.client.jsx` | 107 | Utiliser JoinPage |
| Alibi | `app/alibi/join/page.client.jsx` | 105 | Utiliser JoinPage |
| DeezTest | `app/deeztest/join/page.jsx` | 292 | Utiliser JoinPage |

### 8.6 Pages Profil/Auth (8)

| Page | Fichier | Lignes | Actions |
|------|---------|--------|---------|
| Home | `app/home/page.jsx` | ~500 | Extraire auth logic |
| Login | `app/login/page.jsx` | ~300 | AuthButtons component |
| Onboarding | `app/onboarding/page.jsx` | ~600 | AuthButtons, usePseudoEdit |
| Profile | `app/profile/page.jsx` | ~1730 | LoadingScreen, AuthButtons |
| Hue | `app/profile/hue/page.jsx` | ~1830 | useAuthProtect, HeroSection |
| Spotify | `app/profile/spotify/page.jsx` | ~400 | useAuthProtect, HeroSection |
| Stats | `app/profile/stats/page.jsx` | ~350 | useAuthProtect, LoadingScreen |
| Subscribe | `app/subscribe/page.jsx` | ~1090 | useAuthProtect, LoadingScreen |

### 8.7 Pages Spéciales (3)

| Page | Fichier | Lignes | Actions |
|------|---------|--------|---------|
| Mime | `app/mime/page.tsx` | ~200 | Extraire theme selection |
| Investigate | `app/laloi/game/[code]/investigate/page.jsx` | ~1220 | useGameTimer, useRevealSequence |
| Alibi Prep | `app/alibi/game/[code]/prep/page.jsx` | ~1150 | useGameTimer, externaliser CSS |

---

## 9. Plan d'Implémentation

### Phase 1: Fondations (3-4 jours)

**Jour 1-2: Configuration**
- [ ] Créer `lib/config/colors.js`
- [ ] Créer `lib/config/constants.js`
- [ ] Créer `lib/config/messages.js`
- [ ] Ajouter variables CSS manquantes dans `theme.css`

**Jour 3-4: CSS Animations**
- [ ] Créer `app/styles/animations-games.css`
- [ ] Créer `app/styles/gradients.css`
- [ ] Créer `app/styles/effects.css`
- [ ] Supprimer @keyframes des JSX (8 fichiers)

### Phase 2: Hooks Core (3-4 jours)

**Jour 5-6:**
- [ ] Créer `useAuthProtect`
- [ ] Créer `useGameAuth`
- [ ] Appliquer aux pages profil (6 pages)

**Jour 7-8:**
- [ ] Créer `useGameListeners`
- [ ] Créer `useGameTimer`
- [ ] Appliquer aux pages de jeu

### Phase 3: Composants UI (4-5 jours)

**Jour 9-10:**
- [ ] Créer `LoadingScreen`
- [ ] Créer `AuthButtons` (Google, Apple, Guest)
- [ ] Créer `HeroSection`
- [ ] Appliquer aux pages auth/profil

**Jour 11-12:**
- [ ] Créer `GamePlayHeader`
- [ ] Créer `BaseButton` (fusion)
- [ ] Appliquer aux pages de jeu

**Jour 13:**
- [ ] Fusionner les 3 `Leaderboard`
- [ ] Créer `JoinPage` générique

### Phase 4: Nettoyage (2-3 jours)

**Jour 14-15:**
- [ ] Refactorer les pages join (4 fichiers)
- [ ] Nettoyer CSS dupliqué dans globals.css
- [ ] Appliquer useEndPageAd aux pages end restantes

**Jour 16:**
- [ ] Améliorer routes API
- [ ] Tests de non-régression
- [ ] Documentation

### Estimation Totale: 16 jours ouvrés

---

## 10. Checklist Finale

### Configuration
- [ ] `lib/config/colors.js` créé
- [ ] `lib/config/constants.js` créé
- [ ] `lib/config/messages.js` créé
- [ ] Variables CSS ajoutées dans `theme.css`

### Hooks
- [ ] `useAuthProtect` créé et appliqué (6 pages)
- [ ] `useGameAuth` créé et appliqué (15+ pages)
- [ ] `useGameListeners` créé et appliqué
- [ ] `useGameTimer` créé et appliqué (2 pages)
- [ ] `usePseudoEdit` créé et appliqué (2 pages)
- [ ] `useServiceConnection` créé et appliqué (2 pages)
- [ ] `useRevealSequence` créé et appliqué (1 page)

### Composants
- [ ] `LoadingScreen` créé et appliqué (5 pages)
- [ ] `AuthButtons` créé et appliqué (4 pages)
- [ ] `HeroSection` créé et appliqué (3 pages)
- [ ] `ConnectedServiceCard` créé et appliqué (2 pages)
- [ ] `GamePlayHeader` créé et appliqué (10+ pages)
- [ ] `BaseButton` créé (fusion de 2 composants)
- [ ] `Leaderboard` unifié (fusion de 3 composants)
- [ ] `BaseModal` créé
- [ ] `JoinPage` créé et appliqué (4 pages)
- [ ] `TimerDisplay` créé
- [ ] `PauseOverlay` créé
- [ ] `BuzzNotification` créé

### CSS
- [ ] `animations-games.css` créé (13 animations)
- [ ] `gradients.css` créé
- [ ] `effects.css` créé
- [ ] @keyframes supprimées des JSX (8 fichiers)
- [ ] CSS join pages fusionné
- [ ] Couleurs hardcodées remplacées par variables

### API
- [ ] `lib/api/responseHandler.js` créé
- [ ] `lib/api/validation.js` créé
- [ ] Rate limiting appliqué aux 4 routes
- [ ] Error handling standardisé

### Tests
- [ ] Build passe sans erreur
- [ ] Toutes les pages fonctionnent
- [ ] Pas de régression visuelle

---

## 11. Travail Effectué

### Session 2026-01-21

#### ✅ Phase 4: Pages Join Unifiées

**Problème initial:** 4 pages join séparées avec code dupliqué.

**Solution implémentée:**
- Unifié en une seule page `/join` universelle qui détecte le type de jeu automatiquement
- Ajouté vérification que le lobby est en phase "lobby" avant de rejoindre
- Ajouté édition inline du pseudo avec validation
- Supprimé les pages spécifiques: `app/blindtest/join/`, `app/alibi/join/`, `app/deeztest/join/`
- Mis à jour les liens de partage dans tous les lobbies pour utiliser `/join?code=XXX`

**Fichiers modifiés:**
- `app/join/page.client.jsx` - Page universelle avec détection multi-jeux
- `app/blindtest/room/[code]/page.jsx` - Lien de partage mis à jour
- `app/deeztest/room/[code]/page.jsx` - Lien de partage mis à jour
- `app/alibi/room/[code]/page.jsx` - Lien de partage mis à jour

**Fichiers supprimés:**
- `app/blindtest/join/` (dossier entier)
- `app/alibi/join/` (dossier entier)
- `app/deeztest/join/` (dossier entier)

---

#### ✅ UI/UX: Page Join Améliorée

**Améliorations visuelles:**
- Input code style "PIN" avec 6 cases individuelles
- Effet de remplacement progressif des points par les lettres
- Animation pulse sur la case active
- Section pseudo restructurée en 2 lignes (label + pseudo/bouton)

---

#### ✅ Layout Partagé avec BottomNav

**Problème initial:** Navigation entre home/join/profile causait un "saut" car la navbar se remontait à chaque changement de page.

**Solution implémentée:**
- Créé un route group `app/(main)/` avec layout partagé
- Le `<BottomNav />` est maintenant dans le layout, pas dans chaque page
- Les pages home, join, profile sont dans ce groupe
- L'animation de la pill fonctionne maintenant de façon fluide

**Structure créée:**
```
app/(main)/
├── layout.jsx      ← Contient BottomNav (constant)
├── home/page.jsx
├── join/page.jsx + page.client.jsx
└── profile/
    ├── page.jsx
    ├── hue/page.jsx
    ├── spotify/page.jsx
    └── stats/page.jsx
```

**Fichiers créés:**
- `app/(main)/layout.jsx`

**Fichiers modifiés:**
- `app/(main)/home/page.jsx` - Retiré BottomNav
- `app/(main)/join/page.client.jsx` - Retiré BottomNav
- `app/(main)/profile/page.jsx` - Retiré BottomNav + ProfileSkeleton

---

#### ✅ Skeleton Loading pour Profile

**Problème initial:** Page vide pendant le chargement de l'auth sur Profile.

**Solution implémentée:**
- Créé `ProfileSkeleton` avec structure de la page en placeholders animés
- Shimmer animation sur les éléments
- Remplace le `<LoadingScreen />` générique

**Fichier créé:**
- `components/ui/ProfileSkeleton.jsx`

---

#### ✅ GamePlayHeader Appliqué

**Composant unifié pour les headers de pages play/host:**
- Appliqué à Quiz play (`app/game/[code]/play/page.jsx`)
- Appliqué à BlindTest play (`app/blindtest/game/[code]/play/page.jsx`)
- Appliqué à DeezTest play (`app/deeztest/game/[code]/play/page.jsx`)
- Fix import ExitButton (`@/lib/components/ExitButton`)

---

### Checklist Mise à Jour

#### Configuration
- [x] `lib/config/colors.js` créé *(session précédente)*
- [x] `lib/config/constants.js` créé *(session précédente)*
- [ ] `lib/config/messages.js` créé
- [x] Variables CSS ajoutées dans `theme.css` *(partiel)*

#### Hooks
- [x] `usePlayers` créé *(session précédente)*
- [x] `usePlayerCleanup` créé *(session précédente)*
- [x] `useInactivityDetection` créé *(session précédente)*
- [x] `useRoomGuard` créé *(session précédente)*
- [x] `useServerTime` créé *(session précédente)*
- [x] `useEndPageAd` créé *(session précédente)*
- [ ] `useAuthProtect` créé
- [ ] `useGameAuth` créé
- [ ] `useGameListeners` créé
- [ ] `useGameTimer` créé

#### Composants
- [x] `GamePlayHeader` créé et appliqué (3 pages play)
- [x] `ProfileSkeleton` créé
- [x] `DisconnectAlert` créé *(session précédente)*
- [ ] `AuthButtons` créé
- [ ] `HeroSection` créé
- [ ] `BaseButton` créé (fusion)
- [ ] `Leaderboard` unifié

#### Pages
- [x] Pages Join unifiées (4 → 1)
- [x] Layout partagé pour navbar (home/join/profile)
- [x] Skeleton loading pour Profile
- [ ] Appliquer GamePlayHeader aux pages host

---

## Annexes

### A. Commandes Utiles

```bash
# Chercher les couleurs hardcodées
grep -r "#8b5cf6\|#A238FF\|#f59e0b" --include="*.jsx" --include="*.tsx"

# Chercher les @keyframes dans JSX
grep -r "@keyframes" --include="*.jsx" --include="*.tsx" app/

# Compter les lignes par fichier
find app/ -name "*.jsx" -exec wc -l {} \; | sort -n

# Vérifier le build
npm run build
```

### B. Fichiers les Plus Volumineux

| Fichier | Lignes | Priorité refacto |
|---------|--------|------------------|
| `app/laloi/game/[code]/play/page.jsx` | 2005 | Haute |
| `app/blindtest/game/[code]/host/page.jsx` | 1868 | Haute |
| `app/deeztest/game/[code]/host/page.jsx` | 1860 | Haute |
| `app/profile/hue/page.jsx` | 1832 | Moyenne |
| `app/profile/page.jsx` | 1728 | Moyenne |
| `app/alibi/game/[code]/play/page.jsx` | 1397 | Haute |
| `app/game/[code]/host/page.jsx` | 1246 | Haute |

### C. Dépendances Entre Tâches

```
Phase 1 (Config) ──┬──> Phase 2 (Hooks)
                   │
                   └──> Phase 3 (Components) ──> Phase 4 (Cleanup)
```

---

*Document généré le 2026-01-21*
*Prochaine révision recommandée: après Phase 2*
