# Changelog - 29 Novembre 2025

## Corrections et améliorations apportées

---

## 1. Écran de fin Quiz (`app/end/[code]/page.jsx`)

### Problèmes corrigés
- **Variable `isHost` utilisée avant sa définition** dans un `useEffect`
- **Les joueurs n'avaient pas leur `uid`** : `Object.values()` ne préservait pas les clés Firebase
- **Crash si `player.name` undefined** dans le composant PodiumPremium

### Modifications
- Déplacé la définition de `isHost` avant les `useEffect` qui l'utilisent
- Modifié la récupération des joueurs pour inclure l'`uid` depuis les clés Firebase :
  ```javascript
  const playersWithUid = Object.entries(v).map(([uid, data]) => ({ uid, ...data }));
  ```
- Ajouté une vérification avant la redirection (attendre que `myUid` et `meta` soient chargés)

---

## 2. Composant PodiumPremium (`components/ui/PodiumPremium.jsx`)

### Modifications
- Ajouté des valeurs par défaut pour `player.name` :
  ```javascript
  {(player.name || 'J').charAt(0).toUpperCase()}
  {player.name || 'Joueur'}
  ```

---

## 3. Écran de fin Alibi (`app/alibi/game/[code]/end/page.jsx`)

### Problème
- Affichait un podium individuel alors que c'est un jeu d'équipe avec score collectif

### Modification
- Supprimé le `PodiumPremium` et les sections d'équipes superflues
- L'écran affiche maintenant uniquement :
  - Le score principal des accusés (X / 10) avec animation
  - Le pourcentage de réussite
  - Le message de résultat
  - Les boutons de retour (lobby ou accueil)

---

## 4. Système de Buzzer - Corrections des race conditions

### Fichier : `components/game/Buzzer/index.jsx`

#### Problèmes corrigés
- **Race condition entre deux buzzs rapprochés** : La transaction était sur `lockUid` seul, puis un `update` séparé pour `buzz` et `buzzBanner`
- **Deuxième buzz pouvait primer sur le premier**

#### Solution
- Transaction atomique sur **tout l'objet `state`** au lieu de juste `lockUid`
- Toutes les infos du buzz (`lockUid`, `buzz`, `buzzBanner`) sont écrites en une seule transaction :
  ```javascript
  const result = await runTransaction(stateRef, (currentState) => {
    if (!currentState) return currentState;

    // Si quelqu'un a déjà buzzé, on ne change rien
    if (currentState.lockUid) {
      return currentState;
    }

    // Personne n'a buzzé - je prends le lock avec TOUTES les infos atomiquement
    return {
      ...currentState,
      lockUid: playerUid,
      buzz: { uid: playerUid, at: buzzTime, anticipated: isAnticipatedBuzz },
      buzzBanner: `🔔 ${playerName} a buzzé !${isAnticipatedBuzz ? ' (ANTICIPÉ)' : ''}`
    };
  });
  ```

### Fichier : `app/game/[code]/host/page.jsx`

#### Problème corrigé
- **Buzz annulé quand l'hôte révèle la question au même moment**

#### Solution
- La fonction `revealToggle()` vérifie maintenant `lockUid` **ET** `buzz.uid` pour détecter un buzz existant
- Si un buzz existe, aucun champ lié au buzz n'est modifié :
  ```javascript
  const hasBuzz = currentState.lockUid || currentState.buzz?.uid;
  if (hasBuzz) {
    return {
      ...currentState,
      revealed: true,
      lastRevealAt: revealTime,
      elapsedAcc: 0
      // On ne touche PAS à : lockUid, buzz, buzzBanner, pausedAt, lockedAt
    };
  }
  ```

---

## 5. Z-index de la popup de buzz (`app/globals.css`)

### Problème
- Le bouton "Révéler" (z-index 300) était AU-DESSUS de l'overlay du buzz (z-index 200)
- L'hôte pouvait cliquer sur "Révéler" même quand la popup de buzz était ouverte

### Solution
- `.buzz-modal-overlay` : `z-index: var(--z-modal-backdrop)` (400)
- `.buzz-modal` : `z-index: var(--z-modal)` (500)

---

## 6. Réponse visible dans la popup de buzz

### Fichiers modifiés
- `app/game/[code]/host/page.jsx`
- `app/globals.css`

### Ajout
- La réponse attendue est maintenant affichée dans la popup quand un joueur buzze
- Encadré vert avec le label "Réponse attendue" et la réponse en gras
- L'hôte peut voir la réponse sans avoir à fermer la popup

