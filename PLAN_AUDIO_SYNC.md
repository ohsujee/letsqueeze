# Plan d'Implémentation - Mode Audio Synchronisé (DeezTest)

> **Objectif:** Ajouter un choix de sortie audio : "Téléphone de l'asker" (actuel) vs "Tous les téléphones" (synchronisé)

---

## 📋 Vue d'ensemble

### Parcours utilisateur
1. Créer une partie DeezTest
2. **Modale 1:** Choisir Game Master / Party Mode
3. **Modale 2 (NOUVELLE):** Choisir mode audio
   - "Téléphone de l'asker" → comportement actuel
   - "Tous les téléphones" → lecture synchronisée
4. Lancer la partie

### Comportement par configuration

| Game Master Mode | Audio Mode | Qui joue l'audio ? |
|------------------|------------|-------------------|
| gamemaster | single | Host uniquement |
| gamemaster | all | Tous les joueurs |
| party | single | Asker actuel uniquement |
| party | all | Tous les joueurs |

---

## 🎯 Changements par fichier

### **1. Nouveau composant: `AudioModeSelector.jsx`**

**Fichier:** `components/ui/AudioModeSelector.jsx`

**Description:** Modale de sélection du mode audio (copie stricte de GameModeSelector avec icônes/textes différents)

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onSelectMode: (mode: 'single' | 'all') => void,
  game: { themeColor: string }
}
```

**Structure:**
```jsx
// Options:
1. Mode "Single" (Téléphone de l'asker)
   - Icône: Speaker (lucide-react)
   - Description: "Le son vient uniquement du téléphone qui pose la question"

2. Mode "All" (Tous les téléphones)
   - Icône: Speakers (lucide-react)
   - Description: "Le son est joué sur tous les téléphones en même temps"
```

**CSS:** Utiliser EXACTEMENT les mêmes classes que GameModeSelector
- `.gms-backdrop`
- `.gms-container`
- `.gms-modal`
- `.gms-option`
- etc.

**Couleurs:**
- Option 1 (Single): `--option-color: #8b5cf6` (violet)
- Option 2 (All): `--option-color: #06b6d4` (cyan - couleur synchronisation)

---

### **2. Modification: `app/(main)/home/page.jsx`**

**Ligne ~470-520** - Fonction `handleGameCardClick`

**Changements:**
```javascript
// AVANT
const [showGameModeSelector, setShowGameModeSelector] = useState(false);
const [selectedGameForMode, setSelectedGameForMode] = useState(null);

// APRÈS
const [showGameModeSelector, setShowGameModeSelector] = useState(false);
const [showAudioModeSelector, setShowAudioModeSelector] = useState(false); // ← NOUVEAU
const [selectedGameForMode, setSelectedGameForMode] = useState(null);
const [selectedGameMasterMode, setSelectedGameMasterMode] = useState(null); // ← NOUVEAU
```

**Nouveau flux:**
```javascript
// 1. Clic sur carte DeezTest → ouvrir GameModeSelector
handleGameCardClick(game) {
  if (game.id === 'blindtest' && game.supportsPartyMode) {
    setSelectedGameForMode(game);
    setShowGameModeSelector(true);
    return;
  }
  // ... reste du code existant
}

// 2. Sélection du Game Master Mode → ouvrir AudioModeSelector
const handleGameModeSelect = (mode) => {
  setSelectedGameMasterMode(mode);
  setShowGameModeSelector(false);
  setShowAudioModeSelector(true); // ← Ouvrir la 2ème modale
};

// 3. Sélection du Audio Mode → créer la room
const handleAudioModeSelect = async (audioMode) => {
  setShowAudioModeSelector(false);

  // Créer la room avec gameMasterMode + audioMode
  const roomConfig = {
    gameId: 'blindtest',
    gameMasterMode: selectedGameMasterMode,
    audioMode: audioMode
  };

  await createRoomAndNavigate(roomConfig);

  // Reset
  setSelectedGameForMode(null);
  setSelectedGameMasterMode(null);
};
```

**Ajout des modales dans le JSX:**
```jsx
{/* Game Mode Selector (existant) */}
<GameModeSelector
  isOpen={showGameModeSelector}
  onClose={() => setShowGameModeSelector(false)}
  onSelectMode={handleGameModeSelect}
  game={selectedGameForMode}
/>

{/* Audio Mode Selector (NOUVEAU) */}
<AudioModeSelector
  isOpen={showAudioModeSelector}
  onClose={() => {
    setShowAudioModeSelector(false);
    setSelectedGameForMode(null);
    setSelectedGameMasterMode(null);
  }}
  onSelectMode={handleAudioModeSelect}
  game={selectedGameForMode}
/>
```

---

### **3. Modification: `lib/config/rooms.js`**

**Ligne ~210-236** - Config `blindtest`

**Changement:**
```javascript
createMeta: ({ code, now, hostUid, hostName, gameMasterMode, audioMode }) => ({
  code,
  createdAt: now,
  hostUid,
  hostName,
  expiresAt: now + 12 * 60 * 60 * 1000,
  mode: "individuel",
  teamCount: 0,
  teams: {},
  playlist: null,
  playlistsUsed: 0,
  gameType: "deeztest",
  gameMasterMode,
  audioMode: audioMode || 'single' // ← NOUVEAU (défaut: 'single')
}),
```

**Signature `createRoom` (ligne ~389):**
```javascript
export async function createRoom({
  gameId,
  code,
  hostUid,
  hostName,
  gameMasterMode = 'gamemaster',
  audioMode = 'single' // ← NOUVEAU
  db,
  ref,
  set
})
```

**Ligne ~397** - Passer audioMode:
```javascript
const params = { code, now, hostUid, hostName, gameMasterMode, audioMode };
```

---

### **4. Modification: `components/game/BlindTestHostView.jsx`**

**Ligne ~350-431** - Fonction `playLevel`

**Changement:** Écrire les infos de synchronisation dans Firebase quand `audioMode === 'all'`

```javascript
const playLevel = async (level) => {
  if (!canControl || !currentTrack || !playerReady) return;

  setIsAudioLoading(true);

  if (snippetStopRef.current) {
    await snippetStopRef.current.stop();
  }

  const config = SNIPPET_LEVELS[level];
  const previewUrl = currentTrack.previewUrl;

  if (!previewUrl) {
    setPlayerError("Cette piste n'a pas d'extrait disponible");
    setIsAudioLoading(false);
    return;
  }

  // ========== NOUVEAU: Synchronisation audio ==========
  const audioMode = meta?.audioMode || 'single';

  if (audioMode === 'all') {
    // Mode synchronisé: écrire dans Firebase AVANT de jouer
    const { serverTimestamp: fbServerTimestamp } = await import('firebase/database');

    await update(ref(db, `rooms_blindtest/${code}/state`), {
      snippetLevel: level,
      highestSnippetLevel: Math.max(state?.highestSnippetLevel ?? -1, level),
      audioSync: {
        startAt: Date.now() + 1000, // Démarrer dans 1 seconde
        previewUrl: previewUrl,
        duration: config.duration || 25000,
        level: level
      },
      lastRevealAt: fbServerTimestamp()
    });

    // L'host joue aussi (pas besoin d'attendre, il déclenche juste le timer)
  }
  // ========== FIN NOUVEAU ==========

  try {
    const snippet = await playSnippet(previewUrl, config.duration);
    snippetStopRef.current = snippet;
    setIsPlaying(true);
    setCurrentSnippet(level);
    setPlayerError(null);
    setIsAudioLoading(false);
    hasTriedRefresh.current = false;

    // Start progress animation
    setPlayProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const duration = config.duration || 25000;
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setPlayProgress(progress);
      if (progress >= 100) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 50);

    setHighestLevelPlayed(prev => Math.max(prev ?? -1, level));

    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }

    const isLastLevel = level === SNIPPET_LEVELS.length - 1;
    if (!isLastLevel && config.duration && level >= unlockedLevel) {
      const unlockDelay = Math.floor(config.duration * 0.9);
      unlockTimeoutRef.current = setTimeout(() => {
        setUnlockedLevel(prev => Math.max(prev, level + 1));
      }, unlockDelay);
    }

    // Mode 'single' uniquement: update Firebase state
    if (audioMode === 'single') {
      const currentHighest = state?.highestSnippetLevel ?? -1;
      const newHighest = Math.max(currentHighest, level);

      await update(ref(db, `rooms_blindtest/${code}/state`), {
        snippetLevel: level,
        highestSnippetLevel: newHighest,
        lastRevealAt: fbServerTimestamp()
      });
    }
  } catch (error) {
    console.error("[DeezTest Host] Error playing snippet:", error);
    setIsAudioLoading(false);

    if (!hasTriedRefresh.current) {
      hasTriedRefresh.current = true;
      const refreshed = await refreshTrackUrls();
      if (refreshed) {
        setPlayerError("URLs expirées - Rafraîchies! Réessayez.");
      }
    } else {
      setPlayerError(error.message || "Erreur de lecture");
    }
  }
};
```

---

### **5. Modification: `app/blindtest/game/[code]/play/page.jsx`**

**Après la ligne ~28** - Ajouter le hook de synchronisation audio

**NOUVEAU CODE:**
```javascript
// ========== AUDIO SYNC PLAYER (mode 'all') ==========
const audioMode = meta?.audioMode || 'single';
const shouldPlayAudio = audioMode === 'all' && !amIAsker; // Joueurs jouent l'audio (pas l'asker)

const audioPlayerRef = useRef(null);
const audioSyncTimeoutRef = useRef(null);

// Listener pour audioSync dans Firebase
useEffect(() => {
  if (!shouldPlayAudio || !code) return;

  const audioSyncRef = ref(db, `rooms_blindtest/${code}/state/audioSync`);

  const unsubscribe = onValue(audioSyncRef, async (snapshot) => {
    const syncData = snapshot.val();

    if (!syncData || !syncData.startAt || !syncData.previewUrl) return;

    const { startAt, previewUrl, duration } = syncData;
    const now = Date.now();
    const delay = startAt - now;

    // Si le timestamp est dans le passé (>500ms), ignorer (trop tard)
    if (delay < -500) return;

    // Clear ancien timeout
    if (audioSyncTimeoutRef.current) {
      clearTimeout(audioSyncTimeoutRef.current);
      audioSyncTimeoutRef.current = null;
    }

    // Preload l'audio
    try {
      const audio = new Audio(previewUrl);
      audio.preload = 'auto';
      audioPlayerRef.current = audio;

      // Attendre que l'audio soit prêt
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });

        // Timeout de 2 secondes
        setTimeout(() => reject(new Error('Audio load timeout')), 2000);
      });

      // Programmer le démarrage
      const finalDelay = Math.max(0, startAt - Date.now());

      audioSyncTimeoutRef.current = setTimeout(() => {
        audio.play().catch(err => {
          console.error('[Audio Sync] Play error:', err);
        });

        // Arrêter après la durée du snippet (si défini)
        if (duration) {
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
          }, duration);
        }
      }, finalDelay);

    } catch (error) {
      console.error('[Audio Sync] Preload error:', error);
    }
  });

  return () => {
    unsubscribe();
    if (audioSyncTimeoutRef.current) {
      clearTimeout(audioSyncTimeoutRef.current);
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  };
}, [shouldPlayAudio, code]);

// Cleanup audio quand on buzz ou quand la musique s'arrête
useEffect(() => {
  if (state?.lockUid && audioPlayerRef.current) {
    audioPlayerRef.current.pause();
    audioPlayerRef.current.currentTime = 0;
  }
}, [state?.lockUid]);
// ========== FIN AUDIO SYNC ==========
```

**Modification de la vue (ligne ~410-423):**
```jsx
{/* Buzzer - Hidden when revealed */}
{!revealed && (
  <footer className="buzzer-footer deeztest">
    <Buzzer
      roomCode={code}
      roomPrefix="rooms_blindtest"
      playerUid={auth.currentUser?.uid}
      playerName={me?.name}
      blockedUntil={me?.blockedUntil || 0}
      serverNow={serverNow}
      serverOffset={offset}
      disabled={!canIBuzz}
    />

    {/* Indicateur mode audio (optionnel) */}
    {audioMode === 'all' && (
      <div className="audio-mode-indicator">
        <Speakers size={14} />
        <span>Audio synchronisé</span>
      </div>
    )}
  </footer>
)}
```

**Styles pour l'indicateur (optionnel):**
```jsx
<style jsx>{`
  /* ... styles existants ... */

  .audio-mode-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    padding: 6px 12px;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 12px;
    font-size: 0.7rem;
    color: #06b6d4;
    font-weight: 600;
  }
