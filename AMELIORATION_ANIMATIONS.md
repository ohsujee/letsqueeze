# Amélioration Animations & Fluidité du Jeu

> Roadmap complète pour transformer l'expérience visuelle de Gigglz.
> Chaque section détaille le problème actuel, la solution proposée, et les fichiers impactés.

---

## RÈGLE D'OR — Animations Cosmétiques Only

**JAMAIS une animation ne doit influencer ou retarder l'affichage d'une donnée réelle.**

- Les animations sont **purement visuelles** (cosmétiques)
- La valeur affichée doit **toujours refléter la donnée Firebase en temps réel**
- Si une animation est en cours et qu'une nouvelle valeur arrive : **retarget immédiat** (pas de file d'attente)
- Les animations de score utilisent `useSpring` qui retarget naturellement — mais on ne doit **jamais bloquer un render** en attendant qu'une animation finisse
- Pattern sûr : `useSpring(targetValue)` → le spring se retarget automatiquement, la valeur finale est toujours correcte
- Pattern dangereux : `setTimeout` / `delay` avant d'afficher une valeur → la donnée affichée peut être en retard

**Exemple concret :**
```
❌ INTERDIT : Attendre 600ms d'animation avant d'afficher le nouveau score
✅ CORRECT  : Le score spring retarget immédiatement, l'animation s'adapte en douceur
```

---

## PRIORITÉ 1 — Splash Screen (Première impression)

### 1.1 Barre de chargement → Grosse pilule cartoon

**Problème actuel :**
- Barre de 140px × 3px — quasi invisible
- Gradient linéaire basique (purple → orange → green)
- Positionnée tout en bas, facile à rater

**Solution :**
- **Dimensions :** largeur ~70vw (max 300px), hauteur 14-16px
- **Forme :** `border-radius: 999px` (pilule parfaite)
- **Fond :** Track sombre semi-transparent (`rgba(255,255,255,0.1)`) avec `border-radius` identique
- **Remplissage :** Gradient animé qui avance de gauche à droite
  - Couleurs : gradient qui cycle entre les couleurs des jeux (purple → orange → cyan → green)
  - Effet "liquid/cartoon" : le gradient bouge légèrement à l'intérieur (background-position animé)
- **Shine :** Un reflet blanc semi-transparent (pseudo-element `::after`) qui glisse de gauche à droite en boucle sur la barre remplie
- **Position :** Centrée horizontalement, ~60px au-dessus du bas (au lieu de collée au bord)

**Fichiers :**
- `app/splash/page.jsx` — structure HTML de la barre
- `app/splash/splash.css` ou styles inline — nouveau design

**Détail technique :**
```css
.splash-progress-track {
  width: 70vw;
  max-width: 300px;
  height: 14px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}

.splash-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8b5cf6, #f59e0b, #06b6d4, #00ff66);
  background-size: 200% 100%;
  animation: gradient-slide 2s linear infinite;
  transition: width 1200ms linear;
  position: relative;
}

.splash-progress-fill::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  border-radius: 999px;
  animation: shine-slide 1.5s ease-in-out infinite;
}

@keyframes gradient-slide {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

@keyframes shine-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
```

---

### 1.2 Transition Splash → Home orchestrée

**Problème actuel :**
- Le splash fait `opacity: 0` + `scale: 1.05` en 400ms
- Le home apparaît avec un fade générique de 200ms (PageTransition)
- Résultat : le splash disparaît, puis le home "apparaît" — pas de continuité

**Solution — Séquence en 3 temps :**

**Temps 1 — Exit du splash (400ms) :**
- Le logo Gigglz **scale down** (1 → 0.8) + **monte légèrement** (translateY: -20px)
- Les orbs **s'évanouissent** (opacity → 0)
- La barre de progression **disparaît** (opacity → 0, scale → 0.9)
- Le fond reste sombre (pas de flash blanc)

**Temps 2 — Fond de transition (200ms) :**
- Le fond sombre du splash **persiste** — pas de coupure
- Le contenu du home commence à se préparer (off-screen, opacity 0)

