# Mind Link - Plan d'Implémentation

> Plan technique complet pour le développement du jeu Mind Link dans Gigglz.

---

## Stack Technique

- **Framework** : Next.js (App Router)
- **Animations** : Framer Motion (déjà installé) + SVG inline
- **Backend temps réel** : Firebase Realtime Database
- **Styling** : CSS inline + globals.css (même approche que La Règle)
- **Nouvelles dépendances** : Aucune

---

## 1. Architecture Fichiers

```
app/mindlink/
├── room/[code]/
│   └── page.jsx              # Lobby (sélection défenseurs, config)
└── game/[code]/
    ├── play/page.jsx          # Vue joueurs (attaquants)
    ├── defend/page.jsx        # Vue défenseur(s)
    └── end/page.jsx           # Résultats

components/game/
├── MindLinkNetwork.jsx        # Réseau neuronal SVG (nodes + connexions)
├── MindLinkHostView.jsx       # Vue partagée défenseur (choix mot, interception)
├── LinkOverlay.jsx            # Overlay pendant un link actif (countdown, révélation)
└── WordDisplay.jsx            # Affichage du mot défendu (lettres + underscores)

lib/config/
├── rooms.js                   # + config mindlink (prefix, schema)
└── games.js                   # Déjà fait (config card)

data/
└── mindlink-words.json        # Banque de mots aléatoires (optionnel, phase 2)
```

---

## 2. Firebase Structure

```
rooms_mindlink/{code}/
├── meta/
│   ├── code, createdAt, hostUid, expiresAt
│   ├── gameType: "mindlink"
│   ├── mode: "oral" | "ecrit"              # Mode de jeu
│   ├── timerMinutes: 5                      # Durée de la partie
│   ├── nbDefenders: 1                       # Nombre de défenseurs
│   ├── selectedDefenders: [uid1, uid2]      # UIDs des défenseurs choisis
│   ├── wordChooserUid: "uid1"               # Défenseur qui choisit le mot (random)
│   └── closed: false
│
├── state/
│   ├── phase: "lobby"|"choosing"|"playing"|"ended"
│   │
│   │   # Mot défendu
│   ├── secretWord: "PARASOL"                # Visible seulement par défenseurs
│   ├── revealedLetters: 1                   # Nombre de lettres révélées (commence à 1)
│   ├── wordLength: 7                        # Longueur du mot
│   │
│   │   # Timer
│   ├── timerEndAt: timestamp                # Quand le timer expire
│   ├── timerPaused: false
│   ├── timeLeftWhenPaused: null
│   ├── penaltySeconds: 0                    # Secondes de pénalité accumulées
│   │
│   │   # Link en cours
│   ├── activeLink: null | {
│   │     initiatorUid: "uid1",              # Qui a lancé l'indice
│   │     clue: "entrée",                    # L'indice donné
│   │     clueTimestamp: timestamp,           # Quand l'indice a été donné
│   │     phase: "clue"|"waiting"|"choosing"|"countdown"|"reveal"|"result"
│   │     candidates: { uid2: timestamp, uid3: timestamp }  # Qui veut link
│   │     chosenUid: "uid2",                 # Avec qui on link (choisi par initiator)
│   │     initiatorWord: null,               # Mot tapé par l'initiateur (mode écrit)
│   │     responderWord: null,               # Mot tapé par le répondeur (mode écrit)
│   │     defenderIntercept: null | {
│   │       defenderUid: "uid_def",
│   │       guessedWord: "porte",
│   │       confirmed: null | true | false   # Confirmé par l'initiateur
│   │     }
│   │     result: null | "match" | "no_match" | "intercepted"
│   │   }
│   │
│   │   # Historique
│   ├── linkHistory: [                       # Links passés (pour affichage)
│   │     { initiator: "Alice", responder: "Bob", clue: "entrée",
│   │       word1: "porte", word2: "porte", result: "match" }
│   │   ]
│   │
│   │   # Proposition directe du mot
│   ├── wordGuess: null | {
│   │     uid: "uid3",
│   │     guess: "PARASOL",
│   │     correct: null | true | false
│   │   }
│   │
│   │   # Fin
│   ├── winner: null | "attackers" | "defenders"
│   └── winReason: null | "guessed" | "all_letters" | "found_during_link" | "timeout"
│
├── players/{uid}/
│   ├── uid, name, role: "attacker"|"defender", joinedAt
│   ├── score: 0                             # Pour futur scoring
│   ├── status: "active"|"disconnected"|"left"
│   └── activityStatus: "active"|"inactive"
│
└── defenderReveals/                         # Log des révélations
    └── {index}: { letter: "A", revealedAt: timestamp, afterLink: "uid1-uid2" }
```

