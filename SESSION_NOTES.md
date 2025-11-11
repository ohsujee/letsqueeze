# Notes de Session - Améliorations UX LetsQueeze

## Session du 9 janvier 2025 : Fixes critiques et buzzer neumorphic

### ✅ Corrections critiques

1. **Input fields invisibles (CRITIQUE)** - Texte blanc sur fond blanc autocomplete résolu
   - Créé classes `.game-input`, `.game-select`, `.game-textarea` dans globals.css
   - Hack webkit-autofill avec `-webkit-box-shadow` inset 1000px
   - Forcé `color: #FFFFFF !important` et `background: rgba(15, 23, 42, 0.8) !important`
   - Appliqué sur 7 inputs dans 6 fichiers (join, alibi/join, room, alibi/room, alibi/prep, alibi/play)

2. **Buzzer redesign neumorphic (majeur)**
   - ❌ Rejeté : Style cartoon SVG (reflets, étoiles) → "gamin et pas professionnel"
   - ✅ Adopté : Design neumorphic moderne 2024 avec radial gradients
   - Taille augmentée : 240x280px → 340x380px (desktop), 200x240px → 300x340px (mobile)
   - Glow réduit : 30-90px → 12-30px max (éviter coupe)
   - États refaits :
     - Success (vert) : vide, pas de texte
     - Active (rouge) : "BUZZ" sans point d'exclamation
     - Blocked (gris) : X blanc SVG stylisé, pas de texte
     - Breathing effect : scale réduit 1.15 → 1.06
   - Fix animation texte : relative → absolute positioning

3. **QR Modal animations**
   - Remplacé animations saccadées par smooth spring physics
   - Custom easing curves `[0.32, 0.72, 0, 1]`
   - Backdrop blur animé : 0px → 8px
   - Stagger delays entre backdrop et contenu
   - Converti en toggle button (show/hide dans même bouton)
   - Retiré header redondant

4. **Boutons menu non-fonctionnels**
   - Problème : Reset/Passer/Terminer dans dropdown ne déclenchaient rien
   - Solution : Restauré boutons en dehors du dropdown en flex layout
   - Supprimé état `menuOpen` et CSS `.menu-overlay`, `.menu-dropdown`
   - Ajouté console.log debug extensif

5. **Erreurs Framer Motion `currentColor`**
   - Corrigé 4 instances dans 2 fichiers :
     - `components/Buzzer.jsx` : Split ring pulse en 2 cercles (#EF4444, #F97316)
     - `components/Buzzer.jsx` : text-shadow → `rgba(255, 255, 255, 0.6)`
     - `components/AnimatedLeaderboard.jsx` : Score players animation (#FFFFFF)
     - `components/AnimatedLeaderboard.jsx` : Score teams animation (#FFFFFF)

6. **Audio autoplay errors**
   - Ajouté promise catch handlers dans `useSound` hook
   - Gestion silencieuse avec `console.debug` au lieu d'erreurs

### 📦 Fichiers modifiés (13)

**CSS/Styles:**
- `app/globals.css` - Classes game-input avec contraste forcé

**Forms (7 inputs):**
- `app/join/page.client.jsx`
- `app/alibi/join/page.client.jsx`
- `app/alibi/room/[code]/page.jsx`
- `app/alibi/game/[code]/prep/page.jsx`
- `app/room/[code]/page.jsx`
- `app/alibi/game/[code]/play/page.jsx`

**Components:**
- `lib/components/QrModal.jsx` - Animations refaites + toggle button
- `components/Buzzer.jsx` - Redesign neumorphic complet
- `components/AnimatedLeaderboard.jsx` - Fix currentColor

**Pages:**
- `app/game/[code]/host/page.jsx` - Boutons restaurés hors dropdown
- `app/game/[code]/play/page.jsx` - useSound avec error handling
- `app/end/[code]/page.jsx` - Error handling lobby return

### 🎯 Design tokens appliqués

**Neumorphisme buzzer:**
- Gradients radiaux multi-couches (3 stops: 0%, 50%, 100%)
- Shadows multiples : inset + extérieures combinées
- Couleurs actives : #FCA5A5 → #EF4444 → #B91C1C
- Couleurs bloquées : #CBD5E1 → #94A3B8 → #64748B
- Glow : filter blur(12-30px) + opacity 0.4-0.6

**Accessibilité maintenue:**
- Touch targets : 44px minimum (WCAG AA)
- Contraste texte : forcé FFFFFF sur fonds sombres
- Safe areas : iOS notch/indicator respectés

### 📝 Feedback utilisateur clés

- "absolument" critique de fixer lisibilité inputs
- "gamin et pas fait par un professionnel" → rejet cartoon SVG
- "c'est encore plus coupé" → réduction glow au lieu d'augmentation
- Préférence pour boutons directs vs dropdown caché
- "0 Problème de lisibilité" comme objectif

---

## Session précédente : Refonte UX complète

### ✅ Travail effectué

1. **Auto room creation** - Supprimé pages /host et /alibi intermédiaires
2. **Host screen simplifié** - 5 boutons → 2 + menu dropdown
3. **QR Modal** - QR codes en popup au lieu d'inline
4. **Touch targets** - Tous les boutons minimum 44px (WCAG)
5. **Safe-area-inset** - Support iOS notch/home indicator
6. **Buzzer redesign** - SVG cartoon avec glow (viewBox élargi pour éviter coupe)
7. **Team management** - Composants TeamTabs + PlayerTeamView (tabs au lieu de grille)
8. **Text readability** - Fonts plus grandes, line-height amélioré, couleurs plus contrastées
9. **Lobby mobile-first** - Layout réorganisé avec grid responsive

### 📦 Nouveaux composants créés

- `lib/components/TeamTabs.jsx` - Interface tabs pour gestion équipes (host)
- `lib/components/PlayerTeamView.jsx` - Vue compacte équipes (players)
- `lib/components/QrModal.jsx` - Modal popup QR code

### 🎨 Modifications design tokens

- Font sizes: xs (12→13px), sm (14→15px)
- Line heights: augmentés pour lisibilité
- Text colors: secondary/tertiary plus clairs
- Opacity: remplacé 60/70 par 85+

### 🎯 Prochaines étapes possibles

- [ ] Appliquer mêmes améliorations UX au mode Alibi
- [ ] Tests sur vrais devices mobiles
- [ ] Animations/transitions entre écrans
- [ ] Dark mode toggle
- [ ] Accessibility audit complet

---

**Fichiers principaux modifiés:**
- `components/Buzzer.jsx` - SVG cartoon redesign
- `app/room/[code]/page.jsx` - Layout lobby mobile-first
- `app/design-tokens.css` - Tokens de lisibilité
- `app/globals.css` - Typography & opacity utilities
- `app/home/page.jsx` - Auto room creation