`}</style>
```

---

### **6. Modification: `app/blindtest/room/[code]/page.jsx` (Lobby)**

**Ligne ~XXX** - Afficher le mode audio dans le lobby

**NOUVEAU badge (après le badge Party Mode):**
```jsx
{/* Audio Mode Badge */}
{meta?.audioMode === 'all' && (
  <div className="game-mode-badge audio-sync">
    <Speakers size={16} />
    <span>Audio Synchronisé</span>
  </div>
)}
```

**Styles (ajouter au style jsx existant):**
```jsx
.game-mode-badge.audio-sync {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05));
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #06b6d4;
}
```

---

## 🎨 CSS - Checklist de cohérence

### ✅ Classes à réutiliser EXACTEMENT
- `.gms-backdrop`
- `.gms-container`
- `.gms-modal`
- `.gms-close`
- `.gms-header`
- `.gms-title`
- `.gms-subtitle`
- `.gms-options`
- `.gms-option`
- `.gms-option-icon`
- `.gms-option-content`
- `.gms-option-title`
- `.gms-option-desc`

### ⚠️ NE PAS créer de nouvelles classes
- Utiliser les classes globales existantes
- Styles inline uniquement pour les couleurs spécifiques (`--option-color`)

### 🎨 Couleurs du thème
```javascript
const DEEZER_PURPLE = '#A238FF';  // Option Single
const SYNC_CYAN = '#06b6d4';      // Option All (synchronisation)
```

