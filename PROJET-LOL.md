# PROJET LOL — Plan de Développement

> Jeu inspiré de "LOL: Qui rit, sort!" (Amazon Prime) — adapté pour Gigglz en mode soirée mobile.

---

## 1. CONCEPT

### Pitch

Un groupe d'amis se retrouve dans une partie. **Règle unique : il est interdit de rire.** Chaque joueur doit faire craquer les autres tout en gardant son sérieux. Celui qui rit prend un **carton jaune**, puis un **carton rouge** = éliminé. Le dernier debout gagne.

### Différences avec le jeu TV

| Aspect | Jeu TV (6h, studio) | Gigglz LOL (15-45 min, soirée) |
|--------|---------------------|-------------------------------|
| Durée | 6 heures | Configurable (15/30/45 min) |
| Joueurs | 10 comédiens pro | 2-20 amis |
| Contenu comique | Improvisation libre | **Fiches fournies** (stand-up, scénarios, mini-jeux) |
| Arbitrage | Présentateur dans une salle | **Vote collectif** sur chaque téléphone |
| Jokers | 1 par joueur, impro libre | 1+ par joueur, **catalogue de contenus** |

### Pourquoi ça marche sur mobile

- Pas besoin d'être comédien → l'app fournit le contenu drôle
- Le vote collectif remplace l'arbitre → tout le monde participe
- Les fiches de stand-up et scénarios créent des moments **gênants et hilarants**
- L'interface pousse au fun : couleurs vives, animations, sons

---

## 2. GAMEPLAY DÉTAILLÉ

### 2.1 Phases du Jeu

```
lobby → playing → [joker] → ended
```

| Phase | Description | Durée |
|-------|-------------|-------|
| `lobby` | Config + attente joueurs | Illimitée |
| `playing` | Jeu principal — tout le monde essaie de faire rire | Timer global configurable |
| `joker` | Un joueur joue son Joker — tout le monde regarde | 3 min max |
| `ended` | Classement final + stats | Illimitée |

### 2.2 Déroulement d'une Partie

1. **L'hôte crée la partie**, configure la durée (15/30/45 min)
2. **Les joueurs rejoignent** le lobby
3. **L'hôte lance la partie** → timer global démarre
4. **Phase de jeu libre** :
   - Les joueurs sont face à face IRL (présentiel)
   - Sur le téléphone : liste des joueurs, leurs cartons, bouton "X a rigolé", bouton "Joker"
   - Quand quelqu'un pense qu'un joueur a ri → il appuie → **vote lancé sur tous les téléphones**
5. **Votes** : majorité simple = carton attribué
6. **Jokers** : un joueur active son Joker → choisit un contenu → le performe IRL
7. **Éliminations** : 2 cartons jaunes = carton rouge = éliminé
8. **Fin** : timer écoulé OU 1 seul joueur restant → classement

### 2.3 Système de Cartons

| Carton | Déclencheur | Effet |
|--------|-------------|-------|
| 🟡 Jaune (1er) | Vote majoritaire "a rigolé" | Avertissement — le joueur continue |
| 🟡 Jaune (2ème) | Vote majoritaire "a rigolé" | Se transforme en 🔴 Rouge |
| 🔴 Rouge | 2ème carton jaune | **Éliminé** — le joueur est spectateur |

