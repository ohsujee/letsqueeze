# Correction Clavier Sémantique — iOS 1.0.3 (build 18)

## Problème

Sur iOS/iPad, quand le clavier s'ouvre dans le jeu Sémantique :
1. Le header ("Sémantique") disparaissait — toute la page remontait
2. La zone de saisie restait bloquée derrière le clavier au lieu de se positionner au-dessus

## Cause racine

iOS WKWebView utilise une `UIScrollView` native sous le moteur web. Quand un input
reçoit le focus, iOS modifie le `contentOffset` de cette scroll view au niveau UIKit,
**en dehors du contrôle CSS** (`overflow: hidden` n'empêche pas ça).

Côté JS, `visualViewport.resize` fired parfois sur des valeurs intermédiaires pendant
l'animation du clavier → positionnement instable.

## Solution implémentée (v1.0.3)

### Natif — ViewController.swift

**`isScrollEnabled = false`** sur le WKScrollView principal :
- iOS ne peut plus changer le `contentOffset` → page ne scrolle plus
- Les `overflow: auto` CSS (semantic-scroll-area, etc.) ne sont pas affectés

**UIKeyboardWillShowNotification / WillHide** :
- Fire AVANT l'animation avec la hauteur finale exacte (pas d'intermédiaire)
- Envoie un event JS `native-keyboard-show` / `native-keyboard-hide` avec la hauteur
- Gère le clavier flottant iPad : si le clavier n'est pas ancré en bas → height = 0

**Info.plist** :
- `armv7` → `arm64` (architecture correcte, armv7 obsolète depuis iPhone 5s)
- `ITSAppUsesNonExemptEncryption = false` (évite la question annuelle Apple)

### JS — page.jsx (semantique)

Architecture propre en deux couches :

```
iOS natif  → 'native-keyboard-show' event → applyKb(height) exacte
Android/web → visualViewport.resize fallback → applyKb(innerHeight - vv.height)
```

- Plus de body-lock (`position: fixed` sur body)
- Plus de `window.scrollTo` qui se battait avec iOS
- Plus de debounce/timers multiples
- `onFocus` garde juste le lock de `scrollAreaRef` (empêche la liste de scroller)

## Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `ios/App/App/ViewController.swift` | `isScrollEnabled = false` + keyboard notifications |
| `ios/App/App/Info.plist` | `arm64`, `ITSAppUsesNonExemptEncryption` |
| `ios/App/App.xcodeproj/project.pbxproj` | Build 17→18, version 1.0.2→1.0.3 |
| `app/daily/semantique/page.jsx` | Simplification, écoute `native-keyboard-show/hide` |

## A vérifier quand la MAJ est installée

- [ ] Header reste visible quand le clavier s'ouvre
- [ ] Zone de saisie au-dessus du clavier, collée au bord supérieur
- [ ] Fonctionne à chaque ouverture/fermeture du clavier
- [ ] Clavier flottant iPad : zone de saisie reste en bas (pas décalée)
- [ ] La liste de guesses reste en haut (dernière tentative visible)
- [ ] Android : comportement inchangé

## Historique des tentatives précédentes (pour mémoire)

1. `contentInsetAdjustmentBehavior = .never` → bloque contentInset mais pas contentOffset
2. `window.scrollTo(0,0)` dans vv.resize → trop tardif, 1 seule fois
3. body-lock `position: fixed` → partiellement efficace mais vv.resize instable
4. Debounce 80ms + timeout 350ms → atténue mais ne résout pas le timing
