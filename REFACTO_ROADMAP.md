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

## Tier 1 — ✅ Terminé — 14 fichiers (tous sous 1000 lignes)

### 1. `components/ui/HowToPlayModal.jsx` — 1897 → 178 lignes (-90%)
- [x] Extraire `GAMES_DATA` (793 lignes) → `lib/config/howToPlayData.js`
- [x] Extraire CSS `<style jsx global>` (535 lignes) → `components/ui/HowToPlayModal.css`
- [x] Extraire 10 section renderers → `components/ui/HowToPlaySections.jsx`
- **Méthode :** 3 extractions pures (data, CSS, composants), aucun changement de logique

### 2. `components/game/BlindTestHostView.jsx` — 1917 → 711 lignes (-63%)
- [x] Extraire CSS `<style jsx>` (578 lignes) → `components/game/BlindTestHostView.css`
- [x] Extraire système audio → `lib/hooks/useBlindTestAudio.js` (9 useState, 4 useRef, playLevel/stopMusic/pauseMusic)
- [x] Extraire système buzz → `lib/hooks/useBlindTestBuzz.js` (3 useRef, listener Firebase, resetBuzzers)
- [x] Extraire système reveal → `lib/hooks/useRevealPlayback.js` (6 useState, 4 useRef, play/pause/seek/drag)
- [x] Fix interpolations CSS (`${DEEZER_PURPLE}` → valeurs en dur) et `:global()` → sélecteurs normaux
- **Méthode :** Restructuration en 3 hooks spécialisés + CSS. Analyse de dépendances complète (DAG sans cycles)

### 3. `app/(main)/profile/hue/page.jsx` — 2277 → 920 lignes (-60%)
- [x] Extraire CSS `<style jsx>` (1358 lignes) → `app/(main)/profile/hue/hue.css`
- **Méthode :** Extraction CSS uniquement. Logique trop couplée entre les 3 tabs pour extraire des hooks sans risque

### 4. `app/lol/game/[code]/play/page.jsx` — 1811 → 747 lignes (-59%)
- [x] Extraire `RenderSceneScript` (108 lignes) → `app/lol/.../play/RenderSceneScript.jsx`
- [x] Extraire 3 modals (Accuse, Vote, Accused ~260 lignes) → `_components/GameModals.jsx`
- [x] Extraire Joker (selection modal + 3 active screens ~720 lignes) → `_components/JokerOverlays.jsx`
- **Méthode :** Extraction JSX pure (les composants reçoivent handlers/state en props). Logique reste dans le parent car trop couplée entre systèmes

### 5. `app/laregle/game/[code]/play/page.jsx` — 1774 → 572 lignes (-68%)
- [x] Extraire ChoosingPhase (6 useState, 3 useEffects, 4 handlers, ~620 lignes) → `_components/ChoosingPhase.jsx`
- [x] Extraire PlayingPhase (JSX règle secrète + équipe + éliminations ~390 lignes) → `_components/PlayingPhase.jsx`
- [x] Extraire GuessingPhase (JSX vote devinette ~180 lignes) → `_components/GuessingPhase.jsx`
- [x] Dédupliquer `EliminationNotifModal` → `components/game/EliminationNotifModal.jsx` (partagé avec investigate)
- **Méthode :** Découpage par phase de jeu. ChoosingPhase possède son propre state (vote, reveal animation). PlayingPhase et GuessingPhase sont du JSX pur avec props

### 6. `app/alibi/game/[code]/play/page.jsx` — 1670 → 979 lignes (-41%)
- [x] Extraire CSS `<style jsx global>` (688 lignes) → `app/alibi/.../play/alibi-play.css`
- [x] Fix `:global()` → sélecteurs normaux (via script Python)
- **Méthode :** Extraction CSS uniquement. La logique Party Mode + groupes est trop interconnectée pour extraire des composants sans risque

### 7. `app/daily/motmystere/page.jsx` — 1384 → 649 lignes (-53%)
- [x] Extraire Leaderboard (470 lignes : helpers, WeekProgressBar, LbRow, LbRows, resolveNames, WordleLeaderboard) → `WordleLeaderboard.jsx`
- [x] Extraire composants UI + helpers (267 lignes : WordleGrid, WordleKeyboard, WordleResultBanner, WordleStatsModal, normalize, computeFeedback, computeScore, constants) → `WordleComponents.jsx`
- [x] Ajouter `LeaderboardErrorBoundary` (partagé avec semantique et total)
- **Méthode :** Extraction de sous-composants + leaderboard autonome