---

## 3. Phases du Jeu

### Phase 1 : `lobby`
> Identique à La Règle en termes d'UX

- Host sélectionne les défenseurs (PlayerBanner cliquables)
- Configure : mode (oral/écrit), timer, nb défenseurs
- Badge "Défenseur" sur les joueurs sélectionnés
- Bouton Start quand config valide

### Phase 2 : `choosing`
> Le(s) défenseur(s) choisissent le mot

- **Défenseurs** : écran de saisie du mot
  - Input texte libre (validé par le wordChooser)
  - Bouton "Mot aléatoire" (pioche dans la banque)
  - Affichage preview : `P _ _ _ _ _ _`
  - Bouton "Valider"
- **Joueurs** : écran d'attente avec animation du réseau qui se forme
  - Message : "Les défenseurs choisissent leur mot..."
  - Nodes des joueurs apparaissent un par un avec animation

### Phase 3 : `playing`
> Boucle de jeu principale

**Vue Joueurs (attaquants) :**
- Réseau neuronal SVG avec tous les joueurs
- Mot défendu en haut : `P A _ _ _ _ _`
- Timer visible
- Boutons :
  - **"J'ai un indice !"** → lance un link
  - **"J'ai trouvé le mot !"** → proposition directe
- Quand un link est actif : overlay avec l'indice, countdown, etc.

**Vue Défenseur(s) :**
- Même réseau neuronal (spectateur)
- Mot secret affiché en entier (pour eux)
- Timer visible
- Boutons :
  - **"J'intercepte !"** (pendant un link actif) → tape le mot deviné
  - **"Ils ont trouvé mon mot !"** → fin immédiate (joueurs gagnent)
  - **"Révéler la lettre"** / **"Ne pas révéler"** (après un link réussi)

### Phase 4 : `ended`
> Résultat

- Qui a gagné (attaquants ou défenseurs)
- Le mot secret révélé
- Raison de la victoire
- Historique des links
- Bouton retour au lobby

---

## 4. Mécanique du Link - Détail Technique

```
ÉTAT: idle
  → Joueur appuie "J'ai un indice !"
  → activeLink.phase = "clue"
  → 2s pour taper l'indice

ÉTAT: clue (2s)
  → Joueur tape son indice, valide
  → activeLink.clue = "entrée"
  → activeLink.phase = "waiting"

ÉTAT: waiting (10s)
  → Tous les joueurs voient l'indice au centre du réseau
  → N'importe qui peut appuyer "Link !" → ajouté à candidates
  → Le défenseur peut appuyer "J'intercepte !"
  → Si interception : sous-flow interception (voir ci-dessous)
  → Après 10s OU initiateur choisit :
    → Si ≥1 candidat : phase = "choosing" (si plusieurs) ou "countdown"
    → Si 0 candidat : link annulé, retour idle

ÉTAT: choosing (si plusieurs candidats)
  → Initiateur voit la liste des candidats
  → Choisit avec qui link
  → activeLink.chosenUid = uid
  → phase = "countdown"

ÉTAT: countdown (3s)
  → Animation 3, 2, 1 sur les écrans des deux joueurs
  → En mode écrit : les deux tapent leur mot (input caché)
  → À 0 : phase = "reveal"

ÉTAT: reveal
  → Mode écrit : les mots sont dévoilés simultanément
  → Mode oral : les joueurs disent à voix haute
  → phase = "result"

ÉTAT: result
  → Mode écrit : comparaison automatique (case-insensitive, accents normalisés)
  → Mode oral : le défenseur valide (boutons Oui/Non)
  → Si match → défenseur reçoit modale "Révéler lettre ?"
  → Si pas match → retour idle après 2s
  → Après décision → activeLink = null, retour idle
```

### Sous-flow Interception

```
→ Défenseur appuie "J'intercepte !"
→ Input pour taper le mot deviné
→ activeLink.defenderIntercept = { defenderUid, guessedWord }
→ Initiateur voit : "Le défenseur pense que c'est [mot]. C'est correct ?"
→ Oui → link annulé, mot banni, retour idle
→ Non → link continue normalement (phase "choosing" ou "countdown")
```

