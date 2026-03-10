# Clavier Sémantique — État au build 1.0.5+

## Problème résumé

Sur iOS, quand le clavier s'ouvre dans le jeu Sémantique :
1. **Zone input** : reste bloquée derrière le clavier (fixé côté JS)
2. **Blink** : le header + contenu descend puis remonte au moment de l'ouverture du clavier

---

## Architecture actuelle (live)

### JS — `app/daily/semantique/page.jsx`

Deux couches :
```
iOS natif  → 'native-keyboard-show' event → applyKb(height)
Android/web → visualViewport.resize fallback → applyKb(innerHeight - vv.height)
```

- `nativeKbActiveRef` : true quand iOS natif gère (empêche conflit avec vv fallback)
- Guard `height > 0` : ignore les events iPad avec frame intermédiaire
- `window.scrollTo(0, 0)` dans `onNativeShow` : reset immédiat
- `onFocus` polls [150/300/500ms] : filet de sécurité si height=0 au premier event

### Natif — `ViewController.swift` (build 1.0.5)

- `isScrollEnabled = false` sur WKScrollView
- `contentInsetAdjustmentBehavior = .never`
- `keyboardWillChangeFrame` (unique, couvre tous les états clavier)
- `additionalSafeAreaInsets` animé (inefficace pour le blink — voir ci-dessous)
- `evaluateJavaScript` dispatche `native-keyboard-show/hide` avec hauteur

---

## Le blink — cause et fix

**Cause** : iOS appelle `scrollRectToVisible` de façon synchrone dans le thread natif quand un `<input>` reçoit le focus. Cela change le `contentOffset` du WKScrollView AVANT que le moindre JS s'exécute. Résultat : le header/contenu descend d'un frame puis remonte.

**Pourquoi `additionalSafeAreaInsets` n'a pas marché** : avec `contentInsetAdjustmentBehavior = .never`, les safe area insets additionnels ne se propagent pas vers `env(safe-area-inset-bottom)` en CSS. iOS ne voit donc pas l'input "au-dessus du clavier" et continue d'appeler `scrollRectToVisible`.

**Fix codé et prêt** (`ViewController.swift`) :

```swift
// Dans viewDidLoad :
webView?.scrollView.addObserver(self, forKeyPath: "contentOffset", options: [.new], context: nil)

// Méthode :
override func observeValue(forKeyPath keyPath: String?, ...) {
    if keyPath == "contentOffset",
       let sv = webView?.scrollView,
       sv.contentOffset != .zero {
        sv.layer.removeAllAnimations()   // annule la CA animation
        sv.setContentOffset(.zero, animated: false)  // reset synchrone
        return
    }
    super.observeValue(...)
}

// deinit :
webView?.scrollView.removeObserver(self, forKeyPath: "contentOffset")
```

C'est l'équivalent exact de `scrollView.delegate = self` + `scrollViewDidScroll` reset (cf. capacitor/issues/1366). Intercepte dans le thread natif, avant le premier paint → zéro blink.

---

## À faire pour builder

Seul fichier natif modifié (pas encore buildé) : `ios/App/App/ViewController.swift`

1. `npx cap sync`
2. Build Xcode / CodeMagic
3. Submit App Store

---

## Checklist de validation post-build

- [ ] Header reste visible quand le clavier s'ouvre (pas de bounce)
- [ ] Zone de saisie au-dessus du clavier
- [ ] Fonctionne à chaque ouverture/fermeture
- [ ] Clavier flottant iPad : zone reste en bas
- [ ] La liste reste en haut au focus
- [ ] Android : comportement inchangé