### 8. `app/daily/semantique/page.jsx` — 1376 → 716 lignes (-48%)
- [x] Extraire Leaderboard (481 lignes : helpers, WeekProgressBar, LbRow, LbRows, resolveNames, SemanticLeaderboard, LeaderboardErrorBoundary) → `SemanticLeaderboard.jsx`
- [x] Extraire composants UI + helpers (190 lignes : stripAccents, température system, SemanticStatsModal, SemanticResultBanner, GuessRow) → `SemanticComponents.jsx`
- [x] Déplacer `LeaderboardErrorBoundary` → `components/shared/LeaderboardErrorBoundary.jsx` (partagé entre les 3 daily)
- **Méthode :** Même pattern que motmystere

### 9. `app/alibi/game/[code]/prep/page.jsx` — 1292 → 638 lignes (-51%)
- [x] Extraire CSS `<style jsx>` (653 lignes) → `app/alibi/.../prep/alibi-prep.css`
- [x] Fix `:global()` → sélecteurs normaux
- **Méthode :** Extraction CSS uniquement

### 10. `app/laregle/game/[code]/investigate/page.jsx` — 1286 → 663 lignes (-45%)
- [x] Extraire GuessVoteSheet (206 lignes : bottom sheet modal de vote) → `_components/GuessVoteSheet.jsx`
- [x] Extraire 3 phases enquêteur → `_components/InvestigatePhases.jsx` (ChoosingWaitPhase, PlayingInvestPhase, GuessingInvestPhase)
- [x] Utiliser `EliminationNotifModal` partagé (déjà extrait pour play)
- **Méthode :** Extraction JSX par phase + modal autonome

### 11. `app/alibi/room/[code]/page.jsx` — 1148 → 965 lignes (-16%)
- [x] Extraire RolesCard (188 lignes : carte gestion rôles host, inspecteurs/suspects, expanded detail) → `_components/RolesCard.jsx`
- **Méthode :** Extraction d'un bloc JSX auto-contenu. Réduction modeste car le reste est du JSX couplé au state parent

### 12. `components/game/Leaderboard.jsx` — 1136 → 376 lignes (-67%)
- [x] Extraire CSS `<style jsx>` (758 lignes) → `components/game/Leaderboard.css`
- [x] Fix `:global()` → sélecteurs normaux
- **Méthode :** Extraction CSS uniquement. Le composant JS restant (376 lignes) est dans la zone acceptable

### 13. `app/subscribe/page.jsx` — 1085 → 425 lignes (-61%)
- [x] Extraire CSS `const styles` template literal (658 lignes) → `app/subscribe/subscribe.css`
- **Méthode :** Extraction CSS uniquement. Pas d'extraction de hooks (7 useState, page simple et isolée)

### 14. `app/onboarding/page.jsx` — 1024 → 616 lignes (-40%)
- [x] Extraire `Mascot` composant (52 lignes) → `app/onboarding/Mascot.jsx`
- [x] Extraire `PseudoSlide` (185 lignes : écran saisie pseudo + gestion clavier) → `app/onboarding/PseudoSlide.jsx`
- [x] Extraire `GuestWarningModal` (220 lignes : modal avertissement + boutons auth) → `app/onboarding/GuestWarningModal.jsx`
- [x] Nettoyer imports inutilisés (useEffect, AlertTriangle, X)
- **Méthode :** Extraction de 3 sous-composants autonomes. PseudoSlide possède son propre state clavier

---

## Tier 2 — 🟡 En cours (600-1000 lignes) — 18 fichiers

### 15. `components/game/LinkOverlay.jsx` — 973 → 587 lignes (-40%)
- [x] Extraire inline styles → `components/game/LinkOverlay.css`
- [x] Extraire `DefenderInterceptSection` (intercept failed + button + typing + pending) en composant local
- **Méthode :** CSS extraction + extraction du bloc défenseur. Composant reste à 587 car 8 phases distinctes

### 16. `app/room/[code]/page.jsx` — 964 → 599 lignes (-38%)
- [x] Extraire inline styles → `app/room/[code]/quiz-lobby.css`
- [x] Extraire host settings panel (quiz selector + mode toggle + team count) → `_components/HostSettingsPanel.jsx`
- **Méthode :** CSS extraction + composant host settings. handleStartGame gardé dans la page (trop couplé au state)