---

## 5. UI : Le Réseau Neuronal

### Approche Technique
- **SVG inline** dans un composant `MindLinkNetwork.jsx`
- **Nodes** : `motion.circle` positionnés en cercle (`cos`/`sin`)
- **Connexions** : `motion.line` entre chaque paire de nodes (dormantes, opacity faible)
- **Animations** : Framer Motion pour tout (pulse, glow, energy flow)

### Layout des Nodes

```
         [Joueur 3]
    [J2]              [J4]

  [J1]      [INDICE]     [J5]

    [J8]              [J6]
         [Joueur 7]
```

- Disposition circulaire, responsive
- Zone centrale réservée pour : indice actif, countdown, résultat
- Le défenseur est visuellement distinct (node plus grand, couleur différente, icône bouclier)

### États Visuels des Nodes

| État | Apparence |
|------|-----------|
| Idle | Pulse doux, glow subtil |
| A lancé un indice | Pulse fort, halo élargi, onde propagée |
| Veut link | Connexion vers l'initiateur s'allume |
| En link actif | Les 2 nodes brillent fort, connexion énergie |
| Défenseur intercepte | Flash rouge sur le node défenseur |
| Link réussi | Explosion particules sur la connexion |
| Link raté | Connexion s'éteint avec fade |

### Animations Connexions

- **Dormante** : ligne très fine, opacity 0.05-0.1
- **Candidate** : opacity monte, couleur accent
- **Active** : `strokeDasharray` animé (énergie qui voyage), glow
- **Succès** : burst de particules le long de la ligne
- **Échec** : ligne rougit puis fade out

### Couleur Thème Mind Link

```css
--mindlink-primary: #a855f7;     /* Violet */
--mindlink-accent: #c084fc;      /* Violet clair */
--mindlink-glow: rgba(168, 85, 247, 0.5);
--mindlink-bg: #04060f;          /* Même fond sombre que La Règle */
```

Le violet se distingue du cyan (La Règle) et du purple quiz, avec un côté "psychique/mental" adapté au thème.

---

## 6. Composants à Créer

### Nouveaux Composants

| Composant | Responsabilité |
|-----------|---------------|
| `MindLinkNetwork.jsx` | SVG réseau neuronal (nodes, connexions, animations) |
| `WordDisplay.jsx` | Mot défendu avec lettres révélées + underscores, animation reveal |
| `LinkOverlay.jsx` | Overlay pendant un link (indice, candidats, countdown, résultat) |
| `ClueInput.jsx` | Input pour donner un indice (2s timer) |
| `WordInput.jsx` | Input secret pour taper son mot (mode écrit) |
| `InterceptModal.jsx` | Modale défenseur pour intercepter |
| `RevealLetterModal.jsx` | Modale défenseur pour révéler/contester |
| `GuessWordModal.jsx` | Modale joueur pour proposer le mot directement |

### Composants Réutilisés

| Composant | Source | Usage |
|-----------|--------|-------|
| `PlayerBanner` | `components/game/` | Lobby - sélection défenseurs |
| `GameStatusBanners` | `components/game/` | Banners connexion host/joueurs |
| `DisconnectAlert` | `components/game/` | Overlay reconnexion |
| `GameLaunchCountdown` | `components/transitions/` | Countdown 3-2-1 (link) |
| `ExitButton` | `components/ui/` | Quitter la room |
| `ShareModal` | `components/ui/` | Partager le code |
| `PlayerManager` | `components/game/` | Gestion joueurs (host) |
| `GameLoader` | `components/ui/` | Loading states |

---

## 7. Hooks

### Hooks Existants (obligatoires)

Selon la matrice CLAUDE.md :
- `usePlayers` → toutes les pages
- `usePlayerCleanup` → room (lobby) + play (playing)
- `usePresence` → room
- `useInactivityDetection` → play + defend
- `useRoomGuard` → toutes les pages
- `useWakeLock` → room + play + defend
- `useGameCompletion` → end
- `useInterstitialAd` → room

### Nouveaux Hooks

