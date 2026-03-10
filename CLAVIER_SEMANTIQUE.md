# Clavier Sémantique — État actuel

## Problèmes

Sur iOS, quand le clavier s'ouvre dans le jeu Sémantique :
1. **Zone input** : ✅ RÉSOLU — la zone texte monte au-dessus du clavier (JS live)
2. **Header shift** : ❌ NON RÉSOLU — le header bouge/scroll quand le clavier s'ouvre

---

## Cause racine du header shift

**Le WKWebView natif se redimensionne quand le clavier apparaît.**

Par défaut (sans `@capacitor/keyboard`), iOS redimensionne le WebView entier.
Aucun fix JS/CSS ne peut empêcher ce comportement natif de manière fiable.

Tentatives JS/CSS échouées (pour référence, ne pas réessayer) :
- ❌ Désactiver `resize` listener dans AppShell → le resize vient du natif, pas du JS
- ❌ Figer `--app-height` → le viewport natif change quand même
- ❌ Figer `--safe-area-bottom` → `getPropertyValue()` retourne le token `env()`, pas la valeur pixel
- ❌ Lire `getComputedStyle(appShell).paddingBottom` → fige la variable mais le WebView resize quand même
- ❌ `overflow: hidden` sur `.semantic-page` → le scroll vient du WKScrollView natif, pas du CSS
- ❌ `baseHeightRef` au lieu de `window.innerHeight` → n'empêche pas le resize natif
- ❌ Couper `visualViewport.resize` sur iOS → n'est pas la source du shift

**Pourquoi `additionalSafeAreaInsets.bottom` est nuisible :**
- Avec `contentInsetAdjustmentBehavior = .never`, cette valeur ne se propage PAS vers `env(safe-area-inset-bottom)` en CSS (contrairement à ce qu'on pensait initialement)
- MAIS l'animation `UIView.animate` + `self.view.layoutIfNeeded()` cause des layout passes supplémentaires
- À retirer dans le prochain build natif

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

### Natif — `ViewController.swift` (build 1.0.6)

- `isScrollEnabled = false` sur WKScrollView
- `contentInsetAdjustmentBehavior = .never`
- `keyboardWillChangeFrame` (unique, couvre tous les états clavier)
- `additionalSafeAreaInsets` animé (à retirer — voir section "Prochain build")
- `evaluateJavaScript` dispatche `native-keyboard-show/hide` avec hauteur
- KVO sur `contentOffset` → reset à `.zero` (anti-blink scroll)

---

## Fix définitif — Prochain build natif

### 1. Installer `@capacitor/keyboard`

```bash
npm install @capacitor/keyboard
```

### 2. Configurer `capacitor.config.ts`

```typescript
plugins: {
  Keyboard: {
    resize: 'none'  // Le WebView ne resize PAS quand le clavier apparaît
  },
  // ... autres plugins existants
}
```

`resize: 'none'` = ni l'app ni le WebView ne sont redimensionnés quand le clavier s'ouvre.
C'est la solution standard de la communauté Capacitor (cf. capacitor/issues/1366).

### 3. Nettoyer `ViewController.swift`

Retirer l'animation `additionalSafeAreaInsets.bottom` (lignes 94-101) :
```swift
// SUPPRIMER ce bloc :
UIView.animate(
    withDuration: safeDuration,
    delay: 0,
    options: [animOptions, .beginFromCurrentState]
) {
    self.additionalSafeAreaInsets.bottom = insetsHeight
    self.view.layoutIfNeeded()
}
```

Garder uniquement le dispatch JS (`evaluateJavaScript`) et le KVO anti-blink.

### 4. Build

```bash
npx cap sync
# Puis build Xcode / CodeMagic → Submit App Store
```

### Checklist de validation post-build

- [ ] Header reste FIXE quand le clavier s'ouvre (pas de bounce/shift)
- [ ] Zone de saisie au-dessus du clavier
- [ ] Fonctionne à chaque ouverture/fermeture (pas intermittent)
- [ ] Header NON scrollable quand clavier est ouvert
- [ ] Clavier flottant iPad : zone reste en bas
- [ ] La liste scrollable fonctionne normalement
- [ ] Android : comportement inchangé

---

## Références

- [Capacitor #1366 — WebView jumps when keyboard shows](https://github.com/ionic-team/capacitor/issues/1366)
- [Capacitor Keyboard Plugin Documentation](https://capacitorjs.com/docs/apis/keyboard)
- [Codemzy — iOS keyboard hiding sticky header](https://www.codemzy.com/blog/sticky-fixed-header-ios-keyboard-fix)
