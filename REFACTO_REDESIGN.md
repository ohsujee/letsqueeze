# Refacto × Redesign — Guide Complet

> Document de référence pour appliquer le style flat cartoon et les principes de refacto à l'ensemble de l'app Gigglz. Basé sur le travail fait sur le Quiz Buzzer (branche `refacto/tier1`, 48 commits).

---

## 1. DESIGN SYSTEM — Style Flat Cartoon

### Principes fondamentaux

| Règle | Faire | Ne pas faire |
|-------|-------|-------------|
| **Profondeur** | `border-bottom: 3-5px solid <couleur-sombre>` | `box-shadow` glow, `filter: drop-shadow` |
| **Fonds** | Couleurs solides (`#0e0e1a`, `#1a1a2e`, `#222240`) | `rgba()`, `backdrop-filter: blur()`, gradients |
| **Texte** | Couleur solide, pas d'effet | `text-shadow`, `glow` |
| **Boutons** | Fond solide + `border-bottom` 3D | Gradients, pulse animations, `box-shadow` glow |
| **Cards** | `background: var(--flat-bg)` + `border-bottom` | `backdrop-filter`, `border: 1px solid rgba(...)` |
| **Hover** | `transform: translateY(2px)` + réduction border-bottom | `scale()`, `box-shadow` qui grossit |
| **Active (press)** | `translateY(2px)` + `border-bottom-width: 1px` | Glow, pulse |
| **Animations** | `transition: 200ms ease` sur background/border | Keyframes breathing, flash, pulse |
| **Icônes** | Phosphor Icons (`@phosphor-icons/react`) | lucide-react, SVG inline, emojis comme icônes UI |

### Palette de couleurs par jeu

```
Quiz:      #8b5cf6 (violet)     Alibi:     #f59e0b (orange)
BlindTest: #A238FF (magenta)    La Règle:  #06b6d4 (cyan)
MindLink:  #ec4899 (rose)       LOL:       #EF4444 (rouge)
Mime:      #34d399 (vert)       Imposteur: #f97316 (orange foncé)
```

### Variables CSS dynamiques

Chaque page applique `style={getFlatCSSVars('quiz')}` sur le conteneur racine :

```css
--game-color       /* Couleur primaire du jeu */
--game-secondary   /* Couleur secondaire (boutons actifs) */
--game-dark        /* Version sombre (border-bottom 3D) */
--flat-bg          /* Fond des cards (#2d1f5e pour quiz) */
--flat-bg-dark     /* Border-bottom des cards */
--flat-bg-light    /* Fond des éléments secondaires */
--flat-accent      /* Boutons d'action */
--flat-accent-dark /* Border-bottom des boutons */
--flat-text        /* Texte principal sur fond coloré */
--flat-muted       /* Texte secondaire */
```

### Couleurs fixes (indépendantes du jeu)

```css
#0e0e1a   /* Background page */
#1a1a2e   /* Header, modals */
#13132a   /* Border-bottom header */
#222240   /* Rows, toggles, éléments neutres */
#1a1a35   /* Border-bottom rows */
#3a3a58   /* Badges score, rank */
#2a2a45   /* Border-bottom badges */
#6b6b8a   /* Texte muted */
#8a8aa0   /* Labels uppercase */
```

### Podium & Classement

```css
/* Gold (1er) */   bg: #FFD233  border: #CC9600  text: #5C3D00
/* Silver (2e) */  bg: #C8D6E5  border: #8E9BAD  text: #2C3E50
/* Bronze (3e) */  bg: #E8945A  border: #A05A2E  text: #4A2000
```

### Typographie

| Usage | Font | Exemple |
|-------|------|---------|
| Titres, noms joueurs, scores | `Bungee` | Classement, podium, countdown |
| Labels, boutons, UI | `Space Grotesk` (700) | Toggles, badges, sous-titres |
| Scores mono | `Roboto Mono` (700) | Points dans le leaderboard |
| Corps de texte | `Inter` | Descriptions, messages |

### Éléments sur fond coloré (équipes, rows colorées)

Quand le fond est une couleur d'équipe, tous les sous-éléments utilisent :
```css
background: rgba(0, 0, 0, 0.2);       /* badges, scores */
border-bottom: 2px solid rgba(0, 0, 0, 0.15);  /* 3D */
color: #fff;                           /* texte */
```