**Option avancée (configurable par l'hôte) :**
- Mode "Sévère" : 1 carton jaune = éliminé directement (parties courtes)
- Mode "Classique" : 2 cartons jaunes = rouge = éliminé (par défaut)

### 2.4 Système de Vote

Quand un joueur accuse quelqu'un d'avoir rigolé :

1. **Sur les téléphones des votants** : "🚨 [Accusateur] dit que [Accusé] a rigolé !" + boutons OUI/NON
2. **Sur le téléphone de l'accusé** : Modale fun "😱 On t'accuse d'avoir ri !" (pas de bouton de vote, juste l'attente du verdict)
3. **Vote de l'accusateur** : compte comme OUI automatiquement (il ne revote pas)
4. **Vote** : Chaque joueur actif (sauf l'accusé, sauf les éliminés) vote OUI/NON — timer de 15 secondes
5. **Résultat** :
   - **Majorité OUI** → carton attribué à l'accusé
   - **Majorité NON** → rien ne se passe, la partie continue
   - **Égalité** → pas de carton (bénéfice du doute)
6. **Anti-spam** : cooldown de 30 secondes entre deux accusations par le même joueur

**Cas spécial — Self-report :**
- Un joueur peut s'accuser lui-même → **pas de vote collectif**
- Modale de confirmation : "Tu t'accuses toi-même ? Carton automatique !"
- Si confirmé → carton attribué directement

### 2.5 Fin de Partie

La partie se termine quand :
- ⏱️ Le **timer global** arrive à zéro → classement basé sur les survivants
- 🏆 Il ne reste qu'**un seul joueur** non éliminé → victoire directe
- 🎮 L'**hôte termine manuellement** la partie

**Classement final :**
1. Dernier survivant (ou survivants si timer) → 🥇
2. Derniers éliminés → mieux classés que les premiers éliminés
3. Stats affichées : nombre de cartons donnés, nombre de jokers joués, nombre d'accusations lancées

---

## 3. SYSTÈME DE JOKERS

### 3.1 Principe

Chaque joueur dispose d'**1 seul Joker par partie** (non configurable). Un joueur éliminé peut encore jouer son Joker s'il ne l'a pas utilisé. Quand un joueur active son Joker :

1. **Notification** sur tous les téléphones : "🃏 [Joueur] joue son JOKER !"
2. Le joueur **choisit un contenu** dans le catalogue
3. **Tout le monde doit regarder** — c'est le moment fort
4. Le joueur **performe le contenu IRL** devant les autres
5. Durée max : **3 minutes** (timer visible)
6. À la fin du Joker → retour au jeu normal

### 3.2 Catalogue de Jokers

Le catalogue est organisé par **catégories**. L'app affiche 2-3 options par catégorie pour que le joueur choisisse rapidement.

#### 🎤 Stand-Up (Monologues)

Des **fiches de stand-up** que le joueur doit lire/performer comme un spectacle de comédie. Le texte est volontairement **gênant, absurde, ou décalé**.

**Structure d'une fiche :**
```
{
  id: "standup_001",
  title: "Le Philosophe du Kebab",
  category: "standup",
  duration: "2-3 min",
  difficulty: "facile",        // facile | moyen | hard
  tone: "absurde",             // absurde | gênant | cringe | dark | wholesome
  playerCount: 1,              // Monologue
  script: "Texte complet du monologue...",
  stageDirections: "Instructions de jeu (ton, gestes...)",
  tags: ["nourriture", "philosophie"]
}
```

**Exemples de tons :**
- **Absurde** : Monologue ultra-sérieux sur un sujet ridicule (ex: "Mesdames et messieurs, ce soir je vais vous parler du drame silencieux des chaussettes orphelines...")
- **Gênant** : Le joueur doit faire des trucs embarrassants (ex: déclarer sa flamme à un objet de la pièce)
- **Cringe** : Texte volontairement nul/ringard à performer avec conviction
- **Dark** : Humour noir bien dosé
- **Wholesome** : Gentiment drôle mais livré avec une intensité disproportionnée

#### 🎭 Scénarios Théâtraux (Duos, Trios, Quatuors)

Des **mini-scènes** que le joueur du Joker joue avec d'autres joueurs de son choix. Le joueur qui active le Joker **choisit ses partenaires** (stratégie : prendre ceux qui risquent de craquer).

**Structure d'un scénario :**
```
{
  id: "scene_001",
  title: "Le Restaurant Étoilé",
  category: "scene",
  duration: "2-3 min",
  difficulty: "moyen",
  tone: "absurde",
  playerCount: 2,              // 2 = duo, 3 = trio, 4 = quatuor
  roles: [
    { name: "Le Serveur Dramatique", instructions: "Tu es un serveur ultra-intense..." },
    { name: "Le Client Perdu", instructions: "Tu ne comprends rien au menu..." }
  ],
  setup: "Description de la situation initiale",
  script: "Dialogue guidé avec des indications...",
  twist: "Au milieu, révélation qui change tout...",
  tags: ["restaurant", "absurde"]
}
```

**Le joueur du Joker :**
1. Voit les scénarios disponibles (filtrés par nombre de joueurs dispo)
2. Choisit un scénario
3. **Sélectionne les autres joueurs** pour les rôles
4. Chaque joueur sélectionné reçoit **ses instructions/son rôle** sur son téléphone
5. Ils performent la scène IRL

**Formats :**
- **Monologue** (1 joueur) : Le joueur du Joker seul
- **Duo** (2 joueurs) : Joker + 1 joueur choisi
- **Trio** (3 joueurs) : Joker + 2 joueurs choisis
- **Quatuor** (4 joueurs) : Joker + 3 joueurs choisis

#### 🤝 Jeux Collectifs (Tous les joueurs)

Des **mini-jeux IRL** qui forcent tout le monde à participer. Ces jeux sont des bombes à rire car ils créent des situations inconfortables.

**Structure d'un jeu collectif :**
```
{
  id: "collective_001",
  title: "Barbichette Royale",
  category: "collective",
  duration: "2-3 min",
  difficulty: "facile",
  tone: "classique",
  playerCount: "all",           // Tout le monde joue
  rules: "Règles du mini-jeu...",
  setup: "Comment positionner les joueurs...",
  variants: ["Variante 1...", "Variante 2..."]
}
```

**Exemples de jeux collectifs :**
- **Barbichette Royale** : Tout le monde se tient par la barbichette en chaîne
- **Le Miroir** : Chaque joueur doit imiter exactement les mouvements d'un autre
- **Le Téléphone Gênant** : Chuchoter une phrase absurde de proche en proche, le dernier la crie
- **Statue Émotionnelle** : L'app donne une émotion, tout le monde freeze dans la pose
- **Le Doublage** : Un joueur bouge les lèvres, un autre dit n'importe quoi
- **Confession Absurde** : Chaque joueur doit confesser un truc inventé de plus en plus absurde

### 3.3 Sélection de Joker — Flow UX

```
[Bouton JOKER]
  → Modal plein écran : "🃏 JOKER TIME!"
    → 3 onglets : Stand-Up | Scénarios | Jeux Collectifs
      → 2-3 options par onglet (aléatoire, non répétées)
        → Tap sur une option → Preview (titre + description courte)
          → [Scénarios] Sélection des partenaires
            → "GO!" → Notification à tout le monde
              → Timer 3 min démarre
                → Le joueur performe IRL
                  → Timer fini OU bouton "Terminé" → Retour au jeu
```

### 3.4 Contenu — Plan de Production

**Phase 1 (MVP) — 30 contenus minimum :**
| Catégorie | Quantité | Priorité |
|-----------|----------|----------|
| Stand-Up Monologues | 12 | 🔴 Haute |
| Scénarios Duos | 8 | 🔴 Haute |
| Scénarios Trios | 5 | 🟡 Moyenne |
| Jeux Collectifs | 5 | 🔴 Haute |

**Phase 2 — Extension :**
| Catégorie | Quantité |
|-----------|----------|
| Stand-Up supplémentaires | +15 |
| Scénarios Quatuors | +5 |
| Jeux Collectifs supplémentaires | +8 |
| Scénarios Monologues théâtraux | +5 |

**Principes de rédaction du contenu :**
- Le texte doit être **performable par n'importe qui** (pas besoin d'être comédien)
- Favoriser l'**absurde et le gênant** plutôt que les vannes construites
- Les scripts doivent inclure des **indications de jeu** (ton, gestes, pauses)
- Varier les tons : absurde, cringe, dark, wholesome, gênant
- Les scénarios doivent avoir un **twist** au milieu pour surprendre
- Durée de lecture/performance : **1 à 3 minutes**

