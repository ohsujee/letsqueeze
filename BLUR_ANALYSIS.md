# Analyse des effets Blur - Android WebView

> Analyse complète des `backdrop-filter` et `filter: blur()` pour résoudre les problèmes de rendu sur Android WebView.

---

## Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| **Fichiers avec blur** | 30 |
| **Total occurrences** | 121+ |
| `backdrop-filter` | ~90 |
| `filter: blur()` | ~31 |

**Problème identifié** : Android WebView crash/glitch quand plusieurs `backdrop-filter` sont visibles simultanément, surtout avec des valeurs élevées (>20px).

---

## Fichiers critiques (à corriger en priorité)

### 1. ErrorBoundary.jsx - RISQUE CRITIQUE

**Chemin** : `components/shared/ErrorBoundary.jsx`

| Ligne | Effet | Valeur |
|-------|-------|--------|
| 94 | `filter: blur()` | 80px |
| 127 | `backdrop-filter` | 20px |
| 337 | `filter: blur()` | 80px |
| 370 | `backdrop-filter` | 24px |

**Problème** : 80px de blur sur éléments décoratifs + 20-24px sur cartes = GPU Android surchargé

**Solution** : Réduire blur(80px) → blur(20px) ou supprimer les glows

---

### 2. BlindTestHostView.jsx - RISQUE ÉLEVÉ

**Chemin** : `components/game/BlindTestHostView.jsx`

| Ligne | Effet | Valeur |
|-------|-------|--------|
| 1503 | `backdrop-filter` | 20px |
| 1580 | `backdrop-filter` | 20px |
| 1636 | `backdrop-filter` | 2px |
| 1931 | `backdrop-filter` | 20px |
| 2151 | `filter: blur()` | 40px |

**Problème** : 6 effets blur potentiellement visibles simultanément

**Solution** : Réduire blur(40px) → blur(20px)

---

### 3. globals.css - RISQUE ÉLEVÉ

**Chemin** : `app/globals.css`

- 16 `backdrop-filter` occurrences
- 4 `filter: blur()` occurrences
- Inclut un `blur(100px)` !

**Classes affectées** :
- `.card` : blur(20px)
- `.btn` : blur(10px)
- `.bottom-nav` : blur(10px)
- `.game-card` : blur(10px)
- Divers modals : blur(20px), blur(30px)

**Problème** : Buttons + cards + modals peuvent tous être visibles = stacking de blur

**Solution** : Supprimer blur(100px), limiter à blur(20px) max

---

### 4. GameEndTransition.jsx - RISQUE ÉLEVÉ

**Chemin** : `components/transitions/GameEndTransition.jsx`

- 3 `backdrop-filter` : 20px, 24px, 8px
- 2 `filter: blur()`

**Problème** : Plusieurs couches de transition avec blur superposés

**Solution** : Standardiser à blur(20px), limiter à 1 couche

---

### 5. Transitions Alibi - RISQUE MOYEN

**Fichiers** :
- `components/game-alibi/AlibiPhaseTransition.jsx`
- `components/game-alibi/AlibiSpectatorView.jsx`
- `components/game-alibi/VerdictTransition.jsx`
- `components/game-alibi/AlibiRoundTransition.jsx`

**Problème** : Utilisent blur(24px) - valeur non-standard

**Solution** : Standardiser à blur(20px)

---

## Inventaire complet par intensité

| Valeur | Occurrences | Statut | Action |
|--------|-------------|--------|--------|
| `blur(100px)` | 1 | CRITIQUE | Supprimer |
| `blur(80px)` | 2 | CRITIQUE | Réduire à 20px |
| `blur(60px)` | 1 | CRITIQUE | Réduire à 20px |
| `blur(40px)` | 2 | ÉLEVÉ | Réduire à 20px |
| `blur(30px)` | 7 | ÉLEVÉ | Réduire à 20px |
| `blur(24px)` | 6 | MOYEN | Standardiser à 20px |
| `blur(20px)` | 49 | OK | Garder |
| `blur(12px)` | 12 | OK | Garder |
| `blur(10px)` | 26 | OK | Garder |
| `blur(8px)` | 20 | OK | Garder |
| `blur(4px)` | 2 | OK | Garder |
| `blur(2px)` | 2 | OK | Garder |

---

## Scénarios de stacking problématiques

### Scénario 1 : Jeu + Banner de statut
```
GamePlayHeader (blur 10px)
+ ConnectionLostBanner (blur 10px)
+ Contenu du jeu derrière
= 2 backdrop-filters simultanés
```

### Scénario 2 : Stack de modals
```
Card de base (blur 20px)
+ Modal backdrop (blur 20px)
+ QR code modal (blur 20px)
= 3+ couches de blur = GPU thrashing
```

### Scénario 3 : Error Boundary (PIRE)
```
Overlay plein écran
+ Background glows (filter: blur 80px)
+ Error card (backdrop-filter: blur 20px)
= Android WebView échoue complètement
```