### 17. `app/mindlink/game/[code]/defend/page.jsx` — 953 → 264 lignes (-72%)
- [x] Extraire ChoosingPhase (word input + random + preview) → `_components/ChoosingPhase.jsx`
- [x] Extraire WordGuessModal + FoundConfirmModal → `_components/DefendModals.jsx`
- [x] Extraire inline styles → `defend.css`
- **Méthode :** ChoosingPhase avec son propre state. 2 modals extraites. CSS centralisé

### 18. `app/alibi/game/[code]/end/page.jsx` — 920 → 354 lignes (-62%)
- [x] Extraire TrophyIcon + DefeatIcon SVGs → `_components/AlibiEndIcons.jsx`
- [x] Extraire 2 blocs `<style jsx global>` → `alibi-end.css`
- **Méthode :** Extraction SVG + CSS. Logique score/animation gardée dans la page

### 19. `app/imposteur/room/[code]/page.jsx` — 909 → 385 lignes (-58%)
- [x] Extraire host settings panel (rounds, imposteurs, Mr. White, clue mode, timer) → `_components/ImposteurSettingsPanel.jsx`
- [x] Extraire inline styles → `imposteur-lobby.css`
- **Méthode :** Même pattern que Quiz lobby

### 20. `components/game/QuizHostView.jsx` — 804 → 234 lignes (-71%)
- [x] Extraire buzz system + actions (validate/wrong/skip/reset/reveal) → `lib/hooks/useQuizActions.js`
- [x] Extraire `<style jsx>` → `QuizHostView.css`
- **Méthode :** Hook d'actions complet. Le composant ne garde que le rendu + scoring + report

### 21. `app/mindlink/room/[code]/page.jsx` — 776 → 318 lignes (-59%)
- [x] Extraire host settings (mode, timer, defenders) → `_components/MindLinkSettingsPanel.jsx`
- [x] Extraire inline styles → `mindlink-lobby.css`
- **Méthode :** Même pattern lobby que Quiz et Imposteur

### 22. `components/game-alibi/VerdictTransition.jsx` — 761 → 131 lignes (-83%)
- [x] Extraire ValidIcon + RefuseIcon + TimeoutIcon + ExplosiveParticles → `VerdictIcons.jsx`
- [x] Extraire `<style jsx global>` → `VerdictTransition.css`
- [x] Config object (correct/incorrect/timeout) extrait en constante module-level
- **Méthode :** Icons SVG + particles + CSS. Plus grosse réduction du Tier 2

### 23. `app/laregle/room/[code]/page.jsx` — 747 → 273 lignes (-63%)
- [x] Extraire host settings (mode, timer, investigators) → `_components/LaRegleSettingsPanel.jsx`
- [x] Extraire inline styles → `laregle-lobby.css`
- **Méthode :** Même pattern lobby

### 24. `app/daily/total/page.jsx` — 722 → 165 lignes (-77%)
- [x] Extraire toute la logique de jeu → `lib/hooks/useTotalGame.js`
- [x] Extraire background + modal styles → `total.css`
- **Méthode :** Hook complet (state, timer, validation, leaderboard)

### 25. `components/transitions/GameEndTransition.jsx` — 710 → 60 lignes (-92%)
- [x] Extraire 7 icon components → `TransitionIcons.jsx` avec helper GlowBg partagé
- [x] Extraire `<style jsx global>` → `GameEndTransition.css`
- [x] Config object (9 jeux) extrait en constante module-level
- **Méthode :** Plus grosse réduction du projet (-92%)

| # | Fichier | Lignes | Jeu impacté |
|---|---------|--------|-------------|
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
| Lignes totales (Tier 1) | 21,077 | 9,155 | **-57%** |
| Fichiers > 1000 lignes | 14 | **0** | **-100%** |
| Build errors | — | 0 | ✅ |
| Fonctionnalités cassées | — | 0 | ✅ |

### Résultats par fichier