Le `border-bottom` de la row elle-même utilise :
```css
border-bottom-color: color-mix(in srgb, <team-color> 70%, black);
```

---

## 2. ARCHITECTURE CSS

### Hiérarchie des fichiers

```
components/game/lobby-base.css     ← Universel (tous les lobbies importent)
app/{jeu}/room/[code]/{jeu}-lobby.css  ← Spécifique au jeu (settings, selector)
app/{jeu}/game/[code]/play/{jeu}-play.css  ← Vue play
app/end/[code]/end.css             ← Écran de fin (réutilisable)
components/game/{Composant}.css    ← Composants partagés
```

### Règle d'import

Chaque lobby importe dans cet ordre :
```jsx
import '@/components/game/lobby-base.css';   // 1. Base universelle
import './{jeu}-lobby.css';                   // 2. Spécifique au jeu
import './{jeu}-theme.css';                   // 3. Thème couleur (si séparé)
```

### Nommage des classes

| Scope | Préfixe | Exemple |
|-------|---------|---------|
| Lobby universel | `.lobby-*` | `.lobby-container`, `.lobby-main` |
| Quiz spécifique | `.quiz-*` | `.quiz-selector-row`, `.quiz-mode-btn` |
| Blindtest spécifique | `.deeztest-*` | `.deeztest .lobby-container::before` |
| Composant partagé | Pas de préfixe ou nom composant | `.player-row`, `.team-flat-row` |
| CSS Module | Auto-scopé | `styles.button`, `styles.podium` |

---

## 3. COMPOSANTS PARTAGÉS

### Composants réutilisables par tous les jeux

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `Leaderboard` | `components/game/Leaderboard.jsx` | Classement live + end screen. Props: `players`, `mode`, `teams`, `currentPlayerUid`, `rankOffset` |
| `GamePlayHeader` | `components/game/GamePlayHeader.jsx` | Header play/host. Props: `game`, `progress`, `title`, `score`, `teamName` |
| `HostActionFooter` | `components/game/HostActionFooter.jsx` | Boutons Passer/Fin avec ConfirmModal |
| `BuzzValidationModal` | `components/game/BuzzValidationModal.jsx` | Modal buzz (correct/faux). Props: `playerName`, `answerValue`, `onCorrect`, `onWrong` |
| `Buzzer` | `components/game/Buzzer/index.jsx` | Buzzer 3D. Props: `roomCode`, `roomPrefix`, `playerUid`, `teamColor` |
| `AskerTransition` | `components/game/AskerTransition.jsx` | Transition Party Mode entre askers |
| `GameLaunchCountdown` | `components/transitions/GameLaunchCountdown.jsx` | Countdown 3-2-1-GO avant le jeu |
| `GameEndTransition` | `components/transitions/GameEndTransition.jsx` | Transition vers l'écran de fin |
| `EndScreenFooter` | `components/transitions/EndScreenFooter.jsx` | Bouton "Nouvelle partie" / "Retour" |
| `TeamCard` | `components/game/TeamCard.jsx` | Card d'équipe avec noms éditables |
| `TeamNameEditor` | `components/game/TeamNameEditor.jsx` | Éditeur inline de nom d'équipe |
| `PlayerBanner` | `components/game/PlayerBanner.jsx` | Banner joueur avec avatar + sticky rôle |
| `PlayerManager` | `components/game/PlayerManager.jsx` | Gestion joueurs (host). Exporte aussi `PlayerList` |
| `LobbySettings` | `components/game/LobbySettings.jsx` | Modal settings (utilise `PlayerList`) |
| `ShareModal` | `lib/components/ShareModal.jsx` | QR code + copie lien. Badge "CODE : XXXX" intégré |
| `PodiumPremium` | `components/ui/PodiumPremium.jsx` | Podium 3D flat (solo + équipes) |
| `ConfirmModal` | Exporté depuis `HostActionFooter.jsx` | Modal de confirmation réutilisable |
| `QuizSelectorModal` | `components/ui/QuizSelectorModal.jsx` | Sélection catégorie + thèmes |

### Configs centralisées