---

## 🧪 Plan de test

### Test 1: Modale Audio Mode
- [ ] Créer partie DeezTest
- [ ] Modale Game Mode s'affiche
- [ ] Sélectionner un mode → Modale Audio s'affiche
- [ ] Sélectionner "Téléphone de l'asker" → Room créée
- [ ] Vérifier Firebase: `meta.audioMode === 'single'`

### Test 2: Mode Single (comportement actuel)
- [ ] Créer partie avec audioMode = 'single'
- [ ] Host lance un snippet
- [ ] Vérifier: audio joue UNIQUEMENT sur le host
- [ ] Player ne doit PAS entendre l'audio

### Test 3: Mode All (nouveau comportement)
- [ ] Créer partie avec audioMode = 'all'
- [ ] Host lance un snippet
- [ ] Vérifier: audio joue sur TOUS les appareils
- [ ] Vérifier: synchronisation < 200ms de décalage
- [ ] Player buzz → audio s'arrête sur tous les appareils

### Test 4: Party Mode + Audio All
- [ ] Créer partie Party Mode + Audio All
- [ ] Asker lance snippet
- [ ] Vérifier: audio sur TOUS les appareils (y compris l'asker)
- [ ] Changer d'asker → nouvel asker peut lancer des snippets

### Test 5: Edge cases
- [ ] Connexion lente (4G) → audio preload fonctionne
- [ ] Player rejoint après début snippet → pas de crash
- [ ] Host quitte → audio s'arrête sur tous les appareils

---

## 📝 Checklist d'implémentation

### Phase 1: Modale & Configuration
- [ ] Créer `components/ui/AudioModeSelector.jsx`
- [ ] Modifier `app/(main)/home/page.jsx` (flux double modale)
- [ ] Modifier `lib/config/rooms.js` (ajouter audioMode)
- [ ] Test: Modale s'affiche et crée room avec bon audioMode

### Phase 2: Logique de synchronisation (Host)
- [ ] Modifier `BlindTestHostView.jsx` → fonction `playLevel`
- [ ] Écrire `audioSync` dans Firebase quand audioMode = 'all'
- [ ] Test: Firebase reçoit bien les données de sync

### Phase 3: Player audio synchronisé
- [ ] Modifier `play/page.jsx` → ajouter listener audioSync
- [ ] Implémenter preload + scheduled playback
- [ ] Test: Audio joue sur les players en mode 'all'

### Phase 4: UI & Polish
- [ ] Ajouter badge "Audio Synchronisé" dans lobby
- [ ] Ajouter indicateur dans page play (optionnel)
- [ ] Test visuel: badges s'affichent correctement

### Phase 5: Tests finaux
- [ ] Tests des 5 scénarios ci-dessus
- [ ] Vérifier compatibilité iOS/Android
- [ ] Vérifier pas de régression sur mode 'single'

---

## ⏱️ Estimation temporelle

| Phase | Temps estimé |
|-------|--------------|
| Phase 1: Modale | 30 min |
| Phase 2: Sync Host | 45 min |
| Phase 3: Player Sync | 1h |
| Phase 4: UI Polish | 15 min |
| Phase 5: Tests | 30 min |
| **TOTAL** | **~3h** |

---

## 🚨 Points d'attention

### Sécurité Firebase
- ✅ Pas besoin de nouvelles règles Firebase
- ✅ `audioSync` dans `state/` → déjà writable par host/asker

### Performance
- ⚠️ Preload peut échouer sur connexion très lente
- ✅ Timeout de 2s pour éviter le blocage
- ✅ Pas d'impact si le player rate le démarrage (il entendra juste en retard)

### Synchronisation
- ℹ️ Décalage acceptable: < 200ms (imperceptible)
- ℹ️ Utiliser `Date.now() + 1000` (1 seconde de buffer) pour laisser le temps au preload
- ℹ️ Si un player charge lentement, il démarrera en retard (mais ça reste jouable)

---

## 📱 Compatibilité

- ✅ **iOS Safari:** `<audio>` supporté
- ✅ **Android Chrome:** `<audio>` supporté
- ✅ **iOS/Android WebView (Capacitor):** `<audio>` supporté
- ⚠️ **Autoplay:** Nécessite interaction utilisateur (OK car snippet lancé par host)

---

*Dernière mise à jour: 2026-02-10*