### Scénario 4 : BlindTest Reveal
```
Host view card (blur 20px)
+ Reveal overlay (blur 20px)
+ Background glow (filter: blur 40px)
= 3 valeurs de blur différentes en compétition
```

---

## Plan de correction

### Phase 1 - Urgente (fix crashes)

1. **ErrorBoundary.jsx**
   - Ligne 94 : `blur(80px)` → `blur(20px)` ou supprimer
   - Ligne 337 : `blur(80px)` → `blur(20px)` ou supprimer

2. **globals.css**
   - Supprimer `blur(100px)`
   - Réduire `blur(30px)` → `blur(20px)`

3. **BlindTestHostView.jsx**
   - Ligne 2151 : `blur(40px)` → `blur(20px)`

### Phase 2 - Standardisation

1. Remplacer tous les `blur(24px)` → `blur(20px)`
2. Remplacer tous les `blur(30px)` → `blur(20px)`
3. Limiter à max 2 backdrop-filter visibles simultanément

### Phase 3 - Optimisation GPU

Ajouter aux éléments avec blur :
```css
.element-with-blur {
  will-change: opacity;
  transform: translateZ(0);
  contain: layout style paint;
}
```

---

## Liste complète des fichiers affectés

### CSS (3 fichiers)
- `app/globals.css` - 20 occurrences
- `app/styles/effects.css` - 12 occurrences
- `app/(main)/profile/profile.css` - 4 occurrences

### Composants (27 fichiers)

**Risque critique/élevé :**
- `components/shared/ErrorBoundary.jsx` - 6 occurrences
- `components/game/BlindTestHostView.jsx` - 6 occurrences
- `components/transitions/GameEndTransition.jsx` - 5 occurrences

**Risque moyen :**
- `components/game-alibi/AlibiPhaseTransition.jsx` - 4 occurrences
- `components/game-alibi/AlibiSpectatorView.jsx` - 4 occurrences
- `components/game-alibi/VerdictTransition.jsx` - 4 occurrences
- `lib/components/QrModal.jsx` - 3 occurrences
- `components/game/Leaderboard.jsx` - 3 occurrences

**Risque faible :**
- `components/game/AskerTransition.jsx` - 2 occurrences
- `components/game/ConnectionLostBanner.jsx` - 2 occurrences
- `components/game/DisconnectAlert.jsx` - 2 occurrences
- `components/game/GamePlayHeader.jsx` - 2 occurrences
- `components/game/HostDisconnectAlert.jsx` - 2 occurrences
- `components/game/HostDisconnectedBanner.jsx` - 2 occurrences
- `components/game/LobbyDisconnectAlert.jsx` - 2 occurrences
- `components/game/LobbySettings.jsx` - 2 occurrences
- `components/game/MimeGuesserView.jsx` - 2 occurrences
- `components/game/PlayerManager.jsx` - 2 occurrences
- `components/game/QuestionHostCard.jsx` - 2 occurrences
- `components/game/QuizHostView.jsx` - 2 occurrences
- `components/game-alibi/AlibiRoundTransition.jsx` - 2 occurrences
- `components/ui/GameModeSelector.jsx` - 2 occurrences
- `lib/components/PlayerTeamView.jsx` - 2 occurrences
- `components/ui/HowToPlayModal.jsx` - 1 occurrence
- `components/game/PointsRing.jsx` - 1 occurrence

### Pages avec blur inline
- `app/game/[code]/play/page.jsx`
- `app/blindtest/game/[code]/play/page.jsx`
- `app/alibi/game/[code]/prep/page.jsx`
- `app/alibi/game/[code]/play/page.jsx`
- `app/alibi/game/[code]/end/page.jsx`
- `app/laregle/game/[code]/play/page.jsx`
- `app/laregle/game/[code]/end/page.jsx`
- `app/laregle/room/[code]/page.jsx`
- `app/(main)/profile/stats/page.jsx`
- `app/(main)/profile/hue/page.jsx`
- `app/subscribe/page.jsx`
- `app/terms/page.jsx`
- `app/privacy/page.jsx`
- `app/legal/page.jsx`

---

## Sources

- [Capacitor backdrop-filter crash](https://github.com/ionic-team/capacitor/issues/7450)
- [Ionic Forum - backdrop-filter lags](https://forum.ionicframework.com/t/backdrop-filter-blur-causes-lags-in-webview/240934)
- [React Native WebView black box issue](https://github.com/react-native-webview/react-native-webview/issues/3469)
- [Alternatives sans backdrop-filter](https://dev.to/rolandixor/achieving-backdrop-blur-without-backdrop-filter-16ii)
- [CSS-Tricks - Performance tips](https://css-tricks.com/almanac/properties/b/backdrop-filter/)

---

*Dernière mise à jour : 2026-02-04*