---

## 4. ARCHITECTURE TECHNIQUE

### 4.1 Firebase Structure

```
rooms_lol/{code}/
├── meta/
│   ├── code: string
│   ├── createdAt: timestamp
│   ├── hostUid: string
│   ├── hostName: string
│   ├── expiresAt: timestamp
│   ├── gameType: "lol"
│   ├── closed: boolean
│   ├── isPro: boolean                       // Créateur Pro → catalogue complet
│   ├── settings/
│   │   ├── duration: 15 | 30 | 45          // minutes
│   │   └── eliminationMode: "classique" | "severe"
│   └── hostDisconnectedAt: timestamp | null
│
├── state/
│   ├── phase: "lobby" | "playing" | "joker" | "voting" | "ended"
│   ├── startedAt: timestamp
│   ├── timerEndAt: timestamp               // startedAt + duration
│   ├── pausedAt: timestamp | null          // Timer pausé pendant votes/jokers
│   ├── totalPausedMs: number               // Temps total pausé (pour recalculer fin)
│   │
│   ├── // --- Vote en cours ---
│   ├── currentVote/
│   │   ├── accuserId: string               // Qui accuse
│   │   ├── accusedId: string               // Qui est accusé
│   │   ├── startedAt: timestamp
│   │   ├── expiresAt: timestamp            // startedAt + 15s
│   │   └── votes/
│   │       └── {uid}: true | false         // OUI / NON
│   │
│   ├── // --- Joker en cours ---
│   ├── currentJoker/
│   │   ├── playerId: string                // Qui joue le Joker
│   │   ├── contentId: string               // ID du contenu choisi
│   │   ├── contentType: "standup" | "scene" | "collective"
│   │   ├── startedAt: timestamp
│   │   ├── expiresAt: timestamp            // startedAt + 3min
│   │   ├── paused: boolean                 // true si vote en cours pendant le Joker
│   │   ├── selectedPlayers/                // Pour scénarios
│   │   │   └── {uid}: { role: string, instructions: string }
│   │   └── active: boolean
│   │
│   └── eliminationOrder: [uid1, uid2, ...]  // Ordre d'élimination (pour classement)
│
├── players/{uid}/
│   ├── uid: string
│   ├── name: string
│   ├── status: "active" | "disconnected" | "eliminated" | "spectator"
│   ├── activityStatus: "active" | "inactive"
│   ├── joinedAt: timestamp
│   ├── yellowCards: 0 | 1
│   ├── redCard: boolean
│   ├── jokersRemaining: number
│   ├── accusationsMade: number             // Stats
│   ├── accusationsReceived: number         // Stats
│   └── jokersPlayed: number               // Stats
│
├── accusations/
│   └── {accusationId}/
│       ├── accuserId: string
│       ├── accusedId: string
│       ├── timestamp: number
│       ├── result: "guilty" | "innocent" | "pending"
│       ├── votesFor: number
│       └── votesAgainst: number
│
└── __health__/
    └── aliveAt: timestamp
```