| Hook | Responsabilité |
|------|---------------|
| `useMindLinkGame` | État principal du jeu : mot, lettres révélées, timer, phase |
| `useActiveLink` | Gestion du link en cours : phases, candidats, countdown, résultat |
| `useDefenderActions` | Actions défenseur : intercepter, révéler lettre, signaler mot trouvé |
| `useNetworkLayout` | Calcul positions nodes SVG (responsive, mémoïsé) |

---

## 8. Config rooms.js

```javascript
{
  id: 'mindlink',
  prefix: 'rooms_mindlink',
  path: '/mindlink/room',
  navigateBeforeCreate: false,
  playerSchema: (uid, name) => ({
    uid, name, score: 0, role: 'attacker', joinedAt: Date.now()
  }),
  createMeta: ({ code, now, hostUid }) => ({
    code, createdAt: now, hostUid,
    expiresAt: now + 12 * 60 * 60 * 1000,
    gameType: 'mindlink',
    mode: 'oral',
    timerMinutes: 5,
    nbDefenders: 1,
    selectedDefenders: [],
    wordChooserUid: null,
  }),
  createState: () => ({
    phase: 'lobby',
    secretWord: null,
    revealedLetters: 1,
    wordLength: 0,
    timerEndAt: null,
    timerPaused: false,
    timeLeftWhenPaused: null,
    penaltySeconds: 0,
    activeLink: null,
    linkHistory: [],
    wordGuess: null,
    winner: null,
    winReason: null,
  })
}
```

---

## 9. Firebase Rules — Matrice Complète

### Helpers (raccourcis utilisés dans les règles)

```
isHost      = auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()
isDefender  = root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender'
isAttacker  = root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'attacker'
isPlayer    = root.child('rooms_mindlink/'+$code+'/players/'+auth.uid).exists()
isInitiator = auth.uid == root.child('rooms_mindlink/'+$code+'/state/activeLink/initiatorUid').val()
isChosen    = auth.uid == root.child('rooms_mindlink/'+$code+'/state/activeLink/chosenUid').val()
phase       = root.child('rooms_mindlink/'+$code+'/state/phase').val()
```

### Matrice Action → Qui peut écrire

| Action | Chemin Firebase modifié | Qui peut écrire | Quand |
|--------|------------------------|-----------------|-------|
| **Créer room** | `meta/`, `state/`, `players/` | Host | Création |
| **Modifier config** | `meta/mode`, `meta/timerMinutes`, `meta/nbDefenders` | Host | phase == "lobby" |
| **Sélectionner défenseurs** | `meta/selectedDefenders` | Host | phase == "lobby" |
| **Rejoindre** | `players/{uid}` | Soi-même | phase == "lobby" |
| **Quitter** | `players/{uid}/status` | Soi-même OU Host | Toujours |
| **Démarrer la partie** | `state/phase` → "choosing", `players/*/role` | Host | phase == "lobby" |
| **Choisir le mot** | `state/secretWord`, `state/wordLength` | wordChooserUid (défenseur désigné) | phase == "choosing" |
| **Valider le mot** | `state/phase` → "playing", `state/timerEndAt` | wordChooserUid | phase == "choosing" |
| **Lancer un indice** | `state/activeLink` (create) | Tout attacker | phase == "playing", pas de link actif |
| **Soumettre l'indice** | `state/activeLink/clue`, `.phase` → "waiting" | Initiator | activeLink.phase == "clue" |
| **Demander à link** | `state/activeLink/candidates/{uid}` | Tout attacker (sauf initiator) | activeLink.phase == "waiting" |
| **Choisir un candidat** | `state/activeLink/chosenUid`, `.phase` → "countdown" | Initiator | activeLink.phase == "waiting" ou "choosing" |
| **Soumettre son mot (écrit)** | `state/activeLink/initiatorWord` | Initiator | activeLink.phase == "countdown" |
| **Soumettre son mot (écrit)** | `state/activeLink/responderWord` | Chosen | activeLink.phase == "countdown" |
| **Intercepter** | `state/activeLink/defenderIntercept` | Tout defender | activeLink.phase == "waiting" |
| **Confirmer interception** | `state/activeLink/defenderIntercept/confirmed` | Initiator | Interception en cours |
| **Valider le résultat (oral)** | `state/activeLink/result` | Tout defender | activeLink.phase == "reveal" |
| **Révéler la lettre** | `state/revealedLetters` (+1) | Tout defender | Après link match |
| **Ne pas révéler** | `state/activeLink` → null | Tout defender | Après link match |
| **Proposer le mot** | `state/wordGuess` | Tout attacker | phase == "playing", pas de link actif |
| **Valider proposition** | `state/wordGuess/correct`, `state/penaltySeconds` | Tout defender | wordGuess en cours |
| **Signaler mot trouvé** | `state/winner`, `state/winReason` | Tout defender | phase == "playing" |
| **Reset link** | `state/activeLink` → null | Host OU Initiator OU Defender | Après résultat |
| **Fermer la room** | `meta/closed` | Host | Toujours |