**Temps 3 — Entrée du Home (600ms total, staggeré) :**
- **Header** : slide-down depuis y: -30px → 0, opacity 0 → 1 (delay: 0ms, durée: 300ms)
- **Titre "Jouer"** : fade-in + légère montée y: 15px → 0 (delay: 100ms, durée: 300ms)
- **GameCards** : apparition en cascade
  - Card 1 : delay 150ms, scale 0.85 → 1 + opacity 0 → 1, spring (stiffness: 300, damping: 22)
  - Card 2 : delay 230ms, même animation
  - Card 3 : delay 310ms, même animation
  - Card N : delay 150 + (N × 80)ms
- **Bottom nav** : slide-up depuis y: 20px → 0 (delay: 400ms, durée: 250ms)

**Implémentation :**
- Flag `comingFromSplash` passé via query param ou sessionStorage
- Le home page détecte ce flag et joue l'entrée orchestrée (seulement la première fois)
- Les navigations normales vers /home gardent le PageTransition standard

**Fichiers :**
- `app/splash/page.jsx` — exit animation améliorée + flag
- `app/(main)/home/page.jsx` — entrée orchestrée conditionnelle
- `components/layout/PageTransition.jsx` — ne pas interférer avec l'entrée custom

---

## PRIORITÉ 2 — Entrée du Home (GameCards)

### 2.1 Stagger des GameCards

**Problème actuel :**
- Toutes les cards apparaissent en même temps via le PageTransition global
- Pas de cascade, pas de bounce — apparition plate

**Solution :**
- Wrapper chaque `GameCard` dans un `motion.div` avec stagger
- Animation par card : `initial={{ opacity: 0, y: 25, scale: 0.92 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}`
- Easing : spring avec `stiffness: 350, damping: 24` (bounce subtil)
- Stagger : 80ms entre chaque card
- Durée par card : ~400ms (spring naturel)

**Fichiers :**
- `app/(main)/home/page.jsx` — wrapping des cards
- Ou créer un composant `StaggeredGrid` réutilisable dans `components/shared/`

---

### 2.2 Hover/Tap amélioré sur les GameCards

**Problème actuel :**
- Hover CSS basique (lift -4px + shadow)
- Pas de feedback au tap sur mobile

**Solution :**
- `whileTap={{ scale: 0.97 }}` sur mobile (feedback immédiat au toucher)
- Transition spring rapide (stiffness: 500) pour que le retour soit snappy
- Léger glow de la couleur du jeu au tap (`box-shadow` avec la couleur primaire du jeu)

**Fichiers :**
- `lib/components/GameCard.jsx` — ajout motion props

---

## PRIORITÉ 3 — Score en jeu (Feedback visuel)

### 3.1 AnimatedScore — Réactiver correctement

**Problème actuel :**
- `AnimatedScore` existe dans `components/shared/AnimatedScore.jsx` mais n'est **importé nulle part**
- Les scores sont du texte brut qui change instantanément
- Pas de feedback visuel quand on gagne des points

