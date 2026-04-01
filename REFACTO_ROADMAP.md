# Roadmap Refactorisation — LetsQueeze / Gigglz

> Objectif : Passer d'un codebase avec des fichiers de 1000-2300 lignes à des fichiers de 300 lignes max, bien structurés, sans casser aucune fonctionnalité.
>
> **Règle absolue : 1 extraction = 1 commit = 1 `npm run build` = 1 test manuel du jeu.**

---

## Standards de qualité

| Métrique | Objectif | Seuil d'alerte |
|----------|----------|----------------|
| Lignes par fichier | < 300 | > 400 |
| useState par composant | < 8 | > 10 |
| useEffect par composant | < 4 | > 5 |
| useRef par composant | < 4 | > 5 |
| Profondeur JSX | < 4 niveaux | > 5 |
| Fonctions inline | < 6 | > 8 |

### Patterns appliqués

- **Hook de composition** — Un seul hook par page qui regroupe les hooks partagés
- **Colocation** — Sous-composants dans `_components/` à côté de la page
- **Config externe** — Données statiques dans `lib/config/` ou des fichiers dédiés
- **CSS externe** — Pas de `<style jsx>` ni d'inline styles massifs, tout en fichiers `.css`
- **Settings panels** — Chaque lobby a un composant `SettingsPanel` dédié pour les réglages host

### Structure cible par page de jeu

```
app/mygame/game/[code]/play/
  page.jsx              # < 300 lignes — orchestration uniquement
  play.css              # Styles dédiés à la page
  _components/
    PhaseA.jsx          # Sous-composant par phase
    PhaseB.jsx
```

---

## Statistiques globales

| Métrique | Avant | Après | Réduction |
|----------|-------|-------|-----------|
| Lignes totales (Tier 1+2, 30 fichiers) | 33,611 | 14,310 | **-57%** |
| Fichiers > 1000 lignes | 14 | **0** | **-100%** |
| Build errors | — | 0 | ✅ |
| Fonctionnalités cassées | — | 0 | ✅ |

---

## Progression

| Phase | Status | Date début | Date fin |
|-------|--------|------------|----------|
| Tier 1 (14 fichiers > 1000 lignes) | ✅ **Terminé** | 2026-03-30 | 2026-03-31 |
| Tier 2 (18 fichiers 600-1000 lignes) | ✅ **Terminé** (16 refacto + 2 acceptables) | 2026-03-31 | 2026-04-01 |
| Tier 3 (48 fichiers 300-600 lignes) | ⬜ Optionnel | | |

---

## Tier 1 — ✅ Terminé — 14 fichiers (tous sous 1000 lignes)

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

### Méthodes utilisées

- Extraction de données statiques (793 lignes de `GAMES_DATA` → `howToPlayData.js`)
- Extraction CSS (`<style jsx>` et `<style jsx global>` → fichiers `.css`)
- Extraction de hooks spécialisés (`useBlindTestAudio`, `useBlindTestBuzz`, `useRevealPlayback`)
- Découpage par phase de jeu (ChoosingPhase, PlayingPhase, GuessingPhase)
- Déduplication de composants partagés (`EliminationNotifModal`, `LeaderboardErrorBoundary`)

---

## Tier 2 — ✅ Terminé — 18 fichiers

### Résultats par fichier

| # | Fichier | Avant | Après | Réduction | Méthode |
|---|---------|-------|-------|-----------|---------|
| 15 | LinkOverlay.jsx | 973 | **587** | -40% | CSS + DefenderInterceptSection |
| 16 | room/[code]/page.jsx (Quiz) | 964 | **599** | -38% | CSS + HostSettingsPanel |
| 17 | mindlink/defend/page.jsx | 953 | **264** | -72% | CSS + ChoosingPhase + DefendModals |
| 18 | alibi/end/page.jsx | 920 | **354** | -62% | CSS + AlibiEndIcons (SVG) |
| 19 | imposteur/room/page.jsx | 909 | **385** | -58% | CSS + ImposteurSettingsPanel |
| 20 | QuizHostView.jsx | 804 | **234** | -71% | CSS + useQuizActions hook |
| 21 | mindlink/room/page.jsx | 776 | **318** | -59% | CSS + MindLinkSettingsPanel |
| 22 | VerdictTransition.jsx | 761 | **131** | -83% | CSS + VerdictIcons (3 SVGs + particles) |
| 23 | laregle/room/page.jsx | 747 | **273** | -63% | CSS + LaRegleSettingsPanel |
| 24 | daily/total/page.jsx | 722 | **165** | -77% | CSS + useTotalGame hook |
| 25 | GameEndTransition.jsx | 710 | **60** | -92% | CSS + TransitionIcons (7 SVGs) |
| 26 | game/[code]/play/page.jsx (Quiz) | 678 | **470** | -31% | CSS extraction |
| 27 | MimeGuesserView.jsx | 671 | **363** | -46% | CSS extraction |
| 28 | QuestionHostCard.jsx | 661 | **201** | -70% | CSS extraction (460 lignes) |
| 29 | lol/room/page.jsx | 654 | **253** | -61% | CSS + LolSettingsPanel |
| 30 | laregle/end/page.jsx | 631 | **498** | -21% | Config + visual components |
| 31 | profile/page.jsx | 612 | — | Acceptable | CSS déjà externalisé, bonnes pratiques |
| 32 | usePlayerCleanup.js | 602 | — | Acceptable | Hook critique, responsabilité unique |

---

## Tier 3 — ⬜ Optionnel (300-600 lignes) — 48 fichiers

À traiter si le temps le permet. Fichiers entre 300-600 lignes — déjà dans la zone acceptable pour certains, mais améliorables.

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

