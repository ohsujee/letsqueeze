# Components

Organisation des composants React du projet LetsQueeze.

## Structure

```
components/
├── game/           # Composants PARTAGÉS entre tous les jeux
├── game-alibi/     # Composants SPÉCIFIQUES au jeu Alibi
├── game-mime/      # Composants SPÉCIFIQUES au jeu Mime
├── ui/             # Composants UI génériques (modals, buttons...)
├── shared/         # Utilitaires partagés (Confetti, Toast...)
├── auth/           # Composants d'authentification
├── layout/         # Layout de l'application (AppShell, Nav...)
├── icons/          # Icônes SVG personnalisées
└── transitions/    # Animations de transition entre écrans
```

## Règles

### Composants partagés (`game/`)
Utilisés par TOUS les jeux multiplayer :
- `Leaderboard.jsx` - Classement des joueurs/équipes
- `QuestionCard.jsx` - Affichage question/réponse (host & asker)
- `HostActionFooter.jsx` - Boutons Révéler/Reset/Passer/Fin
- `Buzzer/` - Système de buzz
- `PlayerManager.jsx` - Gestion des joueurs (kick, etc.)
- `DisconnectAlert.jsx` - Overlay reconnexion
- `GameStatusBanners.jsx` - Banners de statut connexion

### Composants spécifiques (`game-{nom}/`)
Uniquement pour un jeu particulier :
- `game-alibi/` - VerdictTransition, AlibiPhaseTransition...
- `game-mime/` - MimeCard, MimeGame...

### Quand créer un nouveau composant ?

1. **Utilisé par 2+ jeux** → `components/game/`
2. **Spécifique à 1 jeu** → `components/game-{nom}/`
3. **UI générique (pas de logique métier)** → `components/ui/`
4. **Effet visuel partagé** → `components/shared/`