| # | Fichier | Avant | Après | Réduction |
|---|---------|-------|-------|-----------|
| 1 | HowToPlayModal.jsx | 1897 | **178** | -90% |
| 2 | BlindTestHostView.jsx | 1917 | **711** | -63% |
| 3 | lol/play/page.jsx | 1811 | **747** | -59% |
| 4 | laregle/play/page.jsx | 1774 | **572** | -68% |
| 5 | alibi/play/page.jsx | 1670 | **979** | -41% |
| 6 | motmystere/page.jsx | 1384 | **649** | -53% |
| 7 | semantique/page.jsx | 1376 | **716** | -48% |
| 8 | alibi/prep/page.jsx | 1292 | **638** | -51% |
| 9 | laregle/investigate/page.jsx | 1286 | **663** | -45% |
| 10 | profile/hue/page.jsx | 2277 | **920** | -60% |
| 11 | alibi/room/page.jsx | 1148 | **965** | -16% |
| 12 | Leaderboard.jsx | 1136 | **376** | -67% |
| 13 | subscribe/page.jsx | 1085 | **425** | -61% |
| 14 | onboarding/page.jsx | 1024 | **616** | -40% |

---

## Progression

| Phase | Status | Date début | Date fin |
|-------|--------|------------|----------|
| Tier 1 (14 fichiers) | ✅ **Terminé** — 0 fichiers > 1000 lignes | 2026-03-30 | 2026-03-31 |
| Tier 2 (18 fichiers) | 🟡 **En cours** — 11/18 terminés | 2026-03-31 | |
| Tier 3 (48 fichiers) | ⬜ En attente | | |

### Fichiers créés pendant le refacto

**Hooks :**
- `lib/hooks/useBlindTestAudio.js` — Audio Deezer (init, play, stop, progress)
- `lib/hooks/useBlindTestBuzz.js` — Système de buzz (listener, résolution)
- `lib/hooks/useRevealPlayback.js` — Reveal après bonne réponse (play, drag, seek)

**Composants partagés :**
- `components/game/EliminationNotifModal.jsx` — Modal élimination (La Règle play + investigate)
- `components/shared/LeaderboardErrorBoundary.jsx` — Error boundary (3 daily games)

**Composants extraits par jeu :**
- `lib/config/howToPlayData.js` — Données tutoriels (11 jeux)
- `components/ui/HowToPlaySections.jsx` — Renderers de sections tutoriel
- `app/daily/motmystere/WordleLeaderboard.jsx` — Leaderboard Mot Mystère
- `app/daily/motmystere/WordleComponents.jsx` — Grid, Keyboard, ResultBanner, StatsModal
- `app/daily/semantique/SemanticLeaderboard.jsx` — Leaderboard Sémantique
- `app/daily/semantique/SemanticComponents.jsx` — Helpers + UI composants
- `app/onboarding/Mascot.jsx`, `PseudoSlide.jsx`, `GuestWarningModal.jsx`
- `app/lol/game/[code]/play/RenderSceneScript.jsx` — Rendu script théâtre
- `app/lol/game/[code]/play/_components/GameModals.jsx` — Accuse, Vote, Accused modals
- `app/lol/game/[code]/play/_components/JokerOverlays.jsx` — Joker selection + 3 screens
- `app/laregle/game/[code]/play/_components/ChoosingPhase.jsx` — Phase de vote
- `app/laregle/game/[code]/play/_components/PlayingPhase.jsx` — Phase de jeu active
- `app/laregle/game/[code]/play/_components/GuessingPhase.jsx` — Phase de devinette
- `app/laregle/game/[code]/investigate/_components/InvestigatePhases.jsx` — 3 phases enquêteur
- `app/laregle/game/[code]/investigate/_components/GuessVoteSheet.jsx` — Modal vote devinette
- `app/alibi/room/[code]/_components/RolesCard.jsx` — Carte gestion des rôles
- `app/room/[code]/_components/HostSettingsPanel.jsx` — Quiz selector + mode toggle + team count

**Fichiers CSS extraits :**
- `components/ui/HowToPlayModal.css`
- `components/game/BlindTestHostView.css`
- `components/game/Leaderboard.css`
- `components/game/LinkOverlay.css`
- `app/subscribe/subscribe.css`
- `app/(main)/profile/hue/hue.css`
- `app/alibi/game/[code]/play/alibi-play.css`
- `app/alibi/game/[code]/prep/alibi-prep.css`
- `app/room/[code]/quiz-lobby.css`

### Améliorations bonus
- `LeaderboardErrorBoundary` ajouté aux 3 daily games (motmystere, semantique, total)
- `EliminationNotifModal` dédupliqué entre La Règle play et investigate
- Agents custom créés : `code-reviewer`, `complexity-analyzer`

---

*Créé le 2026-03-30 — Dernière mise à jour : 2026-04-01*
