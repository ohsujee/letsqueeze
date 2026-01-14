# NOUVELLE INTERFACE - Design Bible & Roadmap

> **Document de référence** pour la refonte visuelle de LetsQueeze/Gigglz.
> Aucune fonctionnalité ne doit être cassée. Changements **visuels uniquement**.

---

## Table des Matières

1. [Vision & Positionnement](#1-vision--positionnement)
2. [Système de Design](#2-système-de-design)
3. [Composants Unifiés](#3-composants-unifiés)
4. [Spécifications par Page](#4-spécifications-par-page)
5. [Animations & Interactions](#5-animations--interactions)
6. [Roadmap d'Implémentation](#6-roadmap-dimplémentation)
7. [Règles & Interdits](#7-règles--interdits)

---

## 1. Vision & Positionnement

### 1.1 Problèmes Actuels

| Problème | Impact |
|----------|--------|
| Esthétique "clone Kahoot" | Pas de différenciation, perception cheap |
| Fonts génériques (Inter, Space Grotesk) | Signal "template AI" |
| Sur-décoration systématique | Fatigue visuelle, interface chargée |
| Incohérences entre jeux | Expérience fragmentée |
| Glassmorphism + glow partout | Effet "too much", manque de respiration |

### 1.2 Nouvelle Direction

**Positionnement : "Party Game Premium"**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Fun & Énergique    ←────────→    Premium & Épuré  │
│                                                     │
│              ★ GIGGLZ SE POSITIONNE ICI ★          │
│                                                     │
│   Kahoot/Quizizz                        Apps luxury │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Mots-clés :** Convivial • Moderne • Qualité • Fun maîtrisé

### 1.3 Principes Directeurs

1. **Un effet, pas cinq** — Chaque élément a UN traitement visuel, pas une accumulation
2. **Respiration** — Plus de negative space, moins de densité
3. **Cohérence game-agnostique** — Même structure, couleur variable
4. **Hiérarchie claire** — On sait immédiatement où regarder
5. **Touch-first** — Conçu pour mobile, adapté desktop

---

## 2. Système de Design

### 2.1 Typographie

#### Nouvelle Stack Typographique

| Usage | Ancienne Font | Nouvelle Font | Justification |
|-------|---------------|---------------|---------------|
| Titres | Bungee | **Clash Display** ou **Satoshi Black** | Plus moderne, moins arcade |
| UI/Boutons | Space Grotesk | **Geist** ou **Manrope** | Distinctive mais lisible |
| Corps | Inter | **Geist** (même famille) | Cohérence, moins générique |
| Mono | Roboto Mono | **JetBrains Mono** | Meilleure lisibilité codes |

#### Échelle Typographique

```css
/* Titres - Clash Display */
--font-title: 'Clash Display', sans-serif;

/* UI - Geist */
--font-display: 'Geist', sans-serif;
--font-body: 'Geist', sans-serif;

/* Mono - JetBrains Mono */
--font-mono: 'JetBrains Mono', monospace;

/* Tailles (inchangées mais mieux utilisées) */
--text-xs: 0.75rem;    /* 12px - Labels, badges */
--text-sm: 0.875rem;   /* 14px - Body small */
--text-base: 1rem;     /* 16px - Body */
--text-lg: 1.125rem;   /* 18px - Body large */
--text-xl: 1.25rem;    /* 20px - Subtitles */
--text-2xl: 1.5rem;    /* 24px - Section headers */
--text-3xl: 1.875rem;  /* 30px - Page titles */
--text-4xl: 2.25rem;   /* 36px - Hero titles */
```

#### Règles Typographiques

- **Titres** : Clash Display, weight 600-700, uppercase UNIQUEMENT pour les titres de page
- **Boutons** : Geist, weight 600, sentence case (pas uppercase)
- **Labels** : Geist, weight 500, sentence case
- **Corps** : Geist, weight 400, line-height 1.5

### 2.2 Couleurs

#### Palette de Base (Dark Mode Only)

```css
/* Backgrounds - Plus de profondeur */
--bg-deep: #050508;        /* Fond le plus profond */
--bg-primary: #0a0a0f;     /* Fond principal */
--bg-secondary: #111116;   /* Cards, sections */
--bg-tertiary: #18181f;    /* Éléments surélevés */
--bg-elevated: #1f1f28;    /* Modals, popovers */

/* Text - Hiérarchie claire */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.72);
--text-tertiary: rgba(255, 255, 255, 0.48);
--text-disabled: rgba(255, 255, 255, 0.32);

/* Borders - Subtils */
--border-subtle: rgba(255, 255, 255, 0.06);
--border-default: rgba(255, 255, 255, 0.10);
--border-strong: rgba(255, 255, 255, 0.16);
```

#### Couleurs par Jeu

Chaque jeu a UNE couleur primaire et UNE couleur de glow (plus légère).

```css
/* Quiz - Purple */
--quiz-primary: #8b5cf6;
--quiz-light: #a78bfa;
--quiz-glow: rgba(139, 92, 246, 0.24);

/* BlindTest - Emerald */
--blindtest-primary: #10b981;
--blindtest-light: #34d399;
--blindtest-glow: rgba(16, 185, 129, 0.24);

/* DeezTest - Fuchsia */
--deeztest-primary: #d946ef;
--deeztest-light: #e879f9;
--deeztest-glow: rgba(217, 70, 239, 0.24);

/* Alibi - Amber */
--alibi-primary: #f59e0b;
--alibi-light: #fbbf24;
--alibi-glow: rgba(245, 158, 11, 0.24);

/* Mime - Lime */
--mime-primary: #84cc16;
--mime-light: #a3e635;
--mime-glow: rgba(132, 204, 22, 0.24);

/* TrouveRegle - Cyan */
--trouveregle-primary: #06b6d4;
--trouveregle-light: #22d3ee;
--trouveregle-glow: rgba(6, 182, 212, 0.24);
```

#### Couleurs Sémantiques

```css
/* Status */
--success: #22c55e;
--error: #ef4444;
--warning: #f59e0b;
--info: #3b82f6;

/* Interactive */
--interactive: #6366f1;    /* Links, focus rings */
--interactive-hover: #818cf8;
```

### 2.3 Spacing & Layout

#### Grille 8pt (Inchangée)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

#### Layout Structure

```
┌─────────────────────────────────────┐
│  HEADER (56px fixe)                 │  ← Compact, essentiel
├─────────────────────────────────────┤
│                                     │
│  CONTENT (flex: 1)                  │  ← Prend l'espace restant
│                                     │
├─────────────────────────────────────┤
│  FOOTER (variable, max 80px)        │  ← Actions principales
└─────────────────────────────────────┘
```

### 2.4 Border Radius

```css
/* Système simplifié */
--radius-sm: 6px;      /* Petits éléments (badges, chips) */
--radius-md: 10px;     /* Boutons, inputs */
--radius-lg: 14px;     /* Cards */
--radius-xl: 20px;     /* Modals, grandes surfaces */
--radius-full: 9999px; /* Pills, avatars */
```

### 2.5 Shadows

#### Nouveau Système (Simplifié)

```css
/* Shadows de base - PAS DE GLOW par défaut */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.4);
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.4);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.4);
--shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.5);

/* Glow UNIQUEMENT pour états actifs/focus */
--glow-quiz: 0 0 0 3px var(--quiz-glow);
--glow-blindtest: 0 0 0 3px var(--blindtest-glow);
/* ... etc par jeu */
```

#### Règle d'Or

> **Shadow OU Glow, jamais les deux.**
> - État normal : shadow-sm ou shadow-md
> - État actif/focus : glow (remplace le shadow)

---

## 3. Composants Unifiés

### 3.1 Boutons

#### Structure de Base

```css
.btn {
  /* Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  /* Sizing */
  height: 44px;              /* Touch target minimum */
  padding: 0 var(--space-5);

  /* Typography */
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;

  /* Visual */
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;

  /* Transitions */
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn:hover {
  transform: translateY(-1px);  /* Subtil, pas -2px */
}

.btn:active {
  transform: translateY(0) scale(0.98);
}
```

#### Variantes

```css
/* Primary - Couleur du jeu en cours */
.btn-primary {
  background: var(--game-primary);  /* Variable dynamique */
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover {
  box-shadow: var(--shadow-md);
}

/* Secondary - Glassmorphism léger */
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.10);
  border-color: var(--border-strong);
}

/* Ghost - Transparent */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

/* Danger */
.btn-danger {
  background: var(--error);
  color: white;
}
```

#### Tailles

```css
.btn-sm { height: 36px; padding: 0 var(--space-4); font-size: var(--text-xs); }
.btn-md { height: 44px; padding: 0 var(--space-5); font-size: var(--text-sm); }
.btn-lg { height: 52px; padding: 0 var(--space-6); font-size: var(--text-base); }
```

### 3.2 Cards

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);

  /* PAS de backdrop-filter par défaut */
  /* PAS de box-shadow par défaut */
}

.card-elevated {
  background: var(--bg-tertiary);
  box-shadow: var(--shadow-md);
}

.card-interactive {
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.card-interactive:hover {
  transform: translateY(-2px);
  border-color: var(--border-default);
}
```

### 3.3 Header Unifié

Structure identique pour TOUS les jeux :

```
┌─────────────────────────────────────────────────────────┐
│  ← Exit    │  TITRE DU JEU • ABC123    │  ⚙️ 👥 📤     │
└─────────────────────────────────────────────────────────┘
     │                    │                      │
     │                    │                      └─ Actions (settings, share)
     │                    └─ Titre + Code room
     └─ Retour
```

```css
.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-subtle);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
```

### 3.4 Leaderboard Unifié

```css
.leaderboard {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.leaderboard-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  gap: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.leaderboard-item:last-child {
  border-bottom: none;
}

.leaderboard-item--me {
  background: rgba(var(--game-primary-rgb), 0.08);
}

.leaderboard-item--disconnected {
  opacity: 0.5;
}

.leaderboard-item--inactive {
  opacity: 0.7;
}
```

### 3.5 Modals

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);  /* Léger blur, pas 20px */
  z-index: var(--z-modal-backdrop);
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - var(--space-8));
  max-width: 400px;
  max-height: calc(100vh - var(--space-16));

  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);

  overflow: hidden;
  z-index: var(--z-modal);
}

.modal-header {
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
}

.modal-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
```

### 3.6 Inputs

```css
.input {
  height: 44px;
  padding: 0 var(--space-4);

  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);

  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-primary);

  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--game-primary);
  box-shadow: var(--glow-game);  /* Glow couleur du jeu */
}

.input::placeholder {
  color: var(--text-tertiary);
}
```

### 3.7 Buzzer (Quiz)

```css
.buzzer {
  width: 100%;
  height: 72px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;

  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

/* États */
.buzzer--active {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: var(--shadow-md);
}

.buzzer--pending {
  background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
  color: var(--bg-primary);
  box-shadow: var(--shadow-md);
}

.buzzer--success {
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.3);
}

.buzzer--blocked {
  background: var(--bg-tertiary);
  color: var(--text-disabled);
  cursor: not-allowed;
}

.buzzer--penalty {
  background: linear-gradient(180deg, #f97316 0%, #ea580c 100%);
  color: white;
}

.buzzer:active:not(:disabled) {
  transform: scale(0.97);
}
```

---

## 4. Spécifications par Page

### 4.1 Pages Globales

#### `/splash` - Splash Screen

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│          [Logo Animé]               │
│                                     │
│         "GIGGLZ"                    │
│                                     │
│          ● ● ●                      │
│                                     │
└─────────────────────────────────────┘
```

**Changements :**
- Logo : Animation subtile (scale + opacity), pas de rotation excessive
- Fond : Gradient radial très subtil depuis le centre
- Dots : Animation staggered simple
- Durée : 2s max

#### `/onboarding` - Onboarding

```
┌─────────────────────────────────────┐
│                                     │
│      [Illustration/Icon]            │
│                                     │
│     Titre de l'étape                │
│     Description courte              │
│                                     │
│     ● ○ ○ ○                         │
│                                     │
│        [Continuer]                  │
│        [Passer]                     │
└─────────────────────────────────────┘
```

**Changements :**
- Cards de contenu : Pas de glassmorphism, fond solide
- Illustrations : Style flat/moderne (pas de 3D cheap)
- Boutons : btn-primary + btn-ghost

#### `/login` - Connexion

```
┌─────────────────────────────────────┐
│                                     │
│          [Logo]                     │
│                                     │
│     Connecte-toi pour jouer         │
│                                     │
│    ┌───────────────────────┐        │
│    │  G  Continuer avec Google │    │
│    └───────────────────────┘        │
│                                     │
│    ┌───────────────────────┐        │
│    │     Continuer avec Apple  │    │
│    └───────────────────────┘        │
│                                     │
│        Jouer en invité →            │
│                                     │
└─────────────────────────────────────┘
```

**Changements :**
- Boutons OAuth : Fond blanc, texte noir, icône provider
- Bouton invité : btn-ghost, discret

#### `/home` - Accueil

```
┌─────────────────────────────────────┐
│  GIGGLZ                    [Avatar] │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │  Quiz   │  │ Blind   │          │
│  │   🎯    │  │ Test 🎵 │          │
│  └─────────┘  └─────────┘          │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ DeezTest│  │  Alibi  │          │
│  │   💜    │  │   🔍    │          │
│  └─────────┘  └─────────┘          │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │  Mime   │  │ Trouve  │          │
│  │   🎭    │  │ Règle 🧩│          │
│  └─────────┘  └─────────┘          │
│                                     │
├─────────────────────────────────────┤
│  [Home]  [Profil]  [Settings]       │
└─────────────────────────────────────┘
```

**Changements :**
- Header : Simplifié, logo + avatar seulement
- Game cards :
  - Fond solide (couleur du jeu à 10% opacité)
  - Pas de gradient
  - Emoji centré, titre en dessous
  - Border subtle, hover = border plus visible
- Grid : 2 colonnes, gap 12px
- Bottom nav : Icons only, label en dessous

### 4.2 Pages Lobby

#### Structure Commune

```
┌─────────────────────────────────────┐
│ ← │ [Emoji] LOBBY • ABC123 │ ⚙️ 📤 │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Joueurs (4/8)              │    │
│  ├─────────────────────────────┤    │
│  │  👤 Alice (Host)            │    │
│  │  👤 Bob                      │    │
│  │  👤 Charlie                  │    │
│  │  👤 David                    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  [Configuration spécifique] │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│        [COMMENCER]                  │
└─────────────────────────────────────┘
```

**Changements par rapport à l'actuel :**
- Header : 56px, structure fixe
- Cards joueurs/config : Fond bg-secondary, pas de glassmorphism
- Bouton start : btn-primary, couleur du jeu, PLEINE LARGEUR
- Padding : 16px horizontal

#### `/room/[code]` - Quiz

Configuration spécifique :
- Sélecteur de quiz (modal)
- Mode : Individuel / Équipes
- Nombre de questions

#### `/blindtest/room/[code]` - BlindTest

Configuration spécifique :
- Connexion Spotify (si pas connecté)
- Sélecteur de playlist
- Difficulté (durée snippets)

#### `/deeztest/room/[code]` - DeezTest

Configuration spécifique :
- Recherche playlist Deezer
- Playlists suggérées
- Nombre de tracks

#### `/alibi/room/[code]` - Alibi

Configuration spécifique :
- Sélection alibi
- Attribution rôles (inspecteurs/suspects)

#### `/trouveregle/room/[code]` - TrouveRegle

Configuration spécifique :
- Mode (même pièce / à distance)
- Durée timer
- Attribution investigateurs

### 4.3 Pages de Jeu

#### Structure Commune

```
┌─────────────────────────────────────┐
│ ← │ Q3/10        │ Score: 250      │  ← Header compact
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │     [Contenu Principal]     │    │  ← Zone principale
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     [Leaderboard/Info]      │    │  ← Zone secondaire
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  [Action Principale]                │  ← Footer action
└─────────────────────────────────────┘
```

#### `/game/[code]/play` - Quiz Player

```
┌─────────────────────────────────────┐
│ ← │ Q3/10   │ 🏆 4ème • 145 pts    │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │      85 points              │    │
│  │                             │    │
│  │  "Quel est le plus grand    │    │
│  │   océan du monde ?"         │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🥇 Alice      250          │    │
│  │  🥈 Bob        180          │    │
│  │  🥉 Charlie    150          │    │
│  │  4  Moi        145 ←        │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│         [ BUZZ ]                    │
└─────────────────────────────────────┘
```

**Changements :**
- Question card : Fond bg-secondary, pas de glow permanent
- Points : Affichage simple, pas de barre de progression
- Buzzer : Voir section composants, plus compact (72px au lieu de 100+)

#### `/game/[code]/host` - Quiz Host

```
┌─────────────────────────────────────┐
│ ← │ Q3/10   │ 5/8 joueurs actifs   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │      85 points              │    │
│  │                             │    │
│  │  "Quel est le plus grand    │    │
│  │   océan du monde ?"         │    │
│  │                             │    │
│  │  Réponse: Pacifique         │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  [Leaderboard compact]      │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│ [Révéler] [Reset] [Passer] [Fin]   │
└─────────────────────────────────────┘
```

**Changements :**
- Boutons footer : Icons + labels, disposition horizontale égale
- Réponse : Visible uniquement pour host, style discret

### 4.4 Pages de Résultats

#### Structure Commune

```
┌─────────────────────────────────────┐
│              RÉSULTATS              │
├─────────────────────────────────────┤
│                                     │
│         🥇                          │
│       ALICE                         │
│       250 pts                       │
│                                     │
│     🥈         🥉                   │
│    BOB      CHARLIE                 │
│   180 pts    150 pts                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  4. David        145 pts            │
│  5. Eve          120 pts            │
│  6. Frank         85 pts            │
│                                     │
├─────────────────────────────────────┤
│ [Nouvelle Partie]  [Accueil]        │
└─────────────────────────────────────┘
```

**Changements :**
- Podium : Style épuré, pas de 3D excessif
- Médailles : Emojis standard, taille raisonnable
- Confetti : Subtil, 2-3 secondes max
- Boutons : Pleine largeur, stack vertical

### 4.5 Pages Profil

#### `/profile`

```
┌─────────────────────────────────────┐
│               PROFIL                │
├─────────────────────────────────────┤
│                                     │
│         [Avatar]                    │
│       Nom d'utilisateur             │
│       niveau 12 • 1,234 XP          │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎮 42 parties jouées       │    │
│  │  🏆 15 victoires            │    │
│  │  📊 Score total: 12,450     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ⚙️ Paramètres              │    │
│  │  🎵 Spotify                  │    │
│  │  💡 Philips Hue              │    │
│  │  👑 Passer Pro               │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Déconnexion]                      │
│                                     │
├─────────────────────────────────────┤
│  [Home]  [Profil]  [Settings]       │
└─────────────────────────────────────┘
```

---

## 5. Animations & Interactions

### 5.1 Principes

1. **Durée courte** : 150-300ms max pour les interactions
2. **Easing naturel** : `ease-out` pour entrées, `ease-in` pour sorties
3. **Purpose** : Chaque animation a un but (feedback, guidance, delight)
4. **Subtilité** : Moins c'est plus

### 5.2 Animations Standards

```css
/* Transitions de base */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;

/* Courbes */
--ease-out: cubic-bezier(0.33, 1, 0.68, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 5.3 Catalogue d'Animations

#### Entrées de Page

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Usage : `animation: slideUp 0.3s ease-out`

#### Boutons

```css
/* Hover */
transform: translateY(-1px);
transition: transform 0.15s ease;

/* Press */
transform: scale(0.98);
transition: transform 0.1s ease;
```

#### Cards

```css
/* Hover */
transform: translateY(-2px);
border-color: var(--border-default);
transition: all 0.2s ease;
```

#### Buzzer Press

```css
@keyframes buzzerPress {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* Durée : 200ms */
```

#### Score Update

```css
@keyframes scoreUp {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); color: var(--success); }
  100% { transform: scale(1); }
}

/* Durée : 400ms */
```

#### Confetti (Résultats)

- Particules : 50 max (pas 200)
- Durée : 2.5s
- Distribution : Arc depuis le haut
- Couleurs : Palette du jeu uniquement

### 5.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Roadmap d'Implémentation

### Phase 0 : Préparation

- [ ] Créer branche `refonte-ui`
- [ ] Installer nouvelles fonts (Clash Display, Geist, JetBrains Mono)
- [ ] Créer fichier `app/theme-v2.css` avec nouvelles variables
- [ ] Tester fonts en local

### Phase 1 : Fondations (Semaine 1)

#### 1.1 Typographie
- [ ] Remplacer imports Google Fonts dans `globals.css`
- [ ] Mettre à jour variables `--font-*`
- [ ] Ajuster tous les `font-family` references

#### 1.2 Couleurs
- [ ] Ajouter nouvelles variables de couleur
- [ ] Créer classes utilitaires `.bg-*`, `.text-*`
- [ ] Définir variables CSS par jeu (`.theme-quiz`, `.theme-blindtest`, etc.)

#### 1.3 Spacing & Radius
- [ ] Ajuster valeurs `--radius-*`
- [ ] Vérifier cohérence spacing

### Phase 2 : Composants de Base (Semaine 2)

#### 2.1 Boutons
- [ ] Refaire `.btn` de base
- [ ] Créer variantes `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- [ ] Ajouter tailles `.btn-sm`, `.btn-lg`
- [ ] Supprimer anciens styles de boutons dupliqués

#### 2.2 Cards
- [ ] Refaire `.card` de base
- [ ] Créer `.card-elevated`, `.card-interactive`
- [ ] Supprimer glassmorphism par défaut

#### 2.3 Inputs
- [ ] Refaire `.input` de base
- [ ] États focus avec glow couleur jeu

### Phase 3 : Layout Composants (Semaine 3)

#### 3.1 Header
- [ ] Créer composant `Header` unifié
- [ ] Appliquer à toutes les pages lobby
- [ ] Appliquer à toutes les pages jeu

#### 3.2 Leaderboard
- [ ] Refaire `Leaderboard.jsx`
- [ ] Nouveaux styles pour états (me, disconnected, inactive)

#### 3.3 Modals
- [ ] Refaire structure modale de base
- [ ] Appliquer à `PaywallModal`
- [ ] Appliquer à `SelectorModal`
- [ ] Appliquer à autres modals

### Phase 4 : Pages par Section (Semaines 4-5)

#### 4.1 Auth & Onboarding
- [ ] `/splash`
- [ ] `/onboarding`
- [ ] `/login`

#### 4.2 Home
- [ ] `/home` - Layout et game cards
- [ ] `BottomNav`
- [ ] `RejoinBanner`

#### 4.3 Lobbies
- [ ] `/room/[code]` (Quiz)
- [ ] `/blindtest/room/[code]`
- [ ] `/deeztest/room/[code]`
- [ ] `/alibi/room/[code]`
- [ ] `/trouveregle/room/[code]`

#### 4.4 Jeux - Quiz
- [ ] `/game/[code]/play`
- [ ] `/game/[code]/host`
- [ ] `/end/[code]`
- [ ] `Buzzer` composant

#### 4.5 Jeux - BlindTest
- [ ] `/blindtest/game/[code]/play`
- [ ] `/blindtest/game/[code]/host`
- [ ] `/blindtest/game/[code]/end`

#### 4.6 Jeux - DeezTest
- [ ] `/deeztest/game/[code]/play`
- [ ] `/deeztest/game/[code]/host`
- [ ] `/deeztest/game/[code]/end`

#### 4.7 Jeux - Alibi
- [ ] `/alibi/game/[code]/prep`
- [ ] `/alibi/game/[code]/play`
- [ ] `/alibi/game/[code]/end`

#### 4.8 Jeux - TrouveRegle
- [ ] `/trouveregle/game/[code]/play`
- [ ] `/trouveregle/game/[code]/investigate`
- [ ] `/trouveregle/game/[code]/end`

#### 4.9 Jeux - Mime
- [ ] `/mime`
- [ ] `MimeCard`, `MimeGame`

#### 4.10 Profil & Autres
- [ ] `/profile`
- [ ] `/profile/stats`
- [ ] `/profile/spotify`
- [ ] `/profile/hue`
- [ ] `/subscribe`
- [ ] Pages légales

### Phase 5 : Polish (Semaine 6)

- [ ] Animations de transition entre pages
- [ ] Micro-interactions finales
- [ ] Test sur tous les breakpoints
- [ ] Test accessibilité (contrast, reduced motion)
- [ ] Performance audit (bundle size fonts)

### Phase 6 : Merge & Deploy

- [ ] Code review
- [ ] Tests fonctionnels complets
- [ ] Merge dans `main`
- [ ] Deploy production

---

## 7. Règles & Interdits

### 7.1 À FAIRE (DO)

| Règle | Exemple |
|-------|---------|
| Un effet visuel par élément | Shadow OU glow, pas les deux |
| Couleurs du système | Utiliser variables CSS, jamais de hardcoded |
| Touch targets 44px minimum | Boutons, liens cliquables |
| Feedback immédiat | Hover/active states sur tout interactif |
| Progressive enhancement | Fonctionne sans animations |

### 7.2 À NE PAS FAIRE (DON'T)

| Interdit | Pourquoi |
|----------|----------|
| ❌ Glassmorphism partout | Réservé aux modals et overlays |
| ❌ Multiples box-shadows | Un seul niveau de shadow |
| ❌ Gradients sur tout | Réservé aux boutons primary et accents |
| ❌ Animations > 300ms | Trop lent, frustrant |
| ❌ Uppercase partout | Réservé aux titres de page |
| ❌ Glow permanent | Réservé aux états focus/active |
| ❌ Fonts hardcodées | Toujours via variables CSS |
| ❌ Couleurs hardcodées | Toujours via variables CSS |

### 7.3 Checklist par Composant

Avant de valider un composant, vérifier :

- [ ] Utilise les variables de couleur du thème
- [ ] Fonctionne avec la couleur de n'importe quel jeu
- [ ] Touch target >= 44px
- [ ] A un état hover ET active
- [ ] Respecte le spacing 8pt
- [ ] Texte lisible (contrast ratio > 4.5:1)
- [ ] Fonctionne en reduced-motion

### 7.4 Ne Pas Casser

**FONCTIONNALITÉS CRITIQUES - NE PAS TOUCHER LA LOGIQUE :**

| Fonctionnalité | Fichiers concernés |
|----------------|-------------------|
| Système de buzz | `Buzzer/index.jsx`, `host/page.jsx` (résolution) |
| Création/join room | `lib/config/rooms.js`, pages lobby |
| Auth Firebase | `lib/firebase.js` |
| Realtime sync | Tous les `onValue` listeners |
| Player status | `usePlayerCleanup`, `useInactivityDetection` |
| Scoring | `public/config/scoring.json`, logique dans host |
| Spotify/Deezer | `lib/spotify/`, `lib/deezer/` |

**Règle d'or :** Si tu touches à du JavaScript qui n'est pas du style inline, tu dois tester la fonctionnalité complètement.

---

## Annexes

### A. Inventaire Complet des Pages

| Route | Jeu | Type | Priorité Refonte |
|-------|-----|------|------------------|
| `/splash` | Global | Entry | P1 |
| `/onboarding` | Global | Entry | P2 |
| `/login` | Global | Auth | P1 |
| `/home` | Global | Hub | P1 |
| `/room/[code]` | Quiz | Lobby | P1 |
| `/game/[code]/play` | Quiz | Play | P1 |
| `/game/[code]/host` | Quiz | Play | P1 |
| `/end/[code]` | Quiz | End | P1 |
| `/blindtest/room/[code]` | BlindTest | Lobby | P1 |
| `/blindtest/game/[code]/play` | BlindTest | Play | P1 |
| `/blindtest/game/[code]/host` | BlindTest | Play | P1 |
| `/blindtest/game/[code]/end` | BlindTest | End | P1 |
| `/deeztest/room/[code]` | DeezTest | Lobby | P1 |
| `/deeztest/game/[code]/play` | DeezTest | Play | P1 |
| `/deeztest/game/[code]/host` | DeezTest | Play | P1 |
| `/deeztest/game/[code]/end` | DeezTest | End | P1 |
| `/alibi/room/[code]` | Alibi | Lobby | P2 |
| `/alibi/game/[code]/prep` | Alibi | Play | P2 |
| `/alibi/game/[code]/play` | Alibi | Play | P2 |
| `/alibi/game/[code]/end` | Alibi | End | P2 |
| `/trouveregle/room/[code]` | TrouveRegle | Lobby | P2 |
| `/trouveregle/game/[code]/play` | TrouveRegle | Play | P2 |
| `/trouveregle/game/[code]/investigate` | TrouveRegle | Play | P2 |
| `/trouveregle/game/[code]/end` | TrouveRegle | End | P2 |
| `/mime` | Mime | Full | P2 |
| `/profile` | Global | Profile | P3 |
| `/profile/stats` | Global | Profile | P3 |
| `/profile/spotify` | Global | Profile | P3 |
| `/profile/hue` | Global | Profile | P3 |
| `/subscribe` | Global | Monetization | P3 |
| `/join` | Quiz | Join | P1 |
| `/blindtest/join` | BlindTest | Join | P1 |
| `/deeztest/join` | DeezTest | Join | P1 |
| `/alibi/join` | Alibi | Join | P2 |
| `/legal`, `/privacy`, `/terms` | Global | Legal | P3 |

### B. Composants à Refaire

| Composant | Fichier | Priorité |
|-----------|---------|----------|
| Buttons (tous) | `globals.css` | P1 |
| Cards | `globals.css` | P1 |
| Header | `LobbyHeader.jsx` | P1 |
| Leaderboard | `Leaderboard.jsx` | P1 |
| Buzzer | `Buzzer/index.jsx` | P1 |
| Modals | `PaywallModal.jsx`, etc. | P2 |
| Inputs | `globals.css` | P2 |
| Game Cards | `GameCard.jsx` | P1 |
| Bottom Nav | `BottomNav.jsx` | P1 |
| Toast | `Toast.jsx` | P3 |
| Loaders | `GameLoader.jsx` | P3 |
| Podium | `PodiumPremium.jsx` | P2 |

### C. Fonts à Installer

```html
<!-- Google Fonts (option gratuite) -->
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

<!-- Clash Display (via Fontshare - gratuit) -->
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet">
```

Alternative si Clash Display pose problème : **Satoshi** (aussi sur Fontshare)

---

> **Document créé le :** 2026-01-14
> **Dernière mise à jour :** 2026-01-14
> **Auteur :** Claude + User
> **Version :** 1.0