### 4.2 Routes

```
app/lol/
├── room/[code]/
│   └── page.jsx              // Lobby — config + attente
└── game/[code]/
    ├── play/page.jsx         // Vue joueur principale
    └── end/page.jsx          // Résultats finaux
```

> **Pas de page host séparée** : L'hôte est aussi joueur. Il a juste des contrôles supplémentaires (terminer la partie, gérer les conflits). Tout se passe sur `/play`.

### 4.3 Room Config (rooms.js)

```javascript
{
  id: 'lol',
  prefix: 'rooms_lol',
  path: '/lol/room',
  navigateBeforeCreate: false,
  supportsPartyMode: false,     // Pas de Party Mode — tout le monde joue pareil

  playerSchema: (uid, name) => ({
    uid,
    name,
    status: 'active',
    activityStatus: 'active',
    joinedAt: Date.now(),
    yellowCards: 0,
    redCard: false,
    jokersRemaining: 1,        // Fixe — 1 Joker par partie
    accusationsMade: 0,
    accusationsReceived: 0,
    jokersPlayed: 0,
  }),

  createMeta: ({ code, now, hostUid, hostName }) => ({
    code,
    createdAt: now,
    hostUid,
    hostName,
    expiresAt: now + 12 * 60 * 60 * 1000,
    gameType: 'lol',
    settings: {
      duration: 30,              // 30 min par défaut
      eliminationMode: 'classique',
    },
  }),

  createState: () => ({
    phase: 'lobby',
    startedAt: null,
    timerEndAt: null,
    pausedAt: null,
    totalPausedMs: 0,
    currentVote: null,
    currentJoker: null,
    eliminationOrder: [],
  }),
}
```

### 4.4 Couleur du Jeu

```javascript
// lib/config/colors.js
lol: {
  primary: '#FF3366',          // Rose/rouge vif — festif, énergique
  secondary: '#CC0044',
  dark: '#990033',
  glow: 'rgba(255, 51, 102, 0.4)',
  rgba: {
    light: 'rgba(255, 51, 102, 0.15)',
    medium: 'rgba(255, 51, 102, 0.3)',
    dark: 'rgba(255, 51, 102, 0.5)',
  }
}
```