| Fichier | Exports | Usage |
|---------|---------|-------|
| `lib/config/colors.js` | `GAME_COLORS`, `getFlatCSSVars()`, `GAME_LABELS`, `GAME_COLOR_MAP` | Couleurs, variables CSS, labels affichage |
| `lib/utils/colorUtils.js` | `darkenColor()`, `getColorBrightness()` | Manipulation couleurs (jamais dupliquer en local) |
| `lib/utils/ranking.js` | `rankWithTies()` | Classement avec ex-aequo (clamp ≥ 0) |

---

## 4. PATTERNS APPLIQUÉS AU QUIZ (à reproduire)

### Lobby

**Structure JSX :**
```jsx
<div className="quiz-lobby game-page" style={getFlatCSSVars('quiz')}>
  <LobbyHeader ... />           {/* Header universel */}
  <main className="quiz-lobby-main">
    {isHost ? <HostView /> : <PlayerView />}
  </main>
  <footer className="quiz-lobby-footer">
    {isHost ? <LobbyStartButton /> : <PlayerFooter />}
  </footer>
</div>
```

**Host view** = settings panel (selector + mode toggle + team count) + player section
**Player view** = info card + team view ou player list

### Play (vue joueur)

```jsx
<div className="player-game-page game-page" style={getFlatCSSVars('quiz')}>
  <GamePlayHeader game="quiz" progress="3/10" title="Culture G." score={120} />
  <main className="quiz-play-main">
    <StatusCard />       {/* "X lit la question..." ou "🔔 Buzz de Alice" */}
    <Leaderboard />
  </main>
  <footer>
    <Buzzer teamColor={teamColor} />
  </footer>
</div>
```

### End screen

**Mode solo :**
```jsx
<HeaderBadge quizTitle="Culture G." sticker="Quiz" />
<PodiumPremium topPlayers={podiumPlayers} />
<Leaderboard players={remainingPlayers} rankOffset={3} />
```

**Mode équipes :**
```jsx
<HeaderBadge quizTitle="Culture G." sticker="Quiz" />
<TeamRanking teams={rankedTeams} />   {/* Rows colorées, winner gold outline */}
<Leaderboard players={players} teams={meta.teams} />  {/* Joueurs team-colored */}
```

Le sticker utilise `GAME_LABELS[gameType]` pour être dynamique.

### Modals et transitions

**BuzzValidationModal** — format compact :
- Ligne 1 : "🔔 BUZZ DE" (petit label uppercase)
- Ligne 2 : Nom du joueur (gros Bungee)
- Réponse (card verte)
- Boutons Faux (rouge) / Correct (vert) — 64px min-height, icônes chunky

**Notifications joueur** (même format) :
- "🔔 BUZZ DE" + nom en Bungee sur la status card

