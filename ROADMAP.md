# 🎮 LET'S QUEEEZE - ROADMAP GAME SHOW PRO

**Vision** : Transformer Let'sQueeeze en une application de quiz type game show professionnel, avec une expérience immersive, excitante et mémorable pour 50+ joueurs simultanés.

**Dernière mise à jour** : 2025-10-18
**Organisation** : Par blocs cohérents et indépendants

---

## 📊 ÉTAT ACTUEL (v0.1)

### ✅ Ce qui fonctionne bien

- ✅ Système de buzzer temps réel avec lock transactionnel
- ✅ Buzz anticipé avec risque/récompense (-100pts / +MAX)
- ✅ Points dégressifs synchronisés serveur (100→50 en 10s)
- ✅ Mode équipes (2-4) avec scores agrégés
- ✅ Firebase RTDB pour sync temps réel jusqu'à ~50 joueurs
- ✅ QR Code pour rejoindre facilement
- ✅ Interface mobile-first responsive
- ✅ Sons basiques (reveal.mp3, buzz.mp3)
- ✅ Thème rétro game show (bleu/orange/cyan)

### ⚠️ Limitations actuelles

- ⚠️ Design visuel basique (peu d'animations)
- ⚠️ Feedback limité (pas de confettis, transitions abruptes)
- ⚠️ Sons minimalistes (2 sons seulement)
- ⚠️ Pas de tension dramatique (musique, countdown visuel)
- ⚠️ Pas de célébration de victoire
- ⚠️ Interface animateur peu intuitive (boutons partout)
- ⚠️ Pas de mode spectateur fonctionnel
- ⚠️ Pas de statistiques détaillées

---

## 🎯 VISION : 5 PILIERS GAME SHOW PRO

1. **TENSION & EXCITATION** 🔥 - Musique, countdown, effets sonores, vibrations
2. **FEEDBACK VISUEL IMMÉDIAT** ✨ - Animations, confettis, indicateurs clairs
3. **ENGAGEMENT SOCIAL** 👥 - Spectateurs, avatars, réactions, stats
4. **VARIÉTÉ & REJOUABILITÉ** 🎲 - Modes variés, power-ups, formats questions
5. **PROFESSIONALISME** 🎬 - Dashboard pro, écran spectateur, transitions

---

## 📦 BLOCS DE DÉVELOPPEMENT

Chaque bloc est **cohérent**, **complet** et **indépendant**. On peut les faire dans n'importe quel ordre.

---

## 🎨 BLOC 1 : ANIMATIONS & FEEDBACK VISUEL
**Ce qu'on fait** : Rendre l'app visuellement excitante avec animations fluides et effets
**Fichiers touchés** : `components/Buzzer.jsx`, `components/PointsRing.jsx`, `app/globals.css`, nouveau `components/Confetti.jsx`
**Durée** : 1 session

### Implémentations

- [ ] **Installation dépendances**
  ```bash
  npm install framer-motion canvas-confetti
  ```

- [ ] **Animations du buzzer** (`components/Buzzer.jsx`)
  - Pulse animé quand actif (Framer Motion)
  - Shake + flash quand quelqu'un d'autre buzze
  - Scale up au click avec spring animation
  - Confetti explosion quand on buzze en premier
  - Glow effect pulsant sur le buzzer anticipé

- [ ] **Timer de points animé** (`components/PointsRing.jsx`)
  - Transition smooth du SVG circle (stroke-dashoffset)
  - Changement de couleur progressif (vert → jaune → orange → rouge)
  - Pulsation quand < 3 secondes restantes
  - Animation des chiffres (counter increment effect)

- [ ] **Transitions de page** (nouveau `components/PageTransition.jsx`)
  - Fade-in sur toutes les pages
  - Slide-in pour les modals
  - Stagger animation pour listes de joueurs

- [ ] **Leaderboard animé** (`app/game/[code]/host/page.jsx`, `app/game/[code]/play/page.jsx`)
  - Montée/descente progressive des positions (AnimatePresence)
  - Highlight changement de position (flash gold)
  - Counter animation pour les points
  - Podium avec scale effect sur top 3

- [ ] **Révélation de question animée** (`app/game/[code]/host/page.jsx`)
  - Slide-in avec blur to clear
  - Typewriter effect optionnel
  - Scale in pour la catégorie

- [ ] **Effets de célébration** (nouveau `components/Confetti.jsx`)
  - Bonne réponse : confetti léger (vert)
  - Victoire finale : explosion massive (multicolore)
  - Buzz anticipé réussi : confetti couleur équipe
  - Helper function `triggerConfetti(type, color?)`

- [ ] **Particules & micro-interactions**
  - Étincelles au hover sur buzzer
  - Ripple effect au click
  - Shake screen sur mauvaise réponse (subtle)

### Code snippets clés

**Buzzer avec Framer Motion :**
```jsx
import { motion } from 'framer-motion';

<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  animate={isActive ? { boxShadow: ['0px 0px 0px rgba(239,68,68,0)', '0px 0px 30px rgba(239,68,68,0.6)'] } : {}}
  transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
>
```

**Confetti helper :**
```jsx
import confetti from 'canvas-confetti';

export function triggerConfetti(type = 'success', customColor) {
  const configs = {
    success: { particleCount: 100, spread: 70, colors: ['#10B981', '#34D399'] },
    victory: { particleCount: 200, spread: 100, startVelocity: 45 },
    team: { particleCount: 150, spread: 60, colors: [customColor] }
  };
  confetti(configs[type]);
}
```

---

## 🔊 BLOC 2 : SONS & AMBIANCE SONORE
**Ce qu'on fait** : Audio riche avec musique de fond et effets sonores variés
**Fichiers touchés** : `public/sounds/`, nouveau `lib/audio.js`, `components/AudioControl.jsx`
**Durée** : 1 session

### Implémentations

- [ ] **Installation dépendances**
  ```bash
  npm install howler
  ```

- [ ] **Bibliothèque sonore** (`public/sounds/`)
  - ✅ `reveal.mp3` (déjà présent)
  - ✅ `buzz.mp3` (déjà présent)
  - [ ] `countdown.mp3` (tick-tock 3-2-1)
  - [ ] `correct.mp3` (applaudissements + ding)
  - [ ] `wrong.mp3` (buzzer d'erreur)
  - [ ] `victory.mp3` (fanfare)
  - [ ] `levelup.mp3` (whoosh montée)
  - [ ] `anticipated-correct.mp3` (jackpot)
  - [ ] `penalty.mp3` (sad trombone)
  - [ ] `lobby-music.mp3` (loop 2min, légère)
  - [ ] `game-music.mp3` (loop 3min, tension)
  - [ ] `finale-music.mp3` (loop 2min, épique)

  **Sources** : Freesound.org, Zapsplat.com (gratuits avec attribution)

- [ ] **Audio Manager** (nouveau `lib/audio.js`)
  ```js
  import { Howl } from 'howler';

  export class AudioManager {
    constructor() {
      this.sounds = {};
      this.music = null;
      this.volume = 0.7;
      this.musicVolume = 0.4;
      this.muted = false;
    }

    preload() {
      // Charge tous les sons
      this.sounds.buzz = new Howl({ src: ['/sounds/buzz.mp3'] });
      // ...
    }

    play(soundName) {
      if (this.muted) return;
      this.sounds[soundName]?.play();
    }

    playMusic(trackName) {
      this.stopMusic();
      this.music = new Howl({
        src: [`/sounds/${trackName}.mp3`],
        loop: true,
        volume: this.musicVolume
      });
      this.music.play();
    }

    stopMusic() {
      this.music?.stop();
    }

    setVolume(v) { /* ... */ }
    toggleMute() { /* ... */ }
  }

  export const audioManager = new AudioManager();
  ```

- [ ] **Intégration dans les pages**
  - `app/layout.js` : Preload des sons au mount
  - `app/room/[code]/page.jsx` : Musique lobby
  - `app/game/[code]/host/page.jsx` : Musique game + effets
  - `app/game/[code]/play/page.jsx` : Effets seulement
  - `app/end/[code]/page.jsx` : Musique finale

- [ ] **Contrôles audio** (nouveau `components/AudioControl.jsx`)
  - Bouton volume (slider)
  - Bouton mute/unmute
  - Volume SFX séparé de musique
  - Persistance dans localStorage

- [ ] **Triggers audio intelligents**
  - Countdown quand < 5 secondes
  - Correct/Wrong selon validation host
  - Victory sur écran final
  - Anticipated-correct seulement si buzz anticipé validé
  - Levelup quand joueur monte au classement

### Code snippet

**Usage dans composant :**
```jsx
import { audioManager } from '@/lib/audio';

// Au mount
useEffect(() => {
  audioManager.playMusic('game-music');
  return () => audioManager.stopMusic();
}, []);

// Sur événement
const handleBuzz = () => {
  audioManager.play('buzz');
  triggerConfetti('success');
};
```

---

## 👨‍💼 BLOC 3 : DASHBOARD ANIMATEUR PRO
**Ce qu'on fait** : Interface host intuitive avec raccourcis clavier et écran spectateur
**Fichiers touchés** : `app/game/[code]/host/page.jsx`, nouveau `app/spectate/[code]/page.jsx`, `hooks/useKeyboard.js`
**Durée** : 1 session

### Implémentations

- [ ] **Restructuration UI host** (`app/game/[code]/host/page.jsx`)
  - Diviser en 3 zones :
    1. **Gauche** : Question + réponse (grand)
    2. **Centre** : Contrôles principaux (gros boutons)
    3. **Droite** : Scores + stats en direct

  - **Contrôles simplifiés** :
    ```
    [Révéler Question]  (ESPACE)
    [✔ Valider +X]      (→ flèche droite)
    [✘ Mauvaise -X]     (← flèche gauche)
    [⏭ Passer]          (↓ flèche bas)
    [🔄 Reset Buzzers]  (R)
    [⏸ Pause Timer]     (P)
    ```

  - Afficher raccourcis clavier sur les boutons
  - Feedback visuel au keypress (flash button)

- [ ] **Hook raccourcis clavier** (nouveau `hooks/useKeyboard.js`)
  ```js
  export function useKeyboard(bindings) {
    useEffect(() => {
      const handler = (e) => {
        const action = bindings[e.key];
        if (action && !e.repeat) action();
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [bindings]);
  }
  ```

- [ ] **Stats en direct** (sidebar droite)
  - Joueur le plus rapide (avg buzz time)
  - Meilleur ratio correct/incorrect
  - Nombre de buzz anticipés
  - Graphique évolution top 3

- [ ] **Contrôle du timer** (nouveau)
  - Bouton Pause/Resume visible
  - Affichage temps écoulé
  - Indicateur "PAUSE" bien visible côté joueur

- [ ] **Vue historique** (onglet dédié)
  - Liste des 5 dernières questions
  - Qui a répondu correctement
  - Points attribués

- [ ] **Écran spectateur pour projecteur** (nouveau `app/spectate/[code]/page.jsx`)
  - Mode plein écran
  - Pas de boutons (lecture seule)
  - Affichage :
    ```
    ┌─────────────────────────────────┐
    │   QUESTION EN GRAND (centre)    │
    │                                 │
    │   [Timer circulaire]            │
    │                                 │
    │   Leaderboard TOP 5             │
    │   (ou scores équipes)           │
    └─────────────────────────────────┘
    ```
  - Auto-révélation question (sync avec host)
  - Affichage réponse après validation (3s)
  - Transitions animées

- [ ] **Lien spectateur dans lobby**
  - Bouton "Écran spectateur" dans `/room/[code]`
  - QR code pour spectateurs

### Code snippet

**Raccourcis clavier :**
```jsx
useKeyboard({
  ' ': revealToggle,      // Espace
  'ArrowRight': validate,  // →
  'ArrowLeft': wrong,      // ←
  'ArrowDown': skip,       // ↓
  'r': resetBuzzers,       // R
  'p': togglePause,        // P
});
```

---

## 🎮 BLOC 4 : EXPÉRIENCE JOUEUR ENRICHIE
**Ce qu'on fait** : Feedback joueur, avatars, stats personnelles, lobby interactif
**Fichiers touchés** : `app/game/[code]/play/page.jsx`, `app/room/[code]/page.jsx`, `components/PlayerCard.jsx`
**Durée** : 1 session

### Implémentations

- [ ] **Avatars & identité** (nouveau `components/PlayerAvatar.jsx`)
  - Initiales colorées par défaut (génération couleur depuis hash du nom)
  - Upload photo optionnel (Firebase Storage)
  - Bordure couleur équipe si mode équipes
  - Affichage partout (lobby, leaderboard, buzz banner)

- [ ] **Feedback en direct** (`app/game/[code]/play/page.jsx`)
  - **Votre position** : "#3/12" bien visible
  - **Écart avec le leader** : "🏆 Leader" ou "-50pts du leader"
  - **Meilleure série** : "🔥 3 correctes d'affilée"
  - **Badge de performance** :
    - 🔥 "En feu !" (3+ bonnes réponses de suite)
    - ⚡ "Flash" (buzzé en <1s)
    - 🎯 "Sniper" (2+ buzz anticipés corrects)

- [ ] **Stats personnelles** (card dépliable)
  - Nombre de réponses (correctes/incorrectes)
  - Temps moyen de buzz
  - Meilleur rang atteint
  - Progression score (graphique mini)

- [ ] **Lobby interactif** (`app/room/[code]/page.jsx`)
  - **Mini-jeu d'attente** : Pierre-papier-ciseaux entre joueurs
    - Chaque joueur choisit
    - Résultats affichés
    - Winner gagne +10pts au début de la partie

  - **Sondage rapide** : "Quel est ton personnage préféré ?"
    - Host pose une question
    - Joueurs votent
    - Résultats en temps réel

  - **Customisation** :
    - Choisir couleur avatar
    - Choisir emoji de réaction

- [ ] **Réactions emoji** (nouveau `components/EmojiReaction.jsx`)
  - 6 emojis : 👏 🔥 😂 💀 😮 ❤️
  - Boutons en bas pendant la partie
  - Floating animation quand envoyé
  - Visible par tous (overlay sur écran spectateur)
  - Throttle pour éviter spam (1 emoji / 2s)

- [ ] **Onboarding** (modal au premier lancement)
  - 3 étapes :
    1. "Comment buzzer"
    2. "Buzz anticipé = risque"
    3. "Regardez le timer !"
  - Skip possible
  - Stocké dans localStorage

### Code snippet

**Avatar génération :**
```jsx
function generateColor(name) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

<div style={{
  background: generateColor(playerName),
  width: 40, height: 40,
  borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}}>
  {playerName.slice(0,2).toUpperCase()}
</div>
```

---

## 📊 BLOC 5 : STATS & ÉCRAN DE FIN ENRICHI
**Ce qu'on fait** : Podium spectaculaire, stats détaillées, partage social
**Fichiers touchés** : `app/end/[code]/page.jsx`, nouveau `lib/shareImage.js`
**Durée** : 1 session

### Implémentations

- [ ] **Installation dépendances**
  ```bash
  npm install recharts html2canvas
  ```

- [ ] **Podium animé** (`app/end/[code]/page.jsx`)
  - Top 3 avec scale différent (1er = 1.2x, 2e = 1.1x, 3e = 1.0x)
  - Animation d'entrée en stagger (3e → 2e → 1er)
  - Confetti au reveal du 1er
  - Avatars des gagnants
  - Points affichés en grand

- [ ] **Awards / Distinctions**
  - 🏆 **MVP** : Meilleur score
  - ⚡ **Flash** : Temps moyen de buzz le plus rapide
  - 🎯 **Sniper** : Meilleur ratio correct/incorrect
  - 🔥 **Pyroman** : Plus de buzz anticipés
  - 🐌 **Tortue** : Temps moyen le plus lent (fun)
  - 🎲 **Chanceux** : Plus de points gagnés par buzz anticipé

- [ ] **Graphiques** (Recharts)
  - **Évolution des scores** : Line chart top 5
  - **Distribution des réponses** : Bar chart (correctes vs incorrectes)
  - **Timeline de buzz** : Scatter plot (qui a buzzé à quel moment)

- [ ] **Stats individuelles** (tableau)
  ```
  Joueur          | Score | Correctes | Buzz moy | Anticipés
  ────────────────┼───────┼───────────┼──────────┼──────────
  Alice      🏆   | 450   | 8/10      | 1.2s     | 2 ✅
  Bob        🥈   | 380   | 7/10      | 0.9s ⚡  | 1 ✅ 1 ❌
  ```

- [ ] **Partage social**
  - Bouton "Partager mon score"
  - Génération image podium (html2canvas)
  - Format :
    ```
    ┌─────────────────────────────┐
    │   LET'S QUEEEZE             │
    │                             │
    │   🏆 Alice - 450pts         │
    │   Quiz: Friends             │
    │                             │
    │   [QR Code pour rejoindre]  │
    └─────────────────────────────┘
    ```
  - Téléchargement automatique
  - Copie lien avec résultat

- [ ] **Boutons d'action**
  - **Rejouer** (reset state, même room, même joueurs)
  - **Nouveau quiz** (retour au lobby, changer quiz)
  - **Quitter** (retour à l'accueil)

- [ ] **Historique de partie** (optionnel, Firebase)
  - Sauvegarde top 10 dernières parties
  - Accessible depuis `/history`
  - Affiche date, quiz, gagnant, scores

### Code snippet

**Génération image partage :**
```jsx
import html2canvas from 'html2canvas';

async function shareScore() {
  const element = document.getElementById('podium-card');
  const canvas = await html2canvas(element);
  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = 'gigglz-score.png';
  link.href = dataUrl;
  link.click();
}
```

---

## 🎲 BLOC 6 : NOUVEAUX MODES DE JEU
**Ce qu'on fait** : 4 modes variés pour diversifier l'expérience
**Fichiers touchés** : `app/room/[code]/page.jsx`, `app/game/[code]/host/page.jsx`, nouveau `lib/gameModes.js`
**Durée** : 1 session

### Implémentations

- [ ] **Sélection mode** (`app/room/[code]/page.jsx`)
  - Dropdown "Mode de jeu" :
    - Classic (actuel)
    - Speed Round
    - Élimination
    - Double or Nothing
  - Description de chaque mode

- [ ] **Config modes** (nouveau `lib/gameModes.js`)
  ```js
  export const GAME_MODES = {
    classic: {
      name: 'Classic',
      description: 'Mode standard avec points dégressifs',
      config: { /* actuel */ }
    },
    speed: {
      name: 'Speed Round',
      description: '20 questions, 5s chacune, points fixes',
      config: {
        questionCount: 20,
        timerDuration: 5000,
        pointsFixed: 10,
        noDecay: true
      }
    },
    elimination: {
      name: 'Élimination',
      description: 'Dernier éliminé chaque round',
      config: {
        eliminateLastEachRound: true,
        finalPlayerCount: 3
      }
    },
    doubleOrNothing: {
      name: 'Double or Nothing',
      description: 'Correct = x2 points, Faux = -100%',
      config: {
        multiplierCorrect: 2,
        penaltyIncorrect: 1.0 // -100% des points de la question
      }
    }
  };
  ```

- [ ] **Logique Speed Round**
  - Timer fixe 5s
  - Pas de décroissance de points
  - 20 questions max
  - Auto-skip si timeout
  - Affichage countdown visible

- [ ] **Logique Élimination**
  - Après chaque question, dernier du classement éliminé
  - Joueur éliminé voit "❌ ÉLIMINÉ" et devient spectateur
  - Continue jusqu'à 3 finalistes
  - Finale : 5 dernières questions

- [ ] **Logique Double or Nothing**
  - Si correct : `score += pointsEnJeu * 2`
  - Si faux : `score -= pointsEnJeu`
  - Affichage "x2" bien visible
  - High risk, high reward

- [ ] **Adaptations UI**
  - Badge mode en haut (ex: "🔥 SPEED ROUND")
  - Règles spécifiques affichées
  - Timer adapté selon le mode
  - Bannière "ÉLIMINÉ" pour joueurs sortis

### Code snippet

**Sélection mode :**
```jsx
const [gameMode, setGameMode] = useState('classic');

<select value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
  {Object.entries(GAME_MODES).map(([key, mode]) => (
    <option key={key} value={key}>
      {mode.name} - {mode.description}
    </option>
  ))}
</select>
```

---

## 🎁 BLOC 7 : POWER-UPS & BONUS
**Ce qu'on fait** : Système de power-ups pour pimenter le jeu
**Fichiers touchés** : `app/game/[code]/play/page.jsx`, `app/game/[code]/host/page.jsx`, nouveau `components/PowerUp.jsx`
**Durée** : 1 session

### Implémentations

- [ ] **Config power-ups** (nouveau `lib/powerups.js`)
  ```js
  export const POWERUPS = {
    joker: {
      name: 'Joker',
      icon: '🔄',
      description: 'Voir 2 indices',
      cost: 50, // points à dépenser
      duration: 'instant'
    },
    freeze: {
      name: 'Freeze',
      icon: '⏱️',
      description: 'Bloquer le timer 3s',
      cost: 30,
      duration: 3000
    },
    double: {
      name: 'Double Points',
      icon: '🎯',
      description: 'x2 points sur la prochaine question',
      cost: 40,
      duration: 'next-question'
    },
    shield: {
      name: 'Bouclier',
      icon: '🛡️',
      description: 'Pas de pénalité si faux',
      cost: 60,
      duration: 'next-question'
    }
  };
  ```

- [ ] **Système d'achat** (`app/game/[code]/play/page.jsx`)
  - Bouton "💰 Shop" en haut
  - Modal avec liste des power-ups
  - Affichage prix et solde actuel
  - Validation achat (transaction Firebase)
  - Confirmation visuelle

- [ ] **Activation power-up**
  - Icône power-up actif affiché en permanence
  - Bouton "Utiliser X" visible
  - Cooldown après utilisation
  - Effet visuel au trigger

- [ ] **Effets power-ups**
  - **Joker** : Affiche 2 indices supplémentaires (ex: "Commence par F", "4 lettres")
  - **Freeze** : `pausedAt` set pendant 3s, puis resume auto
  - **Double** : Badge "x2" sur le timer, appliqué au prochain validate
  - **Shield** : Badge "🛡️", pas de malus si wrong

- [ ] **Gestion côté host**
  - Host voit les power-ups actifs de chaque joueur
  - Peut désactiver les power-ups (config room)

- [ ] **Distribution équitable**
  - Chaque joueur commence avec 0 power-ups
  - Gagne 1 power-up random tous les 5 bonnes réponses
  - Ou achète avec points accumulés

- [ ] **Animations**
  - Particules au trigger
  - Glow effect sur le bouton
  - Sound effect dédié

### Code snippet

**Achat power-up :**
```jsx
async function buyPowerup(powerupId) {
  const cost = POWERUPS[powerupId].cost;
  if (myScore < cost) return alert('Pas assez de points !');

  await runTransaction(ref(db, `rooms/${code}/players/${uid}`), (player) => {
    if (player.score < cost) return player;
    return {
      ...player,
      score: player.score - cost,
      powerups: [...(player.powerups || []), powerupId]
    };
  });
}
```

---

## 🎤 BLOC 8 : FORMATS DE QUESTIONS VARIÉS
**Ce qu'on fait** : QCM, Vrai/Faux, Audio, Image, Vidéo
**Fichiers touchés** : `app/game/[code]/host/page.jsx`, `app/game/[code]/play/page.jsx`, format quiz JSON
**Durée** : 1 session

### Implémentations

- [ ] **Nouveau format quiz** (`public/data/*.json`)
  ```json
  {
    "id": "mixed-format",
    "title": "Quiz Multiformat",
    "items": [
      {
        "type": "text",
        "question": "Capitale de la France ?",
        "answer": "Paris",
        "difficulty": "normal"
      },
      {
        "type": "mcq",
        "question": "Quelle est la couleur du ciel ?",
        "options": ["Rouge", "Bleu", "Vert", "Jaune"],
        "answer": "Bleu",
        "difficulty": "normal"
      },
      {
        "type": "truefalse",
        "question": "La Terre est plate",
        "answer": false,
        "difficulty": "normal"
      },
      {
        "type": "audio",
        "question": "Quel est cet instrument ?",
        "audioUrl": "/quiz-media/piano.mp3",
        "answer": "Piano",
        "difficulty": "difficile"
      },
      {
        "type": "image",
        "question": "Quel monument est-ce ?",
        "imageUrl": "/quiz-media/eiffel.jpg",
        "answer": "Tour Eiffel",
        "difficulty": "normal"
      },
      {
        "type": "estimation",
        "question": "Combien d'habitants à Paris ?",
        "answer": 2200000,
        "tolerance": 200000,
        "difficulty": "difficile"
      }
    ]
  }
  ```

- [ ] **Composants question** (nouveaux)
  - `components/questions/TextQuestion.jsx` (actuel)
  - `components/questions/McqQuestion.jsx`
  - `components/questions/TrueFalseQuestion.jsx`
  - `components/questions/AudioQuestion.jsx`
  - `components/questions/ImageQuestion.jsx`
  - `components/questions/EstimationQuestion.jsx`

- [ ] **QCM** (`McqQuestion.jsx`)
  - Affichage 4 options (A, B, C, D)
  - Joueur clique sur choix avant de buzzer
  - Validation : choix correct = points
  - Host voit tous les choix des joueurs

- [ ] **Vrai/Faux** (`TrueFalseQuestion.jsx`)
  - 2 gros boutons VRAI / FAUX
  - Buzz implicite au choix
  - Animation flip pour révéler réponse

- [ ] **Audio** (`AudioQuestion.jsx`)
  - Player audio intégré
  - Play/Pause
  - Peut réécouter
  - Buzzer normal après écoute

- [ ] **Image** (`ImageQuestion.jsx`)
  - Affichage image en grand
  - Zoom possible
  - Buzzer normal

- [ ] **Estimation** (`EstimationQuestion.jsx`)
  - Input number
  - Validation : `Math.abs(guess - answer) <= tolerance`
  - Points dégressifs selon proximité :
    - Exact : +200pts
    - Proche (±10%) : +150pts
    - Moyen (±25%) : +100pts
    - Loin (±50%) : +50pts

- [ ] **Upload médias** (Firebase Storage)
  - Host peut uploader fichiers audio/image
  - Stockage dans `/quiz-media/{quizId}/`
  - URL générée automatiquement

- [ ] **Adaptations UI**
  - Badge type de question en haut
  - Instructions spécifiques (ex: "Écoute l'extrait")
  - Composant dynamique selon `question.type`

### Code snippet

**Rendu dynamique :**
```jsx
const QuestionComponents = {
  text: TextQuestion,
  mcq: McqQuestion,
  truefalse: TrueFalseQuestion,
  audio: AudioQuestion,
  image: ImageQuestion,
  estimation: EstimationQuestion
};

const QuestionComponent = QuestionComponents[question.type] || TextQuestion;

<QuestionComponent question={question} onBuzz={handleBuzz} />
```

---

## 👥 BLOC 9 : SOCIAL & PROFILS
**Ce qu'on fait** : Comptes persistants, achievements, leaderboards globaux
**Fichiers touchés** : `app/profile/page.jsx`, `lib/achievements.js`, nouveau `app/leaderboard/page.jsx`
**Durée** : 1 session

### Implémentations

- [ ] **Auth Firebase** (activation)
  - Email/Password
  - Google Sign-In
  - Création compte optionnelle (peut jouer anonyme)

- [ ] **Profil joueur** (`app/profile/page.jsx`)
  - Pseudo
  - Avatar personnalisé
  - Bio courte
  - Statistiques globales :
    - Parties jouées
    - Win rate
    - Score moyen
    - Meilleur score
    - Temps moyen de buzz

- [ ] **Système d'achievements** (nouveau `lib/achievements.js`)
  ```js
  export const ACHIEVEMENTS = {
    firstBuzz: {
      id: 'first-buzz',
      name: 'Premier Buzz',
      description: 'Buzzer pour la première fois',
      icon: '🔔',
      condition: (stats) => stats.totalBuzzes >= 1
    },
    speedster: {
      id: 'speedster',
      name: 'Flash',
      description: 'Buzzer en moins de 1s (10 fois)',
      icon: '⚡',
      condition: (stats) => stats.fastBuzzes >= 10
    },
    genius: {
      id: 'genius',
      name: 'Génie',
      description: '100% de réponses correctes sur un quiz',
      icon: '🧠',
      condition: (stats) => stats.perfectGames >= 1
    },
    champion: {
      id: 'champion',
      name: 'Champion',
      description: 'Gagner 50 parties',
      icon: '👑',
      condition: (stats) => stats.wins >= 50
    }
    // ... 20 achievements au total
  };
  ```

- [ ] **Vérification achievements**
  - Fonction `checkAchievements(userId)` appelée après chaque partie
  - Stockage dans `users/{uid}/achievements/`
  - Notification toast quand débloqué
  - Animation confetti + son

- [ ] **Leaderboards globaux** (`app/leaderboard/page.jsx`)
  - 4 onglets :
    - **Top Score** : Meilleur score unique
    - **Plus Rapide** : Temps moyen de buzz
    - **Champion** : Plus de victoires
    - **Par Quiz** : Meilleur score par quiz

  - Top 100 affichés
  - Mise à jour temps réel
  - Filtre par période (semaine, mois, all-time)

- [ ] **Système de niveaux**
  - XP gagnée : +10 par partie, +50 si victoire, +100 si perfect
  - Niveaux :
    - 1-10 : Bronze
    - 11-20 : Silver
    - 21-40 : Gold
    - 41-60 : Platinum
    - 61-100 : Diamond
  - Badge de niveau sur profil et leaderboard

- [ ] **Amis**
  - Ajouter des amis par pseudo
  - Liste d'amis
  - Inviter directement à une partie
  - Voir stats des amis

### Code snippet

**Check achievement :**
```jsx
import { ACHIEVEMENTS } from '@/lib/achievements';

async function checkAchievements(userId, stats) {
  const unlocked = [];

  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    const hasAchievement = await get(ref(db, `users/${userId}/achievements/${id}`));
    if (!hasAchievement.exists() && achievement.condition(stats)) {
      await set(ref(db, `users/${userId}/achievements/${id}`), {
        unlockedAt: serverTimestamp()
      });
      unlocked.push(achievement);
    }
  }

  if (unlocked.length > 0) {
    showAchievementToast(unlocked);
  }
}
```

---

## 🔧 BLOC 10 : PERFORMANCE & PWA
**Ce qu'on fait** : Optimisations, PWA, monitoring
**Fichiers touchés** : `next.config.mjs`, nouveau `public/manifest.json`, `public/sw.js`
**Durée** : 1 session

### Implémentations

- [ ] **Installation dépendances**
  ```bash
  npm install next-pwa @sentry/nextjs
  ```

- [ ] **PWA Setup**
  - `next.config.mjs` :
    ```js
    import withPWA from 'next-pwa';

    export default withPWA({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development'
    })({
      // existing config
    });
    ```

  - `public/manifest.json` :
    ```json
    {
      "name": "Let'sQueeeze",
      "short_name": "Queeeze",
      "description": "Quiz buzzer temps réel",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#0F172A",
      "theme_color": "#3B82F6",
      "icons": [
        {
          "src": "/icons/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icons/icon-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    }
    ```

- [ ] **Optimisations Next.js**
  - Code splitting dynamique :
    ```jsx
    const Confetti = dynamic(() => import('@/components/Confetti'), { ssr: false });
    ```
  - Image optimization (Next/Image)
  - Font optimization (next/font)
  - Bundle analyzer pour détecter gros fichiers

- [ ] **Monitoring Sentry**
  - Setup Sentry
  - Error tracking automatique
  - Performance monitoring
  - User feedback (bug report)

- [ ] **Firebase Performance**
  - Activation Firebase Performance Monitoring
  - Traces personnalisées (temps de buzz, temps de rendu)

- [ ] **Analytics**
  - Google Analytics ou Plausible
  - Events :
    - Page views
    - Buzz count
    - Parties créées
    - Joueurs rejoints
    - Mode de jeu sélectionné

- [ ] **Tests de charge**
  - Script Artillery pour simuler 50 joueurs
  - Test Firebase RTDB limits
  - Monitoring latence

- [ ] **Caching stratégies**
  - Cache quiz JSON (stale-while-revalidate)
  - Cache images/audio (cache-first)
  - Precache routes principales

### Code snippet

**Dynamic import :**
```jsx
import dynamic from 'next/dynamic';

const Confetti = dynamic(() => import('@/components/Confetti'), {
  ssr: false,
  loading: () => <div>Chargement...</div>
});
```

---

## 🌍 BLOC 11 : ACCESSIBILITÉ & I18N
**Ce qu'on fait** : A11y, traductions, modes d'accessibilité
**Fichiers touchés** : Tous les composants, nouveau `lib/i18n.js`
**Durée** : 1 session

### Implémentations

- [ ] **Installation dépendances**
  ```bash
  npm install next-intl
  ```

- [ ] **Setup i18n** (next-intl)
  - Fichiers de traduction :
    - `locales/fr.json`
    - `locales/en.json`
    - `locales/es.json`

  - Configuration Next.js
  - Middleware pour détection locale
  - Sélecteur de langue dans header

- [ ] **Traductions clés**
  ```json
  {
    "lobby.title": "Lobby — {quizTitle}",
    "lobby.invite": "Invite des joueurs",
    "game.buzz": "BUZZ",
    "game.anticipated": "ANTICIPÉ",
    "game.penalty": "PÉNALITÉ",
    "game.correct": "Correct !",
    "game.wrong": "Mauvais",
    "end.podium": "Podium",
    "end.mvp": "MVP du quiz"
  }
  ```

- [ ] **Accessibilité (A11y)**
  - **ARIA labels** sur tous les boutons interactifs
  - **Focus visible** (outline custom)
  - **Navigation clavier complète** (Tab, Enter, Espace)
  - **Screen reader compatible** :
    - Annonce des changements de score
    - Annonce du buzz
    - Description des graphiques

  - **Contraste WCAG AA** :
    - Vérification avec tool (axe DevTools)
    - Ajustement des couleurs si besoin

  - **Skip links** ("Aller au contenu principal")

- [ ] **Modes d'accessibilité**
  - **Mode daltonien** :
    - Couleurs adaptées (rouge/vert remplacés)
    - Patterns en plus de couleurs

  - **Mode animations réduites** :
    - Détection `prefers-reduced-motion`
    - Désactive animations complexes
    - Transitions instantanées

  - **Police dyslexie** :
    - Option dans settings
    - Font OpenDyslexic
    - Espacement augmenté

- [ ] **Responsive amélioré**
  - Tests sur :
    - Mobile (320px → 768px)
    - Tablet (768px → 1024px)
    - Desktop (1024px+)
  - Touch targets 44x44px minimum
  - No horizontal scroll

### Code snippet

**Mode daltonien :**
```css
[data-colorblind="true"] {
  --retro-red: #D55E00; /* Orange */
  --retro-green: #009E73; /* Bleu-vert */
}
```

**Usage traduction :**
```jsx
import { useTranslations } from 'next-intl';

const t = useTranslations('game');

<button>{t('buzz')}</button> // "BUZZ" ou "BUZZER" selon locale
```

---

## 🔒 BLOC 12 : SÉCURITÉ & MODÉRATION
**Ce qu'on fait** : Anti-triche, modération, règles robustes
**Fichiers touchés** : `firebase.rules.json`, nouveau `lib/moderation.js`, Functions Cloud
**Durée** : 0.5 session

### Implémentations

- [ ] **Anti-triche**
  - **Rate limiting** :
    - Max 1 buzz par seconde (empêche spam)
    - Détection dans transaction : vérifier `lastBuzzAt`

  - **Détection patterns suspects** :
    - Temps de réaction < 100ms systématiquement = suspect
    - Logging dans Firebase pour review

  - **Bannissement temporaire** :
    - Host peut "freeze" un joueur
    - Joueur ne peut plus buzzer pendant X temps

- [ ] **Modération pseudos**
  - Filtre mots offensants (liste noire)
  - Validation côté Firebase Functions :
    ```js
    // functions/index.js
    exports.validateUsername = functions.database
      .ref('/rooms/{code}/players/{uid}/name')
      .onCreate((snap, context) => {
        const name = snap.val();
        if (containsBadWord(name)) {
          return snap.ref.update({ name: 'Joueur_' + Math.random().toString(36).slice(2, 8) });
        }
      });
    ```

- [ ] **Contrôles host**
  - **Mute joueur** : Désactive ses réactions emoji
  - **Kick joueur** : Supprime de la room
  - **Freeze joueur** : Bloque temporairement

- [ ] **Règles Firebase renforcées**
  - ✅ Déjà granulaires (fait)
  - [ ] Validation stricte des types :
    ```json
    "score": {
      ".validate": "newData.isNumber() && newData.val() >= -1000 && newData.val() <= 10000"
    }
    ```
  - [ ] Protection contre injection
  - [ ] Limite taille des strings (pseudos max 20 chars)

- [ ] **Cleanup automatique**
  - Cloud Function : Delete rooms > 12h
  - Cleanup players offline > 5min (mode spectateur auto)

- [ ] **Reporting**
  - Bouton "Signaler un problème"
  - Formulaire basique (catégorie + description)
  - Envoi email admin ou stockage Firestore

### Code snippet

**Rate limiting buzz :**
```jsx
const result = await runTransaction(lockRef, (currentLock) => {
  const now = Date.now();
  const lastBuzz = currentState?.lastBuzzAt || 0;

  if (now - lastBuzz < 1000) {
    // Spam détecté
    return currentLock; // Abort
  }

  if (!currentLock) {
    return {
      uid: playerUid,
      lastBuzzAt: now
    };
  }
  return currentLock;
});
```

---

## 🎬 BONUS - BLOC 13 : INTÉGRATIONS AVANCÉES
**Ce qu'on fait** : Streaming Twitch, Discord bot, API publique
**Fichiers touchés** : Nouveaux services externes, `pages/api/`, nouveau `discord-bot/`
**Durée** : 1.5 sessions

### Implémentations

- [ ] **Overlay OBS pour streaming**
  - Page dédiée `/overlay/[code]`
  - WebSocket pour updates temps réel
  - Affichage transparent :
    - Leaderboard en overlay
    - Scores équipes
    - "X a buzzé !"
  - Customisable (position, taille, couleurs)

- [ ] **Discord Bot**
  - Bot Node.js (discord.js)
  - Commandes :
    - `/quiz start` : Crée une room et poste lien
    - `/quiz join` : Envoie lien rejoindre
    - `/quiz results` : Poste le podium après partie
  - Notifications :
    - Début de partie
    - Fin de partie avec résultats
    - Achievements débloqués

- [ ] **API publique**
  - Routes Next.js API (`pages/api/`)
  - Endpoints :
    - `GET /api/stats` : Stats globales (parties, joueurs)
    - `GET /api/leaderboard?period=week` : Top scores
    - `POST /api/webhook` : Recevoir événements (partie finie, etc.)
  - Auth par API key
  - Rate limiting

- [ ] **Webhooks**
  - Config webhooks dans settings room
  - Trigger sur événements :
    - Partie démarrée
    - Partie terminée
    - Nouveau joueur rejoint
  - Payload JSON avec détails

### Code snippet

**API leaderboard :**
```js
// pages/api/leaderboard.js
export default async function handler(req, res) {
  const { period = 'all' } = req.query;

  const snapshot = await get(ref(db, 'leaderboard'));
  const data = snapshot.val();

  // Filter by period, sort, top 100
  const filtered = filterByPeriod(data, period);

  res.json({ leaderboard: filtered });
}
```

---

## 📊 MÉTRIQUES DE SUCCÈS

Pour chaque bloc, on mesure :

### UX
- ✅ Temps session > 15 min
- ✅ Taux de retour > 40%
- ✅ NPS > 8/10

### Technique
- ✅ Temps chargement < 2s
- ✅ Latence buzzer < 100ms
- ✅ 0 crash / 100 parties

### Engagement
- ✅ 10+ parties/semaine
- ✅ 20+ joueurs/partie
- ✅ 5+ reviews positives

---

## 🛠️ STACK TECHNIQUE

### Librairies recommandées par bloc

| Bloc | Lib | Pourquoi |
|------|-----|----------|
| 1 - Animations | framer-motion, canvas-confetti | Animations fluides + confettis |
| 2 - Audio | howler.js | Gestion audio avancée |
| 5 - Stats | recharts, html2canvas | Graphiques + capture écran |
| 9 - Social | Firebase Auth | Comptes persistants |
| 10 - PWA | next-pwa, @sentry/nextjs | PWA + monitoring |
| 11 - I18n | next-intl | Traductions |
| 13 - Intégrations | discord.js, socket.io | Bot + WebSocket |

---

## ✅ CHECKLIST DE SUIVI

### Blocs complétés
- [x] Corrections bugs (session précédente)

### En cours
- [ ] Bloc X (nom)

### Prochains blocs prioritaires
1. [ ] Bloc 1 - Animations
2. [ ] Bloc 2 - Audio
3. [ ] Bloc 3 - Dashboard animateur

---

## 📝 NOTES & DÉCISIONS

**2025-10-18**
- ✅ Roadmap restructurée par blocs cohérents
- 🎯 Approche modulaire : chaque bloc = 1 session, livrable complet
- 💡 Priorité suggérée : Blocs 1-3 pour polish immédiat

---

## 🎨 INSPIRATIONS

### Game Shows
- **Jeopardy** : Timing buzzer, tension musicale
- **Qui veut gagner des millions** : Musique crescendo, lumières
- **Questions pour un Champion** : Rythme, célébration

### Apps Quiz
- **Kahoot** : Feedback visuel immédiat, leaderboard animé
- **Quizizz** : Avatars fun, power-ups
- **Jackbox** : UX mobile parfaite, mode spectateur

---

**Maintenu par** : Claude Code
**Repository** : https://github.com/ohsujee/gigglz
**Version** : 0.1.0 → 1.0.0 (target)
