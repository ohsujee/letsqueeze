# Roadmap Blind Test

## Fonctionnalités à venir

---

### 1. Mode "Audio Centralisé" (Son depuis l'hôte uniquement)

**Contexte:**
En Party Mode, l'asker tourne entre les joueurs. Actuellement, le son vient du téléphone de l'asker actuel. Problème : qualité variable, pas possible de brancher une enceinte fixe.

**Objectif:**
Permettre à l'hôte de connecter son téléphone à une enceinte (Bluetooth/jack) et que TOUT l'audio passe par son appareil, même quand il n'est pas l'asker.

**UX proposée:**

1. **Settings Lobby** : Toggle "Son depuis l'hôte uniquement"
   - Activé par défaut en Party Mode
   - Désactivable si on veut le comportement actuel

2. **Flux de jeu :**
   - Asker voit les contrôles (play niveau, valider, faux, skip)
   - Asker déclenche les actions → update Firebase state
   - Téléphone hôte écoute `state.audioCommand` et joue l'audio
   - Hôte peut être dans la même room sur `/host` ou page dédiée `/audio`

**Implémentation technique:**

```
Firebase state:
  audioCommand: {
    action: 'play' | 'stop' | 'playReveal',
    snippetLevel: 0-4,
    previewUrl: 'https://...',
    timestamp: serverTimestamp
  }
```

**Fichiers à modifier:**
- `components/game/BlindTestHostView.jsx` - Séparer les contrôles de l'audio
- `app/blindtest/game/[code]/host/page.jsx` - Écouter audioCommand si mode centralisé
- `components/game/LobbySettings.jsx` - Ajouter toggle
- `lib/hooks/useAudioPlayer.js` (nouveau) - Hook réutilisable pour jouer l'audio

**Priorité:** Moyenne
**Complexité:** Moyenne (2-3h)

---

### 2. [Placeholder pour futures fonctionnalités]

---

*Dernière mise à jour: 2026-02-06*
