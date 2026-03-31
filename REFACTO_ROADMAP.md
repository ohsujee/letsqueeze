# Roadmap Refactorisation — LetsQueeze / Gigglz

> Objectif : Passer d'un codebase avec des fichiers de 1000-2300 lignes à des fichiers de 300 lignes max, bien structurés, sans casser aucune fonctionnalité.
>
> **Règle absolue : 1 extraction = 1 commit = 1 `npm run build` = 1 test manuel du jeu.**

---

## Standards de qualité (2025-2026)

| Métrique | Objectif | Seuil d'alerte |
|----------|----------|----------------|
| Lignes par fichier | < 300 | > 400 |
| useState par composant | < 8 | > 10 |
| useEffect par composant | < 4 | > 5 |
| useRef par composant | < 4 | > 5 |
| Profondeur JSX | < 4 niveaux | > 5 |
| Fonctions inline | < 6 | > 8 |

### Patterns à appliquer

- **Hook de composition** — Un seul hook par page qui regroupe les hooks partagés
- **Colocation** — Sous-composants dans `_components/` à côté de la page
- **Config externe** — Données statiques dans `lib/config/` ou des fichiers dédiés
- **Extraire pour la lisibilité**, même si le hook n'est utilisé qu'une fois

### Structure cible par page de jeu

```
app/mygame/game/[code]/play/
  page.jsx              # < 300 lignes — orchestration uniquement
  _components/
    PhaseA.jsx          # Sous-composant par phase
    PhaseB.jsx
  _hooks/
    useMyGamePlay.js    # Hook de composition (regroupe les hooks partagés)
    useMyGameLogic.js   # Logique métier spécifique au jeu
```

---

## Workflow par fichier

```
1. @complexity-analyzer  → analyse le fichier, produit le plan
2. Validation du plan ensemble
3. Extraction étape par étape :
   a. Extraire hook/composant/config
   b. git commit -m "refactor(game): extract useXxx from page.jsx"
   c. npm run build
   d. Test manuel du flow de jeu
4. @code-reviewer  → review le résultat
5. Cocher dans cette roadmap ✅
```

---

## Tier 1 — 🔴 Critique (> 1000 lignes) — 14 fichiers

### 1. `components/ui/HowToPlayModal.jsx` — 1897 lignes → ~400
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** GAMES_DATA (~1000 lignes) → `lib/config/howToPlayData.js`
- [ ] **Extraire** composants renderers (sections, scoring, rôles, phases) → `components/ui/how-to-play/`
- [ ] **Extraire** hook navigation → `useGameTutorial()`
- [ ] **Review** avec @code-reviewer
- **Hooks :** 3 useState, 2 useEffect — peu complexe, surtout de la data
- **Risque :** 🟢 Faible — extraction de données pures
- **Jeux impactés :** Tous (modal partagée)

