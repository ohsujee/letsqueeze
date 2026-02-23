# Subscribe Page — Plan de Redesign

> Document de référence pour la refonte de `/subscribe/page.jsx`.
> Ne pas modifier le fichier original avant validation.

---

## 1. Problèmes Actuels

### Copy incorrecte (limitations)

Ligne 209 de `app/subscribe/page.jsx` :
```
"3 parties gratuites/jour par jeu"
```
→ **Faux.** Le système utilise 5 cœurs/jour (pas 3 parties par jeu).

**Correction :**
```
"5 cœurs offerts par jour, remis à zéro chaque matin"
```

La limitation "Pubs non-skippables pour jouer plus" est aussi à revoir une fois le système
de recharge (regarder une vidéo) actif.

---

## 2. Design Actuel — Éléments à Supprimer (Glow)

| Élément | Ligne | Problème |
|---------|-------|----------|
| `.subscribe-glow` div | 158 | Blob pulsant violet en haut, trop flashy |
| `@keyframes pulse` | 448–451 | Animation du glow |
| `.subscribe-glow` style | 435–451 | CSS du glow |
| `text-shadow` sur `.hero-title` | 534 | `0 0 30px rgba(139, 92, 246, 0.5)` |
| `text-shadow` sur `.header-title` | 493 | `0 0 20px rgba(139, 92, 246, 0.4)` |
| `box-shadow` glow sur `.hero-crown` | 522–526 | `0 8px 30px rgba(139,92,246,0.5)` |
| `box-shadow` glow sur `.cta-button` | 785–787 | `0 8px 24px rgba(139,92,246,0.4)` |
| `box-shadow` glow sur `.plan-card.selected` | 623 | `0 0 20px rgba(139,92,246,0.2)` |
| `box-shadow` glow sur `.pro-active-icon` | 1003–1005 | `0 4px 12px rgba(251,191,36,0.4)` |
| `text-shadow` sur `.pro-active-title` | 1013 | `0 0 20px rgba(251,191,36,0.4)` |

---

## 3. Design Cible — Style Flat

### Principe
Remplacer tous les glow/blur par des ombres solides offset (comme le reste de l'app).

### Bouton CTA (`.cta-button`)
```css
/* Avant */
box-shadow:
  0 4px 0 #6d28d9,
  0 8px 24px rgba(139, 92, 246, 0.4),
  inset 0 1px 0 rgba(255, 255, 255, 0.2);

/* Après */
box-shadow:
  0 4px 0 #6d28d9,
  inset 0 1px 0 rgba(255, 255, 255, 0.2);
```

### Hero Crown (`.hero-crown`)
```css
/* Avant */
box-shadow:
  0 4px 0 #6d28d9,
  0 8px 30px rgba(139, 92, 246, 0.5),
  inset 0 2px 0 rgba(255, 255, 255, 0.2);

/* Après */
box-shadow:
  0 4px 0 #6d28d9,
  inset 0 2px 0 rgba(255, 255, 255, 0.2);
```

### Plan Card Selected (`.plan-card.selected`)
```css
/* Avant */
box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);

/* Après */
/* Supprimer box-shadow, garder juste border-color: #8b5cf6 */
```

### Titres (`.hero-title`, `.header-title`)
```css
/* Supprimer les text-shadow */
```

### Supprimer l'élément `.subscribe-glow`
```jsx
{/* Supprimer cette div : */}
<div className="subscribe-glow" />
```

---

## 4. Checklist Implémentation

- [ ] Corriger la copy dans `.limitations-list` : "5 cœurs offerts par jour, remis à zéro chaque matin"
- [ ] Supprimer `<div className="subscribe-glow" />` du JSX
- [ ] Supprimer les styles CSS du glow (`.subscribe-glow`, `@keyframes pulse`)
- [ ] Retirer `text-shadow` sur `.hero-title` et `.header-title`
- [ ] Retirer le glow de `box-shadow` sur `.hero-crown`, `.cta-button`, `.plan-card.selected`
- [ ] Retirer le glow de `.pro-active-icon` et `text-shadow` de `.pro-active-title`
- [ ] Tester le rendu sur mobile (iOS + Android)

---

*Créé le 2026-02-23*
