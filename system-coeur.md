# Système de Cœurs — Gigglz

> Document de planification. À consulter avant toute implémentation.

---

## 1. Concept

Chaque joueur gratuit dispose de **5 cœurs** par jour. Chaque partie jouée consomme **1 cœur**, peu importe le rôle (host ou joueur). Quand les cœurs sont épuisés, le joueur ne peut plus lancer ou rejoindre une partie. Les utilisateurs **Pro sont totalement exempts** — aucune contrainte.

---

## 2. Règles de Comptage

### Qui perd un cœur ?
- **Host** : au lancement de la partie (quand il clique "Démarrer")
- **Joueur** : au moment où il rejoint une room (join)
- **Mime (local)** : au lancement de la partie (bouton "C'est parti !")

### Quels jeux sont concernés ?
Tous les jeux — multijoueur et local :
- Quiz, DeezTest, Alibi, La Règle, Blindtest → multijoueur
- Mime → local

### Ce qui ne coûte PAS de cœur
- Rejoindre un lobby et partir avant le lancement
- Être spectateur (non implémenté, mais à garder en tête)

---

## 3. Reset Quotidien

Les cœurs se rechargent automatiquement à **minuit heure locale** (ou à l'ouverture de l'app si le dernier reset date d'un jour précédent).

Implémentation : même logique que `useGameLimits` existant (clé `date` dans localStorage, comparaison `toDateString()`). Chaque nouveau jour → reset à 5 cœurs.

---

## 4. Recharge via Pub

Quand les cœurs sont épuisés (ou quand le joueur clique sur la barre de cœurs), une **modale** s'ouvre. Elle propose deux options :

### Option A — Regarder une vidéo
→ Lance une rewarded ad
→ En cas de succès : **recharge les 5 cœurs immédiatement**
→ Wording : "Regarder une vidéo" (pas "pub rewarded")
→ Une seule recharge par session (pour éviter l'abus de recharge infinie)
→ Ou alors : limiter à 2 recharges par jour via pub

### Option B — Passer Pro
→ Redirige vers `/subscribe`
→ "Jouer sans limite, sans pub"

---

## 5. Stockage

```
localStorage (via storage utility, préfixe lq_) :
  hearts_data = {
    remaining: 5,         // cœurs restants (0-5)
    date: "Mon Jan 27..."  // toDateString() du dernier reset
    rechargesUsed: 0,     // nb de recharges via pub aujourd'hui
  }
```

Clé : `hearts_data` (pas de scope par UID pour l'instant — un appareil = un compteur).
→ À discuter : scope par UID comme useDailyGame ? Probablement oui pour la cohérence.

---

## 6. Intégration dans le Code

### Hook : `useHearts`
```javascript
// lib/hooks/useHearts.js
const {
  heartsRemaining,   // 0-5
  maxHearts,         // 5
  canPlay,           // heartsRemaining > 0 || isPro
  consumeHeart,      // async () → déduit 1 cœur
  rechargeHearts,    // async () → lance rewarded ad → recharge si succès
  isRecharging,      // boolean (pendant la pub)
} = useHearts({ isPro });
```

### Points d'intégration
| Endroit | Action |
|---------|--------|
| Home → création room | Vérifier `canPlay`, bloquer si 0 cœur |
| Join page | Vérifier `canPlay`, bloquer si 0 cœur |
| Mime lobby | Vérifier `canPlay`, bloquer si 0 cœur |
| Après lancement/join réussi | Appeler `consumeHeart()` |

### Suppression
- `useGameLimits` → remplacé par `useHearts` (ou étendu)
- `GameLimitModal` → remplacé par `HeartsModal`
- `FREE_GAMES_BEFORE_AD = 999` → remettre à sa vraie valeur (inutile avec le nouveau système)

---

## 7. Composant Visuel — HomeHeader

### Layout actuel
```
[ Avatar ] [ Pseudo centré ] [ Upgrade / Crown ]
  44px          1fr              44px
```

### Layout cible (non-Pro)
```
[ Avatar ] [ Pseudo centré ] [ ❤❤❤❤❤ ]
  44px          1fr            auto (5 cœurs)
```

Les 5 cœurs remplacent le bouton upgrade dans la zone droite.
→ Alignés à droite, en ligne
→ Cœurs pleins = rouge/rose vif
→ Cœurs vides = grisés/transparents
→ Animation légère quand un cœur est perdu (scale down + fade)
→ Clic sur la barre de cœurs → `HeartsModal`

### Layout cible (Pro)
```
[ Avatar ] [ Pseudo centré ] [ 👑 ]
  44px          1fr            44px
```
Inchangé — badge Crown comme aujourd'hui.

---

## 8. Modale — HeartsModal

### Déclencheurs
- Clic sur la barre de cœurs (quand cœurs > 0 : info)
- Tentative de jouer avec 0 cœur (bloquant)

### Contenu (cœurs > 0 — mode info)
```
❤❤❤❤❤  (état actuel)
"Tu as X cœurs restants aujourd'hui"
"Chaque partie utilise 1 cœur. Ils se rechargent à minuit."
[Regarder une vidéo → +5 cœurs]   (si recharge disponible)
[Fermer]
```

### Contenu (0 cœur — mode bloquant)
```
🖤🖤🖤🖤🖤  (tous vides)
"Tes cœurs sont épuisés"
"Reviens demain ou regarde une courte vidéo pour continuer."
[Regarder une vidéo → +5 cœurs]   (bouton principal, vert)
[Passer Pro — jouer sans limite]   (bouton secondaire, violet)
[Plus tard]
```

### Wording important
- ❌ "pub rewarded" / "ad" / "publicité"
- ✅ "courte vidéo" / "regarder une vidéo"
- ❌ "épuisé" seul → trop sec
- ✅ "Reviens demain ou regarde une courte vidéo"

---

## 9. Checklist Implémentation

### Phase 1 — Visuel (sans fonctionnalité)
- [ ] `HomeHeader` : afficher 5 cœurs à droite (statiques, hardcodés à 5/5)
- [ ] CSS : styles cœurs pleins / vides
- [ ] Clic → ouvre `HeartsModal` (modale vide pour l'instant)

### Phase 2 — Hook & logique
- [ ] Créer `useHearts` avec localStorage + reset minuit
- [ ] Brancher `consumeHeart` sur host launch + player join + mime start
- [ ] Brancher `rechargeHearts` sur rewarded ad dans `HeartsModal`
- [ ] Bloquer création/join si 0 cœur

### Phase 3 — Polish
- [ ] Animation perte de cœur (scale + color transition)
- [ ] Animation recharge (bounce un par un)
- [ ] Toast "❤ +5 cœurs rechargés !"
- [ ] Remettre `FREE_GAMES_BEFORE_AD` à 3 (ou supprimer `useGameLimits` entièrement)

---

*Dernière mise à jour : 2026-02-23*