**Transitions** — toutes flat :
- Fond solide (couleur du jeu ou couleur d'équipe)
- Texte blanc, pas de text-shadow
- Progress bar épaisse (12px)
- Vibrations aux moments clés

---

## 5. SCORING — Architecture fiable

### Écriture (host-side)

```
validate() → 1 seul update() atomique :
  - players/{uid}/score = increment(100)
  - teams/{teamId}/score = increment(100)  (si équipes)
  - state/currentIndex++, lockUid=null, buzz=null

wrong() → 1 seul update() atomique :
  - players/{uid}/score = increment(-25)
  - teams/{teamId}/score = increment(-25)  (si équipes)
  - players/{uid}/blockedUntil = until
  - state/lockUid=null, buzz=null
```

**Règle absolue :** jamais de `runTransaction` séparé pour les scores. Tout dans un seul `update()`.

### Affichage (player-side)

Le score est clampé à 0 partout côté affichage :
```js
Math.max(0, player.score || 0)
```

Appliqué dans : `Leaderboard.jsx` (sorted + teamsArray), `rankWithTies()`, `GamePlayHeader` (score prop).

### Système de buzz

1. Joueur buzz → `adjustedTime = Date.now() + serverOffset`
2. Écrit dans `pendingBuzzes/{uid}`
3. Host attend 150ms (fenêtre de compensation latence)
4. Host trie par `adjustedTime`, donne le lock au plus rapide
5. `lockUid` = gagnant → les autres voient "blocked"

---

## 6. CHECKLIST — Appliquer à un nouveau jeu/écran

### Lobby

- [ ] Importer `@/components/game/lobby-base.css` en premier
- [ ] Appliquer `style={getFlatCSSVars(gameType)}` sur le conteneur
- [ ] Utiliser `LobbyHeader` (exit, share code badge, player manager)
- [ ] Settings dans un panel flat (`var(--flat-bg)` + `border-bottom`)
- [ ] Bouton start : `LobbyStartButton` avec `gameColor`
- [ ] Footer fixe : `padding: 12px 16px`

### Play

- [ ] `GamePlayHeader` avec `game`, `progress`, `score`
- [ ] Status card pour les messages ("X lit la question...")
- [ ] `Leaderboard` avec `players`, `mode`, `teams`
- [ ] Buzzer avec `teamColor` si mode équipes
- [ ] `DisconnectAlert` + `GameStatusBanners`
- [ ] `getFlatCSSVars(gameType)` sur le conteneur

### End screen

- [ ] Header badge avec sticker `GAME_LABELS[gameType]`
- [ ] Mode solo : `PodiumPremium` + `Leaderboard` (hors podium, `rankOffset`)
- [ ] Mode équipes : `TeamRanking` (rows colorées) + `Leaderboard` (tous joueurs, team-colored)
- [ ] `EndScreenFooter` avec actions (nouvelle partie, retour lobby, retour accueil)
- [ ] `useGameCompletion` pour comptage parties
- [ ] Snapshot players au premier load (éviter changement classement si joueurs quittent)

### Transitions

- [ ] `GameLaunchCountdown` avec `gameColor`
- [ ] `GameEndTransition` avec icône Phosphor du jeu
- [ ] `AskerTransition` si Party Mode supporté
- [ ] Vibrations : countdown (40ms), GO (100-50-100ms), buzz success (100-50-150ms)

### Nettoyage

- [ ] Zéro `rgba()` sur les fonds principaux → couleurs solides
- [ ] Zéro `backdrop-filter` / `blur()`
- [ ] Zéro `box-shadow` glow → `border-bottom` 3D
- [ ] Zéro `text-shadow`
- [ ] Zéro gradient sur boutons/cards → couleurs solides
- [ ] Zéro lucide-react → Phosphor
- [ ] Zéro `<style jsx>` → fichier CSS externe
- [ ] Zéro inline styles massifs → fichier CSS
- [ ] Zéro fonction utilitaire locale dupliquée → import partagé

---

## 7. TIPS POUR LES ÉCRANS NON-JEU

### Accueil (`app/(main)/home`)

- Appliquer les mêmes cards flat (fond solide + border-bottom 3D)
- Game cards : fond couleur du jeu, texte blanc, border-bottom `color-mix(70%, black)`
- Badges Pro : garder le shimmer gold (c'est le seul élément qui a droit au glow)
- Navigation bottom : fond `#1a1a2e`, border-top `#13132a`

### Profil

- Cards d'info : `#1a1a2e` + `border-bottom: 3px solid #13132a`
- Stats : barres de couleur solides, pas de gradients
- Boutons : couleurs franches + border-bottom 3D

### Modals (paywall, settings, etc.)

- Fond modal : `#1a1a2e`
- Border-bottom : `4px solid #13132a`
- Backdrop : `rgb(8, 8, 15, 0.92)` (solide, pas de blur)
- Handle de drag : `#3a3a58`, 40×4px, border-radius 2px
- Boutons d'action : hauteur minimum 48px, border-bottom 4px

### Onboarding

- Slides sur fond solide couleur
- Mascotte Giggly sur fond contrasté
- Boutons "Suivant" : large, coloré, border-bottom 5px
- Pas de gradient, pas de glass

---

## 8. FICHIERS CLÉS À CONNAÎTRE

```
lib/config/colors.js          ← GAME_COLORS, getFlatCSSVars(), GAME_LABELS
lib/utils/colorUtils.js       ← darkenColor(), getColorBrightness()
lib/utils/ranking.js          ← rankWithTies() (clamp ≥ 0)
components/game/lobby-base.css ← CSS universel des lobbies
components/game/Leaderboard.*  ← Classement avec carousel teams/players
components/game/Buzzer/*       ← Buzzer 3D cartoon (CSS Module)
components/transitions/*       ← Countdown, EndTransition, EndFooter
```

---

*Dernière mise à jour : 2026-04-06 — Post Quiz Buzzer refacto complet*