### 4.5 Hooks Nécessaires

| Hook | Page | Usage |
|------|------|-------|
| `usePlayers` | Room, Play, End | Liste joueurs temps réel |
| `usePlayerCleanup` | Room (lobby), Play (playing) | Gestion déconnexion |
| `usePresence` | Room | Heartbeat joueurs |
| `useInactivityDetection` | Play | Détection inactivité 30s |
| `useRoomGuard` | Room, Play, End | Kick/fermeture room |
| `useWakeLock` | Room, Play | Empêcher veille écran |
| `useGameCompletion` | End | Compter parties jouées |
| `useInterstitialAd` | Room | Pub avant la partie |

**Hooks custom à créer :**

| Hook | Usage |
|------|-------|
| `useLolVote` | Gère le flow de vote (lancer, voter, résoudre, cooldown) |
| `useLolJoker` | Gère le flow Joker (sélection contenu, timer, fin) |
| `useLolTimer` | Timer global avec pause/resume pendant votes et jokers |
| `useLolElimination` | Gère les cartons et l'élimination |

### 4.6 Contenu — Stockage

Les fiches de contenu (stand-up, scénarios, jeux) seront stockées en **JSON statique** dans le projet :

```
data/lol/
├── standup.json              // Fiches de stand-up
├── scenes.json               // Scénarios théâtraux
└── collective.json           // Jeux collectifs
```

Pas besoin de Firebase pour le contenu — il est embarqué dans l'app et identique pour tous les joueurs. On pourra migrer vers Firebase Remote Config plus tard pour ajouter du contenu sans redéployer.

---

## 5. UX / UI — AMBIANCE FESTIVE

### 5.1 Direction Artistique

L'interface LOL doit être **la plus festive et vivante** de toute l'app. Quand on ouvre ce jeu, on doit sentir l'énergie d'une soirée.