### 2. `components/game/BlindTestHostView.jsx` — 1917 lignes → ~1100
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useDeezerPlayer()` — init, play/pause, snippet (~150 lignes)
- [ ] **Extraire** hook `useSnippetLevels()` — unlock timing, progression (~100 lignes)
- [ ] **Extraire** hook `useRevealScreen()` — animation reveal, drag (~180 lignes)
- [ ] **Extraire** composant `RevealScreen` — UI reveal (~200 lignes)
- [ ] **Extraire** composant `ProgressTimeline` — barre audio/niveaux (~120 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 21 useState, 7 useEffect, 15 useRef — très complexe
- **Risque :** 🟡 Moyen — logique audio/timing sensible
- **Jeux impactés :** DeezTest (blind test)

### 3. `app/(main)/profile/hue/page.jsx` — 2277 lignes → ~1400
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useHueConnection()` — discovery, connexion bridge (~80 lignes)
- [ ] **Extraire** hook `useHueGameConfig()` — mapping événements/effets (~120 lignes)
- [ ] **Extraire** composant `HueConnectionTab` — UI connexion (~150 lignes)
- [ ] **Extraire** composant `HueLightsSelector` — sélection lumières (~130 lignes)
- [ ] **Extraire** composant `HueGameConfigurator` — mapping jeux (~200 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 19 useState, 2 useEffect — beaucoup d'état UI
- **Risque :** 🟢 Faible — page isolée, n'impacte pas les jeux
- **Jeux impactés :** Aucun directement

### 4. `app/lol/game/[code]/play/page.jsx` — 1811 lignes → ~800
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useVoteSystem()` — votes, résolution, timers (~180 lignes)
- [ ] **Extraire** hook `useAccusationFlow()` — accusations, cooldowns (~140 lignes)
- [ ] **Extraire** hook `useGameTimer()` — countdown, auto-end (~120 lignes)
- [ ] **Extraire** hook `useJokerMechanics()` — drag, activation (~100 lignes)
- [ ] **Extraire** composant `VoteModal` — UI vote (~120 lignes)
- [ ] **Extraire** composant `SceneScript` — rendu scène théâtre (~150 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 14 useState, 11 useEffect, 5 useRef
- **Risque :** 🟡 Moyen — logique de vote/élimination complexe
- **Jeux impactés :** LOL

### 5. `app/laregle/game/[code]/play/page.jsx` — 1774 lignes → ~850
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useRuleVoting()` — collection votes, validation (~140 lignes)
- [ ] **Extraire** hook `useRevealPhases()` — tiebreaker, animation reveal (~130 lignes)
- [ ] **Extraire** hook `useEliminationSystem()` — tracking, notifications (~120 lignes)
- [ ] **Extraire** hook `useRerollSystem()` — reroll validation, API (~80 lignes)
- [ ] **Extraire** composant `RuleVoteDisplay` — UI votes (~140 lignes)
- [ ] **Extraire** composant `RevealAnimation` — UI reveal (~120 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 16 useState, 10 useEffect, 5 useRef
- **Risque :** 🟡 Moyen — state machine reveal complexe
- **Jeux impactés :** La Règle

### 6. `app/alibi/game/[code]/play/page.jsx` — 1670 lignes → ~900
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useInterrogationPhase()` — questions, réponses (~140 lignes)
- [ ] **Extraire** hook `useVerdictPhase()` — calcul verdict, affichage (~120 lignes)
- [ ] **Extraire** hook `useHueIntegration()` — triggers Hue (~80 lignes)
- [ ] **Extraire** composant `InterrogationUI` — UI question/réponse (~150 lignes)
- [ ] **Extraire** composant `VerdictDisplay` — UI verdict (~130 lignes)
- [ ] **Extraire** composant `SpectatorView` — vue spectateur (~140 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 22 useState, 16 useEffect, 4 useRef
- **Risque :** 🔴 Élevé — Party Mode + groupes + rotation complexe
- **Jeux impactés :** Alibi

### 7. `app/daily/motmystere/page.jsx` — 1384 lignes → ~650
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useWordleGame()` — state jeu, logique guess, feedback (~200 lignes)
- [ ] **Extraire** hook `useWordleKeyboard()` — gestion clavier desktop + mobile (~220 lignes)
- [ ] **Extraire** hook `useWordleStats()` — stats, calculs (~100 lignes)
- [ ] **Extraire** composant `WordleGrid` — grille de lettres (~80 lignes)
- [ ] **Extraire** composant `WordleStatsModal` — modal stats (~90 lignes)
- [ ] **Extraire** config `AZERTY_ROWS` et helpers → `lib/config/wordle.js` (~60 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 47 useState, 13 useEffect, 7 useRef — record du projet !
- **Risque :** 🟡 Moyen — beaucoup d'état mais logique linéaire
- **Jeux impactés :** Daily Mot Mystère

### 8. `app/daily/semantique/page.jsx` — 1376 lignes → ~650
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useSemanticGame()` — state jeu, guess, feedback (~200 lignes)
- [ ] **Extraire** hook `useTemperatureScoring()` — calcul température, score (~120 lignes)
- [ ] **Extraire** hook `useSemanticStats()` — stats, streaks (~100 lignes)
- [ ] **Extraire** composant `TemperatureBar` — barre visuelle (~100 lignes)
- [ ] **Extraire** composant `SemanticStatsModal` — modal stats (~100 lignes)
- [ ] **Extraire** composant `SemanticLeaderboard` — classement (~150 lignes)
- [ ] **Extraire** config ranking/helpers → `lib/config/semantic.js` (~60 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 40 useState, 15 useEffect, 13 useRef
- **Risque :** 🟡 Moyen — scoring complexe mais isolé
- **Jeux impactés :** Daily Sémantique

### 9. `app/alibi/game/[code]/prep/page.jsx` — 1292 lignes → ~750
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useAlibiPrepFlow()` — state prep, transitions (~150 lignes)
- [ ] **Extraire** hook `usePrepTimer()` — countdown, pause/resume (~100 lignes)
- [ ] **Extraire** hook `useCustomQuestions()` — input questions, validation (~90 lignes)
- [ ] **Extraire** composant `DocumentViewer` — affichage document + scroll (~150 lignes)
- [ ] **Extraire** composant `QuestionEditor` — UI saisie questions (~120 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 18 useState, 9 useEffect, 3 useRef
- **Risque :** 🟡 Moyen — DOMPurify + scroll indicators
- **Jeux impactés :** Alibi

### 10. `app/laregle/game/[code]/investigate/page.jsx` — 1286 lignes → ~700
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useInvestigationTimer()` — timer, auto-end (~120 lignes)
- [ ] **Extraire** hook `useEliminationNotifications()` — éliminations, flash (~140 lignes)
- [ ] **Extraire** hook `useGameStateSync()` — listeners Firebase (~130 lignes)
- [ ] **Extraire** composant `InvestigationTimerUI` — affichage timer (~100 lignes)
- [ ] **Extraire** composant `EliminationIndicator` — notification élim (~100 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 9 useState, 8 useEffect, 5 useRef
- **Risque :** 🟡 Moyen — timer + éliminations
- **Jeux impactés :** La Règle

### 11. `app/alibi/room/[code]/page.jsx` — 1148 lignes → ~600
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useAlibiSelection()` — sélection scenario, manifest (~140 lignes)
- [ ] **Extraire** hook `useAlibiGroupSetup()` — assignation groupes Party Mode (~130 lignes)
- [ ] **Extraire** hook `useGameLaunch()` — countdown, lancement (~100 lignes)
- [ ] **Extraire** composant `GroupAssignmentUI` — UI groupes (~130 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 20 useState, 10 useEffect, 6 useRef
- **Risque :** 🟡 Moyen — Party Mode setup
- **Jeux impactés :** Alibi

### 12. `components/game/Leaderboard.jsx` — 1136 lignes → ~550
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useLeaderboardAnimations()` — tracking positions, animations (~180 lignes)
- [ ] **Extraire** hook `useTeamViewToggle()` — switch équipe/individuel (~100 lignes)
- [ ] **Extraire** composant `LeaderboardRow` — ligne animée (~120 lignes)
- [ ] **Extraire** composant `TeamRow` — ligne équipe (~100 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 6 useState, 4 useEffect, 5 useRef
- **Risque :** 🔴 Élevé — composant partagé par TOUS les jeux
- **Jeux impactés :** Quiz, DeezTest, Alibi, La Règle, LOL, Mind Link

### 13. `app/subscribe/page.jsx` — 1084 lignes → ~600
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useRevenueCatIntegration()` — achat, restore (~120 lignes)
- [ ] **Extraire** composant `PricingCards` — sélection plan (~150 lignes)
- [ ] **Extraire** composant `BenefitsSection` — liste avantages (~100 lignes)
- [ ] **Extraire** config `PRICING_DATA` → `lib/config/pricing.js` (~100 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 7 useState, 1 useEffect
- **Risque :** 🟢 Faible — page isolée
- **Jeux impactés :** Aucun

### 14. `app/onboarding/page.jsx` — 1024 lignes → ~450
- [ ] **Analyser** avec @complexity-analyzer
- [ ] **Extraire** hook `useAuthSignIn()` — Google/Apple/Guest login (~180 lignes)
- [ ] **Extraire** hook `usePseudoSetup()` — validation pseudo, save (~140 lignes)
- [ ] **Extraire** hook `useCarouselSwipe()` — swipe detection, navigation (~120 lignes)
- [ ] **Extraire** composant `SignInButtons` — boutons auth (~100 lignes)
- [ ] **Extraire** composant `PseudoSlide` — slide pseudo (~120 lignes)
- [ ] **Review** avec @code-reviewer
- **Hooks :** 12 useState, 2 useEffect, 1 useRef
- **Risque :** 🟢 Faible — flow linéaire
- **Jeux impactés :** Aucun (onboarding)

---

## Tier 2 — 🟡 Important (600-1000 lignes) — 18 fichiers

| # | Fichier | Lignes | Jeu impacté |
|---|---------|--------|-------------|
| 15 | `components/game/LinkOverlay.jsx` | 973 | Mind Link |
| 16 | `app/room/[code]/page.jsx` | 964 | Quiz |
| 17 | `app/mindlink/game/[code]/defend/page.jsx` | 953 | Mind Link |
| 18 | `app/alibi/game/[code]/end/page.jsx` | 920 | Alibi |
| 19 | `app/imposteur/room/[code]/page.jsx` | 909 | Imposteur |
| 20 | `components/game/QuizHostView.jsx` | 804 | Quiz |
| 21 | `app/mindlink/room/[code]/page.jsx` | 776 | Mind Link |
| 22 | `components/game-alibi/VerdictTransition.jsx` | 761 | Alibi |
| 23 | `app/laregle/room/[code]/page.jsx` | 747 | La Règle |
| 24 | `app/daily/total/page.jsx` | 722 | Daily Total |
| 25 | `components/transitions/GameEndTransition.jsx` | 710 | Tous |
| 26 | `app/game/[code]/play/page.jsx` | 678 | Quiz |
| 27 | `components/game/MimeGuesserView.jsx` | 671 | Mime |
| 28 | `components/game/QuestionHostCard.jsx` | 661 | Quiz |
| 29 | `app/lol/room/[code]/page.jsx` | 654 | LOL |
| 30 | `app/laregle/game/[code]/end/page.jsx` | 631 | La Règle |
| 31 | `app/(main)/profile/page.jsx` | 612 | Profil |
| 32 | `lib/hooks/usePlayerCleanup.js` | 602 | Tous |

---

## Tier 3 — 🟢 Optionnel (300-600 lignes) — 48 fichiers

À traiter si le temps le permet, après Tier 1 et 2. Fichiers entre 300-600 lignes — déjà dans la zone acceptable pour certains, mais améliorables.

<details>
<summary>Liste complète (cliquer pour déplier)</summary>

| Fichier | Lignes |
|---------|--------|
| `components/game/LobbySettings.jsx` | 589 |
| `lib/hue-module/services/hueScenariosService.js` | 578 |
| `components/game/MimeHostView.jsx` | 564 |
| `app/mindlink/game/[code]/play/page.jsx` | 564 |
| `lib/hooks/useImposteurGame.js` | 558 |
| `lib/config/rooms.js` | 556 |
| `app/(main)/home/page.jsx` | 547 |
| `components/game-alibi/AlibiGroupSelector.jsx` | 536 |
| `app/mime/room/[code]/page.jsx` | 529 |
| `components/game-alibi/AlibiSpectatorView.jsx` | 528 |
| `components/game/BlindTestRevealScreen.jsx` | 517 |
| `components/game/PlayerManager.jsx` | 492 |
| `components/shared/ErrorBoundary.jsx` | 489 |
| `app/support/page.jsx` | 468 |
| `components/game/MindLinkNetwork.jsx` | 465 |
| `lib/hooks/useActiveLink.js` | 460 |
| `components/game-alibi/AlibiPartyEndScreen.jsx` | 456 |
| `components/ui/SelectorModal.jsx` | 452 |
| `components/game-alibi/AlibiPhaseTransition.jsx` | 450 |
| `components/game/ImposteurEliminationReveal.jsx` | 441 |
| `app/mindlink/game/[code]/end/page.jsx` | 440 |
| `app/(main)/profile/stats/page.jsx` | 429 |
| `app/(main)/join/page.client.jsx` | 410 |
| `app/daily/total/components/TotalLeaderboard.jsx` | 406 |
| `app/end/[code]/page.jsx` | 374 |
| `lib/hooks/usePresence.js` | 366 |
| `app/terms/page.jsx` | 363 |
| `components/game-alibi/AlibiRoundTransition.jsx` | 360 |
| `components/game/imposteur/ImposteurRoundEndPhase.jsx` | 359 |
| `lib/hooks/useDailyGame.js` | 358 |
| `components/ui/GuestAccountPromptModal.jsx` | 354 |
| `components/ui/QuizSelectorModal.jsx` | 353 |
| `components/ui/PaywallModal.jsx` | 348 |
| `app/lol/game/[code]/end/page.jsx` | 348 |
| `components/ui/ProCard.jsx` | 340 |
| `components/game/imposteur/ImposteurDescribingPhase.jsx` | 336 |
| `components/game/BuzzValidationModal.jsx` | 334 |
| `app/privacy/page.jsx` | 334 |
| `lib/components/PlayerTeamView.jsx` | 333 |
| `lib/firebase.js` | 330 |
| `lib/deezer/player.js` | 330 |
| `app/imposteur/game/[code]/play/page.jsx` | 328 |
| `components/game/ImposteurVoteGrid.jsx` | 314 |
| `lib/services/authService.js` | 313 |
| `components/game/imposteur/ImposteurDiscussionPhase.jsx` | 310 |
| `components/game/AskerTransition.jsx` | 308 |
| `app/delete-account/page.jsx` | 301 |

</details>

---

## Ordre de bataille recommandé

> Commencer par les fichiers à **faible risque** et **fort impact** pour gagner en confiance.

| Ordre | Fichier | Pourquoi en premier |
|-------|---------|---------------------|
| 1 | HowToPlayModal.jsx | 🟢 Risque faible, ~80% de data à extraire |
| 2 | subscribe/page.jsx | 🟢 Page isolée, peu de hooks |
| 3 | onboarding/page.jsx | 🟢 Flow linéaire, page isolée |
| 4 | profile/hue/page.jsx | 🟢 Page isolée, n'impacte pas les jeux |
| 5 | motmystere/page.jsx | 🟡 Beaucoup d'état mais logique linéaire |
| 6 | semantique/page.jsx | 🟡 Similaire à motmystere |
| 7 | BlindTestHostView.jsx | 🟡 Complexe mais bien isolé |
| 8 | lol/play/page.jsx | 🟡 Jeu récent, moins de legacy |
| 9 | laregle/play/page.jsx | 🟡 State machine reveal |
| 10 | laregle/investigate/page.jsx | 🟡 Timer + éliminations |
| 11 | alibi/prep/page.jsx | 🟡 DOMPurify + questions |
| 12 | alibi/room/page.jsx | 🟡 Party Mode setup |
| 13 | alibi/play/page.jsx | 🔴 Le plus complexe (Party Mode + groupes) |
| 14 | Leaderboard.jsx | 🔴 Partagé par tous les jeux — en dernier |

---

## Statistiques globales (mise à jour 2026-03-31)

| Métrique | Avant | Après | Réduction |
|----------|-------|-------|-----------|
| Lignes totales (Tier 1) | 21,077 | 11,956 | **-43%** |
| Fichiers > 1000 lignes | 14 | 5 | **-64%** |
| Build errors | — | 0 | ✅ |
| Fonctionnalités cassées | — | 0 | ✅ |

### Fichiers restants > 1000 lignes (nécessitent restructuration logique)
- `lol/play/page.jsx` — 1700 (JSX couplé au state, modals)
- `laregle/play/page.jsx` — 1694 (3 phases, state machine)
- `laregle/investigate/page.jsx` — 1206 (timer + éliminations)
- `alibi/room/page.jsx` — 1148 (Party Mode setup)
- `alibi/play/page.jsx` — 979 (extraction CSS faite, logique à restructurer)

---

## Progression

| Phase | Status | Date début | Date fin |
|-------|--------|------------|----------|
| Tier 1 (14 fichiers) | 🟡 En cours (9/14 sous 1000 lignes) | 2026-03-30 | |
| Tier 2 (18 fichiers) | ⬜ En attente | | |
| Tier 3 (48 fichiers) | ⬜ En attente | | |

### Fichiers créés pendant le refacto
- `lib/hooks/useBlindTestAudio.js` — Audio Deezer (init, play, stop, progress)
- `lib/hooks/useBlindTestBuzz.js` — Système de buzz (listener, résolution)
- `lib/hooks/useRevealPlayback.js` — Reveal après bonne réponse (play, drag, seek)
- `lib/config/howToPlayData.js` — Données tutoriels (11 jeux)
- `components/ui/HowToPlaySections.jsx` — Renderers de sections tutoriel
- `components/ui/HowToPlayModal.css` — Styles modal tutoriel
- `components/game/BlindTestHostView.css` — Styles host blind test
- `components/game/Leaderboard.css` — Styles leaderboard
- `components/game/EliminationNotifModal.jsx` — Modal élimination partagée (La Règle)
- `components/shared/LeaderboardErrorBoundary.jsx` — Error boundary partagé (3 daily)
- `app/daily/motmystere/WordleLeaderboard.jsx` — Leaderboard Mot Mystère
- `app/daily/motmystere/WordleComponents.jsx` — Grid, Keyboard, ResultBanner, StatsModal
- `app/daily/semantique/SemanticLeaderboard.jsx` — Leaderboard Sémantique
- `app/daily/semantique/SemanticComponents.jsx` — Helpers + UI composants
- `app/onboarding/Mascot.jsx`, `PseudoSlide.jsx`, `GuestWarningModal.jsx`
- `app/lol/game/[code]/play/RenderSceneScript.jsx` — Rendu script théâtre
- Fichiers CSS : `subscribe.css`, `hue.css`, `alibi-play.css`, `alibi-prep.css`

---

*Créé le 2026-03-30 — Dernière mise à jour : 2026-03-30*