### Règles Firebase Complètes

```json
{
  "rooms_mindlink": {
    "$code": {
      ".read": "auth != null",

      "meta": {
        ".write": "auth.uid == data.child('hostUid').val() || (!data.exists() && auth != null)"
      },

      "state": {
        ".write": false,

        "phase": {
          ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()"
        },

        "secretWord": {
          ".read": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender' || root.child('rooms_mindlink/'+$code+'/state/phase').val() == 'ended'",
          ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/meta/wordChooserUid').val() && root.child('rooms_mindlink/'+$code+'/state/phase').val() == 'choosing'"
        },

        "wordLength": {
          ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/meta/wordChooserUid').val() && root.child('rooms_mindlink/'+$code+'/state/phase').val() == 'choosing'"
        },

        "revealedLetters": {
          ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender'"
        },

        "timerEndAt": {
          ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val() || root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender'"
        },
        "timerPaused": {
          ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()"
        },
        "timeLeftWhenPaused": {
          ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()"
        },
        "penaltySeconds": {
          ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender'"
        },

        "activeLink": {
          ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'attacker' || root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender' || auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()",

          "candidates": {
            "$uid": {
              ".write": "auth.uid == $uid && root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'attacker'"
            }
          },

          "initiatorWord": {
            ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/state/activeLink/initiatorUid').val()"
          },
          "responderWord": {
            ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/state/activeLink/chosenUid').val()"
          },

          "defenderIntercept": {
            ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender' || auth.uid == root.child('rooms_mindlink/'+$code+'/state/activeLink/initiatorUid').val()"
          }
        },

        "wordGuess": {
          ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid).exists()"
        },

        "linkHistory": {
          ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid).exists()"
        },

        "winner": {
          ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender' || auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()"
        },
        "winReason": {
          ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender' || auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()"
        }
      },

      "players": {
        "$uid": {
          ".write": "auth.uid == $uid || auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()",

          "role": {
            ".write": "auth.uid == root.child('rooms_mindlink/'+$code+'/meta/hostUid').val()"
          }
        }
      },

      "defenderReveals": {
        ".write": "root.child('rooms_mindlink/'+$code+'/players/'+auth.uid+'/role').val() == 'defender'"
      }
    }
  }
}
```

### Points Clés Sécurité

1. **Le défenseur n'est PAS forcément le host** — Les rules utilisent `players/{uid}/role == 'defender'`, jamais `hostUid` pour les actions de jeu
2. **`secretWord` est protégé en lecture** — Seuls les défenseurs et la phase ended peuvent le lire
3. **Les rôles sont assignés par le host uniquement** — `players/$uid/role` ne peut être écrit que par le host
4. **Chaque joueur ne peut écrire que ses propres mots** — `initiatorWord` vérifie `initiatorUid`, `responderWord` vérifie `chosenUid`
5. **L'interception est ouverte à tous les défenseurs** — N'importe quel défenseur peut intercepter, pas juste un
6. **La confirmation d'interception revient à l'initiateur** — Lui seul sait si le mot deviné est correct
7. **Le host garde le contrôle admin** — Fermer la room, changer de phase, pause timer

---

## 10. Plan de Développement

### Phase 1 : Fondations (Lobby + Config)
> Objectif : pouvoir créer une room, choisir les défenseurs, configurer, et lancer

1. **`lib/config/rooms.js`** — Ajouter config mindlink (prefix, schemas)
2. **`app/(main)/home/page.jsx`** — Ajouter création de room mindlink
3. **`app/mindlink/room/[code]/page.jsx`** — Lobby complet
   - Header style La Règle (couleur violet)
   - PlayerBanners avec sélection défenseurs
   - Settings : mode oral/écrit, timer, nb défenseurs
   - Bouton Start → écriture Firebase, transition vers `choosing`
4. **Firebase rules** — Règles de base pour mindlink

### Phase 2 : Choix du Mot
> Objectif : le défenseur peut choisir/saisir son mot