**Principes :**
- **Couleurs vives** : Rose vif (#FF3366) comme primaire, avec des accents jaune, violet, cyan
- **Animations généreuses** : Tout bouge — les cartons volent, les textes rebondissent, les transitions sont spectaculaires
- **Typographie expressive** : Titres en Bungee, textes larges et lisibles, emojis intégrés
- **Sons** : Buzzer pour les votes, fanfare pour les jokers, son triste pour les éliminations
- **Haptic feedback** : Vibrations sur les moments clés (carton, vote, joker)

### 5.2 Écrans Principaux

#### Lobby
- Header festif avec le nom "LOL" en grand, animé
- Liste des joueurs avec avatars colorés
- **Settings hôte** : durée, mode élimination, nombre de jokers
- Badge "🃏 x1" à côté de chaque joueur (jokers disponibles)
- Bouton "LANCER LA PARTIE" avec animation pulsante
- Ambiance : fond sombre avec particules colorées flottantes

#### Play (Écran Principal de Jeu)
- **Timer global** en haut, bien visible, avec barre de progression
- **Liste des joueurs** : nom + cartons (🟡🔴) + status (éliminé = barré/grisé)
- **Bouton "X A RIGOLÉ"** : gros bouton rouge au centre bas → ouvre un sélecteur de joueurs
- **Bouton "🃏 JOKER"** : bouton doré/spécial → ouvre le catalogue
- **Zone de notifications** : animations plein écran pour les événements (carton, joker, élimination)

#### Vote — Votants
- **Overlay modal** : "Est-ce que [Joueur] a rigolé ?"
- **Deux gros boutons** : OUI / NON
- Timer 15 secondes visible
- Résultat animé : carton qui tombe ou acquittement

#### Vote — Accusé
- **Overlay modal fun** : "On t'accuse d'avoir ri !" (pas de boutons de vote)
- Animation d'attente pendant que les autres votent
- Résultat affiché : "Carton !" ou "Acquitté !"

#### Joker — Sélection
- **Modal plein écran** festif
- **3 onglets** avec icônes : 🎤 Stand-Up | 🎭 Scénarios | 🤝 Collectif
- **2-3 cartes** par onglet (sélection aléatoire)
- Chaque carte : titre + tag de ton + durée + nombre de joueurs
- Tap → preview avec description + début du script
- [Scénarios] → sélection des partenaires avec avatars

#### Joker — En Cours
- **Plein écran** sur le téléphone du performer : le script défile
- **Sur les autres téléphones** : "🃏 [Joueur] joue son Joker — Regardez !"
- Timer 3 min visible pour tous
- Le performer peut scroller son script
- Bouton "Terminé" pour finir avant le timer

#### Élimination
- **Animation spectaculaire** : carton rouge qui tombe, écran qui se "casse"
- Le joueur éliminé devient **spectateur** (ne peut plus accuser ni voter, mais peut encore jouer son Joker et être recruté pour les scénarios/jeux collectifs)
- Son comique de défaite

#### End
- **Podium** avec le/les gagnant(s)
- **Stats** : "Le plus accusateur", "Le plus accusé", "Joker le plus long"
- **Ordre d'élimination** affiché
- Boutons : "Nouvelle Partie" / "Retour à l'accueil"

### 5.3 Animations Clés

| Événement | Animation |
|-----------|-----------|
| Vote lancé | Vibration + overlay rouge clignotant |
| Être accusé | Vibration forte + modale fun "On t'accuse d'avoir ri !" |
| Carton jaune | Carton qui tombe du haut de l'écran avec rebond + vibration |
| Carton rouge | Carton rouge + écran qui "crack" + vibration longue |
| Joker activé | Explosion dorée + confettis + vibration |
| Élimination | Fade to gray + vibration |
| Victoire | Confettis + podium 3D |
| Timer < 1 min | Pulsation rouge du timer |
| Self-report | Modale de confirmation + vibration douce |

---

## 6. LOGIQUE DE JEU — DÉTAILS

### 6.1 Timer Global

Le timer est central. Il doit être **synchronisé** entre tous les clients via Firebase.

```
timerEndAt = startedAt + (duration * 60 * 1000) + totalPausedMs
```

**Pause du timer** pendant :
- Un vote est en cours (`phase: 'voting'`)
- Un joker est en cours (`phase: 'joker'`)

**Reprise** : quand le vote/joker se termine, on ajoute le temps écoulé à `totalPausedMs` et on recalcule `timerEndAt`.

### 6.2 Flow de Vote

**Accusation normale :**
```
1. Joueur A tap "X a rigolé" → sélectionne Joueur B
2. Vérifications :
   - Joueur B n'est pas déjà éliminé
   - Pas de vote en cours
   - Cooldown respecté (30s depuis dernière accusation de A)
   - Joueur A n'est pas éliminé
3. Firebase write : state/currentVote = { accuserId, accusedId, votes: { [accuserUid]: true } }
   (Le vote de l'accusateur = OUI automatiquement)
4. Si un Joker est en cours → le Joker se met en pause (state/currentJoker/paused = true)
5. Phase → "voting" (ou sous-phase si pendant un Joker)
6. Timer global pausé
7. Votants : modale "Est-ce que [Accusé] a rigolé ?" + OUI/NON
8. Accusé : modale fun "😱 On t'accuse d'avoir ri !" (attente du verdict)
9. Éliminés : voient la notification mais ne votent pas
10. Timer 15s pour voter
11. À expiration (ou tous les votants éligibles ont voté) :
    - Résolution DÉCENTRALISÉE : chaque client calcule, le premier à écrire gagne
    - Majorité OUI → carton attribué
    - Si 2ème carton jaune → rouge → éliminé → ajout à eliminationOrder
    - state/currentVote = null
    - Si Joker en pause → reprend (state/currentJoker/paused = false)
    - Phase → "playing" (ou retour "joker" si Joker en cours)
    - Timer global reprend
```

**Self-report :**
```
1. Joueur A sélectionne lui-même dans la liste
2. Modale de confirmation : "Tu t'accuses toi-même ? Carton automatique !"
3. Si confirmé → carton attribué directement (pas de vote collectif)
4. Notification à tous : "[Joueur A] s'est accusé ! 🫡"
```

### 6.3 Flow de Joker

```
1. Joueur tap "JOKER"
2. Vérifications :
   - jokersRemaining > 0 (1 seul Joker par partie)
   - Pas de vote/joker en cours
   - Joueur actif OU éliminé (les éliminés peuvent jouer leur Joker non utilisé)
3. Modal de sélection de contenu (filtré par Pro/Free selon le créateur de la room)
4. [Si scénario] Sélection des partenaires (éliminés inclus dans les partenaires possibles)
5. Firebase write : state/currentJoker = { playerId, contentId, paused: false, ... }
6. Phase → "joker"
7. Timer global pausé
8. Timer joker 3 min démarre
9. Tous les téléphones affichent "Joker en cours"
10. Le performer voit son script
11. Les partenaires (si scénario) voient leur rôle
12. ⚡ Si quelqu'un accuse pendant le Joker → le Joker se met en pause → vote → reprise
13. Fin : timer 3 min OU bouton "Terminé"
    - state/currentJoker = null
    - Phase → "playing"
    - Timer global reprend
    - jokersRemaining -= 1 pour le joueur
```

### 6.4 Rôle de l'Hôte

L'hôte est un **joueur comme les autres** pendant la partie :
- **Il joue normalement** (peut être accusé, éliminé, jouer son joker)
- **Aucun pouvoir spécial en jeu** — pas de résolution de votes, pas d'arbitrage
- **Résolution des votes décentralisée** : chaque client calcule le résultat quand le timer expire ou que tous ont voté. Le premier client à écrire le résultat dans Firebase "gagne" (les autres voient la mise à jour via listener)

**Si l'hôte quitte pendant la partie :**
- La partie **continue sans lui** (aucune dépendance au host)
- Son personnage est marqué `disconnected` comme n'importe quel joueur
- Les autres joueurs continuent normalement

**À la fin de la partie :**
- Si l'hôte est toujours là → bouton "Nouvelle Partie" ramène au lobby
- Si l'hôte a quitté → message "L'hôte a quitté la partie" + bouton "Retour à l'accueil" uniquement

### 6.5 Contenu Pro vs Free

Le gate Pro est au niveau de la **room** (pas du joueur individuel) :
- **Créateur Pro** → catalogue complet de Jokers disponible pour tous les joueurs
- **Créateur Free** → catalogue réduit (~60% des contenus)
- Les contenus sont marqués `pro: true` dans les JSON
- **Dans le lobby** : indication du nombre de jokers disponibles + badge "Débloquer plus de jokers avec Pro"

---

## 7. PLAN D'IMPLÉMENTATION

### Phase 1 — Squelette (Infra + Lobby)

- [ ] **Config** : Ajouter `lol` dans `rooms.js` avec playerSchema et state
- [ ] **Couleurs** : Ajouter dans `colors.js`
- [ ] **Firebase Rules** : Ajouter rules pour `rooms_lol`
- [ ] **Lobby** (`app/lol/room/[code]/page.jsx`) :
  - Settings hôte (durée, mode, jokers)
  - Liste joueurs
  - Tous les hooks standard (usePlayers, usePresence, usePlayerCleanup, useRoomGuard, useWakeLock)
  - Bouton Start

### Phase 2 — Jeu Principal (Play)

- [ ] **Page Play** (`app/lol/game/[code]/play/page.jsx`) :
  - Timer global synchronisé
  - Liste joueurs avec cartons
  - Bouton "X a rigolé" (sélecteur de joueurs)
  - Hooks standard (usePlayers, usePlayerCleanup, useInactivityDetection, useRoomGuard, useWakeLock)
- [ ] **Hook `useLolTimer`** : Timer avec pause/resume
- [ ] **Hook `useLolElimination`** : Gestion cartons jaunes/rouges
- [ ] **Redirections de phase** : lobby → playing → ended

### Phase 3 — Votes

- [ ] **Hook `useLolVote`** : Lancer, voter, résoudre, cooldown
- [ ] **UI Vote** : Overlay modal avec boutons OUI/NON
- [ ] **Animations** : Carton jaune/rouge qui tombe
- [ ] **Anti-spam** : Cooldown 30s par accusateur

### Phase 4 — Jokers

- [ ] **Hook `useLolJoker`** : Sélection, activation, timer, fin
- [ ] **Données** : Créer `data/lol/standup.json`, `scenes.json`, `collective.json`
- [ ] **UI Sélection** : Modal 3 onglets avec cartes de contenu
- [ ] **UI Performance** : Écran script pour le performer, écran attente pour les autres
- [ ] **Sélection partenaires** : Pour les scénarios (duo/trio/quatuor)
- [ ] **Distribution des rôles** : Chaque partenaire voit ses instructions

### Phase 5 — End + Polish

- [ ] **Page End** (`app/lol/game/[code]/end/page.jsx`) :
  - Podium/classement
  - Stats de la partie
  - Bouton nouvelle partie / retour
  - useGameCompletion
- [ ] **Animations** : Toutes les animations listées en section 5.3
- [ ] **Sons** : Intégration des effets sonores
- [ ] **Haptic** : Vibrations sur events clés

### Phase 6 — Contenu

- [ ] **Rédaction** : 12 monologues stand-up
- [ ] **Rédaction** : 8 scénarios duos
- [ ] **Rédaction** : 5 scénarios trios
- [ ] **Rédaction** : 5 jeux collectifs
- [ ] **Review** : Test de chaque contenu (lisibilité, durée, drôlerie)

### Phase 7 — Tests & Iteration

- [ ] Test complet du flow : création → lobby → jeu → votes → jokers → fin
- [ ] Test déconnexion/reconnexion
- [ ] Test avec vrais joueurs (playtest soirée)
- [ ] Ajustements UX basés sur les retours
- [ ] Performance / optimisation Firebase listeners

---

## 8. DÉCISIONS VALIDÉES

> Toutes les questions ont été tranchées (2026-03-15).

### Joueurs éliminés
- **Ne peuvent plus accuser** ni voter
- **Peuvent être recrutés** pour les jokers de groupe (scénarios, jeux collectifs)
- **Peuvent jouer leur propre Joker** post-élimination s'ils ne l'ont pas encore utilisé
- Chaque joueur n'a droit qu'à **1 seul Joker par partie** (pas configurable)

### Vote — Accusateur
- Le vote de l'accusateur **compte comme OUI automatiquement** (il a accusé, c'est logique)
- Il ne revote pas — son accusation = son vote

