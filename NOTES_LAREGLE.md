# Gigglz Dev Studio — La Règle (en cours)

## Fichiers concernés
- `app/dev/page.jsx` — index dev studio (onglets Lobbies / Game)
- `app/dev/laregle/page.jsx` — lobby dev La Règle
- `app/dev/laregle/game/page.jsx` — **page principale du session**
- `app/dev/components/DevLobbySettings.jsx` — settings dev

## État du proto `app/dev/laregle/game/page.jsx`

### Architecture générale
- Pas de Firebase, pas d'auth — mock data uniquement
- Switcher DEV : vue (enqueteur / civil) + phase (choosing / revealing / playing / guessing)
- `ACCENT = '#00e5ff'`, `MOCK_CODE = 'R3GL7'`
- `MOCK_PLAYERS` : 1 investigator (OhSujee) + 3 civilians (Nirojan, Thomas, Léa M.)
- Phases : `['choosing', 'revealing', 'playing', 'guessing']`

### Header
- Exit button + rôle en Bungee blanc avec glow cyan (enquêteur) ou violet (civil)
- Timer pause/play visible uniquement enquêteur + playing

### Bouton fixe bas (enquêteur + playing)
- `position: fixed, bottom: 0`, gradient fade
- Texte hint au-dessus + bouton "J'ai deviné la règle !"
- Disabled + style grisé quand `guessAttempts >= 3`

---

## VUE ENQUÊTEUR

### Choosing
- Instruction strip (loupe + texte)
- Carte `rgba(8,14,32,0.92)` avec header "PRÉPARE-TOI" + pulsing dot + "Les joueurs choisissent..."
- Bloc waiting interne : 3 dots cascade pulsants + "Les joueurs choisissent une règle secrète"
- Tips : 3 items (icône + texte), co-enquêteurs si plusieurs

### Revealing (nouveau)
- Instruction strip
- Carte "C'EST PARTI !" avec 🔍 glowé animé + spring
- Dots pulsants "La partie commence..."

### Playing
- Instruction strip (loupe)
- Carte Suspects : header avec label "SUSPECTS" + attempts dots + "X essais restants"
- PlayerBanner pour chaque civil avec overlay grille :
  - Couche 1 : PlayerBanner (opacity 0.38 si éliminé)
  - Couche 2 : flash rouge à l'élimination (AnimatePresence)
  - Couche 3 : badge "ÉLIMINÉ" centré (paddingTop: 10px pour compenser pb-wrapper)
  - Couche 4 : ⚠️ DEV ONLY — bouton ✕/↩ toggle élimination
- `motion.div` layout + spring pour reordering animé (éliminés vont en bas)

### Guessing
- Carte avec header "VOTES" + pulsing dot + attempts dots
- Fond `rgba(8,14,32,0.92)`, border cyan, box-shadow avec inset
- Par joueur : PlayerBanner + badge Oui (vert) / Non (rouge) / ··· (pending)
- ⚠️ DEV ONLY : clic sur joueur pour cycler son vote (none → correct → wrong → none)
- `mockVotes` state initialisé avec `{ uid2: 'correct' }` (Nirojan a voté)

---

## VUE CIVIL

### Choosing
- Instruction strip (🗳️ + "Choisis une règle")
- Options règles : cartes `rgba(8,14,32,0.92)`, radio button cyan, opacity 0.4 si non sélectionné après vote
- CTA : bouton "Valider mon vote" → se transforme en bloc waiting animé
- Waiting block : 3 dots + "En attente — X/3 ont choisi"
- ⚠️ DEV ONLY : bouton "+1" jaune pour simuler votes entrants (`mockVoteCount` state local)

### Revealing (nouveau)
- Strip 🎉 + "La règle a été choisie"
- Grande carte reveal : `${ACCENT}0d` bg, border cyan, glow, animations en cascade avec delays
  - Label → texte règle (spring) → badges (fade)
- Dots pulsants "La partie commence..."

### Playing
- Instruction strip (🤫 + "Réponds en respectant la règle sans la révéler !")
- **Carte "Ta règle secrète" — hold-to-reveal** :
  - Toute la carte est cliquable (handlers sur div externe, pas interne)
  - `blur(12px)` sur le contenu quand masqué
  - Overlay "👆 Maintiens pour voir" centré sur zone floue
  - `onContextMenu preventDefault` → bloque menu clic droit desktop
  - Listener `window mouseup/touchend/touchcancel` via `useEffect` → garantit reset même si relâchement hors du div
  - `WebkitTouchCallout: 'none'`, `touchAction: 'none'`, `userSelect: 'none'`
- Carte "Ton équipe" : header pattern + PlayerBanner pour chaque civil

### Guessing
- Header compact (🎤 + titre inline, pas grande carte centrée)
- Rappel règle : `rgba(8,14,32,0.92)` + border cyan 20%
- Boutons Oui/Non horizontaux (icône 20px + texte inline, padding 14px)
- État après vote : confirmation animée (✅/❌)

---

## Patterns techniques établis

### pb-wrapper padding compensation
PlayerBanner a `padding-top: 10px` réservé pour sticky note.
Tous les overlays absolus/grid doivent avoir `paddingTop: '10px'` pour s'aligner sur `pb-root`.

### CSS Grid overlay (plusieurs couches sur PlayerBanner)
```jsx
<motion.div style={{ display: 'grid' }}>
  <div style={{ gridArea: '1/1' }}>          {/* Couche 1 */}
  <div style={{ gridArea: '1/1', paddingTop: '10px' }}> {/* Couche 2+ */}
</motion.div>
```

### Card style standard (cohérent partout)
```js
background: 'rgba(8,14,32,0.92)'
border: '1px solid rgba(0,229,255,0.1)'
borderRadius: '16px'
boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
```

### Header card pattern
```jsx
<div card>
  <div style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <span label /> <div right-side />
  </div>
  <div style={{ padding: '8px 10px' }}> {/* content */} </div>
</div>
```

### Instruction strip pattern
```jsx
<div style={{ display: 'flex', gap: '9px', padding: '9px 14px', background: `${ACCENT}07`, borderLeft: `2px solid ${ACCENT}45`, borderRadius: '10px' }}>
  <Icon size={14} /> <span>texte</span>
</div>
```

### Pulsing dots (waiting state)
```jsx
{[0,1,2].map(i => (
  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background: ACCENT,
    animation: 'devPulse 1.2s ease-in-out infinite', animationDelay: `${i*0.22}s` }} />
))}
```

---

## À faire / Idées non implémentées
- La vue enquêteur `choosing` pourrait aussi afficher un compteur live (X/3 ont choisi) — pas fait
- Le hold-to-reveal mobile (touchAction + passive listeners) — à tester in-app
- La transition auto `revealing → playing` (actuellement manuelle via switcher DEV)