## Tous les fichiers créés pendant le refacto

### Hooks

| Fichier | Description |
|---------|-------------|
| `lib/hooks/useBlindTestAudio.js` | Audio Deezer (init, play, stop, progress) |
| `lib/hooks/useBlindTestBuzz.js` | Système de buzz DeezTest (listener, résolution) |
| `lib/hooks/useRevealPlayback.js` | Reveal après bonne réponse (play, drag, seek) |
| `lib/hooks/useQuizActions.js` | Buzz system + actions quiz (validate/wrong/skip/reveal/end) |
| `lib/hooks/useTotalGame.js` | Logique complète du jeu Daily Total |

### Composants extraits

| Fichier | Description |
|---------|-------------|
| `lib/config/howToPlayData.js` | Données tutoriels (11 jeux) |
| `components/ui/HowToPlaySections.jsx` | Renderers de sections tutoriel |
| `components/game/EliminationNotifModal.jsx` | Modal élimination (La Règle play + investigate) |
| `components/shared/LeaderboardErrorBoundary.jsx` | Error boundary (3 daily games) |
| `components/game-alibi/VerdictIcons.jsx` | 3 verdict icons + particles |
| `components/transitions/TransitionIcons.jsx` | 7 game end icons + GlowBg helper |
| `app/room/[code]/_components/HostSettingsPanel.jsx` | Quiz: selector + mode + teams |
| `app/imposteur/room/[code]/_components/ImposteurSettingsPanel.jsx` | Rounds, imposteurs, Mr White, clue mode, timer |
| `app/mindlink/room/[code]/_components/MindLinkSettingsPanel.jsx` | Mode, timer, defenders |
| `app/laregle/room/[code]/_components/LaRegleSettingsPanel.jsx` | Mode, timer, investigators |
| `app/lol/room/[code]/_components/LolSettingsPanel.jsx` | Elimination mode, duration |
| `app/mindlink/game/[code]/defend/_components/ChoosingPhase.jsx` | Word chooser input |
| `app/mindlink/game/[code]/defend/_components/DefendModals.jsx` | Guess + confirm modals |
| `app/alibi/game/[code]/end/_components/AlibiEndIcons.jsx` | Trophy + Defeat SVGs |
| `app/alibi/room/[code]/_components/RolesCard.jsx` | Carte gestion des rôles |
| `app/laregle/game/[code]/end/_components/LaRegleEndComponents.jsx` | Result config + visual components |
| `app/laregle/game/[code]/play/_components/ChoosingPhase.jsx` | Phase de vote |
| `app/laregle/game/[code]/play/_components/PlayingPhase.jsx` | Phase de jeu active |
| `app/laregle/game/[code]/play/_components/GuessingPhase.jsx` | Phase de devinette |
| `app/laregle/game/[code]/investigate/_components/InvestigatePhases.jsx` | 3 phases enquêteur |
| `app/laregle/game/[code]/investigate/_components/GuessVoteSheet.jsx` | Modal vote devinette |
| `app/lol/game/[code]/play/RenderSceneScript.jsx` | Rendu script théâtre |
| `app/lol/game/[code]/play/_components/GameModals.jsx` | Accuse, Vote, Accused modals |
| `app/lol/game/[code]/play/_components/JokerOverlays.jsx` | Joker selection + 3 screens |
| `app/daily/motmystere/WordleLeaderboard.jsx` | Leaderboard Mot Mystère |
| `app/daily/motmystere/WordleComponents.jsx` | Grid, Keyboard, ResultBanner, StatsModal |
| `app/daily/semantique/SemanticLeaderboard.jsx` | Leaderboard Sémantique |
| `app/daily/semantique/SemanticComponents.jsx` | Helpers + UI composants |
| `app/onboarding/Mascot.jsx` | Mascotte onboarding |
| `app/onboarding/PseudoSlide.jsx` | Écran saisie pseudo |
| `app/onboarding/GuestWarningModal.jsx` | Modal avertissement guest |

### Fichiers CSS extraits (22 fichiers)

| Tier | Fichier |
|------|---------|
| 1 | `components/ui/HowToPlayModal.css` |
| 1 | `components/game/BlindTestHostView.css` |
| 1 | `components/game/Leaderboard.css` |
| 1 | `app/subscribe/subscribe.css` |
| 1 | `app/(main)/profile/hue/hue.css` |
| 1 | `app/alibi/game/[code]/play/alibi-play.css` |
| 1 | `app/alibi/game/[code]/prep/alibi-prep.css` |
| 2 | `components/game/LinkOverlay.css` |
| 2 | `components/game/QuizHostView.css` |
| 2 | `components/game/MimeGuesserView.css` |
| 2 | `components/game/QuestionHostCard.css` |
| 2 | `components/game-alibi/VerdictTransition.css` |
| 2 | `components/transitions/GameEndTransition.css` |
| 2 | `app/room/[code]/quiz-lobby.css` |
| 2 | `app/game/[code]/play/quiz-play.css` |
| 2 | `app/imposteur/room/[code]/imposteur-lobby.css` |
| 2 | `app/mindlink/room/[code]/mindlink-lobby.css` |
| 2 | `app/mindlink/game/[code]/defend/defend.css` |
| 2 | `app/laregle/room/[code]/laregle-lobby.css` |
| 2 | `app/lol/room/[code]/lol-lobby.css` |
| 2 | `app/alibi/game/[code]/end/alibi-end.css` |
| 2 | `app/daily/total/total.css` |

---

*Créé le 2026-03-30 — Dernière mise à jour : 2026-04-01*