### Vote — Modale de l'accusé
- L'accusé **ne vote pas** sur son propre sort
- L'accusé **voit une modale fun** : "On t'accuse d'avoir ri !" (pas les boutons de vote, juste une notif plein écran avec attente du verdict)
- La modale reste affichée jusqu'au résultat du vote

### Accusation pendant un Joker
- **Oui**, on peut accuser quelqu'un pendant un Joker — c'est le but
- Le Joker **se met en pause** pendant le vote
- Le bouton "signaler" reste **toujours visible**, même pendant un Joker
- La modale de vote apparaît pour tous (sauf l'accusé qui voit sa modale dédiée)
- Même les joueurs en plein Joker (scène) peuvent signaler

### Self-report (s'accuser soi-même)
- **Oui**, un joueur peut s'accuser lui-même
- **Pas de vote collectif** — le carton est attribué automatiquement
- Modale de confirmation : "Tu t'accuses toi-même ? Carton automatique !"

### Rôle de l'hôte
- L'hôte est un **joueur comme les autres** pendant la partie
- Aucun pouvoir spécial en jeu (pas de résolution de votes côté host)
- **Si l'hôte quitte** pendant la partie → la partie **continue sans lui**
- **À la fin de la partie** → si l'hôte n'est plus là, message "L'hôte a quitté la partie" au lieu du retour lobby
- L'hôte n'a de rôle spécial que dans le **lobby** (settings, lancer la partie)

> **Impact technique** : la résolution des votes doit être **décentralisée** (chaque client calcule le résultat quand tous ont voté ou timer expiré, le premier à écrire gagne). Pas de dépendance au host.

### Image de la game card
- Prompt à créer basé sur `Prompts_complets.md` (à faire)

### Contenu Pro
- Le gate est au niveau de la **room** (créateur Pro = catalogue complet de Jokers)
- Si le créateur n'est pas Pro → catalogue réduit (ex: 60% des contenus)
- **Dans le lobby** : afficher le nombre de jokers disponibles + upsell "Débloquer plus de jokers avec le mode Pro"
- Les contenus Pro sont marqués avec un flag `pro: true` dans les JSON

### Sons & Haptic
- **Pas de sons pour l'instant** (à ajouter plus tard)
- **Vibrations** (Haptic) à implémenter dès le début :
  - Modale de vote qui arrive
  - Être accusé
  - Recevoir un carton
  - Joker activé
  - Élimination

---

*Créé le 2026-03-13 — Plan v1*
*Mis à jour le 2026-03-15 — Décisions validées*