5. **`app/mindlink/game/[code]/defend/page.jsx`** — Phase choosing
   - Input saisie libre + bouton mot aléatoire
   - Preview `P _ _ _ _ _`
   - Validation → Firebase `state.secretWord` + `state.wordLength`
   - Transition vers `playing`
6. **`app/mindlink/game/[code]/play/page.jsx`** — Phase choosing (attente)
   - Animation réseau qui se forme
   - Message d'attente

### Phase 3 : Réseau Neuronal
> Objectif : le visuel principal du jeu

7. **`components/game/MindLinkNetwork.jsx`** — Composant SVG
   - Nodes en cercle (responsive)
   - Connexions dormantes entre tous
   - Animations idle (pulse doux)
   - Distinction visuelle défenseur
8. **`components/game/WordDisplay.jsx`** — Affichage mot
   - Lettres révélées + underscores
   - Animation de révélation par lettre
9. Intégration dans `play/page.jsx` et `defend/page.jsx`

### Phase 4 : Mécanique du Link
> Objectif : le coeur du gameplay

10. **`lib/hooks/useActiveLink.js`** — Hook gestion link
    - Machine à états : idle → clue → waiting → choosing → countdown → reveal → result
    - Écoute Firebase `state/activeLink`
    - Actions : lancer indice, link, choisir candidat
11. **`components/game/LinkOverlay.jsx`** — UI du link
    - Phase clue : input indice + timer 2s
    - Phase waiting : indice affiché, boutons link pour joueurs
    - Phase choosing : liste candidats pour initiateur
    - Phase countdown : réutilisation GameLaunchCountdown
    - Phase reveal : affichage mots (écrit) ou boutons validation (oral)
    - Phase result : match/no match avec animation
12. **`components/game/ClueInput.jsx`** — Input indice
13. **`components/game/WordInput.jsx`** — Input secret mode écrit
14. Animations réseau pendant le link (connexions qui s'allument, energy flow)

### Phase 5 : Actions Défenseur
> Objectif : interception + gestion lettres

15. **`lib/hooks/useDefenderActions.js`** — Hook actions défenseur
    - Intercepter un link
    - Révéler/ne pas révéler une lettre
    - Signaler "ils ont trouvé mon mot"
16. **`components/game/InterceptModal.jsx`** — UI interception
17. **`components/game/RevealLetterModal.jsx`** — UI révélation
18. Intégration dans `defend/page.jsx`

### Phase 6 : Proposition Directe + Timer
> Objectif : les joueurs peuvent proposer le mot, le timer fonctionne

19. **`components/game/GuessWordModal.jsx`** — Modale proposition
    - Input mot + confirmation
    - Pénalité 30s si incorrect
20. **`lib/hooks/useMindLinkGame.js`** — Hook état global
    - Timer avec pénalités
    - Détection fin de partie (timeout, mot trouvé, toutes lettres)
    - Transition vers `ended`
21. Intégration timer dans toutes les vues

### Phase 7 : Écran de Fin
> Objectif : résultats et retour lobby

22. **`app/mindlink/game/[code]/end/page.jsx`** — Page résultats
    - Vainqueur (attaquants/défenseurs)
    - Mot secret révélé
    - Raison victoire
    - Historique des links
    - Bouton retour lobby / nouvelle partie

### Phase 8 : Polish
> Objectif : finitions, edge cases, UX

23. Animations réseau avancées (particules, energy bursts)
24. Sons (buzz link, succès, échec, reveal lettre)
25. Gestion edge cases (déconnexion pendant link, link timeout)
26. Banque de mots aléatoires (`data/mindlink-words.json`)
27. Tests complets multi-joueurs

---

## 11. Priorités & Dépendances

```
Phase 1 (Lobby) ──→ Phase 2 (Choix mot) ──→ Phase 3 (Réseau) ──→ Phase 4 (Link)
                                                                       │
                                                          Phase 5 (Défenseur) ──→ Phase 6 (Guess + Timer)
                                                                                        │
                                                                                   Phase 7 (Fin)
                                                                                        │
                                                                                   Phase 8 (Polish)
```

Les phases 3 (réseau) et 4 (link) peuvent être développées en parallèle partiellement : le réseau peut commencer avec des nodes statiques pendant que la logique link avance.

---

*Dernière mise à jour : 2026-03-13*