**Solution — Spring sûr :**
- Réintégrer `AnimatedScore` dans le header de jeu et le leaderboard
- Utiliser `useSpring` avec retarget immédiat (pas de queue d'animation)
- Si une nouvelle valeur arrive pendant l'animation, le spring s'ajuste automatiquement
- Paramètres : `stiffness: 120, damping: 25, restDelta: 0.5`
  - Assez rapide pour ne pas traîner (finit en ~400ms)
  - Assez doux pour être visible (pas instantané)

**Contraintes de sécurité :**
- La valeur finale du spring est **toujours** la vraie valeur Firebase
- Pas de `Math.round` dans le state — seulement dans l'affichage
- Si le composant unmount pendant l'animation, aucun effet secondaire (le spring est local)
- Le spring retarget automatiquement — pas besoin de cancel/restart manuellement

**Fichiers :**
- `components/shared/AnimatedScore.jsx` — vérifier le code existant, ajuster les paramètres spring
- `app/game/[code]/play/page.jsx` — importer AnimatedScore pour le header score
- `components/game/QuizHostView.jsx` — importer pour l'affichage score côté host
- `components/shared/Leaderboard.jsx` — importer pour chaque ligne de score
- Idem pour DeezTest, LaRegle play/host pages

---

### 3.2 Score flottant "+X" (FloatingPoints)

**Problème actuel :**
- Aucun composant de ce type n'existe
- Quand un joueur gagne des points, le nombre change mais il n'y a aucune indication de combien il a gagné

**Solution — Nouveau composant `FloatingPoints` :**
- Quand le score change : afficher "+X" (ou "-X" en rouge) qui flotte vers le haut et disparaît
- Animation : `y: 0 → -40px`, `opacity: 1 → 0`, durée 900ms, easing easeOut
- Couleur : vert pour +, rouge pour -
- Taille : légèrement plus petite que le score principal
- Position : juste au-dessus du score affiché
- Se déclenche en comparant `prevScore` vs `currentScore` via `useRef`

**Contraintes de sécurité :**
- Purement cosmétique — ne modifie aucune donnée
- Si plusieurs updates arrivent rapidement, les "+X" se stackent (chacun avec son propre cycle de vie)
- Chaque "+X" a un `key` unique (timestamp) pour que React les gère indépendamment
- Auto-cleanup après l'animation (AnimatePresence + exit)

**Calcul du delta :**
```javascript
const prevScoreRef = useRef(score);
const [floatingPoints, setFloatingPoints] = useState([]);

useEffect(() => {
  const delta = score - prevScoreRef.current;
  if (delta !== 0) {
    setFloatingPoints(prev => [...prev, { id: Date.now(), value: delta }]);
    prevScoreRef.current = score;
  }
}, [score]);

// Cleanup après 1s
const removeFloating = (id) => {
  setFloatingPoints(prev => prev.filter(f => f.id !== id));
};
```

**Fichiers :**
- `components/shared/FloatingPoints.jsx` — nouveau composant
- Intégré partout où `AnimatedScore` est utilisé (header, leaderboard player view)

---

## PRIORITÉ 4 — Transitions entre pages contextuelles

### 4.1 Transition contextuelle selon la navigation

**Problème actuel :**
- Toutes les pages utilisent le même `PageTransition` (fade 200ms)
- Aller au profil = même animation que lancer un jeu
- Pas de sensation de profondeur dans la navigation

**Solution — 3 types de transitions :**

**Type A — Navigation latérale (défaut) :**
- Pour : profil, settings, inbox, pages "sœurs"
- Animation : fade crossfade 200ms (comme actuellement)
- Pas de changement nécessaire

**Type B — Entrée dans un jeu (plongée) :**
- Pour : home → lobby, lobby → play
- Animation : scale 0.95 → 1 + opacity 0 → 1 + léger blur qui se dissipe
- Durée : 350ms
- Sensation : "on entre dans quelque chose"

**Type C — Retour (remontée) :**
- Pour : end → home, settings → home, back button
- Animation : slide légèrement vers la droite (x: 0 → 30px) + opacity 1 → 0 pour la page qui part, puis la page précédente fait l'inverse
- Durée : 250ms
- Sensation : "on revient en arrière"

**Implémentation :**
- Utiliser un context (`NavigationContext`) qui stocke la direction
- Le PageTransition lit la direction et applique les variants correspondants
- La direction est déterminée par les routes :
  - `home → room/*` = plongée
  - `room/* → game/*` = plongée
  - `game/* → end/*` = plongée
  - `end/* → home` = retour
  - `* → home` = retour
  - Tout le reste = latéral

**Fichiers :**
- `components/layout/PageTransition.jsx` — 3 sets de variants
- `lib/contexts/NavigationContext.jsx` — nouveau context pour la direction
- `app/(main)/layout.jsx` — provider du context

---

## PRIORITÉ 5 — Lobby (Joueurs qui rejoignent)

### 5.1 Animation d'entrée des joueurs

**Problème actuel :**
- Quand un joueur rejoint, il apparaît dans la liste instantanément
- Pas de feedback visuel "quelqu'un vient de rejoindre"

**Solution :**
- Wrapper la liste de joueurs dans `AnimatePresence`
- Chaque joueur : `initial={{ opacity: 0, x: -20, scale: 0.9 }}` → `animate={{ opacity: 1, x: 0, scale: 1 }}`
- Spring : `stiffness: 400, damping: 25` (pop rapide)
- Exit (déconnexion) : `exit={{ opacity: 0, x: 20, scale: 0.9 }}`, durée 200ms
- Optionnel : petit son "pop" quand un joueur rejoint (si audio activé)

**Fichiers :**
- `app/room/[code]/page.jsx` — liste de joueurs dans le lobby Quiz
- `app/deeztest/room/[code]/page.jsx` — idem DeezTest
- `app/alibi/room/[code]/page.jsx` — idem Alibi
- `app/laregle/room/[code]/page.jsx` — idem LaRegle
- Idéalement : créer un composant `AnimatedPlayerList` réutilisable

---

### 5.2 Compteur de joueurs animé

**Problème actuel :**
- Le nombre de joueurs est du texte brut "3 joueurs"

**Solution :**
- Le nombre utilise `AnimatedScore` (ou un mini-spring)
- Quand le nombre change, petit scale bounce (1 → 1.15 → 1, 300ms)

**Fichiers :**
- Lobbies de tous les jeux (même liste que 5.1)

---

## PRIORITÉ 6 — En jeu (Transitions entre questions)

### 6.1 Sortie/Entrée des questions

**Problème actuel :**
- QuestionReveal fait un 3D flip à l'entrée (bien fait)
- Mais entre deux questions, le remplacement est direct — pas de sortie de la question précédente

**Solution :**
- La question actuelle **sort** : `exit={{ opacity: 0, scale: 0.9, y: -20 }}`, durée 200ms
- Petit délai (150ms) puis la nouvelle question **entre** avec le 3D flip existant
- Utiliser `AnimatePresence mode="wait"` pour séquencer sortie → entrée
- Key : `questionIndex` pour que AnimatePresence détecte le changement

**Fichiers :**
- `components/game/QuestionReveal.jsx` — ajouter exit animation
- `components/game/QuizHostView.jsx` — wrapper avec AnimatePresence mode="wait"
- Idem pour DeezTest si applicable

---

### 6.2 Indicateur de progression visuel

**Problème actuel :**
- Pas d'indicateur visuel clair "question 3/10"
- Le joueur ne sait pas où il en est dans la partie

**Solution :**
- Barre de progression fine en haut de l'écran (sous le header)
- Largeur = `(currentQuestion / totalQuestions) * 100%`
- Couleur du jeu avec transition smooth (`transition: width 500ms ease-out`)
- Hauteur : 3-4px, pas intrusive
- Animation quand elle avance : léger pulse/glow au bout de la barre

**Fichiers :**
- `components/game/QuizHostView.jsx` — ajouter la barre
- Ou composant réutilisable `GameProgressBar`

---

## PRIORITÉ 7 — Fin de partie (Célébration)

### 7.1 Confetti sur l'écran de victoire

**Problème actuel :**
- `triggerConfetti('victory')` est mentionné dans la doc mais **pas implémenté**
- Le podium apparaît sans fanfare

**Solution :**
- Installer `canvas-confetti` (léger, performant, pas de dépendance lourde)
- Déclencher au moment où le podium apparaît
- Config :
  - `particleCount: 100`
  - `spread: 70`
  - `origin: { y: 0.6 }` (part du milieu de l'écran)
  - `colors` : couleurs du jeu actuel
- 2 bursts : un à gauche, un à droite (250ms de décalage)
- Uniquement pour le top 3 (pas de confetti si tu es 8ème)

**Fichiers :**
- `package.json` — ajouter `canvas-confetti`
- `lib/utils/confetti.js` — utilitaire `triggerConfetti(type, gameColors)`
- `app/end/[code]/page.jsx` — déclencher au mount
- `app/deeztest/game/[code]/end/page.jsx` — idem
- `app/laregle/game/[code]/end/page.jsx` — idem

---

### 7.2 Entrée du podium améliorée

**Problème actuel :**
- Le PodiumPremium a des animations internes (medals float, shine) mais l'entrée initiale est basique

**Solution — Séquence orchestrée :**
1. **T=0ms** : Fond apparaît (fade 300ms)
2. **T=200ms** : 3ème place slide-up depuis le bas (y: 100 → 0, spring, 400ms)
3. **T=400ms** : 2ème place slide-up (même animation)
4. **T=600ms** : 1ère place slide-up (spring plus bouncy, stiffness: 250, damping: 18)
5. **T=800ms** : Noms et scores fade-in sous chaque podium
6. **T=900ms** : Confetti burst
7. **T=1200ms** : Reste du classement slide-up en cascade

**Fichiers :**
- `components/ui/PodiumPremium.jsx` — refactor entrée avec stagger

---

## PRIORITÉ 8 — Timer & Urgence

### 8.1 Timer avec urgence progressive

**Problème actuel :**
- Le timer est du texte qui décompte
- Pas de sensation d'urgence quand il reste peu de temps

**Solution — 3 phases :**

**Phase normale (> 50% du temps) :**
- Affichage calme, couleur neutre
- Optionnel : barre de progression circulaire

**Phase attention (25-50% du temps) :**
- Couleur passe à orange
- Léger pulse sur le texte (scale 1 → 1.03 → 1, 1s, infini)

**Phase urgence (< 25% ou < 5s) :**
- Couleur rouge
- Scale pulse plus prononcé (1 → 1.06 → 1, 0.5s)
- Léger shake horizontal (translateX ±1px) sur les dernières 3 secondes
- Optionnel : son de tick-tock

**Contrainte :** L'animation est purement CSS (pas de re-render React à chaque seconde). Le timer texte update via `requestAnimationFrame` ou `setInterval`, les classes CSS changent selon le seuil.

**Fichiers :**
- `components/game/PointsRing.jsx` — déjà a des variants (critical, warning, normal) → enrichir les animations
- `components/game/QuizHostView.jsx` — si timer affiché côté host

---

## PRIORITÉ 9 — Leaderboard vivant

### 9.1 Reorder animé du leaderboard

**Problème actuel :**
- Quand un joueur dépasse un autre au score, les positions changent instantanément
- Des indicateurs ▲▼ apparaissent 3s mais le mouvement est sec

**Solution :**
- Utiliser `AnimatePresence` + `layout` prop de Framer Motion
- Chaque ligne du leaderboard a `<motion.div layout>` → Framer anime automatiquement le repositionnement
- Spring : `type: "spring", stiffness: 300, damping: 30` (mouvement fluide)
- Durée effective : ~400ms pour un swap de position

**Contrainte :** Le `layout` animation de Framer Motion gère automatiquement les repositionnements sans affecter les données. La liste est toujours triée par la vraie valeur Firebase.

**Fichiers :**
- `components/shared/Leaderboard.jsx` — wrapper chaque row avec `motion.div layout`

---

## PRIORITÉ 10 — Animations spécifiques par jeu

### 10.1 La Règle — Animation d'élimination

**Problème actuel :**
- Quand un joueur est éliminé, c'est juste un changement de state
- Pas de moment cinématique "tu es éliminé"

**Solution :**
- Overlay plein écran (1.5s) avec :
  - Fond rouge semi-transparent qui pulse
  - Icône ❌ qui scale-in avec spring bouncy
  - Texte "[Nom] est éliminé !" qui fade-in
  - Le joueur éliminé voit un message personnalisé
- Animation de sortie du joueur dans la liste (shrink + fade)

**Fichiers :**
- `components/game-laregle/EliminationTransition.jsx` — nouveau composant
- `app/laregle/game/[code]/play/page.jsx` — intégration

---

### 10.2 Quiz — Feedback buzzer amélioré

**Problème actuel :**
- Le buzzer a 5 états visuels (active/pending/success/blocked/penalty) — c'est bien
- Mais la transition entre états pourrait être plus juicy

**Solution :**
- **Active → Pending** : ripple effect du centre vers l'extérieur (couleur qui se propage)
- **Pending → Success** : burst de particules vertes (comme JuicyButton mais en vert)
- **Pending → Blocked** : shake rapide (2 cycles, 200ms) + couleur qui s'assombrit
- **Penalty** : flash orange + icône horloge qui apparaît avec countdown

**Fichiers :**
- Le composant buzzer dans `app/game/[code]/play/page.jsx`

---

## PRIORITÉ 11 — Navigation Bottom Tab

### 11.1 Animation de switch d'onglet

**Problème actuel :**
- Les onglets du bottom nav changent de couleur mais pas d'animation
- L'icône active n'a pas de feedback

**Solution :**
- L'icône active fait un petit bounce au tap (scale 0.85 → 1.1 → 1, spring 400ms)
- L'indicateur actif (dot ou underline) slide vers le nouvel onglet (translateX animé)
- Les icônes inactives font un subtle scale-down (0.95) pour accentuer le contraste

**Fichiers :**
- `components/layout/BottomNav.jsx`

---

## ANNEXE — Principes d'animation

### Durées standards

| Type | Durée | Easing |
|------|-------|--------|
| Micro-interaction (tap, hover) | 100-200ms | ease-out |
| Transition d'élément (fade, slide) | 250-400ms | spring ou ease-out |
| Transition de page | 300-500ms | spring (stiffness 300, damping 25) |
| Animation de célébration | 600-1000ms | spring bouncy (damping 15-18) |
| Séquence orchestrée | 800-1500ms total | stagger 80-120ms entre éléments |

### Springs standardisés

| Nom | Stiffness | Damping | Usage |
|-----|-----------|---------|-------|
| `snappy` | 500 | 30 | Boutons, micro-interactions |
| `smooth` | 300 | 25 | Transitions de page, slides |
| `bouncy` | 250 | 18 | Célébrations, entrées fun |
| `gentle` | 120 | 25 | Scores, compteurs |

### Règles

1. **Jamais d'animation sur les données critiques** — les animations sont cosmétiques, les données sont temps réel
2. **Toujours retargetable** — si la valeur change mid-animation, le spring s'adapte
3. **Respecter prefers-reduced-motion** — toutes les animations doivent être désactivables
4. **GPU only** — animer uniquement `transform` et `opacity`, jamais `width/height/top/left`
5. **Pas de layout thrashing** — utiliser `layout` prop de Framer pour les repositionnements

---

## CHECKLIST D'IMPLÉMENTATION

### Phase 1 — Impact immédiat (splash + home)
- [ ] 1.1 — Barre splash → pilule cartoon
- [ ] 1.2 — Transition splash → home orchestrée
- [ ] 2.1 — Stagger des GameCards
- [ ] 2.2 — Tap feedback sur GameCards

### Phase 2 — Score & feedback en jeu
- [ ] 3.1 — Réactiver AnimatedScore (spring safe)
- [ ] 3.2 — FloatingPoints "+X"
- [ ] 6.1 — Transition sortie/entrée des questions
- [ ] 6.2 — Barre de progression question X/Y

### Phase 3 — Transitions & navigation
- [ ] 4.1 — Transitions contextuelles (plongée/retour/latéral)
- [ ] 5.1 — Animation entrée joueurs dans lobby
- [ ] 5.2 — Compteur joueurs animé
- [ ] 11.1 — Bottom nav animation

### Phase 4 — Célébration & fin de partie
- [ ] 7.1 — Confetti victoire
- [ ] 7.2 — Entrée podium orchestrée
- [ ] 9.1 — Leaderboard reorder animé

### Phase 5 — Polish par jeu
- [ ] 8.1 — Timer urgence progressive
- [ ] 10.1 — La Règle : animation élimination
- [ ] 10.2 — Quiz : feedback buzzer amélioré

---

*Créé le : 2026-03-11*
*Dernière mise à jour : 2026-03-11*