### CSS ajouté
```css
.buzz-modal-answer {
  padding: 1rem 1.5rem;
  background: rgba(16, 185, 129, 0.12);
  border: 2px solid rgba(16, 185, 129, 0.4);
  border-radius: 1rem;
}

.buzz-modal-answer-label {
  font-size: 0.7rem;
  color: rgba(16, 185, 129, 0.8);
  text-transform: uppercase;
}

.buzz-modal-answer-value {
  font-size: 1.25rem;
  font-weight: 900;
  color: #10B981;
}
```

---

## 7. Système Hue - Retour automatique à l'ambiance

### Fichier : `lib/hue-module/services/hueScenariosService.js`

### Problème
- Les lumières d'événements (bonne réponse, mauvaise réponse, temps écoulé) restaient pendant la question suivante
- Pas de retour à l'ambiance globale après les animations

### Solutions apportées

#### 1. Nouveau scénario "question"
```javascript
question: {
  name: 'Phase question',
  description: 'Ambiance pendant qu\'une question est affichée',
  execute: async () => {
    await hueService.setAllLightsState({
      on: true,
      ...COLORS.BLUE,
      bri: 180,
      transitiontime: 10
    });
  }
}
```

#### 2. Événements temporaires avec retour automatique
```javascript
const TEMPORARY_EVENTS = ['goodAnswer', 'badAnswer', 'timeUp', 'buzz'];

const TEMPORARY_EVENT_DURATIONS = {
  goodAnswer: 1800,  // flash/pulse ~1.1s + 700ms de visibilité
  badAnswer: 1800,   // flash/pulse ~1.1s + 700ms de visibilité
  timeUp: 2200,      // pulse 3x ~1.8s + 400ms de visibilité
  buzz: 800          // flash court ~600ms + 200ms de visibilité
};
```

#### 3. Nouvelle méthode `returnToQuestionAmbiance()`
```javascript
async returnToQuestionAmbiance(gameId) {
  const eventConfigs = this.loadEventConfigs();
  const questionConfig = eventConfigs[gameId]?.['question'];

  if (questionConfig?.enabled && questionConfig.lights?.length > 0) {
    await this.applyEffect(questionConfig.lights, questionConfig.color || 'blue', 'solid', 180);
  } else {
    await this.scenarios.question?.execute?.();
  }
}
```

#### 4. Modification de `trigger()` pour programmer le retour
```javascript
if (TEMPORARY_EVENTS.includes(eventName)) {
  const duration = TEMPORARY_EVENT_DURATIONS[eventName] || 1000;
  this._returnToQuestionTimeout = setTimeout(() => {
    this.returnToQuestionAmbiance(gameId);
    this._returnToQuestionTimeout = null;
  }, duration);
}
```

### Nouveau comportement des lumières

| Événement | Animation | Après l'animation |
|-----------|-----------|-------------------|
| `roundStart` | Flash blanc → Bleu | Reste bleu (ambiance question) |
| `buzz` | Flash blanc court | Retour à "question" après 800ms |
| `goodAnswer` | Flash/pulse vert | Retour à "question" après 1.8s |
| `badAnswer` | Flash/pulse rouge | Retour à "question" après 1.8s |
| `timeUp` | Clignotements orange | Retour à "question" après 2.2s |
| `ambiance` | Violet doux | Reste (lobby/attente) |
| `victory` | Arc-en-ciel festif | Reste vert |

---

## Résumé des garanties du système de buzzer

### Premier arrivé = Premier servi
- La transaction Firebase sur tout l'objet `state` garantit l'atomicité
- Si 2 joueurs buzzent en même temps, le premier qui commit gagne

### L'hôte ne peut pas annuler un buzz par erreur
- Z-index corrigé : popup (500) > bouton Révéler (300)
- Transaction de révélation préserve tout buzz existant

### Popup obligatoire pour valider/invalider
- Quand `state.lockUid` existe, la popup s'affiche avec overlay bloquant
- L'hôte DOIT cliquer sur ✔ (Correcte), ✘ (Mauvaise) ou Reset
- La réponse attendue est visible dans la popup

---

## Fichiers modifiés

1. `app/end/[code]/page.jsx`
2. `app/alibi/game/[code]/end/page.jsx`
3. `app/game/[code]/host/page.jsx`
4. `app/globals.css`
5. `components/ui/PodiumPremium.jsx`
6. `components/game/Buzzer/index.jsx`
7. `lib/hue-module/services/hueScenariosService.js`
